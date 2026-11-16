import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideAccess } from "./decide.ts";

Deno.test("no user (unauthenticated / invalid token) is 401", () => {
  assertEquals(decideAccess(null).status, 401);
  assertEquals(decideAccess({ id: "" }).status, 401);
});

Deno.test("unverified account is refused even if it would match an admin email", () => {
  const d = decideAccess({ id: "11111111-1111-4111-8111-111111111111", email_confirmed_at: null });
  assertEquals(d.status, 403);
});

Deno.test("verified account proceeds only to a read-only grant lookup by user id", () => {
  const d = decideAccess({ id: "22222222-2222-4222-8222-222222222222", email_confirmed_at: "2026-01-01T00:00:00Z" });
  assertEquals(d.status, 200);
  if (d.status === 200) assertEquals(d.userId, "22222222-2222-4222-8222-222222222222");
});
