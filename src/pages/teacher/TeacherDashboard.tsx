import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import RealtimeStatusBanner from '@/components/shared/RealtimeStatusBanner';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { usePendingSubmissions } from '@/hooks/useSubmissions';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTeacherKPIs, useTeacherCLOAttainment, useTeacherBloomsDistribution,
  useStudentPerformanceHeatmap, useAtRiskStudents, useSendNudge,
  useTeacherRecoveryAlerts,
} from '@/hooks/useTeacherDashboard';
import type { AtRiskStudent } from '@/hooks/useTeacherDashboard';
import type { BloomsLevel } from '@/types/app';
import AIAtRiskWidget from '@/components/shared/AIAtRiskWidget';
import {
  ClipboardList, CheckSquare, TrendingUp, AlertTriangle, BarChart3,
  PieChart as PieChartIcon, Grid3X3, ArrowRight, Send, Loader2, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const BLOOMS_COLORS: Record<BloomsLevel, string> = {
  remembering: '#a855f7', understanding: '#3b82f6', applying: '#22c55e',
  analyzing: '#eab308', evaluating: '#f97316', creating: '#ef4444',
};

const getAttainmentColor = (percent: number): string => {
  if (percent < 0) return '#e5e7eb';
  if (percent >= 85) return '#22c55e';
  if (percent >= 70) return '#3b82f6';
  if (percent >= 50) return '#eab308';
  return '#ef4444';
};

const getAttainmentLabel = (percent: number): string => {
  if (percent < 0) return '—';
  if (percent >= 85) return 'Excellent';
  if (percent >= 70) return 'Satisfactory';
  if (percent >= 50) return 'Developing';
  return 'Not Yet';
};

interface KPICardProps { icon: LucideIcon; label: string; value: number | string; }

const KPICard = ({ icon: Icon, label, value }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">{label}</p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { clo_title: string; blooms_level: BloomsLevel } }>;
}

const CLOBarTooltip = ({ active, payload }: BarTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold truncate max-w-[200px]">{item.payload.clo_title}</p>
      <p className="text-gray-500">{item.payload.blooms_level}</p>
      <p className="font-black mt-1">{item.value}%</p>
    </div>
  );
};

const AtRiskStudentCard = () => {
  const { t } = useTranslation('teacher');
  const { data: atRiskStudents, isLoading } = useAtRiskStudents();
  const nudgeMutation = useSendNudge();
  const [nudgeTarget, setNudgeTarget] = useState<AtRiskStudent | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState('');

  const openNudgeDialog = (student: AtRiskStudent) => {
    setNudgeTarget(student);
    setNudgeMessage(
      `Hi ${student.full_name}, we noticed you haven't been active recently. Let us know if you need help!`,
    );
  };

  const handleSendNudge = () => {
    if (!nudgeTarget) return;
    nudgeMutation.mutate(
      { studentId: nudgeTarget.id, message: nudgeMessage },
      {
        onSuccess: () => {
          toast.success(t('dashboard.nudgeSent', { name: nudgeTarget.full_name }));
          setNudgeTarget(null);
          setNudgeMessage('');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('dashboard.nudgeFailed'));
        },
      },
    );
  };

  return (
    <>
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold tracking-tight">{t('dashboard.atRiskStudents')}</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Shimmer key={i} className="h-14 rounded-lg" />))}</div>
        ) : !atRiskStudents || atRiskStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-green-50 mb-3"><CheckSquare className="h-8 w-8 text-green-500" /></div>
            <p className="text-sm text-gray-500">{t('dashboard.noAtRisk')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{student.full_name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {student.risk_reasons.map((reason) => (
                      <Badge key={reason} variant="outline"
                        className={reason.includes('Inactive') ? 'bg-red-50 text-red-600 border-red-200 text-xs' : 'bg-amber-50 text-amber-600 border-amber-200 text-xs'}>
                        {reason}
                      </Badge>
                    ))}
                    {student.days_inactive > 0 && (
                      <span className="text-xs text-gray-400">{t('dashboard.daysInactive', { count: student.days_inactive })}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="ml-3 shrink-0" onClick={() => openNudgeDialog(student)}>
                  <Send className="h-4 w-4" />{t('dashboard.nudge')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!nudgeTarget} onOpenChange={(open) => { if (!open) setNudgeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.sendNudgeTo', { name: nudgeTarget?.full_name })}</DialogTitle>
          </DialogHeader>
          <Textarea value={nudgeMessage} onChange={(e) => setNudgeMessage(e.target.value)} rows={4} placeholder={t('dashboard.nudgePlaceholder')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNudgeTarget(null)} disabled={nudgeMutation.isPending}>
              {t('common:buttons.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSendNudge} disabled={nudgeMutation.isPending || !nudgeMessage.trim()}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
              {nudgeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('dashboard.nudge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const MasteryRecoveryAlertCard = () => {
  const { t } = useTranslation('teacher');
  const { data: recoveryAlerts, isLoading } = useTeacherRecoveryAlerts();

  if (isLoading) {
    return <Shimmer className="h-40 rounded-xl" />;
  }

  if (!recoveryAlerts || recoveryAlerts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden border-l-4 border-l-amber-500">
      <div className="px-6 py-4 bg-amber-50 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-bold tracking-tight text-amber-900">
          {t('dashboard.masteryRecovery.title')}
        </h2>
        <Badge variant="outline" className="ml-auto bg-amber-100 text-amber-700 border-amber-300 text-xs font-bold">
          {recoveryAlerts.length}
        </Badge>
      </div>
      <div className="p-6">
        <p className="text-xs text-gray-500 mb-4">{t('dashboard.masteryRecovery.description')}</p>
        <div className="space-y-3">
          {recoveryAlerts.map((alert) => (
            <div
              key={alert.recovery_id}
              className="flex items-start justify-between py-3 px-4 rounded-lg bg-amber-50/50 border border-amber-100"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{alert.student_name}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate" title={alert.clo_title}>
                  {alert.clo_title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                    {t('dashboard.masteryRecovery.failures', { count: alert.failure_count })}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">
                    {t('dashboard.masteryRecovery.inRecovery')}
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-3 mt-0.5">
                {formatDistanceToNow(new Date(alert.activated_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const TeacherDashboard = () => {
  const { t } = useTranslation('teacher');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: paginatedCourses, isLoading: coursesLoading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const teacherCourses = useMemo(
    () => (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id],
  );

  const effectiveCourseId = selectedCourseId || (teacherCourses.length > 0 ? teacherCourses[0]!.id : '');

  const handleGradingPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.submissions.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.teacherDashboard.lists() });
  }, [queryClient]);

  const handleGradingPolling = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.submissions.lists() });
  }, [queryClient]);

  const { isLive } = useRealtime({
    table: 'submissions', event: 'INSERT',
    onPayload: handleGradingPayload, pollingFn: handleGradingPolling, pollingInterval: 30_000,
  });

  const { data: kpis, isLoading: kpisLoading } = useTeacherKPIs();
  const { data: cloAttainment, isLoading: cloLoading } = useTeacherCLOAttainment(effectiveCourseId);
  const { data: bloomsDist, isLoading: bloomsLoading } = useTeacherBloomsDistribution();
  const { data: heatmapData, isLoading: heatmapLoading } = useStudentPerformanceHeatmap(effectiveCourseId);
  const { data: pendingSubmissions, isLoading: pendingLoading } = usePendingSubmissions();

  const heatmapGrid = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return { students: [] as string[], clos: [] as string[], lookup: new Map<string, number>() };
    const students = [...new Set(heatmapData.map((c) => c.student_name))];
    const clos = [...new Set(heatmapData.map((c) => c.clo_title))];
    const lookup = new Map<string, number>();
    for (const cell of heatmapData) { lookup.set(`${cell.student_name}:${cell.clo_title}`, cell.attainment_percent); }
    return { students, clos, lookup };
  }, [heatmapData]);

  const recentPending = useMemo(() => (pendingSubmissions ?? []).slice(0, 5), [pendingSubmissions]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
      <RealtimeStatusBanner isLive={isLive} />

      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (<Shimmer key={i} className="h-24 rounded-xl" />))}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={ClipboardList} label={t('dashboard.pendingSubmissions')} value={kpis?.pendingSubmissions ?? 0} />
          <KPICard icon={CheckSquare} label={t('dashboard.gradedThisWeek')} value={kpis?.gradedThisWeek ?? 0} />
          <KPICard icon={TrendingUp} label={t('dashboard.avgAttainment')} value={`${kpis?.avgAttainment ?? 0}%`} />
          <KPICard icon={AlertTriangle} label={t('dashboard.atRiskStudents')} value={kpis?.atRiskCount ?? 0} />
        </div>
      )}

      <div className="flex items-center gap-3">
        {coursesLoading ? (<Shimmer className="h-9 w-56" />) : (
          <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-56 bg-white"><SelectValue placeholder={t('dashboard.selectCourse')} /></SelectTrigger>
            <SelectContent>
              {teacherCourses.map((course) => (<SelectItem key={course.id} value={course.id}>{course.code} — {course.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      <MasteryRecoveryAlertCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">{t('dashboard.cloAttainment')}</h2>
          </div>
          {cloLoading ? (<Shimmer className="h-[300px] rounded-xl" />) : !cloAttainment || cloAttainment.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">{t('dashboard.noCloData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cloAttainment} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="clo_title" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 15)}…` : v} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CLOBarTooltip />} />
                <Bar dataKey="avg_attainment" radius={[4, 4, 0, 0]}>
                  {cloAttainment.map((entry, idx) => (<Cell key={idx} fill={BLOOMS_COLORS[entry.blooms_level] ?? '#64748b'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">{t('dashboard.bloomsDistribution')}</h2>
          </div>
          {bloomsLoading ? (<Shimmer className="h-[300px] rounded-xl" />) : !bloomsDist || bloomsDist.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">{t('dashboard.noClosDefined')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={bloomsDist} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, value }) => `${String(name ?? '')}: ${value}`} labelLine={false}>
                  {bloomsDist.map((entry, idx) => (<Cell key={idx} fill={BLOOMS_COLORS[entry.level] ?? '#64748b'} />))}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold tracking-tight">{t('dashboard.studentHeatmap')}</h2>
        </div>
        {heatmapLoading ? (<Shimmer className="h-48 rounded-xl" />) : heatmapGrid.students.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">{t('dashboard.noHeatmapData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 sticky left-0 bg-white">{t('dashboard.student')}</th>
                {heatmapGrid.clos.map((clo) => (
                  <th key={clo} className="py-2 px-2 text-xs font-semibold text-gray-500 text-center max-w-[100px] truncate" title={clo}>
                    {clo.length > 12 ? `${clo.slice(0, 12)}…` : clo}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {heatmapGrid.students.map((student) => (
                  <tr key={student} className="border-t border-slate-100">
                    <td className="py-2 px-3 font-medium text-gray-700 sticky left-0 bg-white whitespace-nowrap">{student}</td>
                    {heatmapGrid.clos.map((clo) => {
                      const val = heatmapGrid.lookup.get(`${student}:${clo}`) ?? -1;
                      return (
                        <td key={clo} className="py-2 px-2 text-center">
                          <div className="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: getAttainmentColor(val) }}
                            title={`${val >= 0 ? `${val}% — ${getAttainmentLabel(val)}` : 'No data'}`}>
                            {val >= 0 ? `${val}%` : '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} /><span>{t('dashboard.heatmapLegend.excellent')}</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} /><span>{t('dashboard.heatmapLegend.satisfactory')}</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }} /><span>{t('dashboard.heatmapLegend.developing')}</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} /><span>{t('dashboard.heatmapLegend.notYet')}</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#e5e7eb' }} /><span>{t('dashboard.heatmapLegend.noData')}</span></div>
            </div>
          </div>
        )}
      </Card>

      <AIAtRiskWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold tracking-tight">{t('dashboard.gradingQueue')}</h2>
            </div>
            <Link to="/teacher/grading" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              {t('dashboard.viewAll')}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {pendingLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Shimmer key={i} className="h-12 rounded-lg" />))}</div>
          ) : recentPending.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">{t('dashboard.noPending')}</div>
          ) : (
            <div className="space-y-3">
              {recentPending.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{sub.profiles?.full_name ?? 'Unknown Student'}</p>
                    <p className="text-xs text-gray-500 truncate">{sub.assignments?.title ?? 'Unknown Assignment'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.is_late && (<Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">{t('dashboard.late')}</Badge>)}
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <AtRiskStudentCard />
      </div>
    </div>
  );
};

export default TeacherDashboard;
