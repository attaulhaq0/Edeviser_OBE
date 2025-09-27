import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, AlertCircle, CheckCircle, Info, Clock } from "lucide-react";
import type { SafeUser, Assignment, StudentSubmission, LearningOutcome } from "@shared/schema";

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "urgent";
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  timestamp: Date;
}

export function RoleNotifications() {
  const { user } = useAuth();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Fetch role-specific data for notifications
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments"],
    enabled: !!user && user.role === "teacher",
  });

  const { data: submissions = [] } = useQuery<StudentSubmission[]>({
    queryKey: ["/api/student-submissions"],
    enabled: !!user && user.role === "teacher",
  });

  const { data: learningOutcomes = [] } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/learning-outcomes"],
    enabled: !!user && (user.role === "coordinator" || user.role === "admin"),
  });

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "admin",
  });

  if (!user) return null;

  // Generate role-specific notifications
  const generateNotifications = (): Notification[] => {
    const notifications: Notification[] = [];

    switch (user.role) {
      case "admin":
        // System-wide notifications for admin
        const inactiveUsers = users.filter(u => !u.isActive);
        if (inactiveUsers.length > 0) {
          notifications.push({
            id: "inactive-users",
            type: "warning",
            title: "Inactive Users Detected",
            message: `${inactiveUsers.length} user account(s) are currently inactive`,
            actionLabel: "Review Users",
            actionUrl: "/admin/users",
            timestamp: new Date(),
          });
        }

        const unmappedOutcomes = learningOutcomes.filter(o => o.type === "ILO");
        if (unmappedOutcomes.length === 0) {
          notifications.push({
            id: "no-ilos",
            type: "urgent",
            title: "No ILOs Defined",
            message: "Institution needs at least one Institutional Learning Outcome",
            actionLabel: "Create ILO",
            actionUrl: "/admin/outcomes",
            timestamp: new Date(),
          });
        }

        notifications.push({
          id: "system-health",
          type: "success",
          title: "System Health: Excellent",
          message: "All systems operating at 98% efficiency",
          timestamp: new Date(),
        });
        break;

      case "coordinator":
        // Program management notifications
        const plos = learningOutcomes.filter(o => o.type === "PLO");
        const clos = learningOutcomes.filter(o => o.type === "CLO");
        
        if (plos.length === 0) {
          notifications.push({
            id: "no-plos",
            type: "warning",
            title: "Program Needs PLOs",
            message: "Your program requires Program Learning Outcomes",
            actionLabel: "Create PLO",
            actionUrl: "/coordinator/outcomes",
            timestamp: new Date(),
          });
        }

        if (clos.length > plos.length * 3) {
          notifications.push({
            id: "plo-alignment",
            type: "info",
            title: "Review PLO Alignment",
            message: "High CLO to PLO ratio detected - consider alignment review",
            actionLabel: "Visual Mapping",
            actionUrl: "/coordinator/mapping",
            timestamp: new Date(),
          });
        }

        notifications.push({
          id: "mapping-status",
          type: "info",
          title: "Outcome Mapping Active",
          message: `${plos.length} PLOs mapped to ${clos.length} CLOs`,
          timestamp: new Date(),
        });
        break;

      case "teacher":
        // Course and grading notifications
        const pendingGrading = submissions.filter(s => !s.gradedAt && 
          assignments.some(a => a.id === s.assignmentId && a.teacherId === user.id));
        
        if (pendingGrading.length > 0) {
          notifications.push({
            id: "pending-grading",
            type: "urgent",
            title: "Grading Required",
            message: `${pendingGrading.length} submission(s) awaiting your review`,
            actionLabel: "Grade Now",
            actionUrl: "/teacher/grading",
            timestamp: new Date(),
          });
        }

        const recentlyGraded = submissions.filter(s => 
          s.gradedAt && 
          new Date(s.gradedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 &&
          assignments.some(a => a.id === s.assignmentId && a.teacherId === user.id)
        );

        if (recentlyGraded.length > 0) {
          notifications.push({
            id: "recent-grading",
            type: "success",
            title: "Grading Complete",
            message: `${recentlyGraded.length} submission(s) graded in the last 24h`,
            timestamp: new Date(),
          });
        }

        const teacherCLOs = learningOutcomes.filter(o => 
          o.type === "CLO" && o.ownerId === user.id);
        
        if (teacherCLOs.length === 0) {
          notifications.push({
            id: "no-clos",
            type: "warning",
            title: "Course Needs CLOs",
            message: "Define Course Learning Outcomes for better assessment",
            actionLabel: "Create CLO",
            actionUrl: "/teacher/outcomes",
            timestamp: new Date(),
          });
        }
        break;

      case "student":
        // Learning progress notifications
        notifications.push({
          id: "daily-goal",
          type: "info",
          title: "Daily Learning Goal",
          message: "Complete today's challenge to maintain your streak!",
          actionLabel: "Start Learning",
          actionUrl: "/student/path",
          timestamp: new Date(),
        });

        notifications.push({
          id: "achievement-ready",
          type: "success",
          title: "Achievement Unlocked!",
          message: "You're close to earning the 'Data Structures Master' badge",
          timestamp: new Date(),
        });
        break;
    }

    return notifications;
  };

  const allNotifications = generateNotifications();
  const notifications = allNotifications.filter(n => !readNotifications.has(n.id));
  const urgentCount = notifications.filter(n => n.type === "urgent").length;
  const totalCount = notifications.length;

  const handleMarkAllAsRead = () => {
    const allIds = new Set(allNotifications.map(n => n.id));
    setReadNotifications(allIds);
  };

  const handleMarkAsRead = (notificationId: string) => {
    setReadNotifications(prev => new Set([...prev, notificationId]));
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "urgent": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "urgent": return "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "warning": return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
      case "success": return "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
      case "info": return "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800";
      default: return "bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-testid="notifications-trigger">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              variant={urgentCount > 0 ? "destructive" : "secondary"} 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              data-testid="notification-count"
            >
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end" data-testid="notifications-content">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Notifications
          </h3>
          <p className="text-sm text-muted-foreground">
            {totalCount === 0 ? "All caught up!" : `${totalCount} notification${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground">You're all set!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${getNotificationColor(notification.type)}`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {notification.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {notification.actionLabel && (
                          <Button size="sm" variant="outline" className="text-xs h-6">
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs" 
              onClick={handleMarkAllAsRead}
              data-testid="mark-all-read"
            >
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}