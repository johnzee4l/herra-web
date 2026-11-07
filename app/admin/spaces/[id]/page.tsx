import { SpaceHub } from "@/components/admin/Overview";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpaceHub id={id} />;
}
