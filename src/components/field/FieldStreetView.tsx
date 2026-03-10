import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Obstacle, OBSTACLE_DEFINITIONS, FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';

// ---- First-person camera controller ----
function FirstPersonCamera({ position, onPositionChange }: { 
  position: [number, number, number];
  onPositionChange?: (x: number, z: number) => void;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isPointerDown = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const currentPos = useRef<[number, number, number]>([...position]);
  const isWalking = useRef(false);
  const lastReportedPos = useRef<[number, number]>([position[0], position[2]]);

  // Only reset on teleport (position prop change not caused by walking)
  useEffect(() => {
    if (isWalking.current) {
      isWalking.current = false;
      return;
    }
    currentPos.current = [...position];
    camera.position.set(...position);
    yaw.current = 0;
    pitch.current = 0;
  }, [position, camera]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown.current = true;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => {
      isPointerDown.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      yaw.current -= e.movementX * 0.003;
      pitch.current -= e.movementY * 0.003;
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current));
    };

    let lastTouch: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && lastTouch) {
        const dx = e.touches[0].clientX - lastTouch.x;
        const dy = e.touches[0].clientY - lastTouch.y;
        yaw.current -= dx * 0.005;
        pitch.current -= dy * 0.005;
        pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current));
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchEnd = () => { lastTouch = null; };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const speed = 5; // meters per second
    const moveDir = new THREE.Vector3(0, 0, 0);
    
    if (keys.current.has('w') || keys.current.has('arrowup')) moveDir.z -= 1;
    if (keys.current.has('s') || keys.current.has('arrowdown')) moveDir.z += 1;
    if (keys.current.has('a') || keys.current.has('arrowleft')) moveDir.x -= 1;
    if (keys.current.has('d') || keys.current.has('arrowright')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Rotate movement direction by yaw so W always moves forward
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      const step = speed * delta;
      currentPos.current[0] += moveDir.x * step;
      currentPos.current[2] += moveDir.z * step;

      // Clamp to field bounds
      const hw = FIELD_WIDTH_M / 2;
      const hh = FIELD_HEIGHT_M / 2;
      currentPos.current[0] = Math.max(-hw + 0.5, Math.min(hw - 0.5, currentPos.current[0]));
      currentPos.current[2] = Math.max(-hh + 0.5, Math.min(hh - 0.5, currentPos.current[2]));

      // Notify parent of position change
      if (onPositionChange) {
        const xPct = (currentPos.current[0] / FIELD_WIDTH_M + 0.5) * 100;
        const yPct = (currentPos.current[2] / FIELD_HEIGHT_M + 0.5) * 100;
        onPositionChange(xPct, yPct);
      }
    }

    camera.position.set(currentPos.current[0], currentPos.current[1], currentPos.current[2]);
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  });

  return null;
}

// ---- Ground ----
function FieldGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[FIELD_WIDTH_M, FIELD_HEIGHT_M]} />
        <meshStandardMaterial color="#2d5a1e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1a3a10" />
      </mesh>
      {/* 5m grid lines on field */}
      {Array.from({ length: 10 }).map((_, i) => {
        const xPos = -FIELD_WIDTH_M / 2 + (i + 1) * 5;
        return (
          <mesh key={`gl-${i}`} position={[xPos, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, FIELD_HEIGHT_M]} />
            <meshBasicMaterial color="#3a7a2a" transparent opacity={0.3} />
          </mesh>
        );
      })}
    </>
  );
}

// ---- Boundary netting ----
function FieldNetting() {
  const hw = FIELD_WIDTH_M / 2;
  const hh = FIELD_HEIGHT_M / 2;
  const netH = 3;

  const netMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#222222', transparent: true, opacity: 0.12, side: THREE.DoubleSide,
  }), []);

  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#666666' }), []);

  const nets = [
    { pos: [0, netH / 2, -hh] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: FIELD_WIDTH_M },
    { pos: [0, netH / 2, hh] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: FIELD_WIDTH_M },
    { pos: [-hw, netH / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: FIELD_HEIGHT_M },
    { pos: [hw, netH / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: FIELD_HEIGHT_M },
  ];

  const poles: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];

  return (
    <group>
      {nets.map((n, i) => (
        <mesh key={i} position={n.pos} rotation={n.rot} material={netMat}>
          <planeGeometry args={[n.w, netH]} />
        </mesh>
      ))}
      {poles.map(([px, pz], i) => (
        <mesh key={`p-${i}`} position={[px, netH / 2, pz]} material={poleMat}>
          <cylinderGeometry args={[0.04, 0.04, netH, 6]} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Accurate 3D Obstacle shapes ----
function Obstacle3D({ obstacle }: { obstacle: Obstacle }) {
  const def = OBSTACLE_DEFINITIONS[obstacle.type];
  const worldX = (obstacle.x / 100 - 0.5) * FIELD_WIDTH_M;
  const worldZ = (obstacle.y / 100 - 0.5) * FIELD_HEIGHT_M;
  const rotRad = (obstacle.rotation * Math.PI) / 180;
  const { widthM: w, depthM: d, heightM: h, color, profile3D } = def;

  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }), [color]);

  // Dorito triangle shape (must be at top level for hooks rules)
  const triShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    return s;
  }, [w, h]);

  if (profile3D === 'cylinder') {
    const r = w / 2;
    return (
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        <mesh position={[0, h / 2, 0]} material={mat} castShadow>
          <cylinderGeometry args={[r, r * 1.05, h, 20]} />
        </mesh>
        <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 0.85, r * 0.08, 8, 20]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      </group>
    );
  }

  if (profile3D === 'cone') {
    const r = w / 2;
    return (
      <mesh position={[worldX, h / 2, worldZ]} rotation={[0, rotRad, 0]} material={mat} castShadow>
        <coneGeometry args={[r, h, 16]} />
      </mesh>
    );
  }

  if (profile3D === 'prism-triangle') {
    return (
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, d / 2]} material={mat} castShadow>
          <extrudeGeometry args={[triShape, { depth: d, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }]} />
        </mesh>
      </group>
    );
  }

  if (profile3D === 'half-cylinder') {
    // Snake beam — a long, low half-cylinder tube lying on the ground
    return (
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        {/* Half-cylinder: rotate a cylinder 90° and use only top half effect via positioning */}
        <mesh position={[0, h * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[w / 2, w / 2, d, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Flat bottom */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (profile3D === 'stepped-pyramid') {
    // Temple / Temple Maya — stacked tiers getting smaller, like a Mayan pyramid
    const tiers = 3;
    return (
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        {Array.from({ length: tiers }).map((_, i) => {
          const scale = 1 - (i * 0.25);
          const tierH = h / tiers;
          const tw = w * scale;
          const td = d * scale;
          return (
            <mesh key={i} position={[0, tierH * i + tierH / 2, 0]} castShadow>
              <boxGeometry args={[tw, tierH * 0.95, td]} />
              <meshStandardMaterial
                color={color}
                roughness={0.75}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (profile3D === 'flat-panel') {
    // Wing / Mini Race — low, wide, inflatable panel with rounded top
    return (
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        {/* Main body */}
        <mesh position={[0, h * 0.35, 0]} castShadow>
          <boxGeometry args={[w, h * 0.7, d]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Rounded top edge */}
        <mesh position={[0, h * 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[h * 0.3, h * 0.3, w, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  // Default box fallback
  return (
    <mesh position={[worldX, h / 2, worldZ]} rotation={[0, rotRad, 0]} material={mat} castShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
}

// ---- Main scene ----
function Scene({ obstacles, viewPosition, onPositionChange }: {
  obstacles: Obstacle[];
  viewPosition: [number, number, number];
  onPositionChange?: (x: number, z: number) => void;
}) {
  return (
    <>
      <Sky sunPosition={[100, 50, 100]} turbidity={8} rayleigh={2} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[30, 40, 20]} intensity={1.3} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={['#87ceeb', '#2d5a1e', 0.4]} />

      <FirstPersonCamera position={viewPosition} onPositionChange={onPositionChange} />
      <FieldGround />
      <FieldNetting />

      {obstacles.map((obs) => (
        <Obstacle3D key={obs.id} obstacle={obs} />
      ))}
    </>
  );
}

// ---- Exported component ----
interface FieldStreetViewProps {
  obstacles: Obstacle[];
  viewPoint: { x: number; y: number };
  onViewPointChange?: (point: { x: number; y: number }) => void;
}

export function FieldStreetView({ obstacles, viewPoint, onViewPointChange }: FieldStreetViewProps) {
  const viewPosition: [number, number, number] = useMemo(() => [
    (viewPoint.x / 100 - 0.5) * FIELD_WIDTH_M,
    1.7,
    (viewPoint.y / 100 - 0.5) * FIELD_HEIGHT_M,
  ], [viewPoint.x, viewPoint.y]);

  const handlePositionChange = useCallback((xPct: number, yPct: number) => {
    onViewPointChange?.({ x: xPct, y: yPct });
  }, [onViewPointChange]);

  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden border border-border/50 bg-black">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene obstacles={obstacles} viewPosition={viewPosition} onPositionChange={handlePositionChange} />
      </Canvas>
    </div>
  );
}
