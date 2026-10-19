export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <circle cx="13" cy="13" r="9.5" stroke="#F3F0EA" strokeOpacity="0.9" strokeWidth="1.3" />
        <ellipse
          cx="13"
          cy="13"
          rx="12"
          ry="4.2"
          transform="rotate(-28 13 13)"
          stroke="#B8A8F8"
          strokeWidth="1.2"
        />
        <circle cx="22.4" cy="8.2" r="1.9" fill="#85D6B1" />
      </svg>
      <span className="font-serif text-[1.65rem] leading-none tracking-tight text-foreground">
        Monee
      </span>
    </span>
  )
}
