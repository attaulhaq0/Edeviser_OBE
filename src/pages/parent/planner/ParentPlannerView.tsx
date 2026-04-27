import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

const ParentPlannerView = () => {
  const { studentId } = useParams<{ studentId: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Study Plan</h1>
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-500">
            {studentId
              ? `Study plan view for student — coming soon.`
              : "Select a student from the Children page to view their study plan."}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ParentPlannerView;
