// Server-only admin session helpers. HMAC-signed cookie.
import { createHmac, timingSafeEqual } from "crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "fb_admin";
const MAX_AGE = 60 * 60 * 8; // 8h

function getSecret() {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Missing server secret");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function issueAdminCookie() {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `admin.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearAdminCookie() {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

export function isAdmin(): boolean {
  const token = getCookie(COOKIE_NAME);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== "admin") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`${role}.${expStr}`);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function requireAdmin() {
  if (!isAdmin()) throw new Error("Unauthorized");
}
