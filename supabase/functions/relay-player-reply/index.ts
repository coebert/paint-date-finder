// Relays a reply to a "Looking for a game" post without exposing the
// player's email address to the sender.
//
// Public endpoint (no auth): anyone browsing the board can reply to a post.
// The player's contact_email is read server-side with the service-role key
// and never returned to the caller. If the player address can't be emailed
// (unverified sending domain), the reply is forwarded to the moderator
// mailbox instead, matching the promise on the page.

import { adminClient, readEnv } from "../_shared/supabase.ts";
import { errors, json, preflight } from "../_shared/http.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const SITE = "https://findawalkon.com";
const FROM = "Find A Walk-On <onboarding@resend.dev>";

const BodySchema = z.object({
  post_id: z.string().uuid(),
  sender_name: z.string().trim().min(1).max(80),
  sender_email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(1500),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(
  lovableKey: string,
  resendKey: string,
  to: string,
  replyTo: string,
  subject: string,
  html: string,
) {
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: replyTo, subject, html }),
  });
  if (!res.ok) {
    console.error("resend failed", res.status, await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const env = readEnv();
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!env || !lovableKey || !resendKey) return errors.missingEnv();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { post_id, sender_name, sender_email, message } = parsed.data;

  const supabase = adminClient(env);
  const { data: post, error } = await supabase
    .from("player_seeking_posts")
    .select("id, player_name, contact_email, target_date, region, is_hidden, expires_at")
    .eq("id", post_id)
    .maybeSingle();

  if (error) {
    console.error("post lookup failed", error.message);
    return json({ error: "Could not load that post" }, { status: 500 });
  }
  if (!post || post.is_hidden) {
    return json({ error: "That post is no longer available" }, { status: 404 });
  }

  const html = `
    <h2 style="font-family:Arial,sans-serif;color:#0f1b3d;">Someone replied to your post</h2>
    <p style="font-family:Arial,sans-serif;color:#333;">
      Hi ${escapeHtml(post.player_name)}, you had a reply to your
      <a href="${SITE}/looking-for-a-game">Looking for a game</a> post
      (${escapeHtml(String(post.target_date))}${post.region ? `, ${escapeHtml(post.region)}` : ""}).
    </p>
    <p style="font-family:Arial,sans-serif;color:#333;"><strong>From:</strong>
      ${escapeHtml(sender_name)} &lt;${escapeHtml(sender_email)}&gt;</p>
    <blockquote style="font-family:Arial,sans-serif;color:#333;border-left:3px solid #d9822b;padding-left:12px;white-space:pre-line;">${escapeHtml(message)}</blockquote>
    <p style="font-family:Arial,sans-serif;color:#666;font-size:12px;">
      Just hit reply to get back to them — your address was not shared until you do.
    </p>
  `;

  let delivered = await sendEmail(
    lovableKey,
    resendKey,
    post.contact_email,
    sender_email,
    `Reply to your Find A Walk-On post`,
    html,
  );
  let relayedToModerator = false;

  if (!delivered) {
    const moderator = Deno.env.get("ADMIN_EMAIL");
    if (moderator) {
      relayedToModerator = await sendEmail(
        lovableKey,
        resendKey,
        moderator,
        sender_email,
        `[Pass on] Reply for ${post.player_name}`,
        `<p style="font-family:Arial,sans-serif;color:#333;">Direct delivery to the player failed — please pass this on.</p>${html}`,
      );
      delivered = relayedToModerator;
    }
  }

  if (!delivered) {
    return json({ error: "We couldn't send that reply. Please try again later." }, { status: 502 });
  }

  return json({ success: true, relayed_to_moderator: relayedToModerator });
});
