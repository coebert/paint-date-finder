import type { Obstacle } from '@/types/fieldLayout';

// ─── NXL Las Vegas Major 2024 ───
// Field: 150ft × 120ft (45m × 36m). 15×12 grid of 10ft squares.
// Mapped from the official PBLeagues bird's-eye field diagram.
// Coordinate system: x = left→right (0=left base, 100=right base),
//                    y = top→bottom (0=top sideline, 100=bottom sideline).
// Layout has 180° rotational symmetry about center (50,50).
// Grid→% conversion: x% = (col/15)*100, y% = (row/12)*100
export const NXL_LAS_VEGAS_LAYOUT: Obstacle[] = [
  // ═══════ TOP HALF (left-base side) ═══════

  // --- Top doritos along top sideline ---
  { id: 'lv-sd1', type: 'dorito-small', x: 20, y: 20, rotation: 0 },       // SD grid(3,2.5)
  { id: 'lv-md1', type: 'dorito-big', x: 37, y: 17, rotation: 0 },         // MD grid(5.5,2)
  { id: 'lv-md2', type: 'dorito-big', x: 43, y: 12, rotation: 0 },         // MD grid(6.5,1.5)

  // --- Snake corridor (SB + GW pairs) ---
  { id: 'lv-sb1', type: 'snake', x: 50, y: 12, rotation: 90 },             // SB horizontal grid(7.5,1.5)
  { id: 'lv-sb2', type: 'snake', x: 47, y: 19, rotation: 0 },              // SB vertical grid(7,2.3)
  { id: 'lv-gw1', type: 'wing', x: 50, y: 19, rotation: 0 },              // GW grid(7.5,2.3)
  { id: 'lv-sb3', type: 'snake', x: 47, y: 27, rotation: 0 },              // SB vertical grid(7,3.2)
  { id: 'lv-gw2', type: 'wing', x: 50, y: 27, rotation: 0 },              // GW grid(7.5,3.2)
  { id: 'lv-sb4', type: 'snake', x: 47, y: 35, rotation: 0 },              // SB vertical grid(7,4.2)

  // --- Temples (back corners) ---
  { id: 'lv-t1', type: 'temple', x: 20, y: 25, rotation: 0 },              // T grid(3,3)
  { id: 'lv-t2', type: 'temple', x: 20, y: 46, rotation: 0 },              // T grid(3,5.5)

  // --- Mini W ---
  { id: 'lv-mw1', type: 'mini-race', x: 37, y: 27, rotation: 0 },          // MW grid(5.5,3.2)
  { id: 'lv-mw2', type: 'mini-race', x: 33, y: 42, rotation: 0 },          // MW grid(5,5)

  // --- Cylinder ---
  { id: 'lv-c1', type: 'can', x: 17, y: 38, rotation: 0 },                 // C grid(2.5,4.5)

  // --- Maya Temples ---
  { id: 'lv-mt1', type: 'temple-maya', x: 30, y: 38, rotation: 0 },        // MT grid(4.5,4.5)
  { id: 'lv-mt2', type: 'temple-maya', x: 40, y: 46, rotation: 0 },        // MT grid(6,5.5)

  // --- Trees (tall cans near center) ---
  { id: 'lv-tr1', type: 'can', x: 43, y: 42, rotation: 0 },                // Tr grid(6.5,5)
  { id: 'lv-tr2', type: 'can', x: 50, y: 46, rotation: 0 },                // Tr grid(7.5,5.5)

  // --- Giant Brick (center) ---
  { id: 'lv-gb1', type: 'brick', x: 50, y: 37, rotation: 0 },              // GB grid(7.5,4.5)

  // ═══════ BOTTOM HALF (mirrored 180° about center) ═══════

  // --- Bottom doritos along bottom sideline ---
  { id: 'lv-sd2', type: 'dorito-small', x: 80, y: 80, rotation: 180 },
  { id: 'lv-md3', type: 'dorito-big', x: 63, y: 83, rotation: 180 },
  { id: 'lv-md4', type: 'dorito-big', x: 57, y: 88, rotation: 180 },

  // --- Snake corridor (mirrored) ---
  { id: 'lv-sb5', type: 'snake', x: 50, y: 88, rotation: 90 },
  { id: 'lv-sb6', type: 'snake', x: 53, y: 81, rotation: 0 },
  { id: 'lv-gw3', type: 'wing', x: 50, y: 81, rotation: 0 },
  { id: 'lv-sb7', type: 'snake', x: 53, y: 73, rotation: 0 },
  { id: 'lv-gw4', type: 'wing', x: 50, y: 73, rotation: 0 },
  { id: 'lv-sb8', type: 'snake', x: 53, y: 65, rotation: 0 },

  // --- Temples (mirrored) ---
  { id: 'lv-t3', type: 'temple', x: 80, y: 75, rotation: 0 },
  { id: 'lv-t4', type: 'temple', x: 80, y: 54, rotation: 0 },

  // --- Mini W (mirrored) ---
  { id: 'lv-mw3', type: 'mini-race', x: 63, y: 73, rotation: 0 },
  { id: 'lv-mw4', type: 'mini-race', x: 67, y: 58, rotation: 0 },

  // --- Cylinder (mirrored) ---
  { id: 'lv-c2', type: 'can', x: 83, y: 62, rotation: 0 },

  // --- Maya Temples (mirrored) ---
  { id: 'lv-mt3', type: 'temple-maya', x: 70, y: 62, rotation: 0 },
  { id: 'lv-mt4', type: 'temple-maya', x: 60, y: 54, rotation: 0 },

  // --- Trees (mirrored) ---
  { id: 'lv-tr3', type: 'can', x: 57, y: 58, rotation: 0 },
  { id: 'lv-tr4', type: 'can', x: 50, y: 54, rotation: 0 },

  // --- Giant Brick (mirrored) ---
  { id: 'lv-gb2', type: 'brick', x: 50, y: 63, rotation: 0 },

  // ═══════ BACK-BASE BUNKERS ═══════

  // --- Left base (top-left) back row ---
  { id: 'lv-sb9', type: 'snake', x: 40, y: 8, rotation: 0 },               // SB near base
  { id: 'lv-br1', type: 'brick', x: 50, y: 8, rotation: 0 },               // Br at base
  // Back doritos along base line
  { id: 'lv-d1', type: 'dorito-big', x: 7, y: 12, rotation: 90 },          // Left back corner
  { id: 'lv-d2', type: 'dorito-big', x: 7, y: 33, rotation: 90 },          // Left side
  { id: 'lv-d3', type: 'dorito-big', x: 7, y: 67, rotation: 90 },          // Left side

  // --- Right base (bottom-right) back row ---
  { id: 'lv-sb10', type: 'snake', x: 60, y: 92, rotation: 0 },
  { id: 'lv-br2', type: 'brick', x: 50, y: 92, rotation: 0 },
  // Back doritos along base line
  { id: 'lv-d4', type: 'dorito-big', x: 93, y: 88, rotation: -90 },
  { id: 'lv-d5', type: 'dorito-big', x: 93, y: 67, rotation: -90 },
  { id: 'lv-d6', type: 'dorito-big', x: 93, y: 33, rotation: -90 },

  // --- Bottom base SB row (3 SBs) ---
  { id: 'lv-sb11', type: 'snake', x: 47, y: 85, rotation: 90 },
  { id: 'lv-sb12', type: 'snake', x: 53, y: 85, rotation: 90 },
  { id: 'lv-sb13', type: 'snake', x: 59, y: 85, rotation: 90 },

  // --- Top base SB row (mirrored) ---
  { id: 'lv-sb14', type: 'snake', x: 53, y: 15, rotation: 90 },
  { id: 'lv-sb15', type: 'snake', x: 47, y: 15, rotation: 90 },
  { id: 'lv-sb16', type: 'snake', x: 41, y: 15, rotation: 90 },

  // --- Wing near base ---
  { id: 'lv-wg1', type: 'wing', x: 38, y: 88, rotation: 90 },
  { id: 'lv-wg2', type: 'wing', x: 62, y: 12, rotation: 90 },

  // --- Tall Cake back corners ---
  { id: 'lv-tck1', type: 'tall-cake', x: 17, y: 88, rotation: 0 },
  { id: 'lv-tck2', type: 'tall-cake', x: 83, y: 12, rotation: 0 },
];

// ─── NXL Windy City Major 2024 (Chicago) ───
// Field: 150ft × 120ft (45m × 36m).
// Mapped from the official PBLeagues 3D render.
// Layout has 180° rotational symmetry.
// x = left→right (base to base), y = top→bottom (sideline to sideline).
export const NXL_WINDY_CITY_LAYOUT: Obstacle[] = [
  // ═══════ CENTER ═══════
  { id: 'wc-tc1', type: 'tall-cake', x: 50, y: 50, rotation: 0 },

  // ═══════ TOP HALF ═══════

  // --- Top sideline doritos (left base side) ---
  { id: 'wc-d1', type: 'dorito-big', x: 13, y: 10, rotation: 0 },
  { id: 'wc-d2', type: 'dorito-big', x: 27, y: 8, rotation: 0 },
  { id: 'wc-d3', type: 'dorito-big', x: 40, y: 10, rotation: 0 },
  { id: 'wc-d4', type: 'dorito-big', x: 53, y: 8, rotation: 0 },
  { id: 'wc-d5', type: 'dorito-big', x: 67, y: 10, rotation: 0 },

  // --- Small dorito ---
  { id: 'wc-sd1', type: 'dorito-small', x: 83, y: 12, rotation: 0 },

  // --- Snake corridor (diagonal, top-left to center) ---
  { id: 'wc-sb1', type: 'snake', x: 20, y: 18, rotation: 0 },
  { id: 'wc-sb2', type: 'snake', x: 27, y: 28, rotation: 90 },
  { id: 'wc-sb3', type: 'snake', x: 43, y: 33, rotation: 0 },
  { id: 'wc-sb4', type: 'snake', x: 47, y: 42, rotation: 0 },

  // --- Cans / Cylinders ---
  { id: 'wc-c1', type: 'can', x: 37, y: 37, rotation: 0 },
  { id: 'wc-c2', type: 'can', x: 50, y: 28, rotation: 0 },
  { id: 'wc-c3', type: 'can', x: 30, y: 50, rotation: 0 },

  // --- Maya Temple ---
  { id: 'wc-mt1', type: 'temple-maya', x: 25, y: 40, rotation: 0 },
  { id: 'wc-mt2', type: 'temple-maya', x: 43, y: 20, rotation: 0 },

  // --- Temple ---
  { id: 'wc-t1', type: 'temple', x: 10, y: 33, rotation: 0 },
  { id: 'wc-t2', type: 'temple', x: 10, y: 62, rotation: 0 },

  // --- Bricks ---
  { id: 'wc-br1', type: 'brick', x: 13, y: 22, rotation: 0 },
  { id: 'wc-br2', type: 'brick', x: 53, y: 17, rotation: 90 },

  // --- Wing ---
  { id: 'wc-wg1', type: 'wing', x: 60, y: 38, rotation: 0 },
  { id: 'wc-wg2', type: 'wing', x: 15, y: 50, rotation: 90 },

  // --- Mini Race ---
  { id: 'wc-mw1', type: 'mini-race', x: 33, y: 33, rotation: 0 },
  { id: 'wc-mw2', type: 'mini-race', x: 55, y: 43, rotation: 90 },

  // --- Small Cake ---
  { id: 'wc-ck1', type: 'small-cake', x: 20, y: 55, rotation: 0 },

  // --- Giant Plus ---
  { id: 'wc-gp1', type: 'giant-plus', x: 63, y: 18, rotation: 0 },

  // --- Back brick ---
  { id: 'wc-bb1', type: 'brick', x: 8, y: 43, rotation: 0 },

  // --- Small dorito mid ---
  { id: 'wc-sd3', type: 'dorito-small', x: 37, y: 23, rotation: -90 },

  // ═══════ BOTTOM HALF (180° mirror) ═══════

  // --- Bottom sideline doritos ---
  { id: 'wc-d6', type: 'dorito-big', x: 87, y: 90, rotation: 180 },
  { id: 'wc-d7', type: 'dorito-big', x: 73, y: 92, rotation: 180 },
  { id: 'wc-d8', type: 'dorito-big', x: 60, y: 90, rotation: 180 },
  { id: 'wc-d9', type: 'dorito-big', x: 47, y: 92, rotation: 180 },
  { id: 'wc-d10', type: 'dorito-big', x: 33, y: 90, rotation: 180 },

  // --- Small dorito ---
  { id: 'wc-sd2', type: 'dorito-small', x: 17, y: 88, rotation: 180 },

  // --- Snake corridor (mirrored) ---
  { id: 'wc-sb5', type: 'snake', x: 80, y: 82, rotation: 0 },
  { id: 'wc-sb6', type: 'snake', x: 73, y: 72, rotation: 90 },
  { id: 'wc-sb7', type: 'snake', x: 57, y: 67, rotation: 0 },
  { id: 'wc-sb8', type: 'snake', x: 53, y: 58, rotation: 0 },

  // --- Cans (mirrored) ---
  { id: 'wc-c4', type: 'can', x: 63, y: 63, rotation: 0 },
  { id: 'wc-c5', type: 'can', x: 50, y: 72, rotation: 0 },
  { id: 'wc-c6', type: 'can', x: 70, y: 50, rotation: 0 },

  // --- Maya Temple (mirrored) ---
  { id: 'wc-mt3', type: 'temple-maya', x: 75, y: 60, rotation: 0 },
  { id: 'wc-mt4', type: 'temple-maya', x: 57, y: 80, rotation: 0 },

  // --- Temple (mirrored) ---
  { id: 'wc-t3', type: 'temple', x: 90, y: 67, rotation: 0 },
  { id: 'wc-t4', type: 'temple', x: 90, y: 38, rotation: 0 },

  // --- Bricks (mirrored) ---
  { id: 'wc-br3', type: 'brick', x: 87, y: 78, rotation: 0 },
  { id: 'wc-br4', type: 'brick', x: 47, y: 83, rotation: 90 },

  // --- Wing (mirrored) ---
  { id: 'wc-wg3', type: 'wing', x: 40, y: 62, rotation: 0 },
  { id: 'wc-wg4', type: 'wing', x: 85, y: 50, rotation: 90 },

  // --- Mini Race (mirrored) ---
  { id: 'wc-mw3', type: 'mini-race', x: 67, y: 67, rotation: 0 },
  { id: 'wc-mw4', type: 'mini-race', x: 45, y: 57, rotation: 90 },

  // --- Small Cake (mirrored) ---
  { id: 'wc-ck2', type: 'small-cake', x: 80, y: 45, rotation: 0 },

  // --- Giant Plus (mirrored) ---
  { id: 'wc-gp2', type: 'giant-plus', x: 37, y: 82, rotation: 0 },

  // --- Back brick (mirrored) ---
  { id: 'wc-bb2', type: 'brick', x: 92, y: 57, rotation: 0 },

  // --- Small dorito mid (mirrored) ---
  { id: 'wc-sd4', type: 'dorito-small', x: 63, y: 77, rotation: 90 },
];

// ─── NXL World Cup 2024 ───
// Field: 150ft × 120ft (45m × 36m).
// Mapped from the official PBLeagues bird's-eye field diagram.
// Kissimmee, FL — Nov 6-10, 2024.
// 180° rotational symmetry about center.
export const NXL_WORLD_CUP_LAYOUT: Obstacle[] = [
  // ═══════ TOP HALF ═══════

  // --- Top sideline / back-base doritos ---
  { id: 'cup-sd1', type: 'dorito-small', x: 20, y: 17, rotation: 90 },      // SD near left base
  { id: 'cup-md1', type: 'dorito-big', x: 37, y: 17, rotation: 0 },         // MD
  { id: 'cup-md2', type: 'dorito-big', x: 47, y: 17, rotation: 0 },         // MD

  // --- Doritos along top sideline ---
  { id: 'cup-d1', type: 'dorito-big', x: 57, y: 10, rotation: 0 },
  { id: 'cup-d2', type: 'dorito-big', x: 67, y: 8, rotation: 0 },
  { id: 'cup-d3', type: 'dorito-big', x: 77, y: 10, rotation: 0 },
  { id: 'cup-d4', type: 'dorito-big', x: 87, y: 12, rotation: 0 },

  // --- Wing at top ---
  { id: 'cup-wg1', type: 'wing', x: 50, y: 13, rotation: 90 },

  // --- MT near left base ---
  { id: 'cup-mt1', type: 'temple-maya', x: 23, y: 21, rotation: 0 },

  // --- Snake Beams (upper corridor) ---
  { id: 'cup-sb1', type: 'snake', x: 43, y: 25, rotation: 0 },
  { id: 'cup-sb2', type: 'snake', x: 47, y: 25, rotation: 0 },

  // --- MD mid-left ---
  { id: 'cup-md3', type: 'dorito-big', x: 37, y: 25, rotation: 0 },

  // --- Tree (can) ---
  { id: 'cup-tr1', type: 'can', x: 50, y: 25, rotation: 0 },

  // --- Mini W ---
  { id: 'cup-mw1', type: 'mini-race', x: 23, y: 27, rotation: 0 },

  // --- Temples (back corners) ---
  { id: 'cup-t1', type: 'temple', x: 20, y: 33, rotation: 0 },
  { id: 'cup-t2', type: 'temple', x: 20, y: 50, rotation: 0 },

  // --- Giant Brick (center) ---
  { id: 'cup-gb1', type: 'brick', x: 50, y: 33, rotation: 0 },

  // --- Giant Wing (mid) ---
  { id: 'cup-gw1', type: 'wing', x: 40, y: 38, rotation: 0 },

  // --- Cylinder ---
  { id: 'cup-c1', type: 'can', x: 17, y: 42, rotation: 0 },

  // --- Giant Wing + Giant Brick (lower center) ---
  { id: 'cup-gw2', type: 'wing', x: 47, y: 46, rotation: 0 },
  { id: 'cup-gb2', type: 'brick', x: 50, y: 46, rotation: 0 },

  // --- MT center ---
  { id: 'cup-mt2', type: 'temple-maya', x: 40, y: 50, rotation: 0 },

  // ═══════ BOTTOM HALF (180° mirror) ═══════

  // --- Bottom sideline / back-base doritos ---
  { id: 'cup-sd2', type: 'dorito-small', x: 80, y: 83, rotation: -90 },
  { id: 'cup-md4', type: 'dorito-big', x: 63, y: 83, rotation: 180 },
  { id: 'cup-md5', type: 'dorito-big', x: 53, y: 83, rotation: 180 },

  // --- Doritos along bottom sideline ---
  { id: 'cup-d5', type: 'dorito-big', x: 43, y: 90, rotation: 180 },
  { id: 'cup-d6', type: 'dorito-big', x: 33, y: 92, rotation: 180 },
  { id: 'cup-d7', type: 'dorito-big', x: 23, y: 90, rotation: 180 },
  { id: 'cup-d8', type: 'dorito-big', x: 13, y: 88, rotation: 180 },

  // --- Wing at bottom ---
  { id: 'cup-wg2', type: 'wing', x: 50, y: 87, rotation: 90 },

  // --- MT near right base ---
  { id: 'cup-mt3', type: 'temple-maya', x: 77, y: 79, rotation: 0 },

  // --- Snake Beams (lower corridor) ---
  { id: 'cup-sb3', type: 'snake', x: 57, y: 75, rotation: 0 },
  { id: 'cup-sb4', type: 'snake', x: 53, y: 75, rotation: 0 },

  // --- MD mid-right ---
  { id: 'cup-md6', type: 'dorito-big', x: 63, y: 75, rotation: 180 },

  // --- Tree (can) ---
  { id: 'cup-tr2', type: 'can', x: 50, y: 75, rotation: 0 },

  // --- Mini W ---
  { id: 'cup-mw2', type: 'mini-race', x: 77, y: 73, rotation: 0 },

  // --- Temples (mirrored) ---
  { id: 'cup-t3', type: 'temple', x: 80, y: 67, rotation: 0 },
  { id: 'cup-t4', type: 'temple', x: 80, y: 50, rotation: 0 },

  // --- Giant Brick (mirrored) ---
  { id: 'cup-gb3', type: 'brick', x: 50, y: 67, rotation: 0 },

  // --- Giant Wing (mirrored) ---
  { id: 'cup-gw3', type: 'wing', x: 60, y: 62, rotation: 0 },

  // --- Cylinder (mirrored) ---
  { id: 'cup-c2', type: 'can', x: 83, y: 58, rotation: 0 },

  // --- Giant Wing + Giant Brick (mirrored) ---
  { id: 'cup-gw4', type: 'wing', x: 53, y: 54, rotation: 0 },
  { id: 'cup-gb4', type: 'brick', x: 50, y: 54, rotation: 0 },

  // --- MT (mirrored) ---
  { id: 'cup-mt4', type: 'temple-maya', x: 60, y: 50, rotation: 0 },

  // ═══════ BACK-BASE SB ROWS ═══════

  // --- Bottom base SB row (5 beams) ---
  { id: 'cup-sb5', type: 'snake', x: 37, y: 85, rotation: 90 },
  { id: 'cup-sb6', type: 'snake', x: 43, y: 85, rotation: 90 },
  { id: 'cup-sb7', type: 'snake', x: 47, y: 85, rotation: 90 },
  { id: 'cup-sb8', type: 'snake', x: 53, y: 85, rotation: 90 },
  { id: 'cup-sb9', type: 'snake', x: 57, y: 85, rotation: 90 },

  // --- Top base SB row (mirrored) ---
  { id: 'cup-sb10', type: 'snake', x: 63, y: 15, rotation: 90 },
  { id: 'cup-sb11', type: 'snake', x: 57, y: 15, rotation: 90 },
  { id: 'cup-sb12', type: 'snake', x: 53, y: 15, rotation: 90 },
  { id: 'cup-sb13', type: 'snake', x: 47, y: 15, rotation: 90 },
  { id: 'cup-sb14', type: 'snake', x: 43, y: 15, rotation: 90 },

  // --- Back-base bunkers ---
  { id: 'cup-br1', type: 'brick', x: 27, y: 88, rotation: 0 },
  { id: 'cup-ck1', type: 'small-cake', x: 33, y: 90, rotation: 0 },
  { id: 'cup-br2', type: 'brick', x: 40, y: 90, rotation: 0 },
  { id: 'cup-mw3', type: 'mini-race', x: 50, y: 90, rotation: 0 },
  { id: 'cup-wg3', type: 'wing', x: 53, y: 92, rotation: 90 },

  // --- Top base (mirrored) ---
  { id: 'cup-br3', type: 'brick', x: 73, y: 12, rotation: 0 },
  { id: 'cup-ck2', type: 'small-cake', x: 67, y: 10, rotation: 0 },
  { id: 'cup-br4', type: 'brick', x: 60, y: 10, rotation: 0 },
  { id: 'cup-mw4', type: 'mini-race', x: 50, y: 10, rotation: 0 },
  { id: 'cup-wg4', type: 'wing', x: 47, y: 8, rotation: 90 },

  // --- Side doritos ---
  { id: 'cup-d9', type: 'dorito-big', x: 7, y: 20, rotation: 90 },
  { id: 'cup-d10', type: 'dorito-big', x: 93, y: 80, rotation: -90 },
  { id: 'cup-d11', type: 'dorito-big', x: 7, y: 70, rotation: 90 },
  { id: 'cup-d12', type: 'dorito-big', x: 93, y: 30, rotation: -90 },
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
  {
    id: 'nxl-worldcup' as const,
    label: 'NXL World Cup 2024',
    shortLabel: 'NXL World Cup',
    title: 'NXL WORLD CUP',
    badge: 'Nov 6-10, 2024',
    description: 'Official NXL World Cup 2024 field layout. 150ft × 120ft championship field at Kissimmee, FL — the pinnacle event of the NXL season.',
  },
] as const;

export type NxlPresetId = typeof NXL_PRESETS[number]['id'];
