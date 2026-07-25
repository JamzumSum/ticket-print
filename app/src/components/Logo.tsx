interface LogoProps {
  size?: number
  className?: string
}

// 方向一：「票轨」— 几何车票 + 轨道线，基础设施感
export function LogoTicketTrack({ size = 36, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-label="火车票排版打印"
    >
      <rect x="2" y="7" width="32" height="22" rx="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="8" y="11" width="20" height="14" rx="1.5" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
      <circle cx="18" cy="18" r="4" fill="currentColor" opacity="0.2" />
      <circle cx="18" cy="18" r="1.5" fill="currentColor" />
      <line x1="8" y1="29" x2="5" y2="33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28" y1="29" x2="31" y2="33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="2" y1="7" x2="0" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="34" y1="7" x2="36" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

// 方向二：「格印」— 2×2 排版网格 + 纸张，工具感
export function LogoGridPrint({ size = 36, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-label="火车票排版打印"
    >
      <rect x="3" y="3" width="30" height="30" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="3" y1="18" x2="33" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1="18" y1="3" x2="18" y2="33" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <rect x="6" y="6" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.7" fill="none" />
      <rect x="20" y="6" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.7" fill="none" />
      <rect x="6" y="20" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.7" fill="none" />
      <rect x="20" y="20" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// 方向三：「码程」— 抽象条码 + 列车轮廓，数据感
export function LogoCodeJourney({ size = 36, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-label="火车票排版打印"
    >
      <rect x="2" y="4" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="5" y="8" width="26" height="20" rx="2" fill="currentColor" opacity="0.06" />
      <rect x="7" y="12" width="3" height="12" fill="currentColor" opacity="0.5" />
      <rect x="12" y="14" width="2" height="10" fill="currentColor" opacity="0.35" />
      <rect x="16" y="10" width="4" height="14" fill="currentColor" opacity="0.5" />
      <rect x="22" y="16" width="2" height="8" fill="currentColor" opacity="0.35" />
      <rect x="26" y="11" width="3" height="13" fill="currentColor" opacity="0.5" />
      <path d="M10 28 L14 24 L18 28 L22 24 L26 28" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
    </svg>
  )
}
