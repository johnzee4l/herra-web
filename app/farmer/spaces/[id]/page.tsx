import { SpaceView } from "@/components/domain/Spaces";

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpaceView id={id} />;
}
