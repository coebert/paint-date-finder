// Secure flyer upload endpoint.
// Signed-in users send one image/PDF (multipart field "file"). The function
// checks the real file type from its first bytes, enforces size limits and an
// hourly quota, then stores it with server privileges under a per-user prefix
// with a random name. No storage write/overwrite/delete/list permission is
// granted to visitors — the bucket stays admin-writable only.
import { corsHeaders, json, preflight } from "../_shared/http.ts";
import { adminClient, readEnv } from "../_shared/supabase.ts";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const HOURLY_UPLOAD_LIMIT = 20;

export function sniffType(b: Uint8Array): { mime: string; ext: string } | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: "image/webp", ext: "webp" };
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return { mime: "application/pdf", ext: "pdf" };
  return null;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const env = readEnv();
  if (!env) return json({ error: "Missing required environment variables" }, { status: 500 });
  const admin = adminClient(env);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let userId: string | null = null;
  if (token) {
    try {
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    } catch { userId = null; }
  }
  if (!userId) return json({ error: "Please sign in to upload a flyer." }, { status: 401 });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_PDF_BYTES + 64 * 1024) {
    return json({ error: "File too large (max 8 MB for images, 10 MB for PDFs)." }, { status: 413 });
  }

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("flyer_extraction_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("kind", "upload").gte("created_at", since);
  if ((count ?? 0) >= HOURLY_UPLOAD_LIMIT) {
    return json({ error: "Too many uploads this hour. Please try again later." }, { status: 429 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return json({ error: "Send the flyer as multipart form data." }, { status: 400 });
  }
  if (!file) return json({ error: "No file received." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type) return json({ error: "Only JPG, PNG, WebP images or PDF files are accepted." }, { status: 415 });
  const limit = type.mime === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (bytes.length === 0 || bytes.length > limit) {
    return json({ error: `File too large (max ${limit / 1024 / 1024} MB for this type).` }, { status: 413 });
  }

  const path = `uploads/${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await admin.storage.from("flyer-images").upload(path, bytes, {
    contentType: type.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[upload-flyer] storage error", error.message);
    return json({ error: "Could not store the flyer. Please try again." }, { status: 500 });
  }
  await admin.from("flyer_extraction_log").insert({ user_id: userId, kind: "upload" })
    .then(undefined, () => {});

  const { data: pub } = admin.storage.from("flyer-images").getPublicUrl(path);
  return new Response(JSON.stringify({ url: pub.publicUrl, path, mime: type.mime, size: bytes.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
