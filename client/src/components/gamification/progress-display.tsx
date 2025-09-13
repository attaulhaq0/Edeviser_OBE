import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProgressDisplayProps {
  currentLevel: number;
  totalXP: number;
  currentStreak: number;
  longestStreak?: number;
  xpToNextLevel?: number;
  className?: string;
}

export function ProgressDisplay({
  currentLevel,
  totalXP,
  currentStreak,
  longestStreak = 0,
  xpToNextLevel,
  className = ""
}: ProgressDisplayProps) {
  // Calculate XP needed for next level (200 XP per level)
  const xpPerLevel = 200;
  const calculatedXpToNextLevel = xpToNextLevel || (currentLevel * xpPerLevel);
  const currentLevelProgress = ((totalXP % xpPerLevel) / xpPerLevel) * 100;
  const xpNeededForNext = calculatedXpToNextLevel - totalXP;

  const getLevelTitle = (level: number) => {
    if (level >= 20) return "Master Scholar";
    if (level >= 15) return "Expert Learner";
    if (level >= 10) return "Advanced Student";
    if (level >= 5) return "Rising Star";
    return "Novice Learner";
  };

  return (
    <Card className={`w-full ${className}`} data-testid="progress-display">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <i className="fas fa-chart-line text-primary mr-3"></i>
            Learning Progress
          </span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            Level {currentLevel}
          </Badge>
        </CardTitle>
        <CardDescription>
          {getLevelTitle(currentLevel)} • Track your learning journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* XP Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-primary" data-testid="display-total-xp">
                {totalXP} XP
              </div>
              <div className="text-sm text-muted-foreground">
                Total Experience Points
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-foreground">
                {xpNeededForNext > 0 ? xpNeededForNext : 0} XP
              </div>
              <div className="text-sm text-muted-foreground">to next level</div>
            </div>
          </div>
          
          <Progress value={currentLevelProgress} className="h-4" data-testid="progress-level" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Level {currentLevel}</span>
            <span>Level {currentLevel + 1}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Current Level */}
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-current-level">
              {currentLevel}
            </div>
            <div className="text-xs text-muted-foreground">Current Level</div>
          </div>

          {/* Current Streak */}
          <div className="text-center p-3 bg-orange-500/10 rounded-lg">
            <div className="flex items-center justify-center space-x-1">
              <i className="fas fa-fire text-orange-500"></i>
              <div className="text-2xl font-bold text-orange-500" data-testid="stat-current-streak">
                {currentStreak}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>

          {/* Longest Streak */}
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <div className="flex items-center justify-center space-x-1">
              <i className="fas fa-trophy text-yellow-500"></i>
              <div className="text-2xl font-bold text-yellow-500" data-testid="stat-longest-streak">
                {longestStreak}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>

          {/* XP Today */}
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="flex items-center justify-center space-x-1">
              <i className="fas fa-star text-green-500"></i>
              <div className="text-2xl font-bold text-green-500" data-testid="stat-xp-today">
                250
              </div>
            </div>
            <div className="text-xs text-muted-foreground">XP Today</div>
          </div>
        </div>

        {/* Level Benefits */}
        <div className="bg-muted/20 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2 flex items-center">
            <i className="fas fa-gift text-accent mr-2"></i>
            Level {currentLevel} Benefits
          </h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <i className="fas fa-check text-green-500"></i>
              <span>Access to advanced learning modules</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <i className="fas fa-check text-green-500"></i>
              <span>Priority in discussion forums</span>
            </div>
            {currentLevel >= 5 && (
              <div className="flex items-center space-x-2 text-sm">
                <i className="fas fa-check text-green-500"></i>
                <span>Custom profile themes</span>
              </div>
            )}
            {currentLevel >= 10 && (
              <div className="flex items-center space-x-2 text-sm">
                <i className="fas fa-check text-green-500"></i>
                <span>Mentor other students</span>
              </div>
            )}
          </div>
        </div>

        {/* Next Level Preview */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-2 flex items-center">
            <i className="fas fa-arrow-up text-primary mr-2"></i>
            Next Level: {getLevelTitle(currentLevel + 1)}
          </h4>
          <p className="text-sm text-muted-foreground">
            Reach Level {currentLevel + 1} to unlock new features and show off your expertise!
          </p>
          <div className="mt-2">
            <Progress value={(currentLevelProgress / 100) * 100} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(currentLevelProgress)}% complete
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
