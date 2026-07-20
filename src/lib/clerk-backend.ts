import { createClerkClient } from "@clerk/backend";

// The ONLY module that talks to the Clerk Backend API. Everything else depends on these two thin
// wrappers so the surface stays small and mockable. secretKey is read once from env and NEVER
// logged. Used by the one-time access-code flow to (1) find-or-create the family's Clerk user at
// parent activation and (2) mint a single-use sign-in ticket the child's browser silently consumes.

const secretKey = process.env.CLERK_SECRET_KEY;

function client() {
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set — cannot use the Clerk Backend API.");
  }
  return createClerkClient({ secretKey });
}

/** Find an existing Clerk user by primary email, or create a passwordless one. Returns userId. */
export async function findOrCreateUserByEmail(email: string): Promise<string> {
  const clerk = client();
  const normalized = email.trim().toLowerCase();
  const existing = await clerk.users.getUserList({ emailAddress: [normalized] });
  if (existing.data.length > 0) return existing.data[0].id;
  const created = await clerk.users.createUser({
    emailAddress: [normalized],
    skipPasswordRequirement: true,
  });
  return created.id;
}

/** Mint a single-use Clerk sign-in ticket for a user. The child's browser consumes it (no form). */
export async function mintSignInTicket(
  userId: string,
  expiresInSeconds = 15 * 60
): Promise<string> {
  const clerk = client();
  const t = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds });
  return t.token;
}
