import { cookies } from "next/headers";

const COOKIE_NAME = "manage_pin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export function getManagePin(): string | null {
  return process.env.MANAGE_PIN || null;
}

export async function hasManageAccess(): Promise<boolean> {
  const pin = getManagePin();
  if (!pin) return true; // no PIN configured -> open (dev convenience)

  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === pin;
}

export async function requireManageAccess(): Promise<void> {
  if (!(await hasManageAccess())) {
    throw new Error("Not authorized. Please re-enter the PIN.");
  }
}

export async function setManageCookie(pin: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, pin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}
