// VEXA mark: a "V" converging on a point in time.
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="logo-mark">
      <rect width="32" height="32" rx="9" fill="var(--plum)" />
      <path d="M8.5 10 16 22.5 23.5 10" fill="none" stroke="#E0CBB9" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="10" r="2.1" fill="#D8A694" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">VEXA</span>
    </span>
  );
}
