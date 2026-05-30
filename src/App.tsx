import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = "https://hpqvusmnutpqomtbobxb.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwcXZ1c21udXRwcW9tdGJvYnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE1NDUsImV4cCI6MjA5NTY2NzU0NX0.S6yRy_nl4Dd22cV9W4lg9HgzTLpaKcsxKYvgn-J6CRU";
const sb = createClient(SUPA_URL, SUPA_KEY);

// ─── UTILS ────────────────────────────────────────────────────────────────────
const DEFAULT_PLAN = { onCal: 2800, onP: 190, onC: 300, onF: 80, offCal: 2200, offP: 180, offC: 200, offF: 75 };
const LS = "atk_plan_v1";
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtShort(d) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  const M = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
  return `${parseInt(day)} ${M[parseInt(m)-1]}`;
}
function fmtDayLetter(d) {
  if (!d) return "";
  return new Date(d+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short"}).slice(0,1).toUpperCase();
}
function getWeekDates(offset=0) {
  const base=new Date(); base.setDate(base.getDate()+offset*7);
  const dow=base.getDay(), mon=new Date(base);
  mon.setDate(base.getDate()-((dow+6)%7));
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d.toISOString().split("T")[0];});
}
function avg(arr){const v=arr.filter(x=>x!=null&&!isNaN(x));return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;}
function getPlanAt(history,date){const s=[...history].sort((a,b)=>a.date.localeCompare(b.date));const a=s.filter(p=>p.date<=date);return a.length?a[a.length-1]:s[0]||null;}

// ─── THEMES ───────────────────────────────────────────────────────────────────
const DARK = {
  bg0:"#070710",bg1:"#0F0F1A",bg2:"#16162A",bg3:"#1E1E30",bg4:"#26263A",
  border:"rgba(255,255,255,0.07)",borderHi:"rgba(255,255,255,0.14)",
  text:"#EEEEF5",sub:"#888899",muted:"#44445A",
  blue:"#4F8EF7",indigo:"#7B6CF6",teal:"#2EC4B6",
  green:"#30D158",orange:"#FF9F0A",red:"#FF453A",purple:"#BF5AF2",
  f:"-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",
  shadow:"0 2px 16px rgba(0,0,0,0.45)",
  navBg:"rgba(7,7,16,0.97)",headerBg:"rgba(7,7,16,0.95)",
};
const LIGHT = {
  bg0:"#F2F2F7",bg1:"#FFFFFF",bg2:"#F8F8FC",bg3:"#EBEBF0",bg4:"#DCDCE4",
  border:"rgba(0,0,0,0.08)",borderHi:"rgba(0,0,0,0.16)",
  text:"#1C1C1E",sub:"#6C6C80",muted:"#AEAEC0",
  blue:"#007AFF",indigo:"#5856D6",teal:"#32ADE6",
  green:"#34C759",orange:"#FF9500",red:"#FF3B30",purple:"#AF52DE",
  f:"-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",
  shadow:"0 1px 8px rgba(0,0,0,0.08)",
  navBg:"rgba(242,242,247,0.97)",headerBg:"rgba(242,242,247,0.95)",
};

// ─── AI ───────────────────────────────────────────────────────────────────────
async function callAI(messages,system){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages})});
  return (await res.json()).content?.[0]?.text||"";
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Card({children,style,onClick,hi,C}){
  const [hov,setHov]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:C.bg1,borderRadius:18,border:`1px solid ${hov&&onClick?C.borderHi:hi?C.borderHi:C.border}`,padding:18,transition:"border-color 0.18s",cursor:onClick?"pointer":"default",boxShadow:C.shadow,...style}}>
      {children}
    </div>
  );
}

function KPI({label,value,unit,color,delta,C}){
  return(
    <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 14px"}}>
      <div style={{fontSize:10,color:C.muted,letterSpacing:0.7,marginBottom:5,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:21,fontWeight:700,color:color||C.text,lineHeight:1}}>
        {value??'—'}{unit&&<span style={{fontSize:11,color:C.sub,fontWeight:400,marginLeft:3}}>{unit}</span>}
      </div>
      {delta!=null&&<div style={{fontSize:10,color:parseFloat(delta)<0?C.green:C.orange,marginTop:4}}>{delta>0?"+":""}{delta}</div>}
    </div>
  );
}

function Tag({label,color}){
  return <span style={{fontSize:10,fontWeight:600,letterSpacing:0.6,background:`${color}16`,color,border:`1px solid ${color}28`,borderRadius:6,padding:"3px 8px"}}>{label}</span>;
}

function SegCtrl({options,value,onChange,C}){
  return(
    <div style={{display:"flex",background:C.bg3,borderRadius:11,padding:3,gap:2}}>
      {options.map(o=>(
        <button key={o.value} onClick={()=>onChange(o.value)}
          style={{flex:1,padding:"8px 0",border:"none",borderRadius:9,background:value===o.value?C.bg1:"transparent",color:value===o.value?C.text:C.sub,fontSize:12,fontWeight:value===o.value?600:400,cursor:"pointer",fontFamily:C.f,boxShadow:value===o.value?C.shadow:"none",transition:"all 0.18s"}}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MacroBar({label,value,max,color,C}){
  const pct=max?Math.min(100,((value||0)/max)*100):0;
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:12,color:C.sub}}>{label}</span>
        <span style={{fontSize:12,color:C.text}}>{value??'—'}<span style={{color:C.muted}}>/{max}g</span></span>
      </div>
      <div style={{height:4,background:C.bg3,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:4,width:`${pct}%`,background:color,borderRadius:99,transition:"width 0.5s ease"}}/>
      </div>
    </div>
  );
}

const ChartTip=({active,payload,label,C})=>{
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:C?.bg2||"#16162A",border:`1px solid ${C?.borderHi||"rgba(255,255,255,0.14)"}`,borderRadius:12,padding:"9px 13px",fontSize:12,boxShadow:"0 8px 28px rgba(0,0,0,0.4)"}}>
      <div style={{color:C?.sub||"#888899",marginBottom:4,fontSize:10}}>{label}</div>
      {payload.map((p,i)=>p.value!=null&&<div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}{p.name==="Peso"?" kg":p.name==="Passi"?"":" kcal"}</div>)}
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [isDark,setIsDark]=useState(()=>localStorage.getItem("atk_theme")!=="light");
  const C=isDark?DARK:LIGHT;

  const [plan,setPlan]=useState(()=>{try{return JSON.parse(localStorage.getItem(LS))||DEFAULT_PLAN;}catch{return DEFAULT_PLAN;}});
  const [planHistory,setPlanHistory]=useState([]);
  const [days,setDays]=useState({});
  const [weightLog,setWeightLog]=useState([]);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);

  const [tab,setTab]=useState("dashboard");
  const [toast,setToast]=useState(null);
  const [editDay,setEditDay]=useState(null);
  const [planSection,setPlanSection]=useState("current");
  const [chatMsgs,setChatMsgs]=useState([{role:"assistant",text:"Ciao. Dimmi cosa hai mangiato, il tuo peso, i passi — salvo tutto automaticamente."}]);
  const [chatInput,setChatInput]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const [wInput,setWInput]=useState("");
  const [wDate,setWDate]=useState(todayStr());
  const chatEnd=useRef(null);
  const isDesktop=typeof window!=="undefined"&&window.innerWidth>=768;

  useEffect(()=>{localStorage.setItem("atk_theme",isDark?"dark":"light");},[isDark]);
  useEffect(()=>{localStorage.setItem(LS,JSON.stringify(plan));},[plan]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMsgs]);

  // ── SUPABASE LOAD ─────────────────────────────────────────────────────────
  useEffect(()=>{
    async function fetchAll(){
      setLoading(true);
      try{
        const [dr,wr,pr]=await Promise.all([
          sb.from("athlete_days").select("*"),
          sb.from("athlete_weight").select("*").order("date"),
          sb.from("athlete_plan_history").select("*").order("date"),
        ]);
        if(dr.data){
          const map={};
          dr.data.forEach(r=>{map[r.date]={type:r.type,calories:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat,steps:r.steps,note:r.note,isEstimate:r.is_estimate};});
          setDays(map);
        }
        if(wr.data) setWeightLog(wr.data.map(r=>({date:r.date,weight:r.weight})));
        if(pr.data&&pr.data.length){
          setPlanHistory(pr.data.map(r=>({date:r.date,onCal:r.on_cal,onP:r.on_p,onC:r.on_c,onF:r.on_f,offCal:r.off_cal,offP:r.off_p,offC:r.off_c,offF:r.off_f})));
        } else {
          const init={date:"2020-01-01",...DEFAULT_PLAN};
          setPlanHistory([init]);
          await sb.from("athlete_plan_history").insert({date:init.date,on_cal:init.onCal,on_p:init.onP,on_c:init.onC,on_f:init.onF,off_cal:init.offCal,off_p:init.offP,off_c:init.offC,off_f:init.offF});
        }
      }catch(e){console.error("Supabase load error",e);}
      setLoading(false);
    }
    fetchAll();
  },[]);

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2200);};

  // ── SUPABASE WRITE ────────────────────────────────────────────────────────
  async function upsertDay(date,data){
    setDays(p=>({...p,[date]:{...(p[date]||{}),...data}}));
    setSyncing(true);
    const existing=days[date]||{};
    const merged={...existing,...data};
    await sb.from("athlete_days").upsert({date,type:merged.type,calories:merged.calories,protein:merged.protein,carbs:merged.carbs,fat:merged.fat,steps:merged.steps,note:merged.note,is_estimate:merged.isEstimate},{onConflict:"date"});
    setSyncing(false);
  }

  async function upsertWeight(date,weight){
    setWeightLog(p=>[...p.filter(x=>x.date!==date),{date,weight:parseFloat(weight)}].sort((a,b)=>a.date.localeCompare(b.date)));
    setSyncing(true);
    await sb.from("athlete_weight").upsert({date,weight:parseFloat(weight)},{onConflict:"date"});
    setSyncing(false);
  }

  async function deleteWeight(date){
    setWeightLog(p=>p.filter(x=>x.date!==date));
    await sb.from("athlete_weight").delete().eq("date",date);
  }

  async function savePlanVariation(){
    const today=todayStr();
    const sorted=[...planHistory].sort((a,b)=>a.date.localeCompare(b.date));
    const last=sorted[sorted.length-1];
    const changed=!last||last.onCal!==plan.onCal||last.offCal!==plan.offCal||last.onP!==plan.onP||last.offP!==plan.offP;
    if(changed){
      const entry={date:today,...plan};
      setPlanHistory(p=>[...p.filter(x=>x.date!==today),entry]);
      setSyncing(true);
      await sb.from("athlete_plan_history").upsert({date:today,on_cal:plan.onCal,on_p:plan.onP,on_c:plan.onC,on_f:plan.onF,off_cal:plan.offCal,off_p:plan.offP,off_c:plan.offC,off_f:plan.offF},{onConflict:"date"});
      setSyncing(false);
      showToast("Variazione registrata");
    } else showToast("Nessuna modifica");
  }

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const today=todayStr();
  const todayData=days[today]||{};
  const todayType=todayData.type||null;
  const tpl=todayType?{cal:plan[todayType+"Cal"],p:plan[todayType+"P"],c:plan[todayType+"C"],f:plan[todayType+"F"]}:null;
  const lastW=weightLog.length?weightLog[weightLog.length-1].weight:null;
  const prevW=weightLog.length>1?weightLog[weightLog.length-2].weight:null;
  const wDelta=lastW&&prevW?+(lastW-prevW).toFixed(1):null;
  const sortedPH=useMemo(()=>[...planHistory].sort((a,b)=>a.date.localeCompare(b.date)),[planHistory]);
  const curPlan=sortedPH[sortedPH.length-1];
  const weeksOn=curPlan?Math.floor((new Date(today)-new Date(curPlan.date))/(7*24*3600*1000)):0;

  const weeklyStats=useMemo(()=>Array.from({length:8},(_,i)=>{
    const dates=getWeekDates(i-7);
    const logged=dates.map(d=>days[d]).filter(Boolean);
    const withCal=logged.filter(d=>d.calories);
    return{label:i===7?"Questa":i===6?"Scorsa":`S${i+1}`,avgCal:avg(withCal.map(d=>d.calories)),avgProt:avg(withCal.map(d=>d.protein).filter(Boolean)),avgCarb:avg(withCal.map(d=>d.carbs).filter(Boolean)),avgFat:avg(withCal.map(d=>d.fat).filter(Boolean))};
  }),[days]);

  const thisWeek=weeklyStats[7],lastWeek=weeklyStats[6];
  const calDelta=thisWeek.avgCal&&lastWeek.avgCal?thisWeek.avgCal-lastWeek.avgCal:null;
  const sortedDays=useMemo(()=>Object.entries(days).sort(([a],[b])=>a.localeCompare(b)),[days]);
  const calChart30=sortedDays.slice(-30).map(([date,d])=>{const p=getPlanAt(planHistory,date);return{date:fmtShort(date),Calorie:d.calories,Target:d.type&&p?p[d.type+"Cal"]:null};});
  const weekCalChart=weeklyStats.filter(w=>w.avgCal).map(w=>({week:w.label,Media:w.avgCal}));
  const weightChart=weightLog.slice(-30).map(w=>({date:fmtShort(w.date),Peso:w.weight}));
  const stepsChart=sortedDays.slice(-14).map(([date,d])=>({date:fmtShort(date),Passi:d.steps||0}));
  const planDeltas=sortedPH.slice(1).map((p,i)=>({date:p.date,dOn:p.onCal-sortedPH[i].onCal,dOff:p.offCal-sortedPH[i].offCal,newOn:p.onCal,newOff:p.offCal}));
  const weekDates=getWeekDates(0);

  // ── CHAT ──────────────────────────────────────────────────────────────────
  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    const msg=chatInput.trim(); setChatInput("");
    setChatMsgs(p=>[...p,{role:"user",text:msg}]); setChatLoading(true);
    const sys=`Sei un coach di bodybuilding. Rispondi in italiano, breve e diretto (max 3 righe).
Piano: ON ${plan.onCal}kcal P${plan.onP} C${plan.onC} G${plan.onF} | OFF ${plan.offCal}kcal P${plan.offP} C${plan.offC} G${plan.offF}.
Settimana ${weeksOn+1}. Oggi (${today}): ${JSON.stringify(todayData)}.
Se descrivi cibo, peso o passi aggiungi in fondo:
SAVE:{"type":"nutrition"|"weight"|"steps"|"none","date":"YYYY-MM-DD","calories":n,"protein":n,"carbs":n,"fat":n,"weight":n,"steps":n,"note":"...","isEstimate":true}`;
    try{
      const hist=chatMsgs.slice(-6).map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
      const raw=await callAI([...hist,{role:"user",content:msg}],sys);
      const m=raw.match(/SAVE:(\{.*\})/); let saved=false;
      if(m){try{
        const sd=JSON.parse(m[1]);
        if(sd.type==="nutrition"){await upsertDay(sd.date||today,{calories:sd.calories,protein:sd.protein,carbs:sd.carbs,fat:sd.fat,note:sd.note,isEstimate:true});saved=true;}
        else if(sd.type==="weight"&&sd.weight){await upsertWeight(sd.date||today,sd.weight);saved=true;}
        else if(sd.type==="steps"&&sd.steps){await upsertDay(sd.date||today,{steps:sd.steps});saved=true;}
      }catch{}}
      setChatMsgs(p=>[...p,{role:"assistant",text:raw.replace(/SAVE:\{.*\}/,"").trim(),saved}]);
      if(saved)showToast("Salvato");
    }catch{setChatMsgs(p=>[...p,{role:"assistant",text:"Errore di connessione."}]);}
    setChatLoading(false);
  }

  // ── STYLES ────────────────────────────────────────────────────────────────
  const inp={background:C.bg3,border:`1px solid ${C.border}`,borderRadius:11,color:C.text,padding:"9px 12px",fontSize:13,outline:"none",width:"100%",fontFamily:C.f,boxSizing:"border-box"};

  const NAV=[
    {id:"dashboard",label:"Dashboard",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>},
    {id:"oggi",label:"Oggi",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>},
    {id:"peso",label:"Peso",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
    {id:"chat",label:"Coach",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
    {id:"piano",label:"Piano",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>},
  ];

  if(loading) return(
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,fontFamily:C.f}}>
      <div style={{display:"flex",gap:6}}>
        {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.blue,animation:`pulse 1.1s ${i*0.18}s infinite ease-in-out`}}/>)}
      </div>
      <span style={{fontSize:12,color:C.muted}}>Connessione al database…</span>
    </div>
  );

  // ── SHARED SECTIONS ───────────────────────────────────────────────────────

  const DashboardContent = () => (
    <>
      <Card C={C}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:13,fontWeight:600,color:C.text}}>Media calorica — settimane</span>
          {thisWeek.avgCal&&<Tag label={`${thisWeek.avgCal} kcal`} color={C.blue}/>}
        </div>
        {weekCalChart.length>1?(
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekCalChart} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"} vertical={false}/>
              <XAxis dataKey="week" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
              <Tooltip content={<ChartTip C={C}/>}/>
              <Bar dataKey="Media" fill={C.blue} radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ):<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"20px 0"}}>Dati disponibili dopo la prima settimana</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
          <KPI C={C} label="Questa sett." value={thisWeek.avgCal} unit="kcal" color={C.blue}/>
          <KPI C={C} label="Sett. scorsa"  value={lastWeek.avgCal}  unit="kcal" color={C.sub}/>
          <KPI C={C} label="Delta" value={calDelta!=null?(calDelta>0?`+${calDelta}`:calDelta):null} unit="kcal" color={calDelta==null?C.muted:calDelta<0?C.green:C.orange}/>
        </div>
      </Card>

      {thisWeek.avgProt&&(
        <Card C={C}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:14}}>Media macro — settimana corrente</div>
          <MacroBar C={C} label="Proteine" value={thisWeek.avgProt} max={plan.onP} color={C.green}/>
          <MacroBar C={C} label="Carboidrati" value={thisWeek.avgCarb} max={plan.onC} color={C.orange}/>
          <MacroBar C={C} label="Grassi" value={thisWeek.avgFat} max={plan.onF} color={C.purple}/>
        </Card>
      )}

      {calChart30.length>2&&(
        <Card C={C}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:14}}>Calorie — 30 giorni</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={calChart30}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.22}/>
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"}/>
              <XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
              <Tooltip content={<ChartTip C={C}/>}/>
              <Area type="monotone" dataKey="Calorie" stroke={C.blue} strokeWidth={2} fill="url(#cg)" dot={false}/>
              <Area type="monotone" dataKey="Target" stroke={C.muted} strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {weightChart.length>1&&(
        <Card C={C} onClick={()=>setTab("peso")}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>Andamento peso</span>
            <span style={{fontSize:11,color:C.blue}}>Dettaglio →</span>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={weightChart}>
              <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.25}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient></defs>
              <Area type="monotone" dataKey="Peso" stroke={C.teal} strokeWidth={2} fill="url(#wg)" dot={false}/>
              <YAxis domain={["auto","auto"]} hide/><XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <Tooltip content={<ChartTip C={C}/>}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stepsChart.some(d=>d.Passi>0)&&(
        <Card C={C}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Passi — 14 giorni</div>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={stepsChart} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"} vertical={false}/>
              <XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip C={C}/>}/>
              <Bar dataKey="Passi" fill={C.indigo} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {planDeltas.length>0&&(
        <Card C={C}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:14}}>Variazioni piano calorico</div>
          {planDeltas.map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<planDeltas.length-1?`1px solid ${C.border}`:"none"}}>
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{fmtShort(d.date)}</div>
                <div style={{display:"flex",gap:6}}><Tag label={`ON ${d.newOn} kcal`} color={C.blue}/><Tag label={`OFF ${d.newOff} kcal`} color={C.teal}/></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:600,color:d.dOn<0?C.green:C.orange}}>ON {d.dOn>0?"+":""}{d.dOn}</div>
                <div style={{fontSize:11,color:d.dOff<0?C.green:C.orange}}>OFF {d.dOff>0?"+":""}{d.dOff}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );

  const OggiContent = () => (
    <>
      {!todayType?(
        <Card C={C} hi>
          <div style={{fontSize:12,color:C.sub,marginBottom:14}}>Tipo di giornata</div>
          <SegCtrl C={C} options={[{value:"on",label:`ON · ${plan.onCal} kcal`},{value:"off",label:`OFF · ${plan.offCal} kcal`}]} value={null}
            onChange={type=>{upsertDay(today,{type,calories:plan[type+"Cal"],protein:plan[type+"P"],carbs:plan[type+"C"],fat:plan[type+"F"]});showToast("Giornata impostata");}}/>
        </Card>
      ):(
        <Card C={C}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Tag label={todayType==="on"?"ON":"OFF"} color={todayType==="on"?C.blue:C.teal}/>
              {todayData.isEstimate&&<Tag label="Stima AI" color={C.orange}/>}
            </div>
            <button onClick={()=>upsertDay(today,{type:null})} style={{background:"none",border:"none",color:C.sub,fontSize:12,cursor:"pointer",fontFamily:C.f}}>Cambia</button>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{todayData.calories??'—'} <span style={{color:C.sub,fontWeight:400,fontSize:12}}>/ {tpl?.cal} kcal</span></span>
              <span style={{fontSize:12,color:C.sub}}>{tpl?.cal?`${Math.round(((todayData.calories||0)/tpl.cal)*100)}%`:""}</span>
            </div>
            <div style={{height:6,background:C.bg3,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:6,width:`${tpl?.cal?Math.min(100,((todayData.calories||0)/tpl.cal)*100):0}%`,background:`linear-gradient(90deg,${C.blue},${C.indigo})`,borderRadius:99,transition:"width 0.5s"}}/>
            </div>
          </div>
          <MacroBar C={C} label="Proteine" value={todayData.protein} max={tpl?.p} color={C.green}/>
          <MacroBar C={C} label="Carboidrati" value={todayData.carbs} max={tpl?.c} color={C.orange}/>
          <MacroBar C={C} label="Grassi" value={todayData.fat} max={tpl?.f} color={C.purple}/>
          {todayData.note&&<div style={{marginTop:10,fontSize:12,color:C.sub,fontStyle:"italic"}}>{todayData.note}</div>}
        </Card>
      )}

      <Card C={C}>
        <div style={{fontSize:12,color:C.sub,marginBottom:14}}>Inserimento manuale</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[["Calorie","calories"],["Proteine (g)","protein"],["Carboidrati (g)","carbs"],["Grassi (g)","fat"]].map(([l,k])=>(
            <div key={k}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{l.toUpperCase()}</div>
              <input type="number" value={todayData[k]??""} onChange={e=>upsertDay(today,{[k]:e.target.value?+e.target.value:null})} placeholder={tpl?String(tpl[k[0]]):"0"} style={inp}/>
            </div>
          ))}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>PASSI</div>
          <input type="number" value={todayData.steps??""} onChange={e=>upsertDay(today,{steps:e.target.value?+e.target.value:null})} placeholder="8000" style={inp}/>
        </div>
        <div>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>NOTE</div>
          <input value={todayData.note??""} onChange={e=>upsertDay(today,{note:e.target.value})} placeholder="Refeed, sgarro, pasto fuori…" style={inp}/>
        </div>
      </Card>

      <Card C={C}>
        <div style={{fontSize:12,color:C.sub,marginBottom:12}}>Settimana corrente</div>
        <div style={{display:"flex",gap:5}}>
          {weekDates.map((date,i)=>{
            const d=days[date]||{},isT=date===today;
            const maxC=Math.max(...weekDates.map(dd=>days[dd]?.calories||0),1);
            const h=d.calories?Math.max(8,(d.calories/maxC)*44):4;
            return(
              <div key={i} onClick={()=>setEditDay(date)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}>
                <div style={{width:"100%",height:48,display:"flex",alignItems:"flex-end"}}>
                  <div style={{width:"100%",height:h,borderRadius:5,background:d.type==="on"?C.blue:d.type==="off"?C.teal:C.bg3,opacity:isT?1:0.55,outline:isT?`2px solid ${C.blue}`:"none",outlineOffset:2,transition:"height 0.3s ease"}}/>
                </div>
                <span style={{fontSize:9,color:isT?C.blue:C.muted,fontWeight:isT?600:400}}>{fmtDayLetter(date)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <button onClick={()=>setTab("chat")} style={{width:"100%",padding:13,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
        Scrivi al Coach
      </button>
    </>
  );

  const PesoContent = () => (
    <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <KPI C={C} label="Attuale" value={lastW} unit="kg" color={C.teal}/>
        <KPI C={C} label="Variazione" value={wDelta!=null?(wDelta>0?`+${wDelta}`:wDelta):null} unit="kg" color={wDelta!=null?(wDelta<0?C.green:C.orange):C.muted}/>
        <KPI C={C} label="Pesate" value={weightLog.length} color={C.blue}/>
      </div>
      <Card C={C} hi>
        <div style={{fontSize:12,color:C.sub,marginBottom:14}}>Nuova pesata</div>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>PESO (KG)</div>
            <input type="number" step="0.1" value={wInput} onChange={e=>setWInput(e.target.value)} placeholder="83.2" style={inp}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>DATA</div>
            <input type="date" value={wDate} onChange={e=>setWDate(e.target.value)} style={inp}/>
          </div>
        </div>
        <button onClick={()=>{if(!wInput)return;upsertWeight(wDate,wInput);setWInput("");showToast("Peso salvato");}}
          style={{width:"100%",padding:11,background:`linear-gradient(135deg,${C.teal},${C.blue})`,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
          Salva
        </button>
      </Card>
      {weightChart.length>1&&(
        <Card C={C}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:14}}>Andamento — 30 giorni</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weightChart}>
              <defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.28}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"}/>
              <XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
              <Tooltip content={<ChartTip C={C}/>}/>
              <Area type="monotone" dataKey="Peso" stroke={C.teal} strokeWidth={2.5} fill="url(#wg2)" dot={{fill:C.teal,r:3,strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
      <Card C={C}>
        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:14}}>Storico pesate</div>
        {[...weightLog].reverse().slice(0,30).map((w,i,arr)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:13,color:C.sub}}>{fmtShort(w.date)}</span>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <span style={{fontSize:16,fontWeight:600,color:C.teal}}>{w.weight} <span style={{fontSize:11,color:C.muted}}>kg</span></span>
              <button onClick={()=>deleteWeight(w.date)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
            </div>
          </div>
        ))}
        {!weightLog.length&&<div style={{color:C.muted,textAlign:"center",padding:24,fontSize:13}}>Nessuna pesata registrata.</div>}
      </Card>
    </>
  );

  const ChatContent = () => (
    <>
      <div style={{fontSize:11,color:C.muted,paddingBottom:2}}>Il coach analizza il testo e salva calorie, peso e passi automaticamente.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:460,overflowY:"auto",paddingRight:2}}>
        {chatMsgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"84%",padding:"11px 14px",borderRadius:m.role==="user"?"18px 18px 5px 18px":"18px 18px 18px 5px",background:m.role==="user"?`linear-gradient(135deg,${C.blue},${C.indigo})`:C.bg2,color:C.text,fontSize:13,lineHeight:1.55,border:m.role!=="user"?`1px solid ${C.border}`:"none",whiteSpace:"pre-wrap"}}>
              {m.text}
              {m.saved&&<div style={{marginTop:5,fontSize:10,color:C.green,fontWeight:600}}>Salvato</div>}
            </div>
          </div>
        ))}
        {chatLoading&&<div style={{display:"flex",gap:5,padding:"10px 14px"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.blue,animation:`pulse 1.1s ${i*0.18}s infinite ease-in-out`}}/>)}</div>}
        <div ref={chatEnd}/>
      </div>
      <div style={{display:"flex",gap:8,paddingTop:4}}>
        <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
          placeholder="Es: stasera pizza margherita e una birra…" rows={2}
          style={{flex:1,background:C.bg2,border:`1px solid ${C.borderHi}`,borderRadius:14,color:C.text,padding:"10px 14px",fontSize:13,outline:"none",resize:"none",fontFamily:C.f}}/>
        <button onClick={sendChat} disabled={chatLoading}
          style={{alignSelf:"flex-end",width:42,height:42,borderRadius:13,background:chatLoading?C.bg3:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",color:"#fff",fontSize:18,cursor:chatLoading?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
      </div>
    </>
  );

  const PianoContent = () => (
    <>
      <SegCtrl C={C} options={[{value:"current",label:"Piano attuale"},{value:"history",label:"Storico variazioni"}]} value={planSection} onChange={setPlanSection}/>
      {planSection==="current"&&(
        <>
          {[["on","ON · Giorni di allenamento",C.blue],["off","OFF · Giorni di riposo",C.teal]].map(([type,label,color])=>(
            <Card key={type} C={C}>
              <div style={{fontSize:12,color,fontWeight:600,marginBottom:14,letterSpacing:0.3}}>{label}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Calorie","Cal","kcal"],["Proteine","P","g"],["Carboidrati","C","g"],["Grassi","F","g"]].map(([l,k,u])=>(
                  <div key={k}>
                    <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{l.toUpperCase()}</div>
                    <div style={{display:"flex",alignItems:"center",background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                      <input type="number" value={plan[type+k]} onChange={e=>setPlan(p=>({...p,[type+k]:+e.target.value}))}
                        style={{flex:1,background:"none",border:"none",color:C.text,padding:"9px 11px",fontSize:13,outline:"none",fontFamily:C.f}}/>
                      <span style={{color:C.muted,fontSize:11,paddingRight:9}}>{u}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <button onClick={savePlanVariation}
            style={{width:"100%",padding:13,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
            Salva e registra variazione
          </button>
          {weeksOn>=1&&(
            <Card C={C}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:12,color:C.sub}}>Piano attivo dal</span>
                <span style={{fontSize:12,fontWeight:600,color:C.text}}>{fmtShort(curPlan?.date)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:C.sub}}>Settimane consecutive</span>
                <span style={{fontSize:12,fontWeight:600,color:C.blue}}>{weeksOn}</span>
              </div>
            </Card>
          )}
          <button onClick={()=>{if(window.confirm("Cancellare tutti i dati?")){}}}
            style={{background:`${C.red}12`,border:`1px solid ${C.red}22`,borderRadius:12,color:C.red,fontSize:12,padding:"10px 16px",cursor:"pointer",fontFamily:C.f}}>
            Reset dati
          </button>
        </>
      )}
      {planSection==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[...sortedPH].reverse().map((p,i)=>(
            <Card key={i} C={C}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:600,color:i===0?C.blue:C.text}}>{i===0?"Attuale":fmtShort(p.date)}</span>
                {i!==0&&<span style={{fontSize:10,color:C.muted}}>{p.date}</span>}
              </div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <Tag label={`ON ${p.onCal} kcal`} color={C.blue}/><Tag label={`OFF ${p.offCal} kcal`} color={C.teal}/>
              </div>
              {i<sortedPH.length-1&&(()=>{
                const prev=sortedPH[sortedPH.length-2-i]; if(!prev)return null;
                const dOn=p.onCal-prev.onCal,dOff=p.offCal-prev.offCal;
                return(<div style={{display:"flex",gap:6}}>
                  {dOn!==0&&<Tag label={`ON ${dOn>0?"+":""}${dOn}`} color={dOn<0?C.green:C.orange}/>}
                  {dOff!==0&&<Tag label={`OFF ${dOff>0?"+":""}${dOff}`} color={dOff<0?C.green:C.orange}/>}
                </div>);
              })()}
            </Card>
          ))}
          {sortedPH.length<=1&&<div style={{color:C.muted,textAlign:"center",padding:30,fontSize:13}}>Nessuna variazione registrata.</div>}
        </div>
      )}
    </>
  );

  const tabContent = {
    dashboard: <DashboardContent/>,
    oggi: <OggiContent/>,
    peso: <PesoContent/>,
    chat: <ChatContent/>,
    piano: <PianoContent/>,
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg0,color:C.text,fontFamily:C.f,paddingBottom:88}}>

      {/* HEADER */}
      <div style={{background:C.headerBg,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.border}`,padding:"14px 18px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1100,margin:"0 auto"}}>
          <div>
            <div style={{fontSize:19,fontWeight:700,letterSpacing:-0.4}}>Athlete</div>
            <div style={{fontSize:10,color:C.muted,marginTop:1}}>
              {new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {syncing&&<span style={{fontSize:10,color:C.muted}}>Sync…</span>}
            {weeksOn>=1&&(
              <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:9,padding:"5px 10px"}}>
                <span style={{fontSize:10,color:C.sub}}>Piano · </span>
                <span style={{fontSize:10,color:C.text,fontWeight:600}}>Sett. {weeksOn+1}</span>
              </div>
            )}
            {lastW!=null&&(
              <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"6px 12px",textAlign:"right"}}>
                <div style={{fontSize:16,fontWeight:700,color:C.teal}}>{lastW}<span style={{fontSize:10,color:C.sub,marginLeft:2}}>kg</span></div>
                {wDelta!=null&&<div style={{fontSize:9,color:wDelta<0?C.green:C.orange,textAlign:"right"}}>{wDelta>0?"+":""}{wDelta}</div>}
              </div>
            )}
            {/* THEME TOGGLE */}
            <button onClick={()=>setIsDark(p=>!p)}
              style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s"}}>
              {isDark
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP: sidebar + content / MOBILE: full width */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 14px"}}>
        <div style={{display:"grid",gridTemplateColumns:typeof window!=="undefined"&&window.innerWidth>=768?"220px 1fr":"1fr",gap:20,alignItems:"start"}}>

          {/* SIDEBAR (desktop only) */}
          {typeof window!=="undefined"&&window.innerWidth>=768&&(
            <div style={{position:"sticky",top:80,display:"flex",flexDirection:"column",gap:4}}>
              {NAV.map(n=>{
                const active=tab===n.id;
                return(
                  <button key={n.id} onClick={()=>setTab(n.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:active?`${C.blue}14`:"transparent",border:`1px solid ${active?`${C.blue}28`:"transparent"}`,color:active?C.blue:C.sub,fontSize:13,fontWeight:active?600:400,cursor:"pointer",fontFamily:C.f,textAlign:"left",transition:"all 0.18s"}}>
                    {n.icon(active)}
                    {n.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* MAIN CONTENT */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {tabContent[tab]}
          </div>
        </div>
      </div>

      {/* BOTTOM NAV (mobile only) */}
      {(typeof window==="undefined"||window.innerWidth<768)&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.navBg,backdropFilter:"blur(24px)",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"10px 0 22px",zIndex:100}}>
          {NAV.map(n=>{
            const active=tab===n.id;
            return(
              <button key={n.id} onClick={()=>setTab(n.id)}
                style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 10px",fontFamily:C.f}}>
                <div style={{transform:active?"translateY(-1px)":"none",transition:"transform 0.18s ease"}}>{n.icon(active)}</div>
                <span style={{fontSize:10,color:active?C.blue:C.muted,fontWeight:active?600:400,transition:"color 0.18s"}}>{n.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* EDIT DAY MODAL */}
      {editDay&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:200,display:"flex",alignItems:"flex-end"}} onClick={()=>setEditDay(null)}>
          <div onClick={e=>e.stopPropagation()}
            style={{width:"100%",maxWidth:640,margin:"0 auto",background:C.bg1,borderRadius:"22px 22px 0 0",padding:"20px 18px 40px",maxHeight:"88vh",overflowY:"auto",border:`1px solid ${C.border}`}}>
            <div style={{width:34,height:4,background:C.bg4,borderRadius:99,margin:"0 auto 18px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:16,fontWeight:700,color:C.text}}>{fmtShort(editDay)}</span>
              <button onClick={()=>setEditDay(null)} style={{background:C.bg3,border:"none",color:C.sub,width:30,height:30,borderRadius:99,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <SegCtrl C={C} options={[{value:"on",label:`ON · ${plan.onCal} kcal`},{value:"off",label:`OFF · ${plan.offCal} kcal`}]} value={days[editDay]?.type||null}
              onChange={type=>upsertDay(editDay,{type,calories:plan[type+"Cal"],protein:plan[type+"P"],carbs:plan[type+"C"],fat:plan[type+"F"]})}/>
            <div style={{height:14}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[["Calorie","calories"],["Proteine (g)","protein"],["Carbo (g)","carbs"],["Grassi (g)","fat"]].map(([l,k])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{l.toUpperCase()}</div>
                  <input type="number" value={days[editDay]?.[k]??""} onChange={e=>upsertDay(editDay,{[k]:e.target.value?+e.target.value:null})} style={inp}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>PASSI</div>
              <input type="number" value={days[editDay]?.steps??""} onChange={e=>upsertDay(editDay,{steps:e.target.value?+e.target.value:null})} placeholder="8000" style={inp}/>
            </div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>NOTE</div>
              <input value={days[editDay]?.note??""} onChange={e=>upsertDay(editDay,{note:e.target.value})} placeholder="Refeed, sgarro, pasto fuori…" style={inp}/>
            </div>
            <button onClick={()=>{setEditDay(null);showToast("Salvato");}}
              style={{width:"100%",padding:13,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
              Salva e chiudi
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",bottom:94,left:"50%",transform:"translateX(-50%)",background:C.bg2,border:`1px solid ${C.borderHi}`,color:C.text,borderRadius:12,padding:"9px 18px",fontSize:12,fontWeight:500,zIndex:999,boxShadow:"0 8px 28px rgba(0,0,0,0.5)",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${isDark?"invert(0.4)":"invert(0.6)"};}
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