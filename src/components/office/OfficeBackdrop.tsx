/**
 * 2D 사무실 배경 (마루 바닥 + 벽 + 뒤쪽 화이트보드). SVG 조각.
 */
export function OfficeBackdrop() {
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
