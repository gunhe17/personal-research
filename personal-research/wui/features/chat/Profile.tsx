"use client";

import Icon from "@/ui/Icon";
import Logo from "@/ui/Logo";

export default function Profile({ provider, label }: { provider: string | null; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[12px] text-slate-500">
      <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 text-slate-800">
        {provider ? <Logo provider={provider} className="h-3 w-3" /> : <Icon name="collected" className="h-3 w-3" />}
      </span>
      <span>{label}</span>
    </div>
  );
}
