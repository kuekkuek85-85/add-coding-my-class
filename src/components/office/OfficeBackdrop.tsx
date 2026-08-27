/**
 * 2D 사무실 배경 (마루 바닥 + 벽 + 뒤쪽 화이트보드). SVG 조각.
 */
export function OfficeBackdrop({ variant = "office" }: { variant?: "office" | "classroom" }) {
  if (variant === "classroom") {
    return (
      <g>
        {/* 뒤쪽 벽 + 게시판 */}
        <rect x="0" y="0" width="1200" height="110" fill="#eef2f7" />
        <rect x="120" y="20" width="420" height="70" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" rx="6" />
        <rect x="660" y="20" width="420" height="70" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" rx="6" />
        {/* 교실 바닥 */}
        <rect x="0" y="110" width="1200" height="900" fill="#f6f1e7" />
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 120} x2={i * 120} y1="110" y2="1010" stroke="#e2d8c3" strokeWidth="2" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="0" x2="1200" y1={110 + i * 120} y2={110 + i * 120} stroke="#e2d8c3" strokeWidth="2" />
        ))}
        {/* 교실 앞쪽 (칠판 영역) */}
        <rect x="0" y="1010" width="1200" height="100" fill="#e8eef0" />
        <rect x="90" y="1018" width="1020" height="52" rx="6" fill="#2F6B4F" stroke="#1f4a37" strokeWidth="3" />
        <text x="600" y="1050" fill="#eafaf1" fontSize="20" fontWeight="700" textAnchor="middle">
          칠판
        </text>
      </g>
    );
  }
  return (
    <g>
      {/* Wall */}
      <rect x="0" y="0" width="1200" height="110" fill="#f1f5f9" />
      {/* Whiteboards */}
      <rect x="80" y="20" width="260" height="70" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" rx="4" />
      <rect x="380" y="20" width="200" height="70" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" rx="4" />
      <rect x="620" y="20" width="200" height="70" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" rx="4" />
      <rect x="860" y="20" width="260" height="70" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" rx="4" />
      {/* Floor - wooden */}
      <rect x="0" y="110" width="1200" height="1000" fill="#b98b5d" />
      {/* Wood planks lines */}
      {Array.from({ length: 25 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          x2="1200"
          y1={110 + i * 42}
          y2={110 + i * 42}
          stroke="#8f6537"
          strokeWidth="1"
          opacity="0.4"
        />
      ))}
    </g>
  );
}
