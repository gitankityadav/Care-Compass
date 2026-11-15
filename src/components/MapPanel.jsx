import { Wind } from 'lucide-react'
import { MAP_CITIES, MAP_STORM, MAP_ROUTE } from '../data/data'

// Simplified US silhouette. Replace with a real map later
// (Leaflet / MapLibre / Mapbox) using the same MAP_CITIES data.
const US_PATH =
  'M130 80 L330 70 L560 70 L640 110 L650 200 L610 250 L560 300 L500 310 L440 290 L380 330 L340 300 L250 260 L170 240 L140 190 Z'

export default function MapPanel({ activeLayer }) {
  const from = MAP_CITIES.find((c) => c.name === MAP_ROUTE.from)
  const to = MAP_CITIES.find((c) => c.name === MAP_ROUTE.to)
  const mid = { x: (from.x + to.x) / 2 - 18, y: (from.y + to.y) / 2 }

  return (
    <div className="map-wrap">
      <svg viewBox="0 0 800 400" role="img" aria-label="Network map">
        <defs>
          <radialGradient id="storm">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={US_PATH} fill="var(--map-land)" opacity="0.9" />
        {[250, 400, 520].map((x) => (
          <line key={x} x1={x} y1="70" x2={x} y2="320" stroke="#3a4566" strokeDasharray="4 6" strokeWidth="1" />
        ))}
        <ellipse cx="430" cy="82" rx="42" ry="14" fill="#1b2238" />

        {(activeLayer === 'radar' || activeLayer === 'facilities') && (
          <ellipse cx={MAP_STORM.x} cy={MAP_STORM.y} rx="48" ry="26" fill="url(#storm)" />
        )}

        {/* Route */}
        <path d={`M${from.x} ${from.y} Q${mid.x} ${mid.y} ${to.x} ${to.y}`} stroke="#22c993" strokeWidth="2.5" fill="none" />
        <path d={`M${from.x} ${from.y} Q${mid.x + 8} ${mid.y} ${to.x} ${to.y}`} stroke="#ef4444" strokeWidth="2" strokeDasharray="5 5" fill="none" />
        <circle cx={mid.x + 6} cy={mid.y + 14} r="6" fill="#ef4444" />
        <text x={mid.x + 3.5} y={mid.y + 17} fontSize="9" fontWeight="800" fill="#fff">!</text>

        {MAP_CITIES.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r="5" fill={c.color} />
            <text
              x={c.alert ? c.x - 8 : c.x + 10}
              y={c.alert ? c.y - 2 : c.y - 4}
              textAnchor={c.alert ? 'end' : 'start'}
              fontSize="11"
              fontWeight="700"
              fill={c.alert ? '#fca5a5' : '#e5e9f7'}
            >
              {c.name} {c.tag || ''}
            </text>
          </g>
        ))}
      </svg>
      <div className="map-badge">
        <Wind size={15} color="#f87171" /> {MAP_STORM.label}
      </div>
    </div>
  )
}
