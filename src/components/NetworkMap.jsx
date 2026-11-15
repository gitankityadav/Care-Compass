import {MapContainer,TileLayer,CircleMarker,Popup} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const tone=occ=>occ>=.9?'#fb4f6f':occ>=.8?'#fbbf24':'#2de2c8'

export default function NetworkMap({hospitals=[]}){
  const points=hospitals.filter(h=>Number.isFinite(Number(h.latitude))&&Number.isFinite(Number(h.longitude))).slice(0,100)
  const center=points.length?[Number(points[0].latitude),Number(points[0].longitude)]:[39.5,-98.35]
  return <div className="leaflet-wrap">
    <MapContainer center={center} zoom={4} scrollWheelZoom style={{height:'100%',width:'100%'}}>
      <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
      {points.map(h=>{
        const occ=Number(h.occupancy_rate)
        const pos=[Number(h.latitude),Number(h.longitude)]
        const col=tone(occ)
        return <span key={h.hospital_id}>
          {occ>=.8&&<CircleMarker center={pos} radius={9} interactive={false} pathOptions={{className:'pulse-ring',color:col,weight:2,fillOpacity:0}}/>}
          <CircleMarker center={pos} radius={6} pathOptions={{className:'glow-dot',color:'#0a1124',weight:2,fillColor:col,fillOpacity:1}}>
            <Popup><b>{h.hospital_name}</b><br/>{h.city}, {h.state}<br/>Occupancy: {Math.round(Number(h.occupancy_rate||0)*100)}%<br/>Beds: {h.occupied_beds}/{h.licensed_beds}</Popup>
          </CircleMarker>
        </span>
      })}
    </MapContainer>
    <div className="radar" aria-hidden="true"/>
    <div className="map-legend"><span><i className="green"/> Operational</span><span><i className="amber"/> High occupancy</span><span><i className="red"/> Critical occupancy</span></div>
  </div>
}
