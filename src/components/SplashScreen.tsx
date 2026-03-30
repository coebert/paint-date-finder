import { useState, useEffect, useCallback, useMemo } from 'react';
import barrelBg from '@/assets/barrel-bg.jpg';
import logo from '@/assets/logo.png';

/**
 * James Bond gun barrel sequence parody for paintball.
 *
 * Phases (matching the authentic sequence):
 *   1. dot       – A white dot blinks across the screen left → right
 *   2. barrel    – Dot expands into the rifled barrel; figure walks right → left
 *   3. turn      – Figure stops center and pivots to face the camera
 *   4. fire      – Figure shoots paintball marker; muzzle flash + projectile
 *   5. splat     – Orange paint washes down the screen (replaces blood)
 *   6. collapse  – Barrel sways then shrinks to a dot and fades out
 *   7. done      – Component unmounts
 */

type Phase = 'dot' | 'barrel' | 'turn' | 'fire' | 'splat' | 'collapse' | 'done';

/* ── Floating Dust Particles ──────────────────────────────────── */

function DustParticles() {
  const particles = useMemo(() =>
    [...Array(20)].map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      opacity: 0.15 + Math.random() * 0.25,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 0,
            animation: `dust-float ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Walking Silhouette (Side Profile) ────────────────────────── */

function WalkingSilhouette() {
  return (
    <svg viewBox="0 0 120 320" className="h-[55vmin]" style={{ filter: 'drop-shadow(2px 4px 12px rgba(0,0,0,0.7))' }}>
      {/* Head - side profile */}
      <ellipse cx="50" cy="38" rx="16" ry="22" fill="hsl(220, 15%, 8%)" />
      {/* Paintball mask */}
      <path d="M34,20 Q36,10 50,10 Q60,12 62,20 L64,38 Q64,50 55,54 Q48,56 38,52 Q32,48 32,38 Z" fill="hsl(220, 8%, 22%)" />
      <path d="M34,22 Q38,16 50,15 Q58,16 60,22 L60,34 Q58,40 50,42 Q40,40 36,34 Z" fill="hsl(200, 15%, 12%)" />
      <path d="M38,22 Q44,18 52,18 L52,28 Q46,30 40,28 Z" fill="hsl(200, 20%, 28%)" opacity="0.4" />
      <path d="M36,42 Q44,50 54,50 L52,54 Q44,56 38,52 Z" fill="hsl(220, 10%, 16%)" />
      {[0,1,2].map(i => (
        <circle key={i} cx={40 + i * 5} cy={46} r="1" fill="hsl(220, 8%, 10%)" />
      ))}
      <path d="M62,30 Q70,30 72,34 Q73,38 72,42" stroke="hsl(220, 8%, 18%)" strokeWidth="2.5" fill="none" />
      {/* Neck */}
      <rect x="44" y="54" width="12" height="8" rx="3" fill="hsl(30, 60%, 75%)" />
      {/* Tuxedo jacket */}
      <path d="M32,62 Q28,80 26,110 L26,136 L74,136 L74,110 Q72,80 68,62 Z" fill="hsl(220, 15%, 8%)" />
      <path d="M38,62 L42,82 L36,90 L32,68 Z" fill="hsl(220, 12%, 14%)" />
      <path d="M38,63 L41,78 L37,86 L34,69 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
      <path d="M42,64 L44,136 L52,136 L50,64 Z" fill="hsl(0, 0%, 90%)" opacity="0.5" />
      <circle cx="47" cy="90" r="1.5" fill="hsl(220, 15%, 8%)" />
      <path d="M68,120 L74,136 L70,136 L66,124 Z" fill="hsl(220, 12%, 14%)" />

      {/* Front arm */}
      <g style={{ animation: 'arm-swing-left 0.6s ease-in-out infinite alternate' }}>
        <path d="M36,68 Q20,88 22,116" stroke="hsl(220, 15%, 8%)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="22" cy="118" r="5" fill="hsl(30, 60%, 75%)" />
        <circle cx="26" cy="110" r="1.5" fill="hsl(45, 80%, 60%)" />
      </g>
      {/* Back arm */}
      <g style={{ animation: 'arm-swing-right 0.6s ease-in-out infinite alternate' }}>
        <path d="M64,68 Q78,84 76,112" stroke="hsl(220, 15%, 8%)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
        <circle cx="76" cy="114" r="4.5" fill="hsl(30, 50%, 65%)" />
      </g>

      {/* Front leg */}
      <g style={{ animation: 'leg-stride-left 0.6s ease-in-out infinite alternate' }}>
        <path d="M38,134 Q32,175 24,240 L18,240 Q28,178 36,140" fill="hsl(220, 15%, 8%)" />
        <path d="M36,136 Q30,175 22,240" stroke="hsl(220, 10%, 18%)" strokeWidth="1" fill="none" />
        <path d="M10,238 Q12,232 20,232 Q26,232 26,238 Q26,244 16,244 Q8,244 10,238 Z" fill="hsl(220, 15%, 6%)" />
      </g>
      {/* Back leg */}
      <g style={{ animation: 'leg-stride-right 0.6s ease-in-out infinite alternate' }}>
        <path d="M62,134 Q68,175 76,240 L82,240 Q72,178 64,140" fill="hsl(220, 15%, 8%)" opacity="0.8" />
        <path d="M72,238 Q74,232 82,232 Q88,232 88,238 Q88,244 78,244 Q70,244 72,238 Z" fill="hsl(220, 15%, 6%)" opacity="0.8" />
      </g>
    </svg>
  );
}

/* ── Facing Silhouette (Front View + Marker) ──────────────────── */

function FacingSilhouette() {
  return (
    <svg viewBox="0 0 140 320" className="h-[55vmin]" style={{ filter: 'drop-shadow(2px 4px 12px rgba(0,0,0,0.7))' }}>
      {/* Head */}
      <ellipse cx="70" cy="38" rx="20" ry="23" fill="hsl(220, 15%, 8%)" />
      {/* Paintball mask */}
      <path d="M50,28 Q49,18 60,14 Q70,11 80,14 Q91,18 90,28 L91,42 Q91,52 80,55 Q70,57 60,55 Q49,52 49,42 Z" fill="hsl(220, 8%, 22%)" />
      <path d="M53,24 Q53,20 63,18 Q70,17 77,18 Q87,20 87,24 L87,36 Q87,40 77,42 Q70,43 63,42 Q53,40 53,36 Z" fill="hsl(200, 15%, 12%)" />
      <path d="M57,22 Q61,20 69,20 Q73,20 75,22 L74,30 Q70,31 63,31 Q59,30 57,28 Z" fill="hsl(200, 20%, 28%)" opacity="0.5" />
      <path d="M55,42 Q62,48 70,49 Q78,48 85,42 L83,50 Q77,54 70,55 Q63,54 57,50 Z" fill="hsl(220, 10%, 16%)" />
      {[0,1,2,3,4].map(i => (
        <circle key={i} cx={60 + i * 5} cy={46} r="1.2" fill="hsl(220, 8%, 10%)" />
      ))}
      <path d="M49,32 Q43,32 41,35 Q40,38 41,42" stroke="hsl(220, 8%, 18%)" strokeWidth="3" fill="none" />
      <path d="M91,32 Q97,32 99,35 Q100,38 99,42" stroke="hsl(220, 8%, 18%)" strokeWidth="3" fill="none" />
      {/* Neck */}
      <rect x="62" y="55" width="16" height="8" rx="3" fill="hsl(30, 60%, 75%)" />
      {/* Tuxedo collar & bow tie */}
      <path d="M55,62 L63,58 L70,64 L77,58 L85,62 L83,72 L57,72 Z" fill="hsl(0, 0%, 92%)" />
      <path d="M63,66 L67,63 L67,69 Z" fill="hsl(220, 15%, 8%)" />
      <path d="M77,66 L73,63 L73,69 Z" fill="hsl(220, 15%, 8%)" />
      <circle cx="70" cy="66" r="2.5" fill="hsl(220, 15%, 8%)" />
      {/* Tuxedo jacket */}
      <path d="M47,70 Q43,85 41,110 L41,135 L99,135 L99,110 Q97,85 93,70 Z" fill="hsl(220, 15%, 8%)" />
      <path d="M55,70 L60,90 L53,100 L47,75 Z" fill="hsl(220, 12%, 14%)" />
      <path d="M85,70 L80,90 L87,100 L93,75 Z" fill="hsl(220, 12%, 14%)" />
      <path d="M56,72 L59,86 L54,94 L49,76 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
      <path d="M84,72 L81,86 L86,94 L91,76 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
      <path d="M63,70 L65,135 L75,135 L77,70 Z" fill="hsl(0, 0%, 90%)" />
      <circle cx="70" cy="85" r="2" fill="hsl(220, 15%, 8%)" />
      <circle cx="70" cy="100" r="2" fill="hsl(220, 15%, 8%)" />
      <path d="M83,78 L89,76 L88,84 L82,83 Z" fill="hsl(0, 0%, 92%)" />
      {/* Firing arms + marker */}
      <path d="M49,76 Q29,70 13,58" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M87,74 Q67,60 23,54" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="13" cy="58" r="5" fill="hsl(30, 60%, 75%)" />
      <circle cx="23" cy="54" r="5" fill="hsl(30, 60%, 75%)" />
      <circle cx="19" cy="64" r="1.8" fill="hsl(45, 80%, 60%)" />
      <rect x="-13" y="48" width="50" height="9" rx="3" fill="hsl(220, 10%, 15%)" />
      <rect x="-23" y="50" width="14" height="5" rx="2" fill="hsl(220, 8%, 20%)" />
      <rect x="-27" y="51" width="5" height="3" rx="1" fill="hsl(220, 6%, 25%)" />
      <rect x="13" y="56" width="8" height="14" rx="2" fill="hsl(220, 10%, 12%)" />
      <path d="M17,58 Q21,62 17,68" stroke="hsl(220, 8%, 18%)" strokeWidth="1.5" fill="none" />
      <ellipse cx="23" cy="42" rx="12" ry="10" fill="hsl(220, 10%, 15%)" />
      <ellipse cx="23" cy="42" rx="10" ry="8" fill="hsl(220, 8%, 20%)" />
      <circle cx="19" cy="40" r="3" fill="hsl(25, 90%, 50%)" opacity="0.6" />
      <circle cx="25" cy="38" r="3" fill="hsl(25, 85%, 45%)" opacity="0.5" />
      <circle cx="23" cy="44" r="3" fill="hsl(25, 95%, 55%)" opacity="0.5" />
      <rect x="31" y="54" width="6" height="10" rx="2" fill="hsl(220, 6%, 25%)" />
      {/* Standing legs */}
      <path d="M53,133 Q51,175 49,240 L43,240 Q47,178 51,140" fill="hsl(220, 15%, 8%)" />
      <path d="M51,133 Q49,175 47,240" stroke="hsl(220, 10%, 18%)" strokeWidth="1.5" fill="none" />
      <path d="M35,238 Q37,232 47,232 Q53,232 53,238 Q53,244 43,244 Q33,244 35,238 Z" fill="hsl(220, 15%, 6%)" />
      <path d="M87,133 Q89,175 91,240 L97,240 Q93,178 89,140" fill="hsl(220, 15%, 8%)" />
      <path d="M89,133 Q91,175 93,240" stroke="hsl(220, 10%, 18%)" strokeWidth="1.5" fill="none" />
      <path d="M87,238 Q89,232 99,232 Q105,232 105,238 Q105,244 95,244 Q85,244 87,238 Z" fill="hsl(220, 15%, 6%)" />
    </svg>
  );
}

/* ── Barrel SVG with AI Background ────────────────────────────── */

function BarrelRifling() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.08))' }}>
      <defs>
        <clipPath id="barrelClip">
          <circle cx="200" cy="200" r="158" />
        </clipPath>
        <radialGradient id="barrelGrad" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="80%" stopColor="hsl(220, 10%, 12%)" stopOpacity="0.5" />
          <stop offset="95%" stopColor="hsl(220, 10%, 6%)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(220, 10%, 4%)" />
        </radialGradient>
        <radialGradient id="barrelShine" cx="35%" cy="30%" r="40%">
          <stop offset="0%" stopColor="hsl(220, 10%, 40%)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <pattern id="barrelBgPattern" patternUnits="objectBoundingBox" width="1" height="1">
          <image href={barrelBg} x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>

      {/* Background image visible through barrel */}
      <circle cx="200" cy="200" r="158" fill="url(#barrelBgPattern)" />

      {/* Subtle white overlay for brightness */}
      <circle cx="200" cy="200" r="158" fill="hsl(220, 5%, 90%)" opacity="0.35" />

      {/* Rifling grooves - more detailed */}
      {[...Array(8)].map((_, i) => {
        const angle = i * 45;
        const rad = (angle * Math.PI) / 180;
        return (
          <g key={i}>
            <line
              x1={200 + Math.cos(rad) * 100}
              y1={200 + Math.sin(rad) * 100}
              x2={200 + Math.cos(rad) * 200}
              y2={200 + Math.sin(rad) * 200}
              stroke="hsl(220, 10%, 20%)"
              strokeWidth="4"
              opacity="0.5"
            />
            {/* Parallel groove line */}
            <line
              x1={200 + Math.cos(rad + 0.04) * 110}
              y1={200 + Math.sin(rad + 0.04) * 110}
              x2={200 + Math.cos(rad + 0.04) * 195}
              y2={200 + Math.sin(rad + 0.04) * 195}
              stroke="hsl(220, 10%, 28%)"
              strokeWidth="1.5"
              opacity="0.3"
            />
          </g>
        );
      })}

      {/* Depth shadow */}
      <circle cx="200" cy="200" r="160" fill="url(#barrelGrad)" />
      {/* Metallic shine highlight */}
      <circle cx="200" cy="200" r="158" fill="url(#barrelShine)" />

      {/* Outer barrel rim - multi-layered for realism */}
      <circle cx="200" cy="200" r="160" fill="none" stroke="hsl(220, 8%, 12%)" strokeWidth="10" />
      <circle cx="200" cy="200" r="155" fill="none" stroke="hsl(220, 10%, 22%)" strokeWidth="2" />
      <circle cx="200" cy="200" r="164" fill="none" stroke="hsl(220, 8%, 8%)" strokeWidth="3" />
    </svg>
  );
}

/* ── Paint Splat ──────────────────────────────────────────────── */

function PaintSplat() {
  const drops = useMemo(() =>
    [...Array(20)].map((_, i) => ({
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 6 + Math.random() * 25,
      stretch: 1 + Math.random() * 0.8,
      hue: 20 + Math.random() * 15,
      lightness: 38 + Math.random() * 20,
      delay: 0.05 + i * 0.025,
    })), []
  );

  return (
    <div className="absolute inset-0">
      {/* Main paint drip */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ animation: 'paint-drip-down 1.0s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
      >
        <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="w-full" style={{ height: '120vh' }}>
          <defs>
            <linearGradient id="paintDrip" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(25, 95%, 53%)" />
              <stop offset="50%" stopColor="hsl(20, 90%, 42%)" />
              <stop offset="100%" stopColor="hsl(15, 85%, 30%)" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L100,0 L100,80 Q95,82 92,95 Q90,100 88,82 Q84,90 80,80 Q76,92 72,78 Q68,88 64,82 Q60,98 56,80 Q52,90 48,84 Q44,96 40,78 Q36,88 32,82 Q28,94 24,78 Q20,86 16,80 Q12,92 8,78 Q4,88 0,82 Z"
            fill="url(#paintDrip)"
          />
        </svg>
      </div>

      {/* Splat center */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ animation: 'splat-burst 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <svg viewBox="0 0 400 400" className="w-[85vmin] h-[85vmin]">
          <defs>
            <radialGradient id="splatCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(30, 95%, 60%)" />
              <stop offset="40%" stopColor="hsl(25, 95%, 50%)" />
              <stop offset="80%" stopColor="hsl(20, 90%, 40%)" />
              <stop offset="100%" stopColor="hsl(15, 85%, 32%)" />
            </radialGradient>
          </defs>
          <path
            d="M200,70 Q250,50 270,100 Q320,60 300,140 Q365,120 320,195 Q380,215 305,245 Q350,300 275,285 Q290,350 225,315 Q215,370 185,315 Q140,360 135,280 Q70,310 95,240 Q30,225 95,190 Q40,135 115,148 Q70,75 155,108 Q155,50 200,70Z"
            fill="url(#splatCenter)"
          />
          {/* Highlight/wet sheen */}
          <ellipse cx="190" cy="180" rx="60" ry="40" fill="hsl(30, 100%, 65%)" opacity="0.3" />
        </svg>
      </div>

      {/* Splatter drops */}
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: d.size,
            height: d.size * d.stretch,
            background: `radial-gradient(circle at 35% 35%, hsl(${d.hue}, 95%, ${d.lightness + 10}%), hsl(${d.hue}, 90%, ${d.lightness}%))`,
            left: `${d.x}%`,
            top: `${d.y}%`,
            opacity: 0,
            animation: `drop-appear 0.25s ${d.delay}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main SplashScreen ────────────────────────────────────────── */

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('dot');

  const stableOnComplete = useCallback(onComplete, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('barrel'), 1600),
      setTimeout(() => setPhase('turn'), 4200),
      setTimeout(() => setPhase('fire'), 4900),
      setTimeout(() => setPhase('splat'), 5300),
      setTimeout(() => setPhase('collapse'), 6600),
      setTimeout(() => setPhase('done'), 7800),
      setTimeout(() => stableOnComplete(), 8200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [stableOnComplete]);

  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none" style={{ animation: 'bond-fade-out 0.4s ease-in forwards' }}>
        <div className="absolute inset-0 bg-black" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      style={{
        animation: phase === 'fire' ? 'camera-shake 0.35s ease-out' : undefined,
      }}
    >
      {/* ─── Phase 1: White tracking dot ─── */}
      {phase === 'dot' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full bg-white"
            style={{
              boxShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.3)',
              animation: 'dot-travel 1.6s ease-in-out forwards',
            }}
          />
        </div>
      )}

      {/* ─── Phases 2-6: Barrel + figure ─── */}
      {phase !== 'dot' && (
        <>
          {/* Barrel rifling circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative"
              style={{
                width: '90vmin',
                height: '90vmin',
                ...(phase === 'barrel' ? {
                  animation: 'barrel-track 2.6s ease-in-out forwards',
                } : phase === 'turn' ? {
                  animation: 'barrel-center 0.5s ease-out forwards',
                } : phase === 'collapse' ? {
                  animation: 'barrel-collapse 1.2s ease-in forwards',
                } : {}),
              }}
            >
              <BarrelRifling />
            </div>
          </div>

          {/* Black vignette mask */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 28%, black 32%)',
            ...(phase === 'barrel' ? {
              animation: 'mask-track 2.6s ease-in-out forwards',
            } : phase === 'turn' ? {
              animation: 'mask-center 0.5s ease-out forwards',
            } : phase === 'collapse' ? {
              animation: 'mask-collapse 1.2s ease-in forwards',
            } : {}),
          }} />

          {/* Dust particles inside barrel during walk */}
          {(phase === 'barrel' || phase === 'turn') && <DustParticles />}

          {/* Silhouette */}
          {phase !== 'collapse' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                ...(phase === 'barrel' ? {
                  animation: 'figure-walk 2.6s ease-in-out forwards',
                } : phase === 'turn' ? {
                  animation: 'figure-turn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                } : phase === 'fire' ? {
                  animation: 'figure-fire 0.35s ease-out forwards',
                } : phase === 'splat' ? {
                  animation: 'figure-after-fire 0.4s ease-out forwards',
                } : {}),
              }}
            >
              {phase === 'barrel' ? <WalkingSilhouette /> : <FacingSilhouette />}
            </div>
          )}

          {/* Muzzle flash - larger, more dramatic */}
          {phase === 'fire' && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="w-10 h-10 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(50, 100%, 85%) 0%, hsl(40, 100%, 65%) 30%, hsl(25, 95%, 53%) 60%, transparent 100%)',
                  boxShadow: '0 0 40px hsl(40, 100%, 60%, 0.9), 0 0 80px hsl(25, 95%, 53%, 0.5), 0 0 120px hsl(25, 95%, 53%, 0.2)',
                  animation: 'muzzle-flash 0.35s ease-out forwards',
                }}
              />
            </div>
          )}

          {/* Paintball projectile */}
          {phase === 'fire' && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, hsl(30, 100%, 65%) 0%, hsl(25, 95%, 50%) 50%, hsl(20, 90%, 35%) 100%)',
                boxShadow: '0 0 20px hsl(25, 95%, 53%, 0.9), inset 0 -2px 4px hsl(20, 80%, 30%)',
                animation: 'paintball-approach 0.4s cubic-bezier(0.2, 0, 1, 1) forwards',
              }}
            />
          )}

          {/* Screen flash on impact */}
          {phase === 'splat' && (
            <div
              className="absolute inset-0"
              style={{
                background: 'hsl(30, 100%, 65%)',
                animation: 'impact-flash 0.15s ease-out forwards',
              }}
            />
          )}

          {/* Paint splat */}
          {(phase === 'splat' || phase === 'collapse') && <PaintSplat />}

          {/* Logo reveal on splat */}
          {(phase === 'splat' || phase === 'collapse') && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
              style={{ animation: 'logo-reveal 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <img
                src={logo}
                alt="Find A Walk-On"
                className="w-28 h-28 md:w-36 md:h-36 drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.8))', animation: 'logo-pulse-glow 2s 0.9s ease-in-out infinite' }}
              />
              <h1
                className="text-2xl md:text-3xl font-black tracking-wider text-white mt-3"
                style={{
                  textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)',
                  animation: 'logo-text-reveal 0.5s 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}
              >
                FIND A WALK-ON
              </h1>
            </div>
          )}
        </>
      )}

      <style>{`
        /* ── Phase 1: Dot ── */
        @keyframes dot-travel {
          0% { transform: translateX(-45vw) scale(0.6); opacity: 0; }
          5% { opacity: 1; }
          50% { transform: translateX(0) scale(1); }
          100% { transform: translateX(45vw) scale(0.8); opacity: 1; }
        }

        /* ── Phase 2: Barrel tracks ── */
        @keyframes barrel-track {
          0% { transform: translateX(30vw) scale(0); opacity: 0; }
          6% { transform: translateX(28vw) scale(1); opacity: 1; }
          100% { transform: translateX(-30vw) scale(1); }
        }
        @keyframes mask-track {
          0% { background: radial-gradient(circle at 70% 50%, transparent 0%, black 3%); }
          6% { background: radial-gradient(circle at 68% 50%, transparent 28%, black 32%); }
          100% { background: radial-gradient(circle at 30% 50%, transparent 28%, black 32%); }
        }
        @keyframes figure-walk {
          0% { transform: translateX(35vw); }
          100% { transform: translateX(-35vw); }
        }

        /* ── Phase 3: Center & turn ── */
        @keyframes barrel-center {
          to { transform: translateX(0) scale(1); }
        }
        @keyframes mask-center {
          to { background: radial-gradient(circle at 50% 50%, transparent 28%, black 32%); }
        }
        @keyframes figure-turn {
          0% { transform: translateX(-35vw) scaleX(1); }
          60% { transform: translateX(-5vw) scaleX(1); }
          75% { transform: translateX(0) scaleX(0.1); }
          100% { transform: translateX(0) scaleX(1); }
        }

        /* ── Phase 4: Fire ── */
        @keyframes figure-fire {
          0% { transform: translateX(0) scale(1); }
          30% { transform: translateX(3vw) scale(1.04); }
          60% { transform: translateX(1vw) scale(1.01); }
          100% { transform: translateX(0) scale(1); }
        }
        @keyframes figure-after-fire {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.85); }
        }
        @keyframes muzzle-flash {
          0% { transform: scale(1); opacity: 1; }
          40% { transform: scale(3); opacity: 0.8; }
          100% { transform: scale(6); opacity: 0; }
        }
        @keyframes paintball-approach {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(25); opacity: 0; }
        }
        @keyframes camera-shake {
          0% { transform: translate(0, 0); }
          10% { transform: translate(-4px, 3px); }
          20% { transform: translate(5px, -4px); }
          30% { transform: translate(-3px, 5px); }
          40% { transform: translate(4px, -2px); }
          50% { transform: translate(-2px, 3px); }
          60% { transform: translate(3px, -3px); }
          70% { transform: translate(-1px, 2px); }
          80% { transform: translate(1px, -1px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes impact-flash {
          0% { opacity: 0.7; }
          100% { opacity: 0; }
        }

        /* ── Phase 5: Paint ── */
        @keyframes paint-drip-down {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(0); }
        }
        @keyframes splat-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes drop-appear {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 0.9; }
        }

        /* ── Phase 6: Collapse ── */
        @keyframes barrel-collapse {
          0% { transform: translateX(0) scale(1); }
          20% { transform: translateX(10vw) scale(0.92); }
          45% { transform: translateX(-8vw) scale(0.8); }
          65% { transform: translateX(5vw) scale(0.5); }
          85% { transform: translateX(-2vw) scale(0.15); }
          100% { transform: translateX(0) scale(0); }
        }
        @keyframes mask-collapse {
          0% { background: radial-gradient(circle at 50% 50%, transparent 28%, black 32%); }
          20% { background: radial-gradient(circle at 60% 50%, transparent 25%, black 29%); }
          45% { background: radial-gradient(circle at 42% 50%, transparent 18%, black 22%); }
          65% { background: radial-gradient(circle at 55% 50%, transparent 8%, black 12%); }
          85% { background: radial-gradient(circle at 48% 50%, transparent 2%, black 5%); }
          100% { background: radial-gradient(circle at 50% 50%, transparent 0%, black 1%); }
        }

        /* ── Phase 7: Fade ── */
        @keyframes bond-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ── Walking animations ── */
        @keyframes leg-stride-left {
          0% { transform: rotate(-10deg); transform-origin: 38px 134px; }
          100% { transform: rotate(10deg); transform-origin: 38px 134px; }
        }
        @keyframes leg-stride-right {
          0% { transform: rotate(10deg); transform-origin: 62px 134px; }
          100% { transform: rotate(-10deg); transform-origin: 62px 134px; }
        }
        @keyframes arm-swing-left {
          0% { transform: rotate(8deg); transform-origin: 36px 68px; }
          100% { transform: rotate(-8deg); transform-origin: 36px 68px; }
        }
        @keyframes arm-swing-right {
          0% { transform: rotate(-8deg); transform-origin: 64px 68px; }
          100% { transform: rotate(8deg); transform-origin: 64px 68px; }
        }

        /* ── Logo reveal ── */
        @keyframes logo-reveal {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes logo-text-reveal {
          0% { transform: translateY(20px); opacity: 0; letter-spacing: 0.5em; }
          100% { transform: translateY(0); opacity: 1; letter-spacing: 0.15em; }
        }
        @keyframes logo-pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(0,0,0,0.8)); }
          50% { filter: drop-shadow(0 0 45px rgba(255,165,0,0.6)) drop-shadow(0 0 80px rgba(255,165,0,0.3)); }
        }

        /* ── Dust particles ── */
        @keyframes dust-float {
          0% { opacity: 0; transform: translate(0, 0); }
          20% { opacity: var(--dust-opacity, 0.2); }
          50% { transform: translate(-10px, -15px); }
          80% { opacity: var(--dust-opacity, 0.2); }
          100% { opacity: 0; transform: translate(-20px, -30px); }
        }
      `}</style>
    </div>
  );
}
