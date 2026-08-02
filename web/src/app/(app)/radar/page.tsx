import { redirect } from "next/navigation";

// Radar grew up into the Market — same data, explicit trust hierarchy.
export default function RadarRedirect() {
  redirect("/market");
}
