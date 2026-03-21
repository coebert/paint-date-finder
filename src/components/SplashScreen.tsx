import { useState, useEffect, useCallback } from 'react';

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

/* ── Silhouette Sub-component ─────────────────────────────────── */

function Silhouette({ phase }: { phase: Phase }) {
  const isFacing = phase === 'turn' || phase === 'fire' || phase === 'splat' || phase === 'collapse';

  return (
    <svg
      viewBox="0 0 140 320"
      className="h-[55vmin]"
      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
    >
      <g style={{
        transform: isFacing ? 'scaleX(-1) translateX(-140px)' : undefined,
      }}>
        {/* Head */}
        <ellipse cx="65" cy="38" rx="20" ry="23" fill="hsl(220, 15%, 8%)" />

        {/* Paintball mask */}
        <path d="M45,28 Q44,18 55,14 Q65,11 75,14 Q86,18 85,28 L86,42 Q86,52 75,55 Q65,57 55,55 Q44,52 44,42 Z" fill="hsl(220, 8%, 22%)" />
        <path d="M48,24 Q48,20 58,18 Q65,17 72,18 Q82,20 82,24 L82,36 Q82,40 72,42 Q65,43 58,42 Q48,40 48,36 Z" fill="hsl(200, 15%, 12%)" />
        <path d="M52,22 Q56,20 64,20 Q68,20 70,22 L69,30 Q65,31 58,31 Q54,30 52,28 Z" fill="hsl(200, 20%, 28%)" opacity="0.5" />
        <path d="M50,42 Q57,48 65,49 Q73,48 80,42 L78,50 Q72,54 65,55 Q58,54 52,50 Z" fill="hsl(220, 10%, 16%)" />
        {[0,1,2,3,4].map(i => (
          <circle key={i} cx={55 + i * 5} cy={46} r="1.2" fill="hsl(220, 8%, 10%)" />
        ))}
        <path d="M44,32 Q38,32 36,35 Q35,38 36,42" stroke="hsl(220, 8%, 18%)" strokeWidth="3" fill="none" />
        <path d="M86,32 Q92,32 94,35 Q95,38 94,42" stroke="hsl(220, 8%, 18%)" strokeWidth="3" fill="none" />

        {/* Neck */}
        <rect x="57" y="55" width="16" height="8" rx="3" fill="hsl(30, 60%, 75%)" />

        {/* Tuxedo collar & bow tie */}
        <path d="M50,62 L58,58 L65,64 L72,58 L80,62 L78,72 L52,72 Z" fill="hsl(0, 0%, 92%)" />
        <path d="M58,66 L62,63 L62,69 Z" fill="hsl(220, 15%, 8%)" />
        <path d="M72,66 L68,63 L68,69 Z" fill="hsl(220, 15%, 8%)" />
        <circle cx="65" cy="66" r="2.5" fill="hsl(220, 15%, 8%)" />

        {/* Tuxedo jacket */}
        <path d="M42,70 Q38,85 36,110 L36,135 L94,135 L94,110 Q92,85 88,70 Z" fill="hsl(220, 15%, 8%)" />
        <path d="M50,70 L55,90 L48,100 L42,75 Z" fill="hsl(220, 12%, 14%)" />
        <path d="M80,70 L75,90 L82,100 L88,75 Z" fill="hsl(220, 12%, 14%)" />
        <path d="M51,72 L54,86 L49,94 L44,76 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
        <path d="M79,72 L76,86 L81,94 L86,76 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
        <path d="M58,70 L60,135 L70,135 L72,70 Z" fill="hsl(0, 0%, 90%)" />
        <circle cx="65" cy="85" r="2" fill="hsl(220, 15%, 8%)" />
        <circle cx="65" cy="100" r="2" fill="hsl(220, 15%, 8%)" />
        <path d="M78,78 L84,76 L83,84 L77,83 Z" fill="hsl(0, 0%, 92%)" />

        {/* Arms */}
        {phase === 'barrel' ? (
          <>
            <g style={{ animation: 'arm-swing-left 0.6s ease-in-out infinite alternate' }}>
              <path d="M42,74 Q22,90 26,120" stroke="hsl(220, 15%, 8%)" strokeWidth="14" fill="none" strokeLinecap="round" />
              <circle cx="26" cy="122" r="6" fill="hsl(30, 60%, 75%)" />
              <circle cx="30" cy="114" r="2" fill="hsl(45, 80%, 60%)" />
            </g>
            <g style={{ animation: 'arm-swing-right 0.6s ease-in-out infinite alternate' }}>
              <path d="M88,74 Q108,86 100,115" stroke="hsl(220, 15%, 8%)" strokeWidth="14" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="117" r="6" fill="hsl(30, 60%, 75%)" />
              <circle cx="96" cy="109" r="2" fill="hsl(45, 80%, 60%)" />
            </g>
          </>
        ) : (
          <>
            {/* Firing pose arms + paintball marker */}
            <path d="M44,76 Q24,70 8,58" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
            <path d="M82,74 Q62,60 18,54" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
            <circle cx="8" cy="58" r="5" fill="hsl(30, 60%, 75%)" />
            <circle cx="18" cy="54" r="5" fill="hsl(30, 60%, 75%)" />
            <circle cx="14" cy="64" r="1.8" fill="hsl(45, 80%, 60%)" />
            <rect x="-18" y="48" width="50" height="9" rx="3" fill="hsl(220, 10%, 15%)" />
            <rect x="-28" y="50" width="14" height="5" rx="2" fill="hsl(220, 8%, 20%)" />
            <rect x="-32" y="51" width="5" height="3" rx="1" fill="hsl(220, 6%, 25%)" />
            <rect x="8" y="56" width="8" height="14" rx="2" fill="hsl(220, 10%, 12%)" />
            <path d="M12,58 Q16,62 12,68" stroke="hsl(220, 8%, 18%)" strokeWidth="1.5" fill="none" />
            <ellipse cx="18" cy="42" rx="12" ry="10" fill="hsl(220, 10%, 15%)" />
            <ellipse cx="18" cy="42" rx="10" ry="8" fill="hsl(220, 8%, 20%)" />
            <circle cx="14" cy="40" r="3" fill="hsl(25, 90%, 50%)" opacity="0.6" />
            <circle cx="20" cy="38" r="3" fill="hsl(25, 85%, 45%)" opacity="0.5" />
            <circle cx="18" cy="44" r="3" fill="hsl(25, 95%, 55%)" opacity="0.5" />
            <rect x="26" y="54" width="6" height="10" rx="2" fill="hsl(220, 6%, 25%)" />
          </>
        )}

        {/* Legs */}
        <g style={phase === 'barrel' ? { animation: 'leg-stride-left 0.6s ease-in-out infinite alternate' } : undefined}>
          <path d={phase === 'barrel'
            ? "M48,133 Q44,175 36,235 L30,235 Q40,178 46,140"
            : "M48,133 Q46,175 44,235 L38,235 Q42,178 46,140"
          } fill="hsl(220, 15%, 8%)" />
          <path d={phase === 'barrel'
            ? "M46,133 Q42,175 34,235"
            : "M46,133 Q44,175 42,235"
          } stroke="hsl(220, 10%, 18%)" strokeWidth="1.5" fill="none" />
          <path d={phase === 'barrel'
            ? "M20,233 Q22,228 32,228 Q38,228 38,233 Q38,240 28,240 Q18,240 20,233 Z"
            : "M30,233 Q32,228 42,228 Q48,228 48,233 Q48,240 38,240 Q28,240 30,233 Z"
          } fill="hsl(220, 15%, 6%)" />
          <ellipse cx={phase === 'barrel' ? "28" : "38"} cy="234" rx="6" ry="2" fill="hsl(220, 10%, 14%)" opacity="0.4" />
        </g>
        <g style={phase === 'barrel' ? { animation: 'leg-stride-right 0.6s ease-in-out infinite alternate' } : undefined}>
          <path d={phase === 'barrel'
            ? "M82,133 Q88,175 98,235 L104,235 Q92,178 84,140"
            : "M82,133 Q86,175 88,235 L94,235 Q88,178 84,140"
          } fill="hsl(220, 15%, 8%)" />
          <path d={phase === 'barrel'
            ? "M84,133 Q90,175 100,235"
            : "M84,133 Q88,175 90,235"
          } stroke="hsl(220, 10%, 18%)" strokeWidth="1.5" fill="none" />
          <path d={phase === 'barrel'
            ? "M94,233 Q96,228 106,228 Q112,228 112,233 Q112,240 102,240 Q92,240 94,233 Z"
            : "M84,233 Q86,228 96,228 Q102,228 102,233 Q102,240 92,240 Q82,240 84,233 Z"
          } fill="hsl(220, 15%, 6%)" />
          <ellipse cx={phase === 'barrel' ? "102" : "92"} cy="234" rx="6" ry="2" fill="hsl(220, 10%, 14%)" opacity="0.4" />
        </g>
      </g>
    </svg>
  );
}

/* ── Barrel SVG Sub-component ─────────────────────────────────── */

function BarrelRifling() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }}>
      <defs>
        <radialGradient id="barrelGrad" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="transparent" />
          <stop offset="85%" stopColor="hsl(220, 10%, 15%)" />
          <stop offset="100%" stopColor="hsl(220, 10%, 8%)" />
        </radialGradient>
      </defs>
      {/* White view through barrel */}
      <circle cx="200" cy="200" r="160" fill="hsl(220, 5%, 90%)" />
      {/* Rifling grooves */}
      {[...Array(8)].map((_, i) => {
        const angle = i * 45;
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={200 + Math.cos(rad) * 120}
            y1={200 + Math.sin(rad) * 120}
            x2={200 + Math.cos(rad) * 200}
            y2={200 + Math.sin(rad) * 200}
            stroke="hsl(220, 10%, 25%)"
            strokeWidth="3"
            opacity="0.6"
          />
        );
      })}
      {/* Inner shadow */}
      <circle cx="200" cy="200" r="160" fill="url(#barrelGrad)" />
      {/* Rim */}
      <circle cx="200" cy="200" r="160" fill="none" stroke="hsl(220, 10%, 20%)" strokeWidth="8" />
      <circle cx="200" cy="200" r="155" fill="none" stroke="hsl(220, 10%, 30%)" strokeWidth="2" />
    </svg>
  );
}

/* ── Paint Splat Sub-component ────────────────────────────────── */

function PaintSplat() {
  return (
    <div className="absolute inset-0">
      {/* Main paint drip from top */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ animation: 'paint-drip-down 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
      >
        <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="w-full" style={{ height: '120vh' }}>
          <defs>
            <linearGradient id="paintDrip" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(25, 95%, 53%)" />
              <stop offset="70%" stopColor="hsl(25, 85%, 45%)" />
              <stop offset="100%" stopColor="hsl(25, 80%, 35%)" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L100,0 L100,80 Q90,85 85,95 Q82,100 80,80 Q75,88 70,82 Q65,90 60,78 Q55,95 50,85 Q45,100 40,82 Q35,92 30,80 Q25,88 20,85 Q15,95 10,80 Q5,90 0,82 Z"
            fill="url(#paintDrip)"
          />
        </svg>
      </div>

      {/* Splat impact center */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ animation: 'splat-burst 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <svg viewBox="0 0 400 400" className="w-[80vmin] h-[80vmin]">
          <defs>
            <radialGradient id="splatCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(25, 95%, 58%)" />
              <stop offset="60%" stopColor="hsl(25, 95%, 48%)" />
              <stop offset="100%" stopColor="hsl(25, 80%, 38%)" />
            </radialGradient>
          </defs>
          <path
            d="M200,80 Q240,60 260,100 Q310,70 290,140 Q350,130 310,190 Q370,210 300,240 Q340,290 270,280 Q280,340 220,310 Q210,360 180,310 Q140,350 140,280 Q80,300 100,240 Q40,220 100,190 Q50,140 120,150 Q80,80 160,110 Q160,60 200,80Z"
            fill="url(#splatCenter)"
          />
        </svg>
      </div>

      {/* Small splatter drops */}
      {[...Array(15)].map((_, i) => {
        const x = 20 + Math.random() * 60;
        const y = 20 + Math.random() * 60;
        const size = 8 + Math.random() * 20;
        const delay = 0.1 + i * 0.03;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size * (1 + Math.random() * 0.5),
              background: `hsl(25, ${85 + Math.random() * 10}%, ${42 + Math.random() * 16}%)`,
              left: `${x}%`,
              top: `${y}%`,
              opacity: 0,
              animation: `drop-appear 0.3s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Main SplashScreen ────────────────────────────────────────── */

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('dot');

  const stableOnComplete = useCallback(onComplete, [onComplete]);

  useEffect(() => {
    // Timings designed to match the classic ~7s gun barrel sequence
    const timers = [
      // Dot travels across screen
      setTimeout(() => setPhase('barrel'), 1800),
      // Walking across the barrel view
      setTimeout(() => setPhase('turn'), 4400),
      // Turns and aims
      setTimeout(() => setPhase('fire'), 5200),
      // Paintball fires
      setTimeout(() => setPhase('splat'), 5600),
      // Paint washes down
      setTimeout(() => setPhase('collapse'), 7000),
      // Barrel sways & shrinks
      setTimeout(() => setPhase('done'), 8200),
      // Unmount
      setTimeout(() => stableOnComplete(), 8600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [stableOnComplete]);

  /* Phase 7: done – fast fade out */
  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none" style={{ animation: 'bond-fade-out 0.4s ease-in forwards' }}>
        <div className="absolute inset-0 bg-black" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">

      {/* ─── Phase 1: White tracking dot ─── */}
      {phase === 'dot' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-4 h-4 rounded-full bg-white"
            style={{
              boxShadow: '0 0 12px rgba(255,255,255,0.6)',
              animation: 'dot-travel 1.8s ease-in-out forwards',
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
                  animation: 'barrel-center 0.6s ease-out forwards',
                } : phase === 'collapse' ? {
                  animation: 'barrel-collapse 1.2s ease-in forwards',
                } : {}),
              }}
            >
              <BarrelRifling />
            </div>
          </div>

          {/* Black vignette mask around barrel */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: phase === 'collapse'
              ? 'radial-gradient(circle at 50% 50%, transparent 28%, black 32%)'
              : 'radial-gradient(circle at 50% 50%, transparent 28%, black 32%)',
            ...(phase === 'barrel' ? {
              animation: 'mask-track 2.6s ease-in-out forwards',
            } : phase === 'turn' ? {
              animation: 'mask-center 0.6s ease-out forwards',
            } : phase === 'collapse' ? {
              animation: 'mask-collapse 1.2s ease-in forwards',
            } : {}),
          }} />

          {/* Walking / firing silhouette */}
          {phase !== 'collapse' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                ...(phase === 'barrel' ? {
                  animation: 'figure-walk 2.6s ease-in-out forwards',
                } : phase === 'turn' ? {
                  animation: 'figure-turn 0.6s ease-out forwards',
                } : phase === 'fire' ? {
                  animation: 'figure-fire 0.3s ease-out forwards',
                } : phase === 'splat' ? {
                  animation: 'figure-after-fire 0.3s ease-out forwards',
                } : {}),
              }}
            >
              <Silhouette phase={phase} />
            </div>
          )}

          {/* Muzzle flash */}
          {phase === 'fire' && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="w-8 h-8 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(45, 100%, 70%) 0%, hsl(25, 95%, 53%) 50%, transparent 100%)',
                  boxShadow: '0 0 30px hsl(25, 95%, 53%, 0.8), 0 0 60px hsl(25, 95%, 53%, 0.4)',
                  animation: 'muzzle-flash 0.3s ease-out forwards',
                }}
              />
            </div>
          )}

          {/* Paintball projectile */}
          {phase === 'fire' && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(25, 95%, 60%) 0%, hsl(25, 95%, 40%) 100%)',
                boxShadow: '0 0 15px hsl(25, 95%, 53%, 0.8)',
                animation: 'paintball-approach 0.4s cubic-bezier(0.2, 0, 1, 1) forwards',
              }}
            />
          )}

          {/* Paint splat */}
          {phase === 'splat' && <PaintSplat />}

          {/* Collapse phase: barrel sways then shrinks with paint still visible */}
          {phase === 'collapse' && <PaintSplat />}
        </>
      )}

      <style>{`
        /* ── Phase 1: Dot travels left to right ── */
        @keyframes dot-travel {
          0% { transform: translateX(-45vw) scale(0.8); opacity: 0; }
          5% { opacity: 1; }
          100% { transform: translateX(45vw) scale(1); opacity: 1; }
        }

        /* ── Phase 2: Barrel tracks with figure (right to left) ── */
        @keyframes barrel-track {
          0% { transform: translateX(30vw) scale(0); opacity: 0; }
          8% { transform: translateX(28vw) scale(1); opacity: 1; }
          100% { transform: translateX(-30vw) scale(1); }
        }
        @keyframes mask-track {
          0% { background: radial-gradient(circle at 70% 50%, transparent 0%, black 3%); }
          8% { background: radial-gradient(circle at 68% 50%, transparent 28%, black 32%); }
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
          0% { transform: translateX(-35vw); }
          100% { transform: translateX(0); }
        }

        /* ── Phase 4: Fire recoil ── */
        @keyframes figure-fire {
          0% { transform: translateX(0) scale(1); }
          50% { transform: translateX(2vw) scale(1.02); }
          100% { transform: translateX(0) scale(1); }
        }
        @keyframes figure-after-fire {
          to { opacity: 0; transform: scale(0.9); }
        }
        @keyframes muzzle-flash {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes paintball-approach {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(20); opacity: 0; }
        }

        /* ── Phase 5: Paint splat ── */
        @keyframes paint-drip-down {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(0); }
        }
        @keyframes splat-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes drop-appear {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 0.85; }
        }

        /* ── Phase 6: Barrel sways and collapses ── */
        @keyframes barrel-collapse {
          0% { transform: translateX(0) scale(1); }
          25% { transform: translateX(8vw) scale(0.95); }
          50% { transform: translateX(-6vw) scale(0.85); }
          75% { transform: translateX(3vw) scale(0.5); }
          100% { transform: translateX(0) scale(0); }
        }
        @keyframes mask-collapse {
          0% { background: radial-gradient(circle at 50% 50%, transparent 28%, black 32%); }
          25% { background: radial-gradient(circle at 58% 50%, transparent 26%, black 30%); }
          50% { background: radial-gradient(circle at 44% 50%, transparent 20%, black 24%); }
          75% { background: radial-gradient(circle at 53% 50%, transparent 10%, black 14%); }
          100% { background: radial-gradient(circle at 50% 50%, transparent 0%, black 2%); }
        }

        /* ── Phase 7: Final fade ── */
        @keyframes bond-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ── Walking animations ── */
        @keyframes leg-stride-left {
          0% { transform: rotate(-8deg); transform-origin: 48px 133px; }
          100% { transform: rotate(8deg); transform-origin: 48px 133px; }
        }
        @keyframes leg-stride-right {
          0% { transform: rotate(8deg); transform-origin: 82px 133px; }
          100% { transform: rotate(-8deg); transform-origin: 82px 133px; }
        }
        @keyframes arm-swing-left {
          0% { transform: rotate(6deg); transform-origin: 42px 74px; }
          100% { transform: rotate(-6deg); transform-origin: 42px 74px; }
        }
        @keyframes arm-swing-right {
          0% { transform: rotate(-6deg); transform-origin: 88px 74px; }
          100% { transform: rotate(6deg); transform-origin: 88px 74px; }
        }
      `}</style>
    </div>
  );
}
