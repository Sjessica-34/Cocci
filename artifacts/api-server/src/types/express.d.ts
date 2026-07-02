import type { User, Member } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
      currentUser?: User;
      membership?: Member;
    }
  }
}

export {};
