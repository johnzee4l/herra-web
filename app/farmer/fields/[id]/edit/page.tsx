import { Suspense } from "react";
import { FieldCapture } from "@/components/domain/FieldCapture";

export default async function EditFieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <FieldCapture editId={id} />
    </Suspense>
  );
}
