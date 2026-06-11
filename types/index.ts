// ─────────────────────────────────────────────────────────────────────────────
// types/index.ts  —  Platform-wide TypeScript types
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'instructor' | 'learner' | 'parent' | 'sponsor';
export type ProgrammeStatus = 'active' | 'inactive' | 'completed';
export type LearnerStatus = 'active' | 'inactive' | 'graduated' | 'withdrawn';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';
export type InterventionStatus = 'open' | 'in_progress' | 'resolved';
export type RiskLevel = 'low' | 'medium' | 'high';
export type GradeBand = 'Distinction' | 'Merit' | 'Pass' | 'Needs Support';

// ── Database Entities ─────────────────────────────────────────────────────────
export interface School {
  school_id: string;
  school_name: string;
  district: string;
  province: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_id:  string | null;
  sponsor_id: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Learner {
  learner_id: string;
  user_id: string | null;
  school_id: string;
  grade: number;
  parent_id: string | null;
  enrollment_date: string;
  programme_status: LearnerStatus;
  learner_code: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  school_name?: string;
  parent_name?: string;
  parent_contact?: string;
}

export interface Program {
  program_id: string;
  program_name: string;
  program_type: string;
  start_date: string;
  end_date: string | null;
  instructor_id: string;
  school_id: string;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  // Joined
  instructor_name?: string;
  school_name?: string;
  enrolled_count?: number;
}

export interface ProgramEnrollment {
  enrollment_id: string;
  learner_id: string;
  program_id: string;
  enrolled_at: string;
  status: 'active' | 'completed' | 'dropped';
  completion_date: string | null;
}

export interface Attendance {
  attendance_id: string;
  learner_id: string;
  program_id: string;
  session_date: string;
  status: AttendanceStatus;
  captured_by: string;
  notes: string | null;
  created_at: string;
  // Joined
  learner_name?: string;
  program_name?: string;
}

export interface Assessment {
  assessment_id: string;
  learner_id: string;
  program_id: string;
  subject: string;
  score: number | null;
  max_score: number | null;
  percentage: number;
  grade_band: GradeBand | null;
  assessment_date: string;
  captured_by: string;
  // Joined
  learner_name?: string;
  program_name?: string;
}

export interface Project {
  project_id: string;
  learner_id: string;
  program_id: string | null;
  project_name: string;
  description: string | null;
  completion_status: ProjectStatus;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  // Joined
  learner_name?: string;
}

export interface MentorshipSession {
  session_id: string;
  learner_id: string;
  mentor_id: string;
  session_date: string;
  duration_minutes: number | null;
  notes: string | null;
  next_steps: string | null;
  created_at: string;
  // Joined
  learner_name?: string;
  mentor_name?: string;
}

export interface Intervention {
  intervention_id: string;
  learner_id: string;
  flagged_by: string;
  reason: string;
  action_taken: string | null;
  follow_up_date: string | null;
  status: InterventionStatus;
  resolved_at: string | null;
  created_at: string;
  // Joined
  learner_name?: string;
  flagged_by_name?: string;
}

export interface RiskScore {
  score_id: string;
  learner_id: string;
  attendance_rate: number;
  avg_score: number;
  risk_level: RiskLevel;
  risk_flags: string[];
  risk_trajectory?: 'improving' | 'stable' | 'declining' | 'critical';
  trajectory_flags?: string[];
  last_calculated: string;
  // Joined
  learner_name?: string;
  school_name?: string;
  programme_name?: string;
}

// ── API Request/Response Types ────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LearnerFilters extends PaginationParams {
  school_id?: string;
  programme_status?: LearnerStatus;
  program_id?: string;
  risk_level?: RiskLevel;
}

export interface AttendanceFilters extends PaginationParams {
  program_id?: string;
  learner_id?: string;
  from_date?: string;
  to_date?: string;
  status?: AttendanceStatus;
}

export interface BulkAttendancePayload {
  program_id: string;
  session_date: string;
  captured_by: string;
  records: Array<{ learner_id: string; status: AttendanceStatus; notes?: string }>;
}

// ── Dashboard / Analytics Types ───────────────────────────────────────────────
export interface DashboardStats {
  total_learners: number;
  active_programs: number;
  avg_attendance_rate: number;
  avg_score: number;
  high_risk_learners: number;
  schools_participating: number;
  open_interventions: number;
  completions_this_month: number;
}

export interface AttendanceTrend {
  week: string;
  rate: number;
  present: number;
  absent: number;
}

export interface ScoreDistribution {
  grade_band: GradeBand;
  count: number;
  percentage: number;
}

export interface SchoolComparison {
  school_name: string;
  learner_count: number;
  avg_attendance: number;
  avg_score: number;
}

export interface ProgramProgress {
  program_name: string;
  active: number;
  completed: number;
  dropped: number;
}

// ── Form Types (Zod-validated) ────────────────────────────────────────────────
export interface CreateLearnerForm {
  first_name: string;
  last_name: string;
  grade: number;
  school_id: string;
  email: string;
  phone?: string;
  parent_name?: string;
  parent_contact?: string;
  enrollment_date: string;
  program_id: string;
}

export interface CreateAttendanceForm {
  learner_id: string;
  program_id: string;
  session_date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface CreateAssessmentForm {
  learner_id: string;
  program_id: string;
  subject: string;
  score: number;
  max_score: number;
  assessment_date: string;
}

export interface CreateInterventionForm {
  learner_id: string;
  reason: string;
  action_taken?: string;
  follow_up_date?: string;
  status: InterventionStatus;
}

export interface CreateMentorshipForm {
  learner_id: string;
  mentor_id: string;
  session_date: string;
  duration_minutes?: number;
  notes?: string;
  next_steps?: string;
}
