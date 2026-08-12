// Student prototype source of truth. Frontend-only; safe deterministic demo data.
window.EDEVISER_STUDENT = Object.freeze({
  student: { name: 'Sarah Ahmed', level: 4, xp: 750, xpGoal: 1000, streak: 12, dailyGoal: 65, dailyGoalXp: '390 / 600 XP' },
  course: { code: 'CS301', name: 'Database Design', progress: 72, module: '5 of 8' },
  courses: [
    ['Database Design', 72], ['Web Development', 45], ['AI Fundamentals', 88],
    ['Software Engineering', 30], ['Statistics', 58]
  ],
  focus: { outcome: 'Normalization · CLO 3', mastery: 62, interpretation: 'Developing', evidence: 'Medium confidence' },
  path: { level: 'Level 3 — Apply', mastery: 65, concepts: '2 / 5', improvement: '+18%' },
  assignment: { title: 'Assignment 3', label: 'Database Assignment 3', task: 'Normalize a Schema', reward: '+25 XP', effort: '~30 min', due: 'Friday', dueLabel: 'Due in 2 days' },
  review: { due: 5 },
  focusWindow: '25 minutes',
  support: { tutor: 'Guided · L2', permission: 'A1 · Suggest', handoff: 'Approval required' }
});

// Admin / institution prototype source of truth. Frontend-only, offline, and
// deterministic for the August 2026 investor scene.
window.EDEVISER_ADMIN = Object.freeze({
  demo: { dateLabel: 'August 11, 2026', period: 'Summer 2026', freshness: 'Current demo snapshot' },
  institution: {
    name: 'Gulf Academy', adminName: 'Institution Admin', activeLearners: 1240,
    weeklyActive: 92, averageMastery: 72, retentionReview: 38,
    departments: 6, programs: 14, activeCourses: 86
  },
  institutionOutcomes: [
    { id: 'ILO1', name: 'Critical Thinking', definition: 'Evaluate evidence, assumptions and alternatives to form reasoned conclusions.', attainment: 79, target: 80, trend: 2, confidence: 'High', programs: 5, coverage: 94, cqi: '1 monitoring' },
    { id: 'ILO2', name: 'Technical Mastery', definition: 'Apply disciplinary knowledge and appropriate tools to solve authentic problems.', attainment: 73, target: 80, trend: -3, confidence: 'High', programs: 4, coverage: 88, cqi: '2 open' },
    { id: 'ILO3', name: 'Communication', definition: 'Communicate ideas clearly and responsibly to specialist and public audiences.', attainment: 68, target: 75, trend: 0, confidence: 'Medium', programs: 3, coverage: 76, cqi: '1 open' },
    { id: 'ILO4', name: 'Ethical Practice', definition: 'Apply ethical, professional and civic judgment in decision-making.', attainment: 82, target: 78, trend: 1, confidence: 'High', programs: 5, coverage: 91, cqi: 'On target' },
    { id: 'ILO5', name: 'Collaboration', definition: 'Contribute effectively in diverse teams and shared professional settings.', attainment: 81, target: 78, trend: 2, confidence: 'High', programs: 4, coverage: 90, cqi: 'On target' },
    { id: 'ILO6', name: 'Innovation', definition: 'Develop and test responsible solutions through inquiry and iteration.', attainment: 77, target: 75, trend: 1, confidence: 'High', programs: 4, coverage: 86, cqi: 'On target' },
    { id: 'ILO7', name: 'Lifelong Learning', definition: 'Reflect on performance and independently plan continued development.', attainment: 76, target: 74, trend: 1, confidence: 'Medium', programs: 3, coverage: 81, cqi: 'On target' }
  ],
  qualityTrend: [
    { period: 'Spring 25', attainment: 68, evidence: 72 },
    { period: 'Summer 25', attainment: 69, evidence: 76 },
    { period: 'Fall 25', attainment: 71, evidence: 81 },
    { period: 'Spring 26', attainment: 72, evidence: 85 },
    { period: 'Summer 26', attainment: 73, evidence: 88 }
  ],
  departments: [
    { name: 'Computer Science', learners: 402, programs: 2, courses: 28, active: 95, attainment: 81, evidence: 94, cqi: 'Measured lift', trend: 3 },
    { name: 'Engineering', learners: 318, programs: 3, courses: 22, active: 93, attainment: 74, evidence: 89, cqi: 'Monitoring', trend: 1 },
    { name: 'Business Foundations', learners: 286, programs: 2, courses: 14, active: 86, attainment: 63, evidence: 72, cqi: 'Action open', trend: -3 },
    { name: 'Health Sciences', learners: 118, programs: 3, courses: 10, active: 91, attainment: 76, evidence: 90, cqi: 'On track', trend: 2 },
    { name: 'Arts & Humanities', learners: 72, programs: 2, courses: 7, active: 89, attainment: 75, evidence: 84, cqi: 'Monitoring', trend: 0 },
    { name: 'General Studies', learners: 44, programs: 2, courses: 5, active: 87, attainment: 71, evidence: 82, cqi: 'Remeasure', trend: 1 }
  ],
  programContribution: [
    { name: 'B.Sc. Computer Science', attainment: 78, confidence: 'High', plos: 6 },
    { name: 'B.Eng. Systems', attainment: 74, confidence: 'High', plos: 5 },
    { name: 'BBA Business Administration', attainment: 61, confidence: 'Medium', plos: 4 }
  ],
  evidenceHealth: { coverage: 88, mappedOutcomes: 94, sufficientPrograms: 11, programTotal: 14, insufficientOutcomes: 3, unmeasured: 1, blockers: 2, warnings: 2 },
  hierarchyHealth: { iloHealthy: 7, ploMappings: 94, cloMappings: 91, unmapped: 2, invalid: 0, duplicates: 0, insufficientEvidence: 3 },
  cqi: {
    open: 4, completedThisTerm: 2, readyToRemeasure: 1, closed: 4,
    improvedAfterRemeasurement: 3, awaitingEvidence: 1, averageLift: 8,
    recent: [
      { title: 'REST APIs remediation', program: 'Computer Science', coordinator: 'Dr. Khalid', baseline: 48, latest: 54, lift: 6, status: 'Remeasure' },
      { title: 'Normalization worked examples', program: 'Computer Science', coordinator: 'Dr. Khalid', baseline: 54, latest: 62, lift: 8, status: 'Measured' }
    ]
  },
  readiness: {
    score: 82,
    categories: [
      { name: 'ILO evidence', value: 88, status: 'In progress', detail: 'Two evidence gaps remain' },
      { name: 'Program mappings', value: 94, status: 'In progress', detail: 'Two outcomes are unmapped' },
      { name: 'Course artifacts', value: 86, status: 'In progress', detail: '74 of 86 course files complete' },
      { name: 'Assessment evidence', value: 79, status: 'Blocked', detail: 'Concurrency assessment missing' },
      { name: 'CQI documentation', value: 83, status: 'In progress', detail: 'One closure record incomplete' },
      { name: 'Faculty reflections', value: 75, status: 'In progress', detail: '9 of 12 received' }
    ],
    blockers: [
      { title: 'Concurrency assessment evidence', owner: 'Engineering', due: 'Aug 16', state: 'Blocked' },
      { title: 'CQI closure documentation', owner: 'Computer Science', due: 'Aug 18', state: 'In progress' }
    ],
    milestone: { title: 'Institutional quality review', date: 'Aug 20', required: ['ILO2 evidence summary', 'CQI follow-up', 'Readiness update'] }
  },
  approvals: [
    { id: 'APR-104', type: 'ILO governance draft', title: 'Update ILO2 target', requester: 'Admin Agent', status: 'pending', risk: 'Medium', reversible: 'Yes', current: '80%', proposed: '82%', reason: 'Institution quality review', approver: 'Institution Admin' },
    { id: 'APR-105', type: 'CQI / mapping proposal', title: 'Map Concurrency evidence to ILO2', requester: 'Dr. Khalid', status: 'reviewed', risk: 'Medium', reversible: 'Yes', current: 'Mapping missing', proposed: 'Add reviewed mapping', reason: 'Close evidence hierarchy warning', approver: 'Institution Admin' },
    { id: 'APR-106', type: 'AI protected action', title: 'Publish institution communication', requester: 'Admin Agent', status: 'pending', risk: 'Low', reversible: 'Yes', current: 'Draft', proposed: 'Approved for publishing', reason: 'Quality review briefing', approver: 'Institution Admin' }
  ],
  aiGovernance: {
    provider: 'DeepSeek', model: 'DeepSeek V3', institutionAutonomyCeiling: 'A2', policyVersion: 'v1.4',
    toolCalls: 214, requests: 148, tokens: '1.82M', approvalRate: 91, safetyChecks: 100,
    estimatedCost: 38.40, medianLatency: '1.4s', pendingActions: 3, unapprovedExecutions: 0,
    budget: { monthly: 150, used: 38.40, remaining: 111.60 }, lastPolicyReview: 'Aug 2026',
    actions: [
      { action: 'Show insight', toolMax: 'A1', cap: 'A2', effective: 'A1', approval: 'None', reversible: 'N/A' },
      { action: 'Draft feedback', toolMax: 'A1', cap: 'A2', effective: 'A1', approval: 'Teacher', reversible: 'Yes' },
      { action: 'Schedule review', toolMax: 'A3', cap: 'A2', effective: 'A2', approval: 'Student', reversible: 'Yes' },
      { action: 'Send parent communication', toolMax: 'A2', cap: 'A2', effective: 'A2', approval: 'Parent / Admin policy', reversible: 'Yes' },
      { action: 'Change official outcome', toolMax: 'A2', cap: 'A2', effective: 'A2', approval: 'Admin required', reversible: 'Yes' }
    ]
  },
  academicCalendar: [
    { name: 'Summer 2026', dates: 'Jun 1 – Aug 15, 2026', enrollment: 'Closed', assessment: 'Aug 8 – Aug 15', status: 'Active' },
    { name: 'Fall 2026', dates: 'Aug 23 – Dec 17, 2026', enrollment: 'Open', assessment: 'Dec 6 – Dec 17', status: 'Upcoming' },
    { name: 'Spring 2026', dates: 'Jan 11 – May 14, 2026', enrollment: 'Closed', assessment: 'May 3 – May 14', status: 'Past' }
  ],
  people: {
    activeStaff: 164, teachers: 132, coordinators: 18, pendingInvites: 6,
    rows: [
      { name: 'Mariam Al-Sayed', role: 'Admin', department: 'Institution Office', status: 'Active', last: 'Today', access: 'Privileged' },
      { name: 'Dr. Khalid Al-Mansoori', role: 'Coordinator', department: 'Computer Science', status: 'Active', last: '12 min ago', access: 'Program' },
      { name: 'Prof. Ahmed Hassan', role: 'Teacher', department: 'Computer Science', status: 'Active', last: '34 min ago', access: 'Courses' },
      { name: 'Dr. Leila Noor', role: 'Coordinator', department: 'Engineering', status: 'Active', last: 'Yesterday', access: 'Program' },
      { name: 'Noura Al-Hamad', role: 'Teacher', department: 'Business Foundations', status: 'Invited', last: 'Not yet active', access: 'Pending' }
    ]
  },
  security: { mfa: 94, sso: 'Enabled', sessions: 186, anomalies: 0, privileged: 8, reviewDue: 'Aug 30' },
  fees: { invoices: 1210, collected: 1840000, outstanding: 215000, overdue: 42000 },
  marketplace: { xpIssued: 428000, xpSpent: 301400, activeRewards: 18, budget: 50000, used: 31750 },
  badges: { active: 24, drafts: 3, awarded: 1842 },
  importPreview: { rows: 240, valid: 231, warnings: 7, errors: 2 }
});
