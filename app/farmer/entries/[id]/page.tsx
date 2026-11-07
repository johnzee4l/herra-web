import { EntryDetail } from "@/components/domain/EntryDetail";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryDetail id={id} />;
}
