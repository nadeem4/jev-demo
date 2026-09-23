import type { Metadata } from "next";
import { LearnPage } from "@/components/learn-page";
import { ModelPage } from "@/components/model-page";
import { JEV } from "@/lib/learn";

export const metadata: Metadata = { title: "Jev | Decision Arena" };

export default function Page() {
  return (
    <LearnPage title={JEV.name} intro={JEV.standfirst} checked="23 September 2026">
      <ModelPage model={JEV} />
    </LearnPage>
  );
}
