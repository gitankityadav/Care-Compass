import { useState } from 'react'
import { Sparkles, Brain, RefreshCw, Globe2, Wind, GitFork } from 'lucide-react'
import Kpi from '../components/Kpi'
import Icon from '../components/Icon'
import Sparkline from '../components/Sparkline'
import MapPanel from '../components/MapPanel'
import {
  READINESS, AI_BRIEF, KPIS, MAP_TABS, MAP_NOTE, SCENARIOS, FACILITIES,
} from '../data/data'

const ICON_BG = {
  red: ['#fde2e0', '#b91c1c'], amber: ['#ffefcf', '#c2410c'], purple: ['#ece5fc', '#6d3fd1'],
  teal: ['#d9ebf0', '#0b6e8c'], green: ['#d6efe8', '#0a7a5c'],
}
const BAR = { amber: '#f59e0b', red: '#b91c1c', green: '#0a7a5c' }
const OCC_TEXT = { amber: '#b56a00', red: '#b91c1c', green: '#0a7a5c' }
const BADGE = { amber: 'amber', red: 'red-soft', green: 'green' }

export default function Twin() {
  const [layer, setLayer] = useState('facilities')

  return (
    <div className="stack">
      <div className="status-banner">
        <span className="defcon">{READINESS.level}</span>
        <div>
          <div style={{ fontWeight: 700 }}>{READINESS.title}</div>
          <div style={{ fontSize: 12, color: '#b9c0da', fontWeight: 600 }}>{READINESS.sub}</div>
        </div>
        <div className="live">
          <span className="live-pill"><RefreshCw size={14} /> LIVE</span>
          <i className="dot" />
        </div>
      </div>

      <section className="ai-box">
        <div className="ai-head">
          <div className="ai-title"><span className="ai-icon"><Sparkles size={16} /></span> AI EXECUTIVE INTELLIGENCE</div>
          <div className="ai-conf"><i /> Confidence: {AI_BRIEF.confidence}</div>
        </div>
        <p className="ai-body">
          <b className="t-red">{AI_BRIEF.headline}</b> {AI_BRIEF.body}
        </p>
        <div className="ai-vector">
          <div>
            <div className="eyebrow" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Brain size={15} color="#7c4dff" /> {AI_BRIEF.vectorLabel}
            </div>
            <div style={{ fontWeight: 700, marginLeft: 23 }}>{AI_BRIEF.vectorValue}</div>
          </div>
          <Sparkline data={AI_BRIEF.spark} />
        </div>
      </section>

      <div className="section-title">
        Network Telemetry (Unified) <span className="chip mint" style={{ background: '#c9f5ee', color: '#0b6e8c' }}>14 CORE NODES</span>
      </div>
      <div className="kpi-grid">
        {KPIS.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <section className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Globe2 size={20} color="#0b6e8c" /> GIS Live Vector Twin</span>
          <span className="chip red-soft" style={{ fontSize: 11 }}>● WEATHER ALERT</span>
        </div>
        <div className="pill-row" style={{ margin: '12px 0' }}>
          {MAP_TABS.map((t) => (
            <button
              key={t.key}
              className={`pill ${layer === t.key ? 'active' : ''} ${t.danger && layer !== t.key ? 'danger' : ''}`}
              onClick={() => setLayer(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <MapPanel activeLayer={layer} />
        <div className="map-note">
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><GitFork size={16} color="#b91c1c" /> {MAP_NOTE}</span>
          <button className="btn teal">Auto-Reroute</button>
        </div>
      </section>

      <div className="section-title">
        Operational Scenarios (6 Primaries) <span className="eyebrow">ACTION CENTER</span>
      </div>
      {SCENARIOS.map((s) => {
        const [bg, fg] = ICON_BG[s.iconTone]
        return (
          <div className="scenario" key={s.id}>
            <div className="scenario-top">
              <div className="scenario-icon" style={{ background: bg, color: fg }}><Icon name={s.icon} size={20} /></div>
              <div className="scenario-grow">
                <div className="scenario-title">{s.title}</div>
                <div className="scenario-sub">{s.sub}</div>
              </div>
              <span className={`chip ${s.chipTone}`}>{s.chip}</span>
            </div>
            <div className="scenario-foot">
              <span>{s.foot}</span>
              <button className={`btn ${s.btnTone}`}>{s.btn} <Icon name={s.btnIcon} size={14} /></button>
            </div>
          </div>
        )
      })}

      <div className="section-title">
        Facility Operations Status <span className="eyebrow">4 KEY HUBS</span>
      </div>
      {FACILITIES.map((f) => (
        <div className="facility" key={f.name}>
          <div className="facility-bar" style={{ background: BAR[f.level] }} />
          <div>
            <div className="facility-name">{f.name}</div>
            <div className="facility-sub">{f.sub}</div>
          </div>
          <div className="facility-right">
            <span className="facility-occ" style={{ color: OCC_TEXT[f.level] }}>
              {f.occ} <i className="dot" style={{ background: BAR[f.level] }} />
            </span>
            <span className={`chip ${BADGE[f.level]}`}>{f.badge}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
