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
          viewBox="0 0 120 300"
          className="h-[55vmin]"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          {/* Paintball player silhouette */}
          <g fill="hsl(220, 15%, 8%)" style={{
            transform: phase === 'turn' || phase === 'fire' || phase === 'splat'
              ? 'scaleX(-1) translateX(-120px)'
              : undefined,
          }}>
            {/* Head with mask */}
            <ellipse cx="55" cy="38" rx="22" ry="25" />
            {/* Mask visor detail */}
            <rect x="35" y="28" width="30" height="12" rx="4" fill="hsl(220, 10%, 18%)" />

            {/* Body / torso */}
            <path d="M35,60 Q30,80 32,120 L78,120 Q80,80 75,60 Z" />
            
            {/* Arms - walking pose vs firing pose */}
            {(phase === 'walk') ? (
              <>
                {/* Walking arms */}
                <path d="M35,65 Q15,85 20,110" stroke="hsl(220, 15%, 8%)" strokeWidth="12" fill="none" strokeLinecap="round" />
                <path d="M75,65 Q95,80 85,105" stroke="hsl(220, 15%, 8%)" strokeWidth="12" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Firing arms - holding marker */}
                <path d="M38,70 Q20,65 5,55" stroke="hsl(220, 15%, 8%)" strokeWidth="11" fill="none" strokeLinecap="round" />
                <path d="M72,68 Q55,55 15,50" stroke="hsl(220, 15%, 8%)" strokeWidth="11" fill="none" strokeLinecap="round" />
                {/* Paintball marker */}
                <rect x="-15" y="44" width="45" height="8" rx="3" fill="hsl(220, 10%, 15%)" />
                <rect x="-20" y="42" width="12" height="12" rx="2" fill="hsl(220, 10%, 12%)" />
                {/* Hopper on top */}
                <ellipse cx="15" cy="38" rx="10" ry="8" fill="hsl(220, 10%, 15%)" />
              </>
            )}

            {/* Legs - walking stride */}
            <path d={phase === 'walk'
              ? "M42,118 Q38,170 30,220 L25,220 Q35,170 40,130"
              : "M42,118 Q40,170 38,220 L33,220 Q37,170 40,130"
            } fill="hsl(220, 15%, 8%)" />
            <path d={phase === 'walk'
              ? "M68,118 Q75,170 85,220 L90,220 Q78,170 70,130"
              : "M68,118 Q72,170 75,220 L80,220 Q74,170 70,130"
            } fill="hsl(220, 15%, 8%)" />

            {/* Feet */}
            <ellipse cx={phase === 'walk' ? "27" : "35"} cy="222" rx="12" ry="5" />
            <ellipse cx={phase === 'walk' ? "88" : "78"} cy="222" rx="12" ry="5" />
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
