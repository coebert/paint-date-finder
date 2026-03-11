import type { Obstacle } from '@/types/fieldLayout';

// ─── NXL Las Vegas Major 2024 ───
// Field: 150ft × 120ft (45m × 36m).
// Mapped from the official PBLeagues field plan diagram.
// x = left→right (0=base, 100=base), y = top→bottom (0=top sideline, 100=bottom sideline).
export const NXL_LAS_VEGAS_LAYOUT: Obstacle[] = [
  // ===== TOP-SIDE DORITOS =====
  { id: 'lv-sd1', type: 'dorito-small', x: 22, y: 17, rotation: 0 },
  { id: 'lv-md1', type: 'dorito-big', x: 33, y: 20, rotation: 0 },
  { id: 'lv-md2', type: 'dorito-big', x: 42, y: 13, rotation: 0 },

  // ===== BOTTOM-SIDE DORITOS (mirror) =====
  { id: 'lv-sd2', type: 'dorito-small', x: 78, y: 83, rotation: 180 },
  { id: 'lv-md3', type: 'dorito-big', x: 67, y: 80, rotation: 180 },
  { id: 'lv-md4', type: 'dorito-big', x: 58, y: 87, rotation: 180 },

  // ===== SNAKE BEAMS – upper corridor =====
  { id: 'lv-sb1', type: 'snake', x: 47, y: 15, rotation: 90 },
  { id: 'lv-sb2', type: 'snake', x: 45, y: 22, rotation: 0 },
  { id: 'lv-sb3', type: 'snake', x: 47, y: 30, rotation: 0 },

  // ===== SNAKE BEAMS – lower corridor (mirror) =====
  { id: 'lv-sb4', type: 'snake', x: 53, y: 85, rotation: 90 },
  { id: 'lv-sb5', type: 'snake', x: 55, y: 78, rotation: 0 },
  { id: 'lv-sb6', type: 'snake', x: 53, y: 70, rotation: 0 },

  // ===== SNAKE BEAMS – mid snake line =====
  { id: 'lv-sb7', type: 'snake', x: 40, y: 42, rotation: 0 },
  { id: 'lv-sb8', type: 'snake', x: 60, y: 58, rotation: 0 },

  // ===== SNAKE BEAMS – back rows =====
  { id: 'lv-sb9', type: 'snake', x: 45, y: 88, rotation: 90 },
  { id: 'lv-sb10', type: 'snake', x: 50, y: 88, rotation: 90 },
  { id: 'lv-sb11', type: 'snake', x: 55, y: 88, rotation: 90 },
  { id: 'lv-sb12', type: 'snake', x: 55, y: 12, rotation: 90 },
  { id: 'lv-sb13', type: 'snake', x: 50, y: 12, rotation: 90 },
  { id: 'lv-sb14', type: 'snake', x: 45, y: 12, rotation: 90 },

  // ===== GIANT WINGS =====
  { id: 'lv-gw1', type: 'wing', x: 48, y: 18, rotation: 0 },
  { id: 'lv-gw2', type: 'wing', x: 48, y: 28, rotation: 0 },
  { id: 'lv-gw3', type: 'wing', x: 52, y: 82, rotation: 0 },
  { id: 'lv-gw4', type: 'wing', x: 52, y: 72, rotation: 0 },

  // ===== TEMPLES =====
  { id: 'lv-t1', type: 'temple', x: 22, y: 25, rotation: 0 },
  { id: 'lv-t2', type: 'temple', x: 22, y: 40, rotation: 0 },
  { id: 'lv-t3', type: 'temple', x: 78, y: 75, rotation: 0 },
  { id: 'lv-t4', type: 'temple', x: 78, y: 60, rotation: 0 },

  // ===== MAYA TEMPLES =====
  { id: 'lv-mt1', type: 'temple-maya', x: 30, y: 33, rotation: 0 },
  { id: 'lv-mt2', type: 'temple-maya', x: 38, y: 45, rotation: 0 },
  { id: 'lv-mt3', type: 'temple-maya', x: 70, y: 67, rotation: 0 },
  { id: 'lv-mt4', type: 'temple-maya', x: 62, y: 55, rotation: 0 },

  // ===== MINI RACE / MINI W =====
  { id: 'lv-mw1', type: 'mini-race', x: 35, y: 28, rotation: 0 },
  { id: 'lv-mw2', type: 'mini-race', x: 33, y: 45, rotation: 0 },
  { id: 'lv-mw3', type: 'mini-race', x: 65, y: 72, rotation: 0 },
  { id: 'lv-mw4', type: 'mini-race', x: 67, y: 55, rotation: 0 },

  // ===== CYLINDERS =====
  { id: 'lv-c1', type: 'can', x: 20, y: 33, rotation: 0 },
  { id: 'lv-c2', type: 'can', x: 80, y: 67, rotation: 0 },

  // ===== TREES (tall cylinders) =====
  { id: 'lv-tr1', type: 'can', x: 43, y: 37, rotation: 0 },
  { id: 'lv-tr2', type: 'can', x: 50, y: 42, rotation: 0 },
  { id: 'lv-tr3', type: 'can', x: 57, y: 63, rotation: 0 },
  { id: 'lv-tr4', type: 'can', x: 50, y: 58, rotation: 0 },

  // ===== GIANT BRICK =====
  { id: 'lv-gb1', type: 'brick', x: 48, y: 35, rotation: 0 },
  { id: 'lv-gb2', type: 'brick', x: 52, y: 65, rotation: 0 },

  // ===== BRICKS =====
  { id: 'lv-br1', type: 'brick', x: 48, y: 42, rotation: 90 },
  { id: 'lv-br2', type: 'brick', x: 52, y: 58, rotation: 90 },
  { id: 'lv-br3', type: 'brick', x: 45, y: 90, rotation: 0 },
  { id: 'lv-br4', type: 'brick', x: 55, y: 10, rotation: 0 },

  // ===== WINGS =====
  { id: 'lv-wg1', type: 'wing', x: 38, y: 88, rotation: 90 },
  { id: 'lv-wg2', type: 'wing', x: 62, y: 12, rotation: 90 },

  // ===== TALL CAKE =====
  { id: 'lv-tck1', type: 'tall-cake', x: 22, y: 88, rotation: 0 },
  { id: 'lv-tck2', type: 'tall-cake', x: 78, y: 12, rotation: 0 },

  // ===== SMALL CAKES =====
  { id: 'lv-ck1', type: 'small-cake', x: 20, y: 45, rotation: 0 },
  { id: 'lv-ck2', type: 'small-cake', x: 80, y: 55, rotation: 0 },

  // ===== BACK DORITOS (sideline) =====
  { id: 'lv-d1', type: 'dorito-big', x: 10, y: 15, rotation: 0 },
  { id: 'lv-d2', type: 'dorito-big', x: 10, y: 85, rotation: 180 },
  { id: 'lv-d3', type: 'dorito-big', x: 90, y: 15, rotation: 0 },
  { id: 'lv-d4', type: 'dorito-big', x: 90, y: 85, rotation: 180 },
  { id: 'lv-d5', type: 'dorito-big', x: 32, y: 90, rotation: 180 },
  { id: 'lv-d6', type: 'dorito-big', x: 68, y: 10, rotation: 0 },
];

// ─── NXL Windy City Major 2024 (Chicago) ───
// Field: 150ft × 120ft (45m × 36m).
// Mapped from the official PBLeagues 3D render.
// x = left→right, y = top→bottom.
export const NXL_WINDY_CITY_LAYOUT: Obstacle[] = [
  // ===== CENTER TALL CAKE =====
  { id: 'wc-tc1', type: 'tall-cake', x: 50, y: 50, rotation: 0 },

  // ===== DORITOS – top sideline =====
  { id: 'wc-d1', type: 'dorito-big', x: 15, y: 12, rotation: 0 },
  { id: 'wc-d2', type: 'dorito-big', x: 28, y: 10, rotation: 0 },
  { id: 'wc-d3', type: 'dorito-big', x: 40, y: 8, rotation: 0 },
  { id: 'wc-d4', type: 'dorito-big', x: 55, y: 12, rotation: 0 },
  { id: 'wc-d5', type: 'dorito-big', x: 70, y: 10, rotation: 0 },

  // ===== DORITOS – bottom sideline (mirror) =====
  { id: 'wc-d6', type: 'dorito-big', x: 85, y: 88, rotation: 180 },
  { id: 'wc-d7', type: 'dorito-big', x: 72, y: 90, rotation: 180 },
  { id: 'wc-d8', type: 'dorito-big', x: 60, y: 92, rotation: 180 },
  { id: 'wc-d9', type: 'dorito-big', x: 45, y: 88, rotation: 180 },
  { id: 'wc-d10', type: 'dorito-big', x: 30, y: 90, rotation: 180 },

  // ===== SMALL DORITOS =====
  { id: 'wc-sd1', type: 'dorito-small', x: 85, y: 15, rotation: 0 },
  { id: 'wc-sd2', type: 'dorito-small', x: 15, y: 85, rotation: 180 },
  { id: 'wc-sd3', type: 'dorito-small', x: 35, y: 25, rotation: -90 },
  { id: 'wc-sd4', type: 'dorito-small', x: 65, y: 75, rotation: 90 },

  // ===== SNAKE BEAMS =====
  { id: 'wc-sb1', type: 'snake', x: 45, y: 35, rotation: 0 },
  { id: 'wc-sb2', type: 'snake', x: 48, y: 45, rotation: 0 },
  { id: 'wc-sb3', type: 'snake', x: 52, y: 55, rotation: 0 },
  { id: 'wc-sb4', type: 'snake', x: 55, y: 65, rotation: 0 },
  // Side snakes
  { id: 'wc-sb5', type: 'snake', x: 25, y: 30, rotation: 90 },
  { id: 'wc-sb6', type: 'snake', x: 75, y: 70, rotation: 90 },
  { id: 'wc-sb7', type: 'snake', x: 20, y: 20, rotation: 0 },
  { id: 'wc-sb8', type: 'snake', x: 80, y: 80, rotation: 0 },

  // ===== CANS / CYLINDERS =====
  { id: 'wc-c1', type: 'can', x: 38, y: 38, rotation: 0 },
  { id: 'wc-c2', type: 'can', x: 62, y: 62, rotation: 0 },
  { id: 'wc-c3', type: 'can', x: 50, y: 30, rotation: 0 },
  { id: 'wc-c4', type: 'can', x: 50, y: 70, rotation: 0 },
  { id: 'wc-c5', type: 'can', x: 30, y: 50, rotation: 0 },
  { id: 'wc-c6', type: 'can', x: 70, y: 50, rotation: 0 },

  // ===== MAYA TEMPLES =====
  { id: 'wc-mt1', type: 'temple-maya', x: 25, y: 42, rotation: 0 },
  { id: 'wc-mt2', type: 'temple-maya', x: 75, y: 58, rotation: 0 },
  { id: 'wc-mt3', type: 'temple-maya', x: 42, y: 22, rotation: 0 },
  { id: 'wc-mt4', type: 'temple-maya', x: 58, y: 78, rotation: 0 },

  // ===== TEMPLES =====
  { id: 'wc-t1', type: 'temple', x: 10, y: 35, rotation: 0 },
  { id: 'wc-t2', type: 'temple', x: 10, y: 65, rotation: 0 },
  { id: 'wc-t3', type: 'temple', x: 90, y: 35, rotation: 0 },
  { id: 'wc-t4', type: 'temple', x: 90, y: 65, rotation: 0 },

  // ===== BRICKS =====
  { id: 'wc-br1', type: 'brick', x: 12, y: 25, rotation: 0 },
  { id: 'wc-br2', type: 'brick', x: 88, y: 75, rotation: 0 },
  { id: 'wc-br3', type: 'brick', x: 55, y: 18, rotation: 90 },
  { id: 'wc-br4', type: 'brick', x: 45, y: 82, rotation: 90 },

  // ===== WINGS =====
  { id: 'wc-wg1', type: 'wing', x: 40, y: 60, rotation: 0 },
  { id: 'wc-wg2', type: 'wing', x: 60, y: 40, rotation: 0 },
  { id: 'wc-wg3', type: 'wing', x: 15, y: 50, rotation: 90 },
  { id: 'wc-wg4', type: 'wing', x: 85, y: 50, rotation: 90 },

  // ===== MINI RACE =====
  { id: 'wc-mw1', type: 'mini-race', x: 30, y: 35, rotation: 0 },
  { id: 'wc-mw2', type: 'mini-race', x: 70, y: 65, rotation: 0 },
  { id: 'wc-mw3', type: 'mini-race', x: 55, y: 42, rotation: 90 },
  { id: 'wc-mw4', type: 'mini-race', x: 45, y: 58, rotation: 90 },

  // ===== SMALL CAKES =====
  { id: 'wc-ck1', type: 'small-cake', x: 20, y: 55, rotation: 0 },
  { id: 'wc-ck2', type: 'small-cake', x: 80, y: 45, rotation: 0 },

  // ===== GIANT PLUS =====
  { id: 'wc-gp1', type: 'giant-plus', x: 35, y: 80, rotation: 0 },
  { id: 'wc-gp2', type: 'giant-plus', x: 65, y: 20, rotation: 0 },

  // ===== BACK BRICKS =====
  { id: 'wc-bb1', type: 'brick', x: 8, y: 45, rotation: 0 },
  { id: 'wc-bb2', type: 'brick', x: 92, y: 55, rotation: 0 },
];

// Preset metadata for UI
export const NXL_PRESETS = [
  {
    id: 'nxl-tampa' as const,
    label: 'NXL Tampa Bay 2026',
    shortLabel: 'NXL Tampa Bay',
    title: 'NXL TAMPA BAY OPEN',
    badge: 'Mar 19-22, 2026',
    description: 'Official NXL Tampa Bay Open 2026 field layout. 150ft × 120ft tournament field at Raymond James Stadium, Tampa Bay, FL.',
  },
  {
    id: 'nxl-vegas' as const,
    label: 'NXL Las Vegas 2024',
    shortLabel: 'NXL Las Vegas',
    title: 'NXL LAS VEGAS MAJOR',
    badge: 'Mar 8-10, 2024',
    description: 'Official NXL Las Vegas Major 2024 field layout. 150ft × 120ft tournament field featuring a technical snake-heavy design.',
  },
  {
    id: 'nxl-windy' as const,
    label: 'NXL Windy City 2024',
    shortLabel: 'NXL Windy City',
    title: 'NXL WINDY CITY MAJOR',
    badge: 'Sep 13-15, 2024',
    description: 'Official NXL Windy City Major 2024 (Chicago) field layout. 150ft × 120ft tournament field with a balanced center-focused design.',
  },
] as const;

export type NxlPresetId = typeof NXL_PRESETS[number]['id'];
