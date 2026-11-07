import { ModelDetail } from "@/components/admin/Models";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModelDetail id={id} />;
}
