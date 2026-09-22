import type { Metadata } from "next";
import { Results } from "@/components/results";

export const metadata: Metadata = { title: "Results | Decision Arena" };

export default function Page() {
  return <Results />;
}
