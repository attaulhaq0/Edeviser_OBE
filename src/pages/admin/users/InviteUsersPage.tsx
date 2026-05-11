import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useInviteUsers } from "@/hooks/useInviteUsers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface InviteRow {
  email: string;
  role: string;
  status: "pending" | "sent" | "failed";
  error?: string;
}

const inviteSchema = z.object({
  csvContent: z
    .string()
    .min(1, "Please paste CSV content or upload a file")
    .refine((val) => {
      const lines = val.trim().split("\n");
      return lines.length > 1; // At least header + 1 row
    }, "CSV must contain at least one data row"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

const InviteUsersPage = () => {
  const { t } = useTranslation("admin");
  const { institutionId } = useAuth();
  const { inviteUsers, isPending: isSending } = useInviteUsers();

  const [inviteRows, setInviteRows] = useState<InviteRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("teacher");

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      csvContent: "",
    },
  });

  const parseCSV = (content: string): InviteRow[] => {
    const lines = content.trim().split("\n");
    const rows: InviteRow[] = [];

    // Skip header row (first line)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const parts = trimmedLine.split(",").map((s) => s.trim());
      const email = parts[0];
      if (email && email.includes("@") && selectedRole) {
        rows.push({
          email,
          role: selectedRole,
          status: "pending",
        });
      }
    }

    return rows;
  };

  const onSubmit = async (data: InviteFormData) => {
    const rows = parseCSV(data.csvContent);

    if (rows.length === 0) {
      toast.error(t("inviteUsers.noValidEmails"));
      return;
    }

    setInviteRows(rows.map((r) => ({ ...r, status: "pending" })));
    setShowResults(true);

    if (!institutionId) {
      toast.error(t("inviteUsers.noInstitution"));
      return;
    }

    // Send invites
    const invites = rows.map((r) => ({
      email: r.email,
      role: r.role as
        | "admin"
        | "coordinator"
        | "teacher"
        | "student"
        | "parent",
    }));

    try {
      await inviteUsers({
        institution_id: institutionId,
        invites,
      });

      // Update rows with success status
      const updatedRows = rows.map((row) => ({
        ...row,
        status: "sent" as const,
      }));
      setInviteRows(updatedRows);
      toast.success(t("inviteUsers.invitesSent"));
    } catch (error) {
      const updatedRows = rows.map((row) => ({
        ...row,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      setInviteRows(updatedRows);
      toast.error(t("inviteUsers.invitesFailed"));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      form.setValue("csvContent", content);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template =
      "email,role\nteacher@example.com,teacher\ncoordinator@example.com,coordinator";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const successCount = inviteRows.filter((r) => r.status === "sent").length;
  const failureCount = inviteRows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("inviteUsers.title")}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {t("inviteUsers.subtitle")}
        </p>
      </div>

      {!showResults ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              {/* Role selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("inviteUsers.defaultRole")}
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="rounded-lg border-gray-200 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">
                      {t("roles.teacher")}
                    </SelectItem>
                    <SelectItem value="coordinator">
                      {t("roles.coordinator")}
                    </SelectItem>
                    <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                    <SelectItem value="parent">{t("roles.parent")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {t("inviteUsers.roleHint")}
                </p>
              </div>

              {/* CSV input */}
              <FormField
                control={form.control}
                name="csvContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inviteUsers.csvContent")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`email,role\nteacher@example.com,teacher\ncoordinator@example.com,coordinator`}
                        className="rounded-lg border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all min-h-32 font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-2">
                      {t("inviteUsers.csvFormat")}
                    </p>
                  </FormItem>
                )}
              />

              {/* File upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("inviteUsers.uploadFile")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t("inviteUsers.chooseFile")}
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="rounded-lg"
                  >
                    {t("inviteUsers.downloadTemplate")}
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-lg"
                  onClick={() => {
                    form.reset();
                    setShowResults(false);
                  }}
                >
                  {t("inviteUsers.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold"
                  disabled={isSending}
                >
                  {isSending && (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  )}
                  {t("inviteUsers.sendInvites")}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          {/* Results summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("inviteUsers.results")}</h2>
              <div className="flex gap-2">
                <Badge
                  variant="secondary"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {successCount} {t("inviteUsers.sent")}
                </Badge>
                {failureCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="bg-red-50 text-red-700 border-red-200"
                  >
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {failureCount} {t("inviteUsers.failed")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Results table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t("inviteUsers.email")}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t("inviteUsers.role")}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t("inviteUsers.status")}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t("inviteUsers.message")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inviteRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-3 text-gray-900">{row.email}</td>
                      <td className="py-3 px-3 text-gray-600 capitalize">
                        {t(`roles.${row.role}`)}
                      </td>
                      <td className="py-3 px-3">
                        {row.status === "sent" && (
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 me-1" />
                            {t("inviteUsers.sent")}
                          </Badge>
                        )}
                        {row.status === "failed" && (
                          <Badge
                            variant="destructive"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            <AlertTriangle className="h-3 w-3 me-1" />
                            {t("inviteUsers.failed")}
                          </Badge>
                        )}
                        {row.status === "pending" && (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-700"
                          >
                            {t("inviteUsers.pending")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 text-xs">
                        {row.error || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => {
                  form.reset();
                  setShowResults(false);
                  setInviteRows([]);
                }}
              >
                {t("inviteUsers.sendMore")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => {
                  const csv = inviteRows
                    .map((r) => `${r.email},${r.role}`)
                    .join("\n");
                  navigator.clipboard.writeText(csv);
                  toast.success(t("inviteUsers.copiedToClipboard"));
                }}
              >
                <Copy className="h-4 w-4 me-2" />
                {t("inviteUsers.copyResults")}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InviteUsersPage;
