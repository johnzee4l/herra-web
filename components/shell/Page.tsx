"use client";

/* Page frame: top bar with space chip, condensed title on scroll, and the
   page-in container. Transcribed from the mockup's Page component. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Ic } from "@/components/ui/Ic";
import { Dot } from "@/components/ui/primitives";
import { SpaceSwitch } from "@/components/shell/SpaceSwitch";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { unreadCount } from "@/lib/fixtures";

export function Page({
  title,
  backTo,
  right,
  children,
  wide,
}: {
  title: string;
  backTo?: string;
  right?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [condensed, setCondensed] = useState(false);
  const { user, space, openSheet } = useApp();
  const nu = unreadCount(user.id);

  useEffect(() => {
    const sc = ref.current?.closest(".scroll");
    if (!sc) return;
    const f = () => setCondensed(sc.scrollTop > 40);
    f();
    sc.addEventListener("scroll", f, { passive: true });
    return () => sc.removeEventListener("scroll", f);
  }, []);

  return (
    <div className="page" ref={ref}>
      <div className={cx("topbar", condensed && "condensed")}>
        {backTo ? (
          <Link href={backTo} className="iconbtn bordered" aria-label="Back">
            <Ic n="CaretLeft" s={20} w="bold" />
          </Link>
        ) : (
          <button
            className="chip"
            style={{ maxWidth: "62%", padding: "0 12px 0 14px" }}
            onClick={() =>
              openSheet({ title: "Your spaces", render: (close) => <SpaceSwitch close={close} /> })
            }
          >
            <Dot s={space && space.status === "attention" ? "warn" : "ok"} live />
            <span className="ellip">{space ? space.name : "No space yet"}</span>
            <Ic n="CaretRight" s={13} w="bold" style={{ transform: "rotate(90deg)" }} />
          </button>
        )}
        {backTo && <div className="ttl">{title}</div>}
        <div className="grow" />
        {right}
        {!backTo && (
          <>
            <Link href="/farmer/notifications" className="iconbtn" aria-label="Notifications">
              <Ic n="Bell" s={22} />
              {nu > 0 && <span className="badge-n">{nu}</span>}
            </Link>
            <Link href="/farmer/settings" className="iconbtn hide-md" aria-label="Settings">
              <Ic n="Gear" s={22} />
            </Link>
          </>
        )}
      </div>
      <div className={cx("page-in pad", wide && "wide")}>{children}</div>
    </div>
  );
}
