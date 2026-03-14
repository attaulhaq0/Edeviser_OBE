import { useState } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { usePendingOnboardingStudents } from '@/hooks/useAdminDashboard';
import { usePrograms } from '@/hooks/usePrograms';
import { supabase } from '@/lib/supabase';
import { Search, Send, UserX, Loader2 } from 'lucide-react';
import { formatDistanceToNow, subDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const PendingOnboardingPage = () => {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [programFilter, setProgramFilter] = useQueryState('program', parseAsString.withDefault('all'));
  const [dateFilter, setDateFilter] = useQueryState('enrolled', parseAsString.withDefault('all'));
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const enrolledAfter = dateFilter === '7d'
    ? subDays(new Date(), 7).toISOString()
    : dateFilter === '30d'
      ? subDays(new Date(), 30).toISOString()
      : undefined;

  const { data: students, isLoading } = usePendingOnboardingStudents({
    programId: programFilter !== 'all' ? programFilter : undefined,
    enrolledAfter,
  });

  const { data: programsResult } = usePrograms();
  const programs = programsResult?.data ?? [];

  // Filter by search
  const filtered = (students ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const handleSendReminder = async (studentId: string, email: string) => {
    setSendingReminder(studentId);
    try {
      const { error } = await supabase.functions.invoke('send-onboarding-reminder', {
        body: { student_id: studentId, email },
      });
      if (error) throw error;
      toast.success('Reminder sent');
    } catch {
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pending Onboarding</h1>
        <Badge variant="outline" className="text-sm">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Enrollment Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((student) => {
              const daysSinceCreation = differenceInDays(new Date(), new Date(student.created_at));
              const isOverdue = daysSinceCreation >= 7;

              return (
                <div key={student.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      Joined {formatDistanceToNow(new Date(student.created_at), { addSuffix: true })}
                    </span>
                    {isOverdue && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                        Overdue
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingReminder === student.id}
                      onClick={() => handleSendReminder(student.id, student.email)}
                      className="text-xs"
                    >
                      {sendingReminder === student.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Remind
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <UserX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">All students have completed onboarding.</p>
        </Card>
      )}
    </div>
  );
};

export default PendingOnboardingPage;
