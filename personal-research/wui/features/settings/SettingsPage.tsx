import type { ReactNode } from "react";

export default function SettingsPage({ title, status, children }: { title: string; status?: ReactNode; children: ReactNode }) {
  const heading = <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">{title}</h3>;
  return (
    <div className="space-y-6">
      {status ? (
        <div>
          {heading}
          {status}
        </div>
      ) : (
        heading
      )}
      {children}
    </div>
  );
}
