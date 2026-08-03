import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

function AtomMark({ ring, dot, stroke }: { ring: number; dot: number; stroke: number }) {
  const ringStyle = (rotate: number) => ({
    position: 'absolute' as const,
    display: 'flex' as const,
    width: ring,
    height: ring * 0.42,
    border: `${stroke}px solid #fff`,
    borderRadius: '50%',
    transform: `rotate(${rotate}deg)`,
  });
  return (
    <div style={{ position: 'relative', display: 'flex', width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
      <div style={ringStyle(0)} />
      <div style={ringStyle(60)} />
      <div style={ringStyle(120)} />
      <div style={{ position: 'absolute', display: 'flex', width: dot, height: dot, background: '#fff', borderRadius: '50%' }} />
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
          borderRadius: 40,
        }}
      >
        <AtomMark ring={112} dot={20} stroke={7} />
      </div>
    ),
    { ...size }
  );
}
