import type { ReactElement } from "react";

const PATHS = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
  courses: <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  file: <path d="M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 17h5" />,
  grade: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  award: <path d="M12 3 21 12l-9 9-9-9zM12 8l4 4-4 4-4-4z" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />,
  list: <path d="M5 7h14M5 12h14M5 17h14" />,
  template: <path d="M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z" />,
  logout: (
    <>
      <path d="M15 17v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" />
      <path d="M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <path d="M9.36 5.36A10.6 10.6 0 0 1 12 5c6 0 9.5 5.5 9.5 7 0 .6-.5 1.9-1.6 3.3M6.6 6.6C4 8.3 2.5 10.9 2.5 12c0 1.5 3.5 7 9.5 7 1.1 0 2.1-.2 3-.5" />
    </>
  ),
} satisfies Record<string, ReactElement>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className, size = 22 }: { name: IconName; className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
