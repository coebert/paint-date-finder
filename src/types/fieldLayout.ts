export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  rotation: number; // degrees
  label?: string;
}

export type ObstacleType =
  | 'tall-cake'
  | 'small-cake'
  | 'dorito'
  | 'snake'
  | 'maya'
  | 'brick'
  | 'pin'
  | 'tower'
  | 'can';

export interface ObstacleDefinition {
  type: ObstacleType;
  label: string;
  width: number; // relative size units
  height: number;
  color: string;
  shape: 'rect' | 'triangle' | 'circle' | 'cylinder';
}

export const OBSTACLE_DEFINITIONS: Record<ObstacleType, ObstacleDefinition> = {
  'tall-cake': {
    type: 'tall-cake',
    label: 'Tall Cake',
    width: 3.5,
    height: 3.5,
    color: 'hsl(25, 95%, 53%)',
    shape: 'cylinder',
  },
  'small-cake': {
    type: 'small-cake',
    label: 'Small Cake',
    width: 2.5,
    height: 2.5,
    color: 'hsl(25, 80%, 45%)',
    shape: 'cylinder',
  },
  'dorito': {
    type: 'dorito',
    label: 'Dorito',
    width: 3,
    height: 4.5,
    color: 'hsl(200, 80%, 50%)',
    shape: 'triangle',
  },
  'snake': {
    type: 'snake',
    label: 'Snake',
    width: 1.5,
    height: 8,
    color: 'hsl(120, 40%, 40%)',
    shape: 'rect',
  },
  'maya': {
    type: 'maya',
    label: 'Maya / Temple',
    width: 4,
    height: 3,
    color: 'hsl(280, 70%, 55%)',
    shape: 'rect',
  },
  'brick': {
    type: 'brick',
    label: 'Brick',
    width: 4,
    height: 2,
    color: 'hsl(340, 80%, 55%)',
    shape: 'rect',
  },
  'pin': {
    type: 'pin',
    label: 'Pin / Pencil',
    width: 1,
    height: 5,
    color: 'hsl(45, 90%, 50%)',
    shape: 'rect',
  },
  'tower': {
    type: 'tower',
    label: 'Tower',
    width: 2,
    height: 2,
    color: 'hsl(0, 72%, 51%)',
    shape: 'rect',
  },
  'can': {
    type: 'can',
    label: 'Can',
    width: 2,
    height: 2,
    color: 'hsl(160, 60%, 40%)',
    shape: 'cylinder',
  },
};

// Standard CPPS Sup'Air field layout (symmetrical)
export const CPPS_FIELD_LAYOUT: Obstacle[] = [
  // Center
  { id: 'c1', type: 'tall-cake', x: 50, y: 50, rotation: 0 },
  
  // Snake side (left)
  { id: 'sn1', type: 'snake', x: 20, y: 30, rotation: 0 },
  { id: 'sn2', type: 'snake', x: 20, y: 70, rotation: 0 },
  { id: 'sd1', type: 'dorito', x: 30, y: 20, rotation: 0 },
  { id: 'sd2', type: 'dorito', x: 30, y: 80, rotation: 180 },
  
  // Dorito side (right)
  { id: 'dn1', type: 'snake', x: 80, y: 30, rotation: 0 },
  { id: 'dn2', type: 'snake', x: 80, y: 70, rotation: 0 },
  { id: 'dd1', type: 'dorito', x: 70, y: 20, rotation: 0 },
  { id: 'dd2', type: 'dorito', x: 70, y: 80, rotation: 180 },
  
  // Mid bunkers
  { id: 'mb1', type: 'maya', x: 40, y: 35, rotation: 0 },
  { id: 'mb2', type: 'maya', x: 60, y: 65, rotation: 0 },
  { id: 'mb3', type: 'maya', x: 40, y: 65, rotation: 0 },
  { id: 'mb4', type: 'maya', x: 60, y: 35, rotation: 0 },
  
  // Corner cakes
  { id: 'cc1', type: 'small-cake', x: 15, y: 50, rotation: 0 },
  { id: 'cc2', type: 'small-cake', x: 85, y: 50, rotation: 0 },
  
  // Back pins
  { id: 'bp1', type: 'pin', x: 10, y: 20, rotation: 90 },
  { id: 'bp2', type: 'pin', x: 10, y: 80, rotation: 90 },
  { id: 'bp3', type: 'pin', x: 90, y: 20, rotation: 90 },
  { id: 'bp4', type: 'pin', x: 90, y: 80, rotation: 90 },
  
  // Back bricks (start boxes)
  { id: 'bb1', type: 'brick', x: 5, y: 50, rotation: 90 },
  { id: 'bb2', type: 'brick', x: 95, y: 50, rotation: 90 },

  // Cans near 50
  { id: 'cn1', type: 'can', x: 50, y: 30, rotation: 0 },
  { id: 'cn2', type: 'can', x: 50, y: 70, rotation: 0 },
];
