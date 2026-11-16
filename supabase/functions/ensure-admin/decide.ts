// Pure decision logic for ensure-admin, kept separate so it can be unit-tested.
// Admin status comes ONLY from an existing server-managed user_roles grant keyed
// by the immutable auth user id. Email address never grants anything.

export interface AuthUserLike {
  id?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}

export type Decision =
  | { status: 401; body: { error: string } }
  | { status: 403; body: { isAdmin: false; error: string } }
  | { status: 200; needsRoleLookup: true; userId: string };

export function decideAccess(user: AuthUserLike | null | undefined): Decision {
  if (!user?.id) return { status: 401, body: { error: "Unauthorized" } };
  const verified = !!(user.email_confirmed_at || user.confirmed_at);
  if (!verified) {
    return { status: 403, body: { isAdmin: false, error: "Account not verified" } };
  }
  return { status: 200, needsRoleLookup: true, userId: user.id };
}
