// Region slug + display helpers used by the /paintball/:slug landing pages.
// Region values come from the venues.region column. Keep this list in sync
// with what the DB actually contains.

export interface RegionMeta {
  /** Canonical region name as stored in DB. */
  name: string;
  /** URL slug used in /paintball/:slug. */
  slug: string;
  /** Plain-English intro shown on the landing page (used in meta description too). */
  intro: string;
  /** Cities/areas covered — improves on-page keyword coverage. */
  cities: string[];
}

const REGIONS: RegionMeta[] = [
  {
    name: 'South East',
    slug: 'south-east',
    intro:
      "Paintball venues across the South East of England — including London, Surrey, Kent, Sussex and Hampshire. Browse upcoming walk-on days, scenario games and tournaments at the region's busiest fields.",
    cities: ['London', 'Surrey', 'Kent', 'Sussex', 'Hampshire', 'Berkshire'],
  },
  {
    name: 'South West',
    slug: 'south-west',
    intro:
      "Walk-on paintball events across the South West — Bristol, Somerset, Devon, Cornwall and Wiltshire. Find your next game and book a spot directly with the venue.",
    cities: ['Bristol', 'Somerset', 'Devon', 'Cornwall', 'Wiltshire', 'Dorset'],
  },
  {
    name: 'West Midlands',
    slug: 'west-midlands',
    intro:
      "Paintball walk-ons across the West Midlands — Birmingham, Coventry, Wolverhampton, Worcestershire and beyond. Mag-fed, mechanical and speedball events listed daily.",
    cities: ['Birmingham', 'Coventry', 'Wolverhampton', 'Worcestershire', 'Warwickshire'],
  },
  {
    name: 'East Midlands',
    slug: 'east-midlands',
    intro:
      "Walk-on paintball events across the East Midlands — Nottingham, Leicester, Derby, Lincolnshire and Northamptonshire. Verified dates, prices and booking links.",
    cities: ['Nottingham', 'Leicester', 'Derby', 'Lincolnshire', 'Northamptonshire'],
  },
  {
    name: 'North West',
    slug: 'north-west',
    intro:
      "Paintball in the North West — Manchester, Liverpool, Lancashire and Cumbria. Find walk-on days, big games and CPPS league fixtures near you.",
    cities: ['Manchester', 'Liverpool', 'Lancashire', 'Cumbria', 'Cheshire'],
  },
  {
    name: 'North East',
    slug: 'north-east',
    intro:
      "Walk-on paintball events across the North East — Newcastle, Sunderland, Durham and Tyne & Wear.",
    cities: ['Newcastle', 'Sunderland', 'Durham', 'Tyne and Wear'],
  },
  {
    name: 'Yorkshire',
    slug: 'yorkshire',
    intro:
      "Yorkshire paintball walk-ons — Leeds, Sheffield, Bradford, York and Hull. Browse upcoming events, prices and booking links from verified venues.",
    cities: ['Leeds', 'Sheffield', 'Bradford', 'York', 'Hull'],
  },
  {
    name: 'Scotland',
    slug: 'scotland',
    intro:
      "Paintball venues across Scotland — Glasgow, Edinburgh and the central belt. Find walk-on days and book a spot.",
    cities: ['Glasgow', 'Edinburgh', 'Stirling', 'Aberdeen'],
  },
  {
    name: 'Wales',
    slug: 'wales',
    intro:
      "Walk-on paintball events across Wales — Cardiff, Swansea, Newport and the South Wales valleys.",
    cities: ['Cardiff', 'Swansea', 'Newport'],
  },
];

export const ALL_REGIONS: ReadonlyArray<RegionMeta> = REGIONS;

export function getRegionBySlug(slug: string | undefined): RegionMeta | undefined {
  if (!slug) return undefined;
  return REGIONS.find((r) => r.slug === slug.toLowerCase());
}

export function getRegionMetaByName(name: string | null | undefined): RegionMeta | undefined {
  if (!name) return undefined;
  return REGIONS.find((r) => r.name === name);
}

export function regionSlug(name: string | null | undefined): string | null {
  return getRegionMetaByName(name)?.slug ?? null;
}
