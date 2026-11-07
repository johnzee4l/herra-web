"use client";

/* Auth screens: sign in, sign up, forgot password, join by code, onboarding.
   Blueprint 6.1, 6.2 and 7.1. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import { Badge, BlurFade, Btn, Field, Logo, Seg, haptic } from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { sleep } from "@/lib/utils";
import { CROP_IDS } from "@/lib/spec/crops";
import { CROPS } from "@/lib/spec/crops";
import { getSpace } from "@/lib/fixtures";
import { DEMO, saveSession, sessionFor } from "@/lib/session";
import type { User } from "@/lib/types";

const validEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

function AuthShell({
  title,
  sub,
  children,
  foot,
}: {
  title: string;
  sub: string;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="fill" style={{ overflowY: "auto" }}>
      <div className="dotpat" style={{ position: "fixed" }} />
      <div
        className="col"
        style={{
          minHeight: "100%",
          maxWidth: 440,
          margin: "0 auto",
          padding: "78px 24px 32px",
          position: "relative",
          justifyContent: "center",
        }}
      >
        <div className="row g3" style={{ marginBottom: 28 }}>
          <Logo s={40} />
          <span className="title-lg" style={{ fontWeight: 800 }}>
            Herra AI
          </span>
        </div>
        <BlurFade>
          <div className="display-md" style={{ marginBottom: 8 }}>
            {title}
          </div>
          <div className="muted body-lg" style={{ marginBottom: 28 }}>
            {sub}
          </div>
        </BlurFade>
        {children}
        {foot && <div className="mt8 tc muted body-sm">{foot}</div>}
      </div>
    </div>
  );
}

export function SignIn() {
  const router = useRouter();
  const [email, setE] = useState("");
  const [pw, setP] = useState("");
  const [err, setErr] = useState<{ email?: string; pw?: string }>({});
  const [busy, setB] = useState(false);
  const [show, setShow] = useState(false);

  const go = (u: User) => {
    saveSession(sessionFor(u));
    router.replace(u.role === "admin" ? "/admin" : "/farmer");
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const er: typeof err = {};
    if (!validEmail(email)) er.email = "Enter a valid email address.";
    if (pw.length < 6) er.pw = "Password must be at least 6 characters.";
    setErr(er);
    if (Object.keys(er).length) return;
    setB(true);
    await sleep(500);
    setB(false);
    const u = [DEMO.farmer, DEMO.admin].find((x) => x.email === email.toLowerCase());
    if (!u) {
      setErr({ email: "No account with that email. Use a demo account below." });
      return;
    }
    go(u);
  };

  return (
    <AuthShell
      title="Welcome back"
      sub="Sign in to see your fields and today's conditions."
      foot={
        <>
          New to Herra?{" "}
          <Link href="/sign-up" className="primary-c" style={{ fontWeight: 700 }}>
            Create an account
          </Link>
        </>
      }
    >
      <form className="col g4" onSubmit={submit} noValidate>
        <Field label="Email" err={err.email}>
          <div className={"input-group" + (err.email ? " err" : "")}>
            <Ic n="Envelope" s={20} />
            <input
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setE(e.target.value)}
              autoComplete="username"
            />
          </div>
        </Field>

        <Field label="Password" err={err.pw}>
          <div className="input-group">
            <Ic n="LockKey" s={20} />
            <input
              type={show ? "text" : "password"}
              value={pw}
              placeholder="••••••••"
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="iconbtn sm"
              aria-label="Show password"
              onClick={() => setShow(!show)}
            >
              <Ic n={show ? "EyeSlash" : "Eye"} s={20} />
            </button>
          </div>
        </Field>

        <div className="row between">
          <span />
          <Link href="/forgot-password" className="body-sm primary-c" style={{ fontWeight: 650 }}>
            Forgot password?
          </Link>
        </div>

        <Btn sz="lg" block type="submit" disabled={busy} shimmer={busy}>
          {busy ? "Signing in…" : t("signin")}
        </Btn>
      </form>

      <div className="row g3 mt6">
        <div className="divider grow" />
        <span className="caption">Demo accounts</span>
        <div className="divider grow" />
      </div>

      <div className="grid cols2 g2 mt3">
        <button
          className="card hov"
          style={{ padding: 14 }}
          onClick={() => {
            setE(DEMO.farmer.email);
            setP("demo1234");
          }}
        >
          <Ic n="Plant" w="duotone" s={26} c="var(--primary)" />
          <div className="title-sm mt2">Farmer</div>
          <div className="caption">Rodel · 2 spaces, 5 fields</div>
        </button>
        <button
          className="card hov"
          style={{ padding: 14 }}
          onClick={() => {
            setE(DEMO.admin.email);
            setP("demo1234");
          }}
        >
          <Ic n="Stack" w="duotone" s={26} c="var(--sky)" />
          <div className="title-sm mt2">Admin</div>
          <div className="caption">Aileen · all spaces</div>
        </button>
      </div>
    </AuthShell>
  );
}

export function SignUp() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [err, setErr] = useState<{ name?: string; email?: string; pw?: string }>({});
  const [busy, setB] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const er: typeof err = {};
    if (f.name.trim().length < 2) er.name = "Tell us what to call you.";
    if (!validEmail(f.email)) er.email = "Enter a valid email address.";
    if (f.pw.length < 8) er.pw = "Use at least 8 characters.";
    setErr(er);
    if (Object.keys(er).length) return;
    setB(true);
    await sleep(600);
    setB(false);
    /* Sign-up always creates a farmer (blueprint 6.1). */
    saveSession({ uid: "u_new", role: "farmer", email: f.email.toLowerCase(), name: f.name.trim() });
    router.replace("/onboarding");
  };

  return (
    <AuthShell
      title="Create your account"
      sub="Farmer accounts start empty. Your cooperative admin gives you a code to join."
      foot={
        <>
          Already have one?{" "}
          <Link href="/sign-in" className="primary-c" style={{ fontWeight: 700 }}>
            Sign in
          </Link>
        </>
      }
    >
      <form className="col g4" onSubmit={submit}>
        <Field label="Your name" err={err.name}>
          <input
            className="input"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="Maria Santos"
          />
        </Field>
        <Field label="Email" err={err.email}>
          <input
            className="input"
            type="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" err={err.pw}>
          <input
            className="input"
            type="password"
            value={f.pw}
            onChange={(e) => setF({ ...f, pw: e.target.value })}
            placeholder="8+ characters"
          />
        </Field>
        <Btn sz="lg" block type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Btn>
      </form>
    </AuthShell>
  );
}

export function Forgot() {
  const [e, setE] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      sub={
        sent
          ? `We sent a reset link to ${e}. It expires in 30 minutes.`
          : "Enter your email and we will send you a secure link."
      }
      foot={
        <Link href="/sign-in" className="primary-c" style={{ fontWeight: 700 }}>
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="alert ok">
          <Ic n="CheckCircle" w="fill" s={22} />
          <div className="body-sm">
            If an account exists for that address, the email is on its way.
          </div>
        </div>
      ) : (
        <div className="col g4">
          <Field label="Email" err={err}>
            <input
              className="input"
              type="email"
              value={e}
              onChange={(x) => setE(x.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Btn
            sz="lg"
            block
            onClick={() => {
              if (!validEmail(e)) {
                setErr("Enter a valid email address.");
                return;
              }
              setSent(true);
            }}
          >
            Send reset link
          </Btn>
        </div>
      )}
    </AuthShell>
  );
}

/* ---------- access code input (blueprint 6.2) ---------- */

const CROCK = /[0-9A-HJKMNP-TV-Z]/;
const normCode = (c: string) => {
  const u = c.toUpperCase();
  return u === "I" || u === "L" ? "1" : u === "O" ? "0" : u;
};

function CodeInput({
  onDone,
  initial = "",
  busy,
}: {
  onDone: (code: string) => Promise<{ err?: string } | void>;
  initial?: string;
  busy?: boolean;
}) {
  const [v, setV] = useState<string[]>(Array.from({ length: 8 }, (_, i) => initial[i] || ""));
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const submit = async (code: string) => {
    const r = await onDone(code);
    if (r && r.err) {
      setErr(r.err);
      setShake(true);
      setTimeout(() => setShake(false), 320);
      haptic("other");
    }
  };

  const set = (arr: string[]) => {
    setV(arr);
    setErr(null);
    if (arr.every(Boolean)) submit(arr.join(""));
  };

  const input = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (!raw) {
      const n = [...v];
      n[i] = "";
      setV(n);
      return;
    }
    const n = [...v];
    let k = i;
    for (const ch of raw) {
      const c = normCode(ch);
      if (c === "U" || !CROCK.test(c)) continue;
      if (k < 8) n[k++] = c;
    }
    set(n);
    refs.current[Math.min(k, 7)]?.focus();
  };

  const key = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !v[i] && i > 0) {
      e.preventDefault();
      const n = [...v];
      n[i - 1] = "";
      setV(n);
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 7) refs.current[i + 1]?.focus();
  };

  const paste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const t = (e.clipboardData.getData("text") || "")
      .toUpperCase()
      .replace(/^\s*HRA[-\s]?/, "")
      .replace(/[^0-9A-Z]/g, "")
      .split("")
      .map(normCode)
      .filter((c) => CROCK.test(c))
      .slice(0, 8);
    const n = Array.from({ length: 8 }, (_, i) => t[i] || "");
    set(n);
    refs.current[Math.min(t.length, 7)]?.focus();
  };

  return (
    <div className="col g4" style={{ alignItems: "center" }}>
      <div className={"codebox" + (shake ? " shake" : "")} onPaste={paste}>
        <span className="mono" style={{ fontSize: 15, color: "var(--muted)", marginRight: 4, fontWeight: 600 }}>
          HRA
        </span>
        <span className="sep" />
        {v.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={c ? "filled" : ""}
              value={c}
              maxLength={2}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label={`Code character ${i + 1}`}
              onChange={(e) => input(i, e)}
              onKeyDown={(e) => key(i, e)}
              onFocus={(e) => e.target.select()}
              disabled={busy}
            />
            {i === 3 && <span className="sep" />}
          </span>
        ))}
      </div>
      {err && (
        <div className="err-msg" role="alert">
          <Ic n="Warning" w="fill" s={15} />
          {err}
        </div>
      )}
      <div className="col g2" style={{ alignItems: "center" }}>
        <span className="caption">Demo codes — tap to try</span>
        <div className="tag-row" style={{ justifyContent: "center" }}>
          {[
            ["HRA-7K2Q-9M4D", "Valid"],
            ["HRA-8D1B-MX6T", "Expired"],
            ["HRA-5J7S-3KWY", "Revoked"],
          ].map(([c, l]) => (
            <button
              key={c}
              className="chip sm"
              onClick={() => {
                const r = c.replace(/^HRA-/, "").replace(/-/g, "").split("");
                set(r);
              }}
            >
              <span className="mono" style={{ fontSize: 11.5 }}>
                {c}
              </span>
              <span className="muted">· {l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Demo codes. The real build hashes them with HMAC-SHA256 and a pepper, and
   join_space() checks expiry, revocation and the use limit in one
   transaction (blueprint 6.2). */
const CODES: Record<string, { spaceId: string; state: "valid" | "expired" | "revoked" }> = {
  "7K2Q9M4D": { spaceId: "sp_victoria", state: "valid" },
  "8D1BMX6T": { spaceId: "sp_socorro", state: "expired" },
  "5J7S3KWY": { spaceId: "sp_victoria", state: "revoked" },
};

function redeem(raw: string): { err?: string; spaceId?: string } {
  const code = raw.replace(/^HRA-?/, "").replace(/-/g, "");
  const c = CODES[code];
  if (!c) return { err: "That code doesn't match any space. Check for 0 vs O and 1 vs I." };
  if (c.state === "revoked") return { err: "This code was revoked by the space admin." };
  if (c.state === "expired") return { err: "This code expired. Ask your admin for a new one." };
  return { spaceId: c.spaceId };
}

export function JoinPage({ code }: { code?: string }) {
  const router = useRouter();
  const { openSheet, toast } = useApp();
  const [done, setDone] = useState<string | null>(null);

  return (
    <AuthShell
      title="Join a space"
      sub="Enter the code your admin shared."
      foot={
        <Link href="/farmer" className="primary-c" style={{ fontWeight: 700 }}>
          Skip for now
        </Link>
      }
    >
      <CodeInput
        initial={(code || "").replace(/^HRA-?/i, "").replace(/-/g, "").toUpperCase()}
        onDone={async (c) => {
          await sleep(300);
          const r = redeem(c);
          if (r.err) return r;
          haptic("ok");
          setDone(r.spaceId!);
          const sp = getSpace(r.spaceId!);
          toast(`Joined ${sp?.name}`, { icon: "Key" });
          setTimeout(() => router.push("/farmer"), 700);
          return;
        }}
      />
      {done && (
        <div className="alert ok mt4">
          <Ic n="CheckCircle" w="fill" s={22} />
          <div className="body-sm">You're in. Opening your dashboard…</div>
        </div>
      )}
    </AuthShell>
  );
}

export function Onboarding() {
  const router = useRouter();
  const { settings, setSettings } = useApp();
  const [step, setStep] = useState(0);
  const steps = ["Your preferences", "Join your space"];

  return (
    <div className="fill" style={{ overflowY: "auto" }}>
      <div className="dotpat" style={{ position: "fixed" }} />
      <div
        className="col"
        style={{ minHeight: "100%", maxWidth: 520, margin: "0 auto", padding: "70px 24px 28px", position: "relative" }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {steps.map((x, i) => (
            <i
              key={x}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "var(--primary)" : "var(--border)",
                transition: "background .4s",
              }}
            />
          ))}
        </div>

        <div className="marquee mb4" style={{ marginBottom: 24 }}>
          <div>
            {CROP_IDS.map((c) => (
              <CropIcon key={c} id={c} s={44} />
            ))}
          </div>
          <div aria-hidden="true">
            {CROP_IDS.map((c) => (
              <CropIcon key={c} id={c} s={44} />
            ))}
          </div>
        </div>

        {step === 0 ? (
          <div className="col g5">
            <div>
              <div className="display-md" style={{ marginBottom: 6 }}>
                Welcome to Herra
              </div>
              <div className="muted body-lg">
                Two quick choices, then you can draw your first field.
              </div>
            </div>
            <div>
              <div className="label">Measurement system</div>
              <div className="mt2">
                <Seg
                  block
                  opts={[
                    { k: "metric", l: "Metric" },
                    { k: "imperial", l: "Imperial" },
                  ]}
                  v={settings.units}
                  on={(k) =>
                    setSettings({
                      units: k,
                      temp: k === "metric" ? "C" : "F",
                      area: k === "metric" ? "ha" : "ac",
                    })
                  }
                />
              </div>
            </div>
            <div>
              <div className="label">Map style</div>
              <div className="mt2">
                <Seg
                  block
                  opts={[
                    { k: "sat", l: "Satellite" },
                    { k: "dark", l: "Dark" },
                    { k: "light", l: "Light" },
                  ]}
                  v={settings.mapStyle}
                  on={(k) => setSettings({ mapStyle: k })}
                />
              </div>
            </div>
            <Btn sz="lg" block onClick={() => setStep(1)}>
              {t("next")}
            </Btn>
          </div>
        ) : (
          <div className="col g5">
            <div>
              <div className="display-md" style={{ marginBottom: 6 }}>
                Join your space
              </div>
              <div className="muted body-lg">
                Your cooperative admin gives you an 8-character code.
              </div>
            </div>
            <CodeInput
              onDone={async (c) => {
                await sleep(300);
                const r = redeem(c);
                if (r.err) return r;
                haptic("ok");
                router.replace("/farmer");
                return;
              }}
            />
            <Btn cls="ghost" block onClick={() => router.replace("/farmer")}>
              Skip for now
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
