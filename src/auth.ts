import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(credentials.email) as any;

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.password_hash);

        if (!isValid) return null;

        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
          linked_id: user.linked_id,
        };
      },
    }),
  ],
});
