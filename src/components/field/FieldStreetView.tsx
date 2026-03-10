import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Obstacle, OBSTACLE_DEFINITIONS, FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';

// ---- First-person camera controller ----
function FirstPersonCamera({ position }: { position: [number, number, number] }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isPointerDown = useRef(false);

  useEffect(() => {
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

    // Touch support
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
    const onTouchEnd = () => {
      lastTouch = null;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl]);

  useFrame(() => {
    camera.position.set(...position);
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  });

  return null;
}

// ---- Ground ----
function FieldGround() {
  return (
    <>
      {/* Green grass surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[FIELD_WIDTH_M, FIELD_HEIGHT_M]} />
        <meshStandardMaterial color="#2d5a1e" />
      </mesh>
      {/* Surrounding area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1a3a10" />
      </mesh>
      {/* Grid overlay */}
      <Grid
        args={[FIELD_WIDTH_M, FIELD_HEIGHT_M]}
        position={[0, 0, 0]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#3a7a2a"
        sectionSize={FIELD_WIDTH_M / 2}
        sectionThickness={1}
        sectionColor="#ffffff"
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </>
  );
}

// ---- Boundary netting ----
function FieldNetting() {
  const hw = FIELD_WIDTH_M / 2;
  const hh = FIELD_HEIGHT_M / 2;
  const netHeight = 3;

  // Simple transparent panels for nets
  const netMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#333333',
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  }), []);

  const posts: [number, number, number][] = [
    [-hw, 0, -hh], [hw, 0, -hh], [hw, 0, hh], [-hw, 0, hh],
  ];

  return (
    <group>
      {/* Net panels */}
      {[
        { pos: [0, netHeight / 2, -hh] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: FIELD_WIDTH_M },
        { pos: [0, netHeight / 2, hh] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: FIELD_WIDTH_M },
        { pos: [-hw, netHeight / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: FIELD_HEIGHT_M },
        { pos: [hw, netHeight / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: FIELD_HEIGHT_M },
      ].map((net, i) => (
        <mesh key={i} position={net.pos} rotation={net.rot} material={netMat}>
          <planeGeometry args={[net.w, netHeight]} />
        </mesh>
      ))}
      {/* Corner posts */}
      {posts.map((pos, i) => (
        <mesh key={`post-${i}`} position={[pos[0], netHeight / 2, pos[2]]}>
          <cylinderGeometry args={[0.05, 0.05, netHeight, 8]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      ))}
    </group>
  );
}

// ---- 3D Obstacle ----
function Obstacle3D({ obstacle }: { obstacle: Obstacle }) {
  const def = OBSTACLE_DEFINITIONS[obstacle.type];
  
  // Convert % position to world coordinates
  // x% maps to field width, y% maps to field depth (z axis)
  const worldX = (obstacle.x / 100 - 0.5) * FIELD_WIDTH_M;
  const worldZ = (obstacle.y / 100 - 0.5) * FIELD_HEIGHT_M;
  const rotRad = (obstacle.rotation * Math.PI) / 180;

  const color = def.color;

  // Create shapes based on type
  if (def.shape === 'circle') {
    // Cylinders (cakes, cans, cones)
    const radius = def.widthM / 2;
    const height = def.heightM;
    
    if (obstacle.type === 'cone') {
      return (
        <mesh position={[worldX, height / 2, worldZ]} rotation={[0, rotRad, 0]} castShadow>
          <coneGeometry args={[radius, height, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    }
    
    return (
      <mesh position={[worldX, height / 2, worldZ]} rotation={[0, rotRad, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  if (def.shape === 'triangle') {
    // Doritos - triangular prism
    const hw = def.widthM / 2;
    const hd = def.depthM / 2;
    const height = def.heightM;

    const shape = new THREE.Shape();
    shape.moveTo(0, -hd);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();

    const extrudeSettings = { depth: height, bevelEnabled: false };

    return (
      <mesh
        position={[worldX, 0, worldZ]}
        rotation={[-Math.PI / 2, 0, rotRad]}
        castShadow
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  // Rectangular bunkers (temples, bricks, snakes, wings, mini-race)
  const w = def.widthM;
  const d = def.depthM;
  const h = def.heightM;

  if (def.shape === 'rounded-rect' || def.shape === 'wing') {
    // Snake beams and wings - rounded top
    return (
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        {/* Base box */}
        <mesh position={[0, h * 0.4, 0]} castShadow>
          <boxGeometry args={[w, h * 0.8, d]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Rounded top */}
        <mesh position={[0, h * 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[w / 2, w / 2, d, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    );
  }

  // Standard rect
  return (
    <mesh position={[worldX, h / 2, worldZ]} rotation={[0, rotRad, 0]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ---- Viewpoint marker ----
function ViewpointMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <coneGeometry args={[0.2, 0.5, 4]} />
      <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.5} />
    </mesh>
  );
}

// ---- Main scene ----
function Scene({ obstacles, viewPosition }: {
  obstacles: Obstacle[];
  viewPosition: [number, number, number];
}) {
  return (
    <>
      <Sky sunPosition={[100, 50, 100]} turbidity={8} rayleigh={2} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[30, 40, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={['#87ceeb', '#2d5a1e', 0.4]} />

      <FirstPersonCamera position={viewPosition} />
      <FieldGround />
      <FieldNetting />

      {obstacles.map((obs) => (
        <Obstacle3D key={obs.id} obstacle={obs} />
      ))}

      <ViewpointMarker position={viewPosition} />
    </>
  );
}

// ---- Exported component ----
interface FieldStreetViewProps {
  obstacles: Obstacle[];
  /** Position as percentage [x%, y%] on the field */
  viewPoint: { x: number; y: number };
}

export function FieldStreetView({ obstacles, viewPoint }: FieldStreetViewProps) {
  // Convert % to world position; eye height ~1.7m
  const viewPosition: [number, number, number] = useMemo(() => [
    (viewPoint.x / 100 - 0.5) * FIELD_WIDTH_M,
    1.7,
    (viewPoint.y / 100 - 0.5) * FIELD_HEIGHT_M,
  ], [viewPoint.x, viewPoint.y]);

  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden border border-border/50 bg-black">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene obstacles={obstacles} viewPosition={viewPosition} />
      </Canvas>
    </div>
  );
}
