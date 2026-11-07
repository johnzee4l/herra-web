import { FieldDetail } from "@/components/domain/FieldDetail";

export default async function FieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FieldDetail id={id} />;
}
