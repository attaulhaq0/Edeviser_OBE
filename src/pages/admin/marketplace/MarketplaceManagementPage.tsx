// =============================================================================
// MarketplaceManagementPage — Admin item list with DataTable, CRUD actions
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminMarketplaceItems,
  useToggleMarketplaceItem,
} from "@/hooks/useMarketplaceAdmin";
import type { AdminMarketplaceItem } from "@/hooks/useMarketplaceAdmin";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Store,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import ItemForm from "@/pages/admin/marketplace/ItemForm";

const categoryLabels: Record<string, string> = {
  cosmetic: "Cosmetic",
  educational_perk: "Educational Perk",
  power_up: "Power-up",
};

const stockLabels: Record<string, string> = {
  unlimited: "Unlimited",
  limited: "Limited",
  one_per_student: "One per Student",
};

const MarketplaceManagementPage = () => {
  const navigate = useNavigate();
  const { data: items, isLoading } = useAdminMarketplaceItems();
  const toggleItem = useToggleMarketplaceItem();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMarketplaceItem | null>(
    null
  );

  const filteredItems = (items ?? []).filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnDef<AdminMarketplaceItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          {categoryLabels[row.original.category] ?? row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "xp_price",
      header: "Price (XP)",
      cell: ({ row }) => (
        <span className="font-semibold text-amber-600">
          {row.original.xp_price.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "level_requirement",
      header: "Level Req.",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.level_requirement > 0
            ? `Lv ${row.original.level_requirement}`
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "stock_type",
      header: "Stock",
      cell: ({ row }) => (
        <span className="text-xs text-gray-600">
          {stockLabels[row.original.stock_type] ?? row.original.stock_type}
          {row.original.stock_type === "limited" &&
            row.original.stock_quantity !== null && (
              <span className="ms-1 text-gray-400">
                ({row.original.stock_quantity})
              </span>
            )}
        </span>
      ),
    },
    {
      accessorKey: "total_purchases",
      header: "Purchases",
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.total_purchases}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.is_active
              ? "text-xs bg-green-50 text-green-700 border-green-200"
              : "text-xs bg-gray-50 text-gray-500 border-gray-200"
          }
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditingItem(row.original);
                setShowForm(true);
              }}
            >
              <Pencil className="h-4 w-4 me-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toggleItem.mutate({
                  itemId: row.original.id,
                  isActive: !row.original.is_active,
                })
              }
            >
              {row.original.is_active ? (
                <>
                  <ToggleLeft className="h-4 w-4 me-2" /> Deactivate
                </>
              ) : (
                <>
                  <ToggleRight className="h-4 w-4 me-2" /> Activate
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (showForm) {
    return (
      <ItemForm
        item={editingItem}
        onClose={() => {
          setShowForm(false);
          setEditingItem(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Marketplace Items
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/marketplace/sales")}
          >
            Sale Events
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/marketplace/analytics")}
          >
            Analytics
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100"
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredItems} isLoading={isLoading} />
    </div>
  );
};

export default MarketplaceManagementPage;
