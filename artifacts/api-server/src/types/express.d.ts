import type { User, Member, Exercise } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
      currentUser?: User;
      membership?: Member;
      /** Set by `requireOrgMembership`: the validated `:orgId` route param. */
      orgId?: number;
      /** Set by `requireOrgMembership`: the local user id of the authenticated member. */
      userId?: number;
      /** Set by `requireExerciseScope`/`requireWritableExerciseScope`: the resolved active exercise. */
      exercise?: Exercise;
    }
  }
}

export {};
