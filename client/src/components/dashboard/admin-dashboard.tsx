import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SafeUser, Program, LearningOutcome } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const roleUpdateMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Role updated successfully",
        description: "User role has been changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    roleUpdateMutation.mutate({ userId, role: newRole });
  };

  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const { data: learningOutcomes = [] } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/learning-outcomes"],
    enabled: !!user,
  });

  const { data: bloomsDistribution = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/blooms-distribution"],
    enabled: !!user,
  });

  const totalUsers = users?.length || 0;
  const coordinators = users?.filter(u => u.role === "coordinator") || [];
  const teachers = users?.filter(u => u.role === "teacher") || [];
  const students = users?.filter(u => u.role === "student") || [];

  const ilos = learningOutcomes?.filter(outcome => outcome.type === "ILO") || [];
  const plos = learningOutcomes?.filter(outcome => outcome.type === "PLO") || [];
  const clos = learningOutcomes?.filter(outcome => outcome.type === "CLO") || [];

  if (programsLoading) {
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
    <div className="space-y-8" data-testid="admin-dashboard">
      {/* Welcome Hero Section */}
      <section className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="welcome-title">
                Welcome back, {user?.firstName}! 🎓
              </h1>
              <p className="text-lg opacity-90 mb-4">
                Ready to oversee the institution's OBE excellence today?
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-university text-xl"></i>
                  <span className="font-medium" data-testid="stat-total-programs">
                    {programs?.length || 0} Programs Active
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-users-cog text-xl"></i>
                  <span className="font-medium" data-testid="stat-total-users">
                    {totalUsers} System Users
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-heartbeat text-xl"></i>
                  <span className="font-medium" data-testid="stat-system-health">
                    98% System Health
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[120px]">
              <i className="fas fa-crown text-3xl text-yellow-300 mb-2"></i>
              <div className="text-sm font-medium">System</div>
              <div className="text-sm font-medium">Administrator</div>
              <div className="text-xs opacity-75 mt-1">Master Level</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 bg-white/5 rounded-full"></div>
      </section>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="programs" data-testid="tab-programs">Programs</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="outcomes" data-testid="tab-outcomes">ILO Management</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">System Analytics</TabsTrigger>
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
                <Button className="w-full" data-testid="button-create-program">
                  <i className="fas fa-plus mr-2"></i>
                  Create Program
                </Button>
                <Button variant="secondary" className="w-full" data-testid="button-manage-users">
                  <i className="fas fa-users-cog mr-2"></i>
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-create-ilo">
                  <i className="fas fa-university mr-2"></i>
                  Create ILO
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-system-reports">
                  <i className="fas fa-chart-bar mr-2"></i>
                  System Reports
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-badge-templates">
                  <i className="fas fa-medal mr-2"></i>
                  Badge Templates
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
                        <i className="fas fa-graduation-cap text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-active-programs">
                          {programs?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Active Programs</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Institution Wide</span>
                      <span className="text-blue-500 font-medium">All levels</span>
                    </div>
                    <Progress value={100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-green-500/10 text-green-500 p-3 rounded-xl">
                        <i className="fas fa-users text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-system-users">
                          {totalUsers}
                        </div>
                        <div className="text-sm text-muted-foreground">System Users</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Users</span>
                      <span className="text-green-500 font-medium">All roles</span>
                    </div>
                    <Progress value={100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-500/10 text-purple-500 p-3 rounded-xl">
                        <i className="fas fa-bullseye text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-total-ilos">
                          {ilos.length}
                        </div>
                        <div className="text-sm text-muted-foreground">ILOs Created</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Institutional</span>
                      <span className="text-purple-500 font-medium">Global scope</span>
                    </div>
                    <Progress value={100} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* System Health and User Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-heartbeat text-green-500 mr-3"></i>
                  System Health Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Database Performance</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={98} className="w-20" />
                      <span className="text-sm font-semibold text-green-500">98%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Response Time</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={95} className="w-20" />
                      <span className="text-sm font-semibold text-green-500">95%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">User Activity</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={89} className="w-20" />
                      <span className="text-sm font-semibold text-yellow-600">89%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Data Integrity</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={100} className="w-20" />
                      <span className="text-sm font-semibold text-green-500">100%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall System Health</span>
                    <span className="text-lg font-bold text-green-500">98%</span>
                  </div>
                  <Progress value={98} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-pie-chart text-blue-500 mr-3"></i>
                  User Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500" data-testid="stat-student-count">
                      {students.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500" data-testid="stat-teacher-count">
                      {teachers.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Teachers</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Students</span>
                    </div>
                    <span className="text-sm font-semibold">{Math.round((students.length / totalUsers) * 100)}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Teachers</span>
                    </div>
                    <span className="text-sm font-semibold">{Math.round((teachers.length / totalUsers) * 100)}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Coordinators</span>
                    </div>
                    <span className="text-sm font-semibold">{Math.round((coordinators.length / totalUsers) * 100)}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Administrators</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {Math.round((users?.filter(u => u.role === "admin").length / totalUsers) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="programs">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Program Management</h2>
              <Button data-testid="button-create-new-program">
                <i className="fas fa-plus mr-2"></i>
                Create New Program
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs?.map((program, index) => (
                <Card key={program.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span data-testid={`program-name-${index}`}>{program.name}</span>
                      <Badge variant={program.isActive ? "default" : "secondary"}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {program.code} • {program.level}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Coordinator</span>
                        <span className="font-semibold">
                          {coordinators.find(c => c.id === program.coordinatorId)?.firstName || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="outline" className="text-green-600">Operational</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1" data-testid={`button-manage-program-${index}`}>
                          Manage
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" data-testid={`button-analytics-program-${index}`}>
                          Analytics
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || []}
              
              {!programs?.length && (
                <div className="col-span-full text-center py-12">
                  <i className="fas fa-graduation-cap text-muted-foreground text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No programs created</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your institution's first program.</p>
                  <Button data-testid="button-create-first-program">
                    <i className="fas fa-plus mr-2"></i>
                    Create First Program
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">User Management</h2>
              <div className="flex items-center space-x-3">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                    <SelectItem value="coordinator">Coordinators</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                  </SelectContent>
                </Select>
                <Button data-testid="button-create-new-user">
                  <i className="fas fa-user-plus mr-2"></i>
                  Add User
                </Button>
              </div>
            </div>
            
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 font-medium text-sm">
                <div>Name</div>
                <div>Email</div>
                <div>Role</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              
              {users?.map((user, index) => (
                <div key={user.id} className="grid grid-cols-5 gap-4 p-4 border-t border-border hover:bg-muted/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <span className="font-medium" data-testid={`user-name-${index}`}>
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid={`user-email-${index}`}>
                    {user.email}
                  </div>
                  <div>
                    <Badge variant="outline" className="capitalize" data-testid={`user-role-${index}`}>
                      {user.role}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole)} data-testid={`select-role-${index}`}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )) || []}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="outcomes">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Institutional Learning Outcomes (ILOs)</h2>
              <Button data-testid="button-create-new-ilo">
                <i className="fas fa-plus mr-2"></i>
                Create New ILO
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ilos.map((ilo, index) => (
                <Card key={ilo.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span data-testid={`ilo-code-${index}`}>{ilo.code}</span>
                      <Badge variant="outline" className="capitalize">
                        {ilo.bloomsLevel}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2" data-testid={`ilo-title-${index}`}>
                      {ilo.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {ilo.description}
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1" data-testid={`button-edit-ilo-${index}`}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-ilo-${index}`}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {ilos.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <i className="fas fa-university text-muted-foreground text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No ILOs created yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first Institutional Learning Outcome.</p>
                  <Button data-testid="button-create-first-ilo">
                    <i className="fas fa-plus mr-2"></i>
                    Create Your First ILO
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Outcome Distribution</CardTitle>
                <CardDescription>System-wide learning outcome statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {learningOutcomes?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Learning Outcomes</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ILOs (Institutional)</span>
                      <Badge variant="outline">{ilos?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">PLOs (Program)</span>
                      <Badge variant="outline">{plos?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CLOs (Course)</span>
                      <Badge variant="outline">{clos?.length || 0}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">User Engagement</span>
                    <span className="text-sm font-semibold text-primary">94%</span>
                  </div>
                  <Progress value={94} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Quality</span>
                    <span className="text-sm font-semibold text-secondary">97%</span>
                  </div>
                  <Progress value={97} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Uptime</span>
                    <span className="text-sm font-semibold text-green-500">99.9%</span>
                  </div>
                  <Progress value={99.9} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
