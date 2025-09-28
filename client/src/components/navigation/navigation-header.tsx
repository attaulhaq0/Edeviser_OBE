import { useState } from "react";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnifiedNotificationCenter } from "@/components/notifications/unified-notification-center";
import { Shield } from "lucide-react";
import edeviserLogo from "@assets/edeviser-logo.png";

export function NavigationHeader() {
  const { user, profile, signOut } = useAuth();
  const [selectedRole, setSelectedRole] = useState(profile?.role || "student");

  const handleLogout = async () => {
    await signOut();
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
    switch (profile?.role) {
      case "coordinator":
        return [
          { label: "Programs Managed", value: "3", icon: "fas fa-graduation-cap" },
          { label: "Students Tracked", value: "125", icon: "fas fa-users" },
          { label: "Outcomes Mapped", value: "87%", icon: "fas fa-chart-line" },
        ];
      case "teacher":
        return [
          { label: "Courses Teaching", value: "2", icon: "fas fa-chalkboard-teacher" },
          { label: "Active Students", value: "45", icon: "fas fa-user-graduate" },
          { label: "Assignments Created", value: "12", icon: "fas fa-tasks" },
        ];
      case "admin":
        return [
          { label: "Total Programs", value: "5", icon: "fas fa-university" },
          { label: "System Users", value: "250", icon: "fas fa-users-cog" },
          { label: "System Health", value: "98%", icon: "fas fa-heartbeat" },
        ];
      case "student":
        return [
          { label: "XP Earned", value: "1,250", icon: "fas fa-star" },
          { label: "Current Level", value: "7", icon: "fas fa-trophy" },
          { label: "Streak Days", value: "12", icon: "fas fa-fire" },
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl border-b border-purple-500/20 sticky top-0 z-50 backdrop-blur-xl" data-testid="navigation-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <img 
              src={edeviserLogo} 
              alt="Edeviser Logo" 
              className="h-16 w-auto filter drop-shadow-lg" 
              data-testid="img-logo"
            />
            <div className="ml-3 hidden md:block">
              <h1 className="text-white font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                E-Deviser LXP
              </h1>
              <p className="text-gray-300 text-xs">Learning Experience Platform</p>
            </div>
          </div>

          {/* User Profile & Role Info */}
          <div className="flex items-center space-x-6">
            {/* Role-specific stats */}
            {getStatsForRole().map((stat, index) => (
              <div key={index} className="hidden lg:flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-2.5 rounded-lg shadow-lg">
                  <i className={`${stat.icon} text-sm`}></i>
                </div>
                <div>
                  <div className="text-sm font-bold text-white" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-300">{stat.label}</div>
                </div>
              </div>
            ))}

            {/* Unified Notification Center */}
            <div className="relative">
              <UnifiedNotificationCenter />
            </div>

            {/* Role Display */}
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-500/30">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-300">Role:</span>
              <span className="text-sm font-semibold text-white" data-testid="text-user-role">
                {getRoleLabel(profile?.role || "")}
              </span>
            </div>

            {/* User Avatar and Info */}
            <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-right">
                <div className="text-sm font-semibold text-white" data-testid="text-user-name">
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div className="text-xs text-gray-300" data-testid="text-user-email">
                  {profile?.email}
                </div>
              </div>
              
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white/30">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-200"
                data-testid="button-logout"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
