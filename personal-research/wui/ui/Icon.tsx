import { cx } from "@/lib/cx";

const PATHS: Record<string, string> = {
  home: '<path d="M3 11.5L12 3l9 8.5"/><path d="M5.5 10v10h13V10"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  space: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  gear: '<g transform="translate(12 12) scale(0.8182) translate(-12 -12)" stroke-width="1.833"><circle cx="12" cy="12" r="3.25"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>',
  chip: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9z"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  download: '<path d="M12 3v12.5"/><path d="M6.5 10.5L12 16l5.5-5.5"/><path d="M3 21h18"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  up: '<path d="M12 20V4"/><path d="M5 11l7-7 7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H6.5L3 21V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/>',
  docs: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  papers: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M8 9v5c0 1.5 2 3 4 3s4-1.5 4-3V9"/>',
  repos: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  videos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
  lesson: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5zM12 4h6.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H12"/>',
  note: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  log: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  conversations: '<path d="M16 10a6 6 0 0 1-6 6H6l-3 2.5V10a6 6 0 0 1 6-6h1a6 6 0 0 1 6 6z"/><path d="M18.5 8.5A5 5 0 0 1 21 13v6l-2.5-2H15a5 5 0 0 1-3.6-1.5"/>',
  collected: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>',
  materials: '<path d="M4 19.5V5.5A1.5 1.5 0 0 1 5.5 4H18v13H5.5A1.5 1.5 0 0 0 4 18.5 1.5 1.5 0 0 0 5.5 20H18"/><path d="M8 8h6M8 11h4"/>',
};

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "h-3.5 w-3.5", width = 1.5 }: { name: string; className?: string; width?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("shrink-0", className)}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] || PATHS.docs }}
    />
  );
}
