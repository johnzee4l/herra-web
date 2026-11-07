import { Suspense } from "react";
import { JoinPage } from "@/components/domain/Auth";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Suspense fallback={null}>
      <JoinPage code={code} />
    </Suspense>
  );
}
