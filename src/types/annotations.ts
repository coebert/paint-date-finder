export type AnnotationTool = 'select' | 'player' | 'arrow' | 'freehand' | 'text';

export interface Point {
  x: number; // percentage 0-100
  y: number;
}

export interface PlayerMarker {
  kind: 'player';
  id: string;
  x: number;
  y: number;
  number: number; // 1-5
  color: string;
}

export interface ArrowPath {
  kind: 'arrow';
  id: string;
  points: Point[];
  color: string;
  dashed?: boolean;
}

export interface FreehandPath {
  kind: 'freehand';
  id: string;
  points: Point[];
  color: string;
}

export interface TextLabel {
  kind: 'text';
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export type Annotation = PlayerMarker | ArrowPath | FreehandPath | TextLabel;

export const TEAM_COLORS = [
  { label: 'Blue', value: 'hsl(210, 90%, 55%)' },
  { label: 'Red', value: 'hsl(0, 85%, 55%)' },
  { label: 'Green', value: 'hsl(140, 70%, 45%)' },
  { label: 'Orange', value: 'hsl(25, 95%, 53%)' },
  { label: 'Purple', value: 'hsl(270, 70%, 55%)' },
  { label: 'White', value: 'hsl(0, 0%, 90%)' },
];
