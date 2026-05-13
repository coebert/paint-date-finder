// Precise UK venue GPS coordinates (researched from postcodes and official sources).
// Shared between EventMap and the events list radius filter.

export type UKRegion = 'all' | 'scotland' | 'north' | 'midlands' | 'south' | 'wales';

export interface VenueCoord {
  lat: number;
  lng: number;
  location: string;
  region: UKRegion;
}

export const VENUE_COORDINATES: Record<string, VenueCoord> = {
  // South - Precise coordinates from postcode lookups
  'Campaign Paintball': { lat: 51.298818, lng: -0.417783, location: 'Effingham, Surrey KT11 3JY', region: 'south' },
  'Campaign Paintball Park': { lat: 51.298818, lng: -0.417783, location: 'Cobham, Surrey KT11 3JY', region: 'south' },
  'CPG Paintball': { lat: 51.385, lng: -0.515, location: 'Chertsey, Surrey', region: 'south' },
  'Bedlam Paintball': { lat: 51.277, lng: 0.142, location: 'Middlesex', region: 'south' },
  'Go Paintball London': { lat: 51.509, lng: -0.118, location: 'London', region: 'south' },
  'Mayhem Paintball': { lat: 51.651515, lng: 0.144532, location: 'Abridge, Romford RM4 1AA', region: 'south' },
  'Ground Zero Paintball': { lat: 50.846, lng: -1.796, location: 'Ringwood, Hampshire', region: 'south' },
  'Red Alert Paintball': { lat: 51.715, lng: -0.535, location: 'Bovingdon, Hertfordshire', region: 'south' },
  'Apocalypse Paintball': { lat: 51.235, lng: -0.165, location: 'Redhill, Surrey', region: 'south' },
  'Battlezone Paintball': { lat: 51.391, lng: 0.235, location: 'Kent', region: 'south' },
  'Combat Paintball': { lat: 51.320, lng: -0.380, location: 'Surrey', region: 'south' },
  'Ultimate Paintball': { lat: 51.458, lng: -0.973, location: 'Reading, Berkshire', region: 'south' },
  'Paintball Park': { lat: 51.715, lng: 0.245, location: 'Essex', region: 'south' },
  'Paintball Centre': { lat: 51.066, lng: -1.316, location: 'Hampshire', region: 'south' },

  // Midlands - Precise coordinates from postcode lookups
  'Delta Force Paintball Birmingham': { lat: 52.346, lng: -1.879, location: 'Birmingham B94 6SE', region: 'midlands' },
  'NPF Bassetts Pole': { lat: 52.591105, lng: -1.780036, location: 'Sutton Coldfield B75 5SA', region: 'midlands' },
  'Skirmish Paintball': { lat: 53.050, lng: -1.050, location: 'Nottinghamshire', region: 'midlands' },
  'Camouflage Paintball': { lat: 52.410, lng: -1.780, location: 'Solihull, West Midlands', region: 'midlands' },
  'Warzone Paintball': { lat: 52.820, lng: -2.120, location: 'Staffordshire', region: 'midlands' },
  'Paintball Sports UK': { lat: 52.750, lng: -2.050, location: 'Staffordshire', region: 'midlands' },
  'Commando Elite': { lat: 52.450, lng: -1.930, location: 'West Midlands', region: 'midlands' },
  'Invasion Paintball': { lat: 52.630, lng: -1.130, location: 'Leicestershire', region: 'midlands' },
  'Driver Wood Paintball': { lat: 53.120, lng: -1.180, location: 'Nottinghamshire', region: 'midlands' },
  'OMG Events': { lat: 52.500, lng: -1.500, location: 'Various UK Locations', region: 'midlands' },

  // North - Precise coordinates from postcode lookups
  'The Gathering Paintball': { lat: 53.650, lng: -1.780, location: 'Huddersfield', region: 'north' },
  'Delta Force Paintball Leeds': { lat: 53.755, lng: -1.453, location: 'Leeds', region: 'north' },
  'Special Ops Paintball': { lat: 53.750, lng: -1.600, location: 'Leeds', region: 'north' },
  'Bedlam Paintball - Manchester': { lat: 53.476, lng: -2.243, location: 'Manchester', region: 'north' },
  'Halo Mill Paintball': { lat: 53.624987, lng: -1.856371, location: 'Linthwaite, Huddersfield HD7 5QG', region: 'north' },
  'Paintball Commando': { lat: 53.370, lng: -3.070, location: 'Wirral, Merseyside', region: 'north' },
  'Combat Zone Paintball': { lat: 53.960, lng: -1.080, location: 'Yorkshire', region: 'north' },

  // Scotland
  'Bedlam Paintball Edinburgh': { lat: 55.9533, lng: -3.1883, location: 'Edinburgh', region: 'scotland' },
  'Bedlam Paintball - Edinburgh': { lat: 55.9533, lng: -3.1883, location: 'Edinburgh', region: 'scotland' },
  'Bedlam Paintball - Glasgow': { lat: 55.8642, lng: -4.2518, location: 'Glasgow', region: 'scotland' },
  'Urban Paintball Scotland': { lat: 55.8642, lng: -4.2518, location: 'Glasgow', region: 'scotland' },

  // Wales
  'Delta Force Paintball Cardiff': { lat: 51.4816, lng: -3.1791, location: 'Cardiff', region: 'wales' },
  'Planet Paintball': { lat: 51.750, lng: -3.380, location: 'Wales', region: 'wales' },
  'Wales Paintball': { lat: 51.4816, lng: -3.1791, location: 'Cardiff', region: 'wales' },
};
