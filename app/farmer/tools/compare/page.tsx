import { Suspense } from "react";
import { Compare } from "@/components/domain/Tools";

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <Compare />
    </Suspense>
  );
}
