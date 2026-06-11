import { AlertTriangle, TrendingDown, Calendar } from 'lucide-react';
import { cn, RISK_COLORS, fmt } from '@/utils';
import type { RiskScore } from '@/types';
import Link from 'next/link';

interface Props {
  risk: RiskScore;
  onIntervene?: (learnerId: string) => void;
}

const FLAG_LABELS: Record<string, string> = {
  attendance_critical:  '< 75% attendance',
  score_critical:       '< 50% avg score',
  attendance_warning:   '75–84% attendance',
  score_warning:        '50–59% avg score',
  consecutive_absences: '2 consecutive absences',
  declining_scores:     'Declining score trend',
  no_recent_mentorship: 'No mentorship in 21+ days',
};

export default function RiskAlertCard({ risk, onIntervene }: Props) {
  const c = RISK_COLORS[risk.risk_level];

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-shadow hover:shadow-md',
      risk.risk_level === 'high'   ? 'border-red-200 bg-red-50/50' :
      risk.risk_level === 'medium' ? 'border-yellow-200 bg-yellow-50/50' :
                                     'border-mint-400/30 bg-mint-400/5'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('p-2 rounded-lg', c.bg)}>
            <AlertTriangle className={cn('w-4 h-4', c.text)} />
          </div>
          <div>
            <Link href={`/learners/${risk.learner_id}`}
              className="text-sm font-semibold text-gray-800 hover:text-brand-700 hover:underline">
              {risk.learner_name}
            </Link>
            <p className="text-xs text-gray-400 capitalize">{risk.programme_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn('badge uppercase text-[10px] tracking-wide', c.bg, c.text)}>
            {risk.risk_level}
          </span>
          {risk.risk_trajectory && risk.risk_trajectory !== 'stable' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: risk.risk_trajectory === 'critical' ? 'rgba(239,68,68,0.15)' :
                            risk.risk_trajectory === 'declining' ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)',
                color:      risk.risk_trajectory === 'critical' ? '#EF4444' :
                            risk.risk_trajectory === 'declining' ? '#FBBF24' : '#34D399',
              }}>
              {risk.risk_trajectory === 'critical' ? '⚠ critical trend' :
               risk.risk_trajectory === 'declining' ? '↓ declining' : '↑ improving'}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Attendance</span>
          </div>
          <p className={cn('text-lg font-bold tabular-nums',
            risk.attendance_rate < 75 ? 'text-red-600' : risk.attendance_rate < 85 ? 'text-yellow-600' : 'text-mint-600')}>
            {risk.attendance_rate}%
          </p>
        </div>
        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Avg Score</span>
          </div>
          <p className={cn('text-lg font-bold tabular-nums',
            risk.avg_score < 50 ? 'text-red-600' : risk.avg_score < 60 ? 'text-yellow-600' : 'text-mint-600')}>
            {risk.avg_score}%
          </p>
        </div>
      </div>

      {/* Flags */}
      {risk.risk_flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {risk.risk_flags.map((flag: string) => (
            <span key={flag} className={cn('badge text-[10px]', c.bg, c.text)}>
              {FLAG_LABELS[flag] || flag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-current/10">
        <p className="text-[10px] text-gray-400 flex-1">
          Updated {fmt.date(risk.last_calculated)}
        </p>
        {onIntervene && risk.risk_level !== 'low' && (
          <button onClick={() => onIntervene(risk.learner_id)}
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors">
            + Log Intervention
          </button>
        )}
        <Link href={`/learners/${risk.learner_id}`}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          View Profile →
        </Link>
      </div>
    </div>
  );
}
