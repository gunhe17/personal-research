import { Suspense } from "react";
import SpacePage from "@/features/space/SpacePage";

export default function Page() {
  return (
    <Suspense>
      <SpacePage />
    </Suspense>
  );
}
