export default function StrategyJourneyArt() {
  return (
    <svg
      viewBox="0 0 800 450"
      role="img"
      aria-label="산길을 오르는 여정과 성장 곡선으로 표현한 경영전략 이미지"
      className="h-auto w-full max-w-[800px] rounded-lg shadow-md"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2f8" />
          <stop offset="55%" stopColor="#e6ebf3" />
          <stop offset="100%" stopColor="#dfe5ee" />
        </linearGradient>

        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7e0" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#fbd88a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbd88a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sunCore" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#fff3cf" />
          <stop offset="100%" stopColor="#e9a94b" />
        </radialGradient>

        <linearGradient id="ridgeFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3cddb" />
          <stop offset="100%" stopColor="#aab6c8" />
        </linearGradient>
        <linearGradient id="ridgeMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b98ac" />
          <stop offset="100%" stopColor="#697386" />
        </linearGradient>
        <linearGradient id="ridgeNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f4a5f" />
          <stop offset="100%" stopColor="#151b2c" />
        </linearGradient>
        <linearGradient id="facet" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="growthStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6d8fd6" />
          <stop offset="100%" stopColor="#e9b04a" />
        </linearGradient>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d8fd6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#6d8fd6" stopOpacity="0" />
        </linearGradient>

        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect width="800" height="450" fill="url(#sky)" />

      {/* 은은하게 번지는 태양광 */}
      <circle cx="586" cy="128" r="150" fill="url(#sunGlow)" filter="url(#softBlur)" />
      <circle cx="586" cy="128" r="34" fill="url(#sunCore)" />

      {/* 성장 곡선: 부드러운 베지어 + 아래쪽 은은한 채움 */}
      <path
        d="M40,318 C160,300 190,268 260,278 C330,288 350,232 430,214 C500,198 520,168 600,150 C660,136 700,120 760,96"
        fill="none"
        stroke="url(#growthStroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M40,318 C160,300 190,268 260,278 C330,288 350,232 430,214 C500,198 520,168 600,150 C660,136 700,120 760,96 L760,360 L40,360 Z"
        fill="url(#growthFill)"
      />

      {/* 먼 능선 */}
      <path
        d="M0,290 C110,250 170,268 240,238 C320,204 380,246 460,222 C540,198 610,232 690,208 C740,192 780,210 800,222 L800,450 L0,450 Z"
        fill="url(#ridgeFar)"
        opacity="0.5"
      />

      {/* 중간 능선 */}
      <path
        d="M0,340 C90,300 150,320 210,290 C280,254 340,290 420,258 C490,230 560,268 640,238 C710,212 760,232 800,244 L800,450 L0,450 Z"
        fill="url(#ridgeMid)"
        opacity="0.75"
      />

      {/* 주봉 (가장 가까운 산) — 부드러운 곡선 능선 + 은은한 광택 */}
      <path
        d="M0,450 C70,380 120,300 190,300 C250,300 270,240 330,190 C368,158 392,140 420,140 C452,140 470,172 512,232 C548,284 580,310 630,310 C690,310 730,360 800,350 L800,450 Z"
        fill="url(#ridgeNear)"
      />
      <path
        d="M330,190 C368,158 392,140 420,140 C452,140 470,172 512,232"
        fill="none"
        stroke="url(#facet)"
        strokeWidth="26"
        strokeLinecap="round"
      />

      {/* 정상까지 이어지는 오솔길 */}
      <path
        d="M150,450 C230,400 270,340 305,300 C345,254 375,205 418,148"
        fill="none"
        stroke="#f4f1ea"
        strokeWidth="2.5"
        strokeDasharray="1 11"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 정상의 깃발 */}
      <line x1="420" y1="140" x2="420" y2="102" stroke="#f4f1ea" strokeWidth="2" strokeLinecap="round" />
      <path d="M420,102 L448,110.5 L420,120 Z" fill="#e9b04a" />
      <circle cx="420" cy="140" r="3.5" fill="#f4f1ea" />
    </svg>
  );
}
