import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      linked_id: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    linked_id: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    linked_id: number | null;
  }
}
