// Regression tests for the SSRF / protocol guard used by extract-flyer-event
// when resolving flyer URLs. Ensures non-http(s) schemes, private IPs, and
// internal hostnames are rejected BEFORE any outbound fetch.
import {
  assertSafeOutboundUrl,
  isPrivateIp,
} from "./index.ts";
import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("rejects non-http(s) schemes", async () => {
  const bad = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://example.com/x",
    "gopher://example.com/",
    "ws://example.com/",
  ];
  for (const url of bad) {
    await assertRejects(
      () => assertSafeOutboundUrl(url),
      Error,
      undefined,
      `expected reject for ${url}`,
    );
  }
});

Deno.test("rejects malformed URLs", async () => {
  await assertRejects(() => assertSafeOutboundUrl("not a url"), Error);
  await assertRejects(() => assertSafeOutboundUrl(""), Error);
});

Deno.test("rejects literal private/loopback/link-local IPs", async () => {
  const bad = [
    "http://127.0.0.1/",
    "http://127.1.2.3/",
    "http://10.0.0.5/",
    "http://10.255.255.255/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/", // AWS metadata
    "http://0.0.0.0/",
    "http://224.0.0.1/", // multicast
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[::ffff:127.0.0.1]/", // IPv4-mapped loopback
    "http://[::ffff:10.0.0.1]/",
  ];
  for (const url of bad) {
    await assertRejects(
      () => assertSafeOutboundUrl(url),
      Error,
      undefined,
      `expected reject for ${url}`,
    );
  }
});

Deno.test("rejects known internal hostnames", async () => {
  const bad = [
    "http://localhost/",
    "http://localhost:8080/",
    "http://metadata.google.internal/",
    "http://metadata/",
    "http://anything.internal/",
    "http://service.local/",
  ];
  for (const url of bad) {
    await assertRejects(
      () => assertSafeOutboundUrl(url),
      Error,
      undefined,
      `expected reject for ${url}`,
    );
  }
});

Deno.test("isPrivateIp helper classifies ranges correctly", () => {
  // private
  for (const ip of [
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "fd12::1",
    "::ffff:127.0.0.1",
  ]) {
    assert(isPrivateIp(ip), `${ip} should be private`);
  }
  // public
  for (const ip of [
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1", // outside 172.16/12
    "172.15.0.1",
    "192.167.0.1",
    "11.0.0.1",
    "2001:4860:4860::8888",
  ]) {
    assertEquals(isPrivateIp(ip), false, `${ip} should be public`);
  }
});

Deno.test("allows well-formed public http(s) URLs", async () => {
  // Uses real DNS — public hosts must resolve cleanly. Skip if offline.
  try {
    await assertSafeOutboundUrl("https://example.com/");
    await assertSafeOutboundUrl("https://www.facebook.com/somepost");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("could not be safely resolved") || msg.includes("DNS")) {
      console.warn("Skipping public-host check (no DNS):", msg);
      return;
    }
    throw e;
  }
});
