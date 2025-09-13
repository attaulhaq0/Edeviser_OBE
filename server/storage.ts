import { 
  users, programs, courses, learningOutcomes, outcomeMappings, assignments, 
  studentSubmissions, studentPerformance, studentProgress, badgeTemplates, 
  studentBadges, learningModules, studentModuleProgress, rubricCriteria,
  type User, type InsertUser, type Program, type InsertProgram, type Course, 
  type InsertCourse, type LearningOutcome, type InsertLearningOutcome,
  type OutcomeMapping, type InsertOutcomeMapping, type Assignment, type InsertAssignment,
  type StudentSubmission, type InsertStudentSubmission, type StudentProgress,
  type BadgeTemplate, type InsertBadgeTemplate, type LearningModule, 
  type InsertLearningModule, type Role
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, count, avg, sum, inArray } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: Role): Promise<User[]>;

  // Program operations
  getPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined>;
  getProgramsByCoordinator(coordinatorId: string): Promise<Program[]>;

  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined>;
  getCoursesByProgram(programId: string): Promise<Course[]>;
  getCoursesByTeacher(teacherId: string): Promise<Course[]>;

  // Learning Outcome operations
  getLearningOutcomes(): Promise<LearningOutcome[]>;
  getLearningOutcome(id: string): Promise<LearningOutcome | undefined>;
  createLearningOutcome(outcome: InsertLearningOutcome): Promise<LearningOutcome>;
  updateLearningOutcome(id: string, updates: Partial<LearningOutcome>): Promise<LearningOutcome | undefined>;
  getLearningOutcomesByType(type: string): Promise<LearningOutcome[]>;
  getLearningOutcomesByProgram(programId: string): Promise<LearningOutcome[]>;
  getLearningOutcomesByCourse(courseId: string): Promise<LearningOutcome[]>;

  // Outcome Mapping operations
  getOutcomeMappings(): Promise<OutcomeMapping[]>;
  createOutcomeMapping(mapping: InsertOutcomeMapping): Promise<OutcomeMapping>;
  getOutcomeMappingsBySource(sourceId: string): Promise<OutcomeMapping[]>;
  getOutcomeMappingsByTarget(targetId: string): Promise<OutcomeMapping[]>;

  // Assignment operations
  getAssignments(): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | undefined>;
  getAssignmentsByCourse(courseId: string): Promise<Assignment[]>;

  // Student Submission operations
  getStudentSubmissions(): Promise<StudentSubmission[]>;
  getStudentSubmission(id: string): Promise<StudentSubmission | undefined>;
  createStudentSubmission(submission: InsertStudentSubmission): Promise<StudentSubmission>;
  updateStudentSubmission(id: string, updates: Partial<StudentSubmission>): Promise<StudentSubmission | undefined>;
  getSubmissionsByStudent(studentId: string): Promise<StudentSubmission[]>;
  getSubmissionsByAssignment(assignmentId: string): Promise<StudentSubmission[]>;

  // Student Progress operations
  getStudentProgress(studentId: string): Promise<StudentProgress | undefined>;
  createStudentProgress(studentId: string): Promise<StudentProgress>;
  updateStudentProgress(studentId: string, updates: Partial<StudentProgress>): Promise<StudentProgress | undefined>;

  // Badge operations
  getBadgeTemplates(): Promise<BadgeTemplate[]>;
  getBadgeTemplate(id: string): Promise<BadgeTemplate | undefined>;
  createBadgeTemplate(template: InsertBadgeTemplate): Promise<BadgeTemplate>;

  // Learning Module operations
  getLearningModules(): Promise<LearningModule[]>;
  getLearningModule(id: string): Promise<LearningModule | undefined>;
  createLearningModule(module: InsertLearningModule): Promise<LearningModule>;
  getLearningModulesByCourse(courseId: string): Promise<LearningModule[]>;

  // Analytics operations
  getStudentPerformanceByOutcome(outcomeId: string): Promise<any[]>;
  getProgramAnalytics(programId: string): Promise<any>;
  getBloomsTaxonomyDistribution(programId?: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Program operations
  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs).where(eq(programs.isActive, true));
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program || undefined;
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const [program] = await db
      .insert(programs)
      .values(insertProgram)
      .returning();
    return program;
  }

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined> {
    const [program] = await db
      .update(programs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(programs.id, id))
      .returning();
    return program || undefined;
  }

  async getProgramsByCoordinator(coordinatorId: string): Promise<Program[]> {
    return await db
      .select()
      .from(programs)
      .where(and(eq(programs.coordinatorId, coordinatorId), eq(programs.isActive, true)));
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).where(eq(courses.isActive, true));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values(insertCourse)
      .returning();
    return course;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course || undefined;
  }

  async getCoursesByProgram(programId: string): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(and(eq(courses.programId, programId), eq(courses.isActive, true)));
  }

  async getCoursesByTeacher(teacherId: string): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(and(eq(courses.teacherId, teacherId), eq(courses.isActive, true)));
  }

  // Learning Outcome operations
  async getLearningOutcomes(): Promise<LearningOutcome[]> {
    return await db.select().from(learningOutcomes).where(eq(learningOutcomes.isActive, true));
  }

  async getLearningOutcome(id: string): Promise<LearningOutcome | undefined> {
    const [outcome] = await db.select().from(learningOutcomes).where(eq(learningOutcomes.id, id));
    return outcome || undefined;
  }

  async createLearningOutcome(insertOutcome: InsertLearningOutcome): Promise<LearningOutcome> {
    const [outcome] = await db
      .insert(learningOutcomes)
      .values(insertOutcome)
      .returning();
    return outcome;
  }

  async updateLearningOutcome(id: string, updates: Partial<LearningOutcome>): Promise<LearningOutcome | undefined> {
    const [outcome] = await db
      .update(learningOutcomes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(learningOutcomes.id, id))
      .returning();
    return outcome || undefined;
  }

  async getLearningOutcomesByType(type: string): Promise<LearningOutcome[]> {
    return await db
      .select()
      .from(learningOutcomes)
      .where(and(eq(learningOutcomes.type, type as any), eq(learningOutcomes.isActive, true)));
  }

  async getLearningOutcomesByProgram(programId: string): Promise<LearningOutcome[]> {
    return await db
      .select()
      .from(learningOutcomes)
      .where(and(eq(learningOutcomes.programId, programId), eq(learningOutcomes.isActive, true)));
  }

  async getLearningOutcomesByCourse(courseId: string): Promise<LearningOutcome[]> {
    return await db
      .select()
      .from(learningOutcomes)
      .where(and(eq(learningOutcomes.courseId, courseId), eq(learningOutcomes.isActive, true)));
  }

  // Outcome Mapping operations
  async getOutcomeMappings(): Promise<OutcomeMapping[]> {
    return await db.select().from(outcomeMappings);
  }

  async createOutcomeMapping(insertMapping: InsertOutcomeMapping): Promise<OutcomeMapping> {
    const [mapping] = await db
      .insert(outcomeMappings)
      .values(insertMapping)
      .returning();
    return mapping;
  }

  async getOutcomeMappingsBySource(sourceId: string): Promise<OutcomeMapping[]> {
    return await db
      .select()
      .from(outcomeMappings)
      .where(eq(outcomeMappings.sourceOutcomeId, sourceId));
  }

  async getOutcomeMappingsByTarget(targetId: string): Promise<OutcomeMapping[]> {
    return await db
      .select()
      .from(outcomeMappings)
      .where(eq(outcomeMappings.targetOutcomeId, targetId));
  }

  // Assignment operations
  async getAssignments(): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.isActive, true));
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment || undefined;
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db
      .insert(assignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | undefined> {
    const [assignment] = await db
      .update(assignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
    return await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.courseId, courseId), eq(assignments.isActive, true)));
  }

  // Student Submission operations
  async getStudentSubmissions(): Promise<StudentSubmission[]> {
    return await db.select().from(studentSubmissions);
  }

  async getStudentSubmission(id: string): Promise<StudentSubmission | undefined> {
    const [submission] = await db.select().from(studentSubmissions).where(eq(studentSubmissions.id, id));
    return submission || undefined;
  }

  async createStudentSubmission(insertSubmission: InsertStudentSubmission): Promise<StudentSubmission> {
    const [submission] = await db
      .insert(studentSubmissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  async updateStudentSubmission(id: string, updates: Partial<StudentSubmission>): Promise<StudentSubmission | undefined> {
    const [submission] = await db
      .update(studentSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentSubmissions.id, id))
      .returning();
    return submission || undefined;
  }

  async getSubmissionsByStudent(studentId: string): Promise<StudentSubmission[]> {
    return await db
      .select()
      .from(studentSubmissions)
      .where(eq(studentSubmissions.studentId, studentId));
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<StudentSubmission[]> {
    return await db
      .select()
      .from(studentSubmissions)
      .where(eq(studentSubmissions.assignmentId, assignmentId));
  }

  // Student Progress operations
  async getStudentProgress(studentId: string): Promise<StudentProgress | undefined> {
    const [progress] = await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));
    return progress || undefined;
  }

  async createStudentProgress(studentId: string): Promise<StudentProgress> {
    const [progress] = await db
      .insert(studentProgress)
      .values({ studentId })
      .returning();
    return progress;
  }

  async updateStudentProgress(studentId: string, updates: Partial<StudentProgress>): Promise<StudentProgress | undefined> {
    const [progress] = await db
      .update(studentProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentProgress.studentId, studentId))
      .returning();
    return progress || undefined;
  }

  // Badge operations
  async getBadgeTemplates(): Promise<BadgeTemplate[]> {
    return await db.select().from(badgeTemplates).where(eq(badgeTemplates.isActive, true));
  }

  async getBadgeTemplate(id: string): Promise<BadgeTemplate | undefined> {
    const [template] = await db.select().from(badgeTemplates).where(eq(badgeTemplates.id, id));
    return template || undefined;
  }

  async createBadgeTemplate(insertTemplate: InsertBadgeTemplate): Promise<BadgeTemplate> {
    const [template] = await db
      .insert(badgeTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  // Learning Module operations
  async getLearningModules(): Promise<LearningModule[]> {
    return await db.select().from(learningModules);
  }

  async getLearningModule(id: string): Promise<LearningModule | undefined> {
    const [module] = await db.select().from(learningModules).where(eq(learningModules.id, id));
    return module || undefined;
  }

  async createLearningModule(insertModule: InsertLearningModule): Promise<LearningModule> {
    const [module] = await db
      .insert(learningModules)
      .values(insertModule)
      .returning();
    return module;
  }

  async getLearningModulesByCourse(courseId: string): Promise<LearningModule[]> {
    return await db
      .select()
      .from(learningModules)
      .where(eq(learningModules.courseId, courseId))
      .orderBy(asc(learningModules.order));
  }

  // Analytics operations
  async getStudentPerformanceByOutcome(outcomeId: string): Promise<any[]> {
    return await db
      .select({
        studentId: studentPerformance.studentId,
        averageScore: studentPerformance.averageScore,
        totalSubmissions: studentPerformance.totalSubmissions,
      })
      .from(studentPerformance)
      .where(eq(studentPerformance.outcomeId, outcomeId));
  }

  async getProgramAnalytics(programId: string): Promise<any> {
    const courseCount = await db
      .select({ count: count() })
      .from(courses)
      .where(and(eq(courses.programId, programId), eq(courses.isActive, true)));

    const outcomeCount = await db
      .select({ count: count() })
      .from(learningOutcomes)
      .where(and(eq(learningOutcomes.programId, programId), eq(learningOutcomes.isActive, true)));

    return {
      totalCourses: courseCount[0]?.count || 0,
      totalOutcomes: outcomeCount[0]?.count || 0,
    };
  }

  async getBloomsTaxonomyDistribution(programId?: string): Promise<any[]> {
    const whereConditions = [eq(learningOutcomes.isActive, true)];
    if (programId) {
      whereConditions.push(eq(learningOutcomes.programId, programId));
    }

    return await db
      .select({
        level: learningOutcomes.bloomsLevel,
        count: count(),
      })
      .from(learningOutcomes)
      .where(and(...whereConditions))
      .groupBy(learningOutcomes.bloomsLevel);
  }
}

export const storage = new DatabaseStorage();
