import { AdminPage } from "@/components/shell/AdminShell";
import { Empty } from "@/components/ui/primitives";

/* Space creation is a three-step map flow (draw, details, access code). The
   map drawing surface is the same one FieldCapture uses; wiring it here is the
   remaining step, so this route states that plainly instead of faking it. */
export default function Page() {
  return (
    <AdminPage title="New space" sub="Draw a boundary, name it, then issue an access code.">
      <Empty
        icon="PenNib"
        title="Boundary drawing"
        sub="This step reuses the field-drawing surface from field capture. Create the space from the map flow to issue its first access code."
      />
    </AdminPage>
  );
}
