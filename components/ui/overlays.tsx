"use client";

/* Overlays and toasts. R11: overlays render inside the app root, never in a
   portal on <body>. The app root is .app (position:relative; overflow:hidden),
   so .overlay { position:absolute; inset:0 } fills it. */

import type { ReactNode } from "react";
import { Ic } from "@/components/ui/Ic";
import { Btn } from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts">
      {toasts.map((x) => (
        <div key={x.id} className={cx("toast", x.out && "out")}>
          <Ic n={x.icon} w="fill" s={22} c={`var(--${x.tone})`} />
          <span>{x.msg}</span>
          {x.action && (
            <button
              className="tact"
              onClick={() => {
                x.onAction?.();
                dismissToast(x.id);
              }}
            >
              {x.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Overlays() {
  const { overlays, closeOverlay } = useApp();

  return (
    <>
      {overlays.map((o) => {
        const close = () => closeOverlay(o.id);
        if (o.kind === "sheet") {
          return (
            <div key={o.id} className={cx("overlay", o.closing && "closing")}>
              <div className="scrim" onClick={close} />
              <div className={cx("sheet", o.drawer && "drawer", o.wide && "wide", o.closing && "closing")}>
                <div className="grab" />
                {o.title && (
                  <div className="sheet-h">
                    <div className="title-md">{o.title}</div>
                    <button className="iconbtn sm" onClick={close} aria-label="Close">
                      <Ic n="X" s={20} />
                    </button>
                  </div>
                )}
                <div className="sheet-b">{o.render(close)}</div>
              </div>
            </div>
          );
        }
        return (
          <div key={o.id} className={cx("overlay", o.closing && "closing")}>
            <div className="scrim" onClick={close} />
            <div className="dialog">{o.render(close)}</div>
          </div>
        );
      })}
    </>
  );
}

/* Confirm dialog, matching the mockup's confirmDlg contract. */
export function ConfirmBody({
  title,
  body,
  confirm = "Confirm",
  tone = "destructive",
  icon = "Warning",
  onOk,
  close,
}: {
  title: string;
  body: string;
  confirm?: string;
  tone?: "destructive" | "primary";
  icon?: string;
  onOk?: () => void;
  close: () => void;
}) {
  return (
    <div className="col g3">
      <Ic
        n={icon}
        w="duotone"
        s={40}
        c={tone === "destructive" ? "var(--risk)" : "var(--primary)"}
      />
      <div className="title-md">{title}</div>
      <div className="muted">{body}</div>
      <div className="row g2 end mt4">
        <Btn cls="secondary" onClick={close}>
          {t("cancel")}
        </Btn>
        <Btn
          cls={tone === "destructive" ? "destructive" : "primary"}
          onClick={() => {
            close();
            onOk?.();
          }}
        >
          {confirm}
        </Btn>
      </div>
    </div>
  );
}

export function useConfirm() {
  const { openDialog } = useApp();
  return (opts: {
    title: string;
    body: string;
    confirm?: string;
    tone?: "destructive" | "primary";
    icon?: string;
    onOk?: () => void;
  }) =>
    openDialog({
      render: (close) => <ConfirmBody {...opts} close={close} />,
    });
}
