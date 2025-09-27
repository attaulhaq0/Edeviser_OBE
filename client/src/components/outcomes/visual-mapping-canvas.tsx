import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Network, Save, Eye, Plus, Filter, Target, Trophy, GraduationCap } from "lucide-react";
import type { LearningOutcome, OutcomeMapping, InsertOutcomeMapping } from "@shared/schema";

interface DragDropMapping {
  sourceId: string;
  targetId: string;
  sourceType: string;
  targetType: string;
}

export function VisualMappingCanvas() {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [activeConnection, setActiveConnection] = useState<DragDropMapping | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: learningOutcomes = [] } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/learning-outcomes"],
  });

  const { data: outcomeMappings = [] } = useQuery<OutcomeMapping[]>({
    queryKey: ["/api/outcome-mappings"],
  });

  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const filteredOutcomes = useMemo(() => {
    if (selectedProgram === "all") return learningOutcomes;
    return learningOutcomes.filter((outcome: LearningOutcome) => 
      outcome.programId === selectedProgram || outcome.type === "ILO"
    );
  }, [learningOutcomes, selectedProgram]);

  const ilos = filteredOutcomes.filter((outcome: LearningOutcome) => outcome.type === "ILO");
  const plos = filteredOutcomes.filter((outcome: LearningOutcome) => outcome.type === "PLO");
  const clos = filteredOutcomes.filter((outcome: LearningOutcome) => outcome.type === "CLO");

  const createMappingMutation = useMutation({
    mutationFn: async (data: InsertOutcomeMapping) => {
      const response = await apiRequest("POST", "/api/outcome-mappings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Outcome mapping created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/outcome-mappings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleDragStart = (event: any) => {
    const { active } = event;
    const outcomeId = active.id;
    const outcome = filteredOutcomes.find((o: LearningOutcome) => o.id === outcomeId);
    if (outcome) {
      setActiveConnection({
        sourceId: outcome.id,
        targetId: "",
        sourceType: outcome.type,
        targetType: ""
      });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || !activeConnection) {
      setActiveConnection(null);
      return;
    }

    const sourceOutcome = filteredOutcomes.find((o: LearningOutcome) => o.id === active.id);
    const targetOutcome = filteredOutcomes.find((o: LearningOutcome) => o.id === over.id);

    if (sourceOutcome && targetOutcome && sourceOutcome.id !== targetOutcome.id) {
      // Check if mapping is valid (CLO -> PLO -> ILO)
      const isValidMapping = 
        (sourceOutcome.type === "CLO" && targetOutcome.type === "PLO") ||
        (sourceOutcome.type === "PLO" && targetOutcome.type === "ILO");

      if (isValidMapping) {
        // Check if mapping already exists
        const existingMapping = outcomeMappings.find((mapping: OutcomeMapping) => 
          mapping.sourceOutcomeId === sourceOutcome.id && 
          mapping.targetOutcomeId === targetOutcome.id
        );

        if (!existingMapping) {
          createMappingMutation.mutate({
            sourceOutcomeId: sourceOutcome.id,
            targetOutcomeId: targetOutcome.id,
            weight: "1.00",
            createdBy: "current-user" // This should come from auth context
          });
        } else {
          toast({
            title: "Mapping exists",
            description: "This connection already exists.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid connection",
          description: "You can only connect CLO → PLO or PLO → ILO.",
          variant: "destructive",
        });
      }
    }

    setActiveConnection(null);
  };

  // Draggable Outcome Component
  function DraggableOutcome({ outcome, index, type }: { outcome: LearningOutcome; index: number; type: string }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: outcome.id,
    });

    const style = {
      transform: CSS.Translate.toString(transform),
    };

    const getTypeStyles = () => {
      switch (type) {
        case "ilo":
          return "bg-red-100 border-2 border-red-500 text-red-700";
        case "plo":
          return "bg-blue-100 border-2 border-blue-500 text-blue-700";
        case "clo":
          return "bg-green-100 border-2 border-green-500 text-green-700";
        default:
          return "bg-gray-100 border-2 border-gray-500 text-gray-700";
      }
    };

    const getTypeIcon = () => {
      switch (type) {
        case "ilo":
          return <Trophy className="w-3 h-3 mx-auto mb-2" />;
        case "plo":
          return <Target className="w-3 h-3 mx-auto mb-2" />;
        case "clo":
          return <GraduationCap className="w-2 h-2 mx-auto mb-2" />;
        default:
          return null;
      }
    };

    return (
      <DroppableOutcome outcome={outcome} index={index} type={type}>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`${getTypeStyles()} rounded-xl p-4 min-w-[200px] hover:shadow-lg transition-shadow cursor-pointer ${
            isDragging ? "opacity-50" : ""
          }`}
          data-testid={`${type}-node-${index}`}
        >
          {getTypeIcon()}
          <div className="text-sm font-medium text-center mb-1">{outcome.code}</div>
          <div className="text-xs text-center mb-2 line-clamp-2">{outcome.title}</div>
          <Badge variant="outline" className={`text-xs ${getBloomsBadgeColor(outcome.bloomsLevel)} text-white border-none`}>
            {outcome.bloomsLevel}
          </Badge>
        </div>
      </DroppableOutcome>
    );
  }

  // Droppable Outcome Component
  function DroppableOutcome({ outcome, index, type, children }: { outcome: LearningOutcome; index: number; type: string; children: React.ReactNode }) {
    const { isOver, setNodeRef } = useDroppable({
      id: outcome.id,
    });

    const style = {
      backgroundColor: isOver ? "rgba(0, 255, 0, 0.1)" : undefined,
    };

    return (
      <div ref={setNodeRef} style={style}>
        {children}
      </div>
    );
  }

  return (
    <Card className="w-full" data-testid="visual-mapping-canvas">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <Network className="w-6 h-6 text-primary mr-3" />
              Visual Outcome Mapping Canvas
            </CardTitle>
            <CardDescription>
              Interactive mapping of CLO → PLO → ILO connections with Bloom's taxonomy integration
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program: any) => (
                  <SelectItem key={program.id} value={program.id || "unknown"}>
                    {program.name || "Unknown Program"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button data-testid="button-save-mapping" disabled={createMappingMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {createMappingMutation.isPending ? "Saving..." : "Save Mapping"}
            </Button>
            <Button variant="secondary" data-testid="button-preview-mapping">
              <Eye className="w-4 h-4 mr-2" />
              Preview
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

        {/* Drag-and-Drop Instructions */}
        <div className="mb-6 bg-accent/10 border border-accent/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Target className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <h4 className="font-medium text-accent-foreground">Drag & Drop Mapping</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Drag CLOs to PLOs, or PLOs to ILOs to create outcome mappings. 
                Invalid connections will be rejected with feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Mapping Canvas */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-muted/10 rounded-xl p-6 min-h-[600px] relative">
          
          {/* ILO Level (Top) */}
          <div className="text-center mb-8">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
              Institutional Learning Outcomes
            </h4>
            <div className="flex justify-center space-x-6 flex-wrap">
              {ilos.length > 0 ? ilos.map((ilo: LearningOutcome, index: number) => (
                <DraggableOutcome key={ilo.id} outcome={ilo} index={index} type="ilo" />
              )) : (
                <div className="text-center py-8">
                  <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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
              {plos.length > 0 ? plos.map((plo: LearningOutcome, index: number) => (
                <DraggableOutcome key={plo.id} outcome={plo} index={index} type="plo" />
              )) : (
                <div className="col-span-full text-center py-8">
                  <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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
              {clos.length > 0 ? clos.slice(0, 12).map((clo: LearningOutcome, index: number) => (
                <DraggableOutcome key={clo.id} outcome={clo} index={index} type="clo" />
              )) : (
                <div className="col-span-full text-center py-8">
                  <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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
        </DndContext>

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
