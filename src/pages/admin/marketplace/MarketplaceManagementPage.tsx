import { useState } from 'react';
import { Plus, ShoppingBag, ToggleLeft, ToggleRight, Pencil, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdminMarketplaceItems, useToggleMarketplaceItem } from '@/hooks/useMarketplaceAdmin';
import { useInstitutionSettings, useUpsertInstitutionSettings } from '@/hooks/useInstitutionSettings';
import { DataTable } from '@/components/shared/DataTable';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import ItemForm from '@/pages/admin/marketplace/ItemForm';

interface MarketplaceItemRow {
  id: string;
  name: string;
  category: string;
  sub_category: string;
  xp_price: number;
  level_requirement: number;
  stock_type: string;
  stock_quantity: number | null;
  is_active: boolean;
}

const columns: ColumnDef<MarketplaceItemRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs capitalize">
        {row.original.category.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'sub_category',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-xs text-gray-500 capitalize">{row.original.sub_category.replace(/_/g, ' ')}</span>
    ),
  },
  { accessorKey: 'xp_price', header: 'Price (XP)' },
  { accessorKey: 'level_requirement', header: 'Level Req.' },
  {
    accessorKey: 'stock_type',
    header: 'Stock',
    cell: ({ row }) => {
      const { stock_type, stock_quantity } = row.original;
      if (stock_type === 'unlimited') return <span className="text-xs text-gray-500">Unlimited</span>;
      if (stock_type === 'one_per_student') return <span className="text-xs text-gray-500">1 per student</span>;
      return <span className="text-xs text-gray-500">{stock_quantity ?? 0} left</span>;
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={row.original.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

const MarketplaceManagementPage = () => {
  const { data: items, isLoading } = useAdminMarketplaceItems();
  const toggleItem = useToggleMarketplaceItem();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItemRow | null>(null);
  const { data: settings } = useInstitutionSettings();
  const upsertSettings = useUpsertInstitutionSettings();

  const dynamicPricingEnabled = (settings as unknown as Record<string, unknown>)?.dynamic_pricing_enabled === true;

  const handleDynamicPricingToggle = (checked: boolean) => {
    upsertSettings.mutate(
      { ...(settings as unknown as Record<string, unknown>), dynamic_pricing_enabled: checked } as never,
      { onSuccess: () => toast.success(`Dynamic pricing ${checked ? 'enabled' : 'disabled'}`) },
    );
  };

  const handleToggle = (item: MarketplaceItemRow) => {
    toggleItem.mutate(
      { id: item.id, isActive: !item.is_active },
      { onSuccess: () => toast.success(`Item ${item.is_active ? 'deactivated' : 'activated'}`) },
    );
  };

  const actionsColumn: ColumnDef<MarketplaceItemRow> = {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(row.original); setFormOpen(true); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleToggle(row.original)}>
          {row.original.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Marketplace Items</h1>
        </div>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
          onClick={() => { setEditingItem(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold">Dynamic Pricing</p>
              <p className="text-xs text-gray-500">Automatically adjust prices based on demand</p>
            </div>
          </div>
          <Switch
            checked={dynamicPricingEnabled}
            onCheckedChange={handleDynamicPricingToggle}
            disabled={upsertSettings.isPending}
          />
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <DataTable
          columns={[...columns, actionsColumn]}
          data={(items ?? []) as MarketplaceItemRow[]}
          isLoading={isLoading}
        />
      </Card>

      {formOpen && (
        <ItemForm
          item={editingItem as unknown as Record<string, unknown> | null}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </div>
  );
};

export default MarketplaceManagementPage;
