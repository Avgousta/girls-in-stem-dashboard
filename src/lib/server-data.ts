/**
 * Server-only data fetching functions.
 * Import ONLY in Server Components or Route Handlers — NOT in Client Components.
 */
import { createClient } from '@/lib/supabase/server'
import type { Candidate, CohortStats, SchoolStat } from '@/types'

const YEAR = 2025

export async function getCandidates(): Promise<Candidate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('get_ranked_candidates', { p_year: YEAR })
  if (error) { console.error(error); return [] }
  return (data ?? []) as Candidate[]
}

export async function getCohortStats(): Promise<CohortStats | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('get_cohort_stats', { p_year: YEAR })
  if (error) { console.error(error); return null }
  return data as CohortStats
}

export async function getSchoolStats(): Promise<SchoolStat[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_school_stats')
    .select('*')
    .eq('cohort_year', YEAR)
    .order('avg_score', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []) as SchoolStat[]
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('get_ranked_candidates', { p_year: YEAR })
  if (error) { console.error(error); return null }
  return (data as Candidate[]).find(c => c.id === id) ?? null
}
