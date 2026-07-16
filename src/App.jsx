import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized } from "recharts";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";

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
  green:"#34D074",orange:"#FFAA2E",red:"#FF3B30",purple:"#C46EF5",
  f:"'Inter','Segoe UI',system-ui,sans-serif",fTight:"'Inter Tight','Inter',system-ui,sans-serif",
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
    <div style={{display:"inline-flex",alignItems:"center",gap:8,marginBottom:2}}>
      <span style={{width:7,height:7,background:"#fff",flexShrink:0}}/>
      <span style={{fontSize:12,fontWeight:700,letterSpacing:0.6,color:color||C.red,fontFamily:C.fTight}}>{label}</span>
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
function MealPlan({C,inp,sb,user,mealPlanOn,setMealPlanOn,mealPlanOnId,setMealPlanOnId,mealPlanOff,setMealPlanOff,mealPlanOffId,setMealPlanOffId,showToast}){
  const[dayTab,setDayTab]=useState("on");
  const[search,setSearch]=useState("");
  const[searchResults,setSearchResults]=useState([]);
  const[searching,setSearching]=useState(false);
  const[addingTo,setAddingTo]=useState(null);
  const[searchTab,setSearchTab]=useState("cerca");
  const[myFoods,setMyFoods]=useState([]);
  const[recentFoods,setRecentFoods]=useState([]);
  const[showAddFood,setShowAddFood]=useState(false);
  const[newFood,setNewFood]=useState({name:"",brand:"",cal:"",prot:"",carb:"",fat:""});
  const[savingFood,setSavingFood]=useState(false);
  const[scannerActive,setScannerActive]=useState(false);
  const[scannerMsg,setScannerMsg]=useState("");
  const[renamingMeal,setRenamingMeal]=useState(null);
  const[saving,setSaving]=useState(false);
  const[editingFood,setEditingFood]=useState(null); // dbId of food being edited
  const[editFoodData,setEditFoodData]=useState({});

  const sortAlpha=(arr)=>[...arr].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase(),"it"));

  const meals=dayTab==="on"?(mealPlanOn||[]):(mealPlanOff||[]);
  const setMeals=dayTab==="on"?setMealPlanOn:setMealPlanOff;
  const planId=dayTab==="on"?mealPlanOnId:mealPlanOffId;
  const setPlanId=dayTab==="on"?setMealPlanOnId:setMealPlanOffId;

  const dayTotals=meals.reduce((acc,meal)=>{
    meal.foods?.forEach(f=>{acc.cal+=(f.cal||0);acc.prot+=(f.prot||0);acc.carb+=(f.carb||0);acc.fat+=(f.fat||0);});
    return acc;
  },{cal:0,prot:0,carb:0,fat:0});

  // Load my foods
  useEffect(()=>{
    if(!user)return;
    sb.from("athlete_foods").select("*").eq("user_id",user.id).then(({data})=>{
      if(data){
        const mapped=data.map(f=>({id:`my_${f.id}`,dbId:f.id,name:f.name,brand:f.brand||"",cal:f.cal||0,prot:f.prot||0,carb:f.carb||0,fat:f.fat||0,per100:{cal:f.cal||0,prot:f.prot||0,carb:f.carb||0,fat:f.fat||0},source:"I miei"}));
        setMyFoods(sortAlpha(mapped));
      }
    });
    // Load recent from localStorage
    try{
      const r=JSON.parse(localStorage.getItem("atk_recent_foods")||"[]");
      setRecentFoods(sortAlpha(r));
    }catch{}
  },[user]);

  // Autosave when meals change
  useEffect(()=>{
    if(!user||!meals||meals.length===0)return;
    const t=setTimeout(async()=>{
      if(planId){
        await sb.from("athlete_meal_plan").update({meals,updated_at:new Date().toISOString()}).eq("id",planId).eq("user_id",user.id);
      }else{
        const{data}=await sb.from("athlete_meal_plan").insert({type:dayTab,meals,user_id:user.id}).select().single();
        if(data)setPlanId(data.id);
      }
    },1500);
    return()=>clearTimeout(t);
  },[meals]);

  async function searchFood(q){
    if(!q.trim())return;
    setSearching(true);
    try{
      const res=await fetch("/api/fatsecret",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q})});
      const data=await res.json();
      const raw=data.results||[];
      const qLower=q.toLowerCase();
      // Ordina: prima OFF, poi per pertinenza (nome contiene la query esatta)
      const sorted=[...raw].sort((a,b)=>{
        const aOFF=a.source==="Open Food Facts"?0:1;
        const bOFF=b.source==="Open Food Facts"?0:1;
        if(aOFF!==bOFF)return aOFF-bOFF;
        const aExact=a.name.toLowerCase().includes(qLower)?0:1;
        const bExact=b.name.toLowerCase().includes(qLower)?0:1;
        return aExact-bExact;
      });
      setSearchResults(sorted);
    }catch(e){console.error(e);setSearchResults([]);}
    setSearching(false);
  }

  async function searchBarcode(barcode){
    setScannerMsg("Ricerca in corso…");
    try{
      const res=await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data=await res.json();
      if(data.status===1&&data.product){
        const p=data.product;
        const n=p.nutriments||{};
        const prot=Math.round((n["proteins_100g"]||n["protein_100g"]||0)*10)/10;
        const carb=Math.round((n["carbohydrates_100g"]||0)*10)/10;
        const fat=Math.round((n["fat_100g"]||0)*10)/10;
        let cal=Math.round(
          n["energy-kcal_100g"]||
          n["energy-kcal"]||
          (n["energy-kj_100g"]?Math.round(n["energy-kj_100g"]/4.184):0)||
          (n["energy_100g"]&&(n["energy_unit"]||"").toLowerCase()==="kcal"?n["energy_100g"]:0)||
          (n["energy_100g"]&&(n["energy_unit"]||"").toLowerCase()==="kj"?Math.round(n["energy_100g"]/4.184):0)||
          0
        );
        // Se le calorie sono troppo basse rispetto ai macro, ricalcola dai macro
        const calFromMacro=Math.round(prot*4+carb*4+fat*9);
        if(calFromMacro>0&&cal>0&&cal<calFromMacro*0.5){cal=calFromMacro;}
        if(cal===0&&calFromMacro>0){cal=calFromMacro;}
        const name=p.product_name_it||p.product_name||p.generic_name||"Prodotto sconosciuto";
        const food={id:`off_${barcode}`,name,brand:p.brands||"",source:"Barcode",cal,prot,carb,fat,per100:{cal,prot,carb,fat}};
        setSearchResults([food]);
        setScannerMsg(`Trovato: ${name}`);
      }else{
        setScannerMsg("Prodotto non trovato nel database");
        setSearchResults([]);
      }
    }catch(e){setScannerMsg("Errore nella ricerca");}
  }

  async function startScanner(){
    setScannerActive(true);
    setScannerMsg("Avvio fotocamera…");
    try{
      const scanner=new Html5Qrcode("qr-reader");
      await scanner.start(
        {facingMode:"environment"},
        {fps:10,qrbox:{width:250,height:150}},
        async(code)=>{
          await scanner.stop();
          setScannerActive(false);
          searchBarcode(code);
        },
        ()=>{}
      );
    }catch(e){
      setScannerActive(false);
      setScannerMsg("Fotocamera non disponibile — inserisci il barcode manualmente");
    }
  }

  function addFood(food,mealIdx,qty=100){
    const ratio=qty/100;
    const item={id:food.id,name:food.name,brand:food.brand,qty,cal:Math.round(food.cal*ratio),prot:Math.round(food.prot*ratio*10)/10,carb:Math.round(food.carb*ratio*10)/10,fat:Math.round(food.fat*ratio*10)/10,per100:{cal:food.cal,prot:food.prot,carb:food.carb,fat:food.fat}};
    setMeals(prev=>{const u=[...(prev||[])];u[mealIdx]={...u[mealIdx],foods:[...(u[mealIdx].foods||[]),item]};return u;});
    // Save to recent
    try{
      const recent=JSON.parse(localStorage.getItem("atk_recent_foods")||"[]");
      const filtered=recent.filter(r=>r.name!==food.name);
      const newRecent=[{id:food.id,name:food.name,brand:food.brand||"",cal:food.cal,prot:food.prot,carb:food.carb,fat:food.fat,per100:food.per100,source:food.source||""},  ...filtered].slice(0,20);
      localStorage.setItem("atk_recent_foods",JSON.stringify(newRecent));
      setRecentFoods(sortAlpha(newRecent));
    }catch{}
    setSearch("");setSearchResults([]);setAddingTo(null);setScannerMsg("");
  }

  function removeFood(mealIdx,foodIdx){
    setMeals(prev=>{const u=[...(prev||[])];u[mealIdx]={...u[mealIdx],foods:u[mealIdx].foods.filter((_,i)=>i!==foodIdx)};return u;});
  }

  function updateQty(mealIdx,foodIdx,qty){
    setMeals(prev=>{
      const u=[...(prev||[])];
      const food=u[mealIdx].foods[foodIdx];
      const ratio=qty/100;
      u[mealIdx].foods[foodIdx]={...food,qty,cal:Math.round(food.per100.cal*ratio),prot:Math.round(food.per100.prot*ratio*10)/10,carb:Math.round(food.per100.carb*ratio*10)/10,fat:Math.round(food.per100.fat*ratio*10)/10};
      return u;
    });
  }

  function addMeal(){setMeals(prev=>[...(prev||[]),{name:`Pasto ${(prev||[]).length+1}`,foods:[]}]);}
  function removeMeal(idx){setMeals(prev=>prev.filter((_,i)=>i!==idx));}
  function updateMealName(idx,name){setMeals(prev=>{const u=[...prev];u[idx]={...u[idx],name};return u;});}

  async function saveMyFood(){
    if(!newFood.name||!newFood.cal)return;
    setSavingFood(true);
    const{data}=await sb.from("athlete_foods").insert({name:newFood.name,brand:newFood.brand,cal:+newFood.cal,prot:+newFood.prot,carb:+newFood.carb,fat:+newFood.fat,user_id:user.id}).select().single();
    if(data){
      const f={id:`my_${data.id}`,dbId:data.id,name:data.name,brand:data.brand||"",cal:data.cal||0,prot:data.prot||0,carb:data.carb||0,fat:data.fat||0,per100:{cal:data.cal||0,prot:data.prot||0,carb:data.carb||0,fat:data.fat||0},source:"I miei"};
      setMyFoods(p=>[...p,f]);
      showToast("Alimento salvato");
    }
    setNewFood({name:"",brand:"",cal:"",prot:"",carb:"",fat:""});
    setShowAddFood(false);
    setSavingFood(false);
  }

  async function deleteMyFood(dbId){
    await sb.from("athlete_foods").delete().eq("id",dbId).eq("user_id",user.id);
    setMyFoods(p=>p.filter(f=>f.dbId!==dbId));
    showToast("Alimento eliminato");
  }

  async function updateMyFood(){
    if(!editingFood||!editFoodData.name||!editFoodData.cal)return;
    const{error}=await sb.from("athlete_foods").update({
      name:editFoodData.name,brand:editFoodData.brand||"",
      cal:+editFoodData.cal,prot:+editFoodData.prot||0,
      carb:+editFoodData.carb||0,fat:+editFoodData.fat||0
    }).eq("id",editingFood).eq("user_id",user.id);
    if(!error){
      setMyFoods(p=>sortAlpha(p.map(f=>f.dbId===editingFood?{
        ...f,name:editFoodData.name,brand:editFoodData.brand||"",
        cal:+editFoodData.cal,prot:+editFoodData.prot||0,
        carb:+editFoodData.carb||0,fat:+editFoodData.fat||0,
        per100:{cal:+editFoodData.cal,prot:+editFoodData.prot||0,carb:+editFoodData.carb||0,fat:+editFoodData.fat||0}
      }:f)));
      showToast("Alimento aggiornato");
    }
    setEditingFood(null);setEditFoodData({});
  }

  async function saveMealPlan(){
    setSaving(true);
    if(planId){
      await sb.from("athlete_meal_plan").update({meals,updated_at:new Date().toISOString()}).eq("id",planId).eq("user_id",user.id);
    }else{
      const{data}=await sb.from("athlete_meal_plan").insert({type:dayTab,meals,user_id:user.id}).select().single();
      if(data)setPlanId(data.id);
    }
    setSaving(false);
    showToast("Meal plan salvato");
  }

  const sourceColor=(s)=>s==="I miei"?C.purple:s==="Barcode"?C.teal:s==="Open Food Facts"?C.green:C.blue;

  return(
    <>
      <Seg C={C} options={[{value:"on",label:"Giorno ON"},{value:"off",label:"Giorno OFF"}]} value={dayTab} onChange={setDayTab}/>

      {meals.length>0&&(
        <div style={{background:C.bg1,border:`1px solid ${C.borderHi}`,borderRadius:20,padding:16}}>
          <div style={{fontSize:14,color:C.sub,marginBottom:10,fontWeight:500}}>Totale giornata</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[["Kcal",Math.round(dayTotals.cal),C.blue],["Prot",Math.round(dayTotals.prot)+"g",C.green],["Carb",Math.round(dayTotals.carb)+"g",C.orange],["Gras",Math.round(dayTotals.fat)+"g",C.purple]].map(([l,v,color])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color}}>{v}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meals.map((meal,mealIdx)=>{
        const mealTotals=meal.foods?.reduce((a,f)=>({cal:a.cal+(f.cal||0),prot:a.prot+(f.prot||0),carb:a.carb+(f.carb||0),fat:a.fat+(f.fat||0)}),{cal:0,prot:0,carb:0,fat:0})||{cal:0,prot:0,carb:0,fat:0};
        return(
          <Card key={mealIdx} C={C}>
            {/* Header pasto con rinomina */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
              {renamingMeal===mealIdx?(
                <input autoFocus defaultValue={meal.name}
                  onBlur={e=>{updateMealName(mealIdx,e.target.value||meal.name);setRenamingMeal(null);}}
                  onKeyDown={e=>{if(e.key==="Enter"){updateMealName(mealIdx,e.target.value||meal.name);setRenamingMeal(null);}}}
                  style={{...inp,fontSize:17,fontWeight:700,flex:1,padding:"6px 10px"}}/>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <span style={{fontSize:17,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meal.name}</span>
                  <button onClick={()=>setRenamingMeal(mealIdx)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:0,flexShrink:0}} title="Rinomina">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              )}
              <button onClick={()=>removeMeal(mealIdx)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",lineHeight:1,flexShrink:0}}>×</button>
            </div>

            {meal.foods?.map((food,foodIdx)=>(
              <div key={foodIdx} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{food.name}</div>
                    {food.brand&&<div style={{fontSize:12,color:C.muted}}>{food.brand}</div>}
                  </div>
                  <button onClick={()=>removeFood(mealIdx,foodIdx)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",marginLeft:8,flexShrink:0}}>×</button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input type="number" defaultValue={food.qty} onBlur={e=>updateQty(mealIdx,foodIdx,+e.target.value||100)}
                      style={{...inp,width:70,padding:"5px 8px",fontSize:14,textAlign:"center"}}/>
                    <span style={{fontSize:13,color:C.muted}}>g</span>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,color:C.blue,fontWeight:500}}>{food.cal} kcal</span>
                    <span style={{fontSize:13,color:C.green}}>P {food.prot}g</span>
                    <span style={{fontSize:13,color:C.orange}}>C {food.carb}g</span>
                    <span style={{fontSize:13,color:C.purple}}>G {food.fat}g</span>
                  </div>
                </div>
              </div>
            ))}

            {(meal.foods?.length||0)>0&&(
              <div style={{display:"flex",gap:10,marginTop:10,padding:"8px 10px",background:C.bg2,borderRadius:10}}>
                <span style={{fontSize:13,color:C.muted,fontWeight:500}}>Tot:</span>
                <span style={{fontSize:13,color:C.blue,fontWeight:600}}>{Math.round(mealTotals.cal)} kcal</span>
                <span style={{fontSize:13,color:C.green}}>P {Math.round(mealTotals.prot)}g</span>
                <span style={{fontSize:13,color:C.orange}}>C {Math.round(mealTotals.carb)}g</span>
                <span style={{fontSize:13,color:C.purple}}>G {Math.round(mealTotals.fat)}g</span>
              </div>
            )}

            {addingTo===mealIdx?(
              <div style={{marginTop:12}}>
                {/* Tab cerca/miei/recenti/barcode */}
                <div style={{display:"flex",background:C.bg3,borderRadius:12,padding:3,gap:2,marginBottom:12}}>
                  {[["cerca","Cerca"],["miei","I miei"],["recenti","Recenti"],["barcode","Barcode"]].map(([v,l])=>(
                    <button key={v} onClick={()=>{setSearchTab(v);setSearchResults([]);setSearch("");setScannerMsg("");setScannerActive(false);}}
                      style={{flex:1,padding:"9px 0",border:"none",borderRadius:9,background:searchTab===v?C.bg1:"transparent",color:searchTab===v?C.text:C.sub,fontSize:14,fontWeight:searchTab===v?600:400,cursor:"pointer",fontFamily:C.f,transition:"all 0.15s"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {searchTab==="cerca"&&(
                  <>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchFood(search)}
                        placeholder="Es: Fage, riso, pasta barilla…" style={{...inp,flex:1,fontSize:16}}/>
                      <button onClick={()=>searchFood(search)} style={{padding:"0 16px",background:C.blue,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f,flexShrink:0}}>
                        {searching?"…":"Cerca"}
                      </button>
                      <button onClick={()=>{setAddingTo(null);setSearch("");setSearchResults([]);}}
                        style={{padding:"0 12px",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:12,color:C.sub,fontSize:15,cursor:"pointer",fontFamily:C.f}}>✕</button>
                    </div>
                    {searchResults.length>0&&(
                      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",maxHeight:360,overflowY:"auto"}}>
                        {searchResults.map((r,ri)=>(
                          <div key={ri} style={{padding:"12px 16px",borderBottom:ri<searchResults.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:10}}>
                            <div onClick={()=>addFood(r,mealIdx,100)} style={{flex:1,cursor:"pointer",minWidth:0}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:15,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                                  <div style={{display:"flex",gap:5,alignItems:"center",marginTop:3}}>
                                    {r.brand&&<span style={{fontSize:13,color:C.muted}}>{r.brand}</span>}
                                    <span style={{fontSize:12,background:`${sourceColor(r.source)}14`,color:sourceColor(r.source),borderRadius:4,padding:"1px 6px",fontWeight:500}}>{r.source}</span>
                                  </div>
                                </div>
                                <span style={{fontSize:15,color:C.blue,fontWeight:700,flexShrink:0,marginLeft:10}}>{r.cal} kcal</span>
                              </div>
                              <div style={{display:"flex",gap:10}}>
                                <span style={{fontSize:13,color:C.green}}>P {r.prot}g</span>
                                <span style={{fontSize:13,color:C.orange}}>C {r.carb}g</span>
                                <span style={{fontSize:13,color:C.purple}}>G {r.fat}g</span>
                                <span style={{fontSize:13,color:C.muted}}>per 100g</span>
                              </div>
                            </div>
                            <button onClick={async(e)=>{
                              e.stopPropagation();
                              const already=myFoods.some(f=>f.name===r.name&&f.brand===(r.brand||""));
                              if(already){showToast("Già nei tuoi alimenti");return;}
                              const{data}=await sb.from("athlete_foods").insert({name:r.name,brand:r.brand||"",cal:r.cal,prot:r.prot,carb:r.carb,fat:r.fat,user_id:user.id}).select().single();
                              if(data){
                                const nf={id:`my_${data.id}`,dbId:data.id,name:data.name,brand:data.brand||"",cal:data.cal||0,prot:data.prot||0,carb:data.carb||0,fat:data.fat||0,per100:{cal:data.cal||0,prot:data.prot||0,carb:data.carb||0,fat:data.fat||0},source:"I miei"};
                                setMyFoods(p=>sortAlpha([...p,nf]));
                                showToast("Salvato nei tuoi alimenti ♥");
                              }
                            }}
                              title="Salva nei miei alimenti"
                              style={{background:"none",border:"none",cursor:"pointer",color:myFoods.some(f=>f.name===r.name)?C.red:C.muted,fontSize:22,flexShrink:0,padding:"4px"}}>
                              {myFoods.some(f=>f.name===r.name)?"♥":"♡"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.length===0&&!searching&&search&&(
                      <div style={{fontSize:15,color:C.muted,textAlign:"center",padding:14}}>Nessun risultato</div>
                    )}
                  </>
                )}

                {(searchTab==="miei"||searchTab==="recenti")&&(()=>{
                  const list=searchTab==="miei"?myFoods:recentFoods;
                  return(
                    <div>
                      {list.length===0?(
                        <div style={{fontSize:15,color:C.muted,textAlign:"center",padding:18}}>
                          {searchTab==="miei"?"Nessun alimento salvato — aggiungi con ♡ dalla ricerca":"Nessun alimento usato di recente"}
                        </div>
                      ):(
                        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",maxHeight:360,overflowY:"auto",marginBottom:10}}>
                          {list.map((f,fi)=>(
                            <div key={fi} style={{borderBottom:fi<list.length-1?`1px solid ${C.border}`:"none"}}>
                              {editingFood===f.dbId?(
                                <div style={{padding:"12px 16px"}}>
                                  <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>Modifica alimento</div>
                                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                    <input value={editFoodData.name||""} onChange={e=>setEditFoodData(p=>({...p,name:e.target.value}))} placeholder="Nome" style={{...inp,fontSize:15}}/>
                                    <input value={editFoodData.brand||""} onChange={e=>setEditFoodData(p=>({...p,brand:e.target.value}))} placeholder="Marca" style={{...inp,fontSize:15}}/>
                                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                                      {[["cal","kcal"],["prot","g"],["carb","g"],["fat","g"]].map(([k,u])=>(
                                        <div key={k} style={{position:"relative"}}>
                                          <input type="number" value={editFoodData[k]||""} onChange={e=>setEditFoodData(p=>({...p,[k]:e.target.value}))}
                                            placeholder={k==="cal"?"Calorie":k==="prot"?"Proteine":k==="carb"?"Carboidrati":"Grassi"}
                                            style={{...inp,fontSize:15,paddingRight:28}}/>
                                          <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:12,color:C.muted}}>{u}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{display:"flex",gap:8}}>
                                      <button onClick={()=>{setEditingFood(null);setEditFoodData({});}}
                                        style={{flex:1,padding:9,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,color:C.sub,fontSize:15,cursor:"pointer",fontFamily:C.f}}>Annulla</button>
                                      <button onClick={updateMyFood}
                                        style={{flex:2,padding:9,background:C.blue,border:"none",borderRadius:10,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>Salva modifiche</button>
                                    </div>
                                  </div>
                                </div>
                              ):(
                                <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                                  <div onClick={()=>addFood(f,mealIdx,100)} style={{flex:1,cursor:"pointer",minWidth:0}}>
                                    <div style={{fontSize:15,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                                    {f.brand&&<div style={{fontSize:13,color:C.muted,marginBottom:3}}>{f.brand}</div>}
                                    <div style={{display:"flex",gap:10,marginTop:3}}>
                                      <span style={{fontSize:14,color:C.blue,fontWeight:600}}>{f.cal} kcal</span>
                                      <span style={{fontSize:13,color:C.green}}>P {f.prot}g</span>
                                      <span style={{fontSize:13,color:C.orange}}>C {f.carb}g</span>
                                      <span style={{fontSize:13,color:C.purple}}>G {f.fat}g</span>
                                      <span style={{fontSize:13,color:C.muted}}>per 100g</span>
                                    </div>
                                  </div>
                                  {searchTab==="miei"&&(
                                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                                      <button onClick={()=>{setEditingFood(f.dbId);setEditFoodData({name:f.name,brand:f.brand||"",cal:f.cal,prot:f.prot,carb:f.carb,fat:f.fat});}}
                                        style={{background:"none",border:"none",color:C.blue,fontSize:16,cursor:"pointer",padding:"4px"}}>✎</button>
                                      <button onClick={()=>deleteMyFood(f.dbId)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",padding:"4px"}}>×</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {searchTab==="miei"&&(!showAddFood?(
                        <button onClick={()=>setShowAddFood(true)}
                          style={{width:"100%",padding:"10px 0",background:`${C.purple}10`,border:`1px dashed ${C.purple}40`,borderRadius:12,color:C.purple,fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:C.f}}>
                          + Nuovo alimento
                        </button>
                      ):(
                        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
                          <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:12}}>Nuovo alimento</div>
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            <input placeholder="Nome *" value={newFood.name} onChange={e=>setNewFood(p=>({...p,name:e.target.value}))} style={{...inp,fontSize:15}}/>
                            <input placeholder="Marca (opzionale)" value={newFood.brand} onChange={e=>setNewFood(p=>({...p,brand:e.target.value}))} style={{...inp,fontSize:15}}/>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                              {[["Calorie *","cal","kcal"],["Proteine","prot","g"],["Carboidrati","carb","g"],["Grassi","fat","g"]].map(([l,k,u])=>(
                                <div key={k} style={{position:"relative"}}>
                                  <input type="number" placeholder={l} value={newFood[k]} onChange={e=>setNewFood(p=>({...p,[k]:e.target.value}))}
                                    style={{...inp,fontSize:15,paddingRight:32}}/>
                                  <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted}}>{u}</span>
                                </div>
                              ))}
                            </div>
                            <div style={{display:"flex",gap:10}}>
                              <button onClick={()=>{setShowAddFood(false);setNewFood({name:"",brand:"",cal:"",prot:"",carb:"",fat:"",});}}
                                style={{flex:1,padding:10,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,color:C.sub,fontSize:15,cursor:"pointer",fontFamily:C.f}}>Annulla</button>
                              <button onClick={saveMyFood} disabled={savingFood||!newFood.name||!newFood.cal}
                                style={{flex:2,padding:10,background:C.purple,border:"none",borderRadius:10,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f,opacity:savingFood?0.7:1}}>
                                {savingFood?"…":"Salva"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {searchTab==="barcode"&&(
                  <div>
                    <div id="qr-reader" style={{width:"100%",borderRadius:12,overflow:"hidden",marginBottom:8}}/>
                    {!scannerActive&&(
                      <button onClick={startScanner}
                        style={{width:"100%",padding:11,background:`linear-gradient(135deg,${C.teal},${C.blue})`,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f,marginBottom:8}}>
                        📷 Avvia scanner
                      </button>
                    )}
                    {scannerMsg&&<div style={{fontSize:14,color:C.sub,textAlign:"center",marginBottom:8}}>{scannerMsg}</div>}
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <input placeholder="Oppure inserisci barcode manualmente…" id="manual-barcode"
                        style={{...inp,flex:1,fontSize:14}} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){searchBarcode(e.target.value);e.target.value="";}}}/>
                      <button onClick={()=>{const v=document.getElementById("manual-barcode")?.value;if(v){searchBarcode(v);document.getElementById("manual-barcode").value="";}}}
                        style={{padding:"0 12px",background:C.teal,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:C.f,flexShrink:0}}>Cerca</button>
                    </div>
                    {searchResults.length>0&&(
                      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                        {searchResults.map((r,ri)=>(
                          <div key={ri} onClick={()=>addFood(r,mealIdx,100)} style={{padding:"12px 14px",cursor:"pointer"}}>
                            <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4}}>{r.name}</div>
                            {r.brand&&<div style={{fontSize:13,color:C.muted,marginBottom:6}}>{r.brand}</div>}
                            <div style={{display:"flex",gap:10}}>
                              <span style={{fontSize:14,color:C.blue,fontWeight:600}}>{r.cal} kcal</span>
                              <span style={{fontSize:14,color:C.green}}>P {r.prot}g</span>
                              <span style={{fontSize:14,color:C.orange}}>C {r.carb}g</span>
                              <span style={{fontSize:14,color:C.purple}}>G {r.fat}g</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ):(
              <button onClick={()=>{setAddingTo(mealIdx);setSearchTab("cerca");setSearchResults([]);setSearch("");}}
                style={{marginTop:12,width:"100%",padding:"8px 0",background:`${C.blue}10`,border:`1px dashed ${C.blue}40`,borderRadius:10,color:C.blue,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:C.f}}>
                + Aggiungi alimento
              </button>
            )}
          </Card>
        );
      })}

      <button onClick={addMeal}
        style={{width:"100%",padding:13,background:C.bg1,border:`1.5px dashed ${C.border}`,borderRadius:14,color:C.sub,fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:C.f}}>
        + Aggiungi pasto
      </button>

      {meals.length>0&&(
        <button onClick={saveMealPlan} disabled={saving}
          style={{width:"100%",padding:13,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:C.f,opacity:saving?0.7:1,boxShadow:`0 4px 16px ${C.blue}30`}}>
          {saving?"Salvataggio…":"Salva meal plan"}
        </button>
      )}
    </>
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
  const[checkinNotes,setCheckinNotes]=useState("");
  const[checkinLoaded,setCheckinLoaded]=useState(false);
  const[toast,setToast]=useState(null);
  const[editDay,setEditDay]=useState(null);
  const[planSec,setPlanSec]=useState("current");
  const[calRange,setCalRange]=useState(30);
  const[weekOffset,setWeekOffset]=useState(0);
  const[weekNotes,setWeekNotes]=useState({});
  const[planning,setPlanning]=useState(null);
  const[planningView,setPlanningView]=useState("setup");
  const[mealPlanOn,setMealPlanOn]=useState(null);
  const[mealPlanOff,setMealPlanOff]=useState(null);
  const[dayMeals,setDayMeals]=useState({});
  const[mealPlanOnId,setMealPlanOnId]=useState(null);
  const[mealPlanOffId,setMealPlanOffId]=useState(null);
  const[wInput,setWInput]=useState("");
  const[wDate,setWDate]=useState(todayStr());
  const[wNote,setWNote]=useState("");
  const[dashPeriod,setDashPeriod]=useState("6m");
  const[showAllWeights,setShowAllWeights]=useState(false);
  const DAY_LABELS=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
  const[dayPattern,setDayPattern]=useState(()=>{try{return JSON.parse(localStorage.getItem("atk_day_pattern"))||["on","on","on","on","off","off","off"];}catch{return["on","on","on","on","off","off","off"];}});
  useEffect(()=>{localStorage.setItem("atk_day_pattern",JSON.stringify(dayPattern));},[dayPattern]);

  useEffect(()=>{localStorage.setItem("atk_theme",isDark?"dark":"light");},[isDark]);
  useEffect(()=>{localStorage.setItem("atk_sidebar",sidebarCollapsed?"collapsed":"expanded");},[sidebarCollapsed]);
  useEffect(()=>{localStorage.setItem(LS,JSON.stringify(plan));},[plan]);

  useEffect(()=>{
    if(!user)return;
    async function fetchAll(){
      setLoading(true);
      try{
        const[dr,wr,pr,plr,mpr]=await Promise.all([
          sb.from("athlete_days").select("*").eq("user_id",user.id),
          sb.from("athlete_weight").select("*").eq("user_id",user.id).order("date"),
          sb.from("athlete_plan_history").select("*").eq("user_id",user.id).order("date"),
          sb.from("athlete_planning").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1),
          sb.from("athlete_meal_plan").select("*").eq("user_id",user.id),
        ]);
        if(dr.data){const map={};dr.data.forEach(r=>{map[r.date]={type:r.type,calories:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat,steps:r.steps,note:r.note,isEstimate:r.is_estimate,cardioMinutes:r.cardio_minutes};});setDays(map);}
        if(wr.data)setWeightLog(wr.data.map(r=>({date:r.date,weight:r.weight,note:r.note})));
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
          if(on){setMealPlanOn(on.meals||[]);setMealPlanOnId(on.id);}
          if(off){setMealPlanOff(off.meals||[]);setMealPlanOffId(off.id);}
        }
      }catch(e){console.error(e);}
      setLoading(false);
    }
    fetchAll();
  },[user]);

  const currentWeekStart=()=>getWeekDates(0)[0];
  useEffect(()=>{
    if(!user)return;
    (async()=>{
      const{data}=await sb.from("athlete_week_checkin").select("*").eq("user_id",user.id).eq("week_start",currentWeekStart()).maybeSingle();
      if(data){
        setCheckinCardioSessions(data.cardio_target_sessions??"");
        setCheckinCardioMinutes(data.cardio_target_minutes??"");
        setCheckinNotes(data.notes??"");
      }
      setCheckinLoaded(true);
    })();
  },[user]);
  async function saveCheckin(){
    const ws=currentWeekStart();
    const payload={user_id:user.id,week_start:ws,cardio_target_sessions:checkinCardioSessions?+checkinCardioSessions:null,cardio_target_minutes:checkinCardioMinutes?+checkinCardioMinutes:null,notes:checkinNotes};
    const{error}=await sb.from("athlete_week_checkin").upsert(payload,{onConflict:"user_id,week_start"});
    if(error)console.error(error);else showToast("Check-in salvato");
  }

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2200);};

  const setDay=(date,data)=>setDays(p=>({...p,[date]:{...(p[date]||{}),...data}}));

  async function upsertDay(date,data){
    setDay(date,data);
    setSyncing(true);
    const merged={...(days[date]||{}),...data};
    const existing=await sb.from("athlete_days").select("id").eq("date",date).eq("user_id",user.id).maybeSingle();
    if(existing.data){
      await sb.from("athlete_days").update({type:merged.type,calories:merged.calories,protein:merged.protein,carbs:merged.carbs,fat:merged.fat,steps:merged.steps,note:merged.note,is_estimate:merged.isEstimate,cardio_minutes:merged.cardioMinutes}).eq("date",date).eq("user_id",user.id);
    }else{
      await sb.from("athlete_days").insert({date,type:merged.type,calories:merged.calories,protein:merged.protein,carbs:merged.carbs,fat:merged.fat,steps:merged.steps,note:merged.note,is_estimate:merged.isEstimate,cardio_minutes:merged.cardioMinutes,user_id:user.id});
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

  useEffect(()=>{
    if(!user||loading)return;
    if(!days[today]?.type&&autoType){
      upsertDay(today,{type:autoType,calories:plan[autoType+"Cal"],protein:plan[autoType+"P"],carbs:plan[autoType+"C"],fat:plan[autoType+"F"]});
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
  const weeklyStats=useMemo(()=>Array.from({length:8},(_,i)=>{
    const dates=getWeekDates(i-7);
    const logged=dates.map(d=>days[d]).filter(Boolean);
    const withCal=logged.filter(d=>d.calories);
    const onDays=withCal.filter(d=>d.type==="on");
    const offDays=withCal.filter(d=>d.type==="off");
    return{
      label:i===7?"Questa":i===6?"Scorsa":`S${i+1}`,
      avgCal:avg(withCal.map(d=>d.calories)),
      avgCalOn:avg(onDays.map(d=>d.calories)),
      avgCalOff:avg(offDays.map(d=>d.calories)),
      onCount:onDays.length,
      offCount:offDays.length,
      avgProt:avg(withCal.map(d=>d.protein).filter(Boolean)),
      avgCarb:avg(withCal.map(d=>d.carbs).filter(Boolean)),
      avgFat:avg(withCal.map(d=>d.fat).filter(Boolean)),
      avgSteps:avg(logged.map(d=>d.steps).filter(Boolean)),
      cardioMinutesTotal:logged.reduce((s,d)=>s+(d.cardioMinutes||0),0),
    };
  }),[days]);
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
  const weekDates=getWeekDates(weekOffset);
  const inp={background:C.bg3,border:`1px solid ${C.border}`,borderRadius:13,color:C.text,padding:"10px 13px",fontSize:15,outline:"none",width:"100%",fontFamily:C.f,boxSizing:"border-box"};

  const NAV=[
    {id:"dashboard",group:"Panoramica",label:"Dashboard",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>},
    {id:"oggi",group:"Panoramica",label:"Oggi",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>},
    {id:"peso",group:"Progressi",label:"Peso",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
    {id:"planning",group:"Progressi",label:"Planning",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
    {id:"piano",group:"Alimentazione",label:"Piano",icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?C.blue:C.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>},
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
            <button onClick={()=>setTab("oggi")} style={{background:`linear-gradient(135deg,${C.pink},${C.purple})`,border:"none",borderRadius:6,padding:"9px 16px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:C.f,whiteSpace:"nowrap"}}>
              + nuovo log
            </button>
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
              {!sidebarCollapsed&&(
                <div style={{display:"flex",background:C.bg2,borderRadius:8,padding:3,gap:2}}>
                  {[["dashboard","Dashboard"],["checkin","Check-in"]].map(([v,l])=>(
                    <button key={v} onClick={()=>{setSidebarMode(v);if(v==="checkin")setTab("checkin");else setTab("dashboard");}}
                      style={{flex:1,padding:"8px 0",border:"none",borderRadius:6,background:sidebarMode===v?C.bg4:"transparent",color:sidebarMode===v?C.text:C.sub,fontSize:13,fontWeight:sidebarMode===v?600:400,cursor:"pointer",fontFamily:C.f,transition:"all 0.15s"}}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={()=>setSidebarCollapsed(p=>!p)} title={sidebarCollapsed?"Espandi menu":"Riduci menu"}
                style={{display:"flex",alignItems:"center",justifyContent:sidebarCollapsed?"center":"space-between",padding:"0 6px",background:"none",border:"none",cursor:"pointer",fontFamily:C.f}}>
                {!sidebarCollapsed&&<span style={{fontSize:11,color:C.muted,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Menu</span>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/>
                  {sidebarCollapsed?<polyline points="5 10 8 12 5 14"/>:<polyline points="18 10 15 12 18 14"/>}
                </svg>
              </button>
              {sidebarMode==="dashboard"&&NAV_GROUPS.map(g=>(
                <div key={g}>
                  {!sidebarCollapsed&&<div style={{fontSize:11,color:C.muted,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",padding:"0 14px",marginBottom:8}}>{g}</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {NAV.filter(n=>n.group===g).map(n=>{
                      const active=tab===n.id;
                      return(
                        <button key={n.id} onClick={()=>setTab(n.id)} title={sidebarCollapsed?n.label:undefined}
                          style={{display:"flex",alignItems:"center",gap:13,padding:sidebarCollapsed?"11px 0":"11px 14px",justifyContent:sidebarCollapsed?"center":"flex-start",borderRadius:"0 10px 10px 0",borderLeft:`2px solid ${active?C.blue:"transparent"}`,background:active?`${C.blue}12`:"transparent",color:active?C.blue:C.sub,fontSize:15,fontWeight:active?600:500,cursor:"pointer",fontFamily:C.f,textAlign:"left",transition:"all 0.15s"}}>
                          {n.icon(active)}{!sidebarCollapsed&&n.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:12}}>
                      <div>
                        <div style={typeStyle(TYPE.label,C,{textTransform:"lowercase"})}>andamento peso</div>
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

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
                <Card C={C} onClick={()=>setTab("piano")} style={{borderLeft:`3px solid ${C.pink}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <span style={{width:3,height:14,background:C.pink}}/>
                    <span style={typeStyle(TYPE.sectionTitle,C,{fontSize:13})}>giorno ON</span>
                  </div>
                  <div style={{...typeStyle(TYPE.cardValue,C),marginBottom:10}}>{plan.onCal} <span style={{fontSize:13,color:C.sub,fontWeight:400}}>kcal</span></div>
                  <div style={{display:"flex",gap:12,fontSize:12,color:C.sub}}>
                    <span>P {plan.onP}g</span><span>C {plan.onC}g</span><span>G {plan.onF}g</span>
                  </div>
                </Card>
                <Card C={C} onClick={()=>setTab("piano")} style={{borderLeft:`3px solid ${C.blue}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <span style={{width:3,height:14,background:C.blue}}/>
                    <span style={typeStyle(TYPE.sectionTitle,C,{fontSize:13})}>giorno OFF</span>
                  </div>
                  <div style={{...typeStyle(TYPE.cardValue,C),marginBottom:10}}>{plan.offCal} <span style={{fontSize:13,color:C.sub,fontWeight:400}}>kcal</span></div>
                  <div style={{display:"flex",gap:12,fontSize:12,color:C.sub}}>
                    <span>P {plan.offP}g</span><span>C {plan.offC}g</span><span>G {plan.offF}g</span>
                  </div>
                </Card>
                <Card C={C} onClick={()=>setTab("oggi")} style={{borderLeft:`3px solid ${C.orange}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <span style={{width:3,height:14,background:C.orange}}/>
                    <span style={typeStyle(TYPE.sectionTitle,C,{fontSize:13})}>media passi</span>
                  </div>
                  <div style={typeStyle(TYPE.cardValue,C)}>{(demoMode?generateDemoData().avgSteps:thisWeek.avgSteps)??'—'} <span style={{fontSize:13,color:C.sub,fontWeight:400}}>passi/gg</span></div>
                </Card>
                <Card C={C} onClick={()=>setTab("checkin")} style={{borderLeft:`3px solid ${C.green}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <span style={{width:3,height:14,background:C.green}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:C.fTight}}>ultimo check-in</span>
                  </div>
                  <div style={{fontSize:13,color:C.sub}}>{checkinNotes?checkinNotes.slice(0,60)+(checkinNotes.length>60?"…":""):"Nessuna nota questa settimana"}</div>
                </Card>
              </div>
            </>)}

            {/* ── OGGI ── */}
            {tab==="oggi"&&(<>
              <Card C={C}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Tag label={todayType==="on"?"ON":"OFF"} color={todayType==="on"?C.blue:C.teal}/>
                    {!todayData.type&&<Tag label="da pattern" color={C.muted}/>}
                    {todayData.isEstimate&&<Tag label="Stima AI" color={C.orange}/>}
                  </div>
                  <button onClick={()=>{const nt=todayType==="on"?"off":"on";upsertDay(today,{type:nt,calories:plan[nt+"Cal"],protein:plan[nt+"P"],carbs:plan[nt+"C"],fat:plan[nt+"F"]});showToast(`Eccezione: oggi ${nt==="on"?"ON":"OFF"}`);}}
                    style={{background:"none",border:"none",color:C.sub,fontSize:14,cursor:"pointer",fontFamily:C.f}}>Eccezione oggi</button>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:15,fontWeight:600,color:C.text}}>{todayData.calories??'—'} <span style={{color:C.sub,fontWeight:400,fontSize:14}}>/ {tpl?.cal} kcal</span></span>
                    <span style={{fontSize:14,color:C.sub}}>{tpl?.cal?`${Math.round(((todayData.calories||0)/tpl.cal)*100)}%`:""}</span>
                  </div>
                  <div style={{height:6,background:C.bg3,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:6,width:`${tpl?.cal?Math.min(100,((todayData.calories||0)/tpl.cal)*100):0}%`,background:`linear-gradient(90deg,${C.blue},${C.indigo})`,borderRadius:99,transition:"width 0.5s"}}/>
                  </div>
                </div>
                <MBar C={C} label="Proteine" value={todayData.protein} max={tpl?.p} color={C.green}/>
                <MBar C={C} label="Carboidrati" value={todayData.carbs} max={tpl?.c} color={C.orange}/>
                <MBar C={C} label="Grassi" value={todayData.fat} max={tpl?.f} color={C.purple}/>
                {todayData.note&&<div style={{marginTop:10,fontSize:14,color:C.sub,fontStyle:"italic"}}>{todayData.note}</div>}
              </Card>
              <Card C={C}>
                <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:4}}>Inserimento</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:18}}>Salva automaticamente all'uscita dal campo</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:12}}>
                  {[["Calorie","calories","kcal",C.blue],["Proteine","protein","g",C.green],["Carboidrati","carbs","g",C.orange],["Grassi","fat","g",C.purple]].map(([l,k,u,color])=>(
                    <div key={k}>
                      <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>{l}</div>
                      <div style={{position:"relative"}}>
                        <input type="number" key={`${k}-${today}`} defaultValue={todayData[k]??""} onBlur={e=>upsertDay(today,{[k]:e.target.value?+e.target.value:null})}
                          placeholder={tpl?String(tpl[k[0]]):"0"}
                          style={{...inp,paddingRight:36}}
                          onFocus={e=>{e.target.style.borderColor=color;e.target.style.boxShadow=`0 0 0 3px ${color}14`;}}
                          onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";upsertDay(today,{[k]:e.target.value?+e.target.value:null});}}/>
                        <span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted,pointerEvents:"none"}}>{u}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:13,color:C.sub,marginBottom:6,fontWeight:500}}>Passi</div>
                    <input type="number" key={`steps-${today}`} defaultValue={todayData.steps??""} onBlur={e=>upsertDay(today,{steps:e.target.value?+e.target.value:null})} placeholder="8000" style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:13,color:C.sub,marginBottom:6,fontWeight:500}}>Cardio (min, opzionale)</div>
                    <input type="number" key={`cardio-${today}`} defaultValue={todayData.cardioMinutes??""} onBlur={e=>upsertDay(today,{cardioMinutes:e.target.value?+e.target.value:null})} placeholder="0" style={inp}/>
                  </div>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13,color:C.sub,marginBottom:6,fontWeight:500}}>Note</div>
                  <input value={todayData.note??""} onChange={e=>upsertDay(today,{note:e.target.value})} placeholder="Refeed, sgarro, pasto fuori…" style={inp}/>
                </div>
                <button onClick={()=>showToast("Dati salvati ✓")} style={{width:"100%",padding:12,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f,letterSpacing:0.2}}>
                  Salva
                </button>
              </Card>
              <Card C={C}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <button onClick={()=>setWeekOffset(p=>p-1)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.sub}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14,color:weekOffset===0?C.sub:C.blue,fontWeight:weekOffset===0?400:500}}>
                      {weekOffset===0?"Questa settimana":weekOffset===-1?"Settimana scorsa":`${Math.abs(weekOffset)} sett. fa`}
                    </span>
                    <input type="date" onChange={e=>{
                      if(!e.target.value)return;
                      const sel=new Date(e.target.value+"T12:00:00");
                      const now=new Date();
                      const diffMs=sel-now;
                      const diffWeeks=Math.floor(diffMs/(7*24*3600*1000));
                      setWeekOffset(Math.min(0,diffWeeks));
                    }}
                    style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.sub,fontSize:12,padding:"3px 6px",outline:"none",cursor:"pointer",fontFamily:C.f,width:32,opacity:0.6}}
                    title="Vai a data"/>
                  </div>
                  <button onClick={()=>setWeekOffset(p=>Math.min(0,p+1))} disabled={weekOffset===0}
                    style={{background:"none",border:`1px solid ${weekOffset===0?C.bg3:C.border}`,borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:weekOffset===0?"default":"pointer",color:weekOffset===0?C.muted:C.sub,opacity:weekOffset===0?0.4:1}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <div style={{display:"flex",gap:5}}>
                  {weekDates.map((date,i)=>{
                    const d=days[date]||{},isT=date===today;
                    const maxC=Math.max(...weekDates.map(dd=>days[dd]?.calories||0),1);
                    const h=d.calories?Math.max(10,(d.calories/maxC)*56):5;
                    const barColor=d.type==="on"?C.blue:d.type==="off"?C.teal:isT?C.blue:C.bg3;
                    return(
                      <div key={i} onClick={()=>setEditDay(date)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}>
                        <div style={{fontSize:11,color:C.muted,marginBottom:2}}>{d.calories||""}</div>
                        <div style={{width:"100%",height:60,display:"flex",alignItems:"flex-end"}}>
                          <div style={{width:"100%",height:h,borderRadius:6,background:barColor,opacity:isT?1:0.6,outline:isT?`2px solid ${C.blue}`:"none",outlineOffset:2,transition:"height 0.3s ease"}}/>
                        </div>
                        <span style={{fontSize:11,color:isT?C.blue:C.muted,fontWeight:isT?600:400}}>{fmtDL(date)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              {/* Storico settimanale calorie */}
              <Card C={C}>
                <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:14}}>Storico settimanale</div>
                {weeklyStats.slice().reverse().filter(w=>w.avgCal).map((w,i)=>{
                  const wKey=`week_${i}`;
                  const wDates=getWeekDates(-(weeklyStats.filter(x=>x.avgCal).length-1-i));
                  const isCurrent=w.label==="Questa";
                  return(
                    <div key={i} style={{padding:"14px 0",borderBottom:i<weeklyStats.filter(x=>x.avgCal).length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{fontSize:15,color:isCurrent?C.blue:C.text,fontWeight:isCurrent?700:500,marginBottom:6}}>
                            {isCurrent?"Questa settimana":w.label==="Scorsa"?"Scorsa settimana":w.label}
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {w.onCount>0&&w.avgCalOn&&<span style={{fontSize:13,background:`${C.blue}14`,color:C.blue,borderRadius:6,padding:"2px 7px",fontWeight:500}}>{w.onCount} ON · {w.avgCalOn} kcal</span>}
                            {w.offCount>0&&w.avgCalOff&&<span style={{fontSize:13,background:`${C.teal}14`,color:C.teal,borderRadius:6,padding:"2px 7px",fontWeight:500}}>{w.offCount} OFF · {w.avgCalOff} kcal</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:22,fontWeight:700,color:isCurrent?C.blue:C.text,letterSpacing:-0.3}}>{w.avgCal}<span style={{fontSize:14,color:C.sub,marginLeft:3,fontWeight:400}}>kcal</span></div>
                          <div style={{fontSize:12,color:C.muted,marginBottom:3}}>media totale</div>
                          <div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                            {w.avgProt&&<span style={{fontSize:13,color:C.green,fontWeight:500}}>P {w.avgProt}g</span>}
                            {w.avgCarb&&<span style={{fontSize:13,color:C.orange,fontWeight:500}}>C {w.avgCarb}g</span>}
                            {w.avgFat&&<span style={{fontSize:13,color:C.purple,fontWeight:500}}>G {w.avgFat}g</span>}
                          </div>
                        </div>
                      </div>
                      <input
                        defaultValue={weekNotes[wKey]||""}
                        onBlur={e=>setWeekNotes(p=>({...p,[wKey]:e.target.value}))}
                        placeholder="Note settimana…"
                        style={{...inp,fontSize:14,padding:"7px 10px",color:C.sub,background:C.bg2,border:`1px solid ${C.border}`}}
                        onFocus={e=>{e.target.style.borderColor=C.blue;e.target.style.color=C.text;}}
                        onBlur2={e=>{e.target.style.borderColor=C.border;}}
                      />
                    </div>
                  );
                })}
                {weeklyStats.filter(w=>w.avgCal).length===0&&(
                  <div style={{fontSize:14,color:C.muted,textAlign:"center",padding:"16px 0"}}>Nessuna settimana con dati ancora.</div>
                )}
              </Card>
            </>)}

            {/* ── PESO ── */}
            {tab==="peso"&&(<>
              <Kicker label="misurazione peso giornaliera" C={C}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
                <Card C={C} style={{padding:"14px 22px"}}>
                  <div style={{fontSize:13,color:C.text,marginBottom:6,fontWeight:500}}>peso giornaliero</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:34,fontWeight:700,color:C.text,lineHeight:1,letterSpacing:-0.5,fontFamily:C.fTight}}>{lastW??'—'}</span>
                    <span style={{fontSize:14,color:C.sub}}>kg</span>
                  </div>
                </Card>
                <Card C={C} style={{padding:"14px 22px"}}>
                  <div style={{fontSize:13,color:C.text,marginBottom:6,fontWeight:500}}>{wDeltaLabel?.toLowerCase()}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:34,fontWeight:700,color:wDelta!=null?(wDelta<0?C.green:C.orange):C.muted,lineHeight:1,letterSpacing:-0.5,fontFamily:C.fTight}}>
                      {wDelta!=null?(wDelta>0?`+${wDelta}`:wDelta):'—'}
                    </span>
                    <span style={{fontSize:14,color:C.sub}}>kg</span>
                  </div>
                </Card>
              </div>
              {avgW7&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
                  <KPI C={C} label="Media sett." value={avgW7} unit="kg" color={C.blue}/>
                  <KPI C={C} label="vs sett. prec." value={avgW7delta!=null?(avgW7delta>0?`+${avgW7delta}`:avgW7delta):null} unit="kg" color={avgW7delta!=null?(avgW7delta<0?C.green:C.orange):C.muted}/>
                </div>
              )}
              <Card C={C} hi>
                <div style={{fontSize:14,color:C.sub,marginBottom:14}}>Nuova pesata</div>
                <div style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>PESO (KG)</div>
                    <input type="number" step="0.1" value={wInput} onChange={e=>setWInput(e.target.value)} placeholder="83.2" style={inp}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>DATA</div>
                    <input type="date" value={wDate} onChange={e=>setWDate(e.target.value)} style={inp}/>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>NOTE (opzionale)</div>
                  <input value={wNote} onChange={e=>setWNote(e.target.value)} placeholder="Es: mattina a digiuno…" style={inp}/>
                </div>
                <button onClick={()=>{if(!wInput)return;upsertWeight(wDate,wInput,wNote);setWInput("");setWNote("");showToast("Peso salvato");}}
                  style={{width:"100%",padding:11,background:`linear-gradient(135deg,${C.pink},${C.purple})`,border:"none",borderRadius:6,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
                  Salva
                </button>
              </Card>
              {weightChart.length>1&&(
                <Card C={C}>
                  <Kicker label="grafico" C={C}/>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <span style={{width:3,height:16,background:C.pink}}/>
                    <span style={{fontSize:15,fontWeight:600,color:C.text,fontFamily:C.fTight}}>Andamento peso</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={weightChart}>
                      <defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.pink} stopOpacity={0.35}/><stop offset="95%" stopColor={C.pink} stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}/>
                      <XAxis dataKey="date" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} interval={Math.max(0,Math.ceil(weightChart.length/6)-1)}/>
                      <YAxis tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
                      <Tooltip content={<CTip C={C}/>}/>
                      <Area type="monotone" dataKey="Peso" stroke={C.pink} strokeWidth={2} fill="url(#wg2)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  {weightWeeklyAvg.length>1&&(
                    <>
                    <div style={{display:"flex",alignItems:"center",gap:8,margin:"18px 0 10px"}}>
                      <span style={{width:3,height:16,background:C.blue}}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:C.fTight}}>Media settimanale</span>
                    </div>
                    <ResponsiveContainer width="100%" height={90}>
                      <AreaChart data={weightWeeklyAvg}>
                        <defs><linearGradient id="wgavg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.18}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient></defs>
                        <XAxis dataKey="date" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} interval={Math.max(0,Math.ceil(weightWeeklyAvg.length/6)-1)}/>
                        <YAxis tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
                        <Tooltip content={<CTip C={C}/>}/>
                        <Area type="monotone" dataKey="Media" stroke={C.blue} strokeWidth={2.5} fill="url(#wgavg)" dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                    </>
                  )}
                </Card>
              )}
              <Card C={C}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:15,fontWeight:600,color:C.text}}>Storico pesate</div>
                  {weightLog.length>7&&<button onClick={()=>setShowAllWeights(p=>!p)} style={{background:"none",border:"none",color:C.blue,fontSize:13,cursor:"pointer",fontFamily:C.f}}>{showAllWeights?"Mostra meno":"Mostra tutto"}</button>}
                </div>
                {[...weightLog].reverse().slice(0,showAllWeights?30:7).map((w,i,arr)=>(
                  <div key={i} style={{padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:15,color:C.sub}}>{fmtShort(w.date)}</span>
                      <div style={{display:"flex",gap:14,alignItems:"center"}}>
                        <span style={{fontSize:18,fontWeight:600,color:C.teal}}>{w.weight} <span style={{fontSize:13,color:C.muted}}>kg</span></span>
                        <button onClick={()=>deleteWeight(w.date)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
                      </div>
                    </div>
                    {w.note&&<div style={{fontSize:13,color:C.muted,marginTop:3,fontStyle:"italic"}}>{w.note}</div>}
                  </div>
                ))}
                {!weightLog.length&&<div style={{color:C.muted,textAlign:"center",padding:24,fontSize:15}}>Nessuna pesata registrata.</div>}
              </Card>
            </>)}

            {/* ── CHAT ── */}
            {/* ── PIANO ── */}
            {tab==="piano"&&(<>
              <Seg C={C} options={[{value:"current",label:"Piano attuale"},{value:"history",label:"Storico variazioni"}]} value={planSec} onChange={setPlanSec}/>
              {planSec==="current"&&(<>
                <Card C={C}>
                  <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:4}}>Pattern settimanale</div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Definisci quali giorni sono ON e quali OFF — si applica in automatico ogni settimana</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
                    {DAY_LABELS.map((lbl,i)=>{
                      const type=dayPattern[i],color=type==="on"?C.blue:C.teal;
                      return(
                        <button key={i} onClick={()=>setDayPattern(p=>p.map((t,j)=>j===i?(t==="on"?"off":"on"):t))}
                          style={{padding:"12px 4px",background:`${color}14`,border:`1.5px solid ${color}40`,borderRadius:12,cursor:"pointer",textAlign:"center",fontFamily:C.f}}>
                          <div style={{fontSize:12,color:C.sub,marginBottom:4,fontWeight:500}}>{lbl}</div>
                          <div style={{fontSize:13,fontWeight:700,color}}>{type==="on"?"ON":"OFF"}</div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
                {[["on","Giorni ON",C.blue],["off","Giorni OFF",C.teal]].map(([type,label,color])=>(
                  <Card key={type} C={C} style={{border:`1.5px solid ${color}30`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
                      <div style={{fontSize:17,fontWeight:700,color}}>{label}</div>
                      <div style={{fontSize:15,color:C.sub}}>Media: <span style={{color:C.text,fontWeight:600}}>{plan[type+"Cal"]} kcal</span></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
                      {[["Calorie","Cal","kcal"],["Proteine","P","g"],["Carboidrati","C","g"],["Grassi","F","g"]].map(([l,k,u])=>(
                        <div key={k}>
                          <div style={{fontSize:14,color:C.sub,marginBottom:6,fontWeight:500}}>{l}</div>
                          <div style={{display:"flex",alignItems:"center",background:C.bg3,borderRadius:12,border:`1px solid ${C.border}`,transition:"border-color 0.2s"}}>
                            <input type="number" value={plan[type+k]} onChange={e=>setPlan(p=>({...p,[type+k]:+e.target.value}))}
                              onFocus={e=>e.target.parentElement.style.borderColor=color}
                              onBlur={e=>e.target.parentElement.style.borderColor=C.border}
                              style={{flex:1,background:"none",border:"none",color:C.text,padding:"10px 12px",fontSize:16,fontWeight:500,outline:"none",fontFamily:C.f}}/>
                            <span style={{color:C.sub,fontSize:14,paddingRight:10,fontWeight:500}}>{u}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
                <button onClick={savePlanVar}
                  style={{width:"100%",padding:14,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:C.f,letterSpacing:0.2,boxShadow:`0 4px 16px ${C.blue}30`}}>
                  Salva e registra variazione
                </button>
                {weeksOn>=1&&(
                  <Card C={C}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:15,fontWeight:600,color:C.text}}>Piano corrente</span>
                      <Tag label={`Sett. ${weeksOn}`} color={C.blue}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:14,color:C.sub}}>Attivo dal</span>
                      <span style={{fontSize:14,fontWeight:500,color:C.text}}>{fmtShort(curPlan?.date)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:14,color:C.sub}}>Media stimata</span>
                      <span style={{fontSize:14,fontWeight:500,color:C.blue}}>{Math.round((plan.onCal*4+plan.offCal*3)/7)} kcal/g</span>
                    </div>
                  </Card>
                )}
                <button onClick={()=>{if(window.confirm("Cancellare tutti i dati?")){}}}
                  style={{background:`${C.red}10`,border:`1px solid ${C.red}20`,borderRadius:12,color:C.red,fontSize:14,fontWeight:500,padding:"11px 16px",cursor:"pointer",fontFamily:C.f,width:"100%"}}>
                  Reset dati
                </button>
              </>)}
              {planSec==="history"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
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
            </>)}

            {/* ── PLANNING ── */}
            {tab==="planning"&&(<>
              {planningView==="setup"&&(
                <PlanningSetup C={C} inp={inp} lastW={lastW} plan={plan} todayStr={todayStr} fmtShort={fmtShort} setPlanning={setPlanning} setPlanningView={setPlanningView}/>
              )}

              {(planningView==="edit"||planningView==="view")&&planning&&(()=>{
                const typeColors={cut:C.orange,bulk:C.green,recomp:C.blue,maint:C.teal};
                const typeColor=typeColors[planning.type]||C.blue;
                const typeLabel={cut:"Cut",bulk:"Bulk",recomp:"Recomp",maint:"Mantenimento"}[planning.type]||planning.type;
                const totalWeeks=planning.weeks.length;
                const today=todayStr();
                const currentWeekIdx=planning.weeks.findIndex((w,i)=>{
                  const next=planning.weeks[i+1];
                  return w.date<=today&&(!next||next.date>today);
                });
                const progress=currentWeekIdx>=0?Math.round((currentWeekIdx+1)/totalWeeks*100):0;

                const chartData=planning.weeks.map(w=>({
                  week:`S${w.week}`,
                  "Cal ON":w.onCal,
                  "Cal OFF":w.offCal,
                  "Peso":w.weightTarget,
                }));

                async function savePlanning(){
                  setSyncing(true);
                  if(planning.id){
                    await sb.from("athlete_planning").update({name:planning.name,type:planning.type,start_date:planning.startDate,weeks:planning.weeks}).eq("id",planning.id).eq("user_id",user.id);
                  }else{
                    const{data}=await sb.from("athlete_planning").insert({name:planning.name,type:planning.type,start_date:planning.startDate,weeks:planning.weeks,user_id:user.id}).select().single();
                    if(data)setPlanning(p=>({...p,id:data.id}));
                  }
                  setSyncing(false);
                  setPlanningView("view");
                  showToast("Piano salvato");
                }

                function updateWeek(i,field,val){
                  setPlanning(p=>({...p,weeks:p.weeks.map((w,wi)=>wi===i?{...w,[field]:val}:w)}));
                }

                return(
                  <>
                    {/* Header piano */}
                    <div style={{background:C.bg1,border:`1.5px solid ${typeColor}30`,borderRadius:20,padding:18,borderLeft:`3px solid ${typeColor}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                            <span style={{fontSize:13,fontWeight:600,background:`${typeColor}14`,color:typeColor,borderRadius:6,padding:"3px 9px"}}>{typeLabel}</span>
                            <span style={{fontSize:13,color:C.muted}}>{totalWeeks} settimane</span>
                          </div>
                          <div style={{fontSize:18,fontWeight:700,color:C.text}}>{planning.name}</div>
                          <div style={{fontSize:13,color:C.sub,marginTop:3}}>{fmtShort(planning.startDate)} → {fmtShort(planning.weeks[planning.weeks.length-1]?.date)}</div>
                        </div>
                        {currentWeekIdx>=0&&(
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:24,fontWeight:700,color:typeColor}}>{currentWeekIdx+1}<span style={{fontSize:15,color:C.sub}}>/{totalWeeks}</span></div>
                            <div style={{fontSize:12,color:C.muted}}>settimana attuale</div>
                          </div>
                        )}
                      </div>
                      {currentWeekIdx>=0&&(
                        <div style={{height:4,background:C.bg3,borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:4,width:`${progress}%`,background:typeColor,borderRadius:99,transition:"width 0.5s"}}/>
                        </div>
                      )}
                    </div>

                    {/* KPI */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
                      <KPI C={C} label="Peso iniziale" value={planning.weeks[0]?.weightTarget} unit="kg" color={C.teal}/>
                      <KPI C={C} label="Peso target" value={planning.weeks[planning.weeks.length-1]?.weightTarget} unit="kg" color={typeColor}/>
                      <KPI C={C} label="Cal iniziali ON" value={planning.weeks[0]?.onCal} unit="kcal" color={C.blue}/>
                      <KPI C={C} label="Cal finali ON" value={planning.weeks[planning.weeks.length-1]?.onCal} unit="kcal" color={typeColor}/>
                    </div>

                    {/* Grafico calorie */}
                    <Card C={C}>
                      <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:14}}>Progressione calorie pianificate</div>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="pgon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.18}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient>
                            <linearGradient id="pgoff" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.12}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} vertical={false}/>
                          <XAxis dataKey="week" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} domain={["auto","auto"]} width={36}/>
                          <Tooltip content={<CTip C={C}/>}/>
                          <Area type="monotone" dataKey="Cal ON" stroke={C.blue} strokeWidth={2} fill="url(#pgon)" dot={false}/>
                          <Area type="monotone" dataKey="Cal OFF" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 3" fill="url(#pgoff)" dot={false}/>
                        </AreaChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",gap:12,marginTop:8}}>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:12,height:2,background:C.blue,borderRadius:99}}/><span style={{fontSize:12,color:C.muted}}>Cal ON</span></div>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:12,height:2,background:C.teal,borderRadius:99,opacity:0.7}}/><span style={{fontSize:12,color:C.muted}}>Cal OFF</span></div>
                      </div>
                    </Card>

                    {/* Grafico peso pianificato vs reale */}
                    {(()=>{
                      const weightCompChart=planning.weeks.map(w=>{
                        const realW=weightLog.find(wl=>wl.date>=w.date&&wl.date<(planning.weeks[planning.weeks.indexOf(w)+1]?.date||"9999"))?.weight||null;
                        return{week:`S${w.week}`,Pianificato:w.weightTarget,Reale:realW};
                      });
                      const hasReal=weightCompChart.some(d=>d.Reale!=null);
                      return(
                        <Card C={C}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                            <span style={{fontSize:15,fontWeight:600,color:C.text}}>Peso pianificato vs reale</span>
                          </div>
                          <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={weightCompChart}>
                              <defs>
                                <linearGradient id="pwplan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.muted} stopOpacity={0.1}/><stop offset="95%" stopColor={C.muted} stopOpacity={0}/></linearGradient>
                                <linearGradient id="pwreal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.2}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} vertical={false}/>
                              <XAxis dataKey="week" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} domain={["auto","auto"]} width={36}/>
                              <Tooltip content={<CTip C={C}/>}/>
                              <Area type="monotone" dataKey="Pianificato" stroke={C.muted} strokeWidth={1.5} strokeDasharray="5 3" fill="url(#pwplan)" dot={false}/>
                              {hasReal&&<Area type="monotone" dataKey="Reale" stroke={C.teal} strokeWidth={2} fill="url(#pwreal)" dot={{fill:C.teal,r:3,strokeWidth:0}} connectNulls={false}/>}
                            </AreaChart>
                          </ResponsiveContainer>
                          <div style={{display:"flex",gap:12,marginTop:8}}>
                            <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:14,height:2,background:C.muted,borderRadius:99,opacity:0.6}}/><span style={{fontSize:12,color:C.muted}}>Pianificato</span></div>
                            <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:14,height:2,background:C.teal,borderRadius:99}}/><span style={{fontSize:12,color:C.muted}}>Reale</span></div>
                            {!hasReal&&<span style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>— il peso reale apparirà settimana per settimana</span>}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* Tabella settimane */}
                    <Card C={C}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                        <span style={{fontSize:15,fontWeight:600,color:C.text}}>Settimane</span>
                        {planningView==="view"&&<button onClick={()=>setPlanningView("edit")} style={{fontSize:14,color:C.blue,background:"none",border:`1px solid ${C.blue}30`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:C.f}}>Modifica</button>}
                        {planningView==="edit"&&<button onClick={savePlanning} style={{fontSize:14,color:"#fff",background:C.blue,border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:C.f,fontWeight:600}}>Salva</button>}
                      </div>
                      {planning.weeks.map((w,i)=>{
                        const isCurrent=i===currentWeekIdx;
                        const isPast=currentWeekIdx>=0&&i<currentWeekIdx;
                        return(
                          <div key={i} style={{padding:"16px 0",borderBottom:i<planning.weeks.length-1?`1px solid ${C.border}`:"none",opacity:isPast?0.5:1}}>
                            {/* Riga header settimana */}
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{width:28,height:28,borderRadius:99,background:isCurrent?typeColor:isPast?C.bg3:C.bg2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                  <span style={{fontSize:13,fontWeight:700,color:isCurrent?"#fff":C.sub}}>{w.week}</span>
                                </div>
                                <div>
                                  <span style={{fontSize:15,color:isCurrent?typeColor:C.text,fontWeight:isCurrent?700:500}}>{fmtShort(w.date)}</span>
                                  {isCurrent&&<span style={{fontSize:13,color:typeColor,marginLeft:6}}>← ora</span>}
                                </div>
                              </div>
                              <span style={{fontSize:16,fontWeight:700,color:isCurrent?typeColor:C.text}}>{w.weightTarget} kg</span>
                            </div>
                            {planningView==="edit"?(
                              <>
                                <div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>Calorie</div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                                  {[["Calorie ON","onCal","kcal"],["Calorie OFF","offCal","kcal"]].map(([l,k,u])=>(
                                    <div key={k}>
                                      <div style={{fontSize:14,color:C.sub,marginBottom:5,fontWeight:500}}>{l}</div>
                                      <div style={{position:"relative"}}>
                                        <input type="number" defaultValue={w[k]} onBlur={e=>updateWeek(i,k,e.target.value?+e.target.value:w[k])}
                                          style={{...inp,paddingRight:36,fontSize:15}}/>
                                        <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted,pointerEvents:"none"}}>{u}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>Macro ON</div>
                                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:12}}>
                                  {[["Proteine","onP","g"],["Carboidrati","onC","g"],["Grassi","onF","g"]].map(([l,k,u])=>(
                                    <div key={k}>
                                      <div style={{fontSize:14,color:C.sub,marginBottom:5,fontWeight:500}}>{l}</div>
                                      <div style={{position:"relative"}}>
                                        <input type="number" defaultValue={w[k]} onBlur={e=>updateWeek(i,k,e.target.value?+e.target.value:w[k])}
                                          style={{...inp,paddingRight:28,fontSize:15}}/>
                                        <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted,pointerEvents:"none"}}>{u}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>Macro OFF</div>
                                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:10}}>
                                  {[["Proteine","offP","g"],["Carboidrati","offC","g"],["Grassi","offF","g"]].map(([l,k,u])=>(
                                    <div key={k}>
                                      <div style={{fontSize:14,color:C.sub,marginBottom:5,fontWeight:500}}>{l}</div>
                                      <div style={{position:"relative"}}>
                                        <input type="number" defaultValue={w[k]||""} onBlur={e=>updateWeek(i,k,e.target.value?+e.target.value:w[k])}
                                          style={{...inp,paddingRight:28,fontSize:15}}/>
                                        <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted,pointerEvents:"none"}}>{u}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <div style={{fontSize:14,color:C.sub,marginBottom:5,fontWeight:500}}>Peso target</div>
                                  <div style={{position:"relative",maxWidth:140}}>
                                    <input type="number" defaultValue={w.weightTarget} onBlur={e=>updateWeek(i,"weightTarget",e.target.value?+e.target.value:w.weightTarget)}
                                      style={{...inp,paddingRight:28,fontSize:15}}/>
                                    <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted,pointerEvents:"none"}}>kg</span>
                                  </div>
                                </div>
                                <div style={{marginTop:12,padding:"10px 14px",background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
                                  <div style={{fontSize:13,color:C.sub,marginBottom:8,fontWeight:500}}>Applica questi valori alle settimane successive</div>
                                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                    <span style={{fontSize:14,color:C.text}}>Dalla sett. {w.week+1} per</span>
                                    <input type="number" min="1" max={planning.weeks.length-i-1} defaultValue={Math.min(3,planning.weeks.length-i-1)}
                                      id={`apply-count-${i}`}
                                      style={{...inp,width:60,padding:"6px 8px",fontSize:15,textAlign:"center"}}/>
                                    <span style={{fontSize:14,color:C.text}}>sett.</span>
                                    <button onClick={()=>{
                                      const count=parseInt(document.getElementById(`apply-count-${i}`)?.value)||1;
                                      const fields=["onCal","offCal","onP","onC","onF","offP","offC","offF"];
                                      setPlanning(p=>({...p,weeks:p.weeks.map((wk,wi)=>{
                                        if(wi>i&&wi<=i+count){
                                          const updated={...wk};
                                          fields.forEach(f=>{if(w[f]!=null)updated[f]=w[f];});
                                          return updated;
                                        }
                                        return wk;
                                      })}));
                                      showToast(`Applicato alle prossime ${count} settimane`);
                                    }}
                                      style={{padding:"6px 14px",background:C.blue,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:C.f,whiteSpace:"nowrap"}}>
                                      Applica
                                    </button>
                                  </div>
                                  {i===planning.weeks.length-1&&<div style={{fontSize:12,color:C.muted,marginTop:6}}>Ultima settimana — nessuna successiva</div>}
                                </div>
                              </>
                            ):(
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                  <span style={{fontSize:14,background:`${C.blue}14`,color:C.blue,borderRadius:6,padding:"3px 10px",fontWeight:500}}>ON {w.onCal} kcal</span>
                                  <span style={{fontSize:14,background:`${C.teal}14`,color:C.teal,borderRadius:6,padding:"3px 10px",fontWeight:500}}>OFF {w.offCal} kcal</span>
                                </div>
                                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                                  <span style={{fontSize:13,color:C.sub,fontWeight:500,minWidth:30}}>ON:</span>
                                  {w.onP&&<span style={{fontSize:14,color:C.green,fontWeight:500}}>Prot {w.onP}g</span>}
                                  {w.onC&&<span style={{fontSize:14,color:C.orange,fontWeight:500}}>Carb {w.onC}g</span>}
                                  {w.onF&&<span style={{fontSize:14,color:C.purple,fontWeight:500}}>Gras {w.onF}g</span>}
                                </div>
                                {(w.offP||w.offC||w.offF)&&(
                                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                                    <span style={{fontSize:13,color:C.sub,fontWeight:500,minWidth:30}}>OFF:</span>
                                    {w.offP&&<span style={{fontSize:14,color:C.green,fontWeight:500}}>Prot {w.offP}g</span>}
                                    {w.offC&&<span style={{fontSize:14,color:C.orange,fontWeight:500}}>Carb {w.offC}g</span>}
                                    {w.offF&&<span style={{fontSize:14,color:C.purple,fontWeight:500}}>Gras {w.offF}g</span>}
                                  </div>
                                )}
                              </div>
                            )}
                            {planningView==="edit"?(
                              <input defaultValue={w.note} onBlur={e=>updateWeek(i,"note",e.target.value)}
                                placeholder="Note settimana…" style={{...inp,fontSize:13,padding:"6px 10px",marginTop:6}}/>
                            ):(w.note&&<div style={{fontSize:13,color:C.muted,marginTop:6,fontStyle:"italic"}}>{w.note}</div>)}
                          </div>
                        );
                      })}
                    </Card>

                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>{setPlanning(null);setPlanningView("setup");}}
                        style={{flex:1,padding:12,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,color:C.sub,fontSize:15,cursor:"pointer",fontFamily:C.f}}>
                        Nuovo piano
                      </button>
                      {planningView==="edit"&&(
                        <button onClick={savePlanning}
                          style={{flex:2,padding:12,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:C.f}}>
                          Salva piano
                        </button>
                      )}
                    </div>
                    {planning.id&&(
                      <button onClick={async()=>{
                        if(!window.confirm("Eliminare il piano? Non si può annullare."))return;
                        await sb.from("athlete_planning").delete().eq("id",planning.id).eq("user_id",user.id);
                        setPlanning(null);setPlanningView("setup");showToast("Piano eliminato");
                      }}
                        style={{width:"100%",padding:11,background:`${C.red}10`,border:`1px solid ${C.red}20`,borderRadius:12,color:C.red,fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:C.f}}>
                        Elimina piano
                      </button>
                    )}
                  </>
                );
              })()}
            </>)}

            {/* ── MEAL PLAN ── */}
            {tab==="meal"&&(
              <MealPlan
                C={C} inp={inp} sb={sb} user={user}
                mealPlanOn={mealPlanOn} setMealPlanOn={setMealPlanOn}
                mealPlanOnId={mealPlanOnId} setMealPlanOnId={setMealPlanOnId}
                mealPlanOff={mealPlanOff} setMealPlanOff={setMealPlanOff}
                mealPlanOffId={mealPlanOffId} setMealPlanOffId={setMealPlanOffId}
                showToast={showToast} todayType={todayType} today={today}
              />
            )}

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
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>SESSIONI TARGET / SETT.</div>
                    <input type="number" value={checkinCardioSessions} onChange={e=>setCheckinCardioSessions(e.target.value)} placeholder="3" style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:500}}>MINUTI TARGET / SETT.</div>
                    <input type="number" value={checkinCardioMinutes} onChange={e=>setCheckinCardioMinutes(e.target.value)} placeholder="90" style={inp}/>
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
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
