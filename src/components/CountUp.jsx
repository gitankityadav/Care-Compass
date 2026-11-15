import {useEffect,useRef,useState} from 'react'

const fmt=new Intl.NumberFormat('en-US')

/* Animated number: eases from its previous value to the new one. */
export default function CountUp({value,duration=1200}){
  const target=Number(value)||0
  const [n,setN]=useState(0)
  const from=useRef(0)
  useEffect(()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if(reduce){setN(target);from.current=target;return}
    const start=from.current
    let raf=0,t0=0
    const step=t=>{
      if(!t0)t0=t
      const p=Math.min(1,(t-t0)/duration)
      const eased=1-Math.pow(1-p,4)
      const v=start+(target-start)*eased
      setN(v);from.current=v
      if(p<1)raf=requestAnimationFrame(step)
    }
    raf=requestAnimationFrame(step)
    return()=>cancelAnimationFrame(raf)
  },[target,duration])
  return <>{fmt.format(Math.round(n))}</>
}
