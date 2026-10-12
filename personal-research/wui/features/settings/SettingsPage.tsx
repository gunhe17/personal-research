import type { ReactNode } from "react";

export const field = "min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] text-slate-900 focus:border-apple focus:bg-white focus:outline-none";

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
