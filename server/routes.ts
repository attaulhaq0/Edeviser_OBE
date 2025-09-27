import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertProgramSchema, insertCourseSchema, insertLearningOutcomeSchema,
  insertOutcomeMappingSchema, insertAssignmentSchema, insertStudentSubmissionSchema,
  insertBadgeTemplateSchema, insertLearningModuleSchema,
  type Role
} from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check role permissions
  const requireRole = (roles: Role[]) => (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
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

  // Learning Outcomes routes
  app.get("/api/learning-outcomes", requireAuth, async (req, res) => {
    try {
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
      res.json(outcomes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning outcomes" });
    }
  });

  app.get("/api/learning-outcomes/:id", requireAuth, async (req, res) => {
    try {
      const outcome = await storage.getLearningOutcome(req.params.id);
      if (!outcome) {
        return res.status(404).json({ message: "Learning outcome not found" });
      }
      res.json(outcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning outcome" });
    }
  });

  app.post("/api/learning-outcomes", requireAuth, async (req, res) => {
    try {
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
      const outcome = await storage.updateLearningOutcome(req.params.id, {
        ...req.body,
        lastEditedBy: req.user!.id,
      });
      if (!outcome) {
        return res.status(404).json({ message: "Learning outcome not found" });
      }
      res.json(outcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to update learning outcome" });
    }
  });

  // Outcome Mapping routes
  app.get("/api/outcome-mappings", requireAuth, async (req, res) => {
    try {
      let mappings;
      if (req.query.sourceId) {
        mappings = await storage.getOutcomeMappingsBySource(req.query.sourceId as string);
      } else if (req.query.targetId) {
        mappings = await storage.getOutcomeMappingsByTarget(req.query.targetId as string);
      } else {
        mappings = await storage.getOutcomeMappings();
      }
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch outcome mappings" });
    }
  });

  app.post("/api/outcome-mappings", requireRole(["admin", "coordinator"]), async (req, res) => {
    try {
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

  const httpServer = createServer(app);
  return httpServer;
}
