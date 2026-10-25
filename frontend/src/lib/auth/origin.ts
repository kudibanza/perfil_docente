import "server-only";

import type { NextRequest } from "next/server";

export function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  return Boolean(origin && expected && origin === expected);
}
