import { useState } from 'react'
import {
  IdCard, Search, X, CalendarX2, Stethoscope, Check, Clock, ArrowLeftRight,
  Navigation, History, Phone, Siren, TriangleAlert,
} from 'lucide-react'
import Icon from '../components/Icon'
import { PATIENT_FILTERS, PATIENTS } from '../data/data'

export default function Patients() {
  const [filter, setFilter] = useState('missed')
  const [query, setQuery] = useState('PAT-4029')
  const patient = PATIENTS.find((p) => p.id.toLowerCase() === query.trim().toLowerCase()) || null

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title" style={{ fontSize: 22, fontWeight: 600 }}>
          <IdCard size={22} color="#0b6e8c" /> Patient Command Hub
        </div>
        <span className="chip" style={{ background: '#e3e6f3', color: '#2d3452', borderRadius: 999, padding: '4px 10px' }}>
          <i className="dot" style={{ background: '#0a7a5c' }} /> EHR SYNC: REALTIME
        </span>
      </div>

      <div className="pill-row">
        {PATIENT_FILTERS.map((f) => {
          const on = filter === f.key
          const cls = f.tone === 'danger-solid' ? 'danger-solid' : f.tone === 'danger' ? 'danger' : on ? 'active' : ''
          return (
            <button key={f.key} className={`pill ${cls}`} onClick={() => setFilter(f.key)}>
              {f.key === 'missed' && <TriangleAlert size={14} />} {f.label} <b>{f.count}</b>
            </button>
          )
        })}
      </div>

      <div className="search-box">
        <Search size={20} color="#6b7188" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient ID or name" />
        {query && <button onClick={() => setQuery('')} aria-label="Clear"><X size={16} /></button>}
      </div>
      <div className="quick">
        QUICK SELECT:
        {PATIENTS.map((p) => (
          <button key={p.id} className={query === p.id ? 'on' : ''} onClick={() => setQuery(p.id)}>
            {p.id} ({p.name})
          </button>
        ))}
      </div>

      {!patient && <div className="card">No patient found. Try a quick-select ID above.</div>}
      {patient && patient.placeholder && (
        <div className="card">
          <b>{patient.name}</b> ({patient.id}): add this patient's full record in <code>src/data/data.js</code>.
        </div>
      )}
      {patient && !patient.placeholder && <PatientDetail p={patient} />}
    </div>
  )
}

function PatientDetail({ p }) {
  return (
    <>
      <div className="alert-box">
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="alert-icon"><CalendarX2 size={22} /></div>
          <div style={{ flex: 1 }}>
            <div className="alert-eyebrow"><span>● {p.alert.eyebrow}</span><span>{p.alert.window}</span></div>
            <div className="alert-title">{p.alert.title}</div>
            <div className="alert-sub">{p.alert.sub}</div>
          </div>
        </div>
        <div className="tag-row">
          {p.alert.tags.map((t) => (
            <span key={t.text} className={`tag ${t.solid ? 'solid-red' : 'soft-red'}`}>{t.text}</span>
          ))}
        </div>
      </div>

      <section className="card">
        <div className="patient-head">
          <div className="patient-photo">{p.initials}<span className="warn">!</span></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex' }}>
              <div className="patient-name">{p.name}</div>
              <div className="patient-id">{p.id}</div>
            </div>
            <div style={{ color: '#4a5068', marginTop: 4 }}>Age {p.age} • {p.sex} • {p.hub}</div>
            <div style={{ fontWeight: 700, marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Stethoscope size={15} color="#6b7188" /> Primary Physician: {p.physician}
            </div>
          </div>
        </div>
        <div className="info-grid">
          {p.tiles.map((t) => (
            <div key={t.label} className={`info-tile ${t.tone}`}>
              <div className="eyebrow"><Icon name={t.icon} size={14} /> {t.label}</div>
              <div className="val">{t.val}</div>
            </div>
          ))}
        </div>
        <div className="vitals">
          {p.vitals.map((v) => (
            <div className="vital" key={v.label}>
              <div className="eyebrow" style={{ fontSize: 10.5 }}>{v.label}</div>
              <div className={`v ${v.red ? 't-red' : ''}`}>{v.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="eyebrow" style={{ color: '#0a7a5c' }}>TARGET PROTOCOL</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{p.episode.id}</div>
            <div style={{ color: '#4a5068', fontSize: 13 }}>{p.episode.sub}</div>
          </div>
          <span className="chip mint" style={{ alignSelf: 'flex-start', borderRadius: 999 }}>{p.episode.chip}</span>
        </div>
        {p.episode.sessions.map((s) => (
          <div key={s.title} className={`session ${s.state === 'missed' ? 'missed' : ''} ${s.state === 'upcoming' ? 'upcoming' : ''}`}>
            <div className={`session-icon ${s.state === 'ok' ? 'ok' : s.state === 'missed' ? 'bad' : 'wait'}`}>
              {s.state === 'ok' ? <Check size={18} /> : s.state === 'missed' ? <X size={18} /> : <Clock size={16} />}
            </div>
            <div>
              <div className="session-title" style={s.state === 'missed' ? { color: '#b91c1c' } : undefined}>
                {s.title}
                <span
                  className={s.state === 'missed' ? 'chip red' : ''}
                  style={s.state === 'ok' ? { color: '#0a7a5c', fontSize: 11, fontWeight: 800 } : s.state === 'upcoming' ? { color: '#6b7188', fontSize: 11, fontWeight: 800 } : { opacity: 0.9 }}
                >
                  {s.flag}
                </span>
              </div>
              <div className="session-sub" style={s.state === 'missed' ? { color: '#9b2b2b' } : undefined}>{s.sub}</div>
            </div>
            <div className="session-time" style={s.state === 'missed' ? { color: '#b91c1c' } : undefined}>
              {s.time}{s.time2 && <div>{s.time2}</div>}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-title">
          <span className="step-num todo" style={{ borderRadius: 4, width: 24, height: 24 }}>2</span> Intervention Orchestration
          <span className="chip blue" style={{ marginLeft: 'auto' }}>ACTIVE PROTOCOL</span>
        </div>
        {p.steps.map((s) => (
          <div key={s.n} className={`step ${s.state === 'todo' ? 'action' : ''}`}>
            <div className={`step-num ${s.state === 'done' ? 'done' : 'todo'}`}>
              {s.state === 'done' ? <Check size={14} /> : s.n}
            </div>
            <div style={{ flex: 1 }}>
              <div className="step-title">
                <span>{s.title}</span>
                <span style={s.rightRed ? { color: '#b91c1c', fontSize: 11 } : s.state === 'todo' ? undefined : { color: '#6b7188', fontSize: 12 }}
                  className={s.state === 'todo' ? 'chip' : ''}
                >
                  {s.state === 'todo' ? <span className="chip" style={{ background: '#0b6e8c', color: '#fff' }}>{s.right}</span> : s.right}
                </span>
              </div>
              <div className="step-body" style={s.bodyRed ? { color: '#b91c1c', fontWeight: 700 } : undefined}>{s.body}</div>
              {s.progress && <div className="progress"><div style={{ width: `${s.progress}%` }} /></div>}
            </div>
          </div>
        ))}

        <div className="nurse-card">
          <div className="nurse-photo">{p.nurse.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              {p.nurse.name} <span className="chip mint" style={{ fontSize: 10.5 }}>{p.nurse.status}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a7a5c', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Navigation size={13} /> <span style={{ color: '#4a5068' }}>{p.nurse.dist}</span> • {p.nurse.eta}
            </div>
          </div>
          <button className="btn teal">Reassign <ArrowLeftRight size={14} /></button>
        </div>

        <div className="step" style={{ background: '#f0effb' }}>
          <div className="step-num next">4</div>
          <div style={{ flex: 1 }}>
            <div className="step-title">
              <span>{p.step4.title}</span>
              <span style={{ color: '#6d3fd1', fontSize: 11 }}>{p.step4.right}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="step-body" style={{ marginTop: 0 }}>{p.step4.body}</span>
              <span className="chip purple" style={{ textTransform: 'none' }}>{p.step4.etaChip}</span>
            </div>
            <div className="step-body t-green" style={{ fontWeight: 700 }}>{p.step4.note}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title" style={{ fontSize: 16, justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><History size={18} color="#6b7188" /> Clinical Audit & Telemetry Log</span>
          <button className="eyebrow t-teal">EXPORT CSV</button>
        </div>
        <div style={{ marginTop: 6 }}>
          {p.log.map((l) => (
            <div className="log-item" key={l.title}>
              <i className="log-dot" style={{ background: l.dot }} />
              <div style={{ flex: 1 }}>
                <div className="log-title">{l.title}<span>{l.time}</span></div>
                <div className="log-sub">{l.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="action-bar">
        <i className="dot" style={{ background: '#f4b4b1', width: 22, height: 22 }} />
        <div className="grow">
          <div className="eyebrow t-red" style={{ fontSize: 11 }}>INTERVENTION PENDING</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{p.id} • Stage 4 CKD</div>
        </div>
        <button className="btn soft"><Phone size={14} /> Call Patient</button>
        <button className="btn red"><Siren size={14} /> Dispatch Marcus</button>
      </div>
    </>
  )
}
