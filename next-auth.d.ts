// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      username?: string | null;
    };
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number | null;
    error: string | null;
  }

  interface JWT {
    id: string;
    email?: string | null;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt?: number;
    error?: string;
  }
}
