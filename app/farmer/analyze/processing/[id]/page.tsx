import { Processing } from "@/components/domain/Processing";

export default async function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Processing id={id} />;
}
