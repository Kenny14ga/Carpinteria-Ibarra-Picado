import type { NextRequest } from "next/server";

export const POS_OFFLINE_AUTH_COOKIE = "pos_offline_auth";

const MIN_OFFLINE_COOKIE_LENGTH = 24;

export function readOfflineAuthCookie(request: NextRequest) {
  return request.cookies.get(POS_OFFLINE_AUTH_COOKIE)?.value ?? null;
}

export function hasOfflineAuthFallback(request: NextRequest) {
  const cookieValue = readOfflineAuthCookie(request);

  if (!cookieValue) {
    return false;
  }

  const normalizedValue = cookieValue.trim();

  if (normalizedValue.length < MIN_OFFLINE_COOKIE_LENGTH) {
    return false;
  }

  return normalizedValue !== "expired" && normalizedValue !== "invalid";
}
