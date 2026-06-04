// Task 66.4: Announcement detail view with Read habit timer (30+ seconds)
// Requirements: 75.5
// Feature: qa-partner-review-remediation — Req 15.4: student mark-as-read upsert.
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useAnnouncement,
  useMarkAnnouncementRead,
} from "@/hooks/useAnnouncements";
import { useAuth } from "@/hooks/useAuth";
import { useReadHabitTimer } from "@/hooks/useReadHabitTimer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { AnnouncementAttachmentList } from "@/components/shared/AnnouncementAttachmentList";
import { ArrowLeft, Megaphone, Pin, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const AnnouncementDetail = () => {
  const { announcementId } = useParams<{ announcementId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: announcement, isLoading } = useAnnouncement(announcementId);
  const markRead = useMarkAnnouncementRead();

  // Record a read receipt when a student views the announcement. Idempotent via
  // the UNIQUE(announcement_id, student_id) upsert, so repeated views are safe
  // (Req 15.4). Only students record receipts.
  const studentId = role === "student" ? user?.id : undefined;
  const markReadMutate = markRead.mutate;
  useEffect(() => {
    if (!announcementId || !studentId) return;
    markReadMutate({ announcementId, studentId });
  }, [announcementId, studentId, markReadMutate]);

  // Wire into Read habit — 30+ seconds of viewing counts as "Read" habit
  const { elapsedSeconds, isCompleted } = useReadHabitTimer({
    pageType: "assignment_detail", // reuse existing page type
    pageId: announcementId ?? "",
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Announcement not found.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-gray-500"
      >
        <ArrowLeft className="h-4 w-4 me-1" /> Back
      </Button>

      <Card
        className={`bg-white border-0 shadow-md rounded-xl overflow-hidden ${
          announcement.is_pinned ? "ring-1 ring-amber-200" : ""
        }`}
      >
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Megaphone className="h-5 w-5 text-white" />
          <h1 className="text-lg font-bold tracking-tight text-white flex-1">
            {announcement.title}
          </h1>
          {announcement.is_pinned && (
            <Badge className="bg-white/20 text-white border-0 text-xs">
              <Pin className="h-3 w-3 me-1" /> Pinned
            </Badge>
          )}
        </div>
        <div className="p-6">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
            {announcement.content}
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-gray-400">
              Posted{" "}
              {format(
                new Date(announcement.created_at),
                "MMMM d, yyyy · h:mm a"
              )}
            </p>
            {/* Read habit progress indicator */}
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <Badge className="bg-green-50 text-green-600 border-green-200 text-xs">
                  <CheckCircle2 className="h-3 w-3 me-1" /> Read habit ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-gray-400">
                  <Clock className="h-3 w-3 me-1" /> {30 - elapsedSeconds}s to
                  read habit
                </Badge>
              )}
            </div>
          </div>
          {/* Attachments — signed-URL download from the private bucket */}
          {announcementId && (
            <AnnouncementAttachmentList announcementId={announcementId} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnnouncementDetail;
