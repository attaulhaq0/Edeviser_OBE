import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { StudentOnboarding } from "./student-onboarding";
import StudentDashboard from "@/components/dashboard/student-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function StudentOnboardingWrapper() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if student has completed onboarding
  const { data: onboardingData, isLoading: isLoadingOnboarding, error } = useQuery({
    queryKey: ['/api/student/onboarding'],
    enabled: !!user && user.role === 'student',
    retry: false,
  });

  // Check if student has selected a mascot
  const { data: mascotData, isLoading: isLoadingMascot } = useQuery({
    queryKey: ['/api/student/mascot'],
    enabled: !!user && user.role === 'student',
    retry: false,
  });

  useEffect(() => {
    if (!isLoadingOnboarding && !isLoadingMascot) {
      // Show onboarding if:
      // 1. No onboarding data exists, OR
      // 2. Onboarding exists but not completed, OR
      // 3. No mascot selected
      const needsOnboarding = !onboardingData || 
                             !(onboardingData as any)?.isCompleted || 
                             !mascotData;
      
      setShowOnboarding(needsOnboarding);
    }
  }, [onboardingData, mascotData, isLoadingOnboarding, isLoadingMascot]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Refresh the page data
    window.location.reload();
  };

  // Show loading while checking onboarding status
  if (isLoadingOnboarding || isLoadingMascot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to E Deviser!</CardTitle>
            <CardDescription>
              Setting up your personalized learning experience...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will just take a moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return <StudentOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Show regular student dashboard
  return <StudentDashboard />;
}