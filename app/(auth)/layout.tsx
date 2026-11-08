/* Auth and onboarding shell. A signed-in visitor (for example following a
   join link) gets their real profile and settings; a signed-out visitor gets
   an empty guest context, never a demo identity. */

import { AppProvider } from "@/lib/state";
import { AppRoot } from "@/components/shell/AppRoot";
import { DataBridge } from "@/lib/data/hydrate";
import { loadBootstrap } from "@/lib/data/bootstrap";
import { supabaseServer } from "@/lib/supabase/client";
import { DEF_SETTINGS, type User } from "@/lib/types";

export const dynamic = "force-dynamic";

const GUEST: User = {
  id: "",
  name: "",
  email: "",
  role: "farmer",
  settings: DEF_SETTINGS,
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const data = user ? await loadBootstrap(user.id, user.email ?? "") : null;
  const active = data?.user ?? GUEST;

  const shell = (
    <AppProvider user={active} space={data?.spaces[0] ?? null} spaces={data?.spaces ?? []}>
      <AppRoot>{children}</AppRoot>
    </AppProvider>
  );

  return data ? <DataBridge data={data}>{shell}</DataBridge> : shell;
}
