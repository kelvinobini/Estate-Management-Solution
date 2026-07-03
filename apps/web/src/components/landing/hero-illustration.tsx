export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 640 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-2xl"
      role="img"
      aria-label="Illustration of Rose Garden Estate — houses, gardens, and a rising sun"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="houseA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="houseB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="houseC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="roofA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
        <linearGradient id="hedge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>

      <rect width="640" height="320" rx="24" fill="url(#sky)" />
      <circle cx="540" cy="70" r="42" fill="url(#sun)" />

      {/* distant hill */}
      <path d="M0 220 Q160 180 320 210 T640 200 V320 H0 Z" fill="#bbf7d0" opacity="0.6" />

      {/* ground */}
      <rect x="0" y="250" width="640" height="70" fill="url(#hedge)" opacity="0.35" />

      {/* house A */}
      <g>
        <rect x="70" y="180" width="110" height="90" rx="6" fill="url(#houseA)" />
        <path d="M60 180 L125 130 L190 180 Z" fill="url(#roofA)" />
        <rect x="105" y="220" width="30" height="50" rx="3" fill="#fff7ed" />
        <rect x="85" y="195" width="20" height="20" rx="2" fill="#fff7ed" opacity="0.9" />
        <rect x="145" y="195" width="20" height="20" rx="2" fill="#fff7ed" opacity="0.9" />
      </g>

      {/* house B (tallest, center) */}
      <g>
        <rect x="230" y="140" width="130" height="130" rx="6" fill="url(#houseB)" />
        <path d="M218 140 L295 80 L372 140 Z" fill="#7c2d12" />
        <rect x="278" y="200" width="34" height="70" rx="3" fill="#fff7ed" />
        <rect x="248" y="160" width="22" height="22" rx="2" fill="#fff7ed" opacity="0.9" />
        <rect x="322" y="160" width="22" height="22" rx="2" fill="#fff7ed" opacity="0.9" />
      </g>

      {/* house C */}
      <g>
        <rect x="410" y="190" width="100" height="80" rx="6" fill="url(#houseC)" />
        <path d="M400 190 L460 145 L520 190 Z" fill="#1e3a8a" />
        <rect x="440" y="228" width="28" height="42" rx="3" fill="#fff7ed" />
        <rect x="422" y="205" width="18" height="18" rx="2" fill="#fff7ed" opacity="0.9" />
      </g>

      {/* rose garden — small colorful bushes along the base */}
      {[40, 200, 380, 560, 600].map((cx, i) => (
        <g key={cx} transform={`translate(${cx} 275)`}>
          <ellipse rx="26" ry="14" fill="url(#hedge)" />
          {[[-10, -4], [0, -8], [10, -3], [4, 2]].map(([dx, dy], j) => (
            <circle key={j} cx={dx} cy={dy} r={i % 2 === 0 ? 5 : 4} fill={j % 2 === 0 ? "#f472b6" : "#fb7185"} />
          ))}
        </g>
      ))}

      {/* pathway */}
      <path d="M280 320 L300 270 L340 270 L360 320 Z" fill="#e7d8c9" opacity="0.8" />
    </svg>
  );
}
