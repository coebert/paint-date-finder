create table public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  sitemap_path text,
  sitemap_submitted integer,
  sitemap_indexed integer,
  sitemap_errors integer,
  sitemap_warnings integer,
  sitemap_last_downloaded timestamptz,
  total_clicks integer,
  total_impressions integer,
  avg_ctr numeric(6,4),
  avg_position numeric(6,2),
  top_queries jsonb default '[]'::jsonb,
  top_pages jsonb default '[]'::jsonb,
  regressions jsonb default '[]'::jsonb,
  alert_sent boolean not null default false,
  raw jsonb
);

alter table public.seo_snapshots enable row level security;

create policy "Admins view seo snapshots"
  on public.seo_snapshots for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create index seo_snapshots_captured_at_idx on public.seo_snapshots (captured_at desc);