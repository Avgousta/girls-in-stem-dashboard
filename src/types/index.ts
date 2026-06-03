export type Decision = 'Accept' | 'Waitlist' | 'Review' | 'Incomplete'
export type Status =
  | 'Applied'
  | 'Screened'
  | 'Testing'
  | 'Assessed'
  | 'Accepted'
  | 'Waitlisted'
  | 'Declined'
  | 'Withdrawn'

export interface Candidate {
  id: string
  full_name: string
  first_name: string
  surname: string
  email: string | null
  contact_phone: string | null
  grade: number
  status: Status
  cohort_year: number
  applied_at: string
  school_name: string
  province: string
  // scores (may be null if not yet scored)
  ap_points: number | null
  aa_points: number | null
  math_raw: number | null
  sci_raw: number | null
  psych_raw: number | null
  video_avg: number | null
  video_judge_count: number
  composite_score: number | null
  components_complete: number
  decision: Decision | null
  score_notes: string | null
  rank: number
}

export interface CohortStats {
  total: number
  accepted: number
  waitlisted: number
  review: number
  incomplete: number
  avg_score: number
  top_score: number
  schools: number
}

export interface SchoolStat {
  school_name: string
  province: string
  cohort_year: number
  candidates: number
  accepted: number
  avg_score: number
  top_score: number
  acceptance_rate_pct: number
}

export interface ScoreUpdate {
  ap_points?: number | null
  aa_points?: number | null
  math_raw?: number | null
  sci_raw?: number | null
  psych_raw?: number | null
  video_avg?: number | null
  notes?: string
}
