import { useAuth } from "@/hooks/useSupabaseAuth";
import { Bell, AlertCircle, CheckCircle, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RoleNotifications() {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  // Mock notifications based on role
  const getNotificationsForRole = () => {
    switch (profile.role) {
      case "admin":
        return [
          { id: 1, title: "System Update Available", type: "info", time: "2 hours ago" },
          { id: 2, title: "New User Registration", type: "success", time: "1 hour ago" }
        ];
      case "coordinator":
        return [
          { id: 1, title: "Program Review Required", type: "warning", time: "3 hours ago" },
          { id: 2, title: "Student Progress Updated", type: "info", time: "1 hour ago" }
        ];
      case "teacher":
        return [
          { id: 1, title: "Assignment Submitted", type: "info", time: "30 minutes ago" },
          { id: 2, title: "Grading Required", type: "warning", time: "2 hours ago" }
        ];
      case "student":
        return [
          { id: 1, title: "New Assignment Available", type: "info", time: "1 hour ago" },
          { id: 2, title: "Grade Published", type: "success", time: "3 hours ago" }
        ];
      default:
        return [];
    }
  };

  const notifications = getNotificationsForRole();

  const getIconForType = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "info": return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Notifications
        </CardTitle>
        <CardDescription>Your recent updates and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notifications at the moment
            </p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                {getIconForType(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" className="w-full">
            View All Notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}