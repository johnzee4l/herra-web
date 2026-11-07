import { Suspense } from "react";
import { Outcomes } from "@/components/domain/Tools";

export default function OutcomesPage() {
  return (
    <Suspense fallback={null}>
      <Outcomes />
    </Suspense>
  );
}
