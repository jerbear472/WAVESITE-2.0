import type { Metadata } from "next";
import { PulseConsole } from "@/components/PulseConsole";

export const metadata: Metadata = {
  title: "Culture Pulse — WaveSight",
  description:
    "The live discovery loop: Claude scans social media and fashion culture, scores every trend, and maps what is truly harmonizing.",
};

export default function PulsePage() {
  return <PulseConsole />;
}
