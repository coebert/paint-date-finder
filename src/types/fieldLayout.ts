export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number; // percentage 0-100 of field width
  y: number; // percentage 0-100 of field height
  rotation: number; // degrees
  label?: string;
}

export type ObstacleType =
  | 'tall-cake'
  | 'small-cake'
  | 'dorito-big'
  | 'dorito-small'
  | 'snake'
  | 'temple'
  | 'temple-maya'
  | 'brick'
  | 'wing'
  | 'mini-race'
  | 'can'
  | 'cone'
  | 'giant-plus';

export interface ObstacleDefinition {
  type: ObstacleType;
  label: string;
  // Real-world dimensions in metres
  widthM: number;  // footprint width (left-right from above)
  depthM: number;  // footprint depth (top-bottom from above)
  heightM: number; // physical height off ground
  color: string;           // primary panel color
  colorSecondary: string;  // secondary panel color (for two-tone CPPS look)
  // Bird's eye shape description
  birdEye: 'circle' | 'triangle' | 'rect' | 'capsule' | 'stepped-rect' | 'plus';
  // 3D profile cross-section
  profile3D: 'cylinder' | 'cone' | 'prism-triangle' | 'box' | 'half-cylinder' | 'stepped-pyramid' | 'flat-panel';
}

// Standard competition field: 45m wide × 36m deep (150ft × 120ft)
export const FIELD_WIDTH_M = 45;
export const FIELD_HEIGHT_M = 36;

// CPPS Sup'Air colour scheme: Red and Blue panels
const CPPS_RED = '#cc1122';
const CPPS_BLUE = '#1155cc';

// Real Sup'Air / Airups / Air-Bunker manufacturer specs — CPPS red/blue palette
export const OBSTACLE_DEFINITIONS: Record<ObstacleType, ObstacleDefinition> = {
  'tall-cake': {
    type: 'tall-cake',
    label: 'Tall Cake',
    widthM: 1.5,
    depthM: 1.5,
    heightM: 1.5,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'circle',
    profile3D: 'cylinder',
  },
  'small-cake': {
    type: 'small-cake',
    label: 'Small Cake',
    widthM: 1.0,
    depthM: 1.0,
    heightM: 1.0,
    color: CPPS_BLUE,
    colorSecondary: CPPS_RED,
    birdEye: 'circle',
    profile3D: 'cylinder',
  },
  'dorito-big': {
    type: 'dorito-big',
    label: 'Dorito (Big)',
    widthM: 2.1,
    depthM: 1.82,
    heightM: 2.1,
    color: CPPS_BLUE,
    colorSecondary: CPPS_RED,
    birdEye: 'triangle',
    profile3D: 'prism-triangle',
  },
  'dorito-small': {
    type: 'dorito-small',
    label: 'Dorito (Small)',
    widthM: 1.7,
    depthM: 1.47,
    heightM: 1.7,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'triangle',
    profile3D: 'prism-triangle',
  },
  'snake': {
    type: 'snake',
    label: 'Snake Beam',
    widthM: 0.5,
    depthM: 3.0,
    heightM: 0.75,
    color: CPPS_BLUE,
    colorSecondary: CPPS_RED,
    birdEye: 'capsule',
    profile3D: 'half-cylinder',
  },
  'temple': {
    type: 'temple',
    label: 'Temple',
    widthM: 1.5,
    depthM: 1.5,
    heightM: 1.5,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'stepped-rect',
    profile3D: 'stepped-pyramid',
  },
  'temple-maya': {
    type: 'temple-maya',
    label: 'Temple Maya',
    widthM: 1.5,
    depthM: 1.5,
    heightM: 2.5,
    color: CPPS_BLUE,
    colorSecondary: CPPS_RED,
    birdEye: 'stepped-rect',
    profile3D: 'stepped-pyramid',
  },
  'brick': {
    type: 'brick',
    label: 'Brick',
    widthM: 1.5,
    depthM: 1.25,
    heightM: 0.75,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'rect',
    profile3D: 'box',
  },
  'wing': {
    type: 'wing',
    label: 'Wing',
    widthM: 1.95,
    depthM: 1.5,
    heightM: 0.5,
    color: CPPS_BLUE,
    colorSecondary: CPPS_RED,
    birdEye: 'capsule',
    profile3D: 'flat-panel',
  },
  'mini-race': {
    type: 'mini-race',
    label: 'Mini Race',
    widthM: 1.5,
    depthM: 1.3,
    heightM: 0.5,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'capsule',
    profile3D: 'flat-panel',
  },
  'can': {
    type: 'can',
    label: 'Can / Cylinder',
    widthM: 1.2,
    depthM: 1.2,
    heightM: 2.0,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'circle',
    profile3D: 'cylinder',
  },
  'cone': {
    type: 'cone',
    label: 'Cone',
    widthM: 1.25,
    depthM: 1.25,
    heightM: 2.25,
    color: CPPS_BLUE,
    colorSecondary: CPPS_RED,
    birdEye: 'circle',
    profile3D: 'cone',
  },
  'giant-plus': {
    type: 'giant-plus',
    label: 'Giant Plus',
    widthM: 2.0,
    depthM: 2.0,
    heightM: 1.8,
    color: CPPS_RED,
    colorSecondary: CPPS_BLUE,
    birdEye: 'plus',
    profile3D: 'box',
  },
};

// Standard CPPS Sup'Air field layout (symmetrical)
export const CPPS_FIELD_LAYOUT: Obstacle[] = [
  // ===== CENTER =====
  { id: 'c1', type: 'tall-cake', x: 50, y: 50, rotation: 0 },

  // ===== SNAKE BEAMS =====
  { id: 'sn1', type: 'snake', x: 30, y: 25, rotation: 0 },
  { id: 'sn2', type: 'snake', x: 30, y: 75, rotation: 0 },
  { id: 'sn3', type: 'snake', x: 42, y: 18, rotation: 90 },
  { id: 'sn4', type: 'snake', x: 42, y: 82, rotation: 90 },

  // ===== DORITOS =====
  { id: 'dd1', type: 'dorito-big', x: 22, y: 15, rotation: -90 },
  { id: 'dd2', type: 'dorito-big', x: 22, y: 85, rotation: 90 },
  { id: 'dd3', type: 'dorito-big', x: 78, y: 15, rotation: -90 },
  { id: 'dd4', type: 'dorito-big', x: 78, y: 85, rotation: 90 },
  { id: 'ds1', type: 'dorito-small', x: 50, y: 28, rotation: 0 },
  { id: 'ds2', type: 'dorito-small', x: 50, y: 72, rotation: 180 },

  // ===== MID BUNKERS (Temple Maya) =====
  { id: 'tm1', type: 'temple-maya', x: 38, y: 38, rotation: 0 },
  { id: 'tm2', type: 'temple-maya', x: 62, y: 62, rotation: 0 },
  { id: 'tm3', type: 'temple-maya', x: 38, y: 62, rotation: 0 },
  { id: 'tm4', type: 'temple-maya', x: 62, y: 38, rotation: 0 },

  // ===== SIDE CAKES =====
  { id: 'sc1', type: 'small-cake', x: 20, y: 50, rotation: 0 },
  { id: 'sc2', type: 'small-cake', x: 80, y: 50, rotation: 0 },

  // ===== BACK BRICKS =====
  { id: 'bb1', type: 'brick', x: 8, y: 35, rotation: 0 },
  { id: 'bb2', type: 'brick', x: 8, y: 65, rotation: 0 },
  { id: 'bb3', type: 'brick', x: 92, y: 35, rotation: 0 },
  { id: 'bb4', type: 'brick', x: 92, y: 65, rotation: 0 },

  // ===== BACK WINGS =====
  { id: 'wg1', type: 'wing', x: 12, y: 50, rotation: 90 },
  { id: 'wg2', type: 'wing', x: 88, y: 50, rotation: 90 },

  // ===== 50-LINE CANS =====
  { id: 'cn1', type: 'can', x: 50, y: 38, rotation: 0 },
  { id: 'cn2', type: 'can', x: 50, y: 62, rotation: 0 },
];

// NXL Tampa Bay Open 2026 field layout
// Field: 150ft × 120ft (45m × 36m). Symmetric about the horizontal center-line.
// Obstacle positions mapped from the official NXL field plan.
// In our coordinate system: x = left→right (0=Blue base, 100=Red base), y = top→bottom.
export const NXL_TAMPA_BAY_LAYOUT: Obstacle[] = [
  // ===== GIANT PLUS (one at each base end) =====
  { id: 'nxl-gp1', type: 'giant-plus', x: 50, y: 8, rotation: 0 },
  { id: 'nxl-gp2', type: 'giant-plus', x: 50, y: 92, rotation: 0 },

  // ===== MEDIUM DORITOS (MD) =====
  { id: 'nxl-md1', type: 'dorito-big', x: 30, y: 13, rotation: 0 },
  { id: 'nxl-md2', type: 'dorito-big', x: 40, y: 13, rotation: 0 },
  { id: 'nxl-md3', type: 'dorito-big', x: 10, y: 37, rotation: 90 },
  { id: 'nxl-md4', type: 'dorito-big', x: 60, y: 87, rotation: 180 },
  { id: 'nxl-md5', type: 'dorito-big', x: 70, y: 87, rotation: 180 },
  { id: 'nxl-md6', type: 'dorito-big', x: 90, y: 63, rotation: -90 },

  // ===== SMALL DORITOS (SD) =====
  { id: 'nxl-sd1', type: 'dorito-small', x: 20, y: 15, rotation: 0 },
  { id: 'nxl-sd2', type: 'dorito-small', x: 80, y: 85, rotation: 180 },

  // ===== DORITOS along sidelines =====
  { id: 'nxl-d1', type: 'dorito-big', x: 60, y: 10, rotation: 0 },
  { id: 'nxl-d2', type: 'dorito-big', x: 70, y: 8, rotation: 0 },
  { id: 'nxl-d3', type: 'dorito-big', x: 80, y: 10, rotation: 0 },
  { id: 'nxl-d4', type: 'dorito-big', x: 90, y: 13, rotation: 0 },
  { id: 'nxl-d5', type: 'dorito-big', x: 40, y: 90, rotation: 180 },
  { id: 'nxl-d6', type: 'dorito-big', x: 30, y: 92, rotation: 180 },
  { id: 'nxl-d7', type: 'dorito-big', x: 20, y: 90, rotation: 180 },
  { id: 'nxl-d8', type: 'dorito-big', x: 10, y: 87, rotation: 180 },

  // ===== SNAKE BEAMS (SB) =====
  // Center snake corridor
  { id: 'nxl-sb1', type: 'snake', x: 48, y: 38, rotation: 0 },
  { id: 'nxl-sb2', type: 'snake', x: 47, y: 48, rotation: 0 },
  { id: 'nxl-sb3', type: 'snake', x: 52, y: 62, rotation: 0 },
  { id: 'nxl-sb4', type: 'snake', x: 53, y: 52, rotation: 0 },
  // Bottom base snake row (4 beams in a row)
  { id: 'nxl-sb5', type: 'snake', x: 25, y: 83, rotation: 90 },
  { id: 'nxl-sb6', type: 'snake', x: 32, y: 83, rotation: 90 },
  { id: 'nxl-sb7', type: 'snake', x: 38, y: 83, rotation: 90 },
  { id: 'nxl-sb8', type: 'snake', x: 44, y: 83, rotation: 90 },
  // Top base snake row (mirrored)
  { id: 'nxl-sb9', type: 'snake', x: 75, y: 17, rotation: 90 },
  { id: 'nxl-sb10', type: 'snake', x: 68, y: 17, rotation: 90 },
  { id: 'nxl-sb11', type: 'snake', x: 62, y: 17, rotation: 90 },
  { id: 'nxl-sb12', type: 'snake', x: 56, y: 17, rotation: 90 },
  // Side snake
  { id: 'nxl-sb13', type: 'snake', x: 52, y: 75, rotation: 0 },

  // ===== TREES / CYLINDERS (Tr) =====
  { id: 'nxl-tr1', type: 'can', x: 42, y: 33, rotation: 0 },
  { id: 'nxl-tr2', type: 'can', x: 53, y: 50, rotation: 0 },
  { id: 'nxl-tr3', type: 'can', x: 58, y: 67, rotation: 0 },
  { id: 'nxl-tr4', type: 'can', x: 47, y: 50, rotation: 0 },

  // ===== CYLINDERS (C) =====
  { id: 'nxl-c1', type: 'can', x: 62, y: 38, rotation: 0 },
  { id: 'nxl-c2', type: 'can', x: 38, y: 62, rotation: 0 },

  // ===== MAYA TEMPLES (MT) =====
  { id: 'nxl-mt1', type: 'temple-maya', x: 35, y: 42, rotation: 0 },
  { id: 'nxl-mt2', type: 'temple-maya', x: 8, y: 83, rotation: 0 },
  { id: 'nxl-mt3', type: 'temple-maya', x: 65, y: 58, rotation: 0 },
  { id: 'nxl-mt4', type: 'temple-maya', x: 92, y: 17, rotation: 0 },

  // ===== TEMPLES (T) =====
  { id: 'nxl-t1', type: 'temple', x: 8, y: 53, rotation: 0 },
  { id: 'nxl-t2', type: 'temple', x: 8, y: 67, rotation: 0 },
  { id: 'nxl-t3', type: 'temple', x: 92, y: 33, rotation: 0 },
  { id: 'nxl-t4', type: 'temple', x: 92, y: 47, rotation: 0 },

  // ===== BRICKS (Br) =====
  { id: 'nxl-br1', type: 'brick', x: 12, y: 22, rotation: 0 },
  { id: 'nxl-br2', type: 'brick', x: 33, y: 90, rotation: 0 },
  { id: 'nxl-br3', type: 'brick', x: 88, y: 78, rotation: 0 },
  { id: 'nxl-br4', type: 'brick', x: 67, y: 10, rotation: 0 },

  // ===== MINI W / MINI RACE (MW) =====
  { id: 'nxl-mw1', type: 'mini-race', x: 25, y: 28, rotation: 0 },
  { id: 'nxl-mw2', type: 'mini-race', x: 55, y: 28, rotation: 0 },
  { id: 'nxl-mw3', type: 'mini-race', x: 75, y: 72, rotation: 0 },
  { id: 'nxl-mw4', type: 'mini-race', x: 45, y: 72, rotation: 0 },

  // ===== GIANT WING (GW) =====
  { id: 'nxl-gw1', type: 'wing', x: 40, y: 57, rotation: 0 },
  { id: 'nxl-gw2', type: 'wing', x: 60, y: 43, rotation: 0 },

  // ===== GIANT BRICK (GB) =====
  { id: 'nxl-gb1', type: 'brick', x: 38, y: 75, rotation: 0 },
  { id: 'nxl-gb2', type: 'brick', x: 62, y: 25, rotation: 0 },

  // ===== CAKE (Ck) =====
  { id: 'nxl-ck1', type: 'small-cake', x: 27, y: 88, rotation: 0 },
  { id: 'nxl-ck2', type: 'small-cake', x: 73, y: 12, rotation: 0 },

  // ===== WING (Wg) =====
  { id: 'nxl-wg1', type: 'wing', x: 40, y: 90, rotation: 90 },
  { id: 'nxl-wg2', type: 'wing', x: 60, y: 10, rotation: 90 },
];
