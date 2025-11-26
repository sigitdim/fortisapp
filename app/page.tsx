// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Kalau belum login → ke /login
  if (!session) {
    redirect("/login");
  }

  // Sudah login → ke dashboard
  redirect("/dashboard");
}
