// Task 115.1: Competency Framework Manager page

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import Shimmer from '@/components/shared/Shimmer';
import CompetencyTree from '@/components/shared/CompetencyTree';
import { Plus, Loader2, Layers, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useCompetencyFrameworks,
  useCreateCompetencyFramework,
  useImportCompetencyCSV,
  useCompetencyItems,
  useCompetencyOutcomeMappings,
} from '@/hooks/useCompetencyFrameworks';
import { useILOs } from '@/hooks/useILOs';
import { usePLOs } from '@/hooks/usePLOs';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required'),
  source: z.string().optional(),
});

const CompetencyFrameworkManager = () => {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id;
  const queryClient = useQueryClient();
  const { data: frameworks = [], isLoading } = useCompetencyFrameworks(institutionId);
  const createMutation = useCreateCompetencyFramework();
  const importMutation = useImportCompetencyCSV();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const { data: items = [] } = useCompetencyItems(selectedFramework ?? undefined);
  const { data: mappings = [] } = useCompetencyOutcomeMappings(selectedFramework ?? undefined);
  const { data: ilosResult } = useILOs();
  const { data: plosResult } = usePLOs();
  const ilos = ilosResult?.data ?? [];
  const plos = plosResult?.data ?? [];
  const [mappingIndicatorId, setMappingIndicatorId] = useState<string>('');
  const [mappingOutcomeId, setMappingOutcomeId] = useState<string>('');

  const mappedItemIds = new Set(mappings.map((m) => m.competency_item_id));
  const indicators = items.filter((i) => i.level === 'indicator');

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', version: '1.0', source: '' },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    if (!institutionId) return;
    createMutation.mutate({ ...data, institution_id: institutionId }, {
      onSuccess: () => { toast.success('Framework created'); form.reset(); },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFramework) return;
    const text = await file.text();
    importMutation.mutate({ framework_id: selectedFramework, csv_content: text }, {
      onSuccess: (result) => toast.success(`Imported ${result.imported} items`),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleAddMapping = async () => {
    if (!mappingIndicatorId || !mappingOutcomeId) return;
    const { error } = await supabase
      .from('competency_outcome_mappings' as never)
      .insert({ competency_item_id: mappingIndicatorId, outcome_id: mappingOutcomeId } as never);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Mapping added');
      setMappingIndicatorId('');
      setMappingOutcomeId('');
      queryClient.invalidateQueries({ queryKey: ['competencyOutcomeMappings'] });
    }
  };

  const outcomeOptions = [
    ...ilos.map((o) => ({ id: o.id, label: `ILO: ${o.title}` })),
    ...plos.map((o) => ({ id: o.id, label: `PLO: ${o.title}` })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Competency Frameworks</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <Layers className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Frameworks</h2>
        </div>
        <div className="p-6">
          {isLoading ? <Shimmer className="h-32 rounded-lg" /> : frameworks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No frameworks defined yet.</p>
          ) : (
            <div className="space-y-2">
              {frameworks.map((fw) => (
                <div key={fw.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedFramework === fw.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`} role="button" tabIndex={0} onClick={() => setSelectedFramework(fw.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFramework(fw.id); } }}>
                  <div>
                    <span className="text-sm font-medium">{fw.name}</span>
                    <span className="text-xs text-slate-400 ms-2">v{fw.version}</span>
                    {fw.source && <span className="text-xs text-slate-400 ms-2">({fw.source})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {selectedFramework && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">Import Competency Items (CSV)</h2>
          <p className="text-xs text-slate-500 mb-3">CSV columns: domain_code, domain_title, competency_code, competency_title, indicator_code, indicator_title</p>
          <div className="flex items-center gap-3">
            <Input type="file" accept=".csv" onChange={handleCSVImport} className="max-w-sm" />
            {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          </div>
        </Card>
      )}

      {/* Competency Tree View (Task 115.2) */}
      {selectedFramework && items.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
            <Layers className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Competency Hierarchy</h2>
          </div>
          <div className="p-6">
            <CompetencyTree items={items} mappedItemIds={mappedItemIds} />
          </div>
        </Card>
      )}

      {/* Mapping Interface (Task 115.4) */}
      {selectedFramework && indicators.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            <Link2 className="h-4 w-4 inline me-2" />
            Map Indicator to Outcome
          </h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="mapping-indicator" className="text-xs font-medium text-slate-600 mb-1 block">Indicator</label>
              <Select value={mappingIndicatorId} onValueChange={setMappingIndicatorId}>
                <SelectTrigger id="mapping-indicator" className="bg-white"><SelectValue placeholder="Select indicator" /></SelectTrigger>
                <SelectContent>
                  {indicators.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.code} — {ind.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label htmlFor="mapping-outcome" className="text-xs font-medium text-slate-600 mb-1 block">Outcome (ILO/PLO)</label>
              <Select value={mappingOutcomeId} onValueChange={setMappingOutcomeId}>
                <SelectTrigger id="mapping-outcome" className="bg-white"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  {outcomeOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddMapping}
              disabled={!mappingIndicatorId || !mappingOutcomeId}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Map
            </Button>
          </div>
        </Card>
      )}

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-4">Add Framework</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="version" render={({ field }) => (
                <FormItem><FormLabel>Version</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem><FormLabel>Source (optional)</FormLabel><FormControl><Input placeholder="e.g. ABET, HEC" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default CompetencyFrameworkManager;
