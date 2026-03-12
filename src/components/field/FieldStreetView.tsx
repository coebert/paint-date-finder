import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky, Text, Billboard, Environment } from '@react-three/drei';
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

      {/* Floating base labels */}
      <Billboard position={[-hw + 1.5, 3.5, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Text fontSize={1.2} color="#4488ff" anchorX="center" anchorY="middle" fontWeight={700}
          outlineWidth={0.06} outlineColor="#000000">
          BLUE BASE
        </Text>
      </Billboard>
      <Billboard position={[hw - 1.5, 3.5, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Text fontSize={1.2} color="#ff4444" anchorX="center" anchorY="middle" fontWeight={700}
          outlineWidth={0.06} outlineColor="#000000">
          RED BASE
        </Text>
      </Billboard>
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

// ---- Accurate 3D Obstacle shapes (NXL Tampa Bay style: red body, blue cap/top) ----
// Creates an inflated (puffy) box geometry — subdivided box with vertices pushed outward
function createInflatedBoxGeometry(w: number, h: number, d: number, inflate: number = 0.06): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d, 8, 8, 8);
  const pos = geo.attributes.position;
  const cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Normalize position relative to box center and inflate outward
    const nx = (x - cx) / (w / 2);
    const ny = (y - cy) / (h / 2);
    const nz = (z - cz) / (d / 2);
    // Inflation factor — strongest at face centers, zero at edges/corners
    const onFaceX = Math.abs(nx) > 0.99 ? 1 : 0;
    const onFaceY = Math.abs(ny) > 0.99 ? 1 : 0;
    const onFaceZ = Math.abs(nz) > 0.99 ? 1 : 0;
    // For face verts, inflate based on distance from face center
    const faceFactor = onFaceX + onFaceY + onFaceZ; // 1 on face, 2 on edge, 3 on corner
    if (faceFactor === 1) {
      // On a face — inflate outward based on proximity to center of face
      const distFromCenter = onFaceX ? Math.sqrt(ny*ny + nz*nz) : onFaceY ? Math.sqrt(nx*nx + nz*nz) : Math.sqrt(nx*nx + ny*ny);
      const puff = inflate * Math.max(0, 1 - distFromCenter * distFromCenter);
      pos.setX(i, x + (onFaceX ? Math.sign(nx) * puff * w : 0));
      pos.setY(i, y + (onFaceY ? Math.sign(ny) * puff * h : 0));
      pos.setZ(i, z + (onFaceZ ? Math.sign(nz) * puff * d : 0));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Creates barrel-shaped cylinder (wider in middle) for inflatable look
function createBarrelCylinderGeometry(rTop: number, rBottom: number, height: number, segments: number = 24, heightSegs: number = 12): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, height, segments, heightSegs);
  const pos = geo.attributes.position;
  const bulge = 0.08; // How much wider the middle is
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    if (r < 0.001) continue;
    // t goes from 0 at ends to 1 at middle
    const t = 1 - Math.abs(y / (height / 2));
    const scale = 1 + bulge * Math.sin(t * Math.PI);
    pos.setX(i, x * scale);
    pos.setZ(i, z * scale);
  }
  geo.computeVertexNormals();
  return geo;
}

// Ground-contact ambient occlusion shadow
const groundShadowTexture = (() => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
})();

function GroundShadow({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width * 1.5, depth * 1.5]} />
      <meshBasicMaterial map={groundShadowTexture} transparent depthWrite={false} opacity={1} />
    </mesh>
  );
}

function Obstacle3D({ obstacle, showLabels = true }: { obstacle: Obstacle; showLabels?: boolean }) {
  const def = OBSTACLE_DEFINITIONS[obstacle.type];
  const worldX = (obstacle.x / 100 - 0.5) * FIELD_WIDTH_M;
  const worldZ = (obstacle.y / 100 - 0.5) * FIELD_HEIGHT_M;
  const rotRad = (obstacle.rotation * Math.PI) / 180;
  const { widthM: w, depthM: d, heightM: h, profile3D } = def;
  const labelY = h + 0.4;

  // NXL-style colors: red body, blue accents (top caps, bands)
  const NXL_RED = '#cc1122';
  const NXL_BLUE = '#1155cc';

  const label = showLabels ? <ObstacleLabel position={[worldX, labelY, worldZ]} label={def.label} color={NXL_RED} /> : null;

  // Vinyl inflatable material — glossy clearcoat for that PVC shine
  const matRed = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: NXL_RED, roughness: 0.35, metalness: 0.0,
    clearcoat: 0.9, clearcoatRoughness: 0.15,
  }), []);

  const matBlue = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: NXL_BLUE, roughness: 0.35, metalness: 0.0,
    clearcoat: 0.9, clearcoatRoughness: 0.15,
  }), []);

  const seamMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: '#eeeeee', roughness: 0.3, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.1,
  }), []);

  // Seam line material — slightly translucent so it's subtle
  const seamLineMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#dddddd', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  }), []);

  // --- Seam line helpers ---
  // Vertical seam strips on a cylinder (evenly spaced around circumference)
  const CylinderSeams = ({ radius, height, count = 4, yOffset = 0 }: { radius: number; height: number; count?: number; yOffset?: number }) => (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(angle) * (radius + 0.005), yOffset + height / 2, Math.cos(angle) * (radius + 0.005)]} rotation={[0, angle, 0]}>
            <planeGeometry args={[0.02, height]} />
            <primitive object={seamLineMat} attach="material" />
          </mesh>
        );
      })}
    </>
  );

  // Horizontal + vertical seam strips on a box face
  const BoxSeams = ({ bw, bh, bd, yOffset = 0 }: { bw: number; bh: number; bd: number; yOffset?: number }) => (
    <>
      {/* Vertical center seam on front & back */}
      <mesh position={[0, yOffset + bh / 2, bd / 2 + 0.005]}>
        <planeGeometry args={[0.02, bh]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      <mesh position={[0, yOffset + bh / 2, -(bd / 2 + 0.005)]}>
        <planeGeometry args={[0.02, bh]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      {/* Vertical center seam on left & right */}
      <mesh position={[bw / 2 + 0.005, yOffset + bh / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.02, bh]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      <mesh position={[-(bw / 2 + 0.005), yOffset + bh / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.02, bh]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      {/* Horizontal mid-height seam on front & back */}
      <mesh position={[0, yOffset + bh / 2, bd / 2 + 0.005]}>
        <planeGeometry args={[bw, 0.02]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      <mesh position={[0, yOffset + bh / 2, -(bd / 2 + 0.005)]}>
        <planeGeometry args={[bw, 0.02]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      {/* Horizontal mid-height seam on left & right */}
      <mesh position={[bw / 2 + 0.005, yOffset + bh / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[bd, 0.02]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
      <mesh position={[-(bw / 2 + 0.005), yOffset + bh / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[bd, 0.02]} />
        <primitive object={seamLineMat} attach="material" />
      </mesh>
    </>
  );

  const r = w / 2;
  const capH_cyl = h * 0.15;
  const bodyH_cyl = h - capH_cyl;
  const capH_box = h * 0.2;
  const bodyH_box = h - capH_box;
  const capH_plus = h * 0.15;
  const bodyH_plus = h - capH_plus;
  const armW_plus = w * 0.38;

  const barrelBodyGeo = useMemo(() => createBarrelCylinderGeometry(r, r, bodyH_cyl, 24, 12), [r, bodyH_cyl]);
  const barrelCapGeo = useMemo(() => createBarrelCylinderGeometry(r * 1.02, r * 1.02, capH_cyl, 24, 6), [r, capH_cyl]);
  const coneGeo = useMemo(() => {
    // Inflatable cone — subdivided with slight bulge
    const geo = new THREE.ConeGeometry(r, h, 24, 12);
    const pos = geo.attributes.position;
    const bulge = 0.06;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 0.001) continue;
      const t = (y + h / 2) / h; // 0 at base, 1 at tip
      const expectedR = r * (1 - t);
      if (expectedR < 0.01) continue;
      const scale = 1 + bulge * Math.sin(t * Math.PI);
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }, [r, h]);

  // Inflated dorito geometry (subdivided tetrahedron with puffed faces)
  const doritoGeo = useMemo(() => {
    const halfW = w / 2;
    const thirdD = d / 3;
    const v0 = new THREE.Vector3(0, 0, -thirdD * 2);
    const v1 = new THREE.Vector3(-halfW, 0, thirdD);
    const v2 = new THREE.Vector3(halfW, 0, thirdD);
    const apex = new THREE.Vector3(0, h, 0);
    const center = new THREE.Vector3().addVectors(v0, v1).add(v2).add(apex).multiplyScalar(0.25);

    // Build subdivided tetrahedron
    const geo = new THREE.TetrahedronGeometry(1, 2);
    // We'll manually build a BufferGeometry from the 4 vertices
    const positions: number[] = [];
    const subdivide = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, depth: number) => {
      if (depth === 0) {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        return;
      }
      const ab = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const bc = new THREE.Vector3().addVectors(b, c).multiplyScalar(0.5);
      const ca = new THREE.Vector3().addVectors(c, a).multiplyScalar(0.5);
      subdivide(a, ab, ca, depth - 1);
      subdivide(ab, b, bc, depth - 1);
      subdivide(ca, bc, c, depth - 1);
      subdivide(ab, bc, ca, depth - 1);
    };

    const faces = [
      [v0, v1, apex], [v1, v2, apex], [v2, v0, apex], // Side faces
      [v0, v2, v1], // Bottom
    ];
    faces.forEach(([a, b, c]) => subdivide(a, b, c, 3));

    const posArr = new Float32Array(positions);
    const customGeo = new THREE.BufferGeometry();
    customGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    // Inflate: push each vertex outward from the centroid of its face
    const posAttr = customGeo.attributes.position;
    const inflate = 0.04;
    for (let tri = 0; tri < posAttr.count / 3; tri++) {
      const i0 = tri * 3, i1 = tri * 3 + 1, i2 = tri * 3 + 2;
      const fc = new THREE.Vector3(
        (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3,
        (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3,
        (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3,
      );
      const outDir = new THREE.Vector3().subVectors(fc, center).normalize();
      for (const idx of [i0, i1, i2]) {
        const p = new THREE.Vector3(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx));
        const distToCenter = p.distanceTo(fc) / Math.max(w, d, h);
        const puff = inflate * Math.max(0, 1 - distToCenter * 3);
        posAttr.setXYZ(idx, p.x + outDir.x * puff * w, p.y + outDir.y * puff * h, p.z + outDir.z * puff * d);
      }
    }
    customGeo.computeVertexNormals();
    return customGeo;
  }, [w, d, h]);

  // Snake beam — barrel lying on ground
  const snakeGeo = useMemo(() => {
    const tubeLen = d;
    const sr = w / 2;
    const geo = new THREE.CylinderGeometry(sr, sr, tubeLen, 24, 12);
    const pos = geo.attributes.position;
    const bulge = 0.1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 0.001) continue;
      const t = 1 - Math.abs(y / (tubeLen / 2));
      const scale = 1 + bulge * Math.sin(t * Math.PI);
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }, [w, d]);

  // Snake end cap — hemisphere
  const snakeCapGeo = useMemo(() => {
    return new THREE.SphereGeometry(w / 2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  }, [w]);

  // Inflated box geometries for temple tiers, flat panels, bricks, plus arms
  const inflatedBoxBody = useMemo(() => createInflatedBoxGeometry(w, bodyH_box, d, 0.07), [w, bodyH_box, d]);
  const inflatedBoxCap = useMemo(() => createInflatedBoxGeometry(w, capH_box, d, 0.05), [w, capH_box, d]);

  const inflatedPlusHBody = useMemo(() => createInflatedBoxGeometry(w, bodyH_plus, armW_plus, 0.06), [w, bodyH_plus, armW_plus]);
  const inflatedPlusVBody = useMemo(() => createInflatedBoxGeometry(armW_plus, bodyH_plus, d, 0.06), [armW_plus, bodyH_plus, d]);
  const inflatedPlusHCap = useMemo(() => createInflatedBoxGeometry(w, capH_plus, armW_plus, 0.04), [w, capH_plus, armW_plus]);
  const inflatedPlusVCap = useMemo(() => createInflatedBoxGeometry(armW_plus, capH_plus, d, 0.04), [armW_plus, capH_plus, d]);

  const inflatedFlatBody = useMemo(() => createInflatedBoxGeometry(w, h * 0.7, d, 0.08), [w, h, d]);

  if (profile3D === 'cylinder') {
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          <mesh position={[0, bodyH_cyl / 2, 0]} castShadow geometry={barrelBodyGeo}>
            <primitive object={matRed} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_cyl + capH_cyl / 2, 0]} castShadow geometry={barrelCapGeo}>
            <primitive object={matBlue} attach="material" />
          </mesh>
          {/* Puffy dome on top */}
          <mesh position={[0, h, 0]}>
            <sphereGeometry args={[r * 0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <primitive object={matBlue} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_cyl, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 1.01, 0.03, 8, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.025, 8, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          {/* Vertical panel seams */}
          <CylinderSeams radius={r} height={h} count={6} />
        </group>
      </>
    );
  }

  if (profile3D === 'cone') {
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          <mesh position={[0, h / 2, 0]} castShadow geometry={coneGeo}>
            <primitive object={matRed} attach="material" />
          </mesh>
          {/* Blue band at base — barrel shaped */}
          <mesh position={[0, h * 0.1, 0]} castShadow>
            <cylinderGeometry args={[r * 0.98, r, h * 0.2, 24]} />
            <primitive object={matBlue} attach="material" />
          </mesh>
          {/* Rounded tip */}
          <mesh position={[0, h * 0.98, 0]}>
            <sphereGeometry args={[r * 0.1, 12, 10]} />
            <primitive object={matRed} attach="material" />
          </mesh>
          <mesh position={[0, h * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.9, 0.025, 8, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.025, 8, 24]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'prism-triangle') {
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          <mesh castShadow geometry={doritoGeo}>
            <primitive object={matRed} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  if (profile3D === 'half-cylinder') {
    const tubeLen = d;
    const sr = w / 2;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          {/* Red barrel body */}
          <mesh position={[0, sr, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow geometry={snakeGeo}>
            <primitive object={matRed} attach="material" />
          </mesh>
          {/* Blue hemisphere end caps */}
          <mesh position={[0, sr, -tubeLen / 2]} rotation={[Math.PI / 2, 0, 0]} geometry={snakeCapGeo}>
            <primitive object={matBlue} attach="material" />
          </mesh>
          <mesh position={[0, sr, tubeLen / 2]} rotation={[-Math.PI / 2, 0, 0]} geometry={snakeCapGeo}>
            <primitive object={matBlue} attach="material" />
          </mesh>
          {/* White seam rings */}
          {[-1, 1].map((sign) => (
            <mesh key={sign} position={[0, sr, sign * (tubeLen / 2 - 0.08)]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[sr * 0.99, 0.02, 8, 24]} />
              <primitive object={seamMat} attach="material" />
            </mesh>
          ))}
        </group>
      </>
    );
  }

  if (profile3D === 'stepped-pyramid') {
    const tiers = obstacle.type === 'temple-maya' ? 4 : 3;
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          {Array.from({ length: tiers }).map((_, i) => {
            const scale = 1 - (i * 0.18);
            const tierH = h / tiers;
            const tw = w * scale;
            const td = d * scale;
            const tierMat = i === tiers - 1 ? matBlue : matRed;
            return (
              <group key={i}>
                <mesh position={[0, tierH * i + tierH / 2, 0]} castShadow>
                  <boxGeometry args={[tw, tierH * 0.92, td, 6, 6, 6]} />
                  <primitive object={tierMat} attach="material" />
                </mesh>
                <mesh position={[0, tierH * (i + 1) - tierH * 0.04, 0]}>
                  <boxGeometry args={[tw * 1.01, 0.035, td * 1.01]} />
                  <primitive object={seamMat} attach="material" />
                </mesh>
              </group>
            );
          })}
        </group>
      </>
    );
  }

  if (profile3D === 'flat-panel') {
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          <mesh position={[0, h * 0.35, 0]} castShadow geometry={inflatedFlatBody}>
            <primitive object={matRed} attach="material" />
          </mesh>
          {/* Blue puffy rounded top */}
          <mesh position={[0, h * 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[h * 0.3, h * 0.3, w, 16, 8, false, 0, Math.PI]} />
            <primitive object={matBlue} attach="material" />
          </mesh>
          <mesh position={[0, h * 0.7, 0]}>
            <boxGeometry args={[w * 1.01, 0.03, d * 1.01]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  // Giant Plus
  if (def.birdEye === 'plus') {
    return (
      <>
        {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
          <mesh position={[0, bodyH_plus / 2, 0]} castShadow geometry={inflatedPlusHBody}>
            <primitive object={matRed} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_plus / 2, 0]} castShadow geometry={inflatedPlusVBody}>
            <primitive object={matRed} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_plus + capH_plus / 2, 0]} castShadow geometry={inflatedPlusHCap}>
            <primitive object={matBlue} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_plus + capH_plus / 2, 0]} castShadow geometry={inflatedPlusVCap}>
            <primitive object={matBlue} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_plus, 0]}>
            <boxGeometry args={[w * 1.01, 0.035, armW_plus * 1.01]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
          <mesh position={[0, bodyH_plus, 0]}>
            <boxGeometry args={[armW_plus * 1.01, 0.035, d * 1.01]} />
            <primitive object={seamMat} attach="material" />
          </mesh>
        </group>
      </>
    );
  }

  // Default box fallback (brick, etc.) — inflated body + cap
  return (
    <>
      {label}
        <group position={[worldX, 0, worldZ]} rotation={[0, rotRad, 0]}>
          <GroundShadow width={w} depth={d} />
        <mesh position={[0, bodyH_box / 2, 0]} castShadow geometry={inflatedBoxBody}>
          <primitive object={matRed} attach="material" />
        </mesh>
        <mesh position={[0, bodyH_box + capH_box / 2, 0]} castShadow geometry={inflatedBoxCap}>
          <primitive object={matBlue} attach="material" />
        </mesh>
        <mesh position={[0, bodyH_box, 0]}>
          <boxGeometry args={[w * 1.01, 0.035, d * 1.01]} />
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
      <Environment preset="park" background={false} />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[25, 50, 30]} 
        intensity={2.0} 
        castShadow
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <directionalLight position={[-20, 30, -15]} intensity={0.5} />
      <hemisphereLight args={['#b4d7ff', '#3a8f29', 0.4]} />

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
