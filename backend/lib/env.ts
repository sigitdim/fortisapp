export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").trim(); // "" = same-origin
export const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID || "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";
export const commonHeaders: HeadersInit = {
  "Content-Type": "application/json",
  "x-owner-id": OWNER_ID,
};
