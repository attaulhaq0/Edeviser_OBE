import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PCard } from "@/design-system";
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
import { Loader2, Link2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { Shimmer } from "@/design-system";

const schema = z.object({
  parent_email: z.string(),
  parent_id: z.string(),
  student_id: z.string().min(1, "Student is required"),
  relationship: z.enum(["mother", "father", "guardian", "other"]),
  relationship_label: z.string().max(80).optional(),
});

type FormData = z.infer<typeof schema>;

type Person = { id: string; full_name: string; email: string };

const usePeople = (role: "student" | "parent") =>
  useQuery({
    queryKey: ["admin", "people", role, "parent-link"],
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", role)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

const ParentInvitePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const studentsQuery = usePeople("student");
  const parentsQuery = usePeople("parent");
  const [mode, setMode] = useState<"invite" | "existing">("invite");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      parent_email: "",
      parent_id: "",
      student_id: "",
      relationship: "guardian",
      relationship_label: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error("You must be signed in as an administrator");
      return;
    }
    if (mode === "invite" && !data.parent_email.trim()) {
      form.setError("parent_email", { message: "Parent email is required" });
      return;
    }
    if (mode === "existing" && !data.parent_id) {
      form.setError("parent_id", { message: "Select a parent" });
      return;
    }
    if (data.relationship === "other" && !data.relationship_label?.trim()) {
      form.setError("relationship_label", {
        message: "Add a safe relationship label",
      });
      return;
    }

    setIsPending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "parent-link",
        {
          body:
            mode === "invite"
              ? {
                  action: "invite",
                  student_id: data.student_id,
                  parent_email: data.parent_email,
                  relationship: data.relationship,
                  relationship_label: data.relationship_label,
                }
              : {
                  action: "link_existing",
                  student_id: data.student_id,
                  parent_id: data.parent_id,
                  relationship: data.relationship,
                  relationship_label: data.relationship_label,
                },
        }
      );
      if (error || !result?.success) {
        toast.error(
          result?.message ??
            error?.message ??
            "Parent relationship could not be saved"
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "people"] });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.parentStudentLinks.list({}),
      });
      toast.success(
        mode === "invite"
          ? result.existingParent
            ? "Pending relationship created for the existing parent"
            : "Parent invitation sent"
          : "Parent linked and verified"
      );
      form.reset();
    } catch {
      toast.error("Parent relationship could not be saved");
    } finally {
      setIsPending(false);
    }
  };

  const students = studentsQuery.data ?? [];
  const parents = parentsQuery.data ?? [];
  const loading = studentsQuery.isLoading || parentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Family / Guardians
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage same-institution parent relationships without moving accounts
          between tenants.
        </p>
      </div>

      <PCard className="overflow-hidden p-0">
        <div className="flex items-center gap-2 bg-slate-900 px-6 py-4">
          {mode === "invite" ? (
            <UserPlus className="h-5 w-5 text-white" />
          ) : (
            <Link2 className="h-5 w-5 text-white" />
          )}
          <h2 className="text-lg font-bold tracking-tight text-white">
            {mode === "invite"
              ? "Invite Parent / Guardian"
              : "Link Existing Parent"}
          </h2>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "invite" ? "tactile" : "outline"}
              size="sm"
              onClick={() => setMode("invite")}
            >
              <Mail className="size-4" />
              Invite new parent
            </Button>
            <Button
              type="button"
              variant={mode === "existing" ? "tactile" : "outline"}
              size="sm"
              onClick={() => setMode("existing")}
            >
              <Link2 className="size-4" />
              Link existing parent
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            The server derives the institution from your administrator profile
            and the selected student. Cross-institution links are rejected.
          </p>
          {loading ? (
            <Shimmer className="h-32 rounded-lg" />
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="max-w-xl space-y-4"
              >
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
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
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.full_name} ({student.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mode === "invite" ? (
                  <FormField
                    control={form.control}
                    name="parent_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="parent@example.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing parent</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select a parent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parents.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.full_name} ({parent.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("relationship") === "other" ? (
                  <FormField
                    control={form.control}
                    name="relationship_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship label</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. aunt" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <Button type="submit" disabled={isPending} variant="tactile">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "invite" ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  {mode === "invite" ? "Send invitation" : "Link and verify"}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </PCard>
    </div>
  );
};

export default ParentInvitePage;
