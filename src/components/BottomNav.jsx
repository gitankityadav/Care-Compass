import Icon from './Icon'
import { NAV } from '../data/data'

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${active === n.id ? 'active' : ''}`}
          onClick={() => onChange(n.id)}
        >
          <Icon name={n.icon} size={22} />
          {n.label}
        </button>
      ))}
    </nav>
  )
}
