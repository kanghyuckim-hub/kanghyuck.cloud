export default function StrategyJourneyArt() {
  return (
    <svg
      viewBox="0 0 800 450"
      role="img"
      aria-label="산길을 오르는 여정과 성장 그래프로 표현한 경영전략 이미지"
      className="h-auto w-full max-w-[800px] rounded-lg shadow-md"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#eef2f7" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id="peakFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="peakNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      <rect width="800" height="450" fill="url(#sky)" />

      {/* 떠오르는 해 */}
      <circle cx="590" cy="140" r="52" fill="url(#sun)" opacity="0.9" />
      {[0, 30, 60, 90, 120, 150].map((deg) => (
        <line
          key={deg}
          x1="590"
          y1="140"
          x2={590 + 90 * Math.cos((deg * Math.PI) / 180)}
          y2={140 + 90 * Math.sin((deg * Math.PI) / 180)}
          stroke="#fbbf24"
          strokeWidth="1.5"
          opacity="0.35"
        />
      ))}

      {/* 은은한 성장 그래프 라인 (경영전략의 상승 곡선) */}
      <polyline
        points="60,330 220,300 340,340 470,230 610,260 740,150"
        fill="none"
        stroke="#2563eb"
        strokeWidth="2.5"
        opacity="0.28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [60, 330],
        [220, 300],
        [340, 340],
        [470, 230],
        [610, 260],
        [740, 150],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#2563eb" opacity="0.3" />
      ))}

      {/* 먼 산 능선 */}
      <path
        d="M0,300 L120,220 L230,280 L360,190 L500,270 L620,210 L800,300 L800,450 L0,450 Z"
        fill="url(#peakFar)"
        opacity="0.55"
      />

      {/* 가까운 산(주봉) */}
      <path
        d="M0,450 L140,260 L260,340 L400,150 L540,330 L680,240 L800,450 Z"
        fill="url(#peakNear)"
      />

      {/* 정상까지 이어지는 오솔길 */}
      <path
        d="M120,450 C220,380 280,330 330,270 C365,225 385,190 400,155"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="3"
        strokeDasharray="2 12"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* 정상의 깃발: 목표 지점 */}
      <line x1="400" y1="155" x2="400" y2="118" stroke="#f8fafc" strokeWidth="2.5" />
      <path d="M400,118 L432,127 L400,138 Z" fill="#f59e0b" />
      <circle cx="400" cy="155" r="4" fill="#f8fafc" />
    </svg>
  );
}
