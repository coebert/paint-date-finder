// City-level landing page metadata for /paintball/city/:slug.
// Targets high-volume "paintball <city>" queries surfaced by Semrush UK.
// Match on venues whose `location` ILIKE %name% (or any alias) AND region matches.

export interface CityMeta {
  /** URL slug used in /paintball/city/:slug. */
  slug: string;
  /** Display name. */
  name: string;
  /** Region name (must match src/lib/regions.ts). */
  region: string;
  /** Region slug for cross-linking. */
  regionSlug: string;
  /** Additional substrings used to match venues.location (lowercased ILIKE). */
  aliases?: string[];
  /** SEO intro / meta description seed. */
  intro: string;
}

export const ALL_CITIES: ReadonlyArray<CityMeta> = [
  {
    slug: 'london',
    name: 'London',
    region: 'South East',
    regionSlug: 'south-east',
    aliases: ['greater london', 'essex', 'hertfordshire', 'middlesex', 'kent'],
    intro:
      "Paintball walk-on events in and around London — covering Greater London, Essex, Kent and the Home Counties. Find verified .68 caliber dates, prices and booking links from the capital's biggest sites.",
  },
  {
    slug: 'manchester',
    name: 'Manchester',
    region: 'North West',
    regionSlug: 'north-west',
    aliases: ['greater manchester', 'salford', 'stockport', 'oldham'],
    intro:
      "Paintball walk-ons in Manchester and Greater Manchester — mag-fed, mechanical and scenario events at sites across the North West. Browse upcoming dates and book directly with the venue.",
  },
  {
    slug: 'birmingham',
    name: 'Birmingham',
    region: 'West Midlands',
    regionSlug: 'west-midlands',
    aliases: ['solihull', 'sutton coldfield', 'west midlands'],
    intro:
      "Paintball events in Birmingham and the West Midlands — walk-on days, big games and tournaments at verified .68 caliber sites near the city centre.",
  },
  {
    slug: 'glasgow',
    name: 'Glasgow',
    region: 'Scotland',
    regionSlug: 'scotland',
    aliases: ['lanarkshire', 'renfrewshire'],
    intro:
      "Paintball walk-on events in Glasgow and the Scottish central belt. Find verified venues, prices and upcoming game days near the city.",
  },
  {
    slug: 'bristol',
    name: 'Bristol',
    region: 'South West',
    regionSlug: 'south-west',
    aliases: ['avon', 'somerset', 'gloucestershire'],
    intro:
      "Paintball in Bristol and the surrounding South West — walk-on days, scenario games and mag-fed events at verified .68 caliber sites.",
  },
  {
    slug: 'edinburgh',
    name: 'Edinburgh',
    region: 'Scotland',
    regionSlug: 'scotland',
    aliases: ['lothian', 'midlothian', 'east lothian'],
    intro:
      "Paintball walk-ons near Edinburgh — verified dates and venues across Lothian and the Scottish capital.",
  },
  {
    slug: 'liverpool',
    name: 'Liverpool',
    region: 'North West',
    regionSlug: 'north-west',
    aliases: ['merseyside', 'wirral'],
    intro:
      "Paintball events in Liverpool and Merseyside — find walk-on days, mag-fed games and tournaments at verified .68 caliber sites.",
  },
  {
    slug: 'newcastle',
    name: 'Newcastle',
    region: 'North East',
    regionSlug: 'north-east',
    aliases: ['newcastle upon tyne', 'tyne and wear', 'gateshead', 'northumberland'],
    intro:
      "Paintball walk-on events in Newcastle and the North East — verified .68 caliber sites across Tyne & Wear and Northumberland.",
  },
  {
    slug: 'sheffield',
    name: 'Sheffield',
    region: 'Yorkshire',
    regionSlug: 'yorkshire',
    aliases: ['south yorkshire', 'rotherham', 'barnsley'],
    intro:
      "Paintball in Sheffield and South Yorkshire — walk-on days, scenario events and mag-fed games at verified venues near the city.",
  },
  {
    slug: 'leeds',
    name: 'Leeds',
    region: 'Yorkshire',
    regionSlug: 'yorkshire',
    aliases: ['west yorkshire', 'bradford', 'wakefield'],
    intro:
      "Paintball walk-on events in Leeds and West Yorkshire — verified dates, prices and booking links from sites around the city.",
  },
  {
    slug: 'nottingham',
    name: 'Nottingham',
    region: 'East Midlands',
    regionSlug: 'east-midlands',
    aliases: ['nottinghamshire'],
    intro:
      "Paintball events in Nottingham and Nottinghamshire — find verified walk-on dates and venues across the East Midlands.",
  },
  {
    slug: 'cardiff',
    name: 'Cardiff',
    region: 'Wales',
    regionSlug: 'wales',
    aliases: ['south wales', 'glamorgan'],
    intro:
      "Paintball walk-ons in Cardiff and South Wales — verified .68 caliber venues, upcoming events and booking links.",
  },
  {
    slug: 'leicester',
    name: 'Leicester',
    region: 'East Midlands',
    regionSlug: 'east-midlands',
    aliases: ['leicestershire'],
    intro:
      "Paintball events in Leicester and Leicestershire — walk-on days and scenario games at verified East Midlands sites.",
  },
  {
    slug: 'coventry',
    name: 'Coventry',
    region: 'West Midlands',
    regionSlug: 'west-midlands',
    aliases: ['warwickshire'],
    intro:
      "Paintball walk-ons in Coventry and Warwickshire — verified venues and upcoming events near the city.",
  },
  {
    slug: 'sunderland',
    name: 'Sunderland',
    region: 'North East',
    regionSlug: 'north-east',
    aliases: ['tyne and wear', 'durham'],
    intro:
      "Paintball events in Sunderland and the wider North East — verified walk-on dates and booking links.",
  },
  {
    slug: 'derby',
    name: 'Derby',
    region: 'East Midlands',
    regionSlug: 'east-midlands',
    aliases: ['derbyshire'],
    intro:
      "Paintball walk-ons in Derby and Derbyshire — verified sites, prices and upcoming dates in the East Midlands.",
  },
  {
    slug: 'swansea',
    name: 'Swansea',
    region: 'Wales',
    regionSlug: 'wales',
    aliases: ['west glamorgan'],
    intro:
      "Paintball events in Swansea and west South Wales — find verified walk-on dates and venues.",
  },
  {
    slug: 'york',
    name: 'York',
    region: 'Yorkshire',
    regionSlug: 'yorkshire',
    aliases: ['north yorkshire'],
    intro:
      "Paintball walk-on events in York and North Yorkshire — verified .68 caliber dates and venues.",
  },
];

export function getCityBySlug(slug: string | undefined): CityMeta | undefined {
  if (!slug) return undefined;
  return ALL_CITIES.find((c) => c.slug === slug.toLowerCase());
}

export function citiesByRegion(regionName: string): CityMeta[] {
  return ALL_CITIES.filter((c) => c.region === regionName);
}

/** Lowercased substrings used to match a venue's location field. */
export function cityMatchTerms(city: CityMeta): string[] {
  return [city.name.toLowerCase(), ...(city.aliases ?? [])];
}
