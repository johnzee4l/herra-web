"use client";

/* Settings (blueprint F-01-03, F-43). Profile, appearance, map, units,
   notifications, spaces, defaults. Settings persist to localStorage in this
   build; in the product they persist to profiles.settings. */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import {
  Avatar,
  Badge,
  BlurFade,
  Btn,
  Field,
  NumField,
  Seg,
  Sel,
  Switch,
  Tabs,
} from "@/components/ui/primitives";
import { useConfirm } from "@/components/ui/overlays";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { fA, fLong, fR, fT } from "@/lib/units/format";
import { liveMySpaces } from "@/lib/store";
import { signOut } from "@/app/actions/auth";

type Tab = "profile" | "appearance" | "map" | "units" | "notif" | "spaces" | "defaults";

function SetRow({
  label,
  sub,
  children,
  col,
}: {
  label: string;
  sub?: string;
  children: ReactNode;
  col?: boolean;
}) {
  return (
    <div
      className={"row between g4" + (col ? " wrap" : "")}
      style={{
        padding: "16px 0",
        borderBottom: "1px solid color-mix(in oklab,var(--divider) 50%,transparent)",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="title-sm">{label}</div>
        {sub && <div className="body-sm muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { bp, user, settings, setSettings, spaceId, setSpaceId } = useApp();
  const router = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("profile");
  const wide = bp !== "xs" && bp !== "sm";
  const st = settings;
  const spaces = liveMySpaces(user.id);

  const tabs: { k: Tab; l: string; i: string }[] = [
    { k: "profile", l: "Profile", i: "User" },
    { k: "appearance", l: "Appearance", i: "Palette" },
    { k: "map", l: "Map", i: "MapTrifold" },
    { k: "units", l: "Units", i: "Translate" },
    { k: "notif", l: "Notifications", i: "Bell" },
    { k: "spaces", l: "Spaces", i: "Stack" },
    { k: "defaults", l: "Defaults", i: "Sliders" },
  ];

  const titleBlock = (
    <BlurFade>
      <div className={wide ? "display-lg" : "display-md"} style={{ margin: "6px 0 20px" }}>
        {t("settings")}
      </div>
    </BlurFade>
  );
  const tabsBlock = <Tabs opts={tabs} v={tab} on={setTab} />;

  const panel = (
      <div className="cap68 mt4" key={tab}>
        {tab === "profile" && (
          <div>
            <div className="row g4" style={{ padding: "8px 0 20px" }}>
              <div className="rel">
                <Avatar u={user} sz="lg" />
              </div>
              <div>
                <div className="title-md">{user.name}</div>
                <div className="muted body-sm">{user.email}</div>
                <div className="mt2">
                  <Badge tone={user.role === "admin" ? "sky" : "growth"} icon={user.role === "admin" ? "Stack" : "Plant"}>
                    {user.role === "admin" ? "Admin" : "Farmer"}
                  </Badge>
                </div>
              </div>
            </div>

            <Field label="Display name">
              <input className="input" defaultValue={user.name} readOnly />
            </Field>

            <div className="mt6">
              <Btn
                cls="destructive"
                icon="SignOut"
                onClick={() =>
                  confirm({
                    title: "Sign out?",
                    body: "You can sign in again at any time.",
                    confirm: "Sign out",
                    onOk: () => {
                      void signOut();
                    },
                  })
                }
              >
                Sign out
              </Btn>
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <div>
            <SetRow label="Theme" sub="Dark is AMOLED black; Light is warm linen.">
              <Seg
                sm
                opts={[
                  { k: "light", l: "Light", i: "SunDim" },
                  { k: "dark", l: "Dark", i: "Moon" },
                  { k: "system", l: "System" },
                ]}
                v={st.theme}
                on={(k) => setSettings({ theme: k })}
              />
            </SetRow>
            <SetRow label="Motion" sub="Reduced removes orbit, parallax and tickers.">
              <Seg
                sm
                opts={[
                  { k: "full", l: "Full" },
                  { k: "reduced", l: "Reduced" },
                ]}
                v={st.motion}
                on={(k) => setSettings({ motion: k })}
              />
            </SetRow>
          </div>
        )}

        {tab === "map" && (
          <div>
            <SetRow label="Default style" sub="Satellite is best for drawing.">
              <Seg
                sm
                opts={[
                  { k: "sat", l: "Satellite" },
                  { k: "dark", l: "Dark" },
                  { k: "light", l: "Light" },
                ]}
                v={st.mapStyle}
                on={(k) => setSettings({ mapStyle: k })}
              />
            </SetRow>
            <SetRow label="Auto-switch with theme" sub="Overview maps follow Light/Dark.">
              <Switch on={st.autoMap} onChange={(v) => setSettings({ autoMap: v })} label="Auto" />
            </SetRow>
            <SetRow label="Labels" sub="Show field and space names on maps.">
              <Switch on={st.labels} onChange={(v) => setSettings({ labels: v })} label="Labels" />
            </SetRow>
          </div>
        )}

        {tab === "units" && (
          <div>
            <SetRow label="Measurement system">
              <Seg
                sm
                opts={[
                  { k: "metric", l: "Metric" },
                  { k: "imperial", l: "Imperial" },
                ]}
                v={st.units}
                on={(k) => setSettings({ units: k })}
              />
            </SetRow>
            <SetRow label="Temperature">
              <Seg
                sm
                opts={[
                  { k: "C", l: "°C" },
                  { k: "F", l: "°F" },
                ]}
                v={st.temp}
                on={(k) => setSettings({ temp: k })}
              />
            </SetRow>
            <SetRow label="Area">
              <Seg
                sm
                opts={[
                  { k: "ha", l: "Hectares" },
                  { k: "ac", l: "Acres" },
                ]}
                v={st.area}
                on={(k) => setSettings({ area: k })}
              />
            </SetRow>
            <div className="alert info mt4">
              <Ic n="Info" w="fill" s={20} />
              <div className="body-sm">
                Preview · {fLong(Date.now())} · {fT(31, st)} / {fT(24, st)} · {fR(84, st)} rain ·
                1.2 ha = {fA(1.2, st)}
              </div>
            </div>
          </div>
        )}

        {tab === "notif" && (
          <div>
            {(
              [
                ["weather", "Weather & stress alerts", "Heat, cold and rain crossing your crops' thresholds."],
                ["announce", "Announcements", "From your space admin."],
              ] as const
            ).map(([k, l, sub]) => (
              <SetRow key={k} label={l} sub={sub}>
                <Switch
                  on={st.notif[k]}
                  onChange={(v) => setSettings({ notif: { ...st.notif, [k]: v } })}
                  label={l}
                />
              </SetRow>
            ))}
            <div className="caption mt3">
              Alerts appear in your notifications. This version delivers them in the app only.
            </div>
          </div>
        )}

        {tab === "spaces" && (
          <div>
            {spaces.map((sp) => (
              <SetRow
                key={sp.id}
                label={sp.name}
                sub={`${sp.place.municipality}, ${sp.place.province}`}
              >
                <Btn
                  cls="ghost"
                  sz="sm"
                  onClick={() => router.push(embedded ? `/admin/spaces/${sp.id}` : `/farmer/spaces/${sp.id}`)}
                >
                  Open
                </Btn>
              </SetRow>
            ))}
          </div>
        )}

        {tab === "defaults" && (
          <div>
            <SetRow label="Default space">
              <div style={{ minWidth: 200 }}>
                <Sel
                  v={spaceId ?? ""}
                  on={(v) => setSpaceId(v)}
                  opts={spaces.map((x) => ({ k: x.id, l: x.name }))}
                />
              </div>
            </SetRow>
            <SetRow label="Default analysis">
              <Seg
                sm
                opts={[
                  { k: "recommend", l: t("recommend") },
                  { k: "checkup", l: t("checkup") },
                ]}
                v={st.defaultKind}
                on={(k) => setSettings({ defaultKind: k })}
              />
            </SetRow>
            <SetRow label="Heat alert threshold" sub="Alert space members when a forecast exceeds this." col>
              <NumField
                v={st.alertHeat}
                on={(v) => setSettings({ alertHeat: v })}
                min={28}
                max={42}
                suffix="°C"
              />
            </SetRow>
            <SetRow label="Rain alert threshold" sub="7-day total across a space." col>
              <NumField
                v={st.alertRain}
                on={(v) => setSettings({ alertRain: v })}
                min={20}
                max={300}
                step={10}
                suffix="mm"
              />
            </SetRow>
          </div>
        )}
      </div>
  );

  if (embedded) {
    return (
      <div>
        {tabsBlock}
        {panel}
      </div>
    );
  }

  return (
    <Page title={t("settings")} wide>
      {titleBlock}
      {tabsBlock}
      {panel}
    </Page>
  );
}
