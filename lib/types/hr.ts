export interface HrEmployee {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string;
  hireDate: string;
  employmentType: "full-time" | "part-time" | "contract";
  status: "active" | "on-leave" | "probation";
  monthlySalary: number;
}

export interface HrAttendanceRecord {
  id: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workedHours: number;
  status: "present" | "late" | "absent" | "remote";
}

export interface HrPayrollRecord {
  id: string;
  employeeName: string;
  month: string;
  grossSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "paid" | "pending";
}

export interface HrCandidate {
  id: string;
  fullName: string;
  role: string;
  stage: "new" | "screening" | "interview" | "offer";
  score: number;
  appliedAt: string;
}

// Leave Management
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "annual" | "sick" | "emergency" | "unpaid";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvalDate?: string;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  annual: number;
  sick: number;
  emergency: number;
  used: number;
  remaining: number;
}

// Performance Review
export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewPeriod: string;
  rating: number; // 1-5
  managerRating: number;
  peerRating?: number;
  comments: string;
  goals: string[];
  achievedGoals: number;
  reviewDate: string;
  reviewer: string;
}

export interface KPI {
  id: string;
  employeeId: string;
  employeeName: string;
  metricName: string;
  targetValue: number;
  actualValue: number;
  progress: number; // percentage
  unit: string;
  month: string;
}

// Employee Self-Service
export interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  generatedDate: string;
  url: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentType: "id" | "passport" | "contract" | "other";
  expiryDate: string;
  status: "valid" | "expiring-soon" | "expired";
}

// Training
export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  category: "onboarding" | "technical" | "soft-skills" | "compliance";
  duration: string; // e.g., "2 weeks"
  instructor: string;
  startDate: string;
  status: "not-started" | "in-progress" | "completed";
  enrolledCount: number;
}

export interface TrainingEnrollment {
  id: string;
  employeeId: string;
  employeeName: string;
  programId: string;
  programTitle: string;
  enrolledDate: string;
  completionDate?: string;
  completionPercentage: number;
  status: "enrolled" | "in-progress" | "completed" | "dropped";
}

// Smart Notifications
export interface SmartNotification {
  id: string;
  type: "document-expiry" | "birthday" | "work-anniversary" | "late-checkin" | "announcement";
  employeeId?: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}
