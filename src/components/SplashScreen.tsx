import { useState, useEffect } from 'react';
import paintballPlayer from '@/assets/paintball-player.png';

type Phase = 'enter' | 'fire' | 'splat' | 'done';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('fire'), 1200),
      setTimeout(() => setPhase('splat'), 1600),
      setTimeout(() => setPhase('done'), 2800),
      setTimeout(() => onComplete(), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none" style={{ animation: 'splash-fade-out 0.4s ease-in forwards' }}>
        <div className="absolute inset-0 bg-black" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[hsl(220,15%,5%)]">
      {/* Player */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: phase === 'enter'
            ? 'player-zoom-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : phase === 'fire'
            ? 'player-recoil 0.3s ease-out forwards'
            : 'player-fade 0.3s ease-out forwards',
        }}
      >
        <img
          src={paintballPlayer}
          alt=""
          className="w-[80vmin] h-[80vmin] object-contain drop-shadow-[0_0_40px_hsl(25,95%,53%,0.4)]"
        />
      </div>

      {/* Paintball projectile */}
      {(phase === 'fire') && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(25, 95%, 60%) 0%, hsl(25, 95%, 40%) 100%)',
            boxShadow: '0 0 20px hsl(25, 95%, 53%, 0.8)',
            animation: 'paintball-fly 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards',
          }}
        />
      )}

      {/* Splat */}
      {(phase === 'splat') && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Main splat blob */}
          <div
            className="absolute"
            style={{
              animation: 'splat-expand 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <svg viewBox="0 0 800 800" className="w-[250vmax] h-[250vmax]" style={{ filter: 'blur(2px)' }}>
              <defs>
                <radialGradient id="splatGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(25, 95%, 58%)" />
                  <stop offset="60%" stopColor="hsl(25, 95%, 48%)" />
                  <stop offset="100%" stopColor="hsl(25, 80%, 35%)" />
                </radialGradient>
              </defs>
              <path
                d="M400,150 Q480,100 520,180 Q600,120 580,220 Q680,200 640,300 Q720,320 660,380 Q740,420 650,440 Q700,520 620,500 Q640,600 560,560 Q540,660 460,600 Q420,680 380,600 Q300,660 300,560 Q200,600 240,500 Q140,520 200,440 Q100,420 180,380 Q100,320 200,300 Q120,200 240,220 Q200,120 300,180 Q320,100 400,150Z"
                fill="url(#splatGrad)"
              />
            </svg>
          </div>

          {/* Drip streaks */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) + Math.random() * 15;
            const distance = 30 + Math.random() * 20;
            return (
              <div
                key={i}
                className="absolute w-3 h-16 rounded-full"
                style={{
                  background: `linear-gradient(to bottom, hsl(25, 95%, ${50 + Math.random() * 15}%), transparent)`,
                  transform: `rotate(${angle}deg) translateY(-${distance}vh)`,
                  transformOrigin: 'center center',
                  animation: `drip-streak 0.6s ${0.1 + i * 0.04}s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                  opacity: 0,
                }}
              />
            );
          })}

          {/* Small splatter dots */}
          {[...Array(20)].map((_, i) => {
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 100;
            const size = 4 + Math.random() * 12;
            return (
              <div
                key={`dot-${i}`}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: `hsl(25, ${80 + Math.random() * 15}%, ${45 + Math.random() * 15}%)`,
                  left: `calc(50% + ${x}vw)`,
                  top: `calc(50% + ${y}vh)`,
                  animation: `dot-pop 0.3s ${0.05 + i * 0.02}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                  opacity: 0,
                }}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes player-zoom-in {
          0% { transform: scale(1.8) translateY(10%); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes player-recoil {
          0% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.05) translateY(2%); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes player-fade {
          to { opacity: 0; transform: scale(0.95); }
        }
        @keyframes paintball-fly {
          0% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(25); opacity: 0; }
        }
        @keyframes splat-expand {
          0% { transform: scale(0); opacity: 0.8; }
          60% { opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drip-streak {
          0% { opacity: 0; transform: rotate(var(--angle, 0deg)) translateY(0) scaleY(0); }
          100% { opacity: 0.7; transform: rotate(var(--angle, 0deg)) translateY(-40vh) scaleY(1); }
        }
        @keyframes dot-pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes splash-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
