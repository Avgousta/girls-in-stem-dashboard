import Image from 'next/image';
import { BRAND } from './brand';

const STAGES = [
  {
    key: 'npo', label: 'Melisizwe NPO', tag: 'Building the pipeline', color: BRAND.red,
    body: 'Unlocking potential through STEM education, digital inclusion and youth development.',
  },
  {
    key: 'academy', label: 'The Melisizwe Academy', tag: 'Building the capability', color: BRAND.blue,
    body: 'Developing digital skills, workplace readiness and pathways to employment.',
  },
  {
    key: 'mcx', label: 'Melisizwe Customer Experience (MCX)', tag: 'Creating commercial opportunity', color: BRAND.green,
    body: 'Connecting talent to business opportunities through technology-enabled customer experience, digital adoption and outsourcing services.',
  },
  {
    key: 'impact', label: 'Economic opportunity & community impact', tag: 'Value reinvested into communities', color: BRAND.yellow,
    body: 'Creating sustainable employment pathways and opportunities to strengthen the talent pipeline.',
  },
] as const;

export default function Flywheel() {
  return (
    <div className="mt-10 grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* The approved flywheel artwork, on every screen size. Tap to open full size. */}
      <a href="/connect/melisizwe-flywheel.webp" target="_blank" className="mx-auto block w-full max-w-[520px]"
        aria-label="Open the Melisizwe flywheel artwork full size">
        <Image
          src="/connect/melisizwe-flywheel.webp" width={1254} height={1254} priority
          alt="The Melisizwe flywheel: Melisizwe NPO builds the pipeline, The Melisizwe Academy builds the capability, and MCX creates commercial opportunity, which flows back into the NPO."
          className="h-auto w-full" sizes="(min-width: 768px) 520px, 100vw"
        />
        <span className="mt-2 block text-center text-xs md:hidden" style={{ color: BRAND.inkMuted }}>Tap to enlarge</span>
      </a>

      <ol className="relative space-y-0">
        {STAGES.map((s, i) => (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {/* connector line */}
            {i < STAGES.length - 1 && (
              <span aria-hidden className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5" style={{ background: BRAND.line }} />
            )}
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
              style={{ background: s.color, color: s.key === 'impact' ? BRAND.ink : '#fff' }}>
              {i + 1}
            </span>
            <div className="pt-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: s.key === 'impact' ? '#9A7400' : s.color }}>{s.tag}</p>
              <h3 className="mt-0.5 text-lg font-bold leading-snug">{s.label}</h3>
              <p className="mt-1 text-[15px] leading-relaxed" style={{ color: BRAND.inkMid }}>{s.body}</p>
            </div>
          </li>
        ))}
        <li className="mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{ borderColor: BRAND.yellow, background: '#FFF8E1', color: BRAND.ink }}>
          <span aria-hidden className="text-xl leading-none">↻</span>
          The value created flows back into the pipeline. One integrated ecosystem, not three separate organisations.
        </li>
      </ol>

      <p className="text-center text-sm md:col-span-2" style={{ color: BRAND.inkMuted }}>
        <a href="/connect/melisizwe-profile.jpg" target="_blank" className="font-semibold underline" style={{ color: BRAND.blue }}>
          View the full Melisizwe profile &amp; flywheel artwork
        </a>
      </p>
    </div>
  );
}
