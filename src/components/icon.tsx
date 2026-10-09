import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16",
  route:
    "M5 5h10a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h10 M3 3l4 4 M7 3 3 7 M17 19l2 2 2-2",
  calendar: "M3 5h18v16H3z M7 2v6 M17 2v6 M3 11h18",
  box: "m12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10 M7 4l10 6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  car: "m5 5-3 8v6h3v-3h14v3h3v-6l-3-8z M2 12h20 M6 13v2 M18 13v2",
  file: "M14 2H4v20h16V8z M14 2v6h6 M8 12h8 M8 16h6",
  card: "M2 4h20v16H2z M2 9h20 M6 15h4",
  wallet: "M20 8V4H3v16h19V8H3 M17 12h5v4h-5z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  check: "m5 12 4 4L19 6 M21 12a9 9 0 1 1-6-8",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  pulse: "M2 12h5l3-8 4 16 3-8h5",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  filter: "M3 4h18l-7 8v7l-4 2v-9z",
  clock: "M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  alert: "m12 3 10 18H2z M12 9v5 M12 17v1",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3",
  close: "M6 6l12 12 M6 18 18 6",
  chevron: "m6 9 6 6 6-6",
  menu: "M3 6h18 M3 12h18 M3 18h18",
};
export function Icon({
  name,
  size = 19,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] ?? paths.file} />
    </svg>
  );
}
