import { Suspense } from "react";
import { Explorer } from "@/components/explore/explorer";

export const metadata = { title: "Explorer · Anorix Cosmos" };

export default function Page() {
  return (
    <Suspense fallback={<div className="h-dvh bg-black" />}>
      <Explorer />
    </Suspense>
  );
}
