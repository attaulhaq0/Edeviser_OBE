import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GraduationCap, Users, TrendingUp, Award, BookOpen, Target, Plus, Edit, Trash2, Eye, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type Program = {
  id: string;
  name: string;
  description: string;
  coordinator_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  courses?: Course[];
  student_programs?: { student: Profile }[];
};

type Course = {
  id: string;
  name: string;
  description: string;
  program_id: string;
  teacher_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teacher?: Profile;
  student_courses?: { student: Profile }[];
};

type Profile = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'coordinator' | 'teacher' | 'student';
  is_active: boolean;
  profile_image?: string | null;
  created_at: string;
  updated_at: string;
};

type LearningOutcome = {
  id: string;
  title: string;
  description: string;
  type: 'ILO' | 'PLO' | 'CLO';
  program_id?: string;
  course_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function CoordinatorDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<LearningOutcome | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    name: '',
    description: '',
    program_id: '',
    teacher_id: ''
  });

  const [outcomeForm, setOutcomeForm] = useState<{
    title: string;
    description: string;
    type: 'ILO' | 'PLO' | 'CLO';
    program_id: string;
    course_id: string;
  }>({
    title: '',
    description: '',
    type: 'PLO',
    program_id: '',
    course_id: ''
  });

  // Fetch data
  useEffect(() => {
    if (profile?.id) {
      fetchPrograms();
      fetchTeachers();
      fetchStudents();
      fetchOutcomes();
    }
  }, [profile?.id]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          *,
          courses(*,
            teacher:profiles!courses_teacher_id_fkey(first_name, last_name),
            student_courses(
              student:profiles!student_courses_student_id_fkey(first_name, last_name)
            )
          ),
          student_programs(
            student:profiles!student_programs_student_id_fkey(first_name, last_name)
          )
        `)
        .eq('coordinator_id', profile?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPrograms(data || []);
      
      // Extract courses from programs
      const allCourses = data?.flatMap(program => program.courses || []) || [];
      setCourses(allCourses);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch programs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .eq('is_active', true);
      
      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('is_active', true);
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchOutcomes = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_outcomes')
        .select(`
          *,
          program:programs!learning_outcomes_program_id_fkey(name),
          course:courses!learning_outcomes_course_id_fkey(name)
        `)
        .or(`program_id.in.(${programs.map(p => p.id).join(',')}),course_id.in.(${courses.map(c => c.id).join(',')})`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOutcomes(data || []);
    } catch (error) {
      console.error('Error fetching outcomes:', error);
    }
  };

  // Course management functions
  const handleCreateCourse = async () => {
    try {
      const { error } = await supabase
        .from('courses')
        .insert({
          name: courseForm.name,
          description: courseForm.description,
          program_id: courseForm.program_id,
          teacher_id: courseForm.teacher_id || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course created successfully"
      });

      setCourseDialogOpen(false);
      setCourseForm({
        name: '',
        description: '',
        program_id: '',
        teacher_id: ''
      });
      fetchPrograms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse) return;

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          name: courseForm.name,
          description: courseForm.description,
          teacher_id: courseForm.teacher_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCourse.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course updated successfully"
      });

      setCourseDialogOpen(false);
      setSelectedCourse(null);
      setCourseForm({
        name: '',
        description: '',
        program_id: '',
        teacher_id: ''
      });
      fetchPrograms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course deleted successfully"
      });

      fetchPrograms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Outcome management functions
  const handleCreateOutcome = async () => {
    try {
      const { error } = await supabase
        .from('learning_outcomes')
        .insert({
          title: outcomeForm.title,
          description: outcomeForm.description,
          type: outcomeForm.type,
          program_id: outcomeForm.program_id || null,
          course_id: outcomeForm.course_id || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Learning outcome created successfully"
      });

      setOutcomeDialogOpen(false);
      setOutcomeForm({
        title: '',
        description: '',
        type: 'PLO',
        program_id: '',
        course_id: ''
      });
      fetchOutcomes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteOutcome = async (outcomeId: string) => {
    try {
      const { error } = await supabase
        .from('learning_outcomes')
        .delete()
        .eq('id', outcomeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Learning outcome deleted successfully"
      });

      fetchOutcomes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Helper functions
  const openEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseForm({
      name: course.name,
      description: course.description,
      program_id: course.program_id,
      teacher_id: course.teacher_id || ''
    });
    setCourseDialogOpen(true);
  };

  // Statistics
  const totalStudents = programs.reduce((acc, program) => acc + (program.student_programs?.length || 0), 0);
  const totalCourses = courses.length;
  const activePrograms = programs.filter(p => p.is_active).length;
  const plos = outcomes.filter(o => o.type === 'PLO').length;
  const clos = outcomes.filter(o => o.type === 'CLO').length;
  const ilos = outcomes.filter(o => o.type === 'ILO').length;

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="space-y-8 p-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-2xl p-8 shadow-2xl">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-3">
              Welcome back, {profile.first_name}! 📊
            </h1>
            <p className="text-blue-100 text-lg">
              Manage your academic programs and track student progress with powerful insights
            </p>
          </div>
        </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programs Managed</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePrograms}</div>
            <p className="text-xs text-muted-foreground">Active programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">Under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Outcomes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outcomes.length}</div>
            <p className="text-xs text-muted-foreground">Total outcomes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Program Performance</CardTitle>
                <CardDescription>Overall program statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {programs.map((program, index) => (
                    <div key={program.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{program.name}</span>
                        <span>{program.student_programs?.length || 0} students</span>
                      </div>
                      <Progress value={(program.student_programs?.length || 0) * 10} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes Distribution</CardTitle>
                <CardDescription>Breakdown by outcome type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{plos}</div>
                          <p className="text-sm text-muted-foreground">PLOs</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{clos}</div>
                          <p className="text-sm text-muted-foreground">CLOs</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{ilos}</div>
                          <p className="text-sm text-muted-foreground">ILOs</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Managed Programs
              </CardTitle>
              <CardDescription>Programs under your coordination</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {programs.map((program) => (
                  <div key={program.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{program.name}</h3>
                      <p className="text-sm text-muted-foreground">{program.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {program.student_programs?.length || 0} students • {program.courses?.length || 0} courses
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={program.is_active ? "default" : "secondary"}>
                        {program.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Management
              </CardTitle>
              <CardDescription>Manage courses within your programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setSelectedCourse(null);
                      setCourseForm({
                        name: '',
                        description: '',
                        program_id: '',
                        teacher_id: ''
                      });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{selectedCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
                      <DialogDescription>
                        {selectedCourse ? 'Update course information' : 'Enter the details for the new course'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="course_name">Course Name</Label>
                        <Input
                          id="course_name"
                          value={courseForm.name}
                          onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="course_description">Description</Label>
                        <Textarea
                          id="course_description"
                          value={courseForm.description}
                          onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      {!selectedCourse && (
                        <div>
                          <Label htmlFor="program">Program</Label>
                          <Select value={courseForm.program_id} onValueChange={(value: string) => setCourseForm(prev => ({ ...prev, program_id: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a program" />
                            </SelectTrigger>
                            <SelectContent>
                              {programs.map((program) => (
                                <SelectItem key={program.id} value={program.id}>
                                  {program.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label htmlFor="teacher">Teacher</Label>
                        <Select value={courseForm.teacher_id} onValueChange={(value: string) => setCourseForm(prev => ({ ...prev, teacher_id: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No teacher assigned</SelectItem>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.first_name} {teacher.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={selectedCourse ? handleUpdateCourse : handleCreateCourse} className="w-full">
                        {selectedCourse ? 'Update Course' : 'Create Course'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="space-y-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <p className="text-sm text-muted-foreground">{course.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Teacher: {course.teacher ? `${course.teacher.first_name} ${course.teacher.last_name}` : "Unassigned"} •
                          {course.student_courses?.length || 0} students
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={course.is_active ? "default" : "secondary"}>
                          {course.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => openEditCourse(course)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Course</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{course.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCourse(course.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Learning Outcomes Management
              </CardTitle>
              <CardDescription>Track and manage program learning outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setSelectedOutcome(null);
                      setOutcomeForm({
                        title: '',
                        description: '',
                        type: 'PLO',
                        program_id: '',
                        course_id: ''
                      });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Learning Outcome
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Learning Outcome</DialogTitle>
                      <DialogDescription>
                        Define a new learning outcome for your programs
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="outcome_title">Title</Label>
                        <Input
                          id="outcome_title"
                          value={outcomeForm.title}
                          onChange={(e) => setOutcomeForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="outcome_description">Description</Label>
                        <Textarea
                          id="outcome_description"
                          value={outcomeForm.description}
                          onChange={(e) => setOutcomeForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="outcome_type">Type</Label>
                        <Select value={outcomeForm.type} onValueChange={(value: 'ILO' | 'PLO' | 'CLO') => setOutcomeForm(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLO">Program Learning Outcome (PLO)</SelectItem>
                            <SelectItem value="CLO">Course Learning Outcome (CLO)</SelectItem>
                            <SelectItem value="ILO">Institutional Learning Outcome (ILO)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(outcomeForm.type === 'PLO' || outcomeForm.type === 'ILO') && (
                        <div>
                          <Label htmlFor="outcome_program">Program</Label>
                          <Select value={outcomeForm.program_id} onValueChange={(value: string) => setOutcomeForm(prev => ({ ...prev, program_id: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a program" />
                            </SelectTrigger>
                            <SelectContent>
                              {programs.map((program) => (
                                <SelectItem key={program.id} value={program.id}>
                                  {program.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {outcomeForm.type === 'CLO' && (
                        <div>
                          <Label htmlFor="outcome_course">Course</Label>
                          <Select value={outcomeForm.course_id} onValueChange={(value: string) => setOutcomeForm(prev => ({ ...prev, course_id: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button onClick={handleCreateOutcome} className="w-full">
                        Create Learning Outcome
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="space-y-2">
                  {outcomes.map((outcome) => (
                    <div key={outcome.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{outcome.title}</h3>
                        <p className="text-sm text-muted-foreground">{outcome.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{outcome.type}</Badge>
                          {outcome.type === 'PLO' || outcome.type === 'ILO' ? (
                            <Badge variant="secondary">Program Level</Badge>
                          ) : (
                            <Badge variant="secondary">Course Level</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Learning Outcome</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{outcome.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteOutcome(outcome.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}