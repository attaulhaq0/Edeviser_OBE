import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OutcomeForm } from "@/components/outcomes/outcome-form";

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["/api/courses/teacher/" + user?.id],
    enabled: !!user,
  });

  const { data: assignments } = useQuery({
    queryKey: ["/api/assignments"],
    enabled: !!user,
  });

  const { data: submissions } = useQuery({
    queryKey: ["/api/student-submissions"],
    enabled: !!user,
  });

  const { data: learningOutcomes } = useQuery({
    queryKey: ["/api/learning-outcomes"],
    enabled: !!user,
  });

  const teacherCourses = courses || [];
  const teacherAssignments = assignments?.filter(a => a.teacherId === user?.id) || [];
  const pendingGrading = submissions?.filter(s => !s.gradedAt && 
    teacherAssignments.some(a => a.id === s.assignmentId)) || [];

  const clos = learningOutcomes?.filter(outcome => 
    outcome.type === "CLO" && outcome.ownerId === user?.id) || [];

  if (coursesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="teacher-dashboard">
      {/* Welcome Hero Section */}
      <section className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="welcome-title">
                Welcome back, Professor {user?.firstName}! 📚
              </h1>
              <p className="text-lg opacity-90 mb-4">
                Ready to inspire and educate your students today?
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-chalkboard-teacher text-xl"></i>
                  <span className="font-medium" data-testid="stat-courses-teaching">
                    {teacherCourses.length} Courses Teaching
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-tasks text-xl"></i>
                  <span className="font-medium" data-testid="stat-assignments-created">
                    {teacherAssignments.length} Assignments Created
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-xl"></i>
                  <span className="font-medium" data-testid="stat-pending-grading">
                    {pendingGrading.length} Pending Grading
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[120px]">
              <i className="fas fa-award text-3xl text-yellow-300 mb-2"></i>
              <div className="text-sm font-medium">Teaching</div>
              <div className="text-sm font-medium">Excellence</div>
              <div className="text-xs opacity-75 mt-1">Level 4</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 bg-white/5 rounded-full"></div>
      </section>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="courses" data-testid="tab-courses">My Courses</TabsTrigger>
          <TabsTrigger value="grading" data-testid="tab-grading">Grading</TabsTrigger>
          <TabsTrigger value="outcomes" data-testid="tab-outcomes">CLO Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <i className="fas fa-bolt text-primary mr-2"></i>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" data-testid="button-create-assignment">
                  <i className="fas fa-plus mr-2"></i>
                  Create Assignment
                </Button>
                <Button variant="secondary" className="w-full" data-testid="button-grade-submissions">
                  <i className="fas fa-edit mr-2"></i>
                  Grade Submissions
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-manage-clos">
                  <i className="fas fa-bullseye mr-2"></i>
                  Manage CLOs
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-class-analytics">
                  <i className="fas fa-chart-line mr-2"></i>
                  Class Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-500/10 text-blue-500 p-3 rounded-xl">
                        <i className="fas fa-user-graduate text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-total-students">
                          85
                        </div>
                        <div className="text-sm text-muted-foreground">Active Students</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Enrolled</span>
                      <span className="text-blue-500 font-medium">All courses</span>
                    </div>
                    <Progress value={100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-green-500/10 text-green-500 p-3 rounded-xl">
                        <i className="fas fa-check-circle text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-graded-assignments">
                          {teacherAssignments.length - pendingGrading.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Graded This Week</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion Rate</span>
                      <span className="text-green-500 font-medium">94%</span>
                    </div>
                    <Progress value={94} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-500/10 text-purple-500 p-3 rounded-xl">
                        <i className="fas fa-bullseye text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-total-clos">
                          {clos.length}
                        </div>
                        <div className="text-sm text-muted-foreground">CLOs Created</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active</span>
                      <span className="text-purple-500 font-medium">All active</span>
                    </div>
                    <Progress value={100} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Course Performance and Grading Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Course Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-chart-line text-blue-500 mr-3"></i>
                  Course Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teacherCourses.map((course, index) => (
                  <div key={course.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-foreground" data-testid={`course-name-${index}`}>
                        {course.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{course.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">82%</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Grading Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-clipboard-list text-orange-500 mr-3"></i>
                  Grading Queue
                  {pendingGrading.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingGrading.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingGrading.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                    <p className="text-muted-foreground">All caught up! No submissions pending grading.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingGrading.slice(0, 5).map((submission, index) => (
                      <div key={submission.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            Assignment Submission
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Recently'}
                          </div>
                        </div>
                        <Button size="sm" data-testid={`button-grade-${index}`}>
                          Grade
                        </Button>
                      </div>
                    ))}
                    {pendingGrading.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm" data-testid="button-view-all-pending">
                          View All ({pendingGrading.length - 5} more)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherCourses.map((course, index) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span data-testid={`course-title-${index}`}>{course.name}</span>
                    <Badge variant="secondary">{course.code}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {course.credits} Credits • Active Course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Students</span>
                      <span className="font-semibold">28</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Assignments</span>
                      <span className="font-semibold">
                        {teacherAssignments.filter(a => a.courseId === course.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Performance</span>
                      <span className="font-semibold text-green-600">85%</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1" data-testid={`button-manage-course-${index}`}>
                        Manage
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" data-testid={`button-analytics-course-${index}`}>
                        Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {teacherCourses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <i className="fas fa-chalkboard text-muted-foreground text-4xl mb-4"></i>
                <h3 className="text-lg font-semibold text-foreground mb-2">No courses assigned</h3>
                <p className="text-muted-foreground">Contact your coordinator to get assigned to courses.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="grading">
          <Card>
            <CardHeader>
              <CardTitle>Grading Center</CardTitle>
              <CardDescription>
                Review and grade student submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingGrading.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-clipboard-check text-green-500 text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">No submissions are currently pending grading.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingGrading.map((submission, index) => (
                    <div key={submission.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">Assignment Submission</h4>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">Pending</Badge>
                          <Button data-testid={`button-review-${index}`}>
                            Review & Grade
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Course Learning Outcomes (CLOs)</h2>
              <Button data-testid="button-create-new-clo">
                <i className="fas fa-plus mr-2"></i>
                Create New CLO
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clos.map((clo, index) => (
                <Card key={clo.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span data-testid={`clo-code-${index}`}>{clo.code}</span>
                      <Badge variant="outline" className="capitalize">
                        {clo.bloomsLevel}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2" data-testid={`clo-title-${index}`}>
                      {clo.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {clo.description}
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1" data-testid={`button-edit-clo-${index}`}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-clo-${index}`}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {clos.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <i className="fas fa-bullseye text-muted-foreground text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No CLOs created yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first Course Learning Outcome.</p>
                  <Button data-testid="button-create-first-clo">
                    <i className="fas fa-plus mr-2"></i>
                    Create Your First CLO
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
