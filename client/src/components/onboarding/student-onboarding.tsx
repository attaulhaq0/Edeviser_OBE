import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Star, Clock, Target, BookOpen, Heart, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MascotType } from "@shared/schema";

// Import mascot images
import foxImage from "@assets/mascots/fox.png";
import owlImage from "@assets/mascots/owl.png";
import penguinImage from "@assets/mascots/penguin.png";

const onboardingSchema = z.object({
  learningStyle: z.string().min(1, "Please select your learning style"),
  studyTimePreference: z.string().min(1, "Please select your preferred study time"),
  motivationGoals: z.array(z.string()).min(1, "Please select at least one goal"),
  currentEducationLevel: z.string().min(1, "Please select your education level"),
  fieldOfStudy: z.string().min(1, "Please enter your field of study"),
  weeklyStudyHours: z.number().min(1, "Please enter how many hours you study per week"),
  preferredLanguage: z.string().default("english"),
  mascotType: z.enum(["fox", "owl", "penguin"]).optional(),
  mascotName: z.string().min(1, "Please give your study buddy a name").optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const mascotOptions = [
  {
    type: "fox" as MascotType,
    name: "Clever Fox",
    description: "Quick, resourceful, and loves solving problems. Perfect for analytical thinkers!",
    image: foxImage,
    personality: "Strategic • Creative • Adaptable",
    colors: "bg-orange-100 border-orange-300 text-orange-800"
  },
  {
    type: "owl" as MascotType,
    name: "Wise Owl",
    description: "Thoughtful, knowledgeable, and values deep understanding. Great for thorough learners!",
    image: owlImage,
    personality: "Wise • Patient • Detail-oriented", 
    colors: "bg-blue-100 border-blue-300 text-blue-800"
  },
  {
    type: "penguin" as MascotType,
    name: "Friendly Penguin",
    description: "Social, encouraging, and makes learning fun. Ideal for collaborative learners!",
    image: penguinImage,
    personality: "Friendly • Supportive • Enthusiastic",
    colors: "bg-purple-100 border-purple-300 text-purple-800"
  }
];

const motivationOptions = [
  { id: "career", label: "Advance my career", icon: Trophy },
  { id: "grades", label: "Improve my grades", icon: Star },
  { id: "knowledge", label: "Gain knowledge", icon: BookOpen },
  { id: "certification", label: "Get certified", icon: Target },
  { id: "personal", label: "Personal development", icon: Heart },
  { id: "skills", label: "Build new skills", icon: Zap },
];

interface StudentOnboardingProps {
  onComplete: () => void;
}

export function StudentOnboarding({ onComplete }: StudentOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMascot, setSelectedMascot] = useState<MascotType | null>(null);
  const [customMascotName, setCustomMascotName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      learningStyle: "",
      studyTimePreference: "",
      motivationGoals: [],
      currentEducationLevel: "",
      fieldOfStudy: "",
      weeklyStudyHours: 5,
      preferredLanguage: "english",
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData & { mascotType: MascotType; mascotName: string }) => {
      // Submit onboarding data
      const onboardingResponse = await apiRequest('POST', '/api/student/onboarding', {
        learningStyle: data.learningStyle,
        studyTimePreference: data.studyTimePreference,
        motivationGoals: data.motivationGoals,
        currentEducationLevel: data.currentEducationLevel,
        fieldOfStudy: data.fieldOfStudy,
        weeklyStudyHours: data.weeklyStudyHours,
        preferredLanguage: data.preferredLanguage,
        isCompleted: true,
      });

      // Submit mascot selection
      const mascotResponse = await apiRequest('POST', '/api/student/mascot', {
        mascotType: data.mascotType,
        mascotName: data.mascotName,
        mascotImagePath: `/assets/mascots/${data.mascotType}.png`,
      });

      // Initialize streak tracking
      await apiRequest('POST', '/api/student/streaks', {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        weeklyGoal: 5,
      });

      return { onboarding: onboardingResponse, mascot: mascotResponse };
    },
    onSuccess: () => {
      toast({
        title: "Welcome aboard! 🎉",
        description: "Your learning journey is about to begin. Your study buddy is excited to meet you!",
      });
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/mascot'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/streaks'] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Oops! Something went wrong",
        description: "We couldn't complete your setup. Please try again.",
        variant: "destructive",
      });
      console.error('Onboarding error:', error);
    },
  });

  const validateCurrentStep = () => {
    const values = form.getValues();
    
    switch (currentStep) {
      case 1:
        return values.learningStyle && values.studyTimePreference;
      case 2:
        return values.motivationGoals && values.motivationGoals.length > 0;
      case 3:
        return values.currentEducationLevel && values.fieldOfStudy && values.weeklyStudyHours;
      case 4:
        return selectedMascot && customMascotName;
      default:
        return false;
    }
  };

  const onSubmit = (data: OnboardingFormData) => {
    // For steps 1-3, just validate current step and advance
    if (currentStep < totalSteps) {
      if (validateCurrentStep()) {
        setCurrentStep(currentStep + 1);
      } else {
        toast({
          title: "Please complete all fields",
          description: "Make sure to fill in all required information before continuing.",
          variant: "destructive",
        });
      }
    } else {
      // Final step - validate everything and submit
      if (!selectedMascot || !customMascotName) {
        toast({
          title: "Almost there!",
          description: "Please select a study buddy and give them a name.",
          variant: "destructive",
        });
        return;
      }
      
      onboardingMutation.mutate({
        ...data,
        mascotType: selectedMascot,
        mascotName: customMascotName,
      });
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Let's learn about you! 🌟
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Help us personalize your learning experience
              </p>
            </div>

            <FormField
              control={form.control}
              name="learningStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">What's your learning style?</FormLabel>
                  <FormDescription>
                    How do you learn best? This helps us recommend the right study methods.
                  </FormDescription>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-learning-style">
                        <SelectValue placeholder="Select your learning style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="visual">Visual - I learn best with images, diagrams, and charts</SelectItem>
                      <SelectItem value="auditory">Auditory - I prefer listening and discussing</SelectItem>
                      <SelectItem value="kinesthetic">Kinesthetic - I learn by doing and hands-on practice</SelectItem>
                      <SelectItem value="reading">Reading/Writing - I prefer text-based learning</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studyTimePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">When do you study best?</FormLabel>
                  <FormDescription>
                    We'll send you reminders and suggestions based on your optimal study time.
                  </FormDescription>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-study-time">
                        <SelectValue placeholder="Select your preferred study time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                      <SelectItem value="evening">Evening (6 PM - 10 PM)</SelectItem>
                      <SelectItem value="night">Night (10 PM - 6 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                What drives you? 🎯
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select all that motivate you to learn
              </p>
            </div>

            <FormField
              control={form.control}
              name="motivationGoals"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Your learning goals</FormLabel>
                  <FormDescription>
                    Choose what motivates you most. We'll use this to keep you engaged!
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {motivationOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="motivationGoals"
                        render={({ field }) => {
                          const IconComponent = option.icon;
                          return (
                            <FormItem key={option.id}>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    data-testid={`checkbox-${option.id}`}
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, option.id]);
                                      } else {
                                        field.onChange(currentValue.filter((value) => value !== option.id));
                                      }
                                    }}
                                  />
                                  <div className="flex items-center space-x-2 flex-1">
                                    <IconComponent className="h-5 w-5 text-primary" />
                                    <label
                                      htmlFor={option.id}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      {option.label}
                                    </label>
                                  </div>
                                </div>
                              </FormControl>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Tell us about your studies 📚
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Help us understand your academic background
              </p>
            </div>

            <FormField
              control={form.control}
              name="currentEducationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Current education level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-education-level">
                        <SelectValue placeholder="Select your education level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="postgraduate">Postgraduate</SelectItem>
                      <SelectItem value="professional">Professional Development</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldOfStudy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Field of study</FormLabel>
                  <FormDescription>
                    What are you studying or want to focus on?
                  </FormDescription>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Computer Science, Business, Engineering..." 
                      {...field} 
                      data-testid="input-field-of-study"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weeklyStudyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Weekly study hours</FormLabel>
                  <FormDescription>
                    How many hours do you typically study per week?
                  </FormDescription>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="168" 
                      placeholder="5" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      data-testid="input-study-hours"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Choose Your Study Buddy! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your study buddy will motivate you, track your progress, and celebrate your achievements
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {mascotOptions.map((mascot) => (
                <Card
                  key={mascot.type}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                    selectedMascot === mascot.type 
                      ? `ring-2 ring-primary ${mascot.colors}` 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedMascot(mascot.type)}
                  data-testid={`card-mascot-${mascot.type}`}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                      <img 
                        src={mascot.image} 
                        alt={mascot.name}
                        className="w-24 h-24 object-contain rounded-full"
                      />
                    </div>
                    <CardTitle className="text-lg">{mascot.name}</CardTitle>
                    <CardDescription className="text-xs font-medium text-gray-600">
                      {mascot.personality}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                      {mascot.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedMascot && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Great choice! Now give your study buddy a name:
                  </p>
                  <Input
                    placeholder="Enter a name for your study buddy..."
                    value={customMascotName}
                    onChange={(e) => setCustomMascotName(e.target.value)}
                    className="max-w-md mx-auto text-center"
                    data-testid="input-mascot-name"
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to E Deviser! 
            </h1>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>

              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center space-x-2"
                  data-testid="button-previous"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => onSubmit(form.getValues())}
                  disabled={onboardingMutation.isPending}
                  className="flex items-center space-x-2"
                  data-testid="button-next"
                >
                  <span>
                    {currentStep === totalSteps 
                      ? (onboardingMutation.isPending ? "Setting up..." : "Complete Setup")
                      : "Next"
                    }
                  </span>
                  {currentStep < totalSteps && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}