import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized } from "recharts";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://hpqvusmnutpqomtbobxb.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwcXZ1c21udXRwcW9tdGJvYnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE1NDUsImV4cCI6MjA5NTY2NzU0NX0.S6yRy_nl4Dd22cV9W4lg9HgzTLpaKcsxKYvgn-J6CRU";
const sb = createClient(SUPA_URL, SUPA_KEY);

const DEFAULT_PLAN = { onCal:2800,onP:190,onC:300,onF:80,offCal:2200,offP:180,offC:200,offF:75 };
const LS = "atk_plan_v1";

function todayStr(){ return new Date().toISOString().split("T")[0]; }
function fmtShort(d){
  if(!d)return"";
  const[,m,day]=d.split("-");
  const M=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
  return`${parseInt(day)} ${M[parseInt(m)-1]}`;
}
function fmtDL(d){
  if(!d)return"";
  return new Date(d+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short"}).slice(0,1).toUpperCase();
}
function getWeekDates(offset=0){
  const base=new Date();base.setDate(base.getDate()+offset*7);
  const dow=base.getDay(),mon=new Date(base);
  mon.setDate(base.getDate()-((dow+6)%7));
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d.toISOString().split("T")[0];});
}
function avg(arr){const v=arr.filter(x=>x!=null&&!isNaN(x));return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;}
function weekdayIdx(dateStr){const d=new Date(dateStr+"T12:00:00");return(d.getDay()+6)%7;}
function buildLinePath(data,w,h){
  const padTop=14,padBottom=6;
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const n=data.length;
  const coords=data.map((d,i)=>{
    const x=(i/(n-1))*w;
    const y=h-padBottom-((d-min)/range)*(h-padTop-padBottom);
    return[x,y];
  });
  const line="M "+coords.map(c=>c[0].toFixed(1)+","+c[1].toFixed(1)).join(" L ");
  const area=line+` L ${w},${h} L 0,${h} Z`;
  return{line,area,width:w,height:h};
}
function pointPct(data,index,padTop,padBottom){
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const n=data.length;
  const xPct=(index/(n-1))*100;
  const yPct=(padTop+(1-(data[index]-min)/range)*(100-padTop-padBottom));
  return{xPct:xPct.toFixed(1),yPct:yPct.toFixed(1)};
}
function seededNoise(i){return Math.sin(i*12.9898)*43758.5453%1;}
function generateDemoData(){
  const values=[];let val=91.4;
  for(let i=0;i<60;i++){val=val-0.09+(Math.abs(seededNoise(i))-0.5)*0.55;values.push(+val.toFixed(1));}
  const today=new Date();
  const chart=values.map((v,i)=>{
    const d=new Date(today);d.setDate(d.getDate()-(59-i));
    return{date:d.toLocaleDateString("it-IT",{day:"numeric",month:"short"}),Peso:v};
  });
  return{
    weightChart:chart,
    lastW:values[values.length-1],
    avgW7:+(values.slice(-7).reduce((a,b)=>a+b,0)/7).toFixed(1),
    avgW7delta:-0.6,
    avgCal:2410,calDelta:-30,avgSteps:8240,
  };
}
function getPlanAt(history,date){const s=[...history].sort((a,b)=>a.date.localeCompare(b.date));const a=s.filter(p=>p.date<=date);return a.length?a[a.length-1]:s[0]||null;}


// Stili tipografici centralizzati: cambia qui una volta, si applica ovunque viene usato TYPE.xxx
const TYPE={
  hero:{fontSize:34,fontWeight:800,fontFamily:"tight"},      // numero grande protagonista (es. peso nel grafico)
  cardValue:{fontSize:24,fontWeight:700,fontFamily:"tight"}, // numero medio nelle card leggere
  sectionTitle:{fontSize:15,fontWeight:600,fontFamily:"tight"}, // titolo di sezione con barra colorata
  kicker:{fontSize:12,fontWeight:700,fontFamily:"tight"},    // badge quadratino+testo colorato
  label:{fontSize:12,fontWeight:500,fontFamily:"base"},      // etichette piccole sopra i valori
  body:{fontSize:14,fontWeight:400,fontFamily:"base"},       // testo normale
  small:{fontSize:11,fontWeight:500,fontFamily:"base"},      // note/microtesto
};
function typeStyle(T,C,extra={}){return{fontSize:T.fontSize,fontWeight:T.fontWeight,fontFamily:T.fontFamily==="tight"?C.fTight:C.f,...extra};}

const DARK={
  bg0:"#050506",bg1:"#141416",bg2:"#1B1B1E",bg3:"#232326",bg4:"#2C2C30",
  glass:"rgba(255,255,255,0.015)",glassBorder:"rgba(255,255,255,0.08)",
  border:"rgba(255,255,255,0.07)",borderHi:"rgba(255,255,255,0.14)",
  text:"#EDEDF0",sub:"#8A8A94",muted:"#4A4A52",
  blue:"#5B9CF6",indigo:"#8B7FF5",teal:"#2DD4BF",pink:"#FF4D8D",
  green:"#34D074",orange:"#FFAA2E",red:"#EF233C",purple:"#C46EF5",
  f:"'Inter','Segoe UI',system-ui,sans-serif",fTight:"'Inter Tight','Inter',system-ui,sans-serif",
  fKicker:"'Space Grotesk','Inter Tight','Inter',system-ui,sans-serif",
  shadow:"0 4px 24px rgba(0,0,0,0.45)",
  navBg:"rgba(5,5,6,0.96)",headerBg:"rgba(5,5,6,0.94)",
};
const LIGHT={
  bg0:"#F0F0F8",bg1:"#FFFFFF",bg2:"#F5F5FC",bg3:"#EAEAF4",bg4:"#DCDCEC",
  glass:"rgba(255,255,255,0.6)",glassBorder:"rgba(0,0,0,0.08)",
  border:"rgba(0,0,0,0.07)",borderHi:"rgba(0,0,0,0.14)",
  text:"#18182A",sub:"#60608A",muted:"#B0B0C8",
  blue:"#3B7EF4",indigo:"#6B5CF5",teal:"#0DADA0",pink:"#E23D77",
  green:"#22C265",orange:"#F59500",red:"#E84040",purple:"#A855D4",
  f:"'Inter','Segoe UI',system-ui,sans-serif",fTight:"'Inter Tight','Inter',system-ui,sans-serif",
  fKicker:"'Space Grotesk','Inter Tight','Inter',system-ui,sans-serif",
  shadow:"0 2px 12px rgba(0,0,0,0.07)",
  navBg:"rgba(240,240,248,0.97)",headerBg:"rgba(240,240,248,0.95)",
};

// ─── PURE COMPONENTS (no hooks inside App) ───────────────────────────────────
function Card({children,style,onClick,hi,C}){
  const[hov,setHov]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:C.glass,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:6,border:`1px solid ${hov&&onClick?C.glassBorder:hi?C.glassBorder:C.border}`,padding:20,transition:"border-color 0.2s",cursor:onClick?"pointer":"default",boxShadow:C.shadow,...style}}>
      {children}
    </div>
  );
}
function Kicker({label,color,C}){
  return(
    <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:2}}>
      <span style={{width:15,height:15,borderRadius:3,background:"#fff",flexShrink:0}}/>
      <span style={{fontSize:24,fontWeight:700,letterSpacing:3,color:color||C.red,fontFamily:C.fKicker,textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}
function FloatingBadge({formattedGraphicalItems,C,unit}){
  const pts=formattedGraphicalItems?.[0]?.props?.points;
  if(!pts?.length)return null;
  const last=pts[pts.length-1];
  if(last.x==null||last.y==null)return null;
  const val=last.payload?.Peso??last.payload?.Media??(Array.isArray(last.value)?last.value[1]:last.value);
  const bw=72,bh=36;
  let bx=last.x-bw/2;
  const by=Math.max(4,last.y-bh-16);
  return(
    <g pointerEvents="none">
      <line x1={last.x} y1={last.y} x2={last.x} y2={by+bh} stroke={C.pink} strokeWidth={1} strokeDasharray="3 3" opacity={0.55}/>
      <circle cx={last.x} cy={last.y} r={4.5} fill={C.pink} stroke={C.bg1} strokeWidth={2}/>
      <rect x={bx} y={by} width={bw} height={bh} rx={4} fill={C.bg1} stroke={C.glassBorder}/>
      <text x={bx+bw/2} y={by+15} textAnchor="middle" fontSize={10} fill={C.sub} fontFamily={C.f}>ultimo</text>
      <text x={bx+bw/2} y={by+29} textAnchor="middle" fontSize={13} fontWeight="700" fill={C.text} fontFamily={C.fTight}>{val}{unit||""}</text>
    </g>
  );
}
function KPI({label,value,unit,color,C}){
  return(
    <div style={{background:C.glass,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${C.glassBorder}`,borderRadius:4,padding:"14px 15px"}}>
      <div style={{fontSize:13,color:C.sub,marginBottom:6,fontWeight:500}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color:color||C.text,lineHeight:1,letterSpacing:-0.3}}>
        {value??'—'}{unit&&<span style={{fontSize:13,color:C.sub,fontWeight:400,marginLeft:3}}>{unit}</span>}
      </div>
    </div>
  );
}
function Tag({label,color}){
  return <span style={{fontSize:12,fontWeight:600,letterSpacing:0.4,background:`${color}14`,color,border:`1px solid ${color}22`,borderRadius:8,padding:"3px 9px"}}>{label}</span>;
}
function Seg({options,value,onChange,C}){
  return(
    <div style={{display:"flex",background:C.bg3,borderRadius:14,padding:4,gap:3}}>
      {options.map(o=>(
        <button key={o.value} onClick={()=>onChange(o.value)}
          style={{flex:1,padding:"9px 0",border:"none",borderRadius:11,background:value===o.value?C.bg1:"transparent",color:value===o.value?C.text:C.sub,fontSize:14,fontWeight:value===o.value?600:400,cursor:"pointer",fontFamily:C.f,boxShadow:value===o.value?C.shadow:"none",transition:"all 0.2s"}}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function MBar({label,value,max,color,C}){
  const pct=max?Math.min(100,((value||0)/max)*100):0;
  return(
    <div style={{marginBottom:11}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:14,color:C.sub,fontWeight:500}}>{label}</span>
        <span style={{fontSize:14,color:C.text,fontWeight:500}}>{value??'—'}<span style={{color:C.muted,fontWeight:400}}>/{max}g</span></span>
      </div>
      <div style={{height:5,background:C.bg3,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:5,width:`${pct}%`,background:color,borderRadius:99,transition:"width 0.5s ease"}}/>
      </div>
    </div>
  );
}
function CTip({active,payload,label,C}){
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:C?.bg1,border:`1px solid ${C?.borderHi}`,borderRadius:14,padding:"10px 14px",fontSize:14,boxShadow:"0 8px 32px rgba(0,0,0,0.35)"}}>
      <div style={{color:C?.sub,marginBottom:5,fontSize:12,fontWeight:500}}>{label}</div>
      {payload.map((p,i)=>p.value!=null&&<div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}{p.name==="Peso"?" kg":p.name==="Passi"?"":" kcal"}</div>)}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({C}){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[isLogin,setIsLogin]=useState(true);
  const[loading,setLoading]=useState(false);
  const[msg,setMsg]=useState("");
  const[err,setErr]=useState("");
  const[remember,setRemember]=useState(true);
  const inp={background:C.bg3,border:`1px solid ${C.border}`,borderRadius:13,color:C.text,padding:"11px 14px",fontSize:16,outline:"none",width:"100%",fontFamily:C.f,boxSizing:"border-box"};
  async function handle(){
    if(!email||!password){setErr("Inserisci email e password");return;}
    setLoading(true);setErr("");setMsg("");
    if(isLogin){
      const{error}=await sb.auth.signInWithPassword({email,password});
      if(error)setErr("Email o password errati");
    }else{
      const{error}=await sb.auth.signUp({email,password});
      if(error)setErr(error.message);
      else setMsg("Registrazione completata! Controlla la tua email per confermare l'account.");
    }
    setLoading(false);
  }
  return(
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:C.f}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:30,fontWeight:700,letterSpacing:-0.5,color:C.text}}>Athlete</div>
          <div style={{fontSize:15,color:C.sub,marginTop:4}}>Il tuo tracker personale</div>
        </div>
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:24,padding:28,boxShadow:C.shadow}}>
          <Seg C={C} options={[{value:"login",label:"Accedi"},{value:"register",label:"Registrati"}]} value={isLogin?"login":"register"} onChange={v=>{setIsLogin(v==="login");setErr("");setMsg("");}}/>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:20}}>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:4,letterSpacing:0.8,fontWeight:500}}>EMAIL</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="la@tuaemail.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:4,letterSpacing:0.8,fontWeight:500}}>PASSWORD</div>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
            </div>
            {isLogin&&(
              <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setRemember(p=>!p)}>
                <div style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${remember?C.blue:C.border}`,background:remember?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                  {remember&&<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{fontSize:15,color:C.sub,userSelect:"none"}}>Rimani connesso</span>
              </div>
            )}
            {err&&<div style={{fontSize:14,color:C.red,padding:"8px 12px",background:`${C.red}12`,borderRadius:8}}>{err}</div>}
            {msg&&<div style={{fontSize:14,color:C.green,padding:"8px 12px",background:`${C.green}12`,borderRadius:8}}>{msg}</div>}
            <button onClick={handle} disabled={loading}
              style={{width:"100%",padding:13,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:12,color:"#fff",fontSize:16,fontWeight:600,cursor:loading?"default":"pointer",fontFamily:C.f,opacity:loading?0.7:1,marginTop:4}}>
              {loading?"...":(isLogin?"Accedi":"Registrati")}
            </button>
          </div>
        </div>
      </div>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}input::placeholder{color:${C.muted};}`}</style>
    </div>
  );
}

// ─── MEAL PLAN ────────────────────────────────────────────────────────────────
// Tabella a compilazione manuale (stile foglio del coach) — niente ricerca database, tutto scritto dall'utente.
function MealPlan({C,user,sb,
  mealPlanOn,setMealPlanOn,mealPlanOnId,setMealPlanOnId,
  mealPlanOff,setMealPlanOff,mealPlanOffId,setMealPlanOffId,
  mealFluidOn,setMealFluidOn,mealSodiumOn,setMealSodiumOn,
  mealFluidOff,setMealFluidOff,mealSodiumOff,setMealSodiumOff}){
  const TAGS=[null,"PRE","INTRA","POST"];
  const defaultMeals=()=>{
    const t=Date.now();
    return[
      {id:`m${t}0`,name:"Meal 1",tag:null,foods:[{id:`f${t}0`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""},
      {id:`m${t}1`,name:"Meal 2",tag:"PRE",foods:[{id:`f${t}1`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""},
      {id:`m${t}2`,name:"Meal 3",tag:"INTRA",foods:[{id:`f${t}2`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""},
      {id:`m${t}3`,name:"Meal 4",tag:"POST",foods:[{id:`f${t}3`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""},
      {id:`m${t}4`,name:"Meal 5",tag:null,foods:[{id:`f${t}4`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""},
      {id:`m${t}5`,name:"Meal 6",tag:null,foods:[{id:`f${t}5`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""},
    ];
  };

  useEffect(()=>{
    if(!mealPlanOn||mealPlanOn.length===0)setMealPlanOn(defaultMeals());
    if(!mealPlanOff||mealPlanOff.length===0)setMealPlanOff(defaultMeals());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function addMeal(setMeals){
    setMeals(prev=>[...(prev||[]),{id:`m${Date.now()}`,name:`Meal ${((prev||[]).length)+1}`,tag:null,foods:[{id:`f${Date.now()}`,name:"",portion:""}],protein:"",carbs:"",fat:"",kcal:""}]);
  }
  function removeMeal(setMeals,idx){setMeals(prev=>prev.filter((_,i)=>i!==idx));}
  function updateMeal(setMeals,idx,field,value){setMeals(prev=>{const u=[...prev];u[idx]={...u[idx],[field]:value};return u;});}
  function cycleTag(setMeals,idx){setMeals(prev=>{const u=[...prev];const cur=TAGS.indexOf(u[idx].tag);u[idx]={...u[idx],tag:TAGS[(cur+1)%TAGS.length]};return u;});}
  function addFood(setMeals,mealIdx){setMeals(prev=>{const u=[...prev];u[mealIdx]={...u[mealIdx],foods:[...u[mealIdx].foods,{id:`f${Date.now()}`,name:"",portion:""}]};return u;});}
  function removeFood(setMeals,mealIdx,foodIdx){setMeals(prev=>{const u=[...prev];u[mealIdx]={...u[mealIdx],foods:u[mealIdx].foods.filter((_,i)=>i!==foodIdx)};return u;});}
  function updateFood(setMeals,mealIdx,foodIdx,field,value){setMeals(prev=>{const u=[...prev];const foods=[...u[mealIdx].foods];foods[foodIdx]={...foods[foodIdx],[field]:value};u[mealIdx]={...u[mealIdx],foods};return u;});}
  function dayTotals(meals){
    return(meals||[]).reduce((a,m)=>({protein:a.protein+(+m.protein||0),carbs:a.carbs+(+m.carbs||0),fat:a.fat+(+m.fat||0),kcal:a.kcal+(+m.kcal||0)}),{protein:0,carbs:0,fat:0,kcal:0});
  }

  // Autosave, debounced
  useEffect(()=>{
    if(!user)return;
    const t=setTimeout(async()=>{
      async function savePlan(type,meals,id,setId,fluid,sodium){
        if(!meals)return;
        const payload={type,meals,fluid_l:fluid?+fluid:null,sodium_g:sodium?+sodium:null,updated_at:new Date().toISOString()};
        if(id){
          await sb.from("athlete_meal_plan").update(payload).eq("id",id).eq("user_id",user.id);
        }else{
          const{data}=await sb.from("athlete_meal_plan").insert({...payload,user_id:user.id}).select().single();
          if(data)setId(data.id);
        }
      }
      await savePlan("on",mealPlanOn,mealPlanOnId,setMealPlanOnId,mealFluidOn,mealSodiumOn);
      await savePlan("off",mealPlanOff,mealPlanOffId,setMealPlanOffId,mealFluidOff,mealSodiumOff);
    },1500);
    return()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mealPlanOn,mealPlanOff,mealFluidOn,mealSodiumOn,mealFluidOff,mealSodiumOff]);

  const tagColor=t=>t==="PRE"?C.blue:t==="INTRA"?C.orange:t==="POST"?C.teal:C.muted;

  function renderColumn(label,accent,meals,setMeals,fluid,setFluid,sodium,setSodium){
    const totals=dayTotals(meals);
    return(
      <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:20,textAlign:"center",fontFamily:C.fTight,fontSize:20,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",background:C.bg3,color:accent,borderBottom:`3px solid ${accent}`}}>{label}</div>
        {(meals||[]).map((meal,mealIdx)=>(
          <div key={meal.id} style={{borderTop:mealIdx>0?`2px solid ${C.borderHi}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",background:C.bg2}}>
              <input value={meal.name} onChange={e=>updateMeal(setMeals,mealIdx,"name",e.target.value)}
                style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,color:C.text,background:"none",border:"none",borderBottom:`1px dashed ${C.border}`,outline:"none",fontFamily:C.f,width:90,paddingBottom:2}}/>
              <span onClick={()=>cycleTag(setMeals,mealIdx)} style={{fontSize:9.5,fontWeight:700,color:tagColor(meal.tag),background:`${tagColor(meal.tag)}14`,padding:"3px 8px",borderRadius:5,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>{meal.tag||"+ tag"}</span>
              <button onClick={()=>removeMeal(setMeals,mealIdx)} style={{marginLeft:"auto",background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer",lineHeight:1,padding:"2px 4px",flexShrink:0}}>×</button>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 18px 4px",fontSize:9.5,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700}}>
              <span>Food</span><span style={{width:85,textAlign:"right",flexShrink:0}}>Portion</span>
            </div>
            {meal.foods.map((food,foodIdx)=>(
              <div key={food.id} style={{display:"flex",alignItems:"center",gap:14,padding:"8px 18px",background:foodIdx%2===0?"rgba(255,255,255,0.018)":"none"}}>
                <input value={food.name} onChange={e=>updateFood(setMeals,mealIdx,foodIdx,"name",e.target.value)} placeholder="Food name…"
                  style={{fontSize:13,color:C.text,background:"none",border:"none",outline:"none",fontFamily:C.f,flex:1,minWidth:0}}/>
                <input value={food.portion} onChange={e=>updateFood(setMeals,mealIdx,foodIdx,"portion",e.target.value)} placeholder="—"
                  style={{fontSize:13.5,fontWeight:700,fontFamily:C.fTight,color:C.text,background:"none",border:"none",outline:"none",width:85,textAlign:"right",flexShrink:0}}/>
                <button onClick={()=>removeFood(setMeals,mealIdx,foodIdx)} style={{background:"none",border:"none",color:C.muted,fontSize:15,cursor:"pointer",lineHeight:1,padding:2,opacity:0.5,flexShrink:0}}>×</button>
              </div>
            ))}
            <button onClick={()=>addFood(setMeals,mealIdx)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px 14px",background:"none",border:"none",color:C.sub,fontSize:12,cursor:"pointer",fontFamily:C.f}}>
              <span style={{width:16,height:16,borderRadius:4,border:`1.5px dashed ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>+</span>Add food
            </button>
            <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"12px 18px",borderTop:`1px solid ${C.borderHi}`,background:C.bg3}}>
              {[["protein","Pro"],["carbs","Carb"],["fat","Fat"]].map(([k,l])=>(
                <div key={k} style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                  <input type="number" value={meal[k]} onChange={e=>updateMeal(setMeals,mealIdx,k,e.target.value)} placeholder="0"
                    style={{fontFamily:C.fTight,fontWeight:800,fontSize:16,color:C.text,background:"none",border:"none",outline:"none",width:44,textAlign:"center"}}/>
                </div>
              ))}
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",marginBottom:2}}>Kcal</div>
                <input type="number" value={meal.kcal} onChange={e=>updateMeal(setMeals,mealIdx,"kcal",e.target.value)} placeholder="0"
                  style={{fontFamily:C.fTight,fontWeight:800,fontSize:16,color:accent,background:"none",border:"none",outline:"none",width:56,textAlign:"center"}}/>
              </div>
            </div>
          </div>
        ))}
        <button onClick={()=>addMeal(setMeals)}
          style={{width:"100%",padding:14,background:C.bg2,border:"none",borderTop:`2px solid ${C.borderHi}`,color:C.sub,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:C.f,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{width:18,height:18,borderRadius:5,border:`1.5px dashed ${C.sub}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>+</span>Add meal
        </button>
        <div style={{display:"flex",justifyContent:"space-between",background:C.bg2,padding:"20px 18px",borderTop:`2px solid ${C.borderHi}`}}>
          {[["Protein",totals.protein,"g",false],["Carb",totals.carbs,"g",false],["Fat",totals.fat,"g",false],["Total kcal",totals.kcal,"",true]].map(([l,v,u,isKcal])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,marginBottom:5}}>{l}</div>
              <div style={{fontFamily:C.fTight,fontSize:26,fontWeight:800,color:isKcal?accent:C.text}}>{Math.round(v)}{u}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"12px 18px",background:C.bg1,fontSize:12,color:C.sub,borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>Fluid<input type="number" value={fluid} onChange={e=>setFluid(e.target.value)} placeholder="0" style={{width:40,fontFamily:C.fTight,fontWeight:700,fontSize:14,color:C.text,background:"none",border:"none",outline:"none"}}/>L</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>Sodium<input type="number" value={sodium} onChange={e=>setSodium(e.target.value)} placeholder="0" style={{width:40,fontFamily:C.fTight,fontWeight:700,fontSize:14,color:C.text,background:"none",border:"none",outline:"none"}}/>g</div>
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:22}}>
      {renderColumn("Training Day",C.blue,mealPlanOn,setMealPlanOn,mealFluidOn,setMealFluidOn,mealSodiumOn,setMealSodiumOn)}
      {renderColumn("Non-Training Day",C.teal,mealPlanOff,setMealPlanOff,mealFluidOff,setMealFluidOff,mealSodiumOff,setMealSodiumOff)}
    </div>
  );
}


// ─── PLANNING SETUP ───────────────────────────────────────────────────────────
function PlanningSetup({C,inp,lastW,plan,todayStr,fmtShort,setPlanning,setPlanningView}){
  const[pName,setPName]=useState("");
  const[pType,setPType]=useState("cut");
  const[pStart,setPStart]=useState(todayStr());
  const[pEnd,setPEnd]=useState(()=>{const d=new Date();d.setDate(d.getDate()+56);return d.toISOString().split("T")[0];});
  const[pWStart,setPWStart]=useState(lastW||80);
  const[pWEnd,setPWEnd]=useState((lastW||80)-4);

  function createPlan(){
    const start=new Date(pStart+"T12:00:00");
    const end=new Date(pEnd+"T12:00:00");
    const numWeeks=Math.max(1,Math.ceil((end-start)/(7*24*3600*1000)));
    const wTarget=parseFloat(pWStart),wFinal=parseFloat(pWEnd);
    const calStart=plan.onCal;
    const calFinal=Math.round(calStart*(pType==="cut"?0.85:pType==="bulk"?1.1:1));
    const offCalFinal=Math.round(plan.offCal*(pType==="cut"?0.85:pType==="bulk"?1.1:1));
    const weeks=Array.from({length:numWeeks},(_,i)=>{
      const t=numWeeks>1?i/(numWeeks-1):0;
      const wDate=new Date(start);wDate.setDate(start.getDate()+i*7);
      return{
        week:i+1,date:wDate.toISOString().split("T")[0],
        onCal:Math.round(calStart+(calFinal-calStart)*t),
        offCal:Math.round(plan.offCal+(offCalFinal-plan.offCal)*t),
        onP:plan.onP,offP:plan.offP,
        onC:Math.round(plan.onC+(plan.onC*(pType==="cut"?0.7:pType==="bulk"?1.15:1)-plan.onC)*t),
        offC:Math.round(plan.offC+(plan.offC*(pType==="cut"?0.7:pType==="bulk"?1.15:1)-plan.offC)*t),
        onF:plan.onF,offF:plan.offF,
        weightTarget:+(wTarget+(wFinal-wTarget)*t).toFixed(1),
        note:"",
      };
    });
    setPlanning({name:pName||`${pType.charAt(0).toUpperCase()+pType.slice(1)} ${new Date().getFullYear()}`,type:pType,startDate:pStart,weeks});
    setPlanningView("edit");
  }

  const numW=Math.max(1,Math.ceil((new Date(pEnd+"T12:00:00")-new Date(pStart+"T12:00:00"))/(7*24*3600*1000)));

  return(
    <>
      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:4}}>Nuovo piano</div>
      <div style={{fontSize:14,color:C.sub,marginBottom:18}}>Imposta le basi — potrai modificare ogni settimana dopo</div>
      <Card C={C}>
        <div style={{fontSize:14,color:C.sub,marginBottom:14,fontWeight:500}}>Tipo di piano</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
          {[["cut","Cut","Deficit calorico",C.orange],["bulk","Bulk","Surplus calorico",C.green],["recomp","Recomp","Mantenimento+",C.blue],["maint","Mantenimento","Calorie stabili",C.teal]].map(([v,l,s,color])=>(
            <button key={v} onClick={()=>setPType(v)}
              style={{padding:"14px 10px",background:pType===v?`${color}14`:C.bg2,border:`1.5px solid ${pType===v?color:C.border}`,borderRadius:14,cursor:"pointer",textAlign:"center",fontFamily:C.f,transition:"all 0.2s"}}>
              <div style={{fontSize:15,fontWeight:700,color:pType===v?color:C.text,marginBottom:3}}>{l}</div>
              <div style={{fontSize:12,color:C.muted}}>{s}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card C={C}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>Nome piano (opzionale)</div>
            <input value={pName} onChange={e=>setPName(e.target.value)} placeholder="Es: Cut estate 2026" style={inp}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <div>
              <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>Data inizio</div>
              <input type="date" value={pStart} onChange={e=>setPStart(e.target.value)} style={inp}/>
            </div>
            <div>
              <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>Data fine</div>
              <input type="date" value={pEnd} onChange={e=>setPEnd(e.target.value)} style={inp}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <div>
              <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>Peso iniziale (kg)</div>
              <input type="number" step="0.1" value={pWStart} onChange={e=>setPWStart(e.target.value)} style={inp}/>
            </div>
            <div>
              <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>Peso target (kg)</div>
              <input type="number" step="0.1" value={pWEnd} onChange={e=>setPWEnd(e.target.value)} style={inp}/>
            </div>
          </div>
        </div>
      </Card>
      <div style={{fontSize:13,color:C.muted,textAlign:"center"}}>{numW} settimane · {numW*7} giorni</div>
      <button onClick={createPlan}
        style={{width:"100%",padding:14,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:C.f,boxShadow:`0 4px 16px ${C.blue}30`}}>
        Genera piano →
      </button>
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const[isDark,setIsDark]=useState(()=>localStorage.getItem("atk_theme")!=="light");
  const C=isDark?DARK:LIGHT;
  const[user,setUser]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);

  useEffect(()=>{
    sb.auth.getSession().then(({data:{session}})=>{setUser(session?.user||null);setAuthLoading(false);});
    const{data:{subscription}}=sb.auth.onAuthStateChange((_,session)=>setUser(session?.user||null));
    return()=>subscription.unsubscribe();
  },[]);

  const[plan,setPlan]=useState(()=>{try{return JSON.parse(localStorage.getItem(LS))||DEFAULT_PLAN;}catch{return DEFAULT_PLAN;}});
  const[planHistory,setPlanHistory]=useState([]);
  const[days,setDays]=useState({});
  const[weightLog,setWeightLog]=useState([]);
  const[loading,setLoading]=useState(true);
  const[syncing,setSyncing]=useState(false);
  const[tab,setTab]=useState("dashboard");
  const[sidebarCollapsed,setSidebarCollapsed]=useState(()=>localStorage.getItem("atk_sidebar")==="collapsed");
  const[demoMode,setDemoMode]=useState(false);
  const[sidebarMode,setSidebarMode]=useState("dashboard");
  const[checkinCardioSessions,setCheckinCardioSessions]=useState("");
  const[checkinCardioMinutes,setCheckinCardioMinutes]=useState("");
  const[checkinCardioMinutesPerSession,setCheckinCardioMinutesPerSession]=useState("");
  const[checkinCardioType,setCheckinCardioType]=useState("");
  const[checkinNotes,setCheckinNotes]=useState("");
  const[checkinLoaded,setCheckinLoaded]=useState(false);
  const[weekCheckins,setWeekCheckins]=useState({});
  const[toast,setToast]=useState(null);
  const[editDay,setEditDay]=useState(null);
  const[planSec,setPlanSec]=useState("current");
  const[calRange,setCalRange]=useState(30);
  const[planning,setPlanning]=useState(null);
  const[planningView,setPlanningView]=useState("setup");
  const[mealPlanOn,setMealPlanOn]=useState(null);
  const[mealPlanOff,setMealPlanOff]=useState(null);
  const[dayMeals,setDayMeals]=useState({});
  const[mealPlanOnId,setMealPlanOnId]=useState(null);
  const[mealPlanOffId,setMealPlanOffId]=useState(null);
  const[mealFluidOn,setMealFluidOn]=useState("");
  const[mealSodiumOn,setMealSodiumOn]=useState("");
  const[mealFluidOff,setMealFluidOff]=useState("");
  const[mealSodiumOff,setMealSodiumOff]=useState("");
  const[dashPeriod,setDashPeriod]=useState("6m");
  const[showAllWeights,setShowAllWeights]=useState(false);
  const[dayTypeMenuOpen,setDayTypeMenuOpen]=useState(false);
  const[checkinSessionOpen,setCheckinSessionOpen]=useState(null);
  const[expandedDay,setExpandedDay]=useState(null);
  const[trainingTypeMenuOpen,setTrainingTypeMenuOpen]=useState(false);
  const DAY_LABELS=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
  const DAY_LABELS_EN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const[dayPattern,setDayPattern]=useState(()=>{try{return JSON.parse(localStorage.getItem("atk_day_pattern"))||["on","on","on","on","off","off","off"];}catch{return["on","on","on","on","off","off","off"];}});
  useEffect(()=>{localStorage.setItem("atk_day_pattern",JSON.stringify(dayPattern));},[dayPattern]);
  const TRAINING_COLORS=["blue","teal","purple","orange","green","pink"];
  const PHASE_OPTIONS=[{id:"cut",name:"Cut",color:"orange"},{id:"bulk",name:"Bulk",color:"green"},{id:"recomp",name:"Recomp",color:"blue"},{id:"maint",name:"Maintenance",color:"teal"},{id:"priming",name:"Priming",color:"indigo"},{id:"minidiet",name:"Mini Diet",color:"purple"}];
  const[trainingTypes,setTrainingTypes]=useState(()=>{try{return JSON.parse(localStorage.getItem("atk_training_types"))||[{id:"t1",name:"Upper",color:"blue"},{id:"t2",name:"Lower",color:"teal"},{id:"t3",name:"Riposo",color:"muted"}];}catch{return[{id:"t1",name:"Upper",color:"blue"},{id:"t2",name:"Lower",color:"teal"},{id:"t3",name:"Riposo",color:"muted"}];}});
  useEffect(()=>{localStorage.setItem("atk_training_types",JSON.stringify(trainingTypes));},[trainingTypes]);
  const[trainingPattern,setTrainingPattern]=useState(()=>{try{return JSON.parse(localStorage.getItem("atk_training_pattern"))||["t1","t2","t3","t1","t2","t3","t3"];}catch{return["t1","t2","t3","t1","t2","t3","t3"];}});
  useEffect(()=>{localStorage.setItem("atk_training_pattern",JSON.stringify(trainingPattern));},[trainingPattern]);
  useEffect(()=>{
    if(!trainingTypes.length)return;
    const validIds=new Set(trainingTypes.map(t=>t.id));
    setTrainingPattern(p=>{
      if(p.every(id=>validIds.has(id)))return p;
      return p.map(id=>validIds.has(id)?id:trainingTypes[0].id);
    });
  },[trainingTypes]);
  const[trainingDayOpen,setTrainingDayOpen]=useState(null);

  useEffect(()=>{localStorage.setItem("atk_theme",isDark?"dark":"light");},[isDark]);
  useEffect(()=>{localStorage.setItem("atk_sidebar",sidebarCollapsed?"collapsed":"expanded");},[sidebarCollapsed]);
  useEffect(()=>{localStorage.setItem(LS,JSON.stringify(plan));},[plan]);

  useEffect(()=>{
    if(!user)return;
    async function fetchAll(){
      setLoading(true);
      try{
        const[dr,wr,pr,plr,mpr,wcr]=await Promise.all([
          sb.from("athlete_days").select("*").eq("user_id",user.id),
          sb.from("athlete_weight").select("*").eq("user_id",user.id).order("date"),
          sb.from("athlete_plan_history").select("*").eq("user_id",user.id).order("date"),
          sb.from("athlete_planning").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1),
          sb.from("athlete_meal_plan").select("*").eq("user_id",user.id),
          sb.from("athlete_week_checkin").select("*").eq("user_id",user.id),
        ]);
        if(dr.data){const map={};dr.data.forEach(r=>{map[r.date]={type:r.type,calories:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat,steps:r.steps,note:r.note,isEstimate:r.is_estimate,cardioMinutes:r.cardio_minutes,trainingType:r.training_type};});setDays(map);}
        if(wr.data)setWeightLog(wr.data.map(r=>({date:r.date,weight:r.weight,note:r.note})));
        if(wcr.data){
          const map={};
          wcr.data.forEach(r=>{map[r.week_start]={cardioSessions:r.cardio_target_sessions,cardioMinutes:r.cardio_target_minutes,cardioMinutesPerSession:r.cardio_minutes_per_session,cardioType:r.cardio_type,notes:r.notes,phase:r.phase};});
          setWeekCheckins(map);
          const cur=map[getWeekDates(0)[0]];
          if(cur){
            setCheckinCardioSessions(cur.cardioSessions??"");
            setCheckinCardioMinutes(cur.cardioMinutes??"");
            setCheckinCardioMinutesPerSession(cur.cardioMinutesPerSession??"");
            setCheckinCardioType(cur.cardioType??"");
            setCheckinNotes(cur.notes??"");
          }
          setCheckinLoaded(true);
        }
        if(pr.data&&pr.data.length){
          const sorted=[...pr.data].sort((a,b)=>a.date.localeCompare(b.date));
          setPlanHistory(sorted.map(r=>({date:r.date,onCal:r.on_cal,onP:r.on_p,onC:r.on_c,onF:r.on_f,offCal:r.off_cal,offP:r.off_p,offC:r.off_c,offF:r.off_f})));
          // Aggiorna il piano attivo con l'ultimo valore da Supabase
          const last=sorted[sorted.length-1];
          setPlan({onCal:last.on_cal,onP:last.on_p,onC:last.on_c,onF:last.on_f,offCal:last.off_cal,offP:last.off_p,offC:last.off_c,offF:last.off_f});
        }else{
          const init={date:"2020-01-01",...DEFAULT_PLAN};
          setPlanHistory([init]);
          await sb.from("athlete_plan_history").insert({date:init.date,on_cal:init.onCal,on_p:init.onP,on_c:init.onC,on_f:init.onF,off_cal:init.offCal,off_p:init.offP,off_c:init.offC,off_f:init.offF,user_id:user.id});
        }
        if(plr.data&&plr.data.length){
          const p=plr.data[0];
          setPlanning({id:p.id,name:p.name,type:p.type,startDate:p.start_date,weeks:p.weeks||[]});
          setPlanningView("view");
        }
        if(mpr.data){
          const on=mpr.data.find(m=>m.type==="on");
          const off=mpr.data.find(m=>m.type==="off");
          if(on){setMealPlanOn(on.meals||[]);setMealPlanOnId(on.id);setMealFluidOn(on.fluid_l??"");setMealSodiumOn(on.sodium_g??"");}
          if(off){setMealPlanOff(off.meals||[]);setMealPlanOffId(off.id);setMealFluidOff(off.fluid_l??"");setMealSodiumOff(off.sodium_g??"");}
        }
      }catch(e){console.error(e);}
      setLoading(false);
    }
    fetchAll();
  },[user]);

  const currentWeekStart=()=>getWeekDates(0)[0];
  async function saveCheckin(){
    const ws=currentWeekStart();
    const payload={user_id:user.id,week_start:ws,cardio_target_sessions:checkinCardioSessions?+checkinCardioSessions:null,cardio_target_minutes:checkinCardioMinutes?+checkinCardioMinutes:null,cardio_minutes_per_session:checkinCardioMinutesPerSession?+checkinCardioMinutesPerSession:null,cardio_type:checkinCardioType||null,notes:checkinNotes};
    const{error}=await sb.from("athlete_week_checkin").upsert(payload,{onConflict:"user_id,week_start"});
    if(error)console.error(error);
    else{
      showToast("Check-in salvato");
      setWeekCheckins(p=>({...p,[ws]:{cardioSessions:checkinCardioSessions?+checkinCardioSessions:null,cardioMinutes:checkinCardioMinutes?+checkinCardioMinutes:null,cardioMinutesPerSession:checkinCardioMinutesPerSession?+checkinCardioMinutesPerSession:null,cardioType:checkinCardioType||null,notes:checkinNotes}}));
    }
  }

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2200);};

  const setDay=(date,data)=>setDays(p=>({...p,[date]:{...(p[date]||{}),...data}}));

  async function upsertDay(date,data){
    setDay(date,data);
    setSyncing(true);
    const merged={...(days[date]||{}),...data};
    const existing=await sb.from("athlete_days").select("id").eq("date",date).eq("user_id",user.id).maybeSingle();
    if(existing.data){
      await sb.from("athlete_days").update({type:merged.type,calories:merged.calories,protein:merged.protein,carbs:merged.carbs,fat:merged.fat,steps:merged.steps,note:merged.note,is_estimate:merged.isEstimate,cardio_minutes:merged.cardioMinutes,training_type:merged.trainingType}).eq("date",date).eq("user_id",user.id);
    }else{
      await sb.from("athlete_days").insert({date,type:merged.type,calories:merged.calories,protein:merged.protein,carbs:merged.carbs,fat:merged.fat,steps:merged.steps,note:merged.note,is_estimate:merged.isEstimate,cardio_minutes:merged.cardioMinutes,training_type:merged.trainingType,user_id:user.id});
    }
    setSyncing(false);
  }
  async function upsertWeight(date,weight,note=""){
    setWeightLog(p=>[...p.filter(x=>x.date!==date),{date,weight:parseFloat(weight),note}].sort((a,b)=>a.date.localeCompare(b.date)));
    setSyncing(true);
    const existingW=await sb.from("athlete_weight").select("id").eq("date",date).eq("user_id",user.id).maybeSingle();
    if(existingW.data){
      const{error}=await sb.from("athlete_weight").update({weight:parseFloat(weight),note}).eq("date",date).eq("user_id",user.id);
      if(error)console.error("weight update error",error);
    }else{
      const{error}=await sb.from("athlete_weight").insert({date,weight:parseFloat(weight),note,user_id:user.id});
      if(error)console.error("weight insert error",error);
    }
    setSyncing(false);
  }
  async function deleteWeight(date){
    setWeightLog(p=>p.filter(x=>x.date!==date));
    await sb.from("athlete_weight").delete().eq("date",date).eq("user_id",user.id);
  }
  async function upsertWeekField(weekStart,field,value){
    setWeekCheckins(p=>({...p,[weekStart]:{...(p[weekStart]||{}),[field]:value}}));
    const payload={user_id:user.id,week_start:weekStart,[field]:value};
    const{error}=await sb.from("athlete_week_checkin").upsert(payload,{onConflict:"user_id,week_start"});
    if(error)console.error("week field upsert error",error);
  }
  const upsertWeekPhase=(weekStart,phase)=>upsertWeekField(weekStart,"phase",phase);
  const CARDIO_DB_FIELD={cardioSessions:"cardio_target_sessions",cardioMinutesPerSession:"cardio_minutes_per_session",cardioType:"cardio_type"};
  async function upsertWeekCardioField(weekStart,localField,value){
    setWeekCheckins(p=>({...p,[weekStart]:{...(p[weekStart]||{}),[localField]:value}}));
    const dbField=CARDIO_DB_FIELD[localField];
    const payload={user_id:user.id,week_start:weekStart,[dbField]:value};
    const{error}=await sb.from("athlete_week_checkin").upsert(payload,{onConflict:"user_id,week_start"});
    if(error)console.error("cardio field upsert error",error);
  }
  async function deletePlanVar(date){
    setPlanHistory(p=>p.filter(x=>x.date!==date));
    await sb.from("athlete_plan_history").delete().eq("date",date).eq("user_id",user.id);
    showToast("Variazione eliminata");
  }
  async function savePlanVar(){
    const t=todayStr();
    const sorted=[...planHistory].sort((a,b)=>a.date.localeCompare(b.date));
    const last=sorted[sorted.length-1];
    const changed=!last||last.onCal!==plan.onCal||last.offCal!==plan.offCal||last.onP!==plan.onP||last.offP!==plan.offP;
    if(changed){
      setPlanHistory(p=>[...p.filter(x=>x.date!==t),{date:t,...plan}]);
      setSyncing(true);
      const existingP=await sb.from("athlete_plan_history").select("id").eq("date",t).eq("user_id",user.id).maybeSingle();
      if(existingP.data){
        await sb.from("athlete_plan_history").update({on_cal:plan.onCal,on_p:plan.onP,on_c:plan.onC,on_f:plan.onF,off_cal:plan.offCal,off_p:plan.offP,off_c:plan.offC,off_f:plan.offF}).eq("date",t).eq("user_id",user.id);
      }else{
        await sb.from("athlete_plan_history").insert({date:t,on_cal:plan.onCal,on_p:plan.onP,on_c:plan.onC,on_f:plan.onF,off_cal:plan.offCal,off_p:plan.offP,off_c:plan.offC,off_f:plan.offF,user_id:user.id});
      }
      setSyncing(false);
      showToast("Variazione registrata");
    }else showToast("Nessuna modifica");
  }

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const today=todayStr();
  const todayData=days[today]||{};
  const autoType=dayPattern[weekdayIdx(today)];
  const todayType=todayData.type||autoType;
  const tpl=todayType?{cal:plan[todayType+"Cal"],p:plan[todayType+"P"],c:plan[todayType+"C"],f:plan[todayType+"F"]}:null;
  const autoTrainingTypeId=trainingPattern[weekdayIdx(today)];
  const todayTrainingTypeId=todayData.trainingType||autoTrainingTypeId;
  const todayTrainingType=trainingTypes.find(t=>t.id===todayTrainingTypeId)||null;
  const todayWeight=weightLog.find(w=>w.date===today)?.weight??null;
  const todayLong=(()=>{const d=new Date(today+"T12:00:00");const wd=d.toLocaleDateString("it-IT",{weekday:"long"});const mo=d.toLocaleDateString("it-IT",{month:"long"});return `${wd.charAt(0).toUpperCase()+wd.slice(1)} · ${d.getDate()} ${mo.charAt(0).toUpperCase()+mo.slice(1)}`;})();

  useEffect(()=>{
    if(!user||loading)return;
    if(!days[today]?.type&&autoType){
      upsertDay(today,{type:autoType});
    }
  },[user,loading,today,autoType]);
  const lastW=weightLog.length?weightLog[weightLog.length-1].weight:null;
  const prevW=weightLog.length>1?weightLog[weightLog.length-2].weight:null;
  const yest=new Date();yest.setDate(yest.getDate()-1);
  const yesterdayStr=yest.toISOString().split("T")[0];
  const yesterdayW=weightLog.find(w=>w.date===yesterdayStr)?.weight||null;
  const wDelta=lastW&&yesterdayW?+(lastW-yesterdayW).toFixed(1):lastW&&prevW?+(lastW-prevW).toFixed(1):null;
  const wDeltaLabel=yesterdayW?"vs ieri":"vs prec.";
  const thisWkDates=getWeekDates(0);
  const prevWkDates=getWeekDates(-1);
  const thisWkW=weightLog.filter(w=>thisWkDates.includes(w.date)).map(w=>w.weight);
  const prevWkW=weightLog.filter(w=>prevWkDates.includes(w.date)).map(w=>w.weight);
  const avgW7=thisWkW.length?+(thisWkW.reduce((a,b)=>a+b,0)/thisWkW.length).toFixed(1):null;
  const avgW7prev=prevWkW.length?+(prevWkW.reduce((a,b)=>a+b,0)/prevWkW.length).toFixed(1):null;
  const avgW7delta=avgW7&&avgW7prev?+(avgW7-avgW7prev).toFixed(1):null;
  const sortedPH=useMemo(()=>[...planHistory].sort((a,b)=>a.date.localeCompare(b.date)),[planHistory]);
  const curPlan=sortedPH[sortedPH.length-1];
  const weeksOn=curPlan?Math.floor((new Date(today)-new Date(curPlan.date))/(7*24*3600*1000)):0;

  // Ogni volta che il Meal Plan cambia davvero, registra una nuova voce datata nello storico —
  // così le settimane passate in Daily Data restano quello che erano, non si aggiornano retroattivamente.
  useEffect(()=>{
    if(!user||loading||!mealPlanOn||!mealPlanOff)return;
    const on=mealPlanTotals(mealPlanOn);
    const off=mealPlanTotals(mealPlanOff);
    if(on.cal===0&&off.cal===0)return; // niente ancora compilato nel Meal Plan
    const last=sortedPH[sortedPH.length-1];
    const changed=!last||last.onCal!==on.cal||last.onP!==on.p||last.onC!==on.c||last.onF!==on.f||last.offCal!==off.cal||last.offP!==off.p||last.offC!==off.c||last.offF!==off.f;
    if(!changed)return;
    const t=setTimeout(async()=>{
      const d=todayStr();
      const payload={on_cal:on.cal,on_p:on.p,on_c:on.c,on_f:on.f,off_cal:off.cal,off_p:off.p,off_c:off.c,off_f:off.f};
      const existing=await sb.from("athlete_plan_history").select("id").eq("date",d).eq("user_id",user.id).maybeSingle();
      if(existing.data){
        await sb.from("athlete_plan_history").update(payload).eq("id",existing.data.id).eq("user_id",user.id);
      }else{
        await sb.from("athlete_plan_history").insert({date:d,...payload,user_id:user.id});
      }
      setPlanHistory(p=>[...p.filter(x=>x.date!==d),{date:d,onCal:on.cal,onP:on.p,onC:on.c,onF:on.f,offCal:off.cal,offP:off.p,offC:off.c,offF:off.f}]);
    },2000);
    return()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mealPlanOn,mealPlanOff,user,loading]);
  function computeWeekStats(offset){
    const dates=getWeekDates(offset);
    const logged=dates.map(d=>days[d]).filter(Boolean);
    const withCal=logged.filter(d=>d.calories);
    const onDays=withCal.filter(d=>d.type==="on");
    const offDays=withCal.filter(d=>d.type==="off");
    const weekWeights=dates.map(d=>weightLog.find(w=>w.date===d)?.weight).filter(w=>w!=null);
    return{
      weekStart:dates[0],weekEnd:dates[6],
      avgCal:avg(withCal.map(d=>d.calories)),
      avgCalOn:avg(onDays.map(d=>d.calories)),
      avgCalOff:avg(offDays.map(d=>d.calories)),
      onCount:onDays.length,
      offCount:offDays.length,
      avgProt:avg(withCal.map(d=>d.protein).filter(Boolean)),
      avgCarb:avg(withCal.map(d=>d.carbs).filter(Boolean)),
      avgFat:avg(withCal.map(d=>d.fat).filter(Boolean)),
      avgSteps:avg(logged.map(d=>d.steps).filter(Boolean)),
      avgWeight:weekWeights.length?+(weekWeights.reduce((a,b)=>a+b,0)/weekWeights.length).toFixed(1):null,
      cardioMinutesTotal:logged.reduce((s,d)=>s+(d.cardioMinutes||0),0),
    };
  }
  const weeklyStats=useMemo(()=>Array.from({length:8},(_,i)=>{
    return{
      ...computeWeekStats(i-7),
      label:i===7?"Questa":i===6?"Scorsa":`S${i+1}`,
    };
  }),[days,weightLog]);
  const thisWeek=weeklyStats[7],lastWeek=weeklyStats[6];
  const calDelta=thisWeek.avgCal&&lastWeek.avgCal?thisWeek.avgCal-lastWeek.avgCal:null;
  // Calcola media obiettivo settimanale basata sui giorni ON/OFF reali della settimana
  const thisWeekDaysData=getWeekDates(0).map(d=>days[d]).filter(Boolean);
  const onDaysCount=thisWeekDaysData.filter(d=>d.type==="on").length;
  const offDaysCount=thisWeekDaysData.filter(d=>d.type==="off").length;
  const loggedDaysCount=onDaysCount+offDaysCount;
  const planTargetAvg=loggedDaysCount>0?Math.round((onDaysCount*plan.onCal+offDaysCount*plan.offCal)/loggedDaysCount):null;
  const calGap=thisWeek.avgCal&&planTargetAvg?thisWeek.avgCal-planTargetAvg:null;
  const sortedDays=useMemo(()=>Object.entries(days).sort(([a],[b])=>a.localeCompare(b)),[days]);

  // ── TRAINING PLAN: storico settimane complete, dalla prima con dati a oggi ──
  const[collapsedWeeks,setCollapsedWeeks]=useState(()=>new Set());
  const toggleWeek=weekStart=>setCollapsedWeeks(p=>{const n=new Set(p);n.has(weekStart)?n.delete(weekStart):n.add(weekStart);return n;});
  const firstDataDate=[sortedDays[0]?.[0],weightLog[0]?.date].filter(Boolean).sort()[0]||null;
  const earliestWeekOffset=useMemo(()=>{
    if(!firstDataDate)return 0;
    const d=new Date(firstDataDate+"T12:00:00");
    const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));
    const thisMon=new Date(getWeekDates(0)[0]+"T12:00:00");
    return Math.round((mon-thisMon)/(7*24*3600*1000));
  },[firstDataDate]);
  function mealPlanTotals(meals){
    const t=(meals||[]).reduce((a,m)=>({protein:a.protein+(+m.protein||0),carbs:a.carbs+(+m.carbs||0),fat:a.fat+(+m.fat||0),kcal:a.kcal+(+m.kcal||0)}),{protein:0,carbs:0,fat:0,kcal:0});
    return{cal:t.kcal,p:t.protein,c:t.carbs,f:t.fat};
  }
  const trainingPlanWeeks=useMemo(()=>{
    if(!firstDataDate)return[];
    const weeks=[];
    for(let off=earliestWeekOffset;off<=0;off++){
      const stats=computeWeekStats(off);
      const checkin=weekCheckins[stats.weekStart]||{};
      const planAtWeek=getPlanAt(sortedPH,stats.weekEnd);
      weeks.push({
        ...stats,
        weekIndex:off-earliestWeekOffset+1,
        trainingDays:planAtWeek?{cal:planAtWeek.onCal,p:planAtWeek.onP,c:planAtWeek.onC,f:planAtWeek.onF}:{cal:0,p:0,c:0,f:0},
        nonTrainingDays:planAtWeek?{cal:planAtWeek.offCal,p:planAtWeek.offP,c:planAtWeek.offC,f:planAtWeek.offF}:{cal:0,p:0,c:0,f:0},
        cardio:{sessions:checkin.cardioSessions,minutesPerSession:checkin.cardioMinutesPerSession,type:checkin.cardioType},
        notes:checkin.notes,
        days:getWeekDates(off).map(date=>{
          const d=days[date]||{};
          const typeId=d.trainingType||null;
          const type=trainingTypes.find(t=>t.id===typeId);
          const dayType=d.type||dayPattern[weekdayIdx(date)];
          return{
            date,
            sessionTypeId:typeId,
            session:type?.name||"—",
            sessionColor:type?.color,
            weight:weightLog.find(w=>w.date===date)?.weight??null,
            steps:d.steps??null,
            dayType,
            calories:d.calories??null,
            protein:d.protein??null,
            carbs:d.carbs??null,
            fat:d.fat??null,
            note:d.note??"",
          };
        }),
      });
    }
    return weeks; // Week 1 (più vecchia) prima, poi in ordine cronologico verso oggi
  },[days,weightLog,weekCheckins,sortedPH,trainingTypes,trainingPattern,dayPattern,firstDataDate,earliestWeekOffset]);

  // ── BW TRACKER: settimane raggruppate per mese, con fase manuale ──
  const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const bwMonths=useMemo(()=>{
    const firstW=weightLog[0]?.date;
    if(!firstW)return[];
    const d=new Date(firstW+"T12:00:00");
    const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));
    const thisMon=new Date(getWeekDates(0)[0]+"T12:00:00");
    const earliestOff=Math.round((mon-thisMon)/(7*24*3600*1000));
    const weeks=[];
    for(let off=earliestOff;off<=0;off++){
      const dates=getWeekDates(off);
      const ws=dates.map(dt=>weightLog.find(w=>w.date===dt)?.weight).filter(w=>w!=null);
      const avgWeight=ws.length?+(ws.reduce((a,b)=>a+b,0)/ws.length).toFixed(1):null;
      const weekStart=dates[0];
      const monthKey=`${weekStart.slice(0,4)}-${weekStart.slice(5,7)}`;
      weeks.push({weekStart,weekEnd:dates[6],weekNumber:off-earliestOff+1,avgWeight,monthKey,phase:weekCheckins[weekStart]?.phase||null});
    }
    const byMonth={};
    weeks.forEach(w=>{(byMonth[w.monthKey]=byMonth[w.monthKey]||[]).push(w);});
    return Object.keys(byMonth).sort().map(key=>{
      const[y,m]=key.split("-");
      const mWeeks=byMonth[key];
      const avgs=mWeeks.map(w=>w.avgWeight).filter(v=>v!=null);
      const monthlyAvg=avgs.length?+(avgs.reduce((a,b)=>a+b,0)/avgs.length).toFixed(1):null;
      return{key,label:`${MONTH_NAMES[+m-1]}`,year:y,weeks:mWeeks,monthlyAvg};
    }).map((mo,i,arr)=>{
      const prev=i>0?arr[i-1].monthlyAvg:null;
      const diff=mo.monthlyAvg!=null&&prev!=null?+(mo.monthlyAvg-prev).toFixed(1):null;
      const pct=diff!=null&&prev?+(diff/prev*100).toFixed(1):null;
      return{...mo,diff,pct};
    });
  },[weightLog,weekCheckins]);
  const[bwPhaseOpen,setBwPhaseOpen]=useState(null);

  // ── TIMELINE: tutte le settimane dell'anno corrente ──
  const timelineYear=+today.slice(0,4);
  const timelineWeeks=useMemo(()=>{
    // primo lunedì >= 1 gennaio dell'anno corrente
    const first=new Date(timelineYear,0,1);
    const shift=(first.getDay()+6)%7; // 0 se già lunedì
    const firstMonday=new Date(first);firstMonday.setDate(first.getDate()+(shift===0?0:7-shift));
    const weeks=[];
    let d=new Date(firstMonday);
    while(d.getFullYear()===timelineYear){
      const ws=d.toISOString().split("T")[0];
      weeks.push({weekStart:ws,phase:weekCheckins[ws]?.phase||null,notes:weekCheckins[ws]?.notes||""});
      d.setDate(d.getDate()+7);
    }
    return weeks;
  },[timelineYear,weekCheckins]);
  const[timelinePhaseOpen,setTimelinePhaseOpen]=useState(null);

  const weekCalChart=weeklyStats.filter(w=>w.avgCal).map(w=>({week:w.label,Media:w.avgCal}));
  // Calorie line chart — ultimi N giorni
  const calLineChart56=sortedDays.slice(-56).map(([date,d])=>{
    const p=getPlanAt(planHistory,date);
    return{date:fmtShort(date),Calorie:d.calories||null,Target:d.type&&p?p[d.type+"Cal"]:null,tipo:d.type};
  });
  const weightChart=weightLog.slice(-60).map(w=>({date:fmtShort(w.date),Peso:w.weight}));
  const weightWeeklyAvg=useMemo(()=>{
    const weeks=[];
    for(let i=-7;i<=0;i++){
      const dates=getWeekDates(i);
      const ws=weightLog.filter(w=>dates.includes(w.date)).map(w=>w.weight);
      if(ws.length)weeks.push({date:fmtShort(dates[3]),Media:+(ws.reduce((a,b)=>a+b,0)/ws.length).toFixed(1)});
    }
    return weeks;
  },[weightLog]);
  const stepsChart=sortedDays.slice(-14).map(([date,d])=>({date:fmtShort(date),Passi:d.steps||0}));
  const planDeltas=sortedPH.slice(1).map((p,i)=>{
    const dOn=p.onCal-sortedPH[i].onCal,dOff=p.offCal-sortedPH[i].offCal;
    const avgNew=Math.round((p.onCal*4+p.offCal*3)/7),avgOld=Math.round((sortedPH[i].onCal*4+sortedPH[i].offCal*3)/7);
    const dOnP=p.onP-sortedPH[i].onP,dOffP=p.offP-sortedPH[i].offP;
    const dOnC=p.onC-sortedPH[i].onC,dOffC=p.offC-sortedPH[i].offC;
    const dOnF=p.onF-sortedPH[i].onF,dOffF=p.offF-sortedPH[i].offF;
    return{date:p.date,dOn,dOff,newOn:p.onCal,newOff:p.offCal,dAvg:avgNew-avgOld,
      dOnP,dOffP,dOnC,dOffC,dOnF,dOffF};
  });
  const inp={background:C.bg3,border:`1px solid ${C.border}`,borderRadius:13,color:C.text,padding:"10px 13px",fontSize:15,outline:"none",width:"100%",fontFamily:C.f,boxSizing:"border-box"};

  const NAV=[
    {id:"dashboard",group:"Panoramica",label:"Dashboard",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>},
    {id:"trainingplan",group:"Panoramica",label:"Daily Data",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>},
    {id:"peso",group:"Progressi",label:"BW Tracker",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
    {id:"planning",group:"Progressi",label:"Timeline",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
    {id:"piano",group:"Alimentazione",label:"Training Plan",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>},
    {id:"meal",group:"Alimentazione",label:"Meal Plan",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>},
  ];
  const NAV_GROUPS=[...new Set(NAV.map(n=>n.group))];

  if(authLoading)return(
    <div style={{minHeight:"100vh",background:DARK.bg0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:DARK.blue,animation:`pulse 1.1s ${i*0.18}s infinite ease-in-out`}}/>)}</div>
    </div>
  );
  if(!user)return <AuthScreen C={C}/>;
  if(loading)return(
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,fontFamily:C.f}}>
      <div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.blue,animation:`pulse 1.1s ${i*0.18}s infinite ease-in-out`}}/>)}</div>
      <span style={{fontSize:14,color:C.muted}}>Caricamento dati…</span>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg0,color:C.text,fontFamily:C.f,paddingBottom:88,overflowX:"hidden"}}>

      {/* HEADER */}
      <div style={{background:C.headerBg,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.borderHi}`,padding:"0 32px",position:"sticky",top:0,zIndex:100,height:72}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1760,margin:"0 auto",height:"100%",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0,flexShrink:0}}>
            <span style={{width:22,height:22,background:C.pink,flexShrink:0}}/>
            <span style={{fontSize:20,fontWeight:700,letterSpacing:-0.3,color:C.text,fontFamily:C.fTight}}>athlete tracker</span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flex:1,justifyContent:"center",minWidth:0,overflow:"hidden"}}>
            <button onClick={()=>setDemoMode(p=>!p)}
              style={{display:"flex",alignItems:"center",gap:7,background:demoMode?`${C.pink}14`:C.bg2,border:`1px solid ${demoMode?C.pink+"40":C.border}`,borderRadius:6,padding:"7px 12px",cursor:"pointer",fontFamily:C.f}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:demoMode?C.pink:C.muted,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:500,color:demoMode?C.pink:C.sub}}>modalità demo{demoMode?" attiva":""}</span>
            </button>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            {syncing&&<span style={{fontSize:13,color:C.muted}}>Sync…</span>}
            <button onClick={()=>{const el=document.documentElement;if(!document.fullscreenElement){el.requestFullscreen?.();}else{document.exitFullscreen?.();}}} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}} title="Schermo intero">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
            <button onClick={()=>setIsDark(p=>!p)} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
              {isDark
                ?<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                :<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
            <button onClick={()=>sb.auth.signOut()} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}} title="Esci">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1760,margin:"0 auto",padding:"28px 32px"}}>
        <div style={{display:"grid",gridTemplateColumns:typeof window!=="undefined"&&window.innerWidth>=768?(sidebarCollapsed?"72px 1fr":"250px 1fr"):"1fr",gap:32,alignItems:"start",transition:"grid-template-columns 0.2s ease"}}>

          {/* SIDEBAR desktop */}
          {typeof window!=="undefined"&&window.innerWidth>=768&&(
            <div style={{position:"sticky",top:90,display:"flex",flexDirection:"column",gap:18}}>
              {!sidebarCollapsed&&(
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 14px"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${C.pink}18`,border:`1px solid ${C.pink}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.pink,fontFamily:C.fTight,flexShrink:0}}>
                    {(user?.email||"A")[0].toUpperCase()}
                  </div>
                  <span style={{fontSize:13,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</span>
                </div>
              )}
              <button onClick={()=>setSidebarCollapsed(p=>!p)} title={sidebarCollapsed?"Espandi menu":"Riduci menu"}
                style={{display:"flex",alignItems:"center",justifyContent:sidebarCollapsed?"center":"flex-end",padding:"0 6px",background:"none",border:"none",cursor:"pointer",fontFamily:C.f}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/>
                  {sidebarCollapsed?<polyline points="5 10 8 12 5 14"/>:<polyline points="18 10 15 12 18 14"/>}
                </svg>
              </button>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {NAV.map(n=>{
                  const active=tab===n.id;
                  return(
                    <button key={n.id} onClick={()=>setTab(n.id)} title={sidebarCollapsed?n.label:undefined}
                      style={{display:"flex",alignItems:"center",padding:sidebarCollapsed?"15px 0":"15px 16px",justifyContent:sidebarCollapsed?"center":"flex-start",borderRadius:"0 10px 10px 0",border:"none",outline:"none",appearance:"none",WebkitAppearance:"none",borderLeft:`2px solid ${active?C.red:"transparent"}`,background:active?`linear-gradient(90deg,${C.red}1F,${C.red}08)`:"transparent",color:active?C.red:C.sub,fontSize:14,fontWeight:active?700:500,letterSpacing:0.5,textTransform:"uppercase",cursor:"pointer",fontFamily:C.f,textAlign:"left",transition:"all 0.15s"}}>
                      {!sidebarCollapsed?n.label:n.label[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CONTENT */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* ── DASHBOARD ── */}
            {tab==="dashboard"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <Kicker label="dashboard" C={C}/>
                {demoMode&&<Tag label="dati di esempio" color={C.pink}/>}
              </div>

              {(()=>{
                const demo=demoMode?generateDemoData():null;
                const srcChart=demo?demo.weightChart:weightChart;
                if(srcChart.length<2)return null;
                const periods={"1m":30,"3m":90,"6m":180,"1y":365,"all":9999};
                const n=periods[dashPeriod]||9999;
                const dataFull=srcChart.slice(-n);
                const values=dataFull.map(d=>d.Peso);
                const W=1000,H=300;
                const path=buildLinePath(values,W,H);
                const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
                const histBars=values.map(v=>18+((v-min)/range)*55);
                const badgeIdx=Math.max(0,Math.min(values.length-1,Math.floor((values.length-1)*0.75)));
                const badgePt=pointPct(values,badgeIdx,12,10);
                const idxLabels=[0,1,2,3,4,5].map(k=>Math.round(k*(dataFull.length-1)/5));
                const heroW=demo?demo.lastW:lastW;
                const heroDelta=demo?demo.avgW7delta:avgW7delta;
                return(
                  <Card C={C} onClick={()=>setTab("peso")} style={{position:"relative"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:1.2,fontFamily:C.fTight}}>Andamento peso</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:6}}>
                          <span style={typeStyle(TYPE.hero,C,{color:C.text,lineHeight:1})}>{heroW??'—'} <span style={{fontSize:14,fontWeight:500,color:C.sub}}>kg</span></span>
                          {heroDelta!=null&&<Tag label={`${heroDelta>0?"+":""}${heroDelta} sett.`} color={heroDelta<0?C.green:C.orange}/>}
                        </div>
                      </div>
                      <div onClick={e=>e.stopPropagation()} style={{display:"flex",background:C.bg2,borderRadius:6,padding:3,gap:2}}>
                        {[["1m","1M"],["3m","3M"],["6m","6M"],["1y","1A"],["all","Tutto"]].map(([v,l])=>(
                          <button key={v} onClick={()=>setDashPeriod(v)}
                            style={{padding:"6px 10px",border:"none",borderRadius:5,background:dashPeriod===v?C.bg4:"transparent",color:dashPeriod===v?C.text:C.sub,fontSize:12,fontWeight:dashPeriod===v?600:400,cursor:"pointer",fontFamily:C.f}}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{position:"relative",height:340}}>
                      <div style={{position:"absolute",left:0,right:0,bottom:22,top:"12%",display:"flex",alignItems:"flex-end",gap:2,opacity:0.5}}>
                        {histBars.map((h,i)=>(
                          <div key={i} style={{flex:1,height:`${h}%`,background:`linear-gradient(180deg,${C.pink}38,${C.pink}00)`}}/>
                        ))}
                      </div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"calc(100% - 22px)",display:"block",position:"relative"}} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="wgHero" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.pink} stopOpacity={0.3}/><stop offset="100%" stopColor={C.pink} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <path d={path.area} fill="url(#wgHero)" stroke="none"/>
                        <path d={path.line} fill="none" stroke={C.pink} strokeWidth={2.2}
                          style={{filter:`drop-shadow(0 0 6px ${C.pink}E6) drop-shadow(0 0 12px ${C.pink}80)`}}/>
                      </svg>
                      <div style={{position:"absolute",left:`${badgePt.xPct}%`,top:0,bottom:22,width:1,borderLeft:"1px dashed rgba(255,255,255,0.15)"}}/>
                      <div style={{position:"absolute",left:`${badgePt.xPct}%`,top:`${badgePt.yPct}%`,transform:"translate(-50%,-140%)",background:C.bg1,border:`1px solid ${C.glassBorder}`,borderRadius:6,padding:"8px 12px",whiteSpace:"nowrap",boxShadow:"0 12px 24px rgba(0,0,0,0.4)"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:C.fTight}}>{values[badgeIdx].toFixed(1)} kg</div>
                        <div style={{fontSize:10,color:C.sub}}>{dataFull[badgeIdx]?.date}</div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",position:"absolute",left:0,right:0,bottom:0}}>
                        {idxLabels.map((idx,i)=>(
                          <span key={i} style={{fontSize:10,color:C.muted}}>{dataFull[idx]?.date}</span>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })()}

              <Kicker label="piano" C={C}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:20}}>
                {(()=>{const p=getPlanAt(sortedPH,today);return(<>
                <Card C={C} onClick={()=>setTab("meal")}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:C.fTight,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Giorno ON</div>
                  <div style={{...typeStyle(TYPE.cardValue,C),marginBottom:10}}>{p?.onCal??0} <span style={{fontSize:13,color:C.sub,fontWeight:400}}>kcal</span></div>
                  <div style={{display:"flex",gap:12,fontSize:12,color:C.sub}}>
                    <span>P {p?.onP??0}g</span><span>C {p?.onC??0}g</span><span>G {p?.onF??0}g</span>
                  </div>
                </Card>
                <Card C={C} onClick={()=>setTab("meal")}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:C.fTight,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Giorno OFF</div>
                  <div style={{...typeStyle(TYPE.cardValue,C),marginBottom:10}}>{p?.offCal??0} <span style={{fontSize:13,color:C.sub,fontWeight:400}}>kcal</span></div>
                  <div style={{display:"flex",gap:12,fontSize:12,color:C.sub}}>
                    <span>P {p?.offP??0}g</span><span>C {p?.offC??0}g</span><span>G {p?.offF??0}g</span>
                  </div>
                </Card>
                </>);})()}
                <Card C={C} onClick={()=>setTab("trainingplan")}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:C.fTight,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Passi settimanali</div>
                  <div style={typeStyle(TYPE.cardValue,C)}>{(demoMode?generateDemoData().avgSteps:thisWeek.avgSteps)??'—'} <span style={{fontSize:13,color:C.sub,fontWeight:400}}>passi/gg</span></div>
                </Card>
              </div>
            </>)}

            {/* ── CHECK-IN GIORNALIERO ── */}
            {tab==="trainingplan"&&(<>
              <Kicker label="check-in giornaliero" C={C}/>
              {!trainingPlanWeeks.length&&(
                <div style={{color:C.muted,textAlign:"center",padding:32,fontSize:15}}>Nessun dato ancora registrato — inizia a compilare il Check-in giornaliero.</div>
              )}
              {trainingPlanWeeks.map((w,idx)=>{
                const collapsed=collapsedWeeks.has(w.weekStart);
                const prevW=trainingPlanWeeks[idx-1];
                const wDeltaW=w.avgWeight!=null&&prevW?.avgWeight!=null?+(w.avgWeight-prevW.avgWeight).toFixed(1):null;
                return(
                  <div key={w.weekStart} style={{border:`1px solid ${C.border}`,borderRadius:8,marginBottom:16,overflow:"hidden",background:C.bg2}}>
                    <div onClick={()=>toggleWeek(w.weekStart)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",cursor:"pointer"}}>
                      <span style={{fontSize:13,fontWeight:700,fontFamily:C.fTight,letterSpacing:1.5,textTransform:"uppercase",color:C.text}}>Week {String(w.weekIndex).padStart(2,"0")}</span>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:13,color:C.sub}}>{fmtShort(w.weekStart)} — {fmtShort(w.weekEnd)}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:collapsed?"rotate(-90deg)":"none",transition:"transform 0.15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                    {!collapsed&&(<>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
                        <div style={{padding:"18px 10px",textAlign:"center",background:`${C.blue}12`,borderRight:`1px solid ${C.border}`}}>
                          <div style={{fontSize:10.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:C.blue,marginBottom:8}}>Training Days</div>
                          <div style={{fontFamily:C.fTight,fontSize:34,fontWeight:800,color:C.text,lineHeight:1.1}}>{w.trainingDays.cal}<span style={{fontSize:14,color:C.sub,fontWeight:600}}> kcal</span></div>
                          <div style={{fontSize:11.5,color:C.sub,marginTop:6}}>P {w.trainingDays.p} · C {w.trainingDays.c} · G {w.trainingDays.f}</div>
                        </div>
                        <div style={{padding:"18px 10px",textAlign:"center",background:`${C.teal}12`,borderRight:`1px solid ${C.border}`}}>
                          <div style={{fontSize:10.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:C.teal,marginBottom:8}}>Non-Training Days</div>
                          <div style={{fontFamily:C.fTight,fontSize:34,fontWeight:800,color:C.text,lineHeight:1.1}}>{w.nonTrainingDays.cal}<span style={{fontSize:14,color:C.sub,fontWeight:600}}> kcal</span></div>
                          <div style={{fontSize:11.5,color:C.sub,marginTop:6}}>P {w.nonTrainingDays.p} · C {w.nonTrainingDays.c} · G {w.nonTrainingDays.f}</div>
                        </div>
                        <div style={{padding:"18px 10px",textAlign:"center",borderRight:`1px solid ${C.border}`}}>
                          <div style={{fontSize:10.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:C.sub,marginBottom:8}}>Average Weight</div>
                          <div style={{fontFamily:C.fTight,fontSize:34,fontWeight:800,color:C.text,lineHeight:1.1}}>{w.avgWeight??"—"}<span style={{fontSize:14,color:C.sub,fontWeight:600}}> kg</span></div>
                          <div style={{fontSize:11.5,color:C.sub,marginTop:6}}>{wDeltaW!=null?`${wDeltaW>0?"+":""}${wDeltaW} vs sett. prec.`:"—"}</div>
                        </div>
                        <div style={{padding:"18px 10px",textAlign:"center",borderRight:`1px solid ${C.border}`}}>
                          <div style={{fontSize:10.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:C.sub,marginBottom:8}}>Average Steps</div>
                          <div style={{fontFamily:C.fTight,fontSize:34,fontWeight:800,color:C.text,lineHeight:1.1}}>{w.avgSteps??"—"}</div>
                          <div style={{fontSize:11.5,color:C.sub,marginTop:6}}>passi/gg</div>
                        </div>
                        <div style={{padding:"18px 10px",textAlign:"center",background:`${C.red}0D`}}>
                          <div style={{fontSize:10.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:C.red,marginBottom:8}}>Cardio Sessions</div>
                          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:2}}>
                            <input type="number" key={`cs-${w.weekStart}`} defaultValue={w.cardio.sessions??""} placeholder="0"
                              onBlur={e=>upsertWeekCardioField(w.weekStart,"cardioSessions",e.target.value?+e.target.value:null)}
                              style={{background:"none",border:"none",outline:"none",textAlign:"right",fontFamily:C.fTight,fontSize:34,fontWeight:800,color:C.text,width:32,padding:0}}/>
                            <span style={{fontFamily:C.fTight,fontSize:18,fontWeight:800,color:C.sub}}>×</span>
                            <input type="number" key={`cm-${w.weekStart}`} defaultValue={w.cardio.minutesPerSession??""} placeholder="0"
                              onBlur={e=>upsertWeekCardioField(w.weekStart,"cardioMinutesPerSession",e.target.value?+e.target.value:null)}
                              style={{background:"none",border:"none",outline:"none",textAlign:"left",fontFamily:C.fTight,fontSize:34,fontWeight:800,color:C.text,width:40,padding:0}}/>
                            <span style={{fontSize:13,color:C.sub,fontWeight:600}}>min</span>
                          </div>
                          <input key={`ct-${w.weekStart}`} defaultValue={w.cardio.type??""} placeholder="Steady State"
                            onBlur={e=>upsertWeekCardioField(w.weekStart,"cardioType",e.target.value||null)}
                            style={{background:"none",border:"none",outline:"none",textAlign:"center",fontSize:11.5,color:C.sub,marginTop:6,width:"100%",fontFamily:C.f}}/>
                        </div>
                      </div>
                      <div>
                        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr 24px",padding:"10px 20px",fontSize:10.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.muted}}>
                          <div>Date</div><div style={{textAlign:"center"}}>Session</div><div style={{textAlign:"center"}}>Weight</div><div style={{textAlign:"center"}}>Steps</div><div/>
                        </div>
                        {w.days.map((d,i)=>{
                          const isToday=d.date===today;
                          const sessionColor=d.sessionColor==="muted"?C.muted:C.red;
                          const sessionMenuOpen=checkinSessionOpen===d.date;
                          const isExpanded=expandedDay===d.date;
                          const dTpl=d.dayType?(d.dayType==="on"?w.trainingDays:w.nonTrainingDays):null;
                          return(
                            <div key={d.date} style={{borderTop:`1px solid ${C.border}`,background:isToday?`${C.red}0A`:"none"}}>
                              <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr 24px",padding:"11px 20px",alignItems:"center"}}>
                                <div style={{fontSize:13,color:isToday?C.text:C.sub,fontWeight:isToday?700:500}}><span style={{color:C.muted,marginRight:10}}>{String(i+1).padStart(2,"0")}</span>{fmtShort(d.date)}{isToday&&<span style={{color:C.red,fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginLeft:8}}>Today</span>}</div>

                                <div style={{position:"relative",textAlign:"center"}}>
                                  <button onClick={()=>setCheckinSessionOpen(p=>p===d.date?null:d.date)}
                                    style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",fontFamily:C.fTight,color:sessionColor,padding:0}}>
                                    {d.session}
                                  </button>
                                  {sessionMenuOpen&&(
                                    <>
                                      <div onClick={()=>setCheckinSessionOpen(null)} style={{position:"fixed",inset:0,zIndex:9}}/>
                                      <div style={{position:"absolute",top:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",minWidth:130,background:C.bg3,border:`1px solid ${C.borderHi}`,borderRadius:10,overflow:"hidden",boxShadow:"0 12px 28px rgba(0,0,0,0.5)",zIndex:10}}>
                                        {trainingTypes.map(tt=>{
                                          const c=C[tt.color]||C.muted;
                                          return(
                                            <button key={tt.id} onClick={()=>{upsertDay(d.date,{trainingType:tt.id});setCheckinSessionOpen(null);}}
                                              style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"9px 12px",background:d.sessionTypeId===tt.id?`${c}18`:"none",border:"none",color:d.sessionTypeId===tt.id?c:C.text,fontSize:13,fontWeight:d.sessionTypeId===tt.id?700:500,fontFamily:C.f,cursor:"pointer"}}>
                                              <span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{tt.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div style={{textAlign:"center"}}>
                                  <input type="number" step="0.1" key={`tp-weight-${d.date}`} defaultValue={d.weight??""} placeholder="—"
                                    onBlur={e=>e.target.value&&upsertWeight(d.date,e.target.value)}
                                    style={{background:"none",border:"none",outline:"none",textAlign:"center",fontSize:19,fontWeight:800,fontFamily:C.fTight,color:C.text,width:"100%"}}/>
                                </div>
                                <div style={{textAlign:"center"}}>
                                  <input type="number" key={`tp-steps-${d.date}`} defaultValue={d.steps??""} placeholder="—"
                                    onBlur={e=>upsertDay(d.date,{steps:e.target.value?+e.target.value:null})}
                                    style={{background:"none",border:"none",outline:"none",textAlign:"center",fontSize:19,fontWeight:800,fontFamily:C.fTight,color:C.text,width:"100%"}}/>
                                </div>
                                <button onClick={()=>setExpandedDay(p=>p===d.date?null:d.date)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",justifyContent:"center"}}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:isExpanded?"rotate(180deg)":"none",transition:"transform 0.15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                              </div>

                              {isExpanded&&(
                                <div style={{padding:"4px 20px 18px",borderTop:`1px solid ${C.border}`}}>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,marginBottom:14}}>
                                    <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                                      <input type="number" key={`tp-cal-${d.date}`} defaultValue={d.calories??""} placeholder={dTpl?String(dTpl.cal):"0"}
                                        onBlur={e=>upsertDay(d.date,{calories:e.target.value?+e.target.value:null})}
                                        style={{background:"none",border:"none",outline:"none",color:C.text,fontFamily:C.fTight,fontSize:28,fontWeight:800,width:110,padding:0}}/>
                                      <span style={{fontSize:13,color:C.sub}}>kcal</span>
                                    </div>
                                    <button onClick={()=>upsertDay(d.date,{type:d.dayType==="on"?"off":"on"})}
                                      style={{fontSize:11,fontWeight:700,letterSpacing:0.5,cursor:"pointer",fontFamily:C.f,color:d.dayType==="on"?C.blue:C.teal,background:`${d.dayType==="on"?C.blue:C.teal}14`,border:`1px solid ${d.dayType==="on"?C.blue:C.teal}30`,borderRadius:8,padding:"5px 10px"}}>{d.dayType==="on"?"TD":"NTD"}</button>
                                  </div>
                                  <div style={{display:"flex",gap:28,marginBottom:16}}>
                                    {[["Proteine","protein","p",C.green],["Carboidrati","carbs","c",C.blue],["Grassi","fat","f",C.red]].map(([l,k,tk,color])=>(
                                      <div key={k}>
                                        <div style={{display:"flex",alignItems:"baseline"}}>
                                          <input type="number" key={`tp-${k}-${d.date}`} defaultValue={d[k]??""} placeholder={dTpl?String(dTpl[tk]):"0"}
                                            onBlur={e=>upsertDay(d.date,{[k]:e.target.value?+e.target.value:null})}
                                            style={{background:"none",border:"none",outline:"none",color,fontFamily:C.fTight,fontSize:16,fontWeight:800,width:42,padding:0}}/>
                                          <span style={{fontSize:11,fontWeight:600,color:C.sub,marginLeft:1}}>g</span>
                                        </div>
                                        <div style={{fontSize:10,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.5}}>{l}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <textarea key={`tp-note-${d.date}`} defaultValue={d.note??""} onBlur={e=>upsertDay(d.date,{note:e.target.value})} placeholder="Refeed, sgarro, pasto fuori…" rows={2}
                                    style={{...inp,resize:"none",fontFamily:C.f}}/>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>)}
                  </div>
                );
              })}
            </>)}

            {/* ── PESO / BW TRACKER ── */}
            {tab==="peso"&&(<>
              <Kicker label="body weight tracker" C={C}/>
              {weightChart.length>1&&(
                <Card C={C}>
                  <ResponsiveContainer width="100%" height={420}>
                    <AreaChart data={weightChart}>
                      <defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.pink} stopOpacity={0.35}/><stop offset="95%" stopColor={C.pink} stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}/>
                      <XAxis dataKey="date" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} interval={Math.max(0,Math.ceil(weightChart.length/6)-1)}/>
                      <YAxis tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
                      <Tooltip content={<CTip C={C}/>}/>
                      <Area type="monotone" dataKey="Peso" stroke={C.pink} strokeWidth={2.5} fill="url(#wg2)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {bwMonths.map(mo=>{
                const diffColor=mo.diff==null?C.sub:mo.diff>0?C.red:C.teal;
                return(
                  <div key={mo.key} style={{display:"flex",border:`1px solid ${C.border}`,marginBottom:16}}>
                    <div style={{width:120,flexShrink:0,background:C.bg2,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 8px"}}>
                      <span style={{fontFamily:C.fTight,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,textAlign:"center"}}>{mo.label}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"grid",gridTemplateColumns:"1.4fr 0.7fr 1.3fr 1.2fr",padding:"14px 22px",background:C.bg2,fontSize:11,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:1,borderBottom:`1px solid ${C.border}`}}>
                        <span>Week starting</span><span style={{textAlign:"center"}}>Wk#</span><span style={{textAlign:"center"}}>Phase</span><span style={{textAlign:"center"}}>Weekly avg</span>
                      </div>
                      {mo.weeks.map((w,wi)=>{
                        const opt=PHASE_OPTIONS.find(p=>p.id===w.phase);
                        const color=opt?(C[opt.color]||C.muted):C.muted;
                        const open=bwPhaseOpen===w.weekStart;
                        return(
                          <div key={w.weekStart} style={{display:"grid",gridTemplateColumns:"1.4fr 0.7fr 1.3fr 1.2fr",padding:"14px 22px",fontSize:14,alignItems:"center",borderTop:wi>0?`1px solid ${C.border}`:"none"}}>
                            <span style={{color:C.sub}}>{fmtShort(w.weekStart)}</span>
                            <span style={{textAlign:"center",fontFamily:C.fTight,fontWeight:700,color:C.text}}>{w.weekNumber}</span>
                            <div style={{display:"flex",justifyContent:"center",position:"relative"}}>
                              <button onClick={()=>setBwPhaseOpen(p=>p===w.weekStart?null:w.weekStart)}
                                style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:7,fontWeight:800,fontSize:11.5,textTransform:"uppercase",letterSpacing:0.5,cursor:"pointer",border:`1.5px solid ${opt?`${color}66`:C.border}`,background:opt?`${color}1F`:"none",color,fontFamily:C.f}}>
                                {opt?.name||"— set —"}
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{opacity:0.75,transform:open?"rotate(180deg)":"none",transition:"transform 0.15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                              {open&&(
                                <>
                                  <div onClick={()=>setBwPhaseOpen(null)} style={{position:"fixed",inset:0,zIndex:9}}/>
                                  <div style={{position:"absolute",top:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",minWidth:150,background:C.bg3,border:`1px solid ${C.borderHi}`,borderRadius:10,overflow:"hidden",boxShadow:"0 12px 28px rgba(0,0,0,0.5)",zIndex:10}}>
                                    {PHASE_OPTIONS.map(po=>{
                                      const c=C[po.color]||C.muted;
                                      return(
                                        <button key={po.id} onClick={()=>{upsertWeekPhase(w.weekStart,po.id);setBwPhaseOpen(null);}}
                                          style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"9px 12px",background:w.phase===po.id?`${c}18`:"none",border:"none",color:w.phase===po.id?c:C.text,fontSize:13,fontWeight:w.phase===po.id?700:500,fontFamily:C.f,cursor:"pointer"}}>
                                          <span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{po.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                            <span style={{textAlign:"center",fontFamily:C.fTight,fontWeight:800,fontSize:19}}>{w.avgWeight??"—"}<span style={{fontSize:12,color:C.sub,fontWeight:600,marginLeft:2}}>{w.avgWeight!=null?"kg":""}</span></span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{width:170,flexShrink:0,background:C.bg3,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:20,textAlign:"center"}}>
                      <div>
                        <span style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Monthly avg</span>
                        <div style={{fontFamily:C.fTight,fontSize:26,fontWeight:800,marginTop:5}}>{mo.monthlyAvg??"—"}{mo.monthlyAvg!=null&&<span style={{fontSize:13,color:C.sub,fontWeight:600}}> kg</span>}</div>
                      </div>
                      <div>
                        <span style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Difference</span>
                        <div style={{fontFamily:C.fTight,fontSize:14,fontWeight:800,marginTop:3,color:diffColor}}>{mo.diff==null?"—":`${mo.diff>0?"+":""}${mo.diff} (${mo.pct>0?"+":""}${mo.pct}%)`}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>)}

            {/* ── CHAT ── */}
            {/* ── PIANO (ex tab "piano", ora "Training Plan": solo tipi + pattern allenamento) ── */}
            {tab==="piano"&&(<>
              <Kicker label="training plan" C={C}/>
              <>
                <Card C={C}>
                  <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:16}}>Training Types</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {trainingTypes.map(t=>{
                      const color=C[t.color]||C.muted;
                      return(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 8px 8px 14px"}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                          <input value={t.name} onChange={e=>setTrainingTypes(p=>p.map(x=>x.id===t.id?{...x,name:e.target.value}:x))}
                            style={{background:"none",border:"none",color:C.text,fontFamily:C.f,fontSize:14,fontWeight:500,outline:"none",width:80}}/>
                          <button onClick={()=>{
                            const fallback=trainingTypes.find(x=>x.id!==t.id)?.id||"";
                            setTrainingTypes(p=>p.filter(x=>x.id!==t.id));
                            setTrainingPattern(p=>p.map(id=>id===t.id?fallback:id));
                          }} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer",lineHeight:1,padding:2}}>×</button>
                        </div>
                      );
                    })}
                    <button onClick={()=>{
                      const id=`t${Date.now()}`;
                      const color=TRAINING_COLORS[trainingTypes.length%TRAINING_COLORS.length];
                      setTrainingTypes(p=>[...p,{id,name:"New",color}]);
                    }} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1.5px dashed ${C.border}`,borderRadius:10,padding:"8px 14px",color:C.sub,fontSize:14,cursor:"pointer",fontFamily:C.f}}>
                      + Add type
                    </button>
                  </div>
                </Card>

                <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:24,boxShadow:C.shadow,marginBottom:20}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:1.2,fontFamily:C.fTight,marginBottom:20}}>Weekly Training Pattern</div>
                  <div style={{display:"flex",gap:6,height:64}}>
                    {DAY_LABELS_EN.map((lbl,i)=>{
                      const typeId=trainingPattern[i];
                      const t=trainingTypes.find(x=>x.id===typeId);
                      const color=t?(C[t.color]||C.muted):C.muted;
                      return(
                        <div key={i} style={{position:"relative",flex:1}}>
                          <div onClick={()=>setTrainingDayOpen(p=>p===i?null:i)}
                            style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,height:"100%",background:`linear-gradient(180deg,${color}59,${color}0F)`,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer"}}>
                            <div style={{fontSize:9.5,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:0.6}}>{lbl}</div>
                            <div style={{fontSize:12.5,fontWeight:700,fontFamily:C.fTight,color}}>{t?.name||"—"}</div>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.6,transform:trainingDayOpen===i?"rotate(180deg)":"none",transition:"transform 0.15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                          {trainingDayOpen===i&&(
                            <>
                              <div onClick={()=>setTrainingDayOpen(null)} style={{position:"fixed",inset:0,zIndex:9}}/>
                              <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,minWidth:130,background:C.bg3,border:`1px solid ${C.borderHi}`,borderRadius:10,overflow:"hidden",boxShadow:"0 12px 28px rgba(0,0,0,0.5)",zIndex:10}}>
                                {trainingTypes.map(tt=>{
                                  const c=C[tt.color]||C.muted;
                                  return(
                                    <button key={tt.id} onClick={()=>{setTrainingPattern(p=>p.map((v,j)=>j===i?tt.id:v));setTrainingDayOpen(null);}}
                                      style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"9px 12px",background:typeId===tt.id?`${c}18`:"none",border:"none",color:typeId===tt.id?c:C.text,fontSize:13,fontWeight:typeId===tt.id?700:500,fontFamily:C.f,cursor:"pointer"}}>
                                      <span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{tt.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </>
            </>)}

            {/* ── TIMELINE ── */}
            {tab==="planning"&&(<>
              <Kicker label="timeline" C={C}/>
              <div style={{padding:"12px 0",textAlign:"center",background:C.bg3,fontFamily:C.fTight,fontSize:19,fontWeight:800,letterSpacing:1,border:`1px solid ${C.border}`,borderBottom:"none",borderRadius:"8px 8px 0 0",marginTop:14}}>{timelineYear}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",padding:14,background:C.bg1}}>
                {[timelineWeeks.slice(0,Math.ceil(timelineWeeks.length/2)),timelineWeeks.slice(Math.ceil(timelineWeeks.length/2))].map((half,hi)=>(
                  <div key={hi} style={{border:`1px solid ${C.border}`,borderTop:`2px solid ${C.red}`,borderRadius:8,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1.1fr 1.5fr",padding:"9px 14px",background:C.bg2,fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:0.8,borderBottom:`1px solid ${C.border}`}}>
                      <span>Week</span><span style={{textAlign:"center"}}>Phase</span><span style={{textAlign:"center"}}>Notes</span>
                    </div>
                    {half.map((w,i)=>{
                      const opt=PHASE_OPTIONS.find(p=>p.id===w.phase);
                      const color=opt?(C[opt.color]||C.muted):C.muted;
                      const open=timelinePhaseOpen===w.weekStart;
                      const isCurrent=w.weekStart===getWeekDates(0)[0];
                      return(
                        <div key={w.weekStart} style={{display:"grid",gridTemplateColumns:"1fr 1.1fr 1.5fr",padding:"8px 14px",alignItems:"center",borderTop:i>0?`1px solid ${C.border}`:"none",background:isCurrent?`linear-gradient(90deg,${C.red}1F,${C.red}08)`:opt?`${color}12`:"none"}}>
                          <span style={{fontSize:12,color:isCurrent?C.red:opt?C.text:C.sub,fontWeight:isCurrent?700:opt?600:400}}>{fmtShort(w.weekStart)}</span>
                          <div style={{display:"flex",justifyContent:"center",position:"relative"}}>
                            <button onClick={()=>setTimelinePhaseOpen(p=>p===w.weekStart?null:w.weekStart)}
                              style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:6,fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:0.4,cursor:"pointer",border:`1.5px solid ${opt?`${color}66`:C.border}`,background:opt?`${color}1F`:"none",color,fontFamily:C.f}}>
                              {opt?.name||"N/A"}
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{opacity:0.7,transform:open?"rotate(180deg)":"none",transition:"transform 0.15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {open&&(
                              <>
                                <div onClick={()=>setTimelinePhaseOpen(null)} style={{position:"fixed",inset:0,zIndex:9}}/>
                                <div style={{position:"absolute",top:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",minWidth:150,background:C.bg3,border:`1px solid ${C.borderHi}`,borderRadius:10,overflow:"hidden",boxShadow:"0 12px 28px rgba(0,0,0,0.5)",zIndex:10}}>
                                  <button onClick={()=>{upsertWeekPhase(w.weekStart,null);setTimelinePhaseOpen(null);}}
                                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"9px 12px",background:!w.phase?`${C.muted}18`:"none",border:"none",color:!w.phase?C.text:C.sub,fontSize:13,fontWeight:!w.phase?700:500,fontFamily:C.f,cursor:"pointer"}}>
                                    <span style={{width:7,height:7,borderRadius:"50%",background:C.muted}}/>N/A
                                  </button>
                                  {PHASE_OPTIONS.map(po=>{
                                    const c=C[po.color]||C.muted;
                                    return(
                                      <button key={po.id} onClick={()=>{upsertWeekPhase(w.weekStart,po.id);setTimelinePhaseOpen(null);}}
                                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"9px 12px",background:w.phase===po.id?`${c}18`:"none",border:"none",color:w.phase===po.id?c:C.text,fontSize:13,fontWeight:w.phase===po.id?700:500,fontFamily:C.f,cursor:"pointer"}}>
                                        <span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{po.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                          <input defaultValue={w.notes} onBlur={e=>upsertWeekField(w.weekStart,"notes",e.target.value)} placeholder="—"
                            style={{background:"none",border:"none",outline:"none",color:C.text,fontFamily:C.f,fontSize:12,width:"100%",textAlign:"center"}}/>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>)}
            {/* ── MEAL PLAN ── */}
            {tab==="meal"&&(<>
              <Kicker label="meal plan" C={C}/>
              <Seg C={C} options={[{value:"current",label:"Piano attuale"},{value:"history",label:"Storico variazioni"}]} value={planSec} onChange={setPlanSec}/>
              {planSec==="history"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                  {[...sortedPH].reverse().map((p,i)=>(
                    <Card key={i} C={C}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <span style={{fontSize:16,fontWeight:700,color:i===0?C.blue:C.text}}>{i===0?"Piano attuale":fmtShort(p.date)}</span>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          {i!==0&&<span style={{fontSize:13,color:C.sub}}>{p.date}</span>}
                          {i!==0&&<button onClick={()=>deletePlanVar(p.date)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>}
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:8,marginBottom:i<sortedPH.length-1?10:0}}>
                        <div style={{background:C.bg2,borderRadius:12,padding:"10px 12px"}}>
                          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>ON</div>
                          <div style={{fontSize:18,fontWeight:700,color:C.blue}}>{p.onCal}<span style={{fontSize:12,color:C.sub,marginLeft:2}}>kcal</span></div>
                        </div>
                        <div style={{background:C.bg2,borderRadius:12,padding:"10px 12px"}}>
                          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>OFF</div>
                          <div style={{fontSize:18,fontWeight:700,color:C.teal}}>{p.offCal}<span style={{fontSize:12,color:C.sub,marginLeft:2}}>kcal</span></div>
                        </div>
                        <div style={{background:C.bg2,borderRadius:12,padding:"10px 12px"}}>
                          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Media</div>
                          <div style={{fontSize:18,fontWeight:700,color:C.text}}>{Math.round((p.onCal*4+p.offCal*3)/7)}<span style={{fontSize:12,color:C.sub,marginLeft:2}}>kcal</span></div>
                        </div>
                      </div>
                      {i<sortedPH.length-1&&(()=>{
                        const prev=sortedPH[sortedPH.length-2-i];if(!prev)return null;
                        const dOn=p.onCal-prev.onCal,dOff=p.offCal-prev.offCal;
                        const dAvg=Math.round((p.onCal*4+p.offCal*3)/7)-Math.round((prev.onCal*4+prev.offCal*3)/7);
                        const dOnP=p.onP-prev.onP,dOffP=p.offP-prev.offP;
                        const dOnC=p.onC-prev.onC,dOffC=p.offC-prev.offC;
                        const dOnF=p.onF-prev.onF,dOffF=p.offF-prev.offF;
                        return(
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                            {dOn!==0&&<Tag label={`ON cal ${dOn>0?"+":""}${dOn}`} color={dOn<0?C.green:C.orange}/>}
                            {dOff!==0&&<Tag label={`OFF cal ${dOff>0?"+":""}${dOff}`} color={dOff<0?C.green:C.orange}/>}
                            {dAvg!==0&&<Tag label={`Media ${dAvg>0?"+":""}${dAvg}`} color={dAvg<0?C.green:C.orange}/>}
                            {Math.abs(dOnP)>=5&&<Tag label={`ON P ${dOnP>0?"+":""}${dOnP}g`} color={C.green}/>}
                            {Math.abs(dOffP)>=5&&<Tag label={`OFF P ${dOffP>0?"+":""}${dOffP}g`} color={C.green}/>}
                            {Math.abs(dOnC)>=5&&<Tag label={`ON C ${dOnC>0?"+":""}${dOnC}g`} color={C.orange}/>}
                            {Math.abs(dOffC)>=5&&<Tag label={`OFF C ${dOffC>0?"+":""}${dOffC}g`} color={C.orange}/>}
                            {Math.abs(dOnF)>=5&&<Tag label={`ON G ${dOnF>0?"+":""}${dOnF}g`} color={C.purple}/>}
                            {Math.abs(dOffF)>=5&&<Tag label={`OFF G ${dOffF>0?"+":""}${dOffF}g`} color={C.purple}/>}
                          </div>
                        );
                      })()}
                    </Card>
                  ))}
                  {sortedPH.length<=1&&<div style={{color:C.muted,textAlign:"center",padding:30,fontSize:15}}>Nessuna variazione registrata.</div>}
                </div>
              )}
              {planSec==="current"&&<MealPlan
                C={C} sb={sb} user={user}
                mealPlanOn={mealPlanOn} setMealPlanOn={setMealPlanOn}
                mealPlanOnId={mealPlanOnId} setMealPlanOnId={setMealPlanOnId}
                mealPlanOff={mealPlanOff} setMealPlanOff={setMealPlanOff}
                mealPlanOffId={mealPlanOffId} setMealPlanOffId={setMealPlanOffId}
                mealFluidOn={mealFluidOn} setMealFluidOn={setMealFluidOn}
                mealSodiumOn={mealSodiumOn} setMealSodiumOn={setMealSodiumOn}
                mealFluidOff={mealFluidOff} setMealFluidOff={setMealFluidOff}
                mealSodiumOff={mealSodiumOff} setMealSodiumOff={setMealSodiumOff}
              />}
            </>)}

            {tab==="checkin"&&(<>
              <Kicker label="check-in settimanale" C={C}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
                <KPI C={C} label="Media passi" value={thisWeek.avgSteps} unit="passi" color={C.blue}/>
                <KPI C={C} label="Media calorie" value={thisWeek.avgCal} unit="kcal" color={C.orange}/>
                <KPI C={C} label="Media peso" value={avgW7} unit="kg" color={C.pink}/>
              </div>
              <Card C={C}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <span style={{width:3,height:16,background:C.blue}}/>
                  <span style={{fontSize:15,fontWeight:600,color:C.text,fontFamily:C.fTight}}>Cardio della settimana</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <span style={{fontSize:28,fontWeight:700,color:C.text,fontFamily:C.fTight}}>{thisWeek.cardioMinutesTotal||0}</span>
                  <span style={{fontSize:14,color:C.sub}}>min fatti{checkinCardioMinutes?` / ${checkinCardioMinutes} min target`:""}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>SESSIONI TARGET / SETT.</div>
                    <input type="number" value={checkinCardioSessions} onChange={e=>setCheckinCardioSessions(e.target.value)} placeholder="3" style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>MINUTI TARGET / SETT.</div>
                    <input type="number" value={checkinCardioMinutes} onChange={e=>setCheckinCardioMinutes(e.target.value)} placeholder="90" style={inp}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>MINUTI PER SESSIONE</div>
                    <input type="number" value={checkinCardioMinutesPerSession} onChange={e=>setCheckinCardioMinutesPerSession(e.target.value)} placeholder="30" style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>TIPO DI CARDIO</div>
                    <input type="text" value={checkinCardioType} onChange={e=>setCheckinCardioType(e.target.value)} placeholder="Steady State" style={inp}/>
                  </div>
                </div>
              </Card>
              <Card C={C}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <span style={{width:3,height:16,background:C.pink}}/>
                  <span style={{fontSize:15,fontWeight:600,color:C.text,fontFamily:C.fTight}}>Note della settimana</span>
                </div>
                <textarea value={checkinNotes} onChange={e=>setCheckinNotes(e.target.value)} placeholder="Come è andata la settimana? Sonno, energia, sensazioni, cambiamenti…" rows={5}
                  style={{...inp,resize:"vertical",fontFamily:C.f,lineHeight:1.5}}/>
                <button onClick={saveCheckin} style={{marginTop:12,width:"100%",padding:11,background:`linear-gradient(135deg,${C.pink},${C.purple})`,border:"none",borderRadius:6,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
                  Salva check-in
                </button>
              </Card>
            </>)}

          </div>
        </div>
      </div>
      {(typeof window==="undefined"||window.innerWidth<768)&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.navBg,backdropFilter:"blur(24px)",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"10px 0 22px",zIndex:100}}>
          {NAV.map(n=>{
            const active=tab===n.id;
            return(
              <button key={n.id} onClick={()=>setTab(n.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 10px",fontFamily:C.f}}>
                <div style={{transform:active?"translateY(-1px)":"none",transition:"transform 0.18s ease"}}>{n.icon(active)}</div>
                <span style={{fontSize:12,color:active?C.blue:C.muted,fontWeight:active?600:400,transition:"color 0.18s"}}>{n.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* EDIT DAY MODAL */}
      {editDay&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:200,display:"flex",alignItems:"flex-end"}} onClick={()=>setEditDay(null)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:640,margin:"0 auto",background:C.bg1,borderRadius:"28px 28px 0 0",padding:"22px 20px 44px",maxHeight:"88vh",overflowY:"auto",border:`1px solid ${C.border}`}}>
            <div style={{width:36,height:4,background:C.bg4,borderRadius:99,margin:"0 auto 18px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:18,fontWeight:700,color:C.text}}>{fmtShort(editDay)}</span>
              <button onClick={()=>setEditDay(null)} style={{background:C.bg3,border:"none",color:C.sub,width:30,height:30,borderRadius:99,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <Seg C={C} options={[{value:"on",label:`ON · ${plan.onCal} kcal`},{value:"off",label:`OFF · ${plan.offCal} kcal`}]} value={days[editDay]?.type||null}
              onChange={type=>upsertDay(editDay,{type,calories:plan[type+"Cal"],protein:plan[type+"P"],carbs:plan[type+"C"],fat:plan[type+"F"]})}/>
            <div style={{height:14}}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:10}}>
              {[["Calorie","calories"],["Proteine (g)","protein"],["Carbo (g)","carbs"],["Grassi (g)","fat"]].map(([l,k])=>(
                <div key={k}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>{l.toUpperCase()}</div>
                  <input type="number" key={`modal-${k}-${editDay}`} defaultValue={days[editDay]?.[k]??""} onBlur={e=>upsertDay(editDay,{[k]:e.target.value?+e.target.value:null})} style={inp}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>PASSI</div>
              <input type="number" key={`modal-steps-${editDay}`} defaultValue={days[editDay]?.steps??""} onBlur={e=>upsertDay(editDay,{steps:e.target.value?+e.target.value:null})} placeholder="8000" style={inp}/>
            </div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>NOTE</div>
              <input value={days[editDay]?.note??""} onChange={e=>upsertDay(editDay,{note:e.target.value})} placeholder="Sgarro, pasto fuori, refeed…" style={inp}/>
            </div>
            <button onClick={()=>{setEditDay(null);showToast("Salvato");}} style={{width:"100%",padding:13,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
              Salva e chiudi
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",bottom:94,left:"50%",transform:"translateX(-50%)",background:C.bg2,border:`1px solid ${C.borderHi}`,color:C.text,borderRadius:14,padding:"9px 18px",fontSize:14,fontWeight:500,zIndex:999,boxShadow:"0 8px 28px rgba(0,0,0,0.5)",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${isDark?"invert(0.4)":"invert(0.6)"};}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${C.bg4};border-radius:99px;}
        @keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.75)}50%{opacity:1;transform:scale(1)}}
        button{font-family:${C.f};}
        input::placeholder{color:${C.muted};}
        textarea::placeholder{color:${C.muted};}
      `}</style>
    </div>
  );
}
