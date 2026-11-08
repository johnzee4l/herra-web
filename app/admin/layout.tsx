import { redirect } from "next/navigation";
import { AppProvider } from "@/lib/state";
import { AdminChrome } from "@/components/shell/AdminChrome";
import { DataBridge } from "@/lib/data/hydrate";
import { loadBootstrap } from "@/lib/data/bootstrap";
import { supabaseServer } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/sign-in?redirect=/admin");

  const data = await loadBootstrap(user.id, user.email ?? "");
  if (!data) redirect("/sign-in?redirect=/admin");
  if (data.user.role !== "admin") redirect("/farmer");

  return (
    <DataBridge data={data}>
      <AppProvider user={data.user} space={data.spaces[0] ?? null} spaces={data.spaces}>
        <AdminChrome>{children}</AdminChrome>
      </AppProvider>
    </DataBridge>
  );
}
