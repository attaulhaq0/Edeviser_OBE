import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function EvidenceRollup() {
  const { data: submissions } = useQuery({
    queryKey: ["/api/student-submissions"],
  });

  const { data: learningOutcomes } = useQuery({
    queryKey: ["/api/learning-outcomes"],
  });

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
  });

  // Mock evidence data for demonstration
  const evidenceFlow = {
    studentSubmissions: [
      {
        id: "1",
        assignment: "Stack Implementation",
        score: 85,
        maxScore: 100,
        cloCode: "CLO-2.1",
        bloomsLevel: "apply",
        submittedAt: new Date("2024-01-15")
      },
      {
        id: "2", 
        assignment: "Data Structures Quiz",
        score: 92,
        maxScore: 100,
        cloCode: "CLO-1.2", 
        bloomsLevel: "understand",
        submittedAt: new Date("2024-01-14")
      },
      {
        id: "3",
        assignment: "Algorithm Analysis",
        score: 78,
        maxScore: 100,
        cloCode: "CLO-3.1",
        bloomsLevel: "analyze", 
        submittedAt: new Date("2024-01-13")
      }
    ],
    cloAggregation: [
      {
        code: "CLO-1",
        title: "Basic Concepts",
        averageScore: 89,
        totalSubmissions: 247,
        bloomsLevel: "understand"
      },
      {
        code: "CLO-2", 
        title: "Implementation",
        averageScore: 82,
        totalSubmissions: 231,
        bloomsLevel: "apply"
      },
      {
        code: "CLO-3",
        title: "Analysis",
        averageScore: 76,
        totalSubmissions: 198,
        bloomsLevel: "analyze"
      }
    ],
    ploRollup: [
      {
        code: "PLO-1",
        title: "Software Design", 
        weightedAverage: 84,
        mappedCLOs: 8,
        bloomsLevel: "create"
      },
      {
        code: "PLO-2",
        title: "Data Structures",
        weightedAverage: 79,
        mappedCLOs: 6,
        bloomsLevel: "analyze"
      }
    ],
    iloImpact: [
      {
        code: "ILO-1",
        title: "Critical Thinking",
        institutionAverage: 81,
        programsContributing: 3,
        bloomsLevel: "evaluate"
      },
      {
        code: "ILO-2", 
        title: "Communication",
        institutionAverage: 87,
        programsContributing: 3,
        bloomsLevel: "create"
      }
    ]
  };

  const metrics = {
    totalSubmissions: submissions?.length || 1247,
    avgCLOScore: 83.2,
    mappingCoverage: 94,
    dataFreshness: "Real-time"
  };

  const getBloomsBadgeColor = (level: string) => {
    const colors = {
      remember: "bg-purple-500",
      understand: "bg-blue-500",
      apply: "bg-green-500", 
      analyze: "bg-yellow-500",
      evaluate: "bg-orange-500",
      create: "bg-red-500"
    };
    return colors[level as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <Card className="w-full" data-testid="evidence-rollup">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <i className="fas fa-link text-primary mr-3"></i>
              Evidence Roll-up System
            </CardTitle>
            <CardDescription>
              Real-time tracking of student performance from course level to institutional outcomes
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button data-testid="button-refresh-data">
              <i className="fas fa-sync-alt mr-2"></i>Refresh Data
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Evidence Flow Description */}
        <div className="text-center bg-muted/10 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Evidence Traceability Flow</h3>
          <p className="text-sm text-muted-foreground">
            Automated aggregation of student performance data from assignments, quizzes, and projects, 
            rolling up evidence from CLO to PLO to ILO levels for comprehensive outcome assessment.
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Student Submissions Level */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <h4 className="text-sm font-medium text-green-700 mb-4 flex items-center">
              <i className="fas fa-user-graduate mr-2"></i>
              Student Submissions
            </h4>
            <div className="space-y-3">
              {evidenceFlow.studentSubmissions.map((submission, index) => (
                <div key={submission.id} className="bg-green-50 border border-green-200 rounded-lg p-3" data-testid={`submission-${index}`}>
                  <div className="text-xs font-medium text-green-800 mb-1">{submission.assignment}</div>
                  <div className="text-xs text-green-600">Score: {submission.score}/{submission.maxScore}</div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">{submission.cloCode}</Badge>
                    <Badge className={`text-xs ${getBloomsBadgeColor(submission.bloomsLevel)} text-white border-none`}>
                      {submission.bloomsLevel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CLO Aggregation Level */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <h4 className="text-sm font-medium text-blue-700 mb-4 flex items-center">
              <i className="fas fa-bullseye mr-2"></i>
              CLO Aggregation
            </h4>
            <div className="space-y-3">
              {evidenceFlow.cloAggregation.map((clo, index) => (
                <div key={clo.code} className="bg-blue-50 border border-blue-200 rounded-lg p-3" data-testid={`clo-aggregation-${index}`}>
                  <div className="text-xs font-medium text-blue-800 mb-1">{clo.code}: {clo.title}</div>
                  <div className="text-xs text-blue-600">Avg: {clo.averageScore}%</div>
                  <div className="text-xs text-blue-600 mb-2">{clo.totalSubmissions} submissions</div>
                  <Progress value={clo.averageScore} className="h-2" />
                  <Badge className={`text-xs mt-2 ${getBloomsBadgeColor(clo.bloomsLevel)} text-white border-none`}>
                    {clo.bloomsLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* PLO Roll-up Level */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <h4 className="text-sm font-medium text-purple-700 mb-4 flex items-center">
              <i className="fas fa-layer-group mr-2"></i>
              PLO Roll-up
            </h4>
            <div className="space-y-3">
              {evidenceFlow.ploRollup.map((plo, index) => (
                <div key={plo.code} className="bg-purple-50 border border-purple-200 rounded-lg p-3" data-testid={`plo-rollup-${index}`}>
                  <div className="text-xs font-medium text-purple-800 mb-1">{plo.code}: {plo.title}</div>
                  <div className="text-xs text-purple-600">Weighted Avg: {plo.weightedAverage}%</div>
                  <div className="text-xs text-purple-600 mb-2">{plo.mappedCLOs} mapped CLOs</div>
                  <Progress value={plo.weightedAverage} className="h-2" />
                  <Badge className={`text-xs mt-2 ${getBloomsBadgeColor(plo.bloomsLevel)} text-white border-none`}>
                    {plo.bloomsLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* ILO Impact Level */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <h4 className="text-sm font-medium text-red-700 mb-4 flex items-center">
              <i className="fas fa-university mr-2"></i>
              ILO Impact
            </h4>
            <div className="space-y-3">
              {evidenceFlow.iloImpact.map((ilo, index) => (
                <div key={ilo.code} className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid={`ilo-impact-${index}`}>
                  <div className="text-xs font-medium text-red-800 mb-1">{ilo.code}: {ilo.title}</div>
                  <div className="text-xs text-red-600">Institution Avg: {ilo.institutionAverage}%</div>
                  <div className="text-xs text-red-600 mb-2">{ilo.programsContributing} programs</div>
                  <Progress value={ilo.institutionAverage} className="h-2" />
                  <Badge className={`text-xs mt-2 ${getBloomsBadgeColor(ilo.bloomsLevel)} text-white border-none`}>
                    {ilo.bloomsLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evidence Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-border">
            <div className="text-lg font-bold text-primary" data-testid="metric-total-submissions">
              {metrics.totalSubmissions.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Submissions</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-border">
            <div className="text-lg font-bold text-secondary" data-testid="metric-avg-clo-score">
              {metrics.avgCLOScore}%
            </div>
            <div className="text-xs text-muted-foreground">Avg CLO Score</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-border">
            <div className="text-lg font-bold text-accent" data-testid="metric-mapping-coverage">
              {metrics.mappingCoverage}%
            </div>
            <div className="text-xs text-muted-foreground">Mapping Coverage</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-border">
            <div className="text-lg font-bold text-green-500" data-testid="metric-data-freshness">
              {metrics.dataFreshness}
            </div>
            <div className="text-xs text-muted-foreground">Data Freshness</div>
          </div>
        </div>

        {/* Flow Connections Visualization */}
        <div className="bg-muted/10 rounded-lg p-6">
          <h4 className="font-medium text-foreground mb-4 text-center">Evidence Flow Connections</h4>
          
          <div className="flex items-center justify-center space-x-8">
            {/* Student Work */}
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mb-2">
                <i className="fas fa-file-alt"></i>
              </div>
              <div className="text-xs font-medium">Student Work</div>
              <div className="text-xs text-muted-foreground">Assignments, Quizzes</div>
            </div>

            {/* Arrow */}
            <i className="fas fa-arrow-right text-muted-foreground"></i>

            {/* CLO Assessment */}
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white mb-2">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="text-xs font-medium">CLO Assessment</div>
              <div className="text-xs text-muted-foreground">Course Outcomes</div>
            </div>

            {/* Arrow */}
            <i className="fas fa-arrow-right text-muted-foreground"></i>

            {/* PLO Mapping */}
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white mb-2">
                <i className="fas fa-sitemap"></i>
              </div>
              <div className="text-xs font-medium">PLO Mapping</div>
              <div className="text-xs text-muted-foreground">Program Outcomes</div>
            </div>

            {/* Arrow */}
            <i className="fas fa-arrow-right text-muted-foreground"></i>

            {/* ILO Achievement */}
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white mb-2">
                <i className="fas fa-trophy"></i>
              </div>
              <div className="text-xs font-medium">ILO Achievement</div>
              <div className="text-xs text-muted-foreground">Institutional Goals</div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-primary text-lg mt-0.5"></i>
            <div>
              <h4 className="font-medium text-primary-foreground">Automated Evidence Collection</h4>
              <p className="text-sm text-muted-foreground mt-1">
                The system automatically aggregates student performance data from assignments, quizzes, and projects, 
                rolling up evidence from CLO to PLO to ILO levels for comprehensive outcome assessment. 
                Data is updated in real-time as new submissions are graded.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
