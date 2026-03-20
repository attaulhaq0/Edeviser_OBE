import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { usePrograms } from '@/hooks/usePrograms';
import { useGenerateReport, type ReportTemplate } from '@/hooks/useAccreditationReport';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Mail,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

// ─── Semester stub (uses programs query for now) ────────────────────────────

interface SemesterOption {
  id: string;
  name: string;
}

const useSemesters = () => {
  // Lightweight query — semesters table may not be populated yet
  return { data: [] as SemesterOption[], isLoading: false };
};

// ─── Template options ───────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: Array<{ value: ReportTemplate; label: string; description: string }> = [
  { value: 'ABET', label: 'ABET', description: 'Accreditation Board for Engineering and Technology' },
  { value: 'HEC', label: 'HEC', description: 'Higher Education Commission (Pakistan)' },
  { value: 'Generic', label: 'Generic', description: 'General accreditation report format' },
];

// ─── Report Generator Page ──────────────────────────────────────────────────

const ReportGeneratorPage = () => {
  const { data: programsResult, isLoading: programsLoading } = usePrograms({ pageSize: 100 });
  const { data: semesters, isLoading: semestersLoading } = useSemesters();
  const generateMutation = useGenerateReport();

  const [programId, setProgramId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [template, setTemplate] = useState<ReportTemplate>('Generic');
  const [emailTo, setEmailTo] = useState('');
  const [lastResult, setLastResult] = useState<{
    download_url: string;
    file_name: string;
    program_name: string;
    template: ReportTemplate;
    semester: string | null;
    plo_count: number;
    ilo_count: number;
  } | null>(null);

  const programs = programsResult?.data ?? [];

  const handleGenerate = () => {
    if (!programId) {
      toast.error('Please select a program');
      return;
    }

    setLastResult(null);

    generateMutation.mutate(
      {
        program_id: programId,
        semester_id: semesterId || undefined,
        template,
        email_to: emailTo || undefined,
      },
      {
        onSuccess: (result) => {
          setLastResult(result);
          toast.success('Report generated successfully');
          if (emailTo) {
            toast.success(`Report link sent to ${emailTo}`);
          }
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Report generation failed');
        },
      },
    );
  };

  const handleDownload = () => {
    if (lastResult?.download_url) {
      window.open(lastResult.download_url, '_blank');
    }
  };

  const isLoading = programsLoading || semestersLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Accreditation Reports</h1>
      </div>

      {/* Report Configuration Card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <FileText className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Generate Report</h2>
        </div>
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Program Selector */}
              <div className="space-y-2">
                <Label htmlFor="program-select">Program</Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger id="program-select" className="bg-white">
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                    {programs.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No programs available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Semester Selector */}
              <div className="space-y-2">
                <Label htmlFor="semester-select">Semester (optional)</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger id="semester-select" className="bg-white">
                    <SelectValue placeholder="All semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All semesters</SelectItem>
                    {semesters.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Selector */}
              <div className="space-y-2">
                <Label htmlFor="template-select">Report Template</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as ReportTemplate)}>
                  <SelectTrigger id="template-select" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-gray-500 ml-2">— {t.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Delivery (optional) */}
              <div className="space-y-2">
                <Label htmlFor="email-input">Email delivery (optional)</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="recipient@institution.edu"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  If provided, a download link will be emailed after generation.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !programId}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Result Card */}
      {lastResult && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <CheckCircle2 className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Report Ready</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Program
                </p>
                <p className="font-semibold mt-1">{lastResult.program_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Template
                </p>
                <p className="font-semibold mt-1">{lastResult.template}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  PLOs
                </p>
                <p className="font-semibold mt-1">{lastResult.plo_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  ILOs
                </p>
                <p className="font-semibold mt-1">{lastResult.ilo_count}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownload}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {lastResult.semester && (
                <span className="text-xs text-gray-500">
                  Semester: {lastResult.semester}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportGeneratorPage;
