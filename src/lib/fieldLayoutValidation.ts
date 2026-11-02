import { OBSTACLE_DEFINITIONS, type Obstacle, type ObstacleType } from '@/types/fieldLayout';

export const MAX_LAYOUT_OBSTACLES = 500;

/**
 * Turn untrusted stored/shared JSON into safe obstacles: unknown types and
 * non-numeric or out-of-range positions are dropped, labels are capped.
 * Returns the valid obstacles plus how many were rejected.
 */
export function sanitizeObstacles(raw: unknown): { obstacles: Obstacle[]; rejected: number } {
  if (!Array.isArray(raw)) return { obstacles: [], rejected: raw == null ? 0 : 1 };
  const out: Obstacle[] = [];
  let rejected = 0;
  for (const item of raw.slice(0, MAX_LAYOUT_OBSTACLES)) {
    const o = item as Record<string, unknown> | null;
    const type = o?.type as ObstacleType;
    const x = Number(o?.x);
    const y = Number(o?.y);
    const rotation = o?.rotation == null ? 0 : Number(o.rotation);
    if (
      !o || typeof o !== 'object' ||
      typeof type !== 'string' || !(type in OBSTACLE_DEFINITIONS) ||
      !Number.isFinite(x) || x < 0 || x > 100 ||
      !Number.isFinite(y) || y < 0 || y > 100 ||
      !Number.isFinite(rotation)
    ) {
      rejected++;
      continue;
    }
    out.push({
      id: typeof o.id === 'string' && o.id.length <= 64 ? o.id : `ob-${out.length}`,
      type,
      x,
      y,
      rotation: ((rotation % 360) + 360) % 360,
      ...(typeof o.label === 'string' && o.label.trim() ? { label: o.label.slice(0, 40) } : {}),
    });
  }
  rejected += Math.max(0, raw.length - MAX_LAYOUT_OBSTACLES);
  return { obstacles: out, rejected };
}
