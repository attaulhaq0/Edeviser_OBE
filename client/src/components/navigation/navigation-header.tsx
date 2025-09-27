import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { UnifiedNotificationCenter } from "@/components/notifications/unified-notification-center";

export function NavigationHeader() {
  const { user, logoutMutation } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role || "student");

  // Fetch user's progress data for display
  const { data: progress } = useQuery({
    queryKey: ["/api/student-progress/" + user?.id],
    enabled: !!user && user.role === "student",
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrator";
      case "coordinator": return "Coordinator";
      case "teacher": return "Teacher";
      case "student": return "Student";
      default: return "Unknown";
    }
  };

  const getStatsForRole = () => {
    switch (user?.role) {
      case "coordinator":
        return [
          { label: "Programs Managed", value: "3", icon: "fas fa-graduation-cap" },
          { label: "Students Tracked", value: "247", icon: "fas fa-users" },
          { label: "Outcomes Mapped", value: "89%", icon: "fas fa-chart-line" },
        ];
      case "teacher":
        return [
          { label: "Courses Teaching", value: "2", icon: "fas fa-chalkboard-teacher" },
          { label: "Active Students", value: "85", icon: "fas fa-user-graduate" },
          { label: "Assignments Created", value: "12", icon: "fas fa-tasks" },
        ];
      case "admin":
        return [
          { label: "Total Programs", value: "8", icon: "fas fa-university" },
          { label: "System Users", value: "1,247", icon: "fas fa-users-cog" },
          { label: "System Health", value: "98%", icon: "fas fa-heartbeat" },
        ];
      case "student":
        return [
          { label: "XP Earned", value: (progress as any)?.totalXP?.toString() || "0", icon: "fas fa-star" },
          { label: "Current Level", value: (progress as any)?.currentLevel?.toString() || "1", icon: "fas fa-trophy" },
          { label: "Streak Days", value: (progress as any)?.currentStreak?.toString() || "0", icon: "fas fa-fire" },
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-50" data-testid="navigation-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg">
              E
            </div>
            <div className="text-xl font-bold text-foreground">E Deviser</div>
            <Badge variant="secondary" className="text-xs">
              OBE Hub
            </Badge>
          </div>

          {/* User Profile & Role Info */}
          <div className="flex items-center space-x-4">
            {/* Role-specific stats */}
            {getStatsForRole().map((stat, index) => (
              <div key={index} className="hidden md:flex items-center space-x-2">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                  <i className={`${stat.icon} text-sm`}></i>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}

            {/* Unified Notification Center */}
            <UnifiedNotificationCenter />

            {/* Role Display */}
            <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Role:</span>
              <span className="text-sm font-medium text-foreground" data-testid="text-user-role">
                {getRoleLabel(user?.role || "")}
              </span>
            </div>

            {/* User Avatar and Info */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="text-user-email">
                  {user?.email}
                </div>
              </div>
              
              <div className="relative">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
