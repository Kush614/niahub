import { ImageResponse } from 'next/og';
import { getPack } from '@/lib/insforge';

export const runtime = 'nodejs';
export const alt = 'NiaHub pack';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPack(id);
  if (!pack) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
            background: '#0b0b0e', color: '#f8fafc', fontSize: 56, letterSpacing: -1,
          }}
        >
          NiaHub
        </div>
      ),
      { ...size },
    );
  }

  const accent = pack.accent_color ?? '#1f9eff';
  const sources = (pack.sources as unknown as Array<{ url: string }>) ?? [];
  const score = pack.hallucination_score == null ? null : `${(pack.hallucination_score * 100).toFixed(1)}%`;
  const baseline = pack.baseline_score == null ? null : `${(pack.baseline_score * 100).toFixed(1)}%`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          padding: 56, background: '#0b0b0e', color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
          backgroundImage: `radial-gradient(80% 50% at 100% 0%, ${accent}33, transparent 70%), radial-gradient(60% 50% at 0% 100%, #a855f733, transparent 70%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 9999, background: accent }} />
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)' }}>niahub.dev / packs / {pack.pack_id}</div>
        </div>

        <div style={{ marginTop: 36, fontSize: 80, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, display: 'flex' }}>
          {pack.display_name}
        </div>

        <div style={{ marginTop: 18, fontSize: 30, color: 'rgba(255,255,255,0.78)', lineHeight: 1.3, display: 'flex', maxWidth: 980 }}>
          {pack.tagline ?? 'Pre-indexed knowledge pack for any MCP-compatible agent.'}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2 }}>Hallucination rate</div>
            {score ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontSize: 64, fontWeight: 700, color: '#34d399' }}>{score}</div>
                {baseline && (
                  <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>vs baseline {baseline}</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)' }}>—</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2 }}>
              Indexed
            </div>
            <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>
              {sources.length} sources · refresh {pack.refresh_cadence}
            </div>
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>
              {pack.install_count.toLocaleString()} installs
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 600, background: 'linear-gradient(90deg,#4fbcff,#a855f7)', backgroundClip: 'text', color: 'transparent' }}>
            NiaHub
          </div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)' }}>
            · One line, perfect context for any MCP agent.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
