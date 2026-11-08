import Link from "next/link";
import { Dashboard } from "@/components/domain/Dashboard";
import { Ic } from "@/components/ui/Ic";
import { supabaseAdmin } from "@/lib/supabase/client";

export default async function SpectateHome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  return (
    <>
      <div className="spectate">
        <div className="sbanner">
          <Ic n="Eye" w="fill" s={16} />
          Spectating {data?.display_name || "this farmer"} · read-only
          <div className="grow" />
          <Link href="/admin/users" className="btn sm secondary">
            Exit
          </Link>
        </div>
      </div>
      <Dashboard />
    </>
  );
}
