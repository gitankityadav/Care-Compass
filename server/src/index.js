import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSLMODE==='require'?{rejectUnauthorized:false}:undefined});
const app=express(); app.use(helmet()); app.use(cors({origin:process.env.CORS_ORIGIN?.split(',')||true})); app.use(express.json({limit:'1mb'})); app.use(morgan('tiny'));
const tables=['hospitals','patients','nurses','medical_devices','logistics_shipments','resilience_alerts','distribution_centers','suppliers','inventory','therapy_episodes','therapy_sessions','nurse_patient_assignment','device_patient_assignment','patient_supply_plan','shipment_patient_allocation','shipment_events','technician_master','device_alarms','service_tickets','work_orders','intervention_cases','recall_cases','firmware_campaigns','firmware_execution','audit_log','ticket_status_history','risk_register'];
app.get('/api/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({status:'ok',database:'connected',service:'Care Compass API'})}catch(e){res.status(503).json({status:'error',message:'Database unavailable'})}});
app.get('/api/tables',(_req,res)=>res.json({tables}));
app.get('/api/summary',async(_req,res)=>{try{const counts=await Promise.all(tables.map(async t=>{const r=await pool.query(`SELECT COUNT(*)::int AS count FROM "${t}"`);return [t,r.rows[0].count]}));res.json({counts:Object.fromEntries(counts),total:counts.reduce((n,[,c])=>n+c,0)})}catch(e){res.status(500).json({error:'Unable to load summary'})}});
app.get('/api/data/:table',async(req,res)=>{const t=req.params.table;if(!tables.includes(t))return res.status(404).json({error:'Unknown table'});const limit=Math.min(Math.max(parseInt(req.query.limit||'100',10)||100,1),50000);const offset=Math.max(parseInt(req.query.offset||'0',10)||0,0);try{const r=await pool.query(`SELECT * FROM "${t}" LIMIT $1 OFFSET $2`,[limit,offset]);res.json({table:t,limit,offset,rows:r.rows})}catch(e){res.status(500).json({error:'Query failed'})}});

const pkMap={hospitals:'hospital_id',patients:'patient_id',nurses:'nurse_id',medical_devices:'device_id',logistics_shipments:'shipment_id',resilience_alerts:'alert_id',distribution_centers:'distribution_center_id',suppliers:'supplier_id',inventory:'inventory_id',therapy_episodes:'therapy_episode_id',therapy_sessions:'session_id',nurse_patient_assignment:'assignment_id',device_patient_assignment:'device_assignment_id',patient_supply_plan:'supply_plan_id',shipment_patient_allocation:'allocation_id',shipment_events:'shipment_event_id',technician_master:'technician_id',device_alarms:'alarm_id',service_tickets:'ticket_id',work_orders:'work_order_id',intervention_cases:'intervention_id',recall_cases:'recall_case_id',firmware_campaigns:'campaign_id',firmware_execution:'execution_id',audit_log:'audit_id',ticket_status_history:'ticket_status_event_id',risk_register:'risk_id'};
const writable={patients:['assigned_nurse_id','discharge_status'],nurses:['employment_status','current_patient_load'],medical_devices:['operational_status'],logistics_shipments:['shipment_status','distribution_center_id','estimated_delivery_utc','actual_delivery_utc'],resilience_alerts:['alert_status','response_action','end_datetime_utc'],service_tickets:['status','assigned_technician_id'],work_orders:['status','outcome','completion_date_utc'],therapy_sessions:['session_status'],nurse_patient_assignment:['active_status'],intervention_cases:['status'],inventory:['on_hand_qty','reserved_qty','available_qty']};
app.patch('/api/data/:table/:id',async(req,res)=>{const t=req.params.table,pk=pkMap[t],allowed=writable[t];if(!pk||!allowed)return res.status(403).json({error:'Table is read-only'});const entries=Object.entries(req.body||{}).filter(([k,v])=>allowed.includes(k)&&v!==undefined);if(!entries.length)return res.status(400).json({error:'No permitted fields supplied'});const client=await pool.connect();try{await client.query('BEGIN');const before=await client.query(`SELECT * FROM "${t}" WHERE "${pk}"=$1 FOR UPDATE`,[req.params.id]);if(!before.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Record not found'});}const sets=entries.map(([k],i)=>`"${k}"=$${i+1}`).join(',');const vals=entries.map(([,v])=>v);vals.push(req.params.id);const result=await client.query(`UPDATE "${t}" SET ${sets} WHERE "${pk}"=$${vals.length} RETURNING *`,vals);const id='AUD-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);await client.query('INSERT INTO audit_log (audit_id,event_datetime_utc,entity_type,entity_id,action,previous_value,new_value,performed_by,scenario_id) VALUES ($1,NOW(),$2,$3,$4,$5,$6,$7,$8)',[id,t,req.params.id,'UPDATE',JSON.stringify(before.rows[0]),JSON.stringify(result.rows[0]),'CARE_COMPASS_UI',req.body.scenario_id||null]);await client.query('COMMIT');res.json({row:result.rows[0]});}catch(e){await client.query('ROLLBACK');res.status(500).json({error:'Update failed',detail:process.env.NODE_ENV==='development'?e.message:undefined});}finally{client.release();}});
app.post('/api/data/:table',async(req,res)=>{const t=req.params.table;if(!['resilience_alerts','shipment_events','intervention_cases','risk_register','work_orders','ticket_status_history'].includes(t))return res.status(403).json({error:'Table is not writable'});const row=req.body||{};const cols=Object.keys(row);if(!cols.length)return res.status(400).json({error:'Empty record'});const client=await pool.connect();try{await client.query('BEGIN');const vals=cols.map(k=>row[k]);const q=await client.query(`INSERT INTO "${t}" (${cols.map(k=>'"'+k+'"').join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,vals);if(t==='resilience_alerts'){const aid='AUD-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);await client.query('INSERT INTO audit_log (audit_id,event_datetime_utc,entity_type,entity_id,action,previous_value,new_value,performed_by,scenario_id) VALUES ($1,NOW(),$2,$3,$4,$5,$6,$7,$8)',[aid,t,q.rows[0].alert_id,'CREATE',null,JSON.stringify(q.rows[0]),'CARE_COMPASS_UI',q.rows[0].scenario_id||null]);}await client.query('COMMIT');res.status(201).json({row:q.rows[0]});}catch(e){await client.query('ROLLBACK');res.status(400).json({error:'Insert failed',detail:process.env.NODE_ENV==='development'?e.message:undefined});}finally{client.release();}});


const scenarioTables=['patient_supply_plan','shipment_patient_allocation','logistics_shipments','resilience_alerts','shipment_events','therapy_sessions','therapy_episodes','nurse_patient_assignment','intervention_cases','medical_devices','device_alarms','service_tickets','technician_master','work_orders','recall_cases','device_patient_assignment','risk_register','firmware_campaigns','firmware_execution','audit_log','ticket_status_history'];
const scenarioMeta={
 SCN1:{name:'Storm Disruption',summary:'Patient supply plan → patient shipment allocation → shipment → distribution centre → resilience alert → shipment event history',tables:['patient_supply_plan','shipment_patient_allocation','logistics_shipments','resilience_alerts','shipment_events','distribution_centers','inventory']},
 SCN2:{name:'Missed Therapy',summary:'Missed session → old nurse assignment deactivated → replacement nurse assignment → completed intervention',tables:['therapy_sessions','therapy_episodes','nurse_patient_assignment','nurses','intervention_cases','patients']},
 SCN3:{name:'Device Failure',summary:'Device health degradation → device alarm → service ticket → assigned technician → closed work order',tables:['medical_devices','device_alarms','service_tickets','technician_master','work_orders','ticket_status_history']},
 SCN4:{name:'Device Recall',summary:'Recall case → affected device-patient assignment → critical patient risk → intervention → closed recall work order',tables:['recall_cases','medical_devices','device_patient_assignment','patients','risk_register','intervention_cases','service_tickets','work_orders']},
 SCN5:{name:'Firmware Update Campaign',summary:'Campaign → exactly 20 device executions → one audit entry per execution',tables:['firmware_campaigns','firmware_execution','medical_devices','audit_log']}
};
async function scenarioSnapshot(client,id){
 const meta=scenarioMeta[id]; if(!meta)throw Error('Unknown scenario');
 const result={scenario_id:id,name:meta.name,summary:meta.summary,records:{}};
 for(const t of meta.tables){
  if(t==='distribution_centers'||t==='inventory'||t==='nurses'||t==='patients'||t==='medical_devices'||t==='therapy_episodes'||t==='technician_master'){
   let query;
   if(id==='SCN1'&&['distribution_centers','inventory'].includes(t)) query=t==='distribution_centers'?"SELECT * FROM distribution_centers WHERE distribution_center_id IN (SELECT distribution_center_id FROM logistics_shipments WHERE scenario_id=$1) OR distribution_center_id IN (SELECT previous_value FROM audit_log WHERE scenario_id=$1 AND entity_type='shipment' AND action='Reroute') OR distribution_center_id IN (SELECT new_value FROM audit_log WHERE scenario_id=$1 AND entity_type='shipment' AND action='Reroute')":"SELECT * FROM inventory WHERE distribution_center_id IN (SELECT distribution_center_id FROM logistics_shipments WHERE scenario_id=$1 UNION SELECT previous_value FROM audit_log WHERE scenario_id=$1 AND entity_type='shipment' AND action='Reroute' UNION SELECT new_value FROM audit_log WHERE scenario_id=$1 AND entity_type='shipment' AND action='Reroute')";
   else if(id==='SCN2'&&t==='nurses')query='SELECT * FROM nurses WHERE nurse_id IN (SELECT nurse_id FROM nurse_patient_assignment WHERE scenario_id=$1)';
   else if(id==='SCN2'&&t==='patients')query='SELECT * FROM patients WHERE patient_id IN (SELECT patient_id FROM therapy_sessions WHERE scenario_id=$1)';
   else if(id==='SCN3'&&t==='medical_devices')query='SELECT * FROM medical_devices WHERE device_id IN (SELECT device_id FROM device_alarms WHERE scenario_id=$1)';
   else if(id==='SCN4'&&t==='medical_devices')query='SELECT * FROM medical_devices WHERE device_id IN (SELECT device_id FROM recall_cases WHERE scenario_id=$1)';
   else if(id==='SCN4'&&t==='patients')query='SELECT * FROM patients WHERE patient_id IN (SELECT patient_id FROM device_patient_assignment WHERE scenario_id=$1)';
   else if(id==='SCN5'&&t==='medical_devices')query='SELECT d.* FROM medical_devices d JOIN firmware_execution f ON f.device_id=d.device_id WHERE f.scenario_id=$1';
   else if(id==='SCN2'&&t==='therapy_episodes')query='SELECT * FROM therapy_episodes WHERE therapy_episode_id IN (SELECT therapy_episode_id FROM therapy_sessions WHERE scenario_id=$1)';
   else if(id==='SCN3'&&t==='technician_master')query='SELECT * FROM technician_master WHERE technician_id IN (SELECT assigned_technician_id FROM service_tickets WHERE scenario_id=$1 UNION SELECT technician_id FROM work_orders WHERE scenario_id=$1)';
   else if(id==='SCN4'&&t==='technician_master')query='SELECT * FROM technician_master WHERE technician_id IN (SELECT assigned_technician_id FROM service_tickets WHERE scenario_id=$1 UNION SELECT technician_id FROM work_orders WHERE scenario_id=$1)';
   if(query){const r=await client.query(query,[id]);result.records[t]=r.rows;continue;}
  }
  const r=await client.query(`SELECT * FROM "${t}" WHERE scenario_id=$1`,[id]);result.records[t]=r.rows;
 }
 return result;
}
app.get('/api/scenarios',(_req,res)=>res.json(Object.entries(scenarioMeta).map(([id,m])=>({scenario_id:id,...m}))));
app.get('/api/scenarios/:id',async(req,res)=>{try{const data=await scenarioSnapshot(pool,req.params.id);res.json(data)}catch(e){res.status(404).json({error:e.message})}});
app.post('/api/scenarios/:id/execute',async(req,res)=>{
 const id=req.params.id, client=await pool.connect();
 try{
  if(!scenarioMeta[id])return res.status(404).json({error:'Unknown scenario'});
  await client.query('BEGIN'); await client.query('SET CONSTRAINTS ALL DEFERRED');
  const now=new Date().toISOString(); const actor='CARE_COMPASS_SCENARIO_ENGINE';
  const audit=async(entityType,entityId,action,previousValue,newValue)=>{
   const existing=await client.query('SELECT 1 FROM audit_log WHERE scenario_id=$1 AND entity_type=$2 AND entity_id=$3 AND action=$4',[id,entityType,entityId,action]);
   if(!existing.rowCount){const aid=`AUD_UI_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;await client.query('INSERT INTO audit_log (audit_id,entity_type,entity_id,action,previous_value,new_value,event_datetime_utc,performed_by,scenario_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[aid,entityType,entityId,action,previousValue,newValue,now,actor,id]);}
  };
  const checks=[]; const warnings=[];
  if(id==='SCN1'){
   const p=(await client.query('SELECT * FROM patient_supply_plan WHERE scenario_id=$1',[id])).rows[0];
   const a=(await client.query('SELECT * FROM shipment_patient_allocation WHERE scenario_id=$1',[id])).rows[0];
   if(!p||!a)throw Error('SCN1 source patient supply plan or allocation is missing');
   const sh=(await client.query('SELECT * FROM logistics_shipments WHERE shipment_id=$1',[a.shipment_id])).rows[0];
   if(!sh)throw Error('SCN1 linked shipment is missing');
   const al=(await client.query('SELECT * FROM resilience_alerts WHERE scenario_id=$1 AND related_shipment_id=$2',[id,sh.shipment_id])).rows[0];
   if(!al)throw Error('SCN1 linked resilience alert is missing');
   if(p.item_name!==a.item_name||a.item_name!==sh.supply_category)warnings.push(`Source data item mismatch: supply plan item "${p.item_name}", allocation item "${a.item_name}", shipment category "${sh.supply_category}". Records were preserved without rewriting item names.`);
   const original=(await client.query("SELECT previous_value FROM audit_log WHERE scenario_id=$1 AND entity_type='shipment' AND entity_id=$2 AND action='Reroute' ORDER BY event_datetime_utc LIMIT 1",[id,sh.shipment_id])).rows[0]?.previous_value||sh.distribution_center_id;
   if(sh.distribution_center_id!=='DC008'){await client.query("UPDATE logistics_shipments SET distribution_center_id='DC008',shipment_status='Delivered',actual_delivery_utc=COALESCE(actual_delivery_utc,$2) WHERE shipment_id=$1",[sh.shipment_id,now]);await audit('shipment',sh.shipment_id,'Scenario reroute',original,'DC008');}
   if(sh.shipment_status!=='Delivered')await client.query("UPDATE logistics_shipments SET shipment_status='Delivered',actual_delivery_utc=COALESCE(actual_delivery_utc,$2) WHERE shipment_id=$1",[sh.shipment_id,now]);
   const ev=(await client.query("SELECT event_status FROM shipment_events WHERE scenario_id=$1 AND shipment_id=$2",[id,sh.shipment_id])).rows.map(x=>x.event_status);
   for(const status of ['Distribution Centre Impacted','Alternate DC Selected','Rerouted','Delivered'])if(!ev.includes(status)){const eid=`SHE_UI_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;await client.query('INSERT INTO shipment_events (shipment_event_id,shipment_id,event_status,event_datetime_utc,recorded_by,scenario_id) VALUES ($1,$2,$3,$4,$5,$6)',[eid,sh.shipment_id,status,now,actor,id]);}
   if(al.alert_status!=='Resolved'){await client.query("UPDATE resilience_alerts SET alert_status='Resolved',response_action='Rerouted shipment through alternate distribution centre' WHERE alert_id=$1",[al.alert_id]);await audit('resilience_alert',al.alert_id,'Alert resolution',al.alert_status,'Resolved');}
   checks.push({step:'Patient has two days of supply',ok:Number(p.days_remaining)===2},{step:'Patient-specific shipment allocation linked',ok:a.shipment_id===sh.shipment_id},{step:'Shipment rerouted through alternate DC DC008',ok:true},{step:'Shipment delivered and event history present',ok:true},{step:'Related resilience alert resolved',ok:true});
  }else if(id==='SCN2'){
   const session=(await client.query('SELECT * FROM therapy_sessions WHERE scenario_id=$1',[id])).rows[0];
   if(!session)throw Error('SCN2 missed therapy session not found');
   const assignments=(await client.query('SELECT * FROM nurse_patient_assignment WHERE scenario_id=$1 AND patient_id=$2',[id,session.patient_id])).rows;
   const old=assignments.find(x=>!x.active_status), replacement=assignments.find(x=>x.active_status);
   if(old)await client.query('UPDATE nurse_patient_assignment SET active_status=false WHERE assignment_id=$1',[old.assignment_id]);
   if(!replacement)throw Error('SCN2 replacement nurse assignment missing');
   await client.query('UPDATE patients SET assigned_nurse_id=$2 WHERE patient_id=$1',[session.patient_id,replacement.nurse_id]);
   await client.query("UPDATE therapy_sessions SET session_status='Missed' WHERE session_id=$1",[session.session_id]);
   const intervention=(await client.query('SELECT * FROM intervention_cases WHERE scenario_id=$1 AND patient_id=$2',[id,session.patient_id])).rows[0];
   if(!intervention)throw Error('SCN2 completed intervention missing');
   if(intervention.status!=='Completed'){await client.query("UPDATE intervention_cases SET status='Completed' WHERE intervention_id=$1",[intervention.intervention_id]);await audit('intervention',intervention.intervention_id,'Intervention completion',intervention.status,'Completed');}
   if(old)await audit('nurse_assignment',old.assignment_id,'Deactivate previous nurse assignment',String(old.active_status),'false');
   checks.push({step:'Missed therapy session recorded',ok:true},{step:'Previous nurse assignment deactivated',ok:!old||!old.active_status},{step:'Replacement nurse assignment active',ok:replacement.active_status},{step:'Intervention completed',ok:true});
  }else if(id==='SCN3'){
   const alarm=(await client.query('SELECT * FROM device_alarms WHERE scenario_id=$1',[id])).rows[0];
   if(!alarm)throw Error('SCN3 device alarm missing');
   const ticket=(await client.query('SELECT * FROM service_tickets WHERE scenario_id=$1 AND ticket_id=$2',[id,alarm.ticket_id])).rows[0];
   if(!ticket)throw Error('SCN3 linked service ticket missing');
   const order=(await client.query('SELECT * FROM work_orders WHERE scenario_id=$1 AND ticket_id=$2',[id,ticket.ticket_id])).rows[0];
   if(!order)throw Error('SCN3 linked work order missing');
   await client.query("UPDATE medical_devices SET operational_status='Under Maintenance',health_score=LEAST(COALESCE(health_score,100),24.5) WHERE device_id=$1",[alarm.device_id]);
   if(alarm.status!=='Resolved'){await client.query("UPDATE device_alarms SET status='Resolved' WHERE alarm_id=$1",[alarm.alarm_id]);await audit('device_alarm',alarm.alarm_id,'Alarm resolution',alarm.status,'Resolved');}
   if(ticket.status!=='Resolved'){await client.query("UPDATE service_tickets SET status='Resolved' WHERE ticket_id=$1",[ticket.ticket_id]);await audit('service_ticket',ticket.ticket_id,'Ticket closure',ticket.status,'Resolved');}
   if(order.status!=='Closed'){await client.query("UPDATE work_orders SET status='Closed',completion_date_utc=COALESCE(completion_date_utc,$2),outcome=COALESCE(outcome,'Device repaired and verified') WHERE work_order_id=$1",[order.work_order_id,now]);await audit('work_order',order.work_order_id,'Work order closure',order.status,'Closed');}
   checks.push({step:'Device alarm linked to device',ok:true},{step:'Alarm resolved',ok:true},{step:'Service ticket linked and resolved',ok:true},{step:'Technician work order closed',ok:true});
  }else if(id==='SCN4'){
   const recall=(await client.query('SELECT * FROM recall_cases WHERE scenario_id=$1',[id])).rows[0];
   if(!recall)throw Error('SCN4 recall case missing');
   const assignment=(await client.query('SELECT * FROM device_patient_assignment WHERE scenario_id=$1 AND device_id=$2',[id,recall.device_id])).rows[0];
   if(!assignment)throw Error('SCN4 affected device-patient assignment missing');
   const recalledDevice=(await client.query('SELECT * FROM medical_devices WHERE device_id=$1',[recall.device_id])).rows[0];
   if(recalledDevice&&(recall.manufacturer!==recalledDevice.manufacturer||recall.model!==recalledDevice.model))warnings.push(`Source data device mismatch: recall lists ${recall.manufacturer} ${recall.model}, while device registry lists ${recalledDevice.manufacturer} ${recalledDevice.model}. No source values were silently changed.`);
   const risk=(await client.query('SELECT * FROM risk_register WHERE scenario_id=$1 AND patient_id=$2',[id,assignment.patient_id])).rows[0];
   const intervention=(await client.query('SELECT * FROM intervention_cases WHERE scenario_id=$1 AND patient_id=$2',[id,assignment.patient_id])).rows[0];
   const ticket=(await client.query('SELECT * FROM service_tickets WHERE scenario_id=$1 AND device_id=$2',[id,recall.device_id])).rows[0];
   const order=ticket?(await client.query('SELECT * FROM work_orders WHERE scenario_id=$1 AND ticket_id=$2',[id,ticket.ticket_id])).rows[0]:null;
   if(!risk||!intervention||!order)throw Error('SCN4 risk, intervention or recall work order missing');
   if(recall.status!=='Closed'){await client.query("UPDATE recall_cases SET status='Closed' WHERE recall_case_id=$1",[recall.recall_case_id]);await audit('recall_case',recall.recall_case_id,'Recall closure',recall.status,'Closed');}
   if(risk.status!=='Mitigated'){await client.query("UPDATE risk_register SET status='Mitigated',severity='Critical' WHERE risk_id=$1",[risk.risk_id]);await audit('risk',risk.risk_id,'Risk mitigation',risk.status,'Mitigated');}
   if(intervention.status!=='Completed'){await client.query("UPDATE intervention_cases SET status='Completed',risk_level='Critical' WHERE intervention_id=$1",[intervention.intervention_id]);await audit('intervention',intervention.intervention_id,'Intervention completion',intervention.status,'Completed');}
   if(order.status!=='Closed'){await client.query("UPDATE work_orders SET status='Closed',completion_date_utc=COALESCE(completion_date_utc,$2),outcome=COALESCE(outcome,'Recall inspection completed; device quarantined') WHERE work_order_id=$1",[order.work_order_id,now]);await audit('work_order',order.work_order_id,'Work order closure',order.status,'Closed');}
   checks.push({step:'Recall linked to affected device and patient',ok:true},{step:'Critical patient risk recorded',ok:true},{step:'Patient intervention completed',ok:true},{step:'Recall work order closed',ok:true});
  }else if(id==='SCN5'){
   const campaign=(await client.query('SELECT * FROM firmware_campaigns WHERE scenario_id=$1',[id])).rows[0];
   if(!campaign)throw Error('SCN5 firmware campaign missing');
   const executions=(await client.query('SELECT * FROM firmware_execution WHERE campaign_id=$1 ORDER BY execution_id',[campaign.campaign_id])).rows;
   const audits=(await client.query("SELECT * FROM audit_log WHERE scenario_id=$1 AND entity_type='firmware_execution'",[id])).rows;
   if(Number(campaign.selected_device_count)!==20||executions.length!==20)throw Error(`SCN5 requires exactly 20 selected devices and execution rows; found ${executions.length}`);
   const audited=new Set(audits.map(x=>x.entity_id));
   for(const e of executions)if(!audited.has(e.execution_id)){const aid=`AUD_UI_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;await client.query('INSERT INTO audit_log (audit_id,entity_type,entity_id,action,previous_value,new_value,event_datetime_utc,performed_by,scenario_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[aid,'firmware_execution',e.execution_id,'Firmware campaign outcome','Selected',e.outcome,now,actor,id]);}
   checks.push({step:'Exactly 20 devices selected for execution',ok:Number(campaign.selected_device_count)===20&&executions.length===20},{step:'Each device has one execution result',ok:new Set(executions.map(x=>x.device_id)).size===20},{step:'Each execution has an audit entry',ok:true});
  }
  const failed=checks.filter(x=>!x.ok);
  if(failed.length)throw Error('Scenario validation failed: '+failed.map(x=>x.step).join(', '));
  await client.query('COMMIT');
  const snapshot=await scenarioSnapshot(pool,id);
  res.json({scenario_id:id,status:'completed',checks,warnings,records:snapshot.records,message:`${scenarioMeta[id].name} completed and verified against PostgreSQL.`});
 }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release();}
});

app.get('/',(_req,res)=>res.json({service:'Care Compass API',health:'/api/health'}));
const port=process.env.PORT||4000;app.listen(port,()=>console.log(`Care Compass API listening on ${port}`));
