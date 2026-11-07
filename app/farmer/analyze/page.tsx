import { Suspense } from "react";
import { Analyze } from "@/components/domain/Analyze";

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <Analyze />
    </Suspense>
  );
}
