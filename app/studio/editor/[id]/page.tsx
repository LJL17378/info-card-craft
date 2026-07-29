import { CardEditor } from "@/components/card-editor";

export const metadata = { title: "编辑卡片" };

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CardEditor cardId={id} />;
}
