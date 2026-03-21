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

function WalkingSilhouette() {
  /* Side-profile view: figure walking left, seen from the side */
  return (
    <svg viewBox="0 0 120 320" className="h-[55vmin]" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
      {/* Head - side profile (narrower, facing left) */}
      <ellipse cx="50" cy="38" rx="16" ry="22" fill="hsl(220, 15%, 8%)" />

      {/* Paintball mask - side profile */}
      <path d="M34,20 Q36,10 50,10 Q60,12 62,20 L64,38 Q64,50 55,54 Q48,56 38,52 Q32,48 32,38 Z" fill="hsl(220, 8%, 22%)" />
      {/* Visor - side view, narrower */}
      <path d="M34,22 Q38,16 50,15 Q58,16 60,22 L60,34 Q58,40 50,42 Q40,40 36,34 Z" fill="hsl(200, 15%, 12%)" />
      {/* Visor reflection */}
      <path d="M38,22 Q44,18 52,18 L52,28 Q46,30 40,28 Z" fill="hsl(200, 20%, 28%)" opacity="0.4" />
      {/* Mask vent - side */}
      <path d="M36,42 Q44,50 54,50 L52,54 Q44,56 38,52 Z" fill="hsl(220, 10%, 16%)" />
      {/* Vent holes */}
      {[0,1,2].map(i => (
        <circle key={i} cx={40 + i * 5} cy={46} r="1" fill="hsl(220, 8%, 10%)" />
      ))}
      {/* Mask strap going back */}
      <path d="M62,30 Q70,30 72,34 Q73,38 72,42" stroke="hsl(220, 8%, 18%)" strokeWidth="2.5" fill="none" />

      {/* Neck */}
      <rect x="44" y="54" width="12" height="8" rx="3" fill="hsl(30, 60%, 75%)" />

      {/* Tuxedo jacket - side profile (narrower torso) */}
      <path d="M32,62 Q28,80 26,110 L26,136 L74,136 L74,110 Q72,80 68,62 Z" fill="hsl(220, 15%, 8%)" />
      {/* Lapel edge visible from side */}
      <path d="M38,62 L42,82 L36,90 L32,68 Z" fill="hsl(220, 12%, 14%)" />
      <path d="M38,63 L41,78 L37,86 L34,69 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
      {/* White shirt strip (partial, side view) */}
      <path d="M42,64 L44,136 L52,136 L50,64 Z" fill="hsl(0, 0%, 90%)" opacity="0.5" />
      {/* Button */}
      <circle cx="47" cy="90" r="1.5" fill="hsl(220, 15%, 8%)" />
      {/* Jacket tail/vent at back */}
      <path d="M68,120 L74,136 L70,136 L66,124 Z" fill="hsl(220, 12%, 14%)" />

      {/* Front arm (closer to viewer) with swing animation */}
      <g style={{ animation: 'arm-swing-left 0.6s ease-in-out infinite alternate' }}>
        <path d="M36,68 Q20,88 22,116" stroke="hsl(220, 15%, 8%)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="22" cy="118" r="5" fill="hsl(30, 60%, 75%)" />
        {/* Cufflink */}
        <circle cx="26" cy="110" r="1.5" fill="hsl(45, 80%, 60%)" />
      </g>

      {/* Back arm (further from viewer) with opposite swing */}
      <g style={{ animation: 'arm-swing-right 0.6s ease-in-out infinite alternate' }}>
        <path d="M64,68 Q78,84 76,112" stroke="hsl(220, 15%, 8%)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
        <circle cx="76" cy="114" r="4.5" fill="hsl(30, 50%, 65%)" />
      </g>

      {/* Front leg with stride */}
      <g style={{ animation: 'leg-stride-left 0.6s ease-in-out infinite alternate' }}>
        <path d="M38,134 Q32,175 24,240 L18,240 Q28,178 36,140" fill="hsl(220, 15%, 8%)" />
        {/* Trouser crease */}
        <path d="M36,136 Q30,175 22,240" stroke="hsl(220, 10%, 18%)" strokeWidth="1" fill="none" />
        {/* Shoe */}
        <path d="M10,238 Q12,232 20,232 Q26,232 26,238 Q26,244 16,244 Q8,244 10,238 Z" fill="hsl(220, 15%, 6%)" />
        <ellipse cx="16" cy="239" rx="5" ry="1.5" fill="hsl(220, 10%, 14%)" opacity="0.4" />
      </g>

      {/* Back leg with opposite stride */}
      <g style={{ animation: 'leg-stride-right 0.6s ease-in-out infinite alternate' }}>
        <path d="M62,134 Q68,175 76,240 L82,240 Q72,178 64,140" fill="hsl(220, 15%, 8%)" opacity="0.8" />
        <path d="M64,136 Q70,175 78,240" stroke="hsl(220, 10%, 18%)" strokeWidth="1" fill="none" opacity="0.6" />
        {/* Shoe */}
        <path d="M72,238 Q74,232 82,232 Q88,232 88,238 Q88,244 78,244 Q70,244 72,238 Z" fill="hsl(220, 15%, 6%)" opacity="0.8" />
      </g>
    </svg>
  );
}

function FacingSilhouette() {
  /* Front-facing view: turned toward camera, holding paintball marker */
  return (
    <svg viewBox="0 0 140 320" className="h-[55vmin]" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
      {/* Head */}
      <ellipse cx="70" cy="38" rx="20" ry="23" fill="hsl(220, 15%, 8%)" />

      {/* Paintball mask - front view */}
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

      {/* Firing arms + paintball marker */}
      <path d="M49,76 Q29,70 13,58" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M87,74 Q67,60 23,54" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="13" cy="58" r="5" fill="hsl(30, 60%, 75%)" />
      <circle cx="23" cy="54" r="5" fill="hsl(30, 60%, 75%)" />
      <circle cx="19" cy="64" r="1.8" fill="hsl(45, 80%, 60%)" />
      {/* Marker body */}
      <rect x="-13" y="48" width="50" height="9" rx="3" fill="hsl(220, 10%, 15%)" />
      <rect x="-23" y="50" width="14" height="5" rx="2" fill="hsl(220, 8%, 20%)" />
      <rect x="-27" y="51" width="5" height="3" rx="1" fill="hsl(220, 6%, 25%)" />
      <rect x="13" y="56" width="8" height="14" rx="2" fill="hsl(220, 10%, 12%)" />
      <path d="M17,58 Q21,62 17,68" stroke="hsl(220, 8%, 18%)" strokeWidth="1.5" fill="none" />
      {/* Hopper */}
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
