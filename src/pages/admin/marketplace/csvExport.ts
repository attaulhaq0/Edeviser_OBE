// =============================================================================
// csvExport — CSV export for purchase history on admin analytics page
// =============================================================================

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PurchaseRow {
  id: string;
  student_id: string;
  student_name: string;
  item_name: string;
  category: string;
  xp_cost: number;
  status: string;
  purchased_at: string;
}

/**
 * Fetches all purchase history and triggers a CSV download.
 */
export async function exportPurchaseHistoryCSV(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchases, error } = await (supabase as any)
      .from("xp_purchases")
      .select(
        `
        id,
        student_id,
        xp_cost,
        status,
        purchased_at,
        profiles:student_id (full_name),
        marketplace_items:item_id (name, category)
      `
      )
      .order("purchased_at", { ascending: false });

    if (error) throw error;

    const rows: PurchaseRow[] = (
      (purchases ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const profile = row.profiles as Record<string, unknown> | null;
      const item = row.marketplace_items as Record<string, unknown> | null;

      return {
        id: row.id as string,
        student_id: row.student_id as string,
        student_name: (profile?.full_name as string) ?? "Unknown",
        item_name: (item?.name as string) ?? "Unknown",
        category: (item?.category as string) ?? "unknown",
        xp_cost: row.xp_cost as number,
        status: row.status as string,
        purchased_at: row.purchased_at as string,
      };
    });

    // Build CSV
    const headers = [
      "Purchase ID",
      "Student ID",
      "Student Name",
      "Item",
      "Category",
      "XP Cost",
      "Status",
      "Date",
    ];
    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.student_id,
          `"${r.student_name.replace(/"/g, '""')}"`,
          `"${r.item_name.replace(/"/g, '""')}"`,
          r.category,
          r.xp_cost,
          r.status,
          r.purchased_at,
        ].join(",")
      ),
    ];

    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marketplace-purchases-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rows.length} purchase records`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to export CSV");
  }
}
