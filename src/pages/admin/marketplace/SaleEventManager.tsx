import { useState } from 'react';
import { Plus, Tag, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSaleEvents, useCancelSaleEvent } from '@/hooks/useSaleEvents';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import SaleEventForm from '@/pages/admin/marketplace/SaleEventForm';

const SaleEventManager = () => {
  const { data: events, isLoading } = useSaleEvents();
  const cancelEvent = useCancelSaleEvent();
  const [formOpen, setFormOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const now = new Date();

  const getStatus = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (now < s) return 'scheduled';
    if (now > e) return 'ended';
    return 'active';
  };

  const handleCancel = () => {
    if (!cancelId) return;
    cancelEvent.mutate(cancelId, {
      onSuccess: () => { toast.success('Sale event cancelled'); setCancelId(null); },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Sale Events</h1>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New Sale
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="h-20 rounded-xl animate-shimmer" />)}
        </div>
      ) : (events ?? []).length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No sale events yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(events ?? []).map((event: Record<string, unknown>) => {
            const status = getStatus(event.start_date as string, event.end_date as string);
            return (
              <Card key={event.id as string} className="bg-white border-0 shadow-md rounded-xl px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{event.name as string}</h3>
                      <Badge className={
                        status === 'active' ? 'bg-green-100 text-green-700' :
                        status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }>
                        {status}
                      </Badge>
                      <Badge variant="outline" className="text-red-600">{event.discount_percentage as number}% OFF</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(event.start_date as string), 'MMM d, yyyy')} — {format(new Date(event.end_date as string), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {status !== 'ended' && (
                    <Button variant="ghost" size="sm" onClick={() => setCancelId(event.id as string)}>
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {formOpen && <SaleEventForm open={formOpen} onOpenChange={setFormOpen} />}

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open: boolean) => { if (!open) setCancelId(null); }}
        title="Cancel Sale Event"
        description="This will end the sale immediately. Existing purchases at the discounted price are not affected."
        onConfirm={handleCancel}
        isPending={cancelEvent.isPending}
      />
    </div>
  );
};

export default SaleEventManager;
