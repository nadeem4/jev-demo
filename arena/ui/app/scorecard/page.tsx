import type { Metadata } from "next";
import { Scorecard } from "@/components/scorecard";

export const metadata: Metadata = { title: "Scorecard | Decision Arena" };

export default function Page() {
  return <Scorecard />;
}
