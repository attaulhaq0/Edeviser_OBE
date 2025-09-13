import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function VisualMappingCanvas() {
  const { data: learningOutcomes } = useQuery({
    queryKey: ["/api/learning-outcomes"],
  });

  const { data: outcomeMappings } = useQuery({
    queryKey: ["/api/outcome-mappings"],
  });

  const ilos = learningOutcomes?.filter(outcome => outcome.type === "ILO") || [];
  const plos = learningOutcomes?.filter(outcome => outcome.type === "PLO") || [];
  const clos = learningOutcomes?.filter(outcome => outcome.type === "CLO") || [];

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
    <Card className="w-full" data-testid="visual-mapping-canvas">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <i className="fas fa-project-diagram text-primary mr-3"></i>
              Visual Outcome Mapping Canvas
            </CardTitle>
            <CardDescription>
              Interactive mapping of CLO → PLO → ILO connections with Bloom's taxonomy integration
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="cs">Computer Science</SelectItem>
                <SelectItem value="is">Information Systems</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="button-save-mapping">
              <i className="fas fa-save mr-2"></i>Save Mapping
            </Button>
            <Button variant="secondary" data-testid="button-preview-mapping">
              <i className="fas fa-eye mr-2"></i>Preview
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mapping Legend */}
        <div className="flex items-center justify-center space-x-8 mb-8 p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-muted-foreground">ILO (Institutional)</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-muted-foreground">PLO (Program)</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-muted-foreground">CLO (Course)</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-4 h-1 bg-primary rounded"></div>
            <span className="text-muted-foreground">Mapping Connection</span>
          </div>
        </div>

        {/* Mapping Canvas */}
        <div className="bg-muted/10 rounded-xl p-6 min-h-[600px] relative">
          
          {/* ILO Level (Top) */}
          <div className="text-center mb-8">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
              Institutional Learning Outcomes
            </h4>
            <div className="flex justify-center space-x-6 flex-wrap">
              {ilos.length > 0 ? ilos.map((ilo, index) => (
                <div
                  key={ilo.id}
                  className="bg-red-100 border-2 border-red-500 rounded-xl p-4 min-w-[200px] hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`ilo-node-${index}`}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-sm font-medium text-red-700 text-center mb-1">{ilo.code}</div>
                  <div className="text-xs text-red-600 text-center mb-2 line-clamp-2">{ilo.title}</div>
                  <Badge variant="outline" className={`text-xs ${getBloomsBadgeColor(ilo.bloomsLevel)} text-white border-none`}>
                    {ilo.bloomsLevel}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-8">
                  <i className="fas fa-university text-muted-foreground text-2xl mb-2"></i>
                  <p className="text-sm text-muted-foreground">No ILOs created yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Connection Lines ILO -> PLO */}
          {ilos.length > 0 && plos.length > 0 && (
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-px h-12 bg-gradient-to-b from-red-500 to-blue-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* PLO Level (Middle) */}
          <div className="text-center mb-8">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
              Program Learning Outcomes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plos.length > 0 ? plos.map((plo, index) => (
                <div
                  key={plo.id}
                  className="bg-blue-100 border-2 border-blue-500 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`plo-node-${index}`}
                >
                  <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-sm font-medium text-blue-700 text-center mb-1">{plo.code}</div>
                  <div className="text-xs text-blue-600 text-center mb-2 line-clamp-2">{plo.title}</div>
                  <Badge variant="outline" className={`text-xs ${getBloomsBadgeColor(plo.bloomsLevel)} text-white border-none`}>
                    {plo.bloomsLevel}
                  </Badge>
                  <div className="text-xs text-blue-500 text-center mt-2 bg-blue-50 rounded-full px-2 py-1">
                    Program Level
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-8">
                  <i className="fas fa-layer-group text-muted-foreground text-2xl mb-2"></i>
                  <p className="text-sm text-muted-foreground">No PLOs created yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Connection Lines PLO -> CLO */}
          {plos.length > 0 && clos.length > 0 && (
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-px h-12 bg-gradient-to-b from-blue-500 to-green-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* CLO Level (Bottom) */}
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
              Course Learning Outcomes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {clos.length > 0 ? clos.slice(0, 12).map((clo, index) => (
                <div
                  key={clo.id}
                  className="bg-green-100 border-2 border-green-500 rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`clo-node-${index}`}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-xs font-medium text-green-700 text-center mb-1">{clo.code}</div>
                  <div className="text-xs text-green-600 text-center mb-2 line-clamp-1">{clo.title}</div>
                  <Badge variant="outline" className={`text-xs ${getBloomsBadgeColor(clo.bloomsLevel)} text-white border-none text-center w-full`}>
                    {clo.bloomsLevel}
                  </Badge>
                </div>
              )) : (
                <div className="col-span-full text-center py-8">
                  <i className="fas fa-bullseye text-muted-foreground text-2xl mb-2"></i>
                  <p className="text-sm text-muted-foreground">No CLOs created yet</p>
                </div>
              )}
              
              {clos.length > 12 && (
                <div className="col-span-full text-center mt-4">
                  <Badge variant="outline">
                    +{clos.length - 12} more CLOs
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {ilos.length === 0 && plos.length === 0 && clos.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-project-diagram text-muted-foreground text-4xl mb-4"></i>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Learning Outcomes Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Start by creating learning outcomes to visualize the outcome mapping connections.
                </p>
                <div className="flex items-center space-x-2">
                  <Button data-testid="button-create-first-outcome">
                    <i className="fas fa-plus mr-2"></i>
                    Create First Outcome
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mapping Instructions */}
        <div className="mt-6 bg-accent/10 border border-accent/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <i className="fas fa-lightbulb text-accent text-lg mt-0.5"></i>
            <div>
              <h4 className="font-medium text-accent-foreground">Interactive Mapping</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Click on any outcome to view details, edit descriptions, or adjust Bloom's taxonomy levels. 
                Drag and drop functionality will be available to create visual connections between outcomes.
              </p>
            </div>
          </div>
        </div>

        {/* Mapping Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div className="text-2xl font-bold text-red-600" data-testid="stat-total-ilos">
              {ilos.length}
            </div>
            <div className="text-sm text-red-700">Institutional</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-plos">
              {plos.length}
            </div>
            <div className="text-sm text-blue-700">Program</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-2xl font-bold text-green-600" data-testid="stat-total-clos">
              {clos.length}
            </div>
            <div className="text-sm text-green-700">Course</div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 text-center border border-primary/20">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-mappings">
              {outcomeMappings?.length || 0}
            </div>
            <div className="text-sm text-primary">Connections</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
