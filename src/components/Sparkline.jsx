// Tiny area chart drawn with SVG. Pass an array of numbers.
export default function Sparkline({ data, width = 130, height = 36, color = '#7c4dff' }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - 4 - ((v - min) / (max - min || 1)) * (height - 10)])
  const line = pts.map((p) => p.join(',')).join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={area} fill={color} opacity="0.15" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
