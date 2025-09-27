import { 
  users, programs, courses, learningOutcomes, outcomeMappings, assignments, 
  studentSubmissions, studentPerformance, studentProgress, badgeTemplates, 
  studentBadges, learningModules, studentModuleProgress, rubricCriteria,
  studentOnboarding, studentMascot, studyStreaks, studyBuddyInteractions,
  academicAlerts, alertNotifications, userSessions,
  type User, type InsertUser, type Program, type InsertProgram, type Course, 
  type InsertCourse, type LearningOutcome, type InsertLearningOutcome,
  type OutcomeMapping, type InsertOutcomeMapping, type Assignment, type InsertAssignment,
  type StudentSubmission, type InsertStudentSubmission, type StudentProgress,
  type BadgeTemplate, type InsertBadgeTemplate, type LearningModule, 
  type InsertLearningModule, type Role, type StudentOnboarding, type InsertStudentOnboarding,
  type StudentMascot, type InsertStudentMascot, type StudyStreaks, type InsertStudyStreaks,
  type StudyBuddyInteractions, type InsertStudyBuddyInteractions,
  type AcademicAlerts, type InsertAcademicAlerts, type AlertNotifications, 
  type InsertAlertNotifications, type UserSessions, type InsertUserSessions,
  type AlertType, type AlertPriority, type AlertStatus
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
  getAllUsers(): Promise<User[]>;
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

  // Student Onboarding operations
  getStudentOnboarding(studentId: string): Promise<StudentOnboarding | undefined>;
  createStudentOnboarding(data: InsertStudentOnboarding & { studentId: string }): Promise<StudentOnboarding>;
  updateStudentOnboarding(studentId: string, updates: Partial<StudentOnboarding>): Promise<StudentOnboarding | undefined>;

  // Student Mascot operations
  getStudentMascot(studentId: string): Promise<StudentMascot | undefined>;
  createStudentMascot(data: InsertStudentMascot & { studentId: string }): Promise<StudentMascot>;
  updateStudentMascot(studentId: string, updates: Partial<StudentMascot>): Promise<StudentMascot | undefined>;

  // Study Streaks operations
  getStudyStreaks(studentId: string): Promise<StudyStreaks | undefined>;
  createStudyStreaks(streaks: InsertStudyStreaks): Promise<StudyStreaks>;
  updateStudyStreaks(studentId: string, updates: Partial<StudyStreaks>): Promise<StudyStreaks | undefined>;

  // Study Buddy Interactions operations
  getStudyBuddyInteractions(studentId: string): Promise<StudyBuddyInteractions[]>;
  createStudyBuddyInteraction(interaction: InsertStudyBuddyInteractions): Promise<StudyBuddyInteractions>;
  markInteractionAsRead(interactionId: string): Promise<StudyBuddyInteractions | undefined>;
  getUnreadInteractions(studentId: string): Promise<StudyBuddyInteractions[]>;

  // Academic Alerts operations
  getAcademicAlerts(): Promise<AcademicAlerts[]>;
  getAcademicAlert(id: string): Promise<AcademicAlerts | undefined>;
  createAcademicAlert(alert: InsertAcademicAlerts): Promise<AcademicAlerts>;
  updateAcademicAlert(id: string, updates: Partial<AcademicAlerts>): Promise<AcademicAlerts | undefined>;
  getAlertsByStudent(studentId: string): Promise<AcademicAlerts[]>;
  getAlertsByAssignedUser(userId: string): Promise<AcademicAlerts[]>;
  getAlertsByStatus(status: AlertStatus): Promise<AcademicAlerts[]>;
  getAlertsByType(type: AlertType): Promise<AcademicAlerts[]>;
  acknowledgeAlert(alertId: string, userId: string): Promise<AcademicAlerts | undefined>;
  resolveAlert(alertId: string, userId: string, resolutionNotes?: string): Promise<AcademicAlerts | undefined>;

  // Alert Notifications operations
  getAlertNotifications(userId: string): Promise<AlertNotifications[]>;
  createAlertNotification(notification: InsertAlertNotifications): Promise<AlertNotifications>;
  markNotificationAsRead(notificationId: string): Promise<AlertNotifications | undefined>;
  markNotificationAsDelivered(notificationId: string): Promise<AlertNotifications | undefined>;
  getUnreadNotifications(userId: string): Promise<AlertNotifications[]>;

  // User Sessions operations (for WebSocket management)
  getUserSession(socketId: string): Promise<UserSessions | undefined>;
  createUserSession(session: InsertUserSessions): Promise<UserSessions>;
  updateUserSession(socketId: string, updates: Partial<UserSessions>): Promise<UserSessions | undefined>;
  removeUserSession(socketId: string): Promise<void>;
  getUserActiveSessions(userId: string): Promise<UserSessions[]>;
  cleanupInactiveSessions(): Promise<void>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
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

  // Student Onboarding implementations
  async getStudentOnboarding(studentId: string): Promise<StudentOnboarding | undefined> {
    const [onboarding] = await db
      .select()
      .from(studentOnboarding)
      .where(eq(studentOnboarding.studentId, studentId));
    return onboarding || undefined;
  }

  async createStudentOnboarding(data: InsertStudentOnboarding & { studentId: string }): Promise<StudentOnboarding> {
    const [onboarding] = await db
      .insert(studentOnboarding)
      .values(data)
      .returning();
    return onboarding;
  }

  async updateStudentOnboarding(studentId: string, updates: Partial<StudentOnboarding>): Promise<StudentOnboarding | undefined> {
    const [onboarding] = await db
      .update(studentOnboarding)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentOnboarding.studentId, studentId))
      .returning();
    return onboarding || undefined;
  }

  // Student Mascot implementations
  async getStudentMascot(studentId: string): Promise<StudentMascot | undefined> {
    const [mascot] = await db
      .select()
      .from(studentMascot)
      .where(eq(studentMascot.studentId, studentId));
    return mascot || undefined;
  }

  async createStudentMascot(data: InsertStudentMascot & { studentId: string }): Promise<StudentMascot> {
    const [mascot] = await db
      .insert(studentMascot)
      .values(data)
      .returning();
    return mascot;
  }

  async updateStudentMascot(studentId: string, updates: Partial<StudentMascot>): Promise<StudentMascot | undefined> {
    const [mascot] = await db
      .update(studentMascot)
      .set(updates)
      .where(eq(studentMascot.studentId, studentId))
      .returning();
    return mascot || undefined;
  }

  // Study Streaks implementations
  async getStudyStreaks(studentId: string): Promise<StudyStreaks | undefined> {
    const [streaks] = await db
      .select()
      .from(studyStreaks)
      .where(eq(studyStreaks.studentId, studentId));
    return streaks || undefined;
  }

  async createStudyStreaks(insertStreaks: InsertStudyStreaks): Promise<StudyStreaks> {
    const [streaks] = await db
      .insert(studyStreaks)
      .values(insertStreaks)
      .returning();
    return streaks;
  }

  async updateStudyStreaks(studentId: string, updates: Partial<StudyStreaks>): Promise<StudyStreaks | undefined> {
    const [streaks] = await db
      .update(studyStreaks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studyStreaks.studentId, studentId))
      .returning();
    return streaks || undefined;
  }

  // Study Buddy Interactions implementations
  async getStudyBuddyInteractions(studentId: string): Promise<StudyBuddyInteractions[]> {
    const interactions = await db
      .select()
      .from(studyBuddyInteractions)
      .where(eq(studyBuddyInteractions.studentId, studentId))
      .orderBy(desc(studyBuddyInteractions.createdAt));
    return interactions;
  }

  async createStudyBuddyInteraction(insertInteraction: InsertStudyBuddyInteractions): Promise<StudyBuddyInteractions> {
    const [interaction] = await db
      .insert(studyBuddyInteractions)
      .values(insertInteraction)
      .returning();
    return interaction;
  }

  async markInteractionAsRead(interactionId: string): Promise<StudyBuddyInteractions | undefined> {
    const [interaction] = await db
      .update(studyBuddyInteractions)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(studyBuddyInteractions.id, interactionId))
      .returning();
    return interaction || undefined;
  }

  async getUnreadInteractions(studentId: string): Promise<StudyBuddyInteractions[]> {
    const interactions = await db
      .select()
      .from(studyBuddyInteractions)
      .where(
        and(
          eq(studyBuddyInteractions.studentId, studentId),
          eq(studyBuddyInteractions.isRead, false)
        )
      )
      .orderBy(desc(studyBuddyInteractions.createdAt));
    return interactions;
  }

  // Academic Alerts implementations
  async getAcademicAlerts(): Promise<AcademicAlerts[]> {
    const alerts = await db
      .select()
      .from(academicAlerts)
      .orderBy(desc(academicAlerts.createdAt));
    return alerts;
  }

  async getAcademicAlert(id: string): Promise<AcademicAlerts | undefined> {
    const [alert] = await db
      .select()
      .from(academicAlerts)
      .where(eq(academicAlerts.id, id));
    return alert || undefined;
  }

  async createAcademicAlert(insertAlert: InsertAcademicAlerts): Promise<AcademicAlerts> {
    const [alert] = await db
      .insert(academicAlerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async updateAcademicAlert(id: string, updates: Partial<AcademicAlerts>): Promise<AcademicAlerts | undefined> {
    const [alert] = await db
      .update(academicAlerts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(academicAlerts.id, id))
      .returning();
    return alert || undefined;
  }

  async getAlertsByStudent(studentId: string): Promise<AcademicAlerts[]> {
    const alerts = await db
      .select()
      .from(academicAlerts)
      .where(eq(academicAlerts.studentId, studentId))
      .orderBy(desc(academicAlerts.createdAt));
    return alerts;
  }

  async getAlertsByAssignedUser(userId: string): Promise<AcademicAlerts[]> {
    const alerts = await db
      .select()
      .from(academicAlerts)
      .where(eq(academicAlerts.assignedTo, userId))
      .orderBy(desc(academicAlerts.createdAt));
    return alerts;
  }

  async getAlertsByStatus(status: AlertStatus): Promise<AcademicAlerts[]> {
    const alerts = await db
      .select()
      .from(academicAlerts)
      .where(eq(academicAlerts.status, status))
      .orderBy(desc(academicAlerts.createdAt));
    return alerts;
  }

  async getAlertsByType(type: AlertType): Promise<AcademicAlerts[]> {
    const alerts = await db
      .select()
      .from(academicAlerts)
      .where(eq(academicAlerts.alertType, type))
      .orderBy(desc(academicAlerts.createdAt));
    return alerts;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<AcademicAlerts | undefined> {
    const [alert] = await db
      .update(academicAlerts)
      .set({ 
        status: 'acknowledged',
        acknowledgedBy: userId, 
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(academicAlerts.id, alertId))
      .returning();
    return alert || undefined;
  }

  async resolveAlert(alertId: string, userId: string, resolutionNotes?: string): Promise<AcademicAlerts | undefined> {
    const [alert] = await db
      .update(academicAlerts)
      .set({ 
        status: 'resolved',
        resolvedBy: userId, 
        resolvedAt: new Date(),
        resolutionNotes,
        updatedAt: new Date()
      })
      .where(eq(academicAlerts.id, alertId))
      .returning();
    return alert || undefined;
  }

  // Alert Notifications implementations
  async getAlertNotifications(userId: string): Promise<AlertNotifications[]> {
    const notifications = await db
      .select()
      .from(alertNotifications)
      .where(eq(alertNotifications.userId, userId))
      .orderBy(desc(alertNotifications.createdAt));
    return notifications;
  }

  async createAlertNotification(insertNotification: InsertAlertNotifications): Promise<AlertNotifications> {
    const [notification] = await db
      .insert(alertNotifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(notificationId: string): Promise<AlertNotifications | undefined> {
    const [notification] = await db
      .update(alertNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(alertNotifications.id, notificationId))
      .returning();
    return notification || undefined;
  }

  async markNotificationAsDelivered(notificationId: string): Promise<AlertNotifications | undefined> {
    const [notification] = await db
      .update(alertNotifications)
      .set({ isDelivered: true, deliveredAt: new Date() })
      .where(eq(alertNotifications.id, notificationId))
      .returning();
    return notification || undefined;
  }

  async getUnreadNotifications(userId: string): Promise<AlertNotifications[]> {
    const notifications = await db
      .select()
      .from(alertNotifications)
      .where(
        and(
          eq(alertNotifications.userId, userId),
          eq(alertNotifications.isRead, false)
        )
      )
      .orderBy(desc(alertNotifications.createdAt));
    return notifications;
  }

  // User Sessions implementations (for WebSocket management)
  async getUserSession(socketId: string): Promise<UserSessions | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.socketId, socketId));
    return session || undefined;
  }

  async createUserSession(insertSession: InsertUserSessions): Promise<UserSessions> {
    const [session] = await db
      .insert(userSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateUserSession(socketId: string, updates: Partial<UserSessions>): Promise<UserSessions | undefined> {
    const [session] = await db
      .update(userSessions)
      .set({ ...updates, lastActivity: new Date() })
      .where(eq(userSessions.socketId, socketId))
      .returning();
    return session || undefined;
  }

  async removeUserSession(socketId: string): Promise<void> {
    await db
      .delete(userSessions)
      .where(eq(userSessions.socketId, socketId));
  }

  async getUserActiveSessions(userId: string): Promise<UserSessions[]> {
    const sessions = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        )
      )
      .orderBy(desc(userSessions.lastActivity));
    return sessions;
  }

  async cleanupInactiveSessions(): Promise<void> {
    // Remove sessions inactive for more than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .delete(userSessions)
      .where(
        or(
          eq(userSessions.isActive, false),
          // Note: SQL comparison for timestamp - convert to ISO string for comparison
          eq(userSessions.lastActivity, cutoffTime)
        )
      );
  }
}

export const storage = new DatabaseStorage();
