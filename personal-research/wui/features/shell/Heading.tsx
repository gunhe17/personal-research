import IconButton from "@/ui/IconButton";
import TreeRow from "@/ui/TreeRow";

export default function Heading({ label, icon, onToggle, onCollapse, collapseLabel }: { label: string; icon: string; onToggle: () => void; onCollapse?: () => void; collapseLabel: string }) {
  return (
    <div className="relative">
      <TreeRow variant="nav" label={label} icon={icon} onClick={onToggle} />
      {onCollapse && <IconButton icon="collapse" size="sm" label={collapseLabel} onClick={onCollapse} className="absolute top-1/2 right-0 -translate-y-1/2" />}
    </div>
  );
}
