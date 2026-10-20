import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Shared NextAuth options — used by /api/auth/[...nextauth] and getServerSession()
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  // Trust the host header so NextAuth works behind the Caddy proxy on port 81
  // and on the preview URL (https://preview-*.space-z.ai)
  trustHost: true,
  pages: {
    // We don't actually navigate to these — the AuthModal handles flow client-side
    signIn: "/",
    error: "/",
  },
  providers: [
    CredentialsProvider({
      name: "GameHub",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@gamehub.gg" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? "").toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        // Seeded users with no passwordHash: accept password "demo" only as a fallback
        // for the NovaStrike demo account. Otherwise require bcrypt verification.
        if (!user.passwordHash) {
          // Allow only "demo" password for un-hashed users (legacy/demo)
          if (password === "demo" && user.email === "nova@gamehub.gg") {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
            } as any;
          }
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = (user as any).email;
        token.name = (user as any).name;
      }
      return token;
    },
    async session({ session, token }) {
      // expose user.id on the session for client use
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).email = token.email as string;
        (session.user as any).name = token.name as string;
      }
      return session;
    },
  },
};

// Server-side helper: returns the authenticated user row from the DB, or null
export async function getAuthUser() {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await db.user.findUnique({ where: { email: session.user.email } });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarColor: u.avatarColor,
    status: u.status,
    customStatus: u.customStatus,
    bio: u.bio,
    bannerColor: u.bannerColor,
    settings: u.settings,
    createdAt: u.createdAt,
  };
}
