import { Construction } from 'lucide-react'

// Used for screens you haven't designed yet (Ops, Staff, Resilience).
export default function Placeholder({ title }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <Construction size={36} color="#6b7188" />
      <h2 style={{ marginTop: 12 }}>{title}</h2>
      <p style={{ color: '#6b7188', marginTop: 6 }}>
        Build this screen in <code>src/pages/</code> and register it in <code>src/App.jsx</code>.
      </p>
    </div>
  )
}
