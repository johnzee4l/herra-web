import { Suspense } from "react";
import { FieldCapture } from "@/components/domain/FieldCapture";

export default function NewFieldPage() {
  return (
    <Suspense fallback={null}>
      <FieldCapture />
    </Suspense>
  );
}
