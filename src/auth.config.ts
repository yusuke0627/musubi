import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isAdvertiserRoute = nextUrl.pathname.startsWith("/advertiser");
      const isPublisherRoute = nextUrl.pathname.startsWith("/publisher");

      if (isAdminRoute || isAdvertiserRoute || isPublisherRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.linked_id = (user as any).linked_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).linked_id = token.linked_id;
      }
      return session;
    },
  },
  providers: [], // Add providers with window/node dependencies in auth.ts
} satisfies NextAuthConfig;
