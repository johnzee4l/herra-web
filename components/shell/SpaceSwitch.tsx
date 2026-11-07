"use client";

import { Ic } from "@/components/ui/Ic";
import { Btn } from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { myFields, mySpaces, membersOf } from "@/lib/fixtures";

export function SpaceSwitch({ close }: { close: () => void }) {
  const { user, spaceId, setSpaceId, toast } = useApp();
  const spaces = mySpaces(user.id);

  return (
    <div className="col g1">
      {spaces.map((sp) => (
        <button
          key={sp.id}
          className={cx("rowitem hv", sp.id === spaceId && "sel")}
          onClick={() => {
            setSpaceId(sp.id);
            close();
          }}
        >
          <span
            className="cropico"
            style={{ width: 44, height: 44, background: "var(--accent-tint)", color: "var(--primary)" }}
          >
            <Ic n="Stack" w="duotone" s={24} />
          </span>
          <div className="grow">
            <div className="title-sm">{sp.name}</div>
            <div className="body-sm muted">
              {sp.place.municipality} · {myFields(user.id, sp.id).length} fields ·{" "}
              {membersOf(sp.id).length} farmers
            </div>
          </div>
          {sp.id === spaceId && <Ic n="CheckCircle" w="fill" s={22} c="var(--primary)" />}
        </button>
      ))}
      <div className="mt4 col g2">
        <Btn
          cls="secondary"
          icon="Key"
          block
          onClick={() => {
            close();
            toast("Access codes are issued by your space admin", { icon: "Key", tone: "sky" });
          }}
        >
          {t("joinspace")}
        </Btn>
      </div>
    </div>
  );
}
