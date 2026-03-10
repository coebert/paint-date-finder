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
  // Real-world footprint dimensions in metres (bird's eye view)
  widthM: number;  // width across field (left-right from above)
  depthM: number;  // depth into field (top-bottom from above)
  heightM: number; // physical height (for info display only)
  color: string;
  shape: 'circle' | 'triangle' | 'rect' | 'rounded-rect' | 'wing';
}

// Standard competition field: 45m wide × 36m deep (150ft × 120ft)
export const FIELD_WIDTH_M = 45;
export const FIELD_HEIGHT_M = 36;

// Real Sup'Air obstacle dimensions from manufacturer specs
// Dimensions: width × depth × height (metres). Bird's eye uses width × depth.
export const OBSTACLE_DEFINITIONS: Record<ObstacleType, ObstacleDefinition> = {
  'tall-cake': {
    type: 'tall-cake',
    label: 'Tall Cake',
    // Cylinder: 1.5m diameter, 1.5m tall → circle from above
    widthM: 1.5,
    depthM: 1.5,
    heightM: 1.5,
    color: 'hsl(25, 95%, 53%)',
    shape: 'circle',
  },
  'small-cake': {
    type: 'small-cake',
    label: 'Small Cake',
    // Cylinder: 1.0m diameter, 1.0m tall → circle from above
    widthM: 1.0,
    depthM: 1.0,
    heightM: 1.0,
    color: 'hsl(30, 85%, 48%)',
    shape: 'circle',
  },
  'dorito-big': {
    type: 'dorito-big',
    label: 'Dorito (Big)',
    // Equilateral triangle: 2.1m on each side, 2.1m tall
    widthM: 2.1,
    depthM: 2.1,
    heightM: 2.1,
    color: 'hsl(200, 80%, 50%)',
    shape: 'triangle',
  },
  'dorito-small': {
    type: 'dorito-small',
    label: 'Dorito (Small)',
    // Equilateral triangle: 1.7m on each side
    widthM: 1.7,
    depthM: 1.7,
    heightM: 1.7,
    color: 'hsl(210, 75%, 55%)',
    shape: 'triangle',
  },
  'snake': {
    type: 'snake',
    label: 'Snake Beam',
    // Long beam: 3m long, 0.75m wide, 0.5m tall
    widthM: 0.75,
    depthM: 3.0,
    heightM: 0.5,
    color: 'hsl(120, 40%, 40%)',
    shape: 'rounded-rect',
  },
  'temple': {
    type: 'temple',
    label: 'Temple',
    // Square: 1.5m × 1.5m × 1.5m
    widthM: 1.5,
    depthM: 1.5,
    heightM: 1.5,
    color: 'hsl(280, 60%, 50%)',
    shape: 'rect',
  },
  'temple-maya': {
    type: 'temple-maya',
    label: 'Temple Maya',
    // Rectangle: 2.5m × 1.5m × 1.5m
    widthM: 2.5,
    depthM: 1.5,
    heightM: 1.5,
    color: 'hsl(270, 55%, 45%)',
    shape: 'rect',
  },
  'brick': {
    type: 'brick',
    label: 'Brick',
    // Rectangle: 1.5m × 1.25m × 0.75m
    widthM: 1.5,
    depthM: 1.25,
    heightM: 0.75,
    color: 'hsl(0, 65%, 50%)',
    shape: 'rect',
  },
  'wing': {
    type: 'wing',
    label: 'Wing',
    // Rectangle with rounded ends: 1.95m × 1.5m × 0.5m
    widthM: 1.95,
    depthM: 1.5,
    heightM: 0.5,
    color: 'hsl(340, 70%, 50%)',
    shape: 'wing',
  },
  'mini-race': {
    type: 'mini-race',
    label: 'Mini Race',
    // Rectangle: 1.5m × 1.3m × 0.5m
    widthM: 1.5,
    depthM: 1.3,
    heightM: 0.5,
    color: 'hsl(45, 80%, 50%)',
    shape: 'rounded-rect',
  },
  'can': {
    type: 'can',
    label: 'Can / Cylinder',
    // Cylinder: 1.2m diameter, 2.0m tall → circle from above
    widthM: 1.2,
    depthM: 1.2,
    heightM: 2.0,
    color: 'hsl(160, 55%, 40%)',
    shape: 'circle',
  },
  'cone': {
    type: 'cone',
    label: 'Cone',
    // Cone: 1.25m base diameter, 2.25m tall → circle from above
    widthM: 1.25,
    depthM: 1.25,
    heightM: 2.25,
    color: 'hsl(35, 90%, 55%)',
    shape: 'circle',
  },
};

// Standard CPPS Sup'Air field layout (symmetrical, positions as % of field)
export const CPPS_FIELD_LAYOUT: Obstacle[] = [
  // ===== CENTER =====
  { id: 'c1', type: 'tall-cake', x: 50, y: 50, rotation: 0 },
  
  // ===== SNAKE SIDE (top half, mirrored bottom) =====
  // Snake beams running along the snake wire
  { id: 'sn1', type: 'snake', x: 30, y: 25, rotation: 0 },
  { id: 'sn2', type: 'snake', x: 30, y: 75, rotation: 0 },
  { id: 'sn3', type: 'snake', x: 42, y: 18, rotation: 90 },
  { id: 'sn4', type: 'snake', x: 42, y: 82, rotation: 90 },
  
  // Doritos on the wire
  { id: 'dd1', type: 'dorito-big', x: 22, y: 15, rotation: -90 },
  { id: 'dd2', type: 'dorito-big', x: 22, y: 85, rotation: 90 },
  { id: 'dd3', type: 'dorito-big', x: 78, y: 15, rotation: -90 },
  { id: 'dd4', type: 'dorito-big', x: 78, y: 85, rotation: 90 },
  
  // Small doritos near 50
  { id: 'ds1', type: 'dorito-small', x: 50, y: 28, rotation: 0 },
  { id: 'ds2', type: 'dorito-small', x: 50, y: 72, rotation: 180 },
  
  // ===== MID BUNKERS =====
  // Temples / Mayas at mid positions
  { id: 'tm1', type: 'temple-maya', x: 38, y: 38, rotation: 0 },
  { id: 'tm2', type: 'temple-maya', x: 62, y: 62, rotation: 0 },
  { id: 'tm3', type: 'temple-maya', x: 38, y: 62, rotation: 0 },
  { id: 'tm4', type: 'temple-maya', x: 62, y: 38, rotation: 0 },
  
  // ===== SIDE CAKES =====
  { id: 'sc1', type: 'small-cake', x: 20, y: 50, rotation: 0 },
  { id: 'sc2', type: 'small-cake', x: 80, y: 50, rotation: 0 },
  
  // ===== BACK BUNKERS =====
  // Bricks near start boxes
  { id: 'bb1', type: 'brick', x: 8, y: 35, rotation: 0 },
  { id: 'bb2', type: 'brick', x: 8, y: 65, rotation: 0 },
  { id: 'bb3', type: 'brick', x: 92, y: 35, rotation: 0 },
  { id: 'bb4', type: 'brick', x: 92, y: 65, rotation: 0 },
  
  // Wings at back
  { id: 'wg1', type: 'wing', x: 12, y: 50, rotation: 90 },
  { id: 'wg2', type: 'wing', x: 88, y: 50, rotation: 90 },
  
  // Cans near 50
  { id: 'cn1', type: 'can', x: 50, y: 38, rotation: 0 },
  { id: 'cn2', type: 'can', x: 50, y: 62, rotation: 0 },
];
