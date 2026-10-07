import Icon from "./Icon";

export default function SendButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Send"
      title="Send (Enter)"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full bg-apple text-white transition hover:bg-apple-hover disabled:opacity-40"
    >
      <Icon name="up" width={2} className="h-4 w-4" />
    </button>
  );
}
