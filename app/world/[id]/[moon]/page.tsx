import { notFound, redirect } from "next/navigation";
import { MOONS } from "@/lib/moons";

export function generateStaticParams() {
  return MOONS.map((m) => ({ id: m.parent, moon: m.id }));
}

export default async function Page({ params }: { params: Promise<{ moon: string }> }) {
  const { moon } = await params;
  if (!MOONS.some((m) => m.id === moon)) notFound();
  redirect(`/explore?moon=${moon}`);
}
