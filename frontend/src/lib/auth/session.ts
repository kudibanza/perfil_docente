import "server-only";

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  email: string;
  role: "USER" | "UNIT_ADMIN" | "SUPER_ADMIN";
  organizational_unit_id: number | null;
  is_active: boolean;
  permissions: string[];
};

export type AppSession = {
  accessToken?: string;
  expiresAt?: number;
  user?: SessionUser;
};

function sessionOptions(): SessionOptions {
  const password = process.env.IRON_SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error("IRON_SESSION_PASSWORD deve ter pelo menos 32 caracteres.");
  }
  return {
    cookieName: "uniluanda_session",
    password,
    ttl: 30 * 60,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<AppSession>(await cookies(), sessionOptions());
}
