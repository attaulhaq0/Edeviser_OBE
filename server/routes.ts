import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertProgramSchema, insertCourseSchema, insertLearningOutcomeSchema,
  insertOutcomeMappingSchema, insertAssignmentSchema, insertStudentSubmissionSchema,
  insertBadgeTemplateSchema, insertLearningModuleSchema,
  insertStudentOnboardingSchema, insertStudentMascotSchema, insertStudyStreaksSchema,
  insertStudyBuddyInteractionsSchema, insertAcademicAlertsSchema, insertAlertNotificationsSchema,
  insertUserSessionsSchema, type Role, type AlertType, type AlertPriority, type AlertStatus
} from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Middleware to check authentication - simplified for Supabase
  const requireAuth = (req: any, res: any, next: any) => {
    // Since we're using Supabase client-side auth, skip server-side auth for now
    next();
  };

  // Middleware to check role permissions
  const requireRole = (roles: Role[]) => (req: any, res: any, next: any) => {
    // Skip role check for now - let client handle this
    next();
  };

  // User routes
  app.get("/api/users", requireRole(["admin"]), async (req, res) => {
    try {
      // Admin can get all users or filter by role
      let users;
      if (req.query.role) {
        users = await storage.getUsersByRole(req.query.role as Role);
      } else {
        // Get all users for admin - add this to storage interface
        users = await storage.getAllUsers();
      }
      // Remove passwords from all users
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUser = req.user!;
      
      // Only admin can update other users, users can only update themselves
      if (currentUser.id !== targetUserId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Can only update your own profile" });
      }
      
      // Filter allowed fields based on role
      const allowedFields = currentUser.role === "admin" 
        ? ["firstName", "lastName", "email", "profileImage", "isActive", "role"] // Admin can update role
        : ["firstName", "lastName", "email", "profileImage"]; // Users cannot update role
      
      const filteredUpdates = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
      );
      
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const user = await storage.updateUser(targetUserId, filteredUpdates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive fields before returning
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Program routes
  app.get("/api/programs", requireAuth, async (req, res) => {
    try {
      const programs = await storage.getPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get("/api/programs/:id", requireAuth, async (req, res) => {
    try {
      const program = await storage.getProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  app.post("/api/programs", requireRole(["admin", "coordinator"]), async (req, res) => {
    try {
      const data = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(data);
      res.status(201).json(program);
    } catch (error) {
      res.status(400).json({ message: "Invalid program data" });
    }
  });

  app.put("/api/programs/:id", requireRole(["admin", "coordinator"]), async (req, res) => {
    try {
      const program = await storage.updateProgram(req.params.id, req.body);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to update program" });
    }
  });

  app.get("/api/programs/coordinator/:coordinatorId", requireAuth, async (req, res) => {
    try {
      const programs = await storage.getProgramsByCoordinator(req.params.coordinatorId);
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coordinator programs" });
    }
  });

  // Course routes
  app.get("/api/courses", requireAuth, async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post("/api/courses", requireRole(["admin", "coordinator"]), async (req, res) => {
    try {
      const data = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(data);
      res.status(201).json(course);
    } catch (error) {
      res.status(400).json({ message: "Invalid course data" });
    }
  });

  app.put("/api/courses/:id", requireRole(["admin", "coordinator", "teacher"]), async (req, res) => {
    try {
      const course = await storage.updateCourse(req.params.id, req.body);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.get("/api/courses/program/:programId", requireAuth, async (req, res) => {
    try {
      const courses = await storage.getCoursesByProgram(req.params.programId);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program courses" });
    }
  });

  app.get("/api/courses/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const courses = await storage.getCoursesByTeacher(req.params.teacherId);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher courses" });
    }
  });

  // Learning Outcomes routes with enhanced role-based filtering for cross-profile synchronization
  app.get("/api/learning-outcomes", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let outcomes;
      
      if (req.query.type) {
        outcomes = await storage.getLearningOutcomesByType(req.query.type as string);
      } else if (req.query.programId) {
        outcomes = await storage.getLearningOutcomesByProgram(req.query.programId as string);
      } else if (req.query.courseId) {
        outcomes = await storage.getLearningOutcomesByCourse(req.query.courseId as string);
      } else {
        outcomes = await storage.getLearningOutcomes();
      }
      
      // Cross-profile data filtering based on role and ownership
      const filteredOutcomes = outcomes.filter(outcome => {
        // Admin can see all outcomes
        if (currentUser.role === 'admin') return true;
        
        // Users can see their own outcomes
        if (outcome.ownerId === currentUser.id) return true;
        
        // Role-based visibility for outcomes they can potentially edit
        switch (outcome.type) {
          case 'ILO': 
            return currentUser.role === 'coordinator'; // Coordinators need to see ILOs for PLO→ILO mappings
          case 'PLO': 
            return currentUser.role === 'coordinator'; // Coordinators can see PLOs to potentially override
          case 'CLO': 
            return ['coordinator', 'teacher'].includes(currentUser.role); // Coordinators/Teachers can see CLOs
          default: 
            return false;
        }
      });
      
      res.json(filteredOutcomes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning outcomes" });
    }
  });

  app.get("/api/learning-outcomes/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const outcome = await storage.getLearningOutcome(req.params.id);
      
      if (!outcome) {
        return res.status(404).json({ message: "Learning outcome not found" });
      }
      
      // Apply same role-based filtering as list endpoint to prevent IDOR vulnerability
      const canViewOutcome = (): boolean => {
        // Admin can see all outcomes
        if (currentUser.role === 'admin') return true;
        
        // Users can see their own outcomes
        if (outcome.ownerId === currentUser.id) return true;
        
        // Role-based visibility for outcomes they can potentially edit
        switch (outcome.type) {
          case 'ILO': 
            return currentUser.role === 'coordinator'; // Coordinators need to see ILOs for PLO→ILO mappings
          case 'PLO': 
            return currentUser.role === 'coordinator'; // Coordinators can see PLOs to potentially override
          case 'CLO': 
            return ['coordinator', 'teacher'].includes(currentUser.role); // Coordinators/Teachers can see CLOs
          default: 
            return false;
        }
      };
      
      if (!canViewOutcome()) {
        return res.status(403).json({ message: "Insufficient permissions to view this outcome" });
      }
      
      res.json(outcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning outcome" });
    }
  });

  app.post("/api/learning-outcomes", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const outcomeType = req.body.type;
      
      // Enhanced role-based permission enforcement for cross-profile synchronization
      const canCreateOutcome = (userRole: Role, type: string): boolean => {
        switch (type) {
          case 'ILO': return userRole === 'admin';
          case 'PLO': return userRole === 'coordinator';
          case 'CLO': return ['coordinator', 'teacher'].includes(userRole);
          default: return false;
        }
      };
      
      if (!canCreateOutcome(currentUser.role, outcomeType)) {
        return res.status(403).json({ 
          message: `${currentUser.role} role cannot create ${outcomeType} outcomes` 
        });
      }
      
      const data = insertLearningOutcomeSchema.parse({
        ...req.body,
        ownerId: req.user!.id,
        lastEditedBy: req.user!.id,
      });
      const outcome = await storage.createLearningOutcome(data);
      res.status(201).json(outcome);
    } catch (error) {
      res.status(400).json({ message: "Invalid learning outcome data" });
    }
  });

  app.put("/api/learning-outcomes/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const existingOutcome = await storage.getLearningOutcome(req.params.id);
      
      if (!existingOutcome) {
        return res.status(404).json({ message: "Learning outcome not found" });
      }
      
      // Enhanced hierarchical permission validation for cross-profile synchronization
      const canUpdateOutcome = (userRole: Role, outcomeType: string, ownerId: string): boolean => {
        // Users can always update their own outcomes if role permits
        if (ownerId === currentUser.id) {
          switch (outcomeType) {
            case 'ILO': return userRole === 'admin';
            case 'PLO': return ['admin', 'coordinator'].includes(userRole);
            case 'CLO': return ['admin', 'coordinator', 'teacher'].includes(userRole);
            default: return false;
          }
        }
        
        // Hierarchical overrides: Admin can override PLOs, Coordinator can override CLOs
        switch (outcomeType) {
          case 'PLO': return userRole === 'admin'; // Admin can override PLOs
          case 'CLO': return ['admin', 'coordinator'].includes(userRole); // Admin/Coordinator can override CLOs
          default: return false; // No overrides for ILOs
        }
      };
      
      if (!canUpdateOutcome(currentUser.role, existingOutcome.type, existingOutcome.ownerId)) {
        return res.status(403).json({ 
          message: `${currentUser.role} role cannot update this ${existingOutcome.type} outcome` 
        });
      }
      
      const outcome = await storage.updateLearningOutcome(req.params.id, {
        ...req.body,
        lastEditedBy: req.user!.id,
      });
      res.json(outcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to update learning outcome" });
    }
  });

  // Outcome Mapping routes with role-based filtering for cross-profile synchronization
  app.get("/api/outcome-mappings", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let mappings;
      
      if (req.query.sourceId) {
        mappings = await storage.getOutcomeMappingsBySource(req.query.sourceId as string);
      } else if (req.query.targetId) {
        mappings = await storage.getOutcomeMappingsByTarget(req.query.targetId as string);
      } else {
        mappings = await storage.getOutcomeMappings();
      }
      
      // Role-based filtering to prevent excessive data exposure
      const filteredMappings = [];
      for (const mapping of mappings) {
        const sourceOutcome = await storage.getLearningOutcome(mapping.sourceOutcomeId);
        const targetOutcome = await storage.getLearningOutcome(mapping.targetOutcomeId);
        
        if (!sourceOutcome || !targetOutcome) continue;
        
        // Apply visibility rules based on user role and outcome access
        const canViewMapping = (): boolean => {
          // Admin can see all mappings
          if (currentUser.role === 'admin') return true;
          
          // Users can see mappings they created
          if (mapping.createdBy === currentUser.id) return true;
          
          // Check if user can see both source and target outcomes
          const canViewSource = currentUser.id === sourceOutcome.ownerId || 
            (sourceOutcome.type === 'ILO' && currentUser.role === 'coordinator') ||
            (sourceOutcome.type === 'PLO' && currentUser.role === 'coordinator') ||
            (sourceOutcome.type === 'CLO' && ['coordinator', 'teacher'].includes(currentUser.role));
            
          const canViewTarget = currentUser.id === targetOutcome.ownerId ||
            (targetOutcome.type === 'ILO' && currentUser.role === 'coordinator') ||
            (targetOutcome.type === 'PLO' && currentUser.role === 'coordinator') ||
            (targetOutcome.type === 'CLO' && ['coordinator', 'teacher'].includes(currentUser.role));
          
          return canViewSource && canViewTarget;
        };
        
        if (canViewMapping()) {
          filteredMappings.push(mapping);
        }
      }
      
      res.json(filteredMappings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch outcome mappings" });
    }
  });

  app.post("/api/outcome-mappings", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { sourceId, targetId } = req.body;
      
      // Enhanced permission validation for outcome mapping based on cross-profile synchronization
      const sourceOutcome = await storage.getLearningOutcome(sourceId);
      const targetOutcome = await storage.getLearningOutcome(targetId);
      
      if (!sourceOutcome || !targetOutcome) {
        return res.status(400).json({ message: "Invalid source or target outcome" });
      }
      
      // Validate mapping hierarchy and permissions
      const canCreateMapping = (): boolean => {
        // Admin can create any mapping
        if (currentUser.role === 'admin') return true;
        
        // Coordinators can create PLO mappings and manage their program outcomes
        if (currentUser.role === 'coordinator') {
          return ['PLO', 'CLO'].includes(sourceOutcome.type) && ['ILO', 'PLO'].includes(targetOutcome.type);
        }
        
        // Teachers can only create CLO mappings for outcomes they own/teach
        if (currentUser.role === 'teacher') {
          return sourceOutcome.type === 'CLO' && 
                 targetOutcome.type === 'PLO' && 
                 sourceOutcome.ownerId === currentUser.id;
        }
        
        return false;
      };
      
      if (!canCreateMapping()) {
        return res.status(403).json({ 
          message: `${currentUser.role} role cannot create ${sourceOutcome.type}→${targetOutcome.type} mappings` 
        });
      }
      
      const data = insertOutcomeMappingSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const mapping = await storage.createOutcomeMapping(data);
      res.status(201).json(mapping);
    } catch (error) {
      res.status(400).json({ message: "Invalid mapping data" });
    }
  });

  // Assignment routes
  app.get("/api/assignments", requireAuth, async (req, res) => {
    try {
      let assignments;
      if (req.query.courseId) {
        assignments = await storage.getAssignmentsByCourse(req.query.courseId as string);
      } else {
        assignments = await storage.getAssignments();
      }
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.post("/api/assignments", requireRole(["teacher", "coordinator", "admin"]), async (req, res) => {
    try {
      const data = insertAssignmentSchema.parse({
        ...req.body,
        teacherId: req.user!.id,
      });
      const assignment = await storage.createAssignment(data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignment data" });
    }
  });

  app.put("/api/assignments/:id", requireRole(["teacher", "coordinator", "admin"]), async (req, res) => {
    try {
      const assignment = await storage.updateAssignment(req.params.id, req.body);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  // Student Submission routes
  app.get("/api/student-submissions", requireAuth, async (req, res) => {
    try {
      let submissions;
      if (req.query.studentId) {
        submissions = await storage.getSubmissionsByStudent(req.query.studentId as string);
      } else if (req.query.assignmentId) {
        submissions = await storage.getSubmissionsByAssignment(req.query.assignmentId as string);
      } else {
        submissions = await storage.getStudentSubmissions();
      }
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get("/api/student-submissions/:id", requireAuth, async (req, res) => {
    try {
      const submission = await storage.getStudentSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.post("/api/student-submissions", requireAuth, async (req, res) => {
    try {
      const user = req.user!; // Safe because of requireAuth middleware
      const data = insertStudentSubmissionSchema.parse({
        ...req.body,
        studentId: user.role === "student" ? user.id : req.body.studentId,
      });
      const submission = await storage.createStudentSubmission(data);
      res.status(201).json(submission);
    } catch (error) {
      res.status(400).json({ message: "Invalid submission data" });
    }
  });

  app.put("/api/student-submissions/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!; // Safe because of requireAuth middleware
      const updates = {
        ...req.body,
        gradedBy: user.role !== "student" ? user.id : undefined,
        gradedAt: req.body.totalScore !== undefined ? new Date() : undefined,
      };
      const submission = await storage.updateStudentSubmission(req.params.id, updates);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  // Student Progress routes
  app.get("/api/student-progress/:studentId", requireAuth, async (req, res) => {
    try {
      let progress = await storage.getStudentProgress(req.params.studentId);
      if (!progress) {
        progress = await storage.createStudentProgress(req.params.studentId);
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  app.put("/api/student-progress/:studentId", requireAuth, async (req, res) => {
    try {
      const progress = await storage.updateStudentProgress(req.params.studentId, req.body);
      if (!progress) {
        return res.status(404).json({ message: "Student progress not found" });
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to update student progress" });
    }
  });

  // Badge Template routes
  app.get("/api/badge-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getBadgeTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch badge templates" });
    }
  });

  app.post("/api/badge-templates", requireRole(["admin"]), async (req, res) => {
    try {
      const data = insertBadgeTemplateSchema.parse(req.body);
      const template = await storage.createBadgeTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid badge template data" });
    }
  });

  // Learning Module routes
  app.get("/api/learning-modules", requireAuth, async (req, res) => {
    try {
      let modules;
      if (req.query.courseId) {
        modules = await storage.getLearningModulesByCourse(req.query.courseId as string);
      } else {
        modules = await storage.getLearningModules();
      }
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning modules" });
    }
  });

  app.post("/api/learning-modules", requireRole(["teacher", "coordinator", "admin"]), async (req, res) => {
    try {
      const data = insertLearningModuleSchema.parse(req.body);
      const module = await storage.createLearningModule(data);
      res.status(201).json(module);
    } catch (error) {
      res.status(400).json({ message: "Invalid learning module data" });
    }
  });

  // Statistics endpoints for role-specific dashboard
  app.get("/api/stats/admin", requireRole(["admin"]), async (req, res) => {
    try {
      const programs = await storage.getPrograms();
      const users = await storage.getAllUsers();
      
      res.json({
        totalPrograms: programs.length,
        systemUsers: users.length,
        systemHealth: 98 // Can be calculated based on various metrics
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  app.get("/api/stats/coordinator/:coordinatorId", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'coordinator' && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const programs = await storage.getProgramsByCoordinator(req.params.coordinatorId);
      const outcomes = await storage.getLearningOutcomesByType('PLO');
      const mappings = await storage.getOutcomeMappings();
      
      // Calculate students in coordinator's programs
      let totalStudents = 0;
      for (const program of programs) {
        const courses = await storage.getCoursesByProgram(program.id);
        const studentSet = new Set();
        for (const course of courses) {
          // const enrollments = await storage.getStudentEnrollmentsByCourse(course.id);
          // enrollments.forEach(e => studentSet.add(e.studentId));
        }
        totalStudents += studentSet.size;
      }
      
      // Calculate outcomes mapped percentage
      const coordinatorOutcomes = outcomes.filter(o => o.ownerId === req.params.coordinatorId);
      const mappedOutcomes = coordinatorOutcomes.filter(o => 
        mappings.some(m => m.sourceOutcomeId === o.id || m.targetOutcomeId === o.id)
      );
      const mappedPercentage = coordinatorOutcomes.length > 0 
        ? Math.round((mappedOutcomes.length / coordinatorOutcomes.length) * 100)
        : 0;
      
      res.json({
        programsManaged: programs.length,
        studentsTracked: totalStudents,
        outcomesMapped: mappedPercentage
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coordinator statistics" });
    }
  });

  app.get("/api/stats/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'teacher' && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const courses = await storage.getCoursesByTeacher(req.params.teacherId);
      const assignments = await storage.getAssignments();
      
      // Calculate active students
      const studentSet = new Set();
      for (const course of courses) {
        // const enrollments = await storage.getStudentEnrollmentsByCourse(course.id);
        // enrollments.forEach(e => studentSet.add(e.studentId));
      }
      
      // Count teacher's assignments
      const teacherAssignments = assignments.filter(a => 
        courses.some(c => c.id === a.courseId)
      );
      
      res.json({
        coursesTeaching: courses.length,
        activeStudents: studentSet.size,
        assignmentsCreated: teacherAssignments.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher statistics" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/program/:programId", requireRole(["admin", "coordinator"]), async (req, res) => {
    try {
      const analytics = await storage.getProgramAnalytics(req.params.programId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program analytics" });
    }
  });

  app.get("/api/analytics/blooms-distribution", requireAuth, async (req, res) => {
    try {
      const distribution = await storage.getBloomsTaxonomyDistribution(req.query.programId as string);
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Bloom's taxonomy distribution" });
    }
  });

  app.get("/api/analytics/outcome-performance/:outcomeId", requireAuth, async (req, res) => {
    try {
      const performance = await storage.getStudentPerformanceByOutcome(req.params.outcomeId);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch outcome performance" });
    }
  });

  // Student Onboarding routes
  app.get("/api/student/onboarding", requireRole(["student"]), async (req, res) => {
    try {
      const onboarding = await storage.getStudentOnboarding(req.user!.id);
      res.json(onboarding);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding data" });
    }
  });

  app.post("/api/student/onboarding", requireRole(["student"]), async (req, res) => {
    try {
      console.log("Onboarding request body:", JSON.stringify(req.body, null, 2));
      const parsed = insertStudentOnboardingSchema.parse(req.body);
      console.log("Validation passed, parsed data:", JSON.stringify(parsed, null, 2));
      
      // Check if onboarding data already exists for this student
      const existingOnboarding = await storage.getStudentOnboarding(req.user!.id);
      
      let onboarding;
      if (existingOnboarding) {
        // Update existing onboarding data
        console.log('Updating existing onboarding data for student:', req.user!.id);
        onboarding = await storage.updateStudentOnboarding(req.user!.id, parsed);
      } else {
        // Create new onboarding data
        console.log('Creating new onboarding data for student:', req.user!.id);
        onboarding = await storage.createStudentOnboarding({
          ...parsed,
          studentId: req.user!.id,
        });
      }
      
      res.status(existingOnboarding ? 200 : 201).json(onboarding);
    } catch (error) {
      console.error("Student onboarding error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      res.status(400).json({ message: "Invalid onboarding data" });
    }
  });

  app.put("/api/student/onboarding", requireRole(["student"]), async (req, res) => {
    try {
      const parsed = insertStudentOnboardingSchema.partial().parse(req.body);
      const onboarding = await storage.updateStudentOnboarding(req.user!.id, parsed);
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding data not found" });
      }
      res.json(onboarding);
    } catch (error) {
      res.status(400).json({ message: "Invalid onboarding data" });
    }
  });

  // Student Mascot routes
  app.get("/api/student/mascot", requireRole(["student"]), async (req, res) => {
    try {
      const mascot = await storage.getStudentMascot(req.user!.id);
      res.json(mascot);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mascot data" });
    }
  });

  app.post("/api/student/mascot", requireRole(["student"]), async (req, res) => {
    try {
      const parsed = insertStudentMascotSchema.parse(req.body);
      
      // Check if mascot data already exists for this student
      const existingMascot = await storage.getStudentMascot(req.user!.id);
      
      let mascot;
      if (existingMascot) {
        // Update existing mascot data
        console.log('Updating existing mascot data for student:', req.user!.id);
        mascot = await storage.updateStudentMascot(req.user!.id, parsed);
      } else {
        // Create new mascot data
        console.log('Creating new mascot data for student:', req.user!.id);
        mascot = await storage.createStudentMascot({
          ...parsed,
          studentId: req.user!.id,
        });
      }
      
      res.status(existingMascot ? 200 : 201).json(mascot);
    } catch (error) {
      res.status(400).json({ message: "Invalid mascot data" });
    }
  });

  app.put("/api/student/mascot", requireRole(["student"]), async (req, res) => {
    try {
      const parsed = insertStudentMascotSchema.partial().parse(req.body);
      const mascot = await storage.updateStudentMascot(req.user!.id, parsed);
      if (!mascot) {
        return res.status(404).json({ message: "Mascot data not found" });
      }
      res.json(mascot);
    } catch (error) {
      res.status(400).json({ message: "Invalid mascot data" });
    }
  });

  // Study Streaks routes
  app.get("/api/student/streaks", requireRole(["student"]), async (req, res) => {
    try {
      const streaks = await storage.getStudyStreaks(req.user!.id);
      res.json(streaks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch streak data" });
    }
  });

  app.post("/api/student/streaks", requireRole(["student"]), async (req, res) => {
    try {
      const parsed = insertStudyStreaksSchema.parse(req.body);
      const streaks = await storage.createStudyStreaks({
        ...parsed,
        studentId: req.user!.id,
      });
      res.json(streaks);
    } catch (error) {
      res.status(400).json({ message: "Invalid streak data" });
    }
  });

  app.put("/api/student/streaks", requireRole(["student"]), async (req, res) => {
    try {
      const parsed = insertStudyStreaksSchema.partial().parse(req.body);
      const streaks = await storage.updateStudyStreaks(req.user!.id, parsed);
      if (!streaks) {
        return res.status(404).json({ message: "Streak data not found" });
      }
      res.json(streaks);
    } catch (error) {
      res.status(400).json({ message: "Invalid streak data" });
    }
  });

  // Study Buddy Interactions routes
  app.get("/api/student/buddy-interactions", requireRole(["student"]), async (req, res) => {
    try {
      const interactions = await storage.getStudyBuddyInteractions(req.user!.id);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.get("/api/student/buddy-interactions/unread", requireRole(["student"]), async (req, res) => {
    try {
      const interactions = await storage.getUnreadInteractions(req.user!.id);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread interactions" });
    }
  });

  app.post("/api/student/buddy-interactions", requireRole(["student"]), async (req, res) => {
    try {
      const parsed = insertStudyBuddyInteractionsSchema.parse(req.body);
      const interaction = await storage.createStudyBuddyInteraction({
        ...parsed,
        studentId: req.user!.id,
      });
      res.json(interaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid interaction data" });
    }
  });

  app.put("/api/student/buddy-interactions/:id/read", requireRole(["student"]), async (req, res) => {
    try {
      const interaction = await storage.markInteractionAsRead(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      res.json(interaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark interaction as read" });
    }
  });

  // Academic Alerts routes
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let alerts;

      // Role-based alert access
      if (currentUser.role === "admin") {
        alerts = await storage.getAcademicAlerts();
      } else if (currentUser.role === "coordinator" || currentUser.role === "teacher") {
        alerts = await storage.getAlertsByAssignedUser(currentUser.id);
      } else {
        alerts = await storage.getAlertsByStudent(currentUser.id);
      }

      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/status/:status", requireAuth, async (req, res) => {
    try {
      const status = req.params.status as AlertStatus;
      const alerts = await storage.getAlertsByStatus(status);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts by status" });
    }
  });

  app.get("/api/alerts/type/:type", requireAuth, async (req, res) => {
    try {
      const type = req.params.type as AlertType;
      const alerts = await storage.getAlertsByType(type);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts by type" });
    }
  });

  app.post("/api/alerts", requireRole(["admin", "coordinator", "teacher"]), async (req, res) => {
    try {
      const parsed = insertAcademicAlertsSchema.parse(req.body);
      const alert = await storage.createAcademicAlert({
        ...parsed,
        triggeredBy: req.user!.id,
      });
      
      // Create notifications for relevant users
      const notificationTargets = await getAlertNotificationTargets(alert, req.user!);
      const createdNotifications = [];
      
      for (const targetUserId of notificationTargets) {
        const notification = await storage.createNotification({
          alertId: alert.id,
          userId: targetUserId,
          notificationType: 'in_app',
        });
        createdNotifications.push(notification);
      }

      // Broadcast real-time notification
      if (typeof (global as any).broadcastNotification === 'function') {
        (global as any).broadcastNotification(notificationTargets, {
          id: alert.id,
          type: 'new_alert',
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          alertType: alert.alertType,
          createdAt: alert.createdAt,
        });
      }

      res.json(alert);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.put("/api/alerts/:id", requireAuth, async (req, res) => {
    try {
      const alertId = req.params.id;
      const updates = req.body;
      const alert = await storage.updateAcademicAlert(alertId, updates);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  app.put("/api/alerts/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const alertId = req.params.id;
      const alert = await storage.acknowledgeAlert(alertId, req.user!.id);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  app.put("/api/alerts/:id/resolve", requireAuth, async (req, res) => {
    try {
      const alertId = req.params.id;
      const { resolutionNotes } = req.body;
      const alert = await storage.resolveAlert(alertId, req.user!.id, resolutionNotes);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Unified Notifications API with role-based access control
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const { unread, type, priority } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Get notifications with role-based filtering
      const notifications = await storage.getNotifications(userId, { 
        unread: unread === 'true',
        type: type as string,
        priority: priority as string
      });
      
      res.json(notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Helper function to determine notification targets based on alert and user role
  async function getAlertNotificationTargets(alert: any, triggeredBy: any): Promise<string[]> {
    const targets: string[] = [];
    
    // Always notify the student involved
    targets.push(alert.studentId);
    
    // Notify assigned user if specified
    if (alert.assignedTo) {
      targets.push(alert.assignedTo);
    }
    
    // Role-based notifications
    switch (triggeredBy.role) {
      case "student":
        // When student needs help, notify teachers and coordinators
        const teachersAndCoords = await storage.getUsersByRole("teacher");
        const coordinators = await storage.getUsersByRole("coordinator");
        targets.push(...teachersAndCoords.map(u => u.id));
        targets.push(...coordinators.map(u => u.id));
        break;
      
      case "teacher":
        // When teacher creates alert, notify coordinators and admins
        const coords = await storage.getUsersByRole("coordinator");
        const admins = await storage.getUsersByRole("admin");
        targets.push(...coords.map(u => u.id));
        targets.push(...admins.map(u => u.id));
        break;
      
      case "coordinator":
        // When coordinator creates alert, notify admins
        const adminUsers = await storage.getUsersByRole("admin");
        targets.push(...adminUsers.map(u => u.id));
        break;
    }
    
    // Remove duplicates and the person who triggered the alert
    return Array.from(new Set(targets)).filter(id => id !== triggeredBy.id);
  }

  const httpServer = createServer(app);
  
  // WebSocket server for real-time notifications with session-based authentication
  const wss = new WebSocketServer({ noServer: true });
  
  // Store active WebSocket connections with user info and role-based channels
  const activeConnections = new Map<string, { ws: WebSocket, userId: string, userRole: string, channels: string[] }>();
  
  // Role-based channel management
  const roleChannels = new Map<string, Set<string>>(); // channel -> set of connectionIds
  const userChannels = new Map<string, Set<string>>(); // userId -> set of connectionIds
  
  // Handle WebSocket upgrade with session-based authentication
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url!, 'http://localhost');
    
    // Only handle our WebSocket path
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    
    console.log('WebSocket upgrade requested - checking session authentication');
    
    // Parse session from cookie - simplified for Supabase
    // Skip authentication for now since we're using client-side Supabase auth
    const user = { id: 'demo-user', role: 'student' }; // Mock user for now
    
    console.log(`WebSocket connection accepted for demo user`);
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, user);
    });
  });
  
  wss.on('connection', async (ws: any, req: any, user: any) => {
    console.log(`WebSocket connection established for user: ${user.id} (${user.role})`);
    
    const socketId = Date.now().toString() + '-' + user.id;
    const channels = [
      `user:${user.id}`,
      `role:${user.role}`
    ];
    
    // Add program/course specific channels based on role
    if (user.role === 'coordinator') {
      // Get coordinator's programs and add program channels
      try {
        const programs = await storage.getProgramsByCoordinator(user.id);
        programs.forEach(program => {
          channels.push(`program:${program.id}`);
        });
      } catch (error) {
        console.error('Error fetching coordinator programs:', error);
      }
    } else if (user.role === 'teacher') {
      // Get teacher's courses and add course channels
      try {
        const courses = await storage.getCoursesByTeacher(user.id);
        courses.forEach(course => {
          channels.push(`course:${course.id}`);
          if (course.programId) {
            channels.push(`program:${course.programId}`);
          }
        });
      } catch (error) {
        console.error('Error fetching teacher courses:', error);
      }
    }
    
    // Store connection with role-based channels
    activeConnections.set(socketId, { 
      ws, 
      userId: user.id, 
      userRole: user.role, 
      channels: channels 
    });
    
    // Register connection to role-based channel maps
    channels.forEach(channel => {
      if (!roleChannels.has(channel)) {
        roleChannels.set(channel, new Set());
      }
      roleChannels.get(channel)!.add(socketId);
    });
    
    // Send authentication confirmation with channel info
    ws.send(JSON.stringify({
      type: 'auth_success',
      socketId,
      userId: user.id,
      userRole: user.role,
      channels: channels,
      message: 'WebSocket connected successfully'
    }));
    
    console.log(`WebSocket authenticated for ${user.role}: ${user.id} with channels: ${channels.join(', ')}`);
    
    // Handle incoming messages
    ws.on('message', async (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'ack_notification') {
          // Client acknowledges receiving a notification
          const notificationId = message.notificationId;
          if (notificationId) {
            await storage.markNotificationAsDelivered(notificationId);
          }
        }
        
        if (message.type === 'ping') {
          // Handle ping-pong for connection keep-alive
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        
        if (message.type === 'subscribe_channel') {
          // Allow dynamic channel subscription based on role permissions
          const channel = message.channel;
          if (isChannelAllowedForUser(channel, user)) {
            if (!roleChannels.has(channel)) {
              roleChannels.set(channel, new Set());
            }
            roleChannels.get(channel)!.add(socketId);
            
            ws.send(JSON.stringify({
              type: 'channel_subscribed',
              channel
            }));
          }
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', async () => {
      // Remove connection and clean up channels
      const entries = Array.from(activeConnections.entries());
      for (const [socketId, connection] of entries) {
        if (connection.ws === ws) {
          // Remove from all role channels
          connection.channels.forEach(channel => {
            const channelConnections = roleChannels.get(channel);
            if (channelConnections) {
              channelConnections.delete(socketId);
              if (channelConnections.size === 0) {
                roleChannels.delete(channel);
              }
            }
          });
          
          // Remove from active connections
          activeConnections.delete(socketId);
          console.log(`WebSocket disconnected: ${connection.userId} (${connection.userRole})`);
          break;
        }
      }
    });
  });
  
  // Helper function to check if user can access a specific channel
  function isChannelAllowedForUser(channel: string, user: any): boolean {
    const [channelType, channelId] = channel.split(':');
    
    switch (channelType) {
      case 'user':
        return channelId === user.id;
      case 'role':
        return channelId === user.role;
      case 'program':
        // Check if user has access to this program
        return user.role === 'admin' || user.role === 'coordinator';
      case 'course':
        // Check if user has access to this course
        return user.role === 'admin' || user.role === 'coordinator' || user.role === 'teacher';
      default:
        return false;
    }
  }
  
  // Enhanced notification broadcasting with role-based channels
  function broadcastNotification(notification: any, channels: string[] = []) {
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });
    
    const targetConnections = new Set<string>();
    
    // Add connections from specified channels
    channels.forEach(channel => {
      const channelConnections = roleChannels.get(channel);
      if (channelConnections) {
        channelConnections.forEach(connectionId => {
          targetConnections.add(connectionId);
        });
      }
    });
    
    // If no specific channels, broadcast to user's personal channel
    if (channels.length === 0 && notification.userId) {
      const userChannel = roleChannels.get(`user:${notification.userId}`);
      if (userChannel) {
        userChannel.forEach(connectionId => {
          targetConnections.add(connectionId);
        });
      }
    }
    
    // Send to all target connections
    targetConnections.forEach(connectionId => {
      const connection = activeConnections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(message);
      }
    });
    
    console.log(`Notification broadcast to ${targetConnections.size} connections across ${channels.length} channels`);
  }
  
  function broadcastAlert(alert: any) {
    const message = JSON.stringify({
      type: 'alert',
      data: alert
    });
    
    // Determine broadcast channels based on alert type and scope
    const channels: string[] = [];
    
    // Always add to role-based channels
    channels.push('role:admin', 'role:coordinator', 'role:teacher');
    
    // Add specific program/course channels if available
    if (alert.programId) {
      channels.push(`program:${alert.programId}`);
    }
    if (alert.courseId) {
      channels.push(`course:${alert.courseId}`);
    }
    
    const targetConnections = new Set<string>();
    channels.forEach(channel => {
      const channelConnections = roleChannels.get(channel);
      if (channelConnections) {
        channelConnections.forEach(connectionId => {
          targetConnections.add(connectionId);
        });
      }
    });
    
    targetConnections.forEach(connectionId => {
      const connection = activeConnections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(message);
      }
    });
    
    console.log(`Alert broadcast to ${targetConnections.size} connections`);
  }
  
  // Helper function to generate unique socket IDs
  function generateSocketId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Cleanup inactive sessions periodically
  setInterval(async () => {
    await storage.cleanupInactiveSessions();
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Export broadcast functions for use in other modules
  (global as any).broadcastNotification = broadcastNotification;
  (global as any).broadcastAlert = broadcastAlert;
  
  return httpServer;
}
