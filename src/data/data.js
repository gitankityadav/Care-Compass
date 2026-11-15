/* ==========================================================
   ALL CONTENT LIVES HERE. Edit text and numbers in this file
   and the screens update. Later you can replace these exports
   with API calls (fetch) without touching the components.
   ========================================================== */

export const NAV = [
  { id: 'twin', label: 'Twin', icon: 'BarChart3', view: 'Executive Twin' },
  { id: 'patients', label: 'Patients', icon: 'Activity', view: 'Patient Command' },
  { id: 'logistics', label: 'Logistics', icon: 'Archive', view: 'Logistics Tower' },
  { id: 'ops', label: 'Ops', icon: 'Cpu', view: 'Service Ops' },
  { id: 'staff', label: 'Staff', icon: 'Stethoscope', view: 'Nurse Mobility' },
  { id: 'resilience', label: 'Resilience', icon: 'Radar', view: 'Resilience Center' },
]

export const NETWORK = { name: 'All US Networks (14 Hubs)', defcon: 'DEFCON 1 / Operational Sync: Active', alerts: 4 }

/* ---------------- TWIN ---------------- */
export const READINESS = { level: 'DEFCON 2', title: 'Elevated Readiness', sub: 'Sync: 12s ago • 14 Facilities Active' }

export const AI_BRIEF = {
  confidence: '98.2%',
  headline: 'WEATHER DISRUPTION:',
  body: 'Storm Maya impact on Gulf Corridor affecting 3 logistics shipments (SHP-8041, SHP-8092) and 2 regional home care routes in Houston Hub. 1 critical ventilator telemetry anomaly in Dallas.',
  vectorLabel: 'TRIAGE IMPACT VECTOR',
  vectorValue: 'Surge Delta: +14.2%',
  spark: [18, 20, 15, 19, 17, 24, 22, 27, 25, 31],
}

// tone: red | green | purple | teal | ink
export const KPIS = [
  { label: 'Facilities', icon: 'Building2', iconTone: 'teal', value: '14', note: '98.4% cap', noteTone: 'red', foot: '12 Acute • 2 Surgical' },
  { label: 'Active Census', icon: 'UserRound', iconTone: 'green', value: '1,842', note: '38 HR', noteTone: 'red', foot: '+42 admissions (4h)' },
  { label: 'Critical Alerts', icon: 'AlertTriangle', iconTone: 'red', value: '4', valueTone: 'red', note: 'Code Red', noteTone: 'red', foot: '1 Telemetry • 2 Log. • 1 Rx' },
  { label: 'Field Nurses', icon: 'BriefcaseMedical', iconTone: 'teal', value: '142', note: '/ 160', noteTone: 'green', foot: '88.7% Ward Utilization' },
  { label: 'Pending Therapies', icon: 'Syringe', iconTone: 'teal', value: '28', note: '3 Missed', noteTone: 'red', foot: '25 On-schedule' },
  { label: 'Delayed Shipments', icon: 'Truck', iconTone: 'red', value: '2', note: 'Reroute!', noteTone: 'red', foot: 'SHP-8041 (Memphis→HOU)' },
  { label: 'Device Attention', icon: 'SmartphoneNfc', iconTone: 'purple', value: '5', note: '1 Alarm', noteTone: 'purple', foot: '4 Firmware pending v4.2' },
  { label: 'Resilience Alert', icon: 'CloudRainWind', iconTone: 'red', value: '2', valueTone: 'red', note: 'Maya / Flood', noteTone: 'red', foot: 'Gulf Hub Emergency Plan B' },
]

// Map points: x,y are in the 0-800 by 0-400 map space (see MapPanel.jsx)
export const MAP_CITIES = [
  { name: 'Denver', x: 250, y: 150, color: '#38bdf8' },
  { name: 'Chicago', x: 420, y: 100, color: '#22c993' },
  { name: 'Memphis DC', x: 445, y: 172, color: '#38bdf8' },
  { name: 'Atlanta', x: 520, y: 205, color: '#22c993' },
  { name: 'Dallas', x: 335, y: 205, color: '#ef4444', alert: true, tag: '[!]' },
  { name: 'Houston', x: 360, y: 262, color: '#ef4444', alert: true, tag: '[Maya]' },
  { name: 'Miami', x: 600, y: 290, color: '#38bdf8' },
]
export const MAP_STORM = { x: 372, y: 275, label: 'Maya: 65kt Gusts • Cat 1 Near Landfall' }
export const MAP_ROUTE = { from: 'Memphis DC', to: 'Houston' }
export const MAP_TABS = [
  { label: 'Facilities (14)', key: 'facilities' },
  { label: 'Shipments (28)', key: 'shipments' },
  { label: 'Nurses (142)', key: 'nurses' },
  { label: 'Radar (Maya)', key: 'radar', danger: true },
]
export const MAP_NOTE = 'Corridor Disruption: SHP-8041 via I-10 Gulf'

// icon + tone for the left square; chip + button on the right
export const SCENARIOS = [
  { id: 1, icon: 'CloudRainWind', iconTone: 'red', title: 'Scenario 1: Storm Maya Logistics Disruption', sub: '3 Critical Shipments halted • Houston Hub', chip: 'HIGH PRI', chipTone: 'red', foot: 'Target: Supply Chain Command', btn: 'Reroute Shipment', btnTone: 'teal', btnIcon: 'ArrowRight' },
  { id: 2, icon: 'CalendarX2', iconTone: 'amber', title: 'Scenario 2: Missed Dialysis Session', sub: 'Patient #39281 • 45m past scheduled infusion window', chip: 'CLINICAL', chipTone: 'mint', foot: 'Nearest Available Nurse: J. Miller (1.2 mi)', btn: 'Reassign Field Nurse', btnTone: 'green', btnIcon: 'UserPlus' },
  { id: 3, icon: 'Wind', iconTone: 'red', title: 'Scenario 3: Vent-X900 Abnormal O2 Flow', sub: 'Dallas Presby ICU Room 402 • Delta -18%', chip: 'URGENT', chipTone: 'red', foot: 'Biomed Unit 3 on standby', btn: 'Dispatch Biomed Tech', btnTone: 'teal', btnIcon: 'Wrench' },
  { id: 4, icon: 'BellRing', iconTone: 'purple', title: 'Scenario 4: Medtronic PB560 Recall Notice', sub: 'FDA Class II Alert • Valve diaphragm batch #418', chip: 'AUDIT', chipTone: 'purple', foot: '12 Patients active on network serials', btn: 'Audit 12 Patients', btnTone: 'purple', btnIcon: 'ListChecks' },
  { id: 5, icon: 'SmartphoneNfc', iconTone: 'teal', title: 'Scenario 5: Firmware v4.2 Security Rollout', sub: 'Zero-day TLS patch for Infusion Pumps', chip: 'INFRA', chipTone: 'gray', foot: '20 Devices pending maintenance cycle', btn: 'Review 20 Devices', btnTone: 'dark', btnIcon: 'Server' },
  { id: 6, icon: 'RefreshCcwDot', iconTone: 'green', title: 'Scenario 6: Multi-Facility Transfer Audit', sub: 'Inter-hospital Surge Relocation • 8 Patients', chip: 'AUDIT', chipTone: 'mint', foot: 'Dallas → Atlanta EMR sync pending', btn: 'View Compliance', btnTone: 'green', btnIcon: 'ShieldCheck' },
]

// level: amber | red | green
export const FACILITIES = [
  { name: 'Houston Memorial Command', sub: 'Acute Care • Surge Tier 2 Protocol', occ: '94% Occ', level: 'amber', badge: '2 ALERTS' },
  { name: 'Dallas Presbyterian Center', sub: 'ICU Overflow • Biomed Telemetry Code', occ: '88% Occ', level: 'red', badge: '1 CRIT ALARM' },
  { name: 'Atlanta St. Jude Campus', sub: 'Regional Anchor • Buffer Hub Active', occ: '82% Occ', level: 'green', badge: 'NORMAL' },
  { name: 'Chicago Central Health', sub: 'Midwest Core • Available Surge Beds: 44', occ: '79% Occ', level: 'green', badge: 'NORMAL' },
]

/* ---------------- PATIENTS ---------------- */
export const PATIENT_FILTERS = [
  { key: 'all', label: 'All Patients', count: '1,842' },
  { key: 'high', label: 'High Risk', count: '38', tone: 'danger' },
  { key: 'interventions', label: 'Active Interventions', count: '12' },
  { key: 'missed', label: 'Missed Therapy', count: '3', tone: 'danger-solid' },
]

export const PATIENTS = [
  {
    id: 'PAT-4029',
    name: 'Eleanor Vance',
    initials: 'EV',
    age: 68,
    sex: 'Female',
    hub: 'Dallas Presbyterian Hub (Quadrant 3)',
    physician: 'Dr. Robert Chen, MD (Nephrology)',
    alert: {
      eyebrow: 'ACTION REQUIRED • CRITICAL BOTTLENECK',
      window: 'T-minus 14h window',
      title: 'Patient Eleanor Vance (PAT-4029) missed scheduled In-Home Peritoneal Dialysis at 08:30 AM.',
      sub: 'Primary Assigned Nurse RN Sarah Jenkins delayed due to severe localized transit gridlock on I-35 Stemmons Corridor.',
      tags: [
        { text: 'RISK: HIGH (STAGE 4 CKD)', solid: true },
        { text: 'Cardiovascular Co-morbidity' },
        { text: 'Serum K+: 5.1 mEq/L' },
      ],
    },
    tiles: [
      { label: 'CLINICAL STATUS', val: 'At-Risk (Surge Flag)', tone: 'red', icon: 'Asterisk' },
      { label: 'CARE DELIVERY', val: 'Home Health', tone: 'blue', icon: 'House' },
      { label: 'ACTIVE HARDWARE', val: 'Dialyzer D-400', tone: 'blue', icon: 'BriefcaseMedical' },
      { label: 'LOGISTICS ALERT', val: 'Kit Supply Delayed', tone: 'purple', icon: 'ClipboardCheck' },
    ],
    vitals: [
      { label: 'BP SYS/DIA', value: '148/92', red: true },
      { label: 'EGFR', value: '19 mL/min' },
      { label: 'DRY WEIGHT', value: '64.2 kg' },
      { label: 'FLUID EX', value: '+1.8 L', red: true },
    ],
    episode: {
      id: 'Episode EP-9011: Chronic Renal Protocol',
      sub: 'Cycle 4 • Bi-weekly Peritoneal Clearance Program',
      chip: 'CYCLE DAY 9 OF 14',
      sessions: [
        { state: 'ok', title: 'Session 1 (Monday)', flag: 'SUCCESS', sub: 'Completed • RN Sarah Jenkins • 2.5L Outflow', time: '08:35 AM' },
        { state: 'ok', title: 'Session 2 (Wednesday)', flag: 'SUCCESS', sub: 'Completed • RN Sarah Jenkins • Stable Vitals', time: '08:42 AM' },
        { state: 'missed', title: 'Session 3 (Today)', flag: 'MISSED / NO SHOW', sub: 'Scheduled: 08:30 AM • In-Home Dialysis Unperformed', time: '+2H 15M', time2: 'Overdue' },
        { state: 'upcoming', title: 'Session 4 (Saturday)', flag: 'UPCOMING', sub: 'Scheduled for 08:30 AM • Subject to clearance', time: 'Oct 28' },
      ],
    },
    steps: [
      { n: 1, state: 'done', title: 'Step 1: Missed Session Flagged', right: '08:45 AM (System Alert)', body: 'Tele-care device detected zero fluid turnover. Auto-escalated to Care Command.' },
      { n: 2, state: 'done', title: 'Step 2: Risk Stratification Model', right: 'URGENT FLAG', rightRed: true, body: '14 hrs remaining until toxic electrolyte accumulation threshold (Serum K+ > 5.8 mEq/L).', bodyRed: true, progress: 86 },
      { n: 3, state: 'todo', title: 'Step 3: Immediate Nurse Dispatch & Reassignment', right: 'ACTION NEEDED', body: 'Sarah Jenkins gridlocked (ETA +75m). Nearest certified renal nurse identified within operational radius.' },
    ],
    nurse: { name: 'RN Marcus Bell', initials: 'MB', status: 'Available', dist: '4.2 miles away', eta: 'ETA 25 mins' },
    step4: {
      title: 'Step 4: Supply Telemetry & Verification',
      right: 'SHIPMENT IN-TRANSIT',
      etaChip: 'Courier ETA 11:15 AM',
      body: 'Dialysate Solution Box 3 (SHP-8041)',
      note: '*Emergency backup reserve in Vance residence: 1 Kit remaining (Sufficient for immediate Marcus Bell session).',
    },
    log: [
      { dot: '#b91c1c', title: 'Session Missed Flag Raised', time: '08:31 AM', body: 'Automated dialyzer sensor alert (Zero Flow at 08:30 AM)' },
      { dot: '#6d3fd1', title: 'Courier Delay Notification', time: '08:14 AM', body: 'Supply SHP-8041 rerouted via Stemmons Bypass' },
      { dot: '#0a7a5c', title: 'Patient Check-in SMS Sent', time: '07:55 AM', body: 'Daughter / Caregiver Maria confirmed patient is awake & awaiting nurse' },
      { dot: '#b3bad0', title: 'Night Cycle Peritoneal Log Clean', time: '06:00 AM', body: 'Effluent clarity grade A; catheter integrity verified' },
    ],
  },
  { id: 'PAT-1088', name: 'James K.', initials: 'JK', placeholder: true },
  { id: 'PAT-9122', name: 'Maria S.', initials: 'MS', placeholder: true },
]

/* ---------------- LOGISTICS ---------------- */
export const SURGE = { title: 'PRIORITY SURGE PROTOCOL', sub: 'Logistics Tower Delta Feed', sync: 'GIS SYNC: LIVE' }

export const LOG_KPIS = [
  { label: 'Active Loads', icon: 'Truck', iconTone: 'teal', value: '124', unit: 'units', delta: '+8% vs wk baseline', deltaTone: 'green', trend: 'up' },
  { label: 'On-Time Rate', icon: 'CalendarClock', iconTone: 'green', value: '94.2%', delta: '-2.1% storm shock', deltaTone: 'red', trend: 'down' },
  { label: 'Disrupted', icon: 'TriangleAlert', iconTone: 'red', value: '4', unit: 'corridors', delta: '1 Catastrophic', deltaTone: 'ink', labelRed: true },
  { label: 'Critical Alloc.', icon: 'Siren', iconTone: 'purple', value: '18', unit: 'patients', delta: '6 At immediate risk', deltaTone: 'purple' },
  { label: 'Cold-Chain Comp.', icon: 'Snowflake', iconTone: 'green', value: '99.8%', unit: 'nominal', delta: 'All sensors calibrated', deltaTone: 'green' },
]

export const DISRUPTION = {
  title: 'DISRUPTION DETECTED: Storm Maya Flooding',
  level: 'LEVEL 1 EMERGENCY',
  shipment: 'SHP-8041',
  body1: '(Dialysis Fluid & Renal Kits) originating from',
  origin: 'Memphis Central DC',
  body2: 'is halted on',
  road: 'I-10 West',
  body3: 'due to flash surges near Baton Rouge.',
  patients: '6 allocated home hemodialysis patients',
  body4: 'in Greater Houston face critical supply stockouts within 24 hours.',
  gps: 'Telemetry GPS: 30.4583° N, -91.1403° W',
  detected: 'Detected 14 mins ago',
}

export const ROUTE_MAP = {
  title: 'GIS Incident Visualizer & Routing Matrix',
  chip: 'ACTIVE VECTORING',
  flood: 'I-10 INUNDATED: 4.8FT',
  halted: { label: 'SHP-8041 Carrier Halted', place: 'Baton Rouge, LA' },
  nodes: [
    { name: 'Memphis DC (Origin)', pos: 'tl', color: '#38bdf8' },
    { name: 'Dallas DC (Alternate Relay)', pos: 'bl', color: '#4fe0c6' },
    { name: 'Houston Memorial Hub', pos: 'br', color: '#93c5fd' },
  ],
}
