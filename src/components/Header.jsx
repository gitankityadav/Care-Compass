import { Compass, Search, Bell, User, Building2, ChevronDown, Layers } from 'lucide-react'
import { NETWORK } from '../data/data'

export default function Header({ viewLabel }) {
  return (
    <header className="header">
      <div className="header-top">
        <div className="brand">
          <div className="brand-logo"><Compass size={20} /></div>
          <div>
            <div className="brand-name">
              Care Compass <span className="brand-tag">LIVE HUB</span>
            </div>
            <div className="brand-sub"><i className="dot" /> {NETWORK.defcon}</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" aria-label="Search"><Search size={22} /></button>
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={22} />
            <span className="badge">{NETWORK.alerts}</span>
          </button>
          <button className="avatar-btn" aria-label="Profile"><User size={20} /></button>
        </div>
      </div>
      <div className="header-bottom">
        <button className="network-select">
          <Building2 size={16} color="#4fe0c6" /> {NETWORK.name} <ChevronDown size={16} />
        </button>
        <div className="view-label">
          <span className="gis"><Layers size={14} /> GIS</span>
          {viewLabel}
        </div>
      </div>
    </header>
  )
}
