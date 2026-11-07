import Link from "next/link";
import { Dashboard } from "@/components/domain/Dashboard";
import { Ic } from "@/components/ui/Ic";
import { USERS } from "@/lib/fixtures";

/* Spectate banner (mockup: `.spectate` / `.sbanner`). Sticky above the
   farmer's own content so the admin always knows the view is read-only. */
export default async function SpectateHome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = USERS.find((x) => x.id === id) ?? USERS[0];

  return (
    <>
      <div className="spectate">
        <div className="sbanner">
          <Ic n="Eye" w="fill" s={16} />
          Spectating {u.name} · read-only
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
