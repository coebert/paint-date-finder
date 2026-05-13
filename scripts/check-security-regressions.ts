/**
 * Security regression guard — fails CI if any baseline RLS or
 * exposed-sensitive-data invariant is violated.
 *
 * Connects to the project database via SUPABASE_DB_URL (read-only checks).
 * In a PR/CI without DB access, the script exits 0 with a warning so it
 * never blocks contributors who can't reach the DB. Set STRICT=1 to fail
 * in that case (used by the scheduled main-branch run).
 *
 * Checks:
 *   1. Every table in `public` has RLS enabled.
 *   2. Sensitive columns are NOT SELECT-able by `anon` or `authenticated`.
 *      (column-level grant must be revoked)
 *   3. `pg_net` extension is not installed in the `public` schema.
 *   4. No RLS policy on `public` tables uses `USING (true)` /
 *      `WITH CHECK (true)` for INSERT/UPDATE/DELETE (SELECT may be public).
 */

/* eslint-disable no-console */
import { Client } from "pg";

type Violation = { rule: string; detail: string };

const SENSITIVE_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "teams", column: "contact_email" },
  { table: "teams", column: "contact_phone" },
  { table: "field_layouts", column: "delete_token" },
  { table: "event_flags", column: "delete_token" },
];

async function main() {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  const strict = process.env.STRICT === "1";

  if (!url) {
    const msg =
      "SUPABASE_DB_URL not set — skipping security regression checks.";
    if (strict) {
      console.error(`✗ ${msg} (STRICT mode, failing)`);
      process.exit(2);
    }
    console.warn(`⚠ ${msg}`);
    process.exit(0);
  }

  // Strip any sslmode query param so our explicit ssl object wins
  // (newer pg versions force verify-full when sslmode is set in the URL).
  const cleanUrl = url.replace(/([?&])sslmode=[^&]*(&|$)/, (_, p1, p2) =>
    p2 === "&" ? p1 : "",
  );
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const violations: Violation[] = [];

  try {
    // 1. RLS enabled on all public tables
    const rlsRes = await client.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false`,
    );
    for (const row of rlsRes.rows) {
      violations.push({
        rule: "RLS_DISABLED",
        detail: `public.${row.relname} has RLS disabled`,
      });
    }

    // 2. Sensitive columns not SELECT-able by anon/authenticated
    const colRes = await client.query<{
      table_name: string;
      column_name: string;
      grantee: string;
    }>(
      `SELECT table_name, column_name, grantee
         FROM information_schema.column_privileges
        WHERE table_schema = 'public'
          AND privilege_type = 'SELECT'
          AND grantee IN ('anon', 'authenticated')`,
    );
    const grants = new Set(
      colRes.rows.map((r) => `${r.table_name}.${r.column_name}@${r.grantee}`),
    );
    for (const { table, column } of SENSITIVE_COLUMNS) {
      for (const role of ["anon", "authenticated"] as const) {
        if (grants.has(`${table}.${column}@${role}`)) {
          violations.push({
            rule: "EXPOSED_SENSITIVE_COLUMN",
            detail: `${role} has SELECT on public.${table}.${column}`,
          });
        }
      }
    }

    // 3. pg_net not in public
    const extRes = await client.query<{ extname: string; nspname: string }>(
      `SELECT e.extname, n.nspname
         FROM pg_extension e
         JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pg_net'`,
    );
    for (const row of extRes.rows) {
      if (row.nspname === "public") {
        violations.push({
          rule: "EXTENSION_IN_PUBLIC",
          detail: `${row.extname} extension is installed in public schema`,
        });
      }
    }

    // 4. No always-true RLS policies on write commands
    const polRes = await client.query<{
      relname: string;
      polname: string;
      polcmd: string;
    }>(
      `SELECT c.relname, p.polname, p.polcmd::text AS polcmd
         FROM pg_policy p
         JOIN pg_class c ON p.polrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.polcmd::text IN ('w','d','a','*')
          AND (
            pg_get_expr(p.polqual, p.polrelid) = 'true'
            OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true'
          )`,
    );
    for (const row of polRes.rows) {
      violations.push({
        rule: "ALWAYS_TRUE_WRITE_POLICY",
        detail: `policy "${row.polname}" on public.${row.relname} (cmd=${row.polcmd}) uses an unconditional true expression`,
      });
    }
  } finally {
    await client.end();
  }

  if (violations.length === 0) {
    console.log("✓ Security regression checks passed.");
    process.exit(0);
  }

  console.error(`✗ ${violations.length} security regression(s) detected:\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.detail}`);
  }
  console.error(
    "\nSee scripts/check-security-regressions.ts for the invariants.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Security regression script crashed:", err);
  process.exit(2);
});
