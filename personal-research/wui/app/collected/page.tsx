import { Suspense } from "react";
import Workbench from "@/features/workbench/Workbench";

export default function Page() {
  return (
    <Suspense>
      <Workbench />
    </Suspense>
  );
}
