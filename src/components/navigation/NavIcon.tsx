import type { NavIconName } from '@/lib/navigation/app-nav'
import type { ReactNode } from 'react'

const paths: Record<NavIconName, ReactNode> = {
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
    />
  ),
  pentagrama: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3 14.5 9.5 21 10l-5 4.2L17.5 21 12 17.3 6.5 21 8 14.2 3 10l6.5-.5L12 3Z"
    />
  ),
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />,
  building: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V8l8-4 8 4v12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v-6h6v6M9 10h.01M15 10h.01" />
    </>
  ),
  users: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 19v-1a3 3 0 0 0-2-2.8M15 4.2a3 3 0 0 1 0 5.6" />
    </>
  ),
  nr01: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M7 4h10l2 16H5L7 4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V2h6v2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
      />
    </>
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3 19 7v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4Z"
    />
  ),
  credit: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M3 10h18" />
    </>
  ),
}

interface Props {
  name: NavIconName
  className?: string
}

export function NavIcon({ name, className = 'h-[18px] w-[18px]' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      {paths[name]}
    </svg>
  )
}
