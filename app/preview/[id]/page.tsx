import { HostedPreview } from "@/components/hosted-preview";

export const metadata = { title: "卡片预览" };

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostedPreview cardId={id} />;
}
