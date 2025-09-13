import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface BadgeDisplayProps {
  studentId?: string;
  showAll?: boolean;
  limit?: number;
  className?: string;
}

export function BadgeDisplay({ 
  studentId, 
  showAll = false, 
  limit = 6, 
  className = "" 
}: BadgeDisplayProps) {
  const { data: badgeTemplates } = useQuery({
    queryKey: ["/api/badge-templates"],
  });

  const { data: studentBadges } = useQuery({
    queryKey: ["/api/student-badges", studentId],
    enabled: !!studentId,
  });

  // Mock badge data for demonstration
  const earnedBadges = [
    {
      id: "1",
      name: "Array Master",
      description: "Completed all array data structure exercises",
      type: "mastery",
      iconUrl: "fa-star",
      color: "bg-yellow-500",
      earnedAt: new Date("2024-01-15"),
      xpReward: 100
    },
    {
      id: "2", 
      name: "Code Warrior",
      description: "Solved 10 consecutive coding challenges",
      type: "achievement",
      iconUrl: "fa-code",
      color: "bg-blue-500",
      earnedAt: new Date("2024-01-10"),
      xpReward: 150
    },
    {
      id: "3",
      name: "Study Streak",
      description: "Maintained a 7-day learning streak",
      type: "streak",
      iconUrl: "fa-fire",
      color: "bg-orange-500",
      earnedAt: new Date("2024-01-08"),
      xpReward: 200
    },
    {
      id: "4",
      name: "Algorithm Expert",
      description: "Mastered sorting algorithms",
      type: "mastery", 
      iconUrl: "fa-brain",
      color: "bg-purple-500",
      earnedAt: new Date("2024-01-05"),
      xpReward: 300
    },
    {
      id: "5",
      name: "Team Player",
      description: "Helped 5 classmates in discussion forums",
      type: "special",
      iconUrl: "fa-users",
      color: "bg-green-500",
      earnedAt: new Date("2024-01-03"),
      xpReward: 100
    },
    {
      id: "6",
      name: "Early Bird",
      description: "First to complete weekly assignment",
      type: "achievement",
      iconUrl: "fa-clock",
      color: "bg-indigo-500",
      earnedAt: new Date("2024-01-01"),
      xpReward: 75
    }
  ];

  // Available badges to work towards
  const availableBadges = [
    {
      id: "7",
      name: "Data Structure Guru",
      description: "Complete all data structure modules",
      type: "mastery",
      iconUrl: "fa-database",
      color: "bg-cyan-500",
      progress: 65,
      requirement: "8/12 modules completed",
      xpReward: 500
    },
    {
      id: "8",
      name: "Perfect Score",
      description: "Achieve 100% on any major assignment",
      type: "achievement", 
      iconUrl: "fa-medal",
      color: "bg-amber-500",
      progress: 0,
      requirement: "Score 100% on assignment",
      xpReward: 250
    },
    {
      id: "9",
      name: "Study Marathon",
      description: "Maintain 30-day learning streak",
      type: "streak",
      iconUrl: "fa-running",
      color: "bg-red-500",
      progress: 23,
      requirement: "7 more days needed",
      xpReward: 1000
    }
  ];

  const displayedEarned = showAll ? earnedBadges : earnedBadges.slice(0, limit);
  const totalXpFromBadges = earnedBadges.reduce((sum, badge) => sum + badge.xpReward, 0);

  const getBadgeTypeIcon = (type: string) => {
    switch (type) {
      case "mastery": return "fa-star";
      case "achievement": return "fa-trophy";
      case "streak": return "fa-fire";
      case "special": return "fa-gem";
      default: return "fa-medal";
    }
  };

  return (
    <Card className={`w-full ${className}`} data-testid="badge-display">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <i className="fas fa-trophy text-yellow-500 mr-3"></i>
            Badge Collection
          </span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {earnedBadges.length} Earned
          </Badge>
        </CardTitle>
        <CardDescription>
          Showcase your achievements and learning milestones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Badge Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <div className="text-2xl font-bold text-yellow-500" data-testid="stat-total-badges">
              {earnedBadges.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Badges</div>
          </div>
          
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-500" data-testid="stat-badge-xp">
              {totalXpFromBadges}
            </div>
            <div className="text-xs text-muted-foreground">XP from Badges</div>
          </div>
          
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-500" data-testid="stat-recent-badges">
              3
            </div>
            <div className="text-xs text-muted-foreground">This Month</div>
          </div>
        </div>

        {/* Earned Badges */}
        <div>
          <h4 className="font-medium text-foreground mb-4 flex items-center">
            <i className="fas fa-check-circle text-green-500 mr-2"></i>
            Recently Earned
          </h4>
          
          {displayedEarned.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {displayedEarned.map((badge, index) => (
                <div
                  key={badge.id}
                  className="relative group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  data-testid={`earned-badge-${index}`}
                >
                  <div className="text-center">
                    <div className={`w-12 h-12 ${badge.color} rounded-full flex items-center justify-center text-white text-xl mx-auto mb-3 shadow-lg`}>
                      <i className={`fas ${badge.iconUrl}`}></i>
                    </div>
                    <h5 className="font-semibold text-foreground text-sm mb-1">{badge.name}</h5>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{badge.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="capitalize">
                        {badge.type}
                      </Badge>
                      <span className="text-green-600 font-medium">+{badge.xpReward} XP</span>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        {badge.earnedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-trophy text-muted-foreground text-3xl mb-3"></i>
              <p className="text-muted-foreground">No badges earned yet</p>
              <p className="text-sm text-muted-foreground">Complete assignments and activities to earn your first badge!</p>
            </div>
          )}
          
          {!showAll && earnedBadges.length > limit && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm" data-testid="button-view-all-badges">
                View All {earnedBadges.length} Badges
              </Button>
            </div>
          )}
        </div>

        {/* Available Badges to Earn */}
        <div>
          <h4 className="font-medium text-foreground mb-4 flex items-center">
            <i className="fas fa-target text-primary mr-2"></i>
            Available to Earn
          </h4>
          
          <div className="space-y-4">
            {availableBadges.map((badge, index) => (
              <div
                key={badge.id}
                className="border border-dashed border-gray-300 rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                data-testid={`available-badge-${index}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${badge.color} opacity-50 rounded-full flex items-center justify-center text-white`}>
                    <i className={`fas ${badge.iconUrl}`}></i>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-foreground">{badge.name}</h5>
                      <span className="text-sm text-green-600 font-medium">+{badge.xpReward} XP</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{badge.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{badge.requirement}</span>
                        <span className="font-medium">{badge.progress}%</span>
                      </div>
                      <Progress value={badge.progress} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badge Collection CTA */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 text-center">
          <i className="fas fa-star text-yellow-500 text-2xl mb-2"></i>
          <h4 className="font-semibold text-foreground mb-1">Keep Learning!</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Complete more activities to unlock exclusive badges and rewards
          </p>
          <Button size="sm" data-testid="button-browse-badges">
            <i className="fas fa-search mr-2"></i>
            Browse All Badges
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
