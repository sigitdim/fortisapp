"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export type CurrentUserSafe = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUserSafe(): Promise<CurrentUserSafe> {
  const supabase = createClientComponentClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("getCurrentUserSafe error", error);
    throw new Error("User tidak ditemukan. Silakan login ulang.");
  }

  const email = user.email;
  if (!email) {
    throw new Error("Email user tidak tersedia.");
  }

  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    email;

  return {
    id: user.id,
    email,
    name,
  };
}
