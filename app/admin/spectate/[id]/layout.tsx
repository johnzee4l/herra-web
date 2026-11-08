import { notFound, redirect } from "next/navigation";
import { AppProvider } from "@/lib/state";
import { AppRoot } from "@/components/shell/AppRoot";
import { FarmerShell } from "@/components/shell/FarmerShell";
import { DataBridge } from "@/lib/data/hydrate";
import { loadSpectate } from "@/lib/data/bootstrap";
import { supabaseServer } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default async function SpectateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/farmer");

  const data = await loadSpectate(id);
  if (!data) notFound();

  return (
    <DataBridge data={data}>
      <AppProvider user={data.user} space={data.spaces[0] ?? null} spaces={data.spaces} readonly>
        <AppRoot>
          <FarmerShell base={`/admin/spectate/${id}`}>{children}</FarmerShell>
        </AppRoot>
      </AppProvider>
    </DataBridge>
  );
}
