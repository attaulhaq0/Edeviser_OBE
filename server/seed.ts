import { db } from "./db";
import { storage } from "./storage";
import { users, programs, courses, learningOutcomes, studentProgress, badgeTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  console.log("Starting database seed...");
  
  try {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already seeded. Skipping seed process.");
      return;
    }

    console.log("Creating seed users...");
    
    // Create Admin User
    const adminUser = await storage.createUser({
      username: "admin",
      password: await hashPassword("admin123"),
      email: "admin@edeviser.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      profileImage: null
    });

    // Create Coordinator User
    const coordinatorUser = await storage.createUser({
      username: "coordinator",
      password: await hashPassword("coord123"),
      email: "coordinator@edeviser.com",
      firstName: "Program",
      lastName: "Coordinator",
      role: "coordinator",
      profileImage: null
    });

    // Create Teacher User
    const teacherUser = await storage.createUser({
      username: "teacher",
      password: await hashPassword("teacher123"),
      email: "teacher@edeviser.com",
      firstName: "Course",
      lastName: "Teacher",
      role: "teacher",
      profileImage: null
    });

    // Create Student User
    const studentUser = await storage.createUser({
      username: "student",
      password: await hashPassword("student123"),
      email: "student@edeviser.com",
      firstName: "John",
      lastName: "Student",
      role: "student",
      profileImage: null
    });

    console.log("Creating programs...");

    // Create a Program
    const program = await storage.createProgram({
      name: "Bachelor of Science in Computer Science",
      description: "A comprehensive program focused on software development and computer systems",
      code: "BSCS2024",
      level: "Bachelor's",
      coordinatorId: coordinatorUser.id,
      isActive: true
    });

    console.log("Creating courses...");

    // Create Courses
    const course1 = await storage.createCourse({
      name: "Programming Fundamentals",
      description: "Introduction to programming concepts and software development",
      code: "CS101",
      credits: 3,
      programId: program.id,
      teacherId: teacherUser.id,
      isActive: true
    });

    const course2 = await storage.createCourse({
      name: "Data Structures and Algorithms",
      description: "Study of fundamental data structures and algorithmic problem solving",
      code: "CS201",
      credits: 4,
      programId: program.id,
      teacherId: teacherUser.id,
      isActive: true
    });

    console.log("Creating learning outcomes...");

    // Create Learning Outcomes (ILOs)
    const ilo1 = await storage.createLearningOutcome({
      code: "ILO-1",
      title: "Problem Solving and Critical Thinking",
      description: "Students will demonstrate advanced problem-solving and critical thinking skills",
      type: "ILO",
      bloomsLevel: "analyze",
      programId: program.id,
      ownerId: coordinatorUser.id,
      lastEditedBy: coordinatorUser.id,
      version: 1,
      isActive: true
    });

    const ilo2 = await storage.createLearningOutcome({
      code: "ILO-2", 
      title: "Technical Competency",
      description: "Students will demonstrate technical competency in software development",
      type: "ILO",
      bloomsLevel: "apply",
      programId: program.id,
      ownerId: coordinatorUser.id,
      lastEditedBy: coordinatorUser.id,
      version: 1,
      isActive: true
    });

    // Create PLOs
    const plo1 = await storage.createLearningOutcome({
      code: "PLO-1",
      title: "Programming Proficiency",
      description: "Students will demonstrate proficiency in multiple programming languages",
      type: "PLO",
      bloomsLevel: "create",
      programId: program.id,
      ownerId: coordinatorUser.id,
      lastEditedBy: coordinatorUser.id,
      version: 1,
      isActive: true
    });

    // Create CLOs
    const clo1 = await storage.createLearningOutcome({
      code: "CLO-1",
      title: "Basic Programming Concepts",
      description: "Students will understand and apply basic programming concepts",
      type: "CLO",
      bloomsLevel: "understand",
      programId: program.id,
      courseId: course1.id,
      ownerId: teacherUser.id,
      lastEditedBy: teacherUser.id,
      version: 1,
      isActive: true
    });

    const clo2 = await storage.createLearningOutcome({
      code: "CLO-2",
      title: "Algorithm Implementation",
      description: "Students will implement and analyze fundamental algorithms",
      type: "CLO",
      bloomsLevel: "evaluate",
      programId: program.id,
      courseId: course2.id,
      ownerId: teacherUser.id,
      lastEditedBy: teacherUser.id,
      version: 1,
      isActive: true
    });

    console.log("Creating student progress...");

    // Create Student Progress for gamification
    await storage.createStudentProgress(studentUser.id);

    console.log("Creating badge templates...");

    // Create Badge Templates
    await storage.createBadgeTemplate({
      name: "First Steps",
      description: "Complete your first assignment",
      type: "achievement",
      iconUrl: null,
      requirements: { type: "assignment_completion", count: 1 },
      xpReward: 50,
      isActive: true
    });

    await storage.createBadgeTemplate({
      name: "Programming Master",
      description: "Complete 5 programming assignments",
      type: "mastery",
      iconUrl: null,
      requirements: { type: "assignment_completion", count: 5, category: "programming" },
      xpReward: 200,
      isActive: true
    });

    await storage.createBadgeTemplate({
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      type: "streak",
      iconUrl: null,
      requirements: { type: "daily_streak", count: 7 },
      xpReward: 100,
      isActive: true
    });

    console.log("Database seeded successfully!");
    console.log("Test accounts created:");
    console.log("Admin: admin / admin123");
    console.log("Coordinator: coordinator / coord123");
    console.log("Teacher: teacher / teacher123");
    console.log("Student: student / student123");

  } catch (error) {
    console.error("Failed to seed database:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => {
    console.log("Seed completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
}