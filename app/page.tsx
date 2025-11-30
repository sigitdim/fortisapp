import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

type RootProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function RootPage(props: RootProps | any) {
  const searchParams = props?.searchParams as
    | Record<string, string | string[] | undefined>
    | undefined;

  // 1) Kalau Supabase ngembalikan ke "/?code=...."
  const code = (searchParams?.code as string | undefined) || undefined;
  const from = (searchParams?.from as string | undefined) || undefined;

  if (code) {
    // lempar ke callback route kita sendiri
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://app.fortislab.id";

    const url = new URL(`${origin}/auth/callback`);
    url.searchParams.set("code", code);
    if (from) url.searchParams.set("from", from);

    redirect(url.toString());
  }

  // 2) Normal guard: cek session
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Belum login → ke /login
  if (!session) {
    redirect("/login");
  }

  // Sudah login → ke dashboard
  redirect("/dashboard");
}
