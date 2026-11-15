import Icon from './Icon'

const TONE = { red: 't-red', green: 't-green', purple: 't-purple', teal: 't-teal', ink: '' }

export default function Kpi({ label, icon, iconTone, value, valueTone, note, noteTone, foot }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className={TONE[iconTone]}><Icon name={icon} size={18} /></span>
      </div>
      <div className={`kpi-value ${TONE[valueTone] || ''}`}>
        {value}
        {note && <small className={TONE[noteTone]}>{note}</small>}
      </div>
      <div className="kpi-foot">{foot}</div>
    </div>
  )
}
