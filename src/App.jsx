import {useEffect,useMemo,useRef,useState} from 'react'
import {Activity,Users,Truck,HeartPulse,ShieldCheck,Bell,Search,X,MapPin,ArrowUpRight,AlertTriangle,Clock,Plus,Download,Send,LogOut,Stethoscope,Wrench,Brain,CheckCircle2,ChevronRight,Command,Building2,Syringe,Cpu,ShieldAlert,CloudLightning,PackageX,ArrowLeftRight,UserRound} from 'lucide-react'
import NetworkMap from './components/NetworkMap'
import Background from './components/Background'
import CountUp from './components/CountUp'
import EcgLine from './components/EcgLine'
import Login from './components/Login'
import workbook from './data/workbook-sample.json'
import './styles/app.css'

const modules=[['twin','Executive Twin',Activity],['patients','Patient Command',Users],['logistics','Logistics Tower',Truck],['ops','Service Ops',Wrench],['staff','Nurse Mobility',Stethoscope],['resilience','Resilience Center',ShieldCheck]]
const shortLabel={twin:'Twin',patients:'Patients',logistics:'Logistics',ops:'Ops',staff:'Staff',resilience:'Resilience'}
const hospitalById=Object.fromEntries(workbook.hospitals.map(h=>[h.hospital_id,h]))
const nurseById=Object.fromEntries(workbook.nurses.map(n=>[n.nurse_id,n]))

const initial={
  patients:workbook.patients.map(p=>({id:p.patient_id,name:[p.first_name,p.last_name].filter(Boolean).join(' '),age:p.age,facility:hospitalById[p.hospital_id]?.hospital_name||p.hospital_id,risk:p.acuity_level||'Moderate',care:p.encounter_type||p.primary_condition||'Care pathway',nurse:nurseById[p.assigned_nurse_id]?.full_name||p.assigned_nurse_id||'Unassigned',status:p.discharge_status||'Active',detail:p.primary_condition||'Synthetic patient record',source:p})),
  shipments:workbook.logistics_shipments.map(s=>({id:s.shipment_id,origin:[s.origin_city,s.origin_state].filter(Boolean).join(', '),destination:[s.destination_city,s.destination_state].filter(Boolean).join(', '),item:s.item_description||s.supply_category,quantity:s.quantity,status:s.shipment_status||'Unknown',eta:s.estimated_delivery_utc||'Not available',risk:s.priority||'Moderate',source:s})),
  devices:workbook.medical_devices.map(d=>({id:d.device_id,name:[d.manufacturer,d.model,d.device_type].filter(Boolean).join(' '),facility:hospitalById[d.hospital_id]?.hospital_name||d.hospital_id,unit:d.location_unit,health:d.health_score,status:d.operational_status,ticket:'See service tickets',technician:'Unassigned',source:d})),
  nurses:workbook.nurses.map(n=>({id:n.nurse_id,name:n.full_name,facility:hospitalById[n.hospital_id]?.hospital_name||n.hospital_id,specialty:n.specialty,load:n.current_patient_load,capacity:n.patient_assignment_capacity,status:n.employment_status,source:n})),
  alerts:workbook.resilience_alerts.map(a=>({id:a.alert_id,title:a.title,facility:hospitalById[a.hospital_id]?.hospital_name||a.affected_city||a.hospital_id,severity:a.severity||'Moderate',status:a.alert_status||'Active',type:a.alert_type,source:a})),
  audit:workbook.audit_log?.map(a=>({id:a.audit_id,action:a.action,entity:a.entity_type+' '+a.entity_id,actor:a.performed_by,at:a.event_datetime_utc}))||[],
  operations:{
    therapyEpisodes:workbook.therapy_episodes||[], therapySessions:workbook.therapy_sessions||[],
    nurseAssignments:workbook.nurse_patient_assignment||[], deviceAssignments:workbook.device_patient_assignment||[],
    supplyPlans:workbook.patient_supply_plan||[], shipmentAllocations:workbook.shipment_patient_allocation||[],
    shipmentEvents:workbook.shipment_events||[], inventory:workbook.inventory||[],
    distributionCenters:workbook.distribution_centers||[], suppliers:workbook.suppliers||[],
    alarms:workbook.device_alarms||[], serviceTickets:workbook.service_tickets||[],
    workOrders:workbook.work_orders||[], interventions:workbook.intervention_cases||[],
    recalls:workbook.recall_cases||[], firmwareCampaigns:workbook.firmware_campaigns||[],
    firmwareExecution:workbook.firmware_execution||[], ticketHistory:workbook.ticket_status_history||[],
    riskRegister:workbook.risk_register||[], deviceAssignments:workbook.device_patient_assignment||[]
  },
  meta:{source:'Care Compass Synthetic Data.xlsx',asOf:new Date().toISOString(),preview:true,previewRows:100,sheetCount:32,sheets:Object.keys(workbook)}
}

const roles=['Administrator','Doctor','Nurse','Logistics Manager','Technician','Auditor']
const access={Administrator:['twin','patients','logistics','ops','staff','resilience'],Doctor:['twin','patients','resilience'],Nurse:['patients','staff'],'Logistics Manager':['twin','logistics','resilience'],Technician:['ops','resilience'],Auditor:['twin','patients','logistics','ops','staff','resilience']}
const descriptions={patients:'Review patient risk, care pathways, assignments and intervention status.',logistics:'Monitor supply movements, destination facilities and shipment exceptions.',ops:'Track medical device condition, maintenance and biomedical service dispatch.',staff:'Review nurse availability, specialties, workload and assignments.',resilience:'Manage operational threats, facility disruptions and response status.'}
const scenarios=[
  ['Storm disruption logistics response','3 critical shipments halted · Regional supply continuity','HIGH PRI','logistics',CloudLightning,'rose'],
  ['Missed or delayed patient therapy','Identify affected patients and nearest available nurse','CLINICAL','patients',Syringe,'cyan'],
  ['Medical device abnormal telemetry','Review device condition and dispatch biomedical support','URGENT','ops',Activity,'amber'],
  ['Medical device recall notice','Identify devices and patients requiring audit','AUDIT','ops',PackageX,'violet'],
  ['Firmware security rollout','Review devices pending maintenance cycle','INFRA','ops',Cpu,'teal'],
  ['Multi-facility transfer audit','Review cross-facility movement and compliance','AUDIT','resilience',ArrowLeftRight,'violet']
]
const initials=name=>name.split(' ').map(x=>x[0]).join('').slice(0,2)
const tagTone=v=>/critical|delay|fail|fault/i.test(v)?'red':/high|moderate|warn|monitor|maint/i.test(v)?'amber':'green'


const API_BASE=(import.meta.env.VITE_API_URL||'https://care-compass-fastapi.onrender.com').replace(/\/$/,'')
async function loadDatabase(){
 const names=['hospitals','patients','nurses','medical_devices','logistics_shipments','resilience_alerts','distribution_centers','suppliers','inventory','therapy_episodes','therapy_sessions','nurse_patient_assignment','device_patient_assignment','patient_supply_plan','shipment_patient_allocation','shipment_events','technician_master','device_alarms','service_tickets','work_orders','intervention_cases','recall_cases','firmware_campaigns','firmware_execution','audit_log','ticket_status_history','risk_register']
 const pairs=await Promise.all(names.map(async n=>{const r=await fetch(`${API_BASE}/api/data/${n}?limit=50000`);if(!r.ok)throw Error(`Could not load ${n}: ${r.status}`);return [n,(await r.json()).rows||[]]}))
 const db=Object.fromEntries(pairs), hs=Object.fromEntries(db.hospitals.map(x=>[x.hospital_id,x])), ns=Object.fromEntries(db.nurses.map(x=>[x.nurse_id,x]))
 return {patients:db.patients.map(p=>({id:p.patient_id,name:[p.first_name,p.last_name].filter(Boolean).join(' '),age:p.age,facility:hs[p.hospital_id]?.hospital_name||p.hospital_id,risk:p.acuity_level||'Moderate',care:p.encounter_type||p.primary_condition||'Care pathway',nurse:ns[p.assigned_nurse_id]?.full_name||p.assigned_nurse_id||'Unassigned',status:p.discharge_status||'Active',detail:p.primary_condition||'Synthetic patient record',source:p})),shipments:db.logistics_shipments.map(x=>({id:x.shipment_id,origin:[x.origin_city,x.origin_state].filter(Boolean).join(', '),destination:[x.destination_city,x.destination_state].filter(Boolean).join(', '),item:x.item_description||x.supply_category,quantity:x.quantity,status:x.shipment_status||'Unknown',eta:x.estimated_delivery_utc||'Not available',risk:x.priority||'Moderate',source:x})),devices:db.medical_devices.map(x=>({id:x.device_id,name:[x.manufacturer,x.model,x.device_type].filter(Boolean).join(' '),facility:hs[x.hospital_id]?.hospital_name||x.hospital_id,unit:x.location_unit,health:x.health_score,status:x.operational_status,ticket:'See service tickets',technician:'Unassigned',source:x})),nurses:db.nurses.map(x=>({id:x.nurse_id,name:x.full_name,facility:hs[x.hospital_id]?.hospital_name||x.hospital_id,specialty:x.specialty,load:x.current_patient_load,capacity:x.patient_assignment_capacity,status:x.employment_status,source:x})),alerts:db.resilience_alerts.map(x=>({id:x.alert_id,title:x.title,facility:hs[x.hospital_id]?.hospital_name||x.affected_city||x.hospital_id,severity:x.severity||'Moderate',status:x.alert_status||'Active',type:x.alert_type,source:x})),audit:db.audit_log.map(a=>({id:a.audit_id,action:a.action,entity:a.entity_type+' '+a.entity_id,actor:a.performed_by,at:a.event_datetime_utc})).reverse(),operations:{therapyEpisodes:db.therapy_episodes,therapySessions:db.therapy_sessions,nurseAssignments:db.nurse_patient_assignment,deviceAssignments:db.device_patient_assignment,supplyPlans:db.patient_supply_plan,shipmentAllocations:db.shipment_patient_allocation,shipmentEvents:db.shipment_events,inventory:db.inventory,distributionCenters:db.distribution_centers,suppliers:db.suppliers,alarms:db.device_alarms,serviceTickets:db.service_tickets,workOrders:db.work_orders,interventions:db.intervention_cases,recalls:db.recall_cases,firmwareCampaigns:db.firmware_campaigns,firmwareExecution:db.firmware_execution,ticketHistory:db.ticket_status_history,riskRegister:db.risk_register},meta:{source:'PostgreSQL · Care Compass Synthetic Data',preview:false,sheetCount:32},hospitals:db.hospitals}
}

function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('cc-user')||'null'))
  const [role,setRole]=useState('Administrator')
  const [tab,setTab]=useState('twin')
  const [data,setData]=useState(()=>{const saved=JSON.parse(localStorage.getItem('cc-data')||'null');return saved?{...initial,...saved,operations:{...initial.operations,...(saved.operations||{})}}:initial})
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState('All')
  const [selected,setSelected]=useState(null)
  const [modal,setModal]=useState(null)
  const [toast,setToast]=useState('')
  const [copilot,setCopilot]=useState(false)
  const [typing,setTyping]=useState(false)
  const [prompt,setPrompt]=useState('')
  const [messages,setMessages]=useState([{from:'ai',text:'Hello. I can summarize operational risk, explain linked records, and suggest next steps using the current synthetic Care Compass data.'}])
  const chatEnd=useRef(null)
  const toastTimer=useRef(0)
  const [dbStatus,setDbStatus]=useState('connecting')
  const [dbError,setDbError]=useState('')
  const [refreshKey,setRefreshKey]=useState(0)
  const [scenarioBusy,setScenarioBusy]=useState('')
  const [scenarioResults,setScenarioResults]=useState({})
  const [nurseFilter,setNurseFilter]=useState('All')
  const [logisticsStage,setLogisticsStage]=useState('All')
  const [activeNurseId,setActiveNurseId]=useState(workbook.nurses[0]?.nurse_id||'')
  const [workflowBusy,setWorkflowBusy]=useState(false)
  useEffect(()=>{let live=true;loadDatabase().then(remote=>{if(live){setData(remote);setDbStatus('connected');setDbError('')}}).catch(e=>{if(live){setDbStatus('offline');setDbError(e.message)}});return()=>{live=false}},[refreshKey])
  const refreshDatabase=()=>setRefreshKey(x=>x+1)
  async function runScenario(id){
    setScenarioBusy(id)
    try{
      const response=await fetch(`${API_BASE}/api/scenarios/${id}/execute`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})})
      const result=await response.json()
      if(!response.ok)throw Error(result.error||'Scenario execution failed')
      setScenarioResults(prev=>({...prev,[id]:result}))
      notify(`${id} completed and verified`)
      refreshDatabase()
    }catch(e){setScenarioResults(prev=>({...prev,[id]:{status:'error',message:e.message}}));notify(`${id} failed: ${e.message}`)}
    finally{setScenarioBusy('')}
  }

  const allowed=access[user?.role||role]||access.Administrator
  const current=modules.find(m=>m[0]===tab)||modules[0]
  const navModules=modules.filter(m=>allowed.includes(m[0]))
  const navIndex=Math.max(0,navModules.findIndex(m=>m[0]===tab))
  const log=(action,entity)=>({id:Date.now(),action,entity,actor:user?.name||'Demo Administrator',at:new Date().toISOString()})

  function notify(s){setToast(s);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),2800)}
  function persist(next){setData(next);if(dbStatus!=='connected')localStorage.setItem('cc-data',JSON.stringify(next))}
  function go(id){setTab(id);setQuery('');setFilter('All');setSelected(null);window.scrollTo({top:0,behavior:'smooth'})}
  function signOut(){localStorage.removeItem('cc-user');setUser(null)}
  async function persistWorkflowAction({table,id,patch,action,event}){
    setWorkflowBusy(true)
    try{
      if(dbStatus!=='connected')throw Error('PostgreSQL is offline. Connect the API before saving operational actions.')
      const response=await fetch(`${API_BASE}/api/data/${table}/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json','X-User-Name':user?.name||'Care Compass User','X-User-Role':user?.role||'Nurse'},body:JSON.stringify(patch)})
      const body=await response.json()
      if(!response.ok)throw Error(body.detail?.error||body.error||'Could not save workflow action')
      if(event){const er=await fetch(`${API_BASE}/api/data/shipment_events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({shipment_event_id:'SHE_UI_'+Date.now(),shipment_id:event.shipment_id,event_status:event.event_status,event_datetime_utc:new Date().toISOString(),recorded_by:user?.name||'Logistics Manager',scenario_id:null})});const eb=await er.json();if(!er.ok)throw Error(eb.detail?.error||eb.error||'Shipment event could not be recorded')}
      refreshDatabase();notify(action+' saved to PostgreSQL');setSelected(null)
    }catch(e){notify('Action not saved: '+e.message)}finally{setWorkflowBusy(false)}
  }
  async function update(collection,id,patch,action){
    const map={patients:['patients',p=>({assigned_nurse_id:data.nurses.find(n=>n.name===p.nurse)?.id,discharge_status:p.status})],shipments:['logistics_shipments',p=>({shipment_status:p.status})],devices:['medical_devices',p=>({operational_status:p.status})],nurses:['nurses',p=>({employment_status:p.status})],alerts:['resilience_alerts',p=>({alert_status:p.status})]}[collection]
    try{if(dbStatus==='connected'&&map){const response=await fetch(`${API_BASE}/api/data/${map[0]}/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(map[1](patch))});if(!response.ok)throw Error((await response.json()).error||'Database update failed')}
    const next={...data,[collection]:data[collection].map(x=>x.id===id?{...x,...patch}:x),audit:[log(action,id),...data.audit]};persist(next);setSelected(null);setModal(null);notify(action+(dbStatus==='connected'?' saved to PostgreSQL':' saved locally; database offline'));if(dbStatus==='connected')refreshDatabase()
    }catch(e){notify('Could not save: '+e.message)}
  }
  async function createAlert(){
    const a={alert_id:'ALT-'+Date.now(),hospital_id:(data.hospitals||workbook.hospitals)[0]?.hospital_id,alert_type:'Operational',severity:modal.severity||'Moderate',alert_status:'Active',title:modal.title||'New operational alert',description:'Created from Care Compass UI',affected_city:modal.facility||'Network-wide',affected_state:'NA',affected_zip:'00000',start_datetime_utc:new Date().toISOString(),end_datetime_utc:new Date(Date.now()+86400000).toISOString(),estimated_capacity_impact_pct:0,patients_at_risk:0,related_shipment_id:null,response_action:'Review required',synthetic_record:true,scenario_id:null}
    try{
      if(dbStatus==='connected'){const r=await fetch(`${API_BASE}/api/data/resilience_alerts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)});if(!r.ok)throw Error((await r.json()).error||'Insert failed');refreshDatabase()}
      else persist({...data,alerts:[{id:a.alert_id,title:a.title,facility:a.affected_city,severity:a.severity,status:a.alert_status,type:a.alert_type},...data.alerts]})
      setModal(null);notify('Alert created'+(dbStatus==='connected'?' in PostgreSQL':' in local demo'))
    }catch(e){notify('Could not create alert: '+e.message)}
  }
  function exportCsv(rows,name){
    const keys=Object.keys(rows[0]||{})
    const csv=[keys.join(','),...rows.map(r=>keys.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(','))].join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=name+'.csv';a.click();URL.revokeObjectURL(a.href)
  }
  function ask(){
    if(!prompt.trim())return
    const q=prompt
    setMessages(m=>[...m,{from:'user',text:q}])
    let answer='I found '+data.alerts.filter(a=>a.status==='Active').length+' active alerts, '+data.patients.filter(p=>p.risk==='Critical'||p.risk==='High').length+' high/critical-risk patients, and '+data.shipments.filter(s=>s.status==='Delayed').length+' delayed shipments. Prioritize critical patient interventions, then confirm affected supply routes. This is a rule-based demo response, not a clinical decision.'
    if(/shipment|logistic|delivery/i.test(q))answer=`There are ${data.shipments.filter(s=>s.status==='Delayed').length} delayed shipments. ${data.shipments.filter(s=>s.status==='Delayed').map(s=>s.id+' to '+s.destination).join('; ')||'No delayed shipments currently.'} Review destination stock before rerouting.`
    if(/nurse|staff/i.test(q))answer=`${data.nurses.filter(n=>n.status==='Available').length} nurses are marked available. Review specialty and workload before reassignment.`
    if(/patient|risk/i.test(q))answer=`${data.patients.filter(p=>p.risk==='Critical'||p.risk==='High').map(p=>p.name+' ('+p.risk+')').join(', ')||'No high-risk patients in this demo dataset.'}`
    setPrompt('');setTyping(true)
    setTimeout(()=>{setTyping(false);setMessages(m=>[...m,{from:'ai',text:answer}])},700)
  }

  /* Motion plumbing: pointer spotlight on .spot elements, scroll reveal for .reveal elements. */
  useEffect(()=>{
    const move=e=>{
      const el=e.target.closest?.('.spot');if(!el)return
      const r=el.getBoundingClientRect()
      el.style.setProperty('--mx',(e.clientX-r.left)+'px')
      el.style.setProperty('--my',(e.clientY-r.top)+'px')
    }
    document.addEventListener('pointermove',move,{passive:true})
    return()=>document.removeEventListener('pointermove',move)
  },[])
  useEffect(()=>{
    const els=[...document.querySelectorAll('.reveal:not(.in)')]
    if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -6% 0px'})
    els.forEach(e=>io.observe(e))
    return()=>io.disconnect()
  },[tab,user,data.alerts.length])
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages,typing,copilot])
  useEffect(()=>{
    const esc=e=>{if(e.key==='Escape'){setSelected(null);setModal(null)}}
    window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc)
  },[])

  const rows=tab==='patients'?data.patients:tab==='logistics'?data.shipments:tab==='ops'?data.devices:tab==='staff'?data.nurses:tab==='resilience'?data.alerts:[]
  const nurseAssignments=data.operations.nurseAssignments.filter(a=>a.nurse_id===activeNurseId&&a.active_status===true)
  const assignedPatientIds=new Set(nurseAssignments.map(a=>a.patient_id))
  const assignedNursePatients=data.patients.filter(p=>assignedPatientIds.has(p.id))
  const nurseSessions=data.operations.therapySessions.filter(s=>assignedPatientIds.has(s.patient_id))
  const nurseAlerts=data.operations.riskRegister.filter(r=>r.severity==='Critical'||r.severity==='High').map(r=>({...r,id:r.risk_id,title:r.risk_type,severity:r.severity,facility:(data.hospitals||workbook.hospitals).find(h=>h.hospital_id===r.hospital_id)?.hospital_name||r.hospital_id,type:'Patient risk',status:r.status,patient:data.patients.find(p=>p.id===r.patient_id)?.name||r.patient_id}))
  const activeNurseInterventions=data.operations.interventions.filter(x=>x.assigned_nurse_id===activeNurseId&&!/completed|closed/i.test(x.status||''))
  const stockExceptions=data.operations.inventory.filter(x=>Number(x.available_qty??x.on_hand_qty??0)<=Number(x.reorder_threshold??0))
  const visible=useMemo(()=>rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(query.toLowerCase())).filter(r=>filter==='All'||r.risk===filter||r.status===filter||r.severity===filter),[rows,query,filter])
  const activeAlerts=data.alerts.filter(a=>a.status==='Active').length
  const highRisk=data.patients.filter(p=>['High','Critical'].includes(p.risk)).length
  const delayed=data.shipments.filter(s=>s.status==='Delayed').length
  const share=(v,t)=>t?Math.min(100,Math.round(v/t*100)):0
  const kpis=[
    ['Active patients',data.patients.length,Users,'blue',100],
    ['High-risk patients',highRisk,HeartPulse,'red',share(highRisk,data.patients.length)],
    ['Delayed shipments',delayed,Truck,'amber',share(delayed,data.shipments.length)],
    ['Active alerts',activeAlerts,AlertTriangle,'purple',share(activeAlerts,data.alerts.length)]
  ]
  const telemetry=[
    ['FACILITIES',(data.hospitals||workbook.hospitals).length,'Network nodes',Building2,false],
    ['ACTIVE CENSUS',data.patients.length,'Patient records',UserRound,false],
    ['CRITICAL ALERTS',data.alerts.filter(a=>a.severity==='Critical'||a.severity==='High').length,'Requires review',AlertTriangle,true],
    ['FIELD NURSES',data.nurses.length,'Care workforce',Stethoscope,false],
    ['PENDING THERAPIES',data.patients.filter(p=>/active|ongoing/i.test(p.status)).length,'Active care records',Syringe,false],
    ['DELAYED SHIPMENTS',data.shipments.filter(s=>/delay/i.test(s.status)).length,'Supply exceptions',Truck,true],
    ['DEVICE ATTENTION',data.devices.filter(d=>/fault|alarm|maintenance|critical/i.test(String(d.status))).length,'Service review',Cpu,false],
    ['RESILIENCE ALERT',activeAlerts,'Active events',ShieldAlert,true]
  ]

  if(!user)return <>
    <Background/>
    <Login role={role} setRole={setRole} roles={roles} onEnter={name=>{const u={name,role};setUser(u);localStorage.setItem('cc-user',JSON.stringify(u));setTab(access[role][0])}}/>
  </>

  const heads=tab==='patients'?['Patient','Facility','Risk','Care pathway','Assigned nurse','Status']:tab==='logistics'?['Shipment','Origin','Destination','Supply','Quantity','Status','ETA']:tab==='ops'?['Device','Facility','Unit','Health score','Status','Ticket','Technician']:tab==='staff'?['Nurse','Facility','Specialty','Workload','Status']:['Alert','Facility','Type','Severity','Status']
  const cells=r=>tab==='patients'?[<><b>{r.name}</b><small>{r.id} · {r.age} years</small></>,r.facility,<span className={'tag '+(r.risk==='Critical'?'red':r.risk==='High'?'amber':'green')}>{r.risk}</span>,r.care,r.nurse,r.status]
    :tab==='logistics'?[<b>{r.id}</b>,r.origin,r.destination,r.item,r.quantity,<span className={'tag '+(r.status==='Delayed'?'red':'green')}>{r.status}</span>,r.eta]
    :tab==='ops'?[<><b>{r.name}</b><small>{r.id}</small></>,r.facility,r.unit,<span className="health"><i style={{'--w':Math.max(0,Math.min(100,Number(r.health)||0))+'%'}}/>{r.health}%</span>,<span className="tag">{r.status}</span>,r.ticket,r.technician]
    :tab==='staff'?[<><b>{r.name}</b><small>{r.id}</small></>,r.facility,r.specialty,<span className="health"><i style={{'--w':Math.min(100,share(Number(r.load)||0,Number(r.capacity)||0))+'%'}}/>{r.load}/{r.capacity}</span>,<span className="tag">{r.status}</span>]
    :[<><b>{r.title}</b><small>{r.id}</small></>,r.facility,r.type,<span className={'tag '+(r.severity==='Critical'?'red':'amber')}>{r.severity}</span>,r.status]

  return <div className="shell" data-tab={tab}>
    <Background/>

    <aside className="sidebar" style={{'--idx':navIndex,'--n':navModules.length}}>
      <div className="brand"><div className="brand-mark pulse"><HeartPulse/></div><div><b>Care Compass</b><small>INTEGRATED HEALTH NETWORK</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <div className="nav-list">
        <i className="nav-pill"/>
        {navModules.map(([id,label,Icon])=><button key={id} className={'nav '+(tab===id?'active':'')} onClick={()=>go(id)}><Icon size={18}/>{label}<span>{id==='resilience'&&activeAlerts?<em className="count-badge">{activeAlerts}</em>:''}</span></button>)}
      </div>
      <div className="sidebar-bottom">
        <div className="user-chip"><div className="avatar">{initials(user.name)}</div><div><b>{user.name}</b><small>{user.role}</small></div></div>
        <button className="nav signout" onClick={signOut}><LogOut size={17}/> Sign out</button>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="crumb"><span>Care Compass</span><ChevronRight size={14}/><b>{current[1]}</b></div>
        <div className="top-actions">
          <span className="live"><i/> {dbStatus==='connected'?'POSTGRESQL LIVE':dbStatus==='connecting'?'CONNECTING':'LOCAL DEMO'}</span>
          <button className="icon-button" aria-label="Operations Copilot" onClick={()=>setCopilot(!copilot)}><Brain size={18}/></button>
          <button className="icon-button" aria-label="Alerts" onClick={()=>notify(activeAlerts+' active alerts')}><Bell size={18}/>{activeAlerts>0&&<em className="dot-badge"/>}</button>
          <button className="icon-button only-compact" aria-label="Sign out" onClick={signOut}><LogOut size={17}/></button>
          <div className="avatar small">{initials(user.name)}</div>
        </div>
      </header>

      <div className="content" key={tab}>
        <div className="page-heading rise" style={{'--i':0}}>
          <div>
            <div className="eyebrow">NETWORK OPERATIONS / {current[1].toUpperCase()}</div>
            <h1>{tab==='twin'?<>Good morning, <span className="grad-text">{user.name.split(' ')[0]}</span></>:current[1]}</h1>
            <p>{tab==='twin'?'Here is the current operational picture across your connected care network.':descriptions[tab]}</p>
            {tab==='twin'&&<EcgLine className="hero-ecg"/>}
          </div>
          <div className="heading-actions">
            <span className="date-pill"><Clock size={15}/> {new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</span>
            <button className="secondary" onClick={()=>exportCsv(rows.length?rows:data.audit,tab+'-export')}><Download size={15}/> Export</button>
          </div>
        </div>


        {user.role==='Nurse'&&tab==='patients'?<section className="workflow-page">
          <div className="workflow-banner"><div><span className="eyebrow">NURSE SPARK · CARE RESPONSE</span><h2>Assigned care & patient safety</h2><p>Select the nurse identity for this demo, review assigned patients and move each intervention through its response lifecycle.</p></div><span className="tag red">{nurseAlerts.length} HIGH-RISK CASES</span></div>
          <div className="form-stack"><label>Demo nurse identity</label><select value={activeNurseId} onChange={e=>setActiveNurseId(e.target.value)}>{data.nurses.map(n=><option key={n.id} value={n.id}>{n.name} · {n.id} · {n.facility}</option>)}</select></div>
          <div className="workflow-kpis"><div><small>ASSIGNED PATIENTS</small><strong>{assignedNursePatients.length}</strong></div><div><small>HIGH / CRITICAL RISKS</small><strong>{nurseAlerts.filter(r=>assignedPatientIds.has(r.patient_id)).length}</strong></div><div><small>OPEN INTERVENTIONS</small><strong>{activeNurseInterventions.length}</strong></div></div>
          <div className="panel"><div className="panel-head"><div><h2><AlertTriangle/> Nurse Spark alert queue</h2><p>Risk-register cases linked to this nurse's active patient assignments.</p></div><select value={nurseFilter} onChange={e=>setNurseFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option></select></div>
            {nurseAlerts.filter(r=>assignedPatientIds.has(r.patient_id)).filter(r=>nurseFilter==='All'||r.severity===nurseFilter).slice(0,15).map(r=><div className="workflow-alert" key={r.id}><div className={'severity '+r.severity.toLowerCase()}/><div className="grow"><b>{r.title} · {r.patient}</b><small>{r.id} · {r.facility} · {r.status}</small></div><span className={'tag '+tagTone(r.severity)}>{r.severity}</span><button className="primary" onClick={()=>setSelected({type:'nurse-risk',record:r})}>Respond</button></div>)}
            {!nurseAlerts.some(r=>assignedPatientIds.has(r.patient_id))&&<p className="empty">No high-priority risk-register cases are linked to this nurse.</p>}
          </div>
          <div className="panel"><div className="panel-head"><div><h2><HeartPulse/> My assigned patients</h2><p>Active assignments from nurse_patient_assignment.</p></div><span className="tag green">{assignedNursePatients.length} ASSIGNED</span></div>
            {assignedNursePatients.slice(0,20).map(p=><div className="workflow-alert" key={p.id}><div className="grow"><b>{p.name}</b><small>{p.id} · {p.facility} · {p.care}</small></div><span className={'tag '+tagTone(p.risk)}>{p.risk}</span><button className="secondary" onClick={()=>setSelected({type:'patients',record:p})}>Patient profile</button></div>)}
          </div>
          <div className="panel"><div className="panel-head"><div><h2><Clock/> Therapy & visit schedule</h2><p>Update appointment outcomes for patients assigned to the selected nurse.</p></div><span className="tag green">{nurseSessions.length} SESSIONS</span></div>
            {nurseSessions.slice(0,15).map(s=><div className="workflow-alert" key={s.session_id}><div className="grow"><b>{s.patient_id} · {new Date(s.scheduled_datetime_utc).toLocaleString()}</b><small>{s.session_id} · {s.delivery_mode}</small></div><span className="tag amber">{s.session_status}</span><button className="secondary" onClick={()=>setSelected({type:'nurse-session',record:s})}>Update visit</button></div>)}
            {!nurseSessions.length&&<p className="empty">No therapy sessions are linked to this nurse's active patient assignments.</p>}
          </div>
          <div className="panel"><div className="panel-head"><div><h2><Stethoscope/> Intervention work queue</h2><p>Acknowledge, start response, attend and complete care interventions.</p></div></div>
            {activeNurseInterventions.slice(0,20).map(x=><div className="workflow-alert" key={x.intervention_id}><div className="grow"><b>{x.intervention_type}</b><small>{x.intervention_id} · {x.patient_id} · Risk {x.risk_level}</small></div><span className="tag amber">{x.status}</span><button className="secondary" onClick={()=>setSelected({type:'nurse-intervention',record:x})}>Open task</button></div>)}
            {!activeNurseInterventions.length&&<p className="empty">No open interventions assigned to this nurse.</p>}
          </div>
        </section>:user.role==='Logistics Manager'&&tab==='logistics'?<section className="workflow-page">
          <div className="workflow-banner"><div><span className="eyebrow">SMART LOGISTICS · SUPPLY CONTINUITY</span><h2>Inventory & shipment operations</h2><p>Identify stock below reorder threshold, choose an operational distribution centre, approve rerouting and confirm delivery.</p></div><span className="tag amber">{stockExceptions.length} STOCK EXCEPTIONS</span></div>
          <div className="workflow-kpis"><div><small>SHIPMENTS</small><strong>{data.shipments.length}</strong></div><div><small>DELAYED / EXCEPTION</small><strong>{data.shipments.filter(s=>/delay|exception/i.test(s.status)).length}</strong></div><div><small>LOW-STOCK ITEMS</small><strong>{stockExceptions.length}</strong></div></div>
          <div className="panel"><div className="panel-head"><div><h2><PackageX/> Inventory exceptions</h2><p>Available quantity compared with configured reorder threshold.</p></div></div>
            {stockExceptions.slice(0,15).map(item=><div className="workflow-alert" key={item.inventory_id}><div className="grow"><b>{item.item_name}</b><small>{item.distribution_center_id} · Available {item.available_qty} · Reorder threshold {item.reorder_threshold}</small></div><span className="tag red">REPLENISH</span></div>)}
            {!stockExceptions.length&&<p className="empty">No inventory rows are currently below reorder threshold.</p>}
          </div>
          <div className="panel"><div className="panel-head"><div><h2><Truck/> Shipment control tower</h2><p>Manage status, route assignment and delivery events.</p></div><select value={logisticsStage} onChange={e=>setLogisticsStage(e.target.value)}><option>All</option>{[...new Set(data.shipments.map(s=>s.status))].map(s=><option key={s}>{s}</option>)}</select></div>
            {data.shipments.filter(s=>logisticsStage==='All'||s.status===logisticsStage).slice(0,25).map(s=><div className="workflow-alert" key={s.id}><div className="grow"><b>{s.id} · {s.item}</b><small>{s.origin} → {s.destination} · Qty {s.quantity} · ETA {s.eta}</small></div><span className={'tag '+tagTone(s.status)}>{s.status}</span><button className="secondary" onClick={()=>setSelected({type:'logistics',record:s})}>Manage</button></div>)}
          </div>
        </section>:null}

        {tab==='twin'?<>
          <div className="data-notice rise" style={{'--i':1}}><b>{dbStatus==='connected'?'PostgreSQL connected':'Database '+dbStatus}</b><span>{dbStatus==='connected'?'Live records loaded from all operational tables.':dbStatus==='connecting'?'Connecting to Care Compass API…':`Local preview mode. ${dbError} Start the API and refresh.`} Coordinates are approximate and not for navigation.</span><button className="text-button" onClick={refreshDatabase}>Refresh</button></div>

          <div className="kpi-grid">
            {kpis.map(([label,value,Icon,tone,pct],i)=><div key={label} className={'kpi-card spot rise '+tone} style={{'--i':i+2,'--pct':pct+'%'}}>
              <div className={'kpi-icon '+tone}><Icon size={19}/></div>
              <span>{label}</span>
              <strong><CountUp value={value}/></strong>
              <small>dbStatus==='connected'?'Live PostgreSQL records':'Based on local preview records'</small>
              <i className="kpi-bar"><b/></i>
            </div>)}
          </div>

          <section className="telemetry-section reveal">
            <div className="section-title"><h2>Network Telemetry (Unified)</h2><span className="tag green">{(data.hospitals||workbook.hospitals).length} CORE NODES</span></div>
            <div className="telemetry-grid">
              {telemetry.map(([label,value,sub,Icon,danger],i)=><div key={label} className="telemetry-card spot rise" style={{'--i':i}}>
                <div>{label}<span><Icon size={15}/></span></div>
                <strong className={danger?'danger-text':''}><CountUp value={value}/></strong>
                <small>{sub}</small>
              </div>)}
            </div>
          </section>

          <section className="scenario-panel reveal">
            <div className="section-title"><h2>Operational Scenarios (6 Primaries)</h2><span className="eyebrow">ACTION CENTER</span></div>
            {scenarios.map(([title,sub,tag,target,Icon,tone],i)=><div key={title} className={'scenario-row spot rise t-'+tone} style={{'--i':i}} onClick={()=>go(target)}>
              <div className="scenario-icon"><Icon size={18}/></div>
              <div className="scenario-copy"><b>Scenario {i+1}: {title}</b><small>{sub}</small></div>
              <span className="scenario-tag">{tag}</span>
              <button className="scenario-action" onClick={e=>{e.stopPropagation();go(target)}}>Review <ChevronRight size={13}/></button>
            </div>)}
          </section>

          <section className="panel reveal" style={{marginTop:20}}>
            <div className="panel-head"><div><h2><Activity/> Golden Scenario Runner</h2><p>Execute and verify the five documented workflows against PostgreSQL records and linked history.</p></div><span className="tag green">SCN1–SCN5</span></div>
            <div className="scenario-runner">
              {[
                ['SCN1','Storm Disruption','Supply plan → allocation → alternate distribution centre → reroute → delivery'],
                ['SCN2','Missed Therapy','Missed session → deactivate old nurse → replacement assignment → completed intervention'],
                ['SCN3','Device Failure','Device alarm → service ticket → technician → closed work order'],
                ['SCN4','Device Recall','Recall → patient assignment → critical risk → intervention → closed work order'],
                ['SCN5','Firmware Update Campaign','20 device executions → 20 individual audit entries']
              ].map(([id,name,flow])=><div key={id} className="scenario-row">
                <div className="scenario-copy"><b>{id}: {name}</b><small>{flow}</small>
                {scenarioResults[id]&&<><small className={scenarioResults[id].status==='error'?'danger-text':'tag green'}>{scenarioResults[id].status==='error'?scenarioResults[id].message:`${scenarioResults[id].checks?.filter(c=>c.ok).length||0} checks passed`}</small>{scenarioResults[id].checks?.map((c,ix)=><small key={ix} className={c.ok?'scenario-check-ok':'danger-text'}>{c.ok?'✓':'✕'} {c.step}</small>)}{scenarioResults[id].warnings?.map((w,ix)=><small key={'w'+ix} className="scenario-warning">⚠ {w}</small>)}</>}</div>
                <button className="primary" disabled={scenarioBusy!==''||dbStatus!=='connected'} onClick={()=>runScenario(id)}>{scenarioBusy===id?'Running…':scenarioResults[id]?.status==='completed'?'Verify again':'Run & verify'}</button>
              </div>)}
            </div>
          </section>

          <section className="facility-panel reveal">
            <div className="section-title"><h2>Facility Operations Status</h2><span className="eyebrow">{(data.hospitals||workbook.hospitals).length} FACILITIES</span></div>
            <div className="facility-grid">
              {(data.hospitals||workbook.hospitals).slice(0,4).map((h,i)=>{
                const occ=Number(h.occupancy_rate||0)
                const bar=occ>=.9?'red-bar':occ>=.8?'amber-bar':'green-bar'
                return <div key={h.hospital_id} className="facility-row spot rise" style={{'--i':i,'--occ':Math.round(occ*100)+'%'}}>
                  <i className={bar}/>
                  <div><b>{h.hospital_name}</b><small>{h.city||''}{h.state?', '+h.state:''} · {h.hospital_type||'Care facility'}</small><u className={'occ-track '+bar}><s/></u></div>
                  <span>{Math.round(occ*100)}% OCC</span>
                </div>
              })}
            </div>
          </section>

          <div className="grid-main">
            <section className="panel map-panel reveal">
              <div className="panel-head"><div><h2><MapPin/> GIS Live Vector Twin</h2><p>Facilities, shipments, nurses and active resilience events</p></div><span className="tag green">GIS LAYER</span></div>
              <NetworkMap hospitals={data.hospitals||workbook.hospitals}/>
            </section>
            <section className="panel reveal">
              <div className="panel-head"><div><h2><AlertTriangle/> Attention queue</h2><p>Items requiring operational review</p></div><span className="tag red">{activeAlerts} ACTIVE</span></div>
              {data.alerts.slice(0,4).map((a,i)=><div key={a.id} className="alert-row" style={{'--i':i}}><div className={'severity '+a.severity.toLowerCase()}/><div className="grow"><b>{a.title}</b><small>{a.facility} · {a.type}</small></div><span className={'tag '+tagTone(a.severity)}>{a.severity}</span></div>)}
            </section>
          </div>

          <section className="panel reveal">
            <div className="panel-head"><div><h2><Command/> Operational activity</h2><p>Recent auditable actions across modules</p></div><button className="text-button" onClick={()=>go('resilience')}>View alerts <ArrowUpRight size={15}/></button></div>
            {data.audit.slice(0,5).map((a,i)=><div key={a.id+'-'+i} className="audit-row" style={{'--i':i}}><CheckCircle2 size={16}/><div><b>{a.action}</b><small>{a.entity} · {a.actor}</small></div><time>{new Date(a.at).toLocaleTimeString()}</time></div>)}
          </section>
        </>:<>
          <div className="toolbar rise" style={{'--i':1}}>
            <div className="search"><Search size={17}/><input placeholder={'Search '+current[1].toLowerCase()+'...'} value={query} onChange={e=>setQuery(e.target.value)}/></div>
            <select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{[...new Set(rows.flatMap(r=>[r.status,r.risk,r.severity]).filter(Boolean))].map(x=><option key={x}>{x}</option>)}</select>
            {tab==='resilience'&&<button className="primary shine" onClick={()=>setModal({kind:'alert'})}><Plus size={16}/> Create alert</button>}
          </div>
          <div className="table-panel rise" style={{'--i':2}}>
            <div className="table-title"><div><h2>{current[1]} register</h2><p>{visible.length} records · searchable synthetic operational data</p></div><button className="secondary" onClick={()=>exportCsv(visible,tab+'-records')}><Download size={15}/> CSV</button></div>
            <div className="table-scroll">
              <table>
                <thead><tr>{heads.map(h=><th key={h}>{h}</th>)}<th>Action</th></tr></thead>
                <tbody>{visible.map((r,ri)=><tr key={r.id} style={{'--i':ri}}>{cells(r).map((v,ci)=><td key={ci}>{v}</td>)}<td><button className="row-action" onClick={()=>setSelected({type:tab,record:r})}>Open <ChevronRight size={14}/></button></td></tr>)}</tbody>
              </table>
              {!visible.length&&<div className="empty">No records match your search.</div>}
            </div>
          </div>
          <section className="panel reveal" style={{marginTop:22}}>
            <div className="panel-head"><div><h2><Activity/> Connected operations workbench</h2><p>Related source datasets available for this module. Preview rows are shown; full records require database import.</p></div><span className="tag green">32-SHEET SOURCE</span></div>
            <div className="telemetry-grid">
              {(tab==='patients'?[
                ['Therapy episodes',data.operations.therapyEpisodes,'therapy_episode_id'],
                ['Therapy sessions',data.operations.therapySessions,'therapy_session_id'],
                ['Nurse assignments',data.operations.nurseAssignments,'assignment_id'],
                ['Patient supply plans',data.operations.supplyPlans,'supply_plan_id'],
                ['Interventions',data.operations.interventions,'intervention_id'],
                ['Risk register',data.operations.riskRegister,'risk_id']
              ]:tab==='logistics'?[
                ['Distribution centres',data.operations.distributionCenters,'distribution_center_id'],
                ['Inventory records',data.operations.inventory,'inventory_id'],
                ['Suppliers',data.operations.suppliers,'supplier_id'],
                ['Patient allocations',data.operations.shipmentAllocations,'allocation_id'],
                ['Shipment events',data.operations.shipmentEvents,'shipment_event_id'],
                ['Patient supply plans',data.operations.supplyPlans,'supply_plan_id']
              ]:tab==='ops'?[
                ['Device alarms',data.operations.alarms,'alarm_id'],
                ['Service tickets',data.operations.serviceTickets,'ticket_id'],
                ['Work orders',data.operations.workOrders,'work_order_id'],
                ['Device-patient links',data.operations.deviceAssignments,'assignment_id'],
                ['Recall cases',data.operations.recalls,'recall_id'],
                ['Firmware executions',data.operations.firmwareExecution,'execution_id']
              ]:tab==='staff'?[
                ['Nurse assignments',data.operations.nurseAssignments,'assignment_id'],
                ['Therapy sessions',data.operations.therapySessions,'therapy_session_id'],
                ['Therapy episodes',data.operations.therapyEpisodes,'therapy_episode_id'],
                ['Interventions',data.operations.interventions,'intervention_id']
              ]:[
                ['Risk register',data.operations.riskRegister,'risk_id'],
                ['Interventions',data.operations.interventions,'intervention_id'],
                ['Shipment events',data.operations.shipmentEvents,'shipment_event_id'],
                ['Device alarms',data.operations.alarms,'alarm_id'],
                ['Service tickets',data.operations.serviceTickets,'ticket_id'],
                ['Work orders',data.operations.workOrders,'work_order_id']
              ]).map(([label,items,idKey])=><div className="telemetry-card" key={label}><div>{label}<span><Activity size={15}/></span></div><strong><CountUp value={items?.length||0}/></strong><small>Preview records available</small>{items?.slice(0,3).map((item,i)=><small key={i} style={{display:'block',marginTop:5}}>{item[idKey]||Object.values(item)[0]||'Source record'}</small>)}</div>)}
            </div>
          </section>
        </>}

        <footer>CARE COMPASS · SYNTHETIC DATA ENVIRONMENT <span>Role: {user.role} · {dbStatus==='connected'?'Changes sync to PostgreSQL':'Local demo mode'}</span></footer>
      </div>
    </main>

    <nav className="bottom-nav" style={{'--idx':navIndex,'--n':navModules.length}}>
      <i className="dock-pill"/>
      {navModules.map(([id,,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><Icon size={18}/><span>{shortLabel[id]}</span></button>)}
    </nav>

    {selected&&<div className="overlay" onClick={()=>setSelected(null)}><div className="drawer" onClick={e=>e.stopPropagation()}>
      <div className="drawer-head"><div><div className="eyebrow">RECORD DETAILS</div><h2>{selected.record.name||selected.record.title||selected.record.id}</h2></div><button className="icon-button" aria-label="Close" onClick={()=>setSelected(null)}><X/></button></div>
      <div className="detail-list">{Object.entries(selected.record).map(([k,v],i)=>v&&typeof v==='object'
        ?<div key={k} className="full" style={{'--i':i}}><small>{k.replaceAll('_',' ')} record</small><dl className="kv">{Object.entries(v).map(([a,b])=><div key={a}><dt>{a.replaceAll('_',' ')}</dt><dd>{String(b)}</dd></div>)}</dl></div>
        :<div key={k} style={{'--i':i}}><small>{k.replaceAll('_',' ')}</small><b>{String(v)}</b></div>)}</div>
      {selected.type==='nurse-risk'&&<div className="form-stack"><div className="tag red">NURSE SPARK · RISK RESPONSE</div><label>Risk status</label><select id="riskResponseStatus" defaultValue={selected.record.status}><option>Open</option><option>Monitoring</option><option>Escalated</option><option>Closed</option></select><button className="primary shine" disabled={workflowBusy} onClick={()=>persistWorkflowAction({table:'risk_register',id:selected.record.id,patch:{status:document.getElementById('riskResponseStatus').value},action:'Updated patient risk response'})}>{workflowBusy?'Saving…':'Save risk response'}</button></div>}
      {selected.type==='nurse-session'&&<div className="form-stack"><div className="tag teal">THERAPY SESSION</div><label>Visit outcome</label><select id="therapyStatus" defaultValue={selected.record.session_status}><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Missed</option><option>Cancelled</option></select><button className="primary shine" disabled={workflowBusy} onClick={()=>persistWorkflowAction({table:'therapy_sessions',id:selected.record.session_id,patch:{session_status:document.getElementById('therapyStatus').value},action:'Updated therapy session'})}>{workflowBusy?'Saving…':'Save visit outcome'}</button></div>}
      {selected.type==='nurse-intervention'&&<div className="form-stack"><div className="tag amber">CARE INTERVENTION</div><label>Intervention status</label><select id="interventionStatus" defaultValue={selected.record.status}><option>Assigned</option><option>Acknowledged</option><option>In Progress</option><option>Completed</option><option>Escalated</option></select><button className="primary shine" disabled={workflowBusy} onClick={()=>persistWorkflowAction({table:'intervention_cases',id:selected.record.intervention_id,patch:{status:document.getElementById('interventionStatus').value},action:'Updated nurse intervention'})}>{workflowBusy?'Saving…':'Save intervention status'}</button></div>}
      {selected.type==='patients'&&<div className="form-stack"><label>Reassign nurse</label><select id="nurseChoice">{data.nurses.map(n=><option key={n.id} value={n.name}>{n.name} · {n.status} · {n.load}/{n.capacity}</option>)}</select><button className="primary shine" onClick={()=>update('patients',selected.record.id,{nurse:document.getElementById('nurseChoice').value,status:'Reassigned'},'Reassigned patient nurse')}>Confirm reassignment</button></div>}
      {selected.type==='logistics'&&<div className="panel" style={{marginTop:16}}><div className="panel-head"><div><h2>Shipment event history</h2><p>Recorded logistics milestones from PostgreSQL.</p></div></div>{data.operations.shipmentEvents.filter(e=>e.shipment_id===selected.record.id).sort((a,b)=>new Date(a.event_datetime_utc)-new Date(b.event_datetime_utc)).map(e=><div className="workflow-alert" key={e.shipment_event_id}><div className="grow"><b>{e.event_status}</b><small>{new Date(e.event_datetime_utc).toLocaleString()} · {e.recorded_by}</small></div></div>)}</div>}
      {selected.type==='logistics'&&<div className="form-stack"><div className="tag amber">SHIPMENT OPERATIONS</div><label>Distribution centre</label><select id="shipmentDc" defaultValue={selected.record.source?.distribution_center_id||''}>{data.operations.distributionCenters.filter(dc=>dc.operational_status==='Operational').map(dc=><option key={dc.distribution_center_id} value={dc.distribution_center_id}>{dc.name} · {dc.city}, {dc.state}</option>)}</select><label>Shipment status</label><select id="shipmentStatus" defaultValue={selected.record.status}><option>Created</option><option>In Transit</option><option>Delayed</option><option>Rerouted</option><option>Delivered</option></select><button className="primary shine" disabled={workflowBusy} onClick={()=>{const status=document.getElementById('shipmentStatus').value;const dc=document.getElementById('shipmentDc').value;persistWorkflowAction({table:'logistics_shipments',id:selected.record.id,patch:{shipment_status:status,distribution_center_id:dc,...(status==='Delivered'?{actual_delivery_utc:new Date().toISOString()}:{})},action:'Shipment '+status,event:{shipment_id:selected.record.id,event_status:status==='Delivered'?'Delivered':status==='Rerouted'?'Rerouted':status}})}}>{workflowBusy?'Saving…':'Approve shipment update'}</button></div>}
      {selected.type==='ops'&&<div className="form-stack"><label>Assign technician</label><input id="techName" placeholder="Technician name" defaultValue="R. Patel"/><button className="primary shine" onClick={()=>update('devices',selected.record.id,{technician:document.getElementById('techName').value,status:'Service dispatched'},'Dispatched biomedical technician')}>Dispatch technician</button></div>}
      {selected.type==='staff'&&<div className="form-stack"><label>Update availability</label><select id="nurseStatus"><option>Available</option><option>On duty</option><option>Off duty</option><option>Delayed</option></select><button className="primary shine" onClick={()=>update('nurses',selected.record.id,{status:document.getElementById('nurseStatus').value},'Updated nurse availability')}>Save availability</button></div>}
      {selected.type==='resilience'&&<div className="form-stack"><label>Alert status</label><select id="alertStatus"><option>Active</option><option>Monitoring</option><option>Resolved</option></select><button className="primary shine" onClick={()=>update('alerts',selected.record.id,{status:document.getElementById('alertStatus').value},'Updated resilience alert')}>Update alert</button></div>}
    </div></div>}

    {modal?.kind==='alert'&&<div className="overlay centered" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="drawer-head"><h2>Create resilience alert</h2><button className="icon-button" aria-label="Close" onClick={()=>setModal(null)}><X/></button></div>
      <div className="form-stack"><label>Alert title</label><input placeholder="Describe the operational event" onChange={e=>setModal(m=>({...m,title:e.target.value}))}/><label>Facility</label><input placeholder="Facility or network-wide" onChange={e=>setModal(m=>({...m,facility:e.target.value}))}/><label>Severity</label><select onChange={e=>setModal(m=>({...m,severity:e.target.value}))}><option>Moderate</option><option>High</option><option>Critical</option></select><button className="primary shine" onClick={createAlert}>Create alert</button></div>
    </div></div>}

    {copilot&&<div className="copilot">
      <div className="copilot-head"><div><Brain size={18}/> <b>Operations Copilot</b><small>Rule-based demo assistant</small></div><button className="icon-button" aria-label="Close copilot" onClick={()=>setCopilot(false)}><X/></button></div>
      <div className="chat-messages">{messages.map((m,i)=><div key={i} className={'message '+m.from}>{m.text}</div>)}{typing&&<div className="message ai typing"><i/><i/><i/></div>}<div ref={chatEnd}/></div>
      <form onSubmit={e=>{e.preventDefault();ask()}}><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ask about patients, shipments, staffing..."/><button className="primary" aria-label="Send"><Send size={16}/></button></form>
    </div>}

    {toast&&<div className="toast" key={toast}><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}
export default App
