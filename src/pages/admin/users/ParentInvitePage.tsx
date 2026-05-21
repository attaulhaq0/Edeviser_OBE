import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";
import Shimmer from "@/components/shared/Shimmer";
import { useQuery } from "@tanstack/react-query";

const schema = z.object({
  parent_email: z.string().email("Valid email required"),
  parent_name: z.string().min(1, "Name is required"),
  student_id: z.string().min(1, "Student is required"),
  relationship: z.string().min(1, "Relationship is required"),
});

type FormData = z.infer<typeof schema>;

const useStudents = () => {
  return useQuery({
    queryKey: ["students-for-parent-invite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string;
      }>;
    },
  });
};

const ParentInvitePage = () => {
  const { user, institutionId } = useAuth();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      parent_email: "",
      parent_name: "",
      student_id: "",
      relationship: "parent",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsPending(true);
    try {
      // Create parent profile via admin API
      const { data: authData, error: authErr } =
        await supabase.auth.admin.createUser({
          email: data.parent_email,
          email_confirm: true,
          user_metadata: {
            full_name: data.parent_name,
            role: "parent",
            institution_id: institutionId,
          },
        });
      if (authErr) throw new Error(authErr.message);

      const parentId = authData.user?.id;
      if (!parentId) throw new Error("Failed to create parent user");

      // Create profile record
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: parentId,
        email: data.parent_email,
        full_name: data.parent_name,
        role: "parent",
        institution_id: institutionId ?? "",
      });
      if (profileErr) throw new Error(profileErr.message);

      // Create parent-student link
      const { error: linkErr } = await supabase
        .from("parent_student_links")
        .insert({
          parent_id: parentId,
          student_id: data.student_id,
          relationship: data.relationship,
          verified: true,
        });
      if (linkErr) throw new Error(linkErr.message);

      await logAuditEvent({
        action: "create",
        entity_type: "parent_invite",
        entity_id: parentId,
        changes: {
          parent_email: data.parent_email,
          student_id: data.student_id,
        },
        performed_by: user?.id ?? "",
      });

      toast.success("Parent invited and linked to student");
      form.reset();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Invite Parent / Guardian
        </h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <UserPlus className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            New Parent Invite
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6">
            Create a parent account and link it to a student. The parent will
            receive read-only access to their child's academic data.
          </p>
          {studentsLoading ? (
            <Shimmer className="h-32 rounded-lg" />
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 max-w-xl"
              >
                <FormField
                  control={form.control}
                  name="parent_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parent_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="parent@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Student</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name} ({s.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Invite Parent
                </Button>
              </form>
            </Form>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ParentInvitePage;
