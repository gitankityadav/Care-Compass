import {useEffect,useRef} from 'react'

/* Living backdrop: drifting aurora blobs, a constellation of care-network nodes
   that react to the pointer, and a soft cursor glow. Pauses when the tab is hidden
   and is fully static when the user prefers reduced motion. */
export default function Background(){
  const canvas=useRef(null)
  const glow=useRef(null)

  useEffect(()=>{
    const c=canvas.current
    const ctx=c.getContext('2d')
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w=0,h=0,raf=0,pts=[]
    const mouse={x:-9999,y:-9999}

    const resize=()=>{
      const dpr=Math.min(window.devicePixelRatio||1,2)
      w=window.innerWidth;h=window.innerHeight
      c.width=w*dpr;c.height=h*dpr
      c.style.width=w+'px';c.style.height=h+'px'
      ctx.setTransform(dpr,0,0,dpr,0,0)
      const n=Math.round(Math.min(80,Math.max(28,(w*h)/24000)))
      pts=Array.from({length:n},()=>({
        x:Math.random()*w,y:Math.random()*h,
        vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,
        r:Math.random()*1.6+.7,
        tone:Math.random()<.55?'45,226,200':Math.random()<.5?'56,189,248':'139,92,246'
      }))
    }

    const frame=()=>{
      ctx.clearRect(0,0,w,h)
      for(let i=0;i<pts.length;i++){
        const p=pts[i]
        p.x+=p.vx;p.y+=p.vy
        if(p.x<-20)p.x=w+20;if(p.x>w+20)p.x=-20
        if(p.y<-20)p.y=h+20;if(p.y>h+20)p.y=-20
        for(let j=i+1;j<pts.length;j++){
          const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy
          if(d<150*150){
            const a=(1-Math.sqrt(d)/150)*.22
            ctx.strokeStyle=`rgba(${p.tone},${a})`
            ctx.lineWidth=.7
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()
          }
        }
        const mx=p.x-mouse.x,my=p.y-mouse.y,md=mx*mx+my*my
        if(md<190*190){
          const a=(1-Math.sqrt(md)/190)*.55
          ctx.strokeStyle=`rgba(${p.tone},${a})`
          ctx.lineWidth=.9
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mouse.x,mouse.y);ctx.stroke()
        }
        ctx.fillStyle=`rgba(${p.tone},.85)`
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()
      }
      raf=requestAnimationFrame(frame)
    }

    const move=e=>{
      mouse.x=e.clientX;mouse.y=e.clientY
      if(glow.current)glow.current.style.transform=`translate3d(${e.clientX-260}px,${e.clientY-260}px,0)`
    }
    const leave=()=>{mouse.x=mouse.y=-9999}
    const vis=()=>{
      if(document.hidden)cancelAnimationFrame(raf)
      else if(!reduce){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
    }

    resize()
    if(reduce){
      pts.forEach(p=>{ctx.fillStyle=`rgba(${p.tone},.6)`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()})
    }else{
      raf=requestAnimationFrame(frame)
    }
    window.addEventListener('resize',resize)
    window.addEventListener('pointermove',move,{passive:true})
    document.addEventListener('pointerleave',leave)
    document.addEventListener('visibilitychange',vis)
    return()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('resize',resize)
      window.removeEventListener('pointermove',move)
      document.removeEventListener('pointerleave',leave)
      document.removeEventListener('visibilitychange',vis)
    }
  },[])

  return <div className="bg" aria-hidden="true">
    <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
    <canvas ref={canvas}/>
    <div className="cursor-glow" ref={glow}/>
    <div className="bg-vignette"/>
  </div>
}
