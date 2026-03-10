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
  | 'cone';

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
  birdEye: 'circle' | 'triangle' | 'rect' | 'capsule' | 'stepped-rect';
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
