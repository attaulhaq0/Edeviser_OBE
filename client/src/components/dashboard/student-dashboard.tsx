import { useState } from "react";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Trophy, Flame, BookOpen, Target, Award, Calendar } from "lucide-react";

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="space-y-8 p-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl p-8 shadow-2xl">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-3">
              Welcome back, {profile.first_name}! 🚀
            </h1>
            <p className="text-blue-100 text-lg">
              Continue your learning journey and unlock new achievements
            </p>
          </div>
        </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP Earned</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,250</div>
            <p className="text-xs text-muted-foreground">Total experience points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Level</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Learning level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak Days</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Consecutive days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Enrolled courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>Your progress across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Data Structures</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Web Development</span>
                      <span>72%</span>
                    </div>
                    <Progress value={72} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Database Systems</span>
                      <span>90%</span>
                    </div>
                    <Progress value={90} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Software Engineering</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Your latest learning activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed assignment</p>
                      <p className="text-xs text-muted-foreground">Data Structures • 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Level up achievement</p>
                      <p className="text-xs text-muted-foreground">Reached Level 7 • 1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Started new course</p>
                      <p className="text-xs text-muted-foreground">Software Engineering • 2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Courses
              </CardTitle>
              <CardDescription>Courses you are currently enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Data Structures and Algorithms", progress: 85, instructor: "Dr. Smith", status: "Active" },
                  { name: "Web Development", progress: 72, instructor: "Prof. Johnson", status: "Active" },
                  { name: "Database Systems", progress: 90, instructor: "Dr. Wilson", status: "Active" },
                  { name: "Software Engineering", progress: 68, instructor: "Prof. Brown", status: "Active" }
                ].map((course, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <p className="text-sm text-muted-foreground">Instructor: {course.instructor}</p>
                      </div>
                      <Badge variant="outline">{course.status}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} />
                    </div>
                    <Button variant="outline" size="sm" className="mt-3">
                      Continue Learning
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Assignments & Tasks
              </CardTitle>
              <CardDescription>Your upcoming and completed assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">3</div>
                        <p className="text-sm text-muted-foreground">Due This Week</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">15</div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-2">
                  {[
                    { title: "Binary Search Implementation", course: "Data Structures", due: "Dec 15", status: "Pending" },
                    { title: "Database Design Project", course: "Database Systems", due: "Dec 18", status: "In Progress" },
                    { title: "React Component Assignment", course: "Web Development", due: "Dec 20", status: "Completed" }
                  ].map((assignment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{assignment.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.course} • Due: {assignment.due}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={assignment.status === "Completed" ? "default" : "outline"}>
                          {assignment.status}
                        </Badge>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Achievements
              </CardTitle>
              <CardDescription>Badges and milestones you've earned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="font-medium">Level 7 Scholar</h3>
                    <p className="text-xs text-muted-foreground">Reached learning level 7</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <h3 className="font-medium">12-Day Streak</h3>
                    <p className="text-xs text-muted-foreground">Consistent daily activity</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-medium">1000+ XP</h3>
                    <p className="text-xs text-muted-foreground">Experience points earned</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keep learning to unlock more achievements!</p>
                <Button className="mt-4">View All Badges</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}