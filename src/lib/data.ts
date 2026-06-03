/**
 * Client-safe data functions.
 * These use the browser Supabase client and are safe to import in Client Components.
 *
 * For server-only queries (getCandidates, getCohortStats, etc.) use @/lib/server-data.
 */
import type { ScoreUpdate } from '@/types'

const YEAR = 2025

export async function updateScores(
  candidateId: string,
  updates: ScoreUpdate
): Promise<{ success: boolean; error?: string }> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase
    .from('scores')
    .update(updates)
    .eq('candidate_id', candidateId)
    .eq('cohort_year', YEAR)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', candidateId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function submitApplication(form: {
  first_name: string
  surname: string
  dob?: string
  contact_phone: string
  email?: string
  school_name: string
  grade: number
  ap_math_pct?: number
  ap_science_pct?: number
  ap_english_pct?: number
  motivation_text?: string
  community_problem?: string
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data, error } = await supabase.rpc('submit_application', {
    p_first_name:        form.first_name,
    p_surname:           form.surname,
    p_dob:               form.dob ?? null,
    p_contact_phone:     form.contact_phone,
    p_email:             form.email ?? null,
    p_school_name:       form.school_name,
    p_grade:             form.grade,
    p_ap_math_pct:       form.ap_math_pct ?? null,
    p_ap_science_pct:    form.ap_science_pct ?? null,
    p_ap_english_pct:    form.ap_english_pct ?? null,
    p_motivation_text:   form.motivation_text ?? null,
    p_community_problem: form.community_problem ?? null,
  })
  if (error) return { success: false, error: error.message }
  return data as { success: boolean; message?: string; error?: string }
}

// Pure scoring utilities (also available from @/lib/scoring)
export { computeScore, getDecision } from '@/lib/scoring'
