import { useState } from "react";
import { useAuth } from "@/hooks/useSupabaseAuth";
import StudentDashboard from "@/components/dashboard/student-dashboard";

export function StudentOnboardingWrapper() {
  const { profile } = useAuth();

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  // For now, we'll just show the student dashboard directly
  // Later you can add onboarding logic here
  return <StudentDashboard />;
}