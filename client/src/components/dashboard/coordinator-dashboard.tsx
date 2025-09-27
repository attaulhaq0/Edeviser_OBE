import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VisualMappingCanvas } from "@/components/outcomes/visual-mapping-canvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProgressDisplay } from "@/components/gamification/progress-display";
import { EvidenceRollup } from "@/components/analytics/evidence-rollup";
import { OutcomeForm } from "@/components/outcomes/outcome-form";
import type { Program, LearningOutcome } from "@shared/schema";

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [ploDialogOpen, setPloDialogOpen] = useState(false);
  const [selectedPlo, setSelectedPlo] = useState<LearningOutcome | undefined>(undefined);

  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs/coordinator/" + user?.id],
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

  const ilos = learningOutcomes?.filter(outcome => outcome.type === "ILO") || [];
  const plos = learningOutcomes?.filter(outcome => outcome.type === "PLO") || [];
  const clos = learningOutcomes?.filter(outcome => outcome.type === "CLO") || [];

  const getBloomsPercentage = (level: string) => {
    const total = bloomsDistribution?.reduce((sum, item) => sum + item.count, 0) || 1;
    const levelCount = bloomsDistribution?.find(item => item.level === level)?.count || 0;
    return Math.round((levelCount / total) * 100);
  };

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
    <div className="space-y-8" data-testid="coordinator-dashboard">
      {/* Welcome Hero Section */}
      <section className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="welcome-title">
                Welcome back, {user?.firstName}! 🎯
              </h1>
              <p className="text-lg opacity-90 mb-4">
                Ready to advance your programs today?
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-graduation-cap text-xl"></i>
                  <span className="font-medium" data-testid="stat-programs">
                    {programs?.length || 0} Programs Managed
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-bullseye text-xl"></i>
                  <span className="font-medium" data-testid="stat-outcomes">
                    {plos?.length || 0} PLOs Mapped
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[120px]">
              <i className="fas fa-trophy text-3xl text-accent mb-2"></i>
              <div className="text-sm font-medium">Program</div>
              <div className="text-sm font-medium">Excellence</div>
              <div className="text-xs opacity-75 mt-1">Level 5</div>
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
          <TabsTrigger value="mapping" data-testid="tab-mapping">Visual Mapping</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence Roll-up</TabsTrigger>
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
                <Button 
                  className="w-full" 
                  data-testid="button-create-plo"
                  onClick={() => {
                    setSelectedPlo(undefined);
                    setPloDialogOpen(true);
                  }}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create New PLO
                </Button>
                <Button variant="secondary" className="w-full" data-testid="button-visual-mapping">
                  <i className="fas fa-project-diagram mr-2"></i>
                  Visual Mapping
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-analytics">
                  <i className="fas fa-chart-bar mr-2"></i>
                  Analytics Report
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-gap-analysis">
                  <i className="fas fa-search mr-2"></i>
                  Gap Analysis
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-primary/10 text-primary p-3 rounded-xl">
                        <i className="fas fa-graduation-cap text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-total-programs">
                          {programs?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Programs</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Programs</span>
                      <span className="text-primary font-medium">All active</span>
                    </div>
                    <Progress value={100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-secondary/10 text-secondary p-3 rounded-xl">
                        <i className="fas fa-bullseye text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-total-plos">
                          {plos?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">PLOs Mapped</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Coverage Rate</span>
                      <span className="text-secondary font-medium">89% complete</span>
                    </div>
                    <Progress value={89} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-accent/10 text-accent p-3 rounded-xl">
                        <i className="fas fa-chart-line text-xl"></i>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground" data-testid="stat-total-clos">
                          {clos?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">CLOs Connected</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mapping Status</span>
                      <span className="text-accent font-medium">Active</span>
                    </div>
                    <Progress value={75} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Program Performance and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Program Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-chart-line text-secondary mr-3"></i>
                  Program Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {programs?.map((program, index) => (
                  <div key={program.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-foreground" data-testid={`program-name-${index}`}>
                        {program.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{program.level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">87%</div>
                      <div className="text-xs text-muted-foreground">Avg Completion</div>
                    </div>
                  </div>
                ))}

                {/* Bloom's Taxonomy Distribution */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-4">Bloom's Taxonomy Distribution</h4>
                  <div className="space-y-2">
                    {["create", "evaluate", "analyze", "apply", "understand", "remember"].map((level) => (
                      <div key={level} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{level}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={getBloomsPercentage(level)} className="w-16 h-2" />
                          <span className="text-sm font-medium text-foreground w-8">
                            {getBloomsPercentage(level)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-history text-primary mr-3"></i>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">PLO created for CS Program</div>
                      <div className="text-xs text-muted-foreground mt-1">New outcome added to curriculum mapping</div>
                      <div className="text-xs text-muted-foreground">Just now</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">Outcome mapping updated</div>
                      <div className="text-xs text-muted-foreground mt-1">CLO-PLO connections refined</div>
                      <div className="text-xs text-muted-foreground">2 hours ago</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">Analytics report generated</div>
                      <div className="text-xs text-muted-foreground mt-1">Program assessment completed</div>
                      <div className="text-xs text-muted-foreground">1 day ago</div>
                    </div>
                  </div>
                </div>

                {/* Pending Tasks */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-4 flex items-center">
                    <i className="fas fa-tasks text-accent mr-2"></i>
                    Pending Tasks
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-primary focus:ring-primary border-border rounded" />
                        <span className="text-sm font-medium text-foreground">Review PLO-ILO alignment</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">High</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-primary focus:ring-primary border-border rounded" />
                        <span className="text-sm font-medium text-foreground">Approve new CLOs</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">Medium</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* PLO Management Section */}
          <div className="space-y-6 mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Program Learning Outcomes (PLOs)</h2>
              <Button 
                data-testid="button-create-new-plo-section"
                onClick={() => {
                  setSelectedPlo(undefined);
                  setPloDialogOpen(true);
                }}
              >
                <i className="fas fa-plus mr-2"></i>
                Create New PLO
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plos.map((plo, index) => (
                <Card key={plo.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span data-testid={`plo-code-${index}`}>{plo.code}</span>
                      <Badge variant="outline" className="capitalize">
                        {plo.bloomsLevel}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2" data-testid={`plo-title-${index}`}>
                      {plo.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {plo.description}
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1" 
                        data-testid={`button-edit-plo-${index}`}
                        onClick={() => {
                          setSelectedPlo(plo);
                          setPloDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1" 
                        data-testid={`button-view-plo-${index}`}
                        onClick={() => {
                          setSelectedPlo(plo);
                          setPloDialogOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {plos.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <i className="fas fa-bullseye text-muted-foreground text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No PLOs created yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first Program Learning Outcome.</p>
                  <Button 
                    data-testid="button-create-first-plo"
                    onClick={() => {
                      setSelectedPlo(undefined);
                      setPloDialogOpen(true);
                    }}
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Create Your First PLO
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mapping">
          <VisualMappingCanvas />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Outcome Distribution</CardTitle>
                <CardDescription>Distribution of learning outcomes across Bloom's taxonomy</CardDescription>
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
                      <span className="text-sm">ILOs</span>
                      <Badge variant="outline">{ilos?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">PLOs</span>
                      <Badge variant="outline">{plos?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CLOs</span>
                      <Badge variant="outline">{clos?.length || 0}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Health</CardTitle>
                <CardDescription>Overall system performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Mapping Coverage</span>
                    <span className="text-sm font-semibold text-primary">89%</span>
                  </div>
                  <Progress value={89} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Quality</span>
                    <span className="text-sm font-semibold text-secondary">94%</span>
                  </div>
                  <Progress value={94} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Student Engagement</span>
                    <span className="text-sm font-semibold text-accent">76%</span>
                  </div>
                  <Progress value={76} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evidence">
          <EvidenceRollup />
        </TabsContent>
      </Tabs>
      
      {/* PLO Management Dialog */}
      <Dialog open={ploDialogOpen} onOpenChange={setPloDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlo ? 'Edit Program Learning Outcome' : 'Create New Program Learning Outcome'}
            </DialogTitle>
          </DialogHeader>
          <OutcomeForm
            outcome={selectedPlo}
            onSuccess={() => {
              setPloDialogOpen(false);
              setSelectedPlo(undefined);
            }}
            onCancel={() => {
              setPloDialogOpen(false);
              setSelectedPlo(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
