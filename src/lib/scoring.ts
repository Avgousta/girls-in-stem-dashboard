/**
 * Pure scoring functions — safe to import in both Server and Client Components.
 * No server-only dependencies (no next/headers, no supabase/server).
 */

export function computeScore(s: {
  ap_points?: number | null
  aa_points?: number | null
  math_raw?: number | null
  sci_raw?: number | null
  psych_raw?: number | null
  video_avg?: number | null
}): number {
  return Math.round((
    ((s.ap_points   ?? 0) / 20 * 20) +
    ((s.aa_points   ?? 0) / 25 * 25) +
    ((s.math_raw    ?? 0) / 50 * 15) +
    ((s.sci_raw     ?? 0) / 50 * 15) +
    ((s.psych_raw   ?? 0) / 20 * 15) +
    ((s.video_avg   ?? 0) / 15 * 10)
  ) * 10) / 10
}

export function getDecision(score: number, complete: number): string {
  if (complete < 4) return 'Incomplete'
  if (score >= 70)  return 'Accept'
  if (score >= 55)  return 'Waitlist'
  return 'Review'
}
