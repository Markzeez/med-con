// src/app/api/auth/[...nextauth]/route.ts
// Force Node.js runtime — next-auth v4 is not compatible with the Edge runtime
// used by Next.js 15+ App Router by default.
export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
