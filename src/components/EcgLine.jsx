/* Decorative heartbeat trace that continually draws itself. */
export default function EcgLine({className=''}){
  const d='M0 30 H46 L56 30 L64 8 L76 54 L86 30 H150 L160 30 L168 14 L180 46 L188 30 H260 L270 30 L278 6 L290 56 L300 30 H360'
  return <svg className={'ecg '+className} viewBox="0 0 360 60" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="ecgGrad" x1="0" x2="1">
        <stop offset="0" stopColor="#2de2c8" stopOpacity="0"/>
        <stop offset=".35" stopColor="#2de2c8"/>
        <stop offset=".7" stopColor="#38bdf8"/>
        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <path d={d} className="ecg-base"/>
    <path d={d} className="ecg-trace" stroke="url(#ecgGrad)" pathLength="100"/>
  </svg>
}
