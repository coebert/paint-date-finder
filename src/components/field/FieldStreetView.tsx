import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Tag, EyeOff } from 'lucide-react';
import { Obstacle, OBSTACLE_DEFINITIONS, FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';

// Shared joystick input (set by HTML overlay, read by Three.js camera)
export interface JoystickInput {
  moveX: number; // -1 to 1 (left/right)
  moveY: number; // -1 to 1 (forward/back)
}

export interface LookInput {
  lookX: number; // -1 to 1 (yaw)
  lookY: number; // -1 to 1 (pitch)
}

// ---- First-person camera controller ----
function FirstPersonCamera({ position, onPositionChange, onStanceChange, joystickRef, lookRef }: { 
  position: [number, number, number];
  onPositionChange?: (x: number, z: number) => void;
  onStanceChange?: (stance: { sprinting: boolean; crouching: boolean; eyeHeight: number }) => void;
  joystickRef: React.RefObject<JoystickInput>;
  lookRef: React.RefObject<LookInput>;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isPointerDown = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const currentPos = useRef<[number, number, number]>([...position]);
  const isWalking = useRef(false);
  const lastReportedPos = useRef<[number, number]>([position[0], position[2]]);

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

  const lastStance = useRef({ sprinting: false, crouching: false });

  useFrame((_, delta) => {
    const isSprinting = keys.current.has('shift');
    const isCrouching = keys.current.has('c');
    const baseSpeed = 5;
    const speed = isSprinting ? 10 : isCrouching ? 2.5 : baseSpeed;
    const eyeHeight = isCrouching ? 0.9 : 1.7;

    if (onStanceChange && (lastStance.current.sprinting !== isSprinting || lastStance.current.crouching !== isCrouching)) {
      lastStance.current = { sprinting: isSprinting, crouching: isCrouching };
      onStanceChange({ sprinting: isSprinting, crouching: isCrouching, eyeHeight });
    }

    currentPos.current[1] = eyeHeight;

    const moveDir = new THREE.Vector3(0, 0, 0);
    
    // Keyboard input
    if (keys.current.has('w') || keys.current.has('arrowup')) moveDir.z -= 1;
    if (keys.current.has('s') || keys.current.has('arrowdown')) moveDir.z += 1;
    if (keys.current.has('a') || keys.current.has('arrowleft')) moveDir.x -= 1;
    if (keys.current.has('d') || keys.current.has('arrowright')) moveDir.x += 1;

    // Virtual joystick input
    const joy = joystickRef.current;
    if (joy && (Math.abs(joy.moveX) > 0.05 || Math.abs(joy.moveY) > 0.05)) {
      moveDir.x += joy.moveX;
      moveDir.z += joy.moveY;
    }

    // Virtual look joystick input
    const look = lookRef.current;
    if (look && (Math.abs(look.lookX) > 0.05 || Math.abs(look.lookY) > 0.05)) {
      const lookSpeed = 2.5;
      yaw.current -= look.lookX * lookSpeed * delta;
      pitch.current -= look.lookY * lookSpeed * delta;
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current));
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      const step = speed * delta;
      currentPos.current[0] += moveDir.x * step;
      currentPos.current[2] += moveDir.z * step;

      const hw = FIELD_WIDTH_M / 2;
      const hh = FIELD_HEIGHT_M / 2;
      currentPos.current[0] = Math.max(-hw + 0.5, Math.min(hw - 0.5, currentPos.current[0]));
      currentPos.current[2] = Math.max(-hh + 0.5, Math.min(hh - 0.5, currentPos.current[2]));

      if (onPositionChange) {
        const dx = currentPos.current[0] - lastReportedPos.current[0];
        const dz = currentPos.current[2] - lastReportedPos.current[1];
        if (dx * dx + dz * dz > 0.25) {
          isWalking.current = true;
          lastReportedPos.current = [currentPos.current[0], currentPos.current[2]];
          const xPct = (currentPos.current[0] / FIELD_WIDTH_M + 0.5) * 100;
          const yPct = (currentPos.current[2] / FIELD_HEIGHT_M + 0.5) * 100;
          onPositionChange(xPct, yPct);
        }
      }
    }

    camera.position.set(currentPos.current[0], currentPos.current[1], currentPos.current[2]);
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  });

  return null;
}

// ---- Ground ---- (Realistic bright green artificial turf with white boundary lines)
function FieldGround() {
  const hw = FIELD_WIDTH_M / 2;
  const hh = FIELD_HEIGHT_M / 2;

  return (
    <>
      {/* Main field turf - bright green like real artificial turf */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[FIELD_WIDTH_M, FIELD_HEIGHT_M]} />
        <meshStandardMaterial color="#3a8f29" roughness={0.95} />
      </mesh>
      {/* Surrounding area - darker grass/dirt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2a6e1a" roughness={1} />
      </mesh>

      {/* White boundary lines (like real tournament fields) */}
      {/* Long sides */}
      <mesh position={[0, 0.003, -hh]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FIELD_WIDTH_M, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.003, hh]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FIELD_WIDTH_M, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Short sides */}
      <mesh position={[-hw, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, FIELD_HEIGHT_M]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[hw, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, FIELD_HEIGHT_M]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Center line - dashed white */}
      {Array.from({ length: 12 }).map((_, i) => {
        const segLen = FIELD_HEIGHT_M / 24;
        const zPos = -hh + (i * 2 + 0.5) * segLen * 2;
        return (
          <mesh key={`cl-${i}`} position={[0, 0.003, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.06, segLen]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Turf texture lines (mow stripes like real turf fields) */}
      {Array.from({ length: 18 }).map((_, i) => {
        const zPos = -hh + ((i + 1) / 19) * FIELD_HEIGHT_M;
        return (
          <mesh key={`ts-${i}`} position={[0, 0.001, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[FIELD_WIDTH_M, 0.02]} />
            <meshBasicMaterial color="#44a030" transparent opacity={0.3} />
          </mesh>
        );
      })}

      {/* Start boxes - blue and red */}
      <mesh position={[-hw + 1.5, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 6]} />
        <meshBasicMaterial color="#2244cc" transparent opacity={0.2} />
      </mesh>
      <mesh position={[hw - 1.5, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 6]} />
        <meshBasicMaterial color="#cc2222" transparent opacity={0.2} />
      </mesh>
    </>
  );
}

// ---- Boundary netting ---- (Taller, more visible like real tournament netting)
function FieldNetting() {
  const hw = FIELD_WIDTH_M / 2;
  const hh = FIELD_HEIGHT_M / 2;
  const netH = 4.5; // Real netting is typically 12-15ft (3.6-4.5m)

  const netMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#111111', transparent: true, opacity: 0.25, side: THREE.DoubleSide,
  }), []);

  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#555555', metalness: 0.6, roughness: 0.4 
  }), []);

  const nets = [
    { pos: [0, netH / 2, -hh] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: FIELD_WIDTH_M },
    { pos: [0, netH / 2, hh] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: FIELD_WIDTH_M },
    { pos: [-hw, netH / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: FIELD_HEIGHT_M },
    { pos: [hw, netH / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: FIELD_HEIGHT_M },
  ];

  // More poles like real fields (every ~5m)
  const longPoles: [number, number][] = Array.from({ length: 10 }).map((_, i) => 
    [-hw + (i + 1) * (FIELD_WIDTH_M / 11), -hh] as [number, number]
  );
  const longPoles2: [number, number][] = Array.from({ length: 10 }).map((_, i) => 
    [-hw + (i + 1) * (FIELD_WIDTH_M / 11), hh] as [number, number]
  );
  const shortPoles: [number, number][] = Array.from({ length: 7 }).map((_, i) => 
    [-hw, -hh + (i + 1) * (FIELD_HEIGHT_M / 8)] as [number, number]
  );
  const shortPoles2: [number, number][] = Array.from({ length: 7 }).map((_, i) => 
    [hw, -hh + (i + 1) * (FIELD_HEIGHT_M / 8)] as [number, number]
  );
  const cornerPoles: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  const allPoles = [...cornerPoles, ...longPoles, ...longPoles2, ...shortPoles, ...shortPoles2];

  return (
    <group>
      {nets.map((n, i) => (
        <mesh key={i} position={n.pos} rotation={n.rot} material={netMat}>
          <planeGeometry args={[n.w, netH]} />
        </mesh>
      ))}
      {/* Net horizontal support cable at top */}
      {nets.map((n, i) => (
        <mesh key={`cable-${i}`} position={[n.pos[0], netH, n.pos[2]]} rotation={n.rot}>
          <boxGeometry args={[n.w, 0.02, 0.02]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
      {allPoles.map(([px, pz], i) => (
        <mesh key={`p-${i}`} position={[px, netH / 2, pz]} material={poleMat}>
          <cylinderGeometry args={[0.03, 0.04, netH, 6]} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Floating label ----
function ObstacleLabel({ position, label, color }: { position: [number, number, number]; label: string; color: string }) {
  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Background pill */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[label.length * 0.12 + 0.3, 0.28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
      {/* Colored dot */}
      <mesh position={[-(label.length * 0.06 + 0.05), 0, 0]}>
        <circleGeometry args={[0.06, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Text
        fontSize={0.16}
        color="white"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {label}
      </Text>
    </Billboard>
  );
}

// ---- Accurate 3D Obstacle shapes ----
function Obstacle3D({ obstacle, showLabels = true }: { obstacle: Obstacle; showLabels?: boolean }) {
  const def = OBSTACLE_DEFINITIONS[obstacle.type];
  const worldX = (obstacle.x / 100 - 0.5) * FIELD_WIDTH_M;
  const worldZ = (obstacle.y / 100 - 0.5) * FIELD_HEIGHT_M;
  const rotRad = (obstacle.rotation * Math.PI) / 180;
  const { widthM: w, depthM: d, heightM: h, color, profile3D } = def;
  const labelY = h + 0.4;

  const label = showLabels ? <ObstacleLabel position={[worldX, labelY, worldZ]} label={def.label} color={color} /> : null;

  // Shared inflatable PVC material
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color, roughness: 0.45, metalness: 0.05 
  }), [color]);

  const seamMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color, roughness: 0.35, metalness: 0.1 
  }), [color]);

  if (profile3D === 'cylinder') {
    // Cake / Can: cylinder with domed top
    const r = w / 2;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Main body */}
          <mesh position={[0, h / 2, 0]} material={mat} castShadow>
            <cylinderGeometry args={[r * 0.97, r, h, 24]} />
          </mesh>
          {/* Domed top */}
          <mesh position={[0, h, 0]} material={mat} castShadow>
            <sphereGeometry args={[r * 0.97, 16, 10, 0, Math.PI * 2, 0, Math.PI / 3]} />
          </mesh>
          {/* Horizontal seam bands */}
          {[0.3, 0.6].map((frac) => (
            <mesh key={frac} position={[0, h * frac, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r * (1 - frac * 0.03), 0.02, 6, 24]} />
              <primitive object={seamMat} attach="material" />
            </mesh>
          ))}
          {/* Base ring */}
          <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.025, 6, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'cone') {
    // Cone bunker: tapered cone
    const r = w / 2;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <mesh position={[0, h / 2, 0]} material={mat} castShadow>
            <coneGeometry args={[r, h, 20]} />
          </mesh>
          {/* Rounded tip */}
          <mesh position={[0, h * 0.95, 0]} material={mat}>
            <sphereGeometry args={[r * 0.12, 10, 8]} />
          </mesh>
          {/* Base ring */}
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.03, 6, 20]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'prism-triangle') {
    // Dorito: A-frame inflatable bunker
    // Real doritos are like a tent/A-frame: triangular cross-section, extruded along depth
    // The triangle face points up (peak at top), and the bunker extends along the Z-axis (depth)
    const halfW = w / 2;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Build from individual faces for proper orientation */}
          {/* Left face */}
          <mesh castShadow>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  // Triangle 1
                  -halfW, 0, -d/2,   0, h, -d/2,   -halfW, 0, d/2,
                  // Triangle 2
                  0, h, -d/2,   0, h, d/2,   -halfW, 0, d/2,
                ])}
                count={6}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-normal"
                array={(() => {
                  const nx = -h, ny = halfW, len = Math.sqrt(nx*nx + ny*ny);
                  const n = new Float32Array(18);
                  for (let i = 0; i < 6; i++) { n[i*3] = nx/len; n[i*3+1] = ny/len; n[i*3+2] = 0; }
                  return n;
                })()}
                count={6}
                itemSize={3}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Right face */}
          <mesh castShadow>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  halfW, 0, -d/2,   halfW, 0, d/2,   0, h, -d/2,
                  0, h, -d/2,   halfW, 0, d/2,   0, h, d/2,
                ])}
                count={6}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-normal"
                array={(() => {
                  const nx = h, ny = halfW, len = Math.sqrt(nx*nx + ny*ny);
                  const n = new Float32Array(18);
                  for (let i = 0; i < 6; i++) { n[i*3] = nx/len; n[i*3+1] = ny/len; n[i*3+2] = 0; }
                  return n;
                })()}
                count={6}
                itemSize={3}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Front triangular end cap */}
          <mesh castShadow>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  -halfW, 0, -d/2,   halfW, 0, -d/2,   0, h, -d/2,
                ])}
                count={3}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-normal"
                array={new Float32Array([0,0,-1, 0,0,-1, 0,0,-1])}
                count={3}
                itemSize={3}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Back triangular end cap */}
          <mesh castShadow>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  -halfW, 0, d/2,   0, h, d/2,   halfW, 0, d/2,
                ])}
                count={3}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-normal"
                array={new Float32Array([0,0,1, 0,0,1, 0,0,1])}
                count={3}
                itemSize={3}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Bottom face */}
          <mesh>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  -halfW, 0, -d/2,   -halfW, 0, d/2,   halfW, 0, -d/2,
                  halfW, 0, -d/2,   -halfW, 0, d/2,   halfW, 0, d/2,
                ])}
                count={6}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-normal"
                array={new Float32Array([0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0])}
                count={6}
                itemSize={3}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Top ridge seam */}
          <mesh position={[0, h + 0.01, 0]}>
            <boxGeometry args={[0.04, 0.04, d * 0.95]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'half-cylinder') {
    // Snake beam: half-cylinder (tube lying on ground, rounded top, flat bottom)
    // The beam runs along Z (depth axis) with the curved part facing up
    const r = h; // height IS the radius of the half-circle cross-section
    const tubeLen = d - 2 * r; // length excluding end caps
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Main half-cylinder tube - lying along Z axis, curved top */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r, Math.max(0.1, tubeLen), 16, 1, true, 0, Math.PI]} />
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Front end cap - half sphere */}
          <mesh position={[0, 0, -tubeLen / 2]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Back end cap - half sphere */}
          <mesh position={[0, 0, tubeLen / 2]}>
            <sphereGeometry args={[r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Flat bottom */}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[r * 2, d]} />
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Top seam ridge */}
          <mesh position={[0, r + 0.01, 0]}>
            <boxGeometry args={[0.025, 0.025, d * 0.9]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'stepped-pyramid') {
    // Temple / Temple Maya: stacked tiers with inflatable look
    const tiers = obstacle.type === 'temple-maya' ? 4 : 3;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {Array.from({ length: tiers }).map((_, i) => {
            const scale = 1 - (i * 0.18);
            const tierH = h / tiers;
            const tw = w * scale;
            const td = d * scale;
            return (
              <group key={i}>
                {/* Main tier body */}
                <mesh position={[0, tierH * i + tierH / 2, 0]} material={mat} castShadow>
                  <boxGeometry args={[tw, tierH * 0.9, td]} />
                </mesh>
                {/* Rounded edges on top of each tier */}
                {[
                  { pos: [0, tierH * (i + 1) - tierH * 0.05, -td / 2] as [number, number, number], len: tw, rotY: 0 },
                  { pos: [0, tierH * (i + 1) - tierH * 0.05, td / 2] as [number, number, number], len: tw, rotY: 0 },
                  { pos: [-tw / 2, tierH * (i + 1) - tierH * 0.05, 0] as [number, number, number], len: td, rotY: Math.PI / 2 },
                  { pos: [tw / 2, tierH * (i + 1) - tierH * 0.05, 0] as [number, number, number], len: td, rotY: Math.PI / 2 },
                ].map((edge, j) => (
                  <mesh key={j} position={edge.pos} rotation={[0, edge.rotY, Math.PI / 2]}>
                    <cylinderGeometry args={[tierH * 0.06, tierH * 0.06, edge.len * 0.95, 6]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                ))}
              </group>
            );
          })}
        </group>
      </>
    );
  }

  if (profile3D === 'flat-panel') {
    // Wing / Mini Race: low wide inflatable panel — rounded pill shape
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Main body */}
          <mesh position={[0, h * 0.4, 0]} material={mat} castShadow>
            <boxGeometry args={[w, h * 0.7, d]} />
          </mesh>
          {/* Rounded top - half cylinder along the width */}
          <mesh position={[0, h * 0.75, 0]} rotation={[0, 0, Math.PI / 2]} material={mat} castShadow>
            <cylinderGeometry args={[h * 0.28, h * 0.28, w, 12, 1, false, 0, Math.PI]} />
          </mesh>
          {/* Front seam */}
          <mesh position={[0, h * 0.4, d / 2 + 0.005]}>
            <planeGeometry args={[w * 0.9, 0.02]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          {/* Back seam */}
          <mesh position={[0, h * 0.4, -(d / 2 + 0.005)]}>
            <planeGeometry args={[w * 0.9, 0.02]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  // Default box fallback (brick)
  return (
    <>
      {label}
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        <mesh position={[0, h / 2, 0]} material={mat} castShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {/* Top edge seams for inflatable look */}
        <mesh position={[0, h + 0.01, 0]}>
          <boxGeometry args={[w * 0.95, 0.03, d * 0.95]} />
          <primitive object={seamMat} attach="material" />
        </mesh>
      </group>
    </>
  );
}

// ---- Virtual Joystick ----
function VirtualJoystick({ joystickRef }: { joystickRef: React.MutableRefObject<JoystickInput> }) {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const RADIUS = 40;

  const handleStart = useCallback((e: React.TouchEvent) => {
    if (activeTouch.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouch.current = touch.identifier;
    const rect = padRef.current!.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateKnob(touch.clientX, touch.clientY);
  }, []);

  const updateKnob = useCallback((cx: number, cy: number) => {
    let dx = cx - center.current.x;
    let dy = cy - center.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    joystickRef.current = { moveX: dx / RADIUS, moveY: dy / RADIUS };
  }, [joystickRef]);

  const handleMove = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch.current) {
        updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  }, [updateKnob]);

  const handleEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch.current) {
        activeTouch.current = null;
        if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
        joystickRef.current = { moveX: 0, moveY: 0 };
        break;
      }
    }
  }, [joystickRef]);

  return (
    <div
      ref={padRef}
      className="absolute bottom-4 left-4 w-[100px] h-[100px] rounded-full border-2 border-foreground/20 bg-background/30 backdrop-blur-sm flex items-center justify-center touch-none z-10"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <div
        ref={knobRef}
        className="w-10 h-10 rounded-full bg-foreground/40 border border-foreground/50 pointer-events-none"
        style={{ transition: 'none' }}
      />
      {/* Direction indicators */}
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▲</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▼</span>
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">◀</span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▶</span>
    </div>
  );
}

// ---- Main scene ----
function Scene({ obstacles, viewPosition, onPositionChange, onStanceChange, joystickRef, lookRef, showLabels }: {
  obstacles: Obstacle[];
  viewPosition: [number, number, number];
  onPositionChange?: (x: number, z: number) => void;
  onStanceChange?: (stance: { sprinting: boolean; crouching: boolean; eyeHeight: number }) => void;
  joystickRef: React.MutableRefObject<JoystickInput>;
  lookRef: React.MutableRefObject<LookInput>;
  showLabels: boolean;
}) {
  return (
    <>
      <Sky sunPosition={[80, 60, 50]} turbidity={6} rayleigh={1.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[25, 50, 30]} 
        intensity={1.8} 
        castShadow
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <directionalLight position={[-20, 30, -15]} intensity={0.4} />
      <hemisphereLight args={['#b4d7ff', '#3a8f29', 0.5]} />

      <FirstPersonCamera position={viewPosition} onPositionChange={onPositionChange} onStanceChange={onStanceChange} joystickRef={joystickRef} />
      <FieldGround />
      <FieldNetting />

      {obstacles.map((obs) => (
        <Obstacle3D key={obs.id} obstacle={obs} showLabels={showLabels} />
      ))}
    </>
  );
}

// ---- Exported component ----
interface FieldStreetViewProps {
  obstacles: Obstacle[];
  viewPoint: { x: number; y: number };
  onViewPointChange?: (point: { x: number; y: number }) => void;
  onStanceChange?: (stance: { sprinting: boolean; crouching: boolean; eyeHeight: number }) => void;
}

export function FieldStreetView({ obstacles, viewPoint, onViewPointChange, onStanceChange }: FieldStreetViewProps) {
  const joystickRef = useRef<JoystickInput>({ moveX: 0, moveY: 0 });
  const [showLabels, setShowLabels] = useState(true);
  
  const viewPosition: [number, number, number] = useMemo(() => [
    (viewPoint.x / 100 - 0.5) * FIELD_WIDTH_M,
    1.7,
    (viewPoint.y / 100 - 0.5) * FIELD_HEIGHT_M,
  ], [viewPoint.x, viewPoint.y]);

  const handlePositionChange = useCallback((xPct: number, yPct: number) => {
    onViewPointChange?.({ x: xPct, y: yPct });
  }, [onViewPointChange]);

  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden border border-border/50 bg-black relative">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene obstacles={obstacles} viewPosition={viewPosition} onPositionChange={handlePositionChange} onStanceChange={onStanceChange} joystickRef={joystickRef} showLabels={showLabels} />
      </Canvas>
      {/* Label toggle button */}
      <button
        onClick={() => setShowLabels(prev => !prev)}
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm transition-colors border border-white/10"
        title={showLabels ? 'Hide labels' : 'Show labels'}
      >
        {showLabels ? <Tag size={14} /> : <EyeOff size={14} />}
        {showLabels ? 'Labels' : 'Labels'}
      </button>
      {/* Virtual joystick - visible on touch devices */}
      <div className="md:hidden">
        <VirtualJoystick joystickRef={joystickRef} />
      </div>
    </div>
  );
}
