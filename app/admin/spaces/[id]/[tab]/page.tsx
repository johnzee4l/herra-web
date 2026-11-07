import { SpaceHub } from "@/components/admin/Overview";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  return <SpaceHub id={id} tab={tab} />;
}
