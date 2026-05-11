// =============================================================================
// SaleEventManager — Sale events list with status badges
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSaleEvents, useCancelSaleEvent } from "@/hooks/useSaleEvents";
import type { SaleEvent } from "@/hooks/useSaleEvents";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, ArrowLeft, Tag, XCircle } from "lucide-react";
import { formatLocalDate } from "@/lib/formatDate";
import type { ColumnDef } from "@tanstack/react-table";
import SaleEventForm from "@/pages/admin/marketplace/SaleEventForm";

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

const SaleEventManager = () => {
  const navigate = useNavigate();
  const { data: events, isLoading } = useSaleEvents();
  const cancelEvent = useCancelSaleEvent();
  const [showForm, setShowForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const columns: ColumnDef<SaleEvent>[] = [
    {
      accessorKey: "name",
      header: "Event Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "discount_percentage",
      header: "Discount",
      cell: ({ row }) => (
        <span className="font-semibold text-red-600">
          {row.original.discount_percentage}% off
        </span>
      ),
    },
    {
      accessorKey: "start_date",
      header: "Start",
      cell: ({ row }) => (
        <span className="text-gray-600 text-sm">
          {formatLocalDate(row.original.start_date, "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "end_date",
      header: "End",
      cell: ({ row }) => (
        <span className="text-gray-600 text-sm">
          {formatLocalDate(row.original.end_date, "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "item_ids",
      header: "Items",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.item_ids.length} item(s)
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={`text-xs ${statusStyles[row.original.status] ?? ""}`}>
          {row.original.status.charAt(0).toUpperCase() +
            row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "active" ||
        row.original.status === "scheduled" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => setCancelTarget(row.original.id)}
          >
            <XCircle className="h-4 w-4 me-1" /> Cancel
          </Button>
        ) : null,
    },
  ];

  if (showForm) {
    return <SaleEventForm onClose={() => setShowForm(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/marketplace")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Tag className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold tracking-tight">Sale Events</h1>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100"
        >
          <Plus className="h-4 w-4" /> Create Sale
        </Button>
      </div>

      <DataTable columns={columns} data={events ?? []} isLoading={isLoading} />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel Sale Event?"
        description="This will immediately end the sale and restore original prices for all affected items."
        confirmLabel="Cancel Sale"
        isPending={cancelEvent.isPending}
        onConfirm={() => {
          if (cancelTarget) {
            cancelEvent.mutate(cancelTarget, {
              onSuccess: () => setCancelTarget(null),
            });
          }
        }}
      />
    </div>
  );
};

export default SaleEventManager;
