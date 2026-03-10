import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Tag, EyeOff, Zap, ArrowDownToLine, Compass } from 'lucide-react';
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

export interface MobileStanceInput {
  sprinting: boolean;
  crouching: boolean;
}

// ---- First-person camera controller ----
function FirstPersonCamera({ position, onPositionChange, onStanceChange, joystickRef, lookRef, mobileStanceRef, headingRef }: { 
  position: [number, number, number];
  onPositionChange?: (x: number, z: number) => void;
  onStanceChange?: (stance: { sprinting: boolean; crouching: boolean; eyeHeight: number }) => void;
  joystickRef: React.RefObject<JoystickInput>;
  lookRef: React.RefObject<LookInput>;
  mobileStanceRef: React.RefObject<MobileStanceInput>;
  headingRef: React.MutableRefObject<number>;
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
    const mobileSprint = mobileStanceRef.current?.sprinting ?? false;
    const mobileCrouch = mobileStanceRef.current?.crouching ?? false;
    const isSprinting = keys.current.has('shift') || mobileSprint;
    const isCrouching = keys.current.has('c') || mobileCrouch;
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
    headingRef.current = yaw.current;
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
  const { widthM: w, depthM: d, heightM: h, color, colorSecondary, profile3D } = def;
  const labelY = h + 0.4;

  const label = showLabels ? <ObstacleLabel position={[worldX, labelY, worldZ]} label={def.label} color={color} /> : null;

  // Two-tone CPPS PVC materials
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color, roughness: 0.45, metalness: 0.05 
  }), [color]);

  const mat2 = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: colorSecondary, roughness: 0.45, metalness: 0.05 
  }), [colorSecondary]);

  const seamMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#ffffff', roughness: 0.5, metalness: 0.05 
  }), []);

  if (profile3D === 'cylinder') {
    // Cake / Can: cylinder with two-tone panels (top half one color, bottom half another)
    const r = w / 2;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Lower body - primary color */}
          <mesh position={[0, h * 0.25, 0]} material={mat} castShadow>
            <cylinderGeometry args={[r * 0.98, r, h * 0.5, 24]} />
          </mesh>
          {/* Upper body - secondary color */}
          <mesh position={[0, h * 0.75, 0]} material={mat2} castShadow>
            <cylinderGeometry args={[r * 0.96, r * 0.98, h * 0.5, 24]} />
          </mesh>
          {/* Domed top - primary */}
          <mesh position={[0, h, 0]} material={mat} castShadow>
            <sphereGeometry args={[r * 0.96, 16, 10, 0, Math.PI * 2, 0, Math.PI / 3]} />
          </mesh>
          {/* White seam bands at color transitions */}
          {[0.5].map((frac) => (
            <mesh key={frac} position={[0, h * frac, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r * 0.99, 0.025, 6, 24]} />
              <primitive object={seamMat} attach="material" />
            </mesh>
          ))}
          {/* Base ring */}
          <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.025, 6, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          {/* Top ring */}
          <mesh position={[0, h - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.97, 0.02, 6, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'cone') {
    // Cone bunker: two-tone cone
    const r = w / 2;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Lower cone section - primary */}
          <mesh position={[0, h * 0.25, 0]} material={mat} castShadow>
            <coneGeometry args={[r, h * 0.5, 20, 1, true]} />
          </mesh>
          {/* Upper cone section - secondary */}
          <mesh position={[0, h * 0.65, 0]} material={mat2} castShadow>
            <coneGeometry args={[r * 0.45, h * 0.5, 20, 1, true]} />
          </mesh>
          {/* Rounded tip - primary */}
          <mesh position={[0, h * 0.95, 0]} material={mat}>
            <sphereGeometry args={[r * 0.12, 10, 8]} />
          </mesh>
          {/* White seam at transition */}
          <mesh position={[0, h * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.5, 0.025, 6, 20]} />
            <primitive object={seamMat} attach="material" />
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
    // Dorito: triangular-based pyramid (tetrahedron-like)
    // Real Sup'Air doritos have an equilateral triangle base on the ground
    // with all three faces rising to a single apex point at the top
    const halfW = w / 2;
    const thirdD = d / 3;
    
    // Base vertices of equilateral triangle (centered at origin, lying on ground y=0)
    const v0: [number, number, number] = [0, 0, -thirdD * 2];       // front point
    const v1: [number, number, number] = [-halfW, 0, thirdD];       // back-left
    const v2: [number, number, number] = [halfW, 0, thirdD];        // back-right
    const apex: [number, number, number] = [0, h, 0];               // top apex

    // Helper to compute face normal from 3 vertices
    const faceNormal = (a: [number,number,number], b: [number,number,number], c: [number,number,number]): [number,number,number] => {
      const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
      const vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
      const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      return [nx/len, ny/len, nz/len];
    };

    // Three sloped faces + bottom face
    const faces: { verts: [number,number,number][]; }[] = [
      { verts: [v0, v1, apex] },   // left face
      { verts: [v1, v2, apex] },   // back face  
      { verts: [v2, v0, apex] },   // right face
    ];

    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Sloped pyramid faces */}
          {faces.map((face, fi) => {
            const [a, b, c] = face.verts;
            const n = faceNormal(a, b, c);
            const faceMat = fi % 2 === 0 ? mat : mat2; // alternating red/blue panels
            return (
              <mesh key={fi} castShadow>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([...a, ...b, ...c])}
                    count={3}
                    itemSize={3}
                  />
                  <bufferAttribute
                    attach="attributes-normal"
                    array={new Float32Array([...n, ...n, ...n])}
                    count={3}
                    itemSize={3}
                  />
                </bufferGeometry>
                <primitive object={faceMat} attach="material" />
              </mesh>
            );
          })}
          {/* Bottom face (triangle on ground) */}
          <mesh>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([...v0, ...v2, ...v1])}
                count={3}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-normal"
                array={new Float32Array([0,-1,0, 0,-1,0, 0,-1,0])}
                count={3}
                itemSize={3}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Edge seam lines for inflatable look */}
          {[[v0,apex],[v1,apex],[v2,apex]].map(([from, to], i) => {
            const mx = (from[0]+to[0])/2, my = (from[1]+to[1])/2, mz = (from[2]+to[2])/2;
            const dx = to[0]-from[0], dy = to[1]-from[1], dz = to[2]-from[2];
            const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
            return (
              <mesh key={`seam-${i}`} position={[mx, my, mz]}>
                <boxGeometry args={[0.03, 0.03, 0.03]} />
                <primitive object={seamMat} attach="material" />
              </mesh>
            );
          })}
          {/* Base edge seams */}
          {[[v0,v1],[v1,v2],[v2,v0]].map(([from, to], i) => {
            const mx = (from[0]+to[0])/2, my = 0.02, mz = (from[2]+to[2])/2;
            return (
              <mesh key={`base-seam-${i}`} position={[mx, my, mz]}>
                <boxGeometry args={[0.03, 0.03, 0.03]} />
                <primitive object={seamMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      </>
    );
  }

  if (profile3D === 'half-cylinder') {
    // Snake beam: half-cylinder tube lying on the ground along Z axis
    // Cross-section: half-ellipse with ground width = w, peak height = h
    const rX = w / 2;       // half-width at ground level
    const scaleY = h / rX;  // vertical stretch to reach correct height
    const tubeLen = d;       // total length of the beam
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Scale Y to turn half-circle into half-ellipse matching width & height */}
          <group scale={[1, scaleY, 1]}>
            {/* Main half-cylinder tube body - primary color */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[rX, rX, tubeLen * 0.7, 16, 1, true, 0, Math.PI]} />
              <primitive object={mat} attach="material" />
            </mesh>
            {/* Front end cap - secondary */}
            <mesh position={[0, 0, -tubeLen * 0.35]} rotation={[Math.PI, 0, 0]}>
              <sphereGeometry args={[rX, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={mat2} attach="material" />
            </mesh>
            {/* Back end cap - secondary */}
            <mesh position={[0, 0, tubeLen * 0.35]}>
              <sphereGeometry args={[rX, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={mat2} attach="material" />
            </mesh>
          </group>
          {/* Flat bottom (not scaled) */}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, tubeLen]} />
            <primitive object={mat} attach="material" />
          </mesh>
          {/* White top seam ridge */}
          <mesh position={[0, h + 0.01, 0]}>
            <boxGeometry args={[0.025, 0.025, tubeLen * 0.9]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'stepped-pyramid') {
    // Temple / Temple Maya: alternating red/blue tiers
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
            const tierMat = i % 2 === 0 ? mat : mat2; // alternate colors per tier
            return (
              <group key={i}>
                <mesh position={[0, tierH * i + tierH / 2, 0]} material={tierMat} castShadow>
                  <boxGeometry args={[tw, tierH * 0.9, td]} />
                </mesh>
                {/* White seam edges */}
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
    // Wing / Mini Race: two-tone panel
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          {/* Main body - primary */}
          <mesh position={[0, h * 0.4, 0]} material={mat} castShadow>
            <boxGeometry args={[w, h * 0.7, d]} />
          </mesh>
          {/* Rounded top - secondary */}
          <mesh position={[0, h * 0.75, 0]} rotation={[0, 0, Math.PI / 2]} material={mat2} castShadow>
            <cylinderGeometry args={[h * 0.28, h * 0.28, w, 12, 1, false, 0, Math.PI]} />
          </mesh>
          {/* White front seam */}
          <mesh position={[0, h * 0.4, d / 2 + 0.005]}>
            <planeGeometry args={[w * 0.9, 0.02]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          {/* White back seam */}
          <mesh position={[0, h * 0.4, -(d / 2 + 0.005)]}>
            <planeGeometry args={[w * 0.9, 0.02]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  // Default box fallback (brick) - two-tone: front/back primary, sides secondary
  return (
    <>
      {label}
      <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
        {/* Lower half - primary */}
        <mesh position={[0, h * 0.25, 0]} material={mat} castShadow>
          <boxGeometry args={[w, h * 0.5, d]} />
        </mesh>
        {/* Upper half - secondary */}
        <mesh position={[0, h * 0.75, 0]} material={mat2} castShadow>
          <boxGeometry args={[w, h * 0.5, d]} />
        </mesh>
        {/* White seam at transition */}
        <mesh position={[0, h * 0.5, 0]}>
          <boxGeometry args={[w * 1.01, 0.03, d * 1.01]} />
          <primitive object={seamMat} attach="material" />
        </mesh>
        {/* White top edge */}
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
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">MOVE</span>
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▲</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▼</span>
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">◀</span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▶</span>
    </div>
  );
}

// ---- Virtual Look Joystick (right side) ----
function VirtualLookJoystick({ lookRef }: { lookRef: React.MutableRefObject<LookInput> }) {
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
    lookRef.current = { lookX: dx / RADIUS, lookY: dy / RADIUS };
  }, [lookRef]);

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
        lookRef.current = { lookX: 0, lookY: 0 };
        break;
      }
    }
  }, [lookRef]);

  return (
    <div
      ref={padRef}
      className="absolute bottom-4 right-4 w-[100px] h-[100px] rounded-full border-2 border-foreground/20 bg-background/30 backdrop-blur-sm flex items-center justify-center touch-none z-10"
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
      {/* Look direction label */}
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">LOOK</span>
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▲</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▼</span>
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">◀</span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-foreground/40 pointer-events-none select-none">▶</span>
    </div>
  );
}

// ---- Main scene ----
function Scene({ obstacles, viewPosition, onPositionChange, onStanceChange, joystickRef, lookRef, mobileStanceRef, headingRef, showLabels }: {
  obstacles: Obstacle[];
  viewPosition: [number, number, number];
  onPositionChange?: (x: number, z: number) => void;
  onStanceChange?: (stance: { sprinting: boolean; crouching: boolean; eyeHeight: number }) => void;
  joystickRef: React.MutableRefObject<JoystickInput>;
  lookRef: React.MutableRefObject<LookInput>;
  mobileStanceRef: React.MutableRefObject<MobileStanceInput>;
  headingRef: React.MutableRefObject<number>;
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

      <FirstPersonCamera position={viewPosition} onPositionChange={onPositionChange} onStanceChange={onStanceChange} joystickRef={joystickRef} lookRef={lookRef} mobileStanceRef={mobileStanceRef} headingRef={headingRef} />
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
  const lookRef = useRef<LookInput>({ lookX: 0, lookY: 0 });
  const mobileStanceRef = useRef<MobileStanceInput>({ sprinting: false, crouching: false });
  const headingRef = useRef<number>(0);
  const compassRef = useRef<HTMLDivElement>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [mobileSprinting, setMobileSprinting] = useState(false);
  const [mobileCrouching, setMobileCrouching] = useState(false);

  // Animate compass from headingRef
  useEffect(() => {
    let raf: number;
    const update = () => {
      if (compassRef.current) {
        const deg = (headingRef.current * 180) / Math.PI;
        compassRef.current.style.transform = `rotate(${deg}deg)`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sync mobile stance buttons to ref
  useEffect(() => {
    mobileStanceRef.current = { sprinting: mobileSprinting, crouching: mobileCrouching };
  }, [mobileSprinting, mobileCrouching]);

  const toggleSprint = useCallback(() => {
    setMobileSprinting(prev => {
      if (!prev) setMobileCrouching(false);
      return !prev;
    });
  }, []);

  const toggleCrouch = useCallback(() => {
    setMobileCrouching(prev => {
      if (!prev) setMobileSprinting(false);
      return !prev;
    });
  }, []);
  
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
        <Scene obstacles={obstacles} viewPosition={viewPosition} onPositionChange={handlePositionChange} onStanceChange={onStanceChange} joystickRef={joystickRef} lookRef={lookRef} mobileStanceRef={mobileStanceRef} headingRef={headingRef} showLabels={showLabels} />
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
      {/* Compass overlay */}
      <div className="absolute top-3 right-3 z-10 w-14 h-14 md:w-16 md:h-16">
        <div className="w-full h-full rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center">
          <div ref={compassRef} className="w-10 h-10 md:w-12 md:h-12 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Cardinal direction ticks */}
              {[0, 90, 180, 270].map((angle) => (
                <line
                  key={angle}
                  x1="50" y1="8" x2="50" y2="14"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.5"
                  transform={`rotate(${angle} 50 50)`}
                />
              ))}
              {/* Minor ticks */}
              {[45, 135, 225, 315].map((angle) => (
                <line
                  key={angle}
                  x1="50" y1="10" x2="50" y2="14"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                  transform={`rotate(${angle} 50 50)`}
                />
              ))}
              {/* North arrow (red) */}
              <polygon points="50,12 44,50 50,44 56,50" fill="#cc1122" />
              {/* South arrow (white/grey) */}
              <polygon points="50,88 44,50 50,56 56,50" fill="rgba(255,255,255,0.35)" />
              {/* Center dot */}
              <circle cx="50" cy="50" r="3" fill="white" />
              {/* Cardinal labels */}
              <text x="50" y="7" textAnchor="middle" fill="#cc1122" fontSize="11" fontWeight="bold" fontFamily="sans-serif">N</text>
              <text x="50" y="98" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="sans-serif">S</text>
              <text x="95" y="53" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="sans-serif">E</text>
              <text x="5" y="53" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="sans-serif">W</text>
            </svg>
          </div>
        </div>
      </div>
      <div className="md:hidden">
        <VirtualJoystick joystickRef={joystickRef} />
        <VirtualLookJoystick lookRef={lookRef} />
        {/* Sprint & Crouch buttons between joysticks */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col gap-2">
          <button
            onTouchStart={(e) => { e.preventDefault(); toggleSprint(); }}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border transition-colors touch-none ${
              mobileSprinting 
                ? 'bg-primary/70 border-primary text-primary-foreground' 
                : 'bg-background/30 border-foreground/20 text-foreground/60'
            }`}
            title="Sprint"
          >
            <Zap size={20} />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); toggleCrouch(); }}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border transition-colors touch-none ${
              mobileCrouching 
                ? 'bg-primary/70 border-primary text-primary-foreground' 
                : 'bg-background/30 border-foreground/20 text-foreground/60'
            }`}
            title="Crouch"
          >
            <ArrowDownToLine size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
