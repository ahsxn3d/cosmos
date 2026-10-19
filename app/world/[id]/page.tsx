import { notFound, redirect } from "next/navigation";
import { BODY_ORDER } from "@/lib/bodies";

export function generateStaticParams() {
  return BODY_ORDER.map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(BODY_ORDER as readonly string[]).includes(id)) notFound();
  redirect(`/explore?body=${id}`);
}
