import { Satellite, TrendingUp, TrendingDown, MapPinned, Waves, Route, OctagonAlert } from 'lucide-react'
import Icon from '../components/Icon'
import { SURGE, LOG_KPIS, DISRUPTION as D, ROUTE_MAP } from '../data/data'

const TONE = { red: 't-red', green: 't-green', purple: 't-purple', teal: 't-teal', ink: '' }

function RouteMap() {
  // Simple decision map. Replace with a real routing map later.
  return (
    <div className="map-wrap" style={{ height: 300 }}>
      <svg viewBox="0 0 640 300" preserveAspectRatio="none" style={{ height: '100%' }}>
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="#2c3656" strokeWidth="0.6" />
          </pattern>
          <radialGradient id="flood">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="640" height="300" fill="url(#grid)" />
        <circle cx="580" cy="190" r="80" fill="url(#flood)" />
        <polyline points="110,70 195,64 215,190" fill="none" stroke="#3b6773" strokeWidth="4" />
        <polyline points="215,190 80,260" fill="none" stroke="#7a3640" strokeWidth="4" strokeDasharray="3 8" strokeLinecap="round" />
        <polyline points="195,64 215,190" fill="none" stroke="#7a3640" strokeWidth="4" strokeDasharray="3 8" strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', top: 12, left: 12, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="dot" style={{ background: ROUTE_MAP.nodes[0].color }} /> {ROUTE_MAP.nodes[0].name}
      </span>
      <span style={{ position: 'absolute', bottom: 12, left: 12, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="dot" style={{ background: ROUTE_MAP.nodes[1].color }} /> {ROUTE_MAP.nodes[1].name}
      </span>
      <span style={{ position: 'absolute', bottom: 12, right: 12, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="dot" style={{ background: ROUTE_MAP.nodes[2].color }} /> {ROUTE_MAP.nodes[2].name}
      </span>
      <span className="chip red" style={{ position: 'absolute', top: 12, right: 12, borderRadius: 6, padding: '6px 10px', fontSize: 11.5, display: 'flex', gap: 6 }}>
        <Waves size={14} /> {ROUTE_MAP.flood}
      </span>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 999, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
        <OctagonAlert size={15} color="#e8a09b" /> {ROUTE_MAP.halted.label}
        <span className="chip red-soft" style={{ textTransform: 'none' }}>{ROUTE_MAP.halted.place}</span>
      </div>
    </div>
  )
}

export default function Logistics() {
  return (
    <div className="stack">
      <div className="surge-bar">
        <span className="l">{SURGE.title} <span>| {SURGE.sub}</span></span>
        <span className="sync-pill"><Satellite size={14} color="#6d3fd1" /> {SURGE.sync}</span>
      </div>

      <div className="log-kpis">
        {LOG_KPIS.map((k) => (
          <div className="lk" key={k.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
              <span className={`eyebrow ${k.labelRed ? 't-red' : ''}`}>{k.label}</span>
              <span className={TONE[k.iconTone]}><Icon name={k.icon} size={16} /></span>
            </div>
            <div className="v">{k.value} {k.unit && <small>{k.unit}</small>}</div>
            <div className={`d ${TONE[k.deltaTone]}`} style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
              {k.trend === 'up' && <TrendingUp size={12} />}
              {k.trend === 'down' && <TrendingDown size={12} />}
              <span>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="disruption">
        <h3>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><OctagonAlert size={20} /> {D.title}</span>
          <span className="chip red">{D.level}</span>
        </h3>
        <p>
          Shipment <u>{D.shipment}</u> {D.body1} <b>{D.origin}</b> {D.body2} <b>{D.road}</b> {D.body3}{' '}
          <u>{D.patients}</u> {D.body4}
        </p>
        <div className="meta">
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MapPinned size={15} /> {D.gps}</span>
          <span>{D.detected}</span>
        </div>
      </section>

      <section className="card">
        <div className="card-title" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 16 }}>
            <Route size={20} color="#0b6e8c" /> {ROUTE_MAP.title}
          </span>
          <span className="chip mint" style={{ borderRadius: 999 }}>{ROUTE_MAP.chip}</span>
        </div>
        <RouteMap />
      </section>
    </div>
  )
}
