import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { checkAndRegisterUser } from "@/lib/googleSheets";

// Pastikan NEXTAUTH_URL memiliki fallback saat build di Vercel
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://qc-report-pi.vercel.app";
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await checkAndRegisterUser(user.email, user.name || "No Name");
      return true;
    },
    async session({ session }) {
      if (session.user && session.user.email) {
        const role = await checkAndRegisterUser(
          session.user.email,
          session.user.name || "No Name"
        );
        (session.user as any).role = role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };