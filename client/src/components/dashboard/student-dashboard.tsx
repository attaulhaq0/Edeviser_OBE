import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressDisplay } from "@/components/gamification/progress-display";
import { BadgeDisplay } from "@/components/gamification/badge-display";

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: progress } = useQuery({
    queryKey: ["/api/student-progress/" + user?.id],
    enabled: !!user,
  });

  const { data: courses } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: learningModules } = useQuery({
    queryKey: ["/api/learning-modules"],
    enabled: !!user,
  });

  const xpToNextLevel = (progress?.currentLevel || 1) * 200;
  const currentLevelProgress = ((progress?.totalXP || 0) % 200) / 200 * 100;

  return (
    <div className="space-y-8" data-testid="student-dashboard">
      {/* Welcome Hero Section */}
      <section className="bg-gradient-to-br from-purple-500 via-blue-500 to-green-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="welcome-title">
                Welcome back, {user?.firstName}! 🚀
              </h1>
              <p className="text-lg opacity-90 mb-4">
                Ready to continue your learning journey?
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-star text-xl text-yellow-300"></i>
                  <span className="font-medium" data-testid="stat-total-xp">
                    {progress?.totalXP || 0} XP Earned
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-trophy text-xl text-yellow-300"></i>
                  <span className="font-medium" data-testid="stat-current-level">
                    Level {progress?.currentLevel || 1}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-fire text-xl text-orange-300"></i>
                  <span className="font-medium" data-testid="stat-current-streak">
                    {progress?.currentStreak || 0} Day Streak
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center min-w-[140px]">
              <div className="text-2xl font-bold text-yellow-300 mb-2">
                {progress?.totalBadges || 0}
              </div>
              <div className="text-sm font-medium">Badges</div>
              <div className="text-sm font-medium">Earned</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 bg-white/5 rounded-full"></div>
      </section>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Level Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-chart-line text-primary mr-3"></i>
              Level Progress
            </CardTitle>
            <CardDescription>
              Your journey to the next level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary" data-testid="display-current-level">
                    Level {progress?.currentLevel || 1}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {progress?.totalXP || 0} / {xpToNextLevel} XP
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-foreground">
                    {xpToNextLevel - (progress?.totalXP || 0)} XP
                  </div>
                  <div className="text-sm text-muted-foreground">to next level</div>
                </div>
              </div>
              
              <Progress value={currentLevelProgress} className="h-4" />
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-secondary" data-testid="stat-xp-today">250</div>
                  <div className="text-xs text-muted-foreground">XP Today</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-accent" data-testid="stat-modules-completed">12</div>
                  <div className="text-xs text-muted-foreground">Modules Done</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-500" data-testid="stat-assignments-submitted">8</div>
                  <div className="text-xs text-muted-foreground">Assignments</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-calendar-day text-green-500 mr-2"></i>
              Today's Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                  <i className="fas fa-check"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Complete Daily Challenge</div>
                  <div className="text-xs text-green-500">Completed +50 XP</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs animate-pulse">
                  <i className="fas fa-play"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Study Data Structures</div>
                  <div className="text-xs text-blue-500">In Progress</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">Submit Assignment</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </div>

            <Button className="w-full" size="sm" data-testid="button-view-all-goals">
              View All Goals
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Learning Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-route text-purple-500 mr-3"></i>
            Learning Path: Data Structures & Algorithms
          </CardTitle>
          <CardDescription>
            Your personalized learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4 overflow-x-auto pb-4">
            {/* Learning Path Nodes */}
            <div className="flex-shrink-0 text-center">
              <div className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto border-4 border-green-200 shadow-lg">
                <i className="fas fa-check text-lg"></i>
              </div>
              <div className="text-xs font-medium text-foreground">Arrays</div>
              <div className="text-xs text-green-500">Complete</div>
              <Badge variant="secondary" className="text-xs mt-1">+100 XP</Badge>
            </div>

            <div className="w-8 h-px bg-green-500 flex-shrink-0"></div>

            <div className="flex-shrink-0 text-center">
              <div className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto border-4 border-green-200 shadow-lg">
                <i className="fas fa-check text-lg"></i>
              </div>
              <div className="text-xs font-medium text-foreground">Linked Lists</div>
              <div className="text-xs text-green-500">Complete</div>
              <Badge variant="secondary" className="text-xs mt-1">+120 XP</Badge>
            </div>

            <div className="w-8 h-px bg-blue-500 flex-shrink-0"></div>

            <div className="flex-shrink-0 text-center">
              <div className="bg-blue-500 text-white w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto border-4 border-blue-200 shadow-lg animate-pulse">
                <i className="fas fa-play text-lg"></i>
              </div>
              <div className="text-xs font-medium text-foreground">Stacks</div>
              <div className="text-xs text-blue-500">In Progress</div>
              <Badge variant="outline" className="text-xs mt-1">75% Done</Badge>
            </div>

            <div className="w-8 h-px bg-gray-300 flex-shrink-0"></div>

            <div className="flex-shrink-0 text-center">
              <div className="bg-muted text-muted-foreground w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto border-4 border-muted">
                <i className="fas fa-lock text-lg"></i>
              </div>
              <div className="text-xs font-medium text-muted-foreground">Queues</div>
              <div className="text-xs text-muted-foreground">Locked</div>
              <Badge variant="outline" className="text-xs mt-1">+150 XP</Badge>
            </div>

            <div className="w-8 h-px bg-gray-300 flex-shrink-0"></div>

            <div className="flex-shrink-0 text-center">
              <div className="bg-muted text-muted-foreground w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto border-4 border-muted">
                <i className="fas fa-lock text-lg"></i>
              </div>
              <div className="text-xs font-medium text-muted-foreground">Trees</div>
              <div className="text-xs text-muted-foreground">Locked</div>
              <Badge variant="outline" className="text-xs mt-1">+200 XP</Badge>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button data-testid="button-continue-learning">
              <i className="fas fa-play mr-2"></i>
              Continue Learning
            </Button>
            <div className="text-sm text-muted-foreground">
              2 of 6 modules completed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements and Competency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-trophy text-yellow-500 mr-2"></i>
              Recent Badges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-2 bg-yellow-50 rounded-lg">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm">
                <i className="fas fa-star"></i>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Array Master</div>
                <div className="text-xs text-muted-foreground">Completed all array exercises</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                <i className="fas fa-code"></i>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Code Warrior</div>
                <div className="text-xs text-muted-foreground">Solved 10 coding challenges</div>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4" data-testid="button-view-all-badges">
              View All Badges
            </Button>
          </CardContent>
        </Card>

        {/* Competency Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-chart-pie text-purple-500 mr-2"></i>
              Competency Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Problem Solving</span>
                <span className="text-primary font-medium">85%</span>
              </div>
              <Progress value={85} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Algorithm Design</span>
                <span className="text-secondary font-medium">72%</span>
              </div>
              <Progress value={72} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Code Quality</span>
                <span className="text-accent font-medium">91%</span>
              </div>
              <Progress value={91} />
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4" data-testid="button-detailed-analysis">
              Detailed Analysis
            </Button>
          </CardContent>
        </Card>

        {/* Study Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-chart-bar text-green-500 mr-2"></i>
              Study Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">4.5h</div>
              <div className="text-sm text-muted-foreground">Study Time Today</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">This Week</span>
                <span className="text-sm font-semibold">28.5h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">This Month</span>
                <span className="text-sm font-semibold">142h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average/Day</span>
                <span className="text-sm font-semibold">3.2h</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Weekly Goal</div>
              <div className="text-sm font-semibold text-foreground">25h / 30h</div>
              <Progress value={83} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
