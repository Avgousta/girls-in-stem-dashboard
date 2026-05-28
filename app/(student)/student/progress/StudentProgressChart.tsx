'use client';

interface DataPoint { label: string; value: number }

export default function StudentProgressChart({ data }: { data: DataPoint[] }) {
  const max  = 100;
  const h    = 120;
  const w    = 300;
  const pad  = 20;
  const xStep = (w - pad * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: pad + i * xStep,
    y: h - pad - ((d.value / max) * (h - pad * 2)),
    value: d.value,
    label: d.label,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length-1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  const color = (v: number) => v >= 80 ? '#2DD4A0' : v >= 60 ? '#60A5FA' : v >= 50 ? '#FCD34D' : '#F87171';
  const avg   = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {[25,50,75].map(v => {
          const y = h - pad - (v / max) * (h - pad * 2);
          return (
            <g key={v}>
              <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={pad - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="8">{v}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#grad)" opacity="0.3" />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <path d={pathD} fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill={color(p.value)} stroke="rgba(15,15,21,1)" strokeWidth="2" />
            <text x={p.x} y={p.y - 9} textAnchor="middle" fill={color(p.value)} fontSize="9" fontWeight="bold">
              {p.value}%
            </text>
          </g>
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={h - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
