"use client";

export const OWNER_STORAGE_KEY = "fortisapp.owner_id";
const OWNER_COOKIE = "fortis_owner_id";

export function setOwnerId(ownerId: string | null) {
  try {
    if (ownerId) {
      localStorage.setItem(OWNER_STORAGE_KEY, ownerId);
      document.cookie = `${OWNER_COOKIE}=${ownerId}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } else {
      localStorage.removeItem(OWNER_STORAGE_KEY);
      document.cookie = `${OWNER_COOKIE}=; path=/; max-age=0`;
    }
  } catch {}
}

export function getOwnerId(): string | null {
  try {
    const fromLs = localStorage.getItem(OWNER_STORAGE_KEY);
    if (fromLs) return fromLs;
  } catch {}
  // fallback cookie
  const cookie = typeof document !== "undefined" ? document.cookie : "";
  const m = cookie.match(new RegExp(`${OWNER_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
