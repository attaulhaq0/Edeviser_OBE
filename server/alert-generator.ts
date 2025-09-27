import { storage } from "./storage";
import type { InsertAcademicAlerts, AlertType, AlertPriority } from "@shared/schema";

export class AlertGenerator {
  
  // Idempotency window: prevent duplicate alerts of same type for same student within 24 hours
  private static async hasRecentAlert(studentId: string, alertType: AlertType, hours: number = 24): Promise<boolean> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const recentAlerts = await storage.getAlertsByStudent(studentId);
      
      return recentAlerts.some(alert => 
        alert.alertType === alertType && 
        new Date(alert.createdAt) > cutoffTime &&
        alert.status !== 'dismissed'
      );
    } catch (error) {
      console.error('Error checking for recent alerts:', error);
      return false;
    }
  }

  // Assign alert to appropriate staff member based on role hierarchy
  private static async getAssignedStaffMember(alertType: AlertType, priority: AlertPriority): Promise<string | null> {
    try {
      let targetRoles: string[] = [];
      
      // Define role assignment based on alert type and priority
      switch (alertType) {
        case 'missed_deadline':
          targetRoles = ['teacher', 'coordinator', 'admin'];
          break;
        case 'low_performance':
        case 'help_request':
          targetRoles = ['teacher', 'coordinator'];
          break;
        case 'inactivity':
        case 'streak_break':
          targetRoles = ['teacher'];
          break;
        case 'achievement':
          targetRoles = ['coordinator', 'admin'];
          break;
        default:
          targetRoles = ['teacher'];
      }
      
      // Escalate to higher roles for critical priority
      if (priority === 'critical') {
        targetRoles = ['teacher', 'coordinator', 'admin'];
      }

      // Get users by priority order and assign to first available
      for (const role of targetRoles) {
        const users = await storage.getUsersByRole(role as any);
        const activeUsers = users.filter(u => u.isActive);
        
        if (activeUsers.length > 0) {
          // Simple round-robin assignment (in production, could use workload balancing)
          const assignedUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
          return assignedUser.id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting assigned staff member:', error);
      return null;
    }
  }
  
  // Generate low performance alert when student scores are consistently low
  static async checkLowPerformanceAlert(studentId: string) {
    try {
      // Get student's recent performance data
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') return;

      // Check for recent alerts to prevent duplicates
      if (await this.hasRecentAlert(studentId, 'low_performance')) {
        return; // Skip if recent alert exists
      }

      // Check if student has performance issues (simulated logic)
      const shouldTriggerAlert = Math.random() < 0.3; // 30% chance for demo
      
      if (shouldTriggerAlert) {
        const assignedTo = await this.getAssignedStaffMember('low_performance', 'high');
        const alert: InsertAcademicAlerts = {
          studentId,
          alertType: 'low_performance' as AlertType,
          priority: 'high' as AlertPriority,
          title: 'Low Performance Alert',
          message: `Student ${student.firstName} ${student.lastName} is showing signs of low performance in recent assignments. Immediate intervention may be required.`,
          contextData: {
            averageScore: 45,
            recentAssignments: 3,
            concernLevel: 'high'
          },
          assignedTo,
        };

        const createdAlert = await storage.createAcademicAlert(alert);
        await this.notifyRelevantStaff(createdAlert, student);
        
        console.log(`Low performance alert generated for student ${studentId}`);
        return createdAlert;
      }
    } catch (error) {
      console.error('Error generating low performance alert:', error);
    }
  }

  // Generate inactivity alert when student hasn't logged in for a while
  static async checkInactivityAlert(studentId: string) {
    try {
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') return;

      // Simulate inactivity check (in real app, check last login date)
      const shouldTriggerAlert = Math.random() < 0.2; // 20% chance for demo
      
      if (shouldTriggerAlert) {
        const alert: InsertAcademicAlerts = {
          studentId,
          alertType: 'inactivity' as AlertType,
          priority: 'medium' as AlertPriority,
          title: 'Student Inactivity Alert',
          message: `Student ${student.firstName} ${student.lastName} has not been active for several days. Consider reaching out to check on their progress.`,
          contextData: {
            lastLoginDays: 7,
            missedActivities: 2,
            concernLevel: 'medium'
          },
          assignedTo: null,
        };

        const createdAlert = await storage.createAcademicAlert(alert);
        await this.notifyRelevantStaff(createdAlert, student);
        
        console.log(`Inactivity alert generated for student ${studentId}`);
        return createdAlert;
      }
    } catch (error) {
      console.error('Error generating inactivity alert:', error);
    }
  }

  // Generate help request alert when student explicitly requests help
  static async generateHelpRequestAlert(studentId: string, helpMessage: string) {
    try {
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') return;

      const alert: InsertAcademicAlerts = {
        studentId,
        alertType: 'help_request' as AlertType,
        priority: 'high' as AlertPriority,
        title: 'Student Help Request',
        message: `${student.firstName} ${student.lastName} has requested academic assistance: "${helpMessage}"`,
        contextData: {
          requestType: 'help_request',
          requestMessage: helpMessage,
          urgency: 'high'
        },
        triggeredBy: studentId,
        assignedTo: null,
      };

      const createdAlert = await storage.createAcademicAlert(alert);
      await this.notifyRelevantStaff(createdAlert, student);
      
      console.log(`Help request alert generated for student ${studentId}`);
      return createdAlert;
    } catch (error) {
      console.error('Error generating help request alert:', error);
    }
  }

  // Generate achievement alert for positive reinforcement
  static async generateAchievementAlert(studentId: string, achievement: string) {
    try {
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') return;

      const alert: InsertAcademicAlerts = {
        studentId,
        alertType: 'achievement' as AlertType,
        priority: 'low' as AlertPriority,
        title: 'Student Achievement',
        message: `Congratulations! ${student.firstName} ${student.lastName} has achieved: ${achievement}`,
        contextData: {
          achievementType: achievement,
          celebrationType: 'academic_milestone'
        },
        triggeredBy: studentId,
        assignedTo: null,
      };

      const createdAlert = await storage.createAcademicAlert(alert);
      await this.notifyRelevantStaff(createdAlert, student);
      
      console.log(`Achievement alert generated for student ${studentId}`);
      return createdAlert;
    } catch (error) {
      console.error('Error generating achievement alert:', error);
    }
  }

  // Generate streak break alert when study streak is broken
  static async checkStreakBreakAlert(studentId: string) {
    try {
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') return;

      const streaks = await storage.getStudyStreaks(studentId);
      
      // Check if streak was broken (simulated logic)
      const shouldTriggerAlert = streaks && Math.random() < 0.15; // 15% chance for demo
      
      if (shouldTriggerAlert) {
        const alert: InsertAcademicAlerts = {
          studentId,
          alertType: 'streak_break' as AlertType,
          priority: 'medium' as AlertPriority,
          title: 'Study Streak Broken',
          message: `${student.firstName} ${student.lastName}'s study streak has been broken. Consider sending motivation or checking if they need support.`,
          contextData: {
            previousStreak: streaks?.currentStreak || 0,
            streakType: 'daily_study'
          },
          assignedTo: null,
        };

        const createdAlert = await storage.createAcademicAlert(alert);
        await this.notifyRelevantStaff(createdAlert, student);
        
        console.log(`Streak break alert generated for student ${studentId}`);
        return createdAlert;
      }
    } catch (error) {
      console.error('Error generating streak break alert:', error);
    }
  }

  // Generate missed deadline alert
  static async checkMissedDeadlineAlert(studentId: string, assignmentTitle: string) {
    try {
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') return;

      const alert: InsertAcademicAlerts = {
        studentId,
        alertType: 'missed_deadline' as AlertType,
        priority: 'critical' as AlertPriority,
        title: 'Missed Assignment Deadline',
        message: `${student.firstName} ${student.lastName} has missed the deadline for: ${assignmentTitle}. Immediate follow-up required.`,
        contextData: {
          assignmentTitle,
          deadlineType: 'assignment_submission',
          urgency: 'critical'
        },
        assignedTo: null,
      };

      const createdAlert = await storage.createAcademicAlert(alert);
      await this.notifyRelevantStaff(createdAlert, student);
      
      console.log(`Missed deadline alert generated for student ${studentId}`);
      return createdAlert;
    } catch (error) {
      console.error('Error generating missed deadline alert:', error);
    }
  }

  // Notify relevant staff based on alert type and organizational hierarchy
  private static async notifyRelevantStaff(alert: any, student: any) {
    try {
      // Get notification targets (teachers, coordinators, admins)
      const teachers = await storage.getUsersByRole('teacher');
      const coordinators = await storage.getUsersByRole('coordinator');
      const admins = await storage.getUsersByRole('admin');

      const notificationTargets: string[] = [];
      
      // Include student themselves for certain alert types
      if (['achievement', 'streak_break'].includes(alert.alertType)) {
        notificationTargets.push(student.id);
      }

      // Add relevant staff based on alert priority
      switch (alert.priority) {
        case 'critical':
          // Critical alerts go to everyone
          notificationTargets.push(
            ...teachers.map(t => t.id),
            ...coordinators.map(c => c.id),
            ...admins.map(a => a.id)
          );
          break;
        
        case 'high':
          // High priority alerts go to teachers and coordinators
          notificationTargets.push(
            ...teachers.map(t => t.id),
            ...coordinators.map(c => c.id)
          );
          break;
        
        case 'medium':
          // Medium priority alerts go to teachers
          notificationTargets.push(...teachers.map(t => t.id));
          break;
        
        case 'low':
          // Low priority alerts (achievements) go to coordinators and admins
          if (alert.alertType === 'achievement') {
            notificationTargets.push(
              ...coordinators.map(c => c.id),
              ...admins.map(a => a.id)
            );
          }
          break;
      }

      // Create notifications in database
      for (const targetUserId of Array.from(new Set(notificationTargets))) {
        await storage.createAlertNotification({
          alertId: alert.id,
          userId: targetUserId,
          notificationType: 'in_app',
        });
      }

      // Broadcast real-time notification if available
      if (typeof (global as any).broadcastNotification === 'function') {
        (global as any).broadcastNotification(Array.from(new Set(notificationTargets)), {
          id: alert.id,
          type: 'new_alert',
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          alertType: alert.alertType,
          createdAt: alert.createdAt,
        });
      }

    } catch (error) {
      console.error('Error notifying relevant staff:', error);
    }
  }

  // Periodic check for all types of alerts (to be called by a scheduler)
  static async runPeriodicAlertChecks() {
    try {
      console.log('Running periodic alert checks...');
      
      // Get all students
      const students = await storage.getUsersByRole('student');
      
      // Run alert checks for each student
      for (const student of students) {
        // Run different types of checks with some randomization
        await this.checkLowPerformanceAlert(student.id);
        await this.checkInactivityAlert(student.id);
        await this.checkStreakBreakAlert(student.id);
        
        // Simulate some positive events too
        if (Math.random() < 0.1) { // 10% chance
          await this.generateAchievementAlert(student.id, 'Completed all weekly assignments');
        }
      }
      
      console.log('Periodic alert checks completed');
    } catch (error) {
      console.error('Error running periodic alert checks:', error);
    }
  }
}

// Start periodic checks every 5 minutes (for demo purposes)
// In production, this would be handled by a proper job scheduler
setInterval(() => {
  AlertGenerator.runPeriodicAlertChecks();
}, 5 * 60 * 1000); // 5 minutes

console.log('Alert generator initialized with periodic checks every 5 minutes');