"use client";

/* Notifications (blueprint F-24). Weather alerts and announcements are the
   kinds a farmer gets in volume, plus entry-ready, data and outcome prompts.
   "All" lists every kind so the unread badge always matches the rows below it. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { BlurFade, Btn, Chip, Empty } from "@/components/ui/primitives";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { ago } from "@/lib/units/format";
import { db, markAllNotifsRead, markNotifRead } from "@/lib/store";
import { useDb } from "@/lib/useDb";

const NK: Record<string, [string, string]> = {
  entry: ["Sparkle", "growth"],
  weather: ["CloudRain", "water"],
  announce: ["Megaphone", "sky"],
  data: ["Database", "heat"],
  outcome: ["Flag", "soil"],
};

type Filter = "all" | "weather" | "announce";

export function Notifs() {
  const { bp, user, toast } = useApp();
  const router = useRouter();
  useDb();
  const [f, setF] = useState<Filter>("all");
  const wide = bp !== "xs" && bp !== "sm";

  const all = db.notifs.filter((n) => n.userId === user.id);
  const list = all.filter((n) => f === "all" || n.kind === f);

  return (
    <Page
      title={t("notifications")}
      wide
      right={
        <Btn
          cls="ghost"
          sz="sm"
          icon="Checks"
          onClick={() => {
            markAllNotifsRead(user.id);
            toast("All marked read", { icon: "Checks" });
          }}
        >
          Mark all read
        </Btn>
      }
    >
      <BlurFade>
        <div className={wide ? "display-lg" : "display-md"} style={{ margin: "6px 0 16px" }}>
          {t("notifications")}
        </div>
      </BlurFade>

      <div className="pill-tabs">
        {(
          [
            ["all", "All"],
            ["weather", "Weather"],
            ["announce", "Announcements"],
          ] as [Filter, string][]
        ).map(([k, l]) => (
          <Chip key={k} sm on={f === k} onClick={() => setF(k)}>
            {l}
          </Chip>
        ))}
      </div>

      <div className="cap68 mt3">
        {list.length ? (
          list.map((n, i) => {
            const [ic, tone] = NK[n.kind] ?? ["Bell", "sky"];
            return (
              <div
                key={n.id}
                className={"notif" + (n.read ? "" : " unread")}
                style={{ ["--i" as string]: i }}
                onClick={() => {
                  markNotifRead(n.id);
                  if (n.route) router.push(n.route);
                }}
              >
                <span
                  className="nd"
                  style={{
                    background: `var(--${tone}-tint)`,
                    color: `var(--${tone})`,
                  }}
                >
                  <Ic n={ic} w="duotone" s={22} />
                </span>
                <div className="grow">
                  <div className="title-sm" style={n.read ? { fontWeight: 550 } : undefined}>
                    {n.title}
                  </div>
                  <div className="body-sm muted">{n.body}</div>
                  <div className="caption mt1">{ago(n.createdAt)}</div>
                </div>
              </div>
            );
          })
        ) : (
          <Empty
            icon="Bell"
            title="You're all caught up"
            sub="Weather alerts and announcements appear here."
          />
        )}
      </div>
    </Page>
  );
}

