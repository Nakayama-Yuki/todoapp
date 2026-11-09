import { auth, isAuthEnabled } from "@/auth";

/** null means unauthenticated; ownerId=null is the separate local shared list. */
export async function getTodoAccess() {
  if (!isAuthEnabled) return { ownerId: null, session: null };
  const session = await auth();
  if (!session?.user?.id) return null;
  return { ownerId: `github:${session.user.id}`, session };
}
