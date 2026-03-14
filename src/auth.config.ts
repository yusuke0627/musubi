import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const user = auth?.user as any;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isAdvertiserRoute = nextUrl.pathname.startsWith("/advertiser");
      const isPublisherRoute = nextUrl.pathname.startsWith("/publisher");

      if (isAdminRoute || isAdvertiserRoute || isPublisherRoute) {
        if (!isLoggedIn) return false;

        // Role-based access control
        if (isAdminRoute && user?.role !== "admin") {
          return Response.redirect(new URL("/403", nextUrl));
        }
        if (isAdvertiserRoute && user?.role !== "advertiser" && user?.role !== "admin") {
          return Response.redirect(new URL("/403", nextUrl));
        }
        if (isPublisherRoute && user?.role !== "publisher" && user?.role !== "admin") {
          return Response.redirect(new URL("/403", nextUrl));
        }
        return true;
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
