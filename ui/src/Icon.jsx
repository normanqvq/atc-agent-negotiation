// tiny inline svg icons, one stroke style. use: <Icon name="check" />
const PATHS = {
  check: <path d="M4 10.5l4 4 8-9" />,
  x: <path d="M5 5l10 10M15 5L5 15" />,
  left: <path d="M12.5 4.5L7 10l5.5 5.5" />,
  right: <path d="M7.5 4.5L13 10l-5.5 5.5" />,
  arrow: <path d="M4 10h12M11 5l5 5-5 5" />,
  // half-filled circle = light / dark toggle
  theme: <><circle cx="10" cy="10" r="6.5" /><path d="M10 3.5v13a6.5 6.5 0 0 0 0-13z" fill="currentColor" /></>,
}

export default function Icon({ name, label }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>
      {PATHS[name]}
    </svg>
  )
}
