import Link from "next/link";
import IconButton from "@/ui/IconButton";

export default function Header({ sidebar, settings, onSidebar, onSettings }: { sidebar: boolean; settings: boolean; onSidebar: () => void; onSettings: () => void }) {
  return (
    <header className="relative z-40 flex h-11 shrink-0 items-center border-b border-slate-100 bg-white/90 px-4 backdrop-blur">
      <IconButton icon="sidebar" label="Toggle sidebar" active={sidebar} onClick={onSidebar} />
      <span className="flex-1" />
      <Link href="/" aria-label="Home" className="absolute left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[15px] font-semibold tracking-tight text-slate-900 transition duration-150 hover:text-apple-link">
        Personal Research
      </Link>
      <IconButton icon="gear" label="Settings" active={settings} onClick={onSettings} />
    </header>
  );
}
