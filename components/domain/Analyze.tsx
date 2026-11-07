"use client";

/* Analyze: the four-step capture flow (blueprint 7.1, 9.2).
   Steps: field, type, photo, details. Transcribed from the mockup's Analyze
   with the hash router replaced by the App Router and the in-memory store
   replaced by lib/store + lib/env/assess.

   The photo step strips location data by re-encoding through a canvas
   (blueprint F-08). No procedural imagery ships. */

import { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  Badge,
  Btn,
  Chip,
  Empty,
  MoistureSlider,
  haptic,
} from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { fA, fCoord, fdate, fTime } from "@/lib/units/format";
import { CROPS, CROP_IDS } from "@/lib/spec/crops";
import { liveMyFields, liveMySpaces } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import { runAssessment } from "@/lib/env/assess";
import { addEntry } from "@/lib/store";
import { processPhoto } from "@/lib/media";
import type { Entry, Field } from "@/lib/types";

type Kind = "recommend" | "checkup";

interface State {
  step: number;
  spaceId: string | null;
  fieldId: string | null;
  kind: Kind;
  photo: Entry["photo"] | null;
  moisture: number;
  crop: string | null;
  flash: boolean;
  skip: boolean;
  stream: MediaStream | null;
  cameraError: string | null;
}

const STEP_TITLE = ["Which field?", "What do you need?", "Photograph the field", "Quick details"];

export function Analyze() {
  const { user, space, settings, bp, toast } = useApp();
  const router = useRouter();
  const q = useSearchParams();
  useDb();
  const [busy, setBusy] = useState(false);

  const spaces = liveMySpaces(user.id);
  const preId = q.get("field");
  const preKind = q.get("kind") as Kind | null;
  const pre = preId ? liveMyFields(user.id).find((f) => f.id === preId) : undefined;

  const [st, setSt] = useState<State>(() => ({
    step: pre ? (preKind ? 2 : 1) : 0,
    spaceId: pre ? pre.spaceId : space?.id ?? null,
    fieldId: pre ? pre.id : null,
    kind: preKind || settings.defaultKind,
    photo: null,
    moisture: 3,
    crop: pre ? pre.current_crop : null,
    flash: false,
    skip: false,
    stream: null,
    cameraError: null,
  }));

  const up = (o: Partial<State>) => setSt((x) => ({ ...x, ...o }));
  const wide = bp !== "xs" && bp !== "sm";
  const F = st.fieldId ? liveMyFields(user.id).find((f) => f.id === st.fieldId) : undefined;
  const fl = liveMyFields(user.id, st.spaceId || undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const camGen = useRef(0);

  /* Start the camera once the photo step is on screen. Depending on `stream`
     too makes Retake work: clearing the photo re-renders the <video>, then
     this effect attaches the new stream. */
  useEffect(() => {
    if (st.step === 2 && !st.photo && !st.stream) {
      void startCamera();
    }
  }, [st.step, st.photo, st.stream]);

  /* Always release the camera when the flow unmounts. */
  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      up({ cameraError: "Camera not available on this device. Use gallery instead." });
      return;
    }
    try {
      stopCamera();
      /* If Retake or unmount supersedes this request while the permission
         prompt is open, drop the late stream instead of attaching it. */
      const gen = camGen.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (gen !== camGen.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      up({ stream, cameraError: null });
    } catch (err) {
      console.error("Camera error:", err);
      up({
        stream: null,
        cameraError: "Camera not available. Use gallery instead.",
      });
    }
  }

  function stopCamera() {
    camGen.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSt((x) => (x.stream ? { ...x, stream: null } : x));
  }

  if (!spaces.length) {
    return (
      <div className="focus">
        <div className="focus-top">
          <button className="iconbtn" onClick={() => router.push("/farmer")} aria-label="Close">
            <Ic n="X" s={24} />
          </button>
        </div>
        <Empty
          icon="Stack"
          title="Join a space first"
          sub="Spaces hold your fields. Ask your cooperative admin for an access code."
          action={t("joinspace")}
          onAction={() => router.push("/farmer/spaces")}
        />
      </div>
    );
  }

  const can = [!!F, true, !!st.photo || st.skip, st.kind === "recommend" || !!st.crop][st.step];
  const last = st.step === 3;

  /* The shutter - grab the current video frame, downscale it, and re-encode
     as JPEG so EXIF (including GPS) is dropped. */
  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    haptic("ok");
    up({ flash: true });

    try {
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const k = Math.min(1, 1280 / Math.max(vw, vh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(vw * k));
      canvas.height = Math.max(1, Math.round(vh * k));

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

      setTimeout(() => {
        up({
          flash: false,
          photo: { url: dataUrl },
          skip: false,
        });
        stopCamera();
      }, 180);
    } catch (err) {
      console.error("Capture error:", err);
      up({
        flash: false,
        cameraError: "Could not capture the frame. Try the gallery instead.",
      });
    }
  };

  /* Gallery upload. Downsized and re-encoded as JPEG, which drops EXIF. */
  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;

    try {
      const processed = await processPhoto(f);
      const reader = new FileReader();

      reader.onload = () => {
        up({
          photo: { url: reader.result as string },
          skip: false,
        });
        haptic("ok");
        stopCamera();
      };

      reader.readAsDataURL(processed);
    } catch (err) {
      console.error("File processing error:", err);
    }
  };

  const run = async () => {
    if (!F || busy) return;
    setBusy(true);
    try {
      const photo: Entry["photo"] = st.photo ?? { url: "" };
      const entry = await runAssessment({
        field: F,
        mode: st.kind,
        moisture: st.moisture,
        currentCrop: st.kind === "checkup" ? st.crop || F.current_crop : undefined,
        photo,
      });
      const saved = await addEntry(entry);
      router.replace(`/farmer/analyze/processing/${saved.id}`);
    } catch (err) {
      console.error("Assessment failed:", err);
      setBusy(false);
      toast("Analysis failed. Please try again.", { icon: "Warning", tone: "heat" });
    }
  };

  const next = () => {
    if (last) run();
    else {
      haptic("tick");
      up({
        step: st.step + 1,
        ...(st.step === 0 && st.kind === "checkup" && !st.crop ? { crop: F?.current_crop ?? null } : {}),
      });
    }
  };

  return (
    <div className="focus">
      <div className="prog">
        <i style={{ width: `${((st.step + 1) / 4) * 100}%` }} />
      </div>

      <div className="focus-top">
        <button className="iconbtn" aria-label="Close" onClick={() => router.push("/farmer")}>
          <Ic n="X" s={24} />
        </button>
        <span className="caption">Step {st.step + 1} of 4</span>
        <span style={{ width: 44 }} />
      </div>

      <div className={cx("focus-body", st.step === 2 && "nos")}>
        <div className="focus-in" key={st.step}>
          <div className={wide ? "display-lg" : "display-md"} style={{ margin: "8px 0 20px" }}>
            {STEP_TITLE[st.step]}
          </div>

          {st.step === 0 && (
            <div className="col g4">
              {spaces.length > 1 && (
                <div className="tag-row">
                  {spaces.map((sp) => (
                    <Chip
                      key={sp.id}
                      on={sp.id === st.spaceId}
                      icon="Stack"
                      onClick={() => up({ spaceId: sp.id, fieldId: null })}
                    >
                      {sp.name}
                    </Chip>
                  ))}
                </div>
              )}
              <div className="col g3">
                {fl.map((f) => (
                  <button
                    key={f.id}
                    className={cx("card hov", st.fieldId === f.id && "sel")}
                    style={{ display: "flex", alignItems: "stretch", textAlign: "left" }}
                    onClick={() => {
                      haptic("tick");
                      up({ fieldId: f.id, crop: f.current_crop });
                    }}
                  >
                    <div
                      style={{
                        width: 96,
                        flexShrink: 0,
                        background: `url(${f.thumb}) center/cover`,
                      }}
                    />
                    <div className="grow" style={{ padding: "14px 16px" }}>
                      <div className="title-md">{f.name}</div>
                      <div className="body-sm muted">
                        {f.place.municipality}, {f.place.province}
                      </div>
                      <div className="row g2 mt2">
                        <Badge>{fA(f.area, settings)}</Badge>
                        {f.current_crop && <Badge tone="growth">{CROPS[f.current_crop].name}</Badge>}
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <span
                        className="radio"
                        style={{
                          margin: 0,
                          borderColor: st.fieldId === f.id ? "var(--primary)" : "var(--divider)",
                          background: st.fieldId === f.id ? "var(--primary)" : "transparent",
                        }}
                      />
                    </div>
                  </button>
                ))}
                <button
                  className="card hov"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 18,
                    borderStyle: "dashed",
                  }}
                  onClick={() => router.push(`/farmer/fields/new?return=analyze&space=${st.spaceId ?? ""}`)}
                >
                  <span
                    className="cropico"
                    style={{ width: 48, height: 48, background: "var(--accent-tint)", color: "var(--primary)" }}
                  >
                    <Ic n="PenNib" w="duotone" s={26} />
                  </span>
                  <div className="grow">
                    <div className="title-sm">{t("newfield")}</div>
                    <div className="body-sm muted">
                      Draw it on the map — place name fills in automatically
                    </div>
                  </div>
                  <Ic n="Plus" s={20} />
                </button>
              </div>
            </div>
          )}

          {st.step === 1 && (
            <div className="col g3">
              {(
                [
                  [
                    "recommend",
                    "Sparkle",
                    "What should I plant here?",
                    "Top-5 crops ranked by suitability, with the factors behind each.",
                  ],
                  [
                    "checkup",
                    "Heartbeat",
                    "How is my current crop doing?",
                    "Health Index, four drivers and ranked tips.",
                  ],
                ] as [Kind, string, string, string][]
              ).map(([k, ic, tt, sub]) => (
                <button
                  key={k}
                  className={cx("bigchoice", st.kind === k && "on")}
                  onClick={() => {
                    haptic("tick");
                    up({ kind: k, crop: k === "checkup" ? st.crop || F?.current_crop || null : st.crop });
                  }}
                >
                  <span className="bi">
                    <Ic n={ic} w="fill" s={30} />
                  </span>
                  <div className="grow">
                    <div className="title-md">{t(k)}</div>
                    <div className="title-sm" style={{ marginTop: 2 }}>
                      {tt}
                    </div>
                    <div className="body-sm muted mt1">{sub}</div>
                  </div>
                  <span className="radio" />
                </button>
              ))}
            </div>
          )}

          {st.step === 2 && (
            <div className="photo-step">
              <div className="cam-wrap">
                <div className="cam">
                  {st.photo ? (
                    // Show captured photo
                    <div
                      className="feed"
                      style={{
                        backgroundImage: `url("${st.photo.url}")`,
                        animationPlayState: "paused",
                      }}
                    />
                  ) : (
                    // Show live video feed or error
                    <>
                      {st.cameraError ? (
                        <div 
                          className="feed"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--surface-dim)",
                            color: "var(--muted)",
                          }}
                        >
                          <div style={{ textAlign: "center", padding: 20 }}>
                            <Ic n="CameraSlash" s={48} />
                            <div style={{ marginTop: 12 }}>{st.cameraError}</div>
                          </div>
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                    </>
                  )}
                  <div className="grid3" />
                  <div className={cx("flash", st.flash && "go")} />
                  <div className="abs row between" style={{ top: 12, left: 12, right: 12, color: "#fff", gap: 8 }}>
                    <Badge cls="glassb" icon="MapPin">
                      {F?.name}
                    </Badge>
                    <span className="mono" style={{ fontSize: 10.5 }}>
                      {F ? fCoord(F.centroid[0], F.centroid[1]) : ""}
                    </span>
                  </div>
                  {st.photo && (
                    <div className="abs" style={{ bottom: 12, left: 12, right: 12 }}>
                      <Badge tone="growth" lg icon="ShieldCheck">
                        Location data removed
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="photo-ctl">
                <button
                  className="iconbtn bordered"
                  aria-label="Gallery"
                  onClick={() => fileRef.current?.click()}
                >
                  <Ic n="Image" s={22} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={onFile}
                />
                <button className="shutter" aria-label="Capture" onClick={shoot}>
                  <i />
                </button>
                <button
                  className="iconbtn bordered"
                  aria-label="Retake"
                  disabled={!st.photo}
                  onClick={() => up({ photo: null })}
                >
                  <Ic n="ArrowCounterClockwise" s={22} />
                </button>
              </div>

              <button
                className="photo-skip body-sm tc muted"
                style={{ fontWeight: 650 }}
                onClick={() => {
                  up({ skip: true, photo: null });
                  setSt((x) => ({ ...x, step: 3 }));
                }}
              >
                Skip photo — you can still run the analysis
              </button>
            </div>
          )}

          {st.step === 3 && F && (
            <div className="col g5">
              <div className="tag-row">
                <span className="autochip" data-tip="Auto-filled from your device clock">
                  <Ic n="CalendarCheck" s={18} w="fill" c="var(--sky)" />
                  {fdate(Date.now(), { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                  {fTime(Date.now())}
                  <Ic n="Lock" s={13} cls="lock" />
                </span>
                <span className="autochip" data-tip="From field centroid · reverse-geocoded by Photon">
                  <Ic n="MapPin" s={18} w="fill" c="var(--soil)" />
                  {F.place.municipality}, {F.place.province}
                  <Ic n="Lock" s={13} cls="lock" />
                </span>
              </div>

              <div>
                <div className="label">{t("moisture")}</div>
                <MoistureSlider v={st.moisture} on={(v) => up({ moisture: v })} />
              </div>

              {st.kind === "checkup" && (
                <div>
                  <div className="label">{t("crop")}</div>
                  <div className="mt2">
                    <CropPicker v={st.crop} on={(c) => up({ crop: c })} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="focus-foot">
        {st.step > 0 && (
          <Btn cls="secondary" sz="lg" onClick={() => up({ step: st.step - 1 })}>
            {t("back")}
          </Btn>
        )}
        <Btn
          cls="primary"
          sz="lg"
          block
          disabled={!can || (last && busy)}
          shimmer={last && !busy}
          icon={last ? "Sparkle" : undefined}
          onClick={next}
        >
          {last ? (busy ? "Running analysis…" : t("run")) : t("next")}
        </Btn>
      </div>
    </div>
  );
}

function CropPicker({ v, on, ids = CROP_IDS }: { v: string | null; on: (id: string) => void; ids?: string[] }) {
  return (
    <div className="cropgrid" role="radiogroup">
      {ids.map((id) => (
        <button
          key={id}
          className={cx("cropcell", v === id && "on")}
          role="radio"
          aria-checked={v === id}
          onClick={() => {
            haptic("tick");
            on(id);
          }}
        >
          <CropIcon id={id} s={44} />
          <span>{CROPS[id].name}</span>
        </button>
      ))}
    </div>
  );
}


