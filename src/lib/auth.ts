// src/lib/auth.ts
// NOTE: This module uses bcrypt (native bindings) and Prisma — both require
// the Node.js runtime. The route handler that imports this must set:
//   export const runtime = "nodejs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs"; // bcryptjs is pure-JS; safer across runtimes than bcrypt
import prisma from "../lib/prisma";

// declare module "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          id?: string;
          role?: string;
          isVerified?: boolean;
        };

        token.id = authUser.id ?? token.id;
        token.role = authUser.role ?? token.role;
        token.isVerified = authUser.isVerified ?? token.isVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
  },
};

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      isVerified: boolean;
    };
  }
}


// // Pages Router
// import NextAuth from "next-auth";
// import { authOptions } from "@/lib/auth";

// export default NextAuth(authOptions);