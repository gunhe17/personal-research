import IconButton from "@/ui/IconButton";

export default function Header({ sidebar, settings, onSidebar, onSettings }: { sidebar: boolean; settings: boolean; onSidebar: () => void; onSettings: () => void }) {
  return (
    <header className="relative z-40 flex h-11 shrink-0 items-center border-b border-slate-100 bg-white/90 px-4 backdrop-blur">
      <IconButton icon="sidebar" label="Toggle sidebar" active={sidebar} onClick={onSidebar} />
      <span className="flex-1" />
      <IconButton icon="gear" label="Settings" active={settings} onClick={onSettings} />
    </header>
  );
}
