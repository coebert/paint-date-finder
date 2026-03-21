import { useState, useEffect } from 'react';

type Phase = 'walk' | 'turn' | 'fire' | 'splat' | 'done';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('walk');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('turn'), 2400),
      setTimeout(() => setPhase('fire'), 3200),
      setTimeout(() => setPhase('splat'), 3600),
      setTimeout(() => setPhase('done'), 5000),
      setTimeout(() => onComplete(), 5400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none" style={{ animation: 'bond-fade-out 0.4s ease-in forwards' }}>
        <div className="absolute inset-0 bg-black" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      {/* Barrel rifling overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="relative"
          style={{
            width: '90vmin',
            height: '90vmin',
            animation: phase === 'walk'
              ? 'barrel-track 2.4s ease-in-out forwards'
              : phase === 'turn'
              ? 'barrel-center 0.6s ease-out forwards'
              : undefined,
          }}
        >
          {/* Barrel circle with rifling */}
          <svg viewBox="0 0 400 400" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }}>
            <defs>
              <clipPath id="barrelClip">
                <circle cx="200" cy="200" r="160" />
              </clipPath>
              <radialGradient id="barrelGrad" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="transparent" />
                <stop offset="85%" stopColor="hsl(220, 10%, 15%)" />
                <stop offset="100%" stopColor="hsl(220, 10%, 8%)" />
              </radialGradient>
            </defs>

            {/* White background visible through barrel */}
            <circle cx="200" cy="200" r="160" fill="hsl(220, 5%, 90%)" />

            {/* Rifling lines */}
            {[...Array(8)].map((_, i) => {
              const angle = i * 45;
              const rad = (angle * Math.PI) / 180;
              const x1 = 200 + Math.cos(rad) * 120;
              const y1 = 200 + Math.sin(rad) * 120;
              const x2 = 200 + Math.cos(rad) * 200;
              const y2 = 200 + Math.sin(rad) * 200;
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="hsl(220, 10%, 25%)"
                  strokeWidth="3"
                  opacity="0.6"
                />
              );
            })}

            {/* Inner shadow ring */}
            <circle cx="200" cy="200" r="160" fill="url(#barrelGrad)" />

            {/* Outer barrel rim */}
            <circle cx="200" cy="200" r="160" fill="none" stroke="hsl(220, 10%, 20%)" strokeWidth="8" />
            <circle cx="200" cy="200" r="155" fill="none" stroke="hsl(220, 10%, 30%)" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Black vignette mask around barrel */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 50%, transparent 28%, black 32%)',
        animation: phase === 'walk'
          ? 'mask-track 2.4s ease-in-out forwards'
          : phase === 'turn'
          ? 'mask-center 0.6s ease-out forwards'
          : undefined,
      }} />

      {/* Walking silhouette */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: phase === 'walk'
            ? 'figure-walk 2.4s ease-in-out forwards'
            : phase === 'turn'
            ? 'figure-turn 0.6s ease-out forwards'
            : phase === 'fire'
            ? 'figure-fire 0.3s ease-out forwards'
            : 'figure-after-fire 0.3s ease-out forwards',
        }}
      >
        <svg
          viewBox="0 0 140 320"
          className="h-[55vmin]"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
          }}
        >
          {/* Tuxedo paintball player silhouette */}
          <g style={{
            transform: phase === 'turn' || phase === 'fire' || phase === 'splat'
              ? 'scaleX(-1) translateX(-140px)'
              : undefined,
          }}>
            {/* Head base */}
            <ellipse cx="65" cy="38" rx="20" ry="23" fill="hsl(220, 15%, 8%)" />
            
            {/* Paintball mask - full face coverage */}
            <path d="M45,28 Q44,18 55,14 Q65,11 75,14 Q86,18 85,28 L86,42 Q86,52 75,55 Q65,57 55,55 Q44,52 44,42 Z" fill="hsl(220, 8%, 22%)" />
            {/* Mask visor - reflective goggle lens */}
            <path d="M48,24 Q48,20 58,18 Q65,17 72,18 Q82,20 82,24 L82,36 Q82,40 72,42 Q65,43 58,42 Q48,40 48,36 Z" fill="hsl(200, 15%, 12%)" />
            {/* Visor shine/reflection */}
            <path d="M52,22 Q56,20 64,20 Q68,20 70,22 L69,30 Q65,31 58,31 Q54,30 52,28 Z" fill="hsl(200, 20%, 28%)" opacity="0.5" />
            {/* Mask ventilation/mouth guard */}
            <path d="M50,42 Q57,48 65,49 Q73,48 80,42 L78,50 Q72,54 65,55 Q58,54 52,50 Z" fill="hsl(220, 10%, 16%)" />
            {/* Vent holes */}
            {[0,1,2,3,4].map(i => (
              <circle key={i} cx={55 + i * 5} cy={46} r="1.2" fill="hsl(220, 8%, 10%)" />
            ))}
            {/* Mask strap */}
            <path d="M44,32 Q38,32 36,35 Q35,38 36,42" stroke="hsl(220, 8%, 18%)" strokeWidth="3" fill="none" />
            <path d="M86,32 Q92,32 94,35 Q95,38 94,42" stroke="hsl(220, 8%, 18%)" strokeWidth="3" fill="none" />

            {/* Neck */}
            <rect x="57" y="55" width="16" height="8" rx="3" fill="hsl(30, 60%, 75%)" />

            {/* Tuxedo collar / bow tie area */}
            {/* White dress shirt collar */}
            <path d="M50,62 L58,58 L65,64 L72,58 L80,62 L78,72 L52,72 Z" fill="hsl(0, 0%, 92%)" />
            {/* Bow tie */}
            <path d="M58,66 L62,63 L62,69 Z" fill="hsl(220, 15%, 8%)" />
            <path d="M72,66 L68,63 L68,69 Z" fill="hsl(220, 15%, 8%)" />
            <circle cx="65" cy="66" r="2.5" fill="hsl(220, 15%, 8%)" />

            {/* Tuxedo jacket */}
            <path d="M42,70 Q38,85 36,110 L36,135 L94,135 L94,110 Q92,85 88,70 Z" fill="hsl(220, 15%, 8%)" />
            {/* Jacket lapels */}
            <path d="M50,70 L55,90 L48,100 L42,75 Z" fill="hsl(220, 12%, 14%)" />
            <path d="M80,70 L75,90 L82,100 L88,75 Z" fill="hsl(220, 12%, 14%)" />
            {/* Lapel satin sheen */}
            <path d="M51,72 L54,86 L49,94 L44,76 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
            <path d="M79,72 L76,86 L81,94 L86,76 Z" fill="hsl(220, 10%, 18%)" opacity="0.4" />
            {/* White shirt strip */}
            <path d="M58,70 L60,135 L70,135 L72,70 Z" fill="hsl(0, 0%, 90%)" />
            {/* Tuxedo buttons */}
            <circle cx="65" cy="85" r="2" fill="hsl(220, 15%, 8%)" />
            <circle cx="65" cy="100" r="2" fill="hsl(220, 15%, 8%)" />
            {/* Pocket square */}
            <path d="M78,78 L84,76 L83,84 L77,83 Z" fill="hsl(0, 0%, 92%)" />

            {/* Arms */}
            {(phase === 'walk') ? (
              <>
                {/* Walking arms with tuxedo sleeves */}
                <path d="M42,74 Q22,90 26,120" stroke="hsl(220, 15%, 8%)" strokeWidth="14" fill="none" strokeLinecap="round" />
                <path d="M88,74 Q108,86 100,115" stroke="hsl(220, 15%, 8%)" strokeWidth="14" fill="none" strokeLinecap="round" />
                {/* Hands */}
                <circle cx="26" cy="122" r="6" fill="hsl(30, 60%, 75%)" />
                <circle cx="100" cy="117" r="6" fill="hsl(30, 60%, 75%)" />
                {/* Cufflinks */}
                <circle cx="30" cy="114" r="2" fill="hsl(45, 80%, 60%)" />
                <circle cx="96" cy="109" r="2" fill="hsl(45, 80%, 60%)" />
              </>
            ) : (
              <>
                {/* Firing arms - holding paintball marker */}
                <path d="M44,76 Q24,70 8,58" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
                <path d="M82,74 Q62,60 18,54" stroke="hsl(220, 15%, 8%)" strokeWidth="13" fill="none" strokeLinecap="round" />
                {/* Hands gripping marker */}
                <circle cx="8" cy="58" r="5" fill="hsl(30, 60%, 75%)" />
                <circle cx="18" cy="54" r="5" fill="hsl(30, 60%, 75%)" />
                {/* Cufflinks visible */}
                <circle cx="14" cy="64" r="1.8" fill="hsl(45, 80%, 60%)" />
                
                {/* Paintball marker - detailed */}
                <rect x="-18" y="48" width="50" height="9" rx="3" fill="hsl(220, 10%, 15%)" />
                {/* Barrel */}
                <rect x="-28" y="50" width="14" height="5" rx="2" fill="hsl(220, 8%, 20%)" />
                {/* Barrel tip */}
                <rect x="-32" y="51" width="5" height="3" rx="1" fill="hsl(220, 6%, 25%)" />
                {/* Body grip */}
                <rect x="8" y="56" width="8" height="14" rx="2" fill="hsl(220, 10%, 12%)" />
                {/* Trigger guard */}
                <path d="M12,58 Q16,62 12,68" stroke="hsl(220, 8%, 18%)" strokeWidth="1.5" fill="none" />
                {/* Hopper on top */}
                <ellipse cx="18" cy="42" rx="12" ry="10" fill="hsl(220, 10%, 15%)" />
                <ellipse cx="18" cy="42" rx="10" ry="8" fill="hsl(220, 8%, 20%)" />
                {/* Paintballs visible in hopper */}
                <circle cx="14" cy="40" r="3" fill="hsl(25, 90%, 50%)" opacity="0.6" />
                <circle cx="20" cy="38" r="3" fill="hsl(25, 85%, 45%)" opacity="0.5" />
                <circle cx="18" cy="44" r="3" fill="hsl(25, 95%, 55%)" opacity="0.5" />
                {/* ASA / tank connector */}
                <rect x="26" y="54" width="6" height="10" rx="2" fill="hsl(220, 6%, 25%)" />
              </>
            )}

            {/* Tuxedo trousers */}
            <path d={phase === 'walk'
              ? "M48,133 Q44,175 36,235 L30,235 Q40,178 46,140"
              : "M48,133 Q46,175 44,235 L38,235 Q42,178 46,140"
            } fill="hsl(220, 15%, 8%)" />
            <path d={phase === 'walk'
              ? "M82,133 Q88,175 98,235 L104,235 Q92,178 84,140"
              : "M82,133 Q86,175 88,235 L94,235 Q88,178 84,140"
            } fill="hsl(220, 15%, 8%)" />
            {/* Tuxedo stripe on trousers */}
            <path d={phase === 'walk'
              ? "M46,133 Q42,175 34,235"
              : "M46,133 Q44,175 42,235"
            } stroke="hsl(220, 10%, 18%)" strokeWidth="1.5" fill="none" />
            <path d={phase === 'walk'
              ? "M84,133 Q90,175 100,235"
              : "M84,133 Q88,175 90,235"
            } stroke="hsl(220, 10%, 18%)" strokeWidth="1.5" fill="none" />

            {/* Dress shoes */}
            <path d={phase === 'walk'
              ? "M20,233 Q22,228 32,228 Q38,228 38,233 Q38,240 28,240 Q18,240 20,233 Z"
              : "M30,233 Q32,228 42,228 Q48,228 48,233 Q48,240 38,240 Q28,240 30,233 Z"
            } fill="hsl(220, 15%, 6%)" />
            <path d={phase === 'walk'
              ? "M94,233 Q96,228 106,228 Q112,228 112,233 Q112,240 102,240 Q92,240 94,233 Z"
              : "M84,233 Q86,228 96,228 Q102,228 102,233 Q102,240 92,240 Q82,240 84,233 Z"
            } fill="hsl(220, 15%, 6%)" />
            {/* Shoe shine */}
            <ellipse cx={phase === 'walk' ? "28" : "38"} cy="234" rx="6" ry="2" fill="hsl(220, 10%, 14%)" opacity="0.4" />
            <ellipse cx={phase === 'walk' ? "102" : "92"} cy="234" rx="6" ry="2" fill="hsl(220, 10%, 14%)" opacity="0.4" />
          </g>
        </svg>
      </div>

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

      {/* Paint splat covering the barrel view */}
      {phase === 'splat' && (
        <div className="absolute inset-0">
          {/* Main orange paint drip from top */}
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

          {/* Splat impact point center */}
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
      )}

      <style>{`
        @keyframes barrel-track {
          0% { transform: translateX(30vw); }
          100% { transform: translateX(-30vw); }
        }
        @keyframes barrel-center {
          to { transform: translateX(0); }
        }
        @keyframes mask-track {
          0% { background: radial-gradient(circle at 65% 50%, transparent 28%, black 32%); }
          100% { background: radial-gradient(circle at 35% 50%, transparent 28%, black 32%); }
        }
        @keyframes mask-center {
          to { background: radial-gradient(circle at 50% 50%, transparent 28%, black 32%); }
        }
        @keyframes figure-walk {
          0% { transform: translateX(40vw); }
          100% { transform: translateX(-40vw); }
        }
        @keyframes figure-turn {
          0% { transform: translateX(-40vw); }
          100% { transform: translateX(0); }
        }
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
        @keyframes bond-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
