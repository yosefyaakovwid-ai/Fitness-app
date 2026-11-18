/* Coach app logic. Needs meals.js loaded first. */
const S=JSON.parse(localStorage.getItem('flc')||'{}');
S.profile=S.profile||null;S.logs=S.logs||[];S.adj=S.adj||0;S.food=S.food||{};S.custom=S.custom||{};
S.water=S.water||{};S.shuf=S.shuf||{};S.myMeals=S.myMeals||[];
const save=()=>localStorage.setItem('flc',JSON.stringify(S));
const $=id=>document.getElementById(id);
const FIELDS=['sex','age','height','weight','goal','act','wday','split','style','days','region','extra','rotate','avoid','bottle','waterGoal'];
const CHECKS=['kosher','shabbat','chol'];
const NUMS=['age','height','weight','goal','act','days','extra','rotate','bottle','waterGoal'];
const DAYNAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ALLERGENS={nuts:['Tree nuts',['nuts','almonds','walnuts']],peanuts:['Peanuts',['peanuts']],gluten:['Gluten',['wheat','barley','gluten','bulgur','couscous']],
 dairy:['Dairy',['milk','yoghurt','cheese','whey','quark','skyr','labneh']],eggs:['Eggs',['eggs']],fish:['Fish',['fish']],soy:['Soy',['soy','tofu','edamame']],sesame:['Sesame',['sesame','tahini']]};
const PREFS={veg:['More vegetables','v','veg'],fill:['Bigger, more filling portions','fill','filling'],
 protein:['Extra protein','pr','protein'],fish:['More fish','fish','fish'],quick:['Quick to make','q','quick']};
$('allergyBox').innerHTML=Object.entries(ALLERGENS).map(([k,[n]])=>`<label class="chk"><input type="checkbox" id="al-${k}">${n}</label>`).join('');
$('prefBox').innerHTML=Object.entries(PREFS).map(([k,[n]])=>`<label class="chk"><input type="checkbox" id="pf-${k}">${n}</label>`).join('');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const today=()=>ymd(new Date());
const daysAgo=s=>(new Date(today())-new Date(s))/864e5;
function tab(t){['profile','plan','train','log'].forEach(x=>{$(x).classList.toggle('hide',x!==t);$('t-'+x).classList.toggle('on',x===t)});
 if(t==='plan')renderDiet();if(t==='train')renderTrain();if(t==='log')renderLog();if(t==='profile')renderMyMeals()}
function saveProfile(){const p={};FIELDS.forEach(f=>p[f]=$(f).value);CHECKS.forEach(c=>p[c]=$(c).checked);
 NUMS.forEach(k=>p[k]=+p[k]||0);
 p.allergy=Object.keys(ALLERGENS).filter(a=>$('al-'+a).checked);
 p.prefs=Object.keys(PREFS).filter(a=>$('pf-'+a).checked);
 if(!p.age||!p.height||!p.weight)return alert('Please fill in age, height and weight.');
 S.profile=p;if(!S.logs.length)S.logs.push({d:today(),w:p.weight});save();tab('plan')}
const curW=()=>S.logs.length?S.logs[S.logs.length-1].w:S.profile.weight;
function isWeighDay(){const w=S.profile.wday||'daily';return w==='daily'||+w===new Date().getDay()}
const loggedToday=()=>S.logs.some(l=>l.d===today());

/* ---------- My meals ---------- */
function addMyMeal(){const n=$('myName').value.trim();if(!n)return alert('Type a meal name first.');
 const ing=$('myIng').value.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean).join(',');
 S.myMeals.push({s:$('mySlot').value,n,t:$('myType').value,f:ing,mine:1});save();
 $('myName').value='';$('myIng').value='';renderMyMeals()}
function delMyMeal(i){S.myMeals.splice(i,1);save();renderMyMeals()}
function renderMyMeals(){const nm={b:'Breakfast',l:'Lunch',d:'Supper',x:'Snack'};
 $('myList').innerHTML=S.myMeals.length?S.myMeals.map((m,i)=>`<li><span>${esc(m.n)} <small>${nm[m.s]} &middot; ${m.t}</small></span><button class="mini" onclick="delMyMeal(${i})">Delete</button></li>`).join('')
 :'<li><small>No meals added yet.</small></li>'}

/* ---------- Export / import ---------- */
function shareFile(name,text,type){const file=new File([text],name,{type});
 if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file]}).catch(()=>{});return}
 const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();a.remove()}
function exportCSV(){const dates=new Set([...S.logs.map(l=>l.d),...Object.keys(S.food),...Object.keys(S.water),...Object.keys(S.workouts||{})]);
 if(!dates.size)return alert('Nothing logged yet.');
 const rows=[['date','weight_kg','calories','protein_g','target_kcal','water_ml','activities','workout','active_min']];
 [...dates].sort().forEach(d=>{const w=S.logs.find(l=>l.d===d),f=S.food[d];
  const a=(S.workouts||{})[d];
  rows.push([d,w?w.w:'',f?f.k:'',f?f.p:'',S.profile?targetFor(d):'',S.water[d]||'',
   a?Object.entries(a.acts).map(([id,mn])=>actById(id).n.replace(/[,;]/g,' ')+' '+mn+'min').join('; '):'',a&&a.w?a.w:'',
   a?Object.values(a.acts).reduce((x,y)=>x+(+y||0),0):''])});
 shareFile('coach-'+today()+'.csv',rows.map(r=>r.join(',')).join('\n'),'text/csv')}
function exportBackup(){shareFile('coach-backup-'+today()+'.json',JSON.stringify(S,null,1),'application/json')}
function importBackup(inp){const file=inp.files[0];if(!file)return;const rd=new FileReader();
 rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!d||typeof d!=='object'||!('logs' in d))throw 0;
   if(!confirm('This replaces everything currently in the app with the backup. Continue?'))return;
   localStorage.setItem('flc',JSON.stringify(d));location.reload()}
  catch(e){alert('That file is not a Coach backup.')}finally{inp.value=''}};
 rd.readAsText(file)}

/* ---------- Calorie targets ---------- */
function targets(){const p=S.profile,w=curW();
 const bmr=10*w+6.25*p.height-5*p.age+(p.sex==='m'?5:-161),tdee=bmr*p.act;
 const floor=p.sex==='m'?1500:1200;
 const avgK=Math.max(floor,tdee-Math.min(500,tdee*0.2)+S.adj);
 let week=avgK*7,extra=p.shabbat?p.extra:0,weekday=(week-2*extra)/7;
 if(weekday<floor){weekday=floor;extra=Math.max(0,(week-7*floor)/2)}
 const r=x=>Math.round(x/10)*10,pf=(p.prefs||[]).includes('protein')?2.0:1.8;
 return{tdee:r(tdee),avg:r(avgK),weekday:r(weekday),weekend:r(weekday+extra),extra:r(extra),protein:Math.round(w*pf),rawTdee:tdee,rawAvg:avgK}}
function targetFor(ds){const t=targets(),dow=new Date(ds+'T12:00').getDay(),on=S.profile.shabbat&&t.extra>0;
 return on?((dow===5||dow===6)?t.weekend:t.weekday):t.avg}

/* ---------- Food and water ---------- */
const num=v=>parseFloat(String(v).replace(',','.'))||0;
const r1=x=>Math.round(x*10)/10;
S.foodUndo=S.foodUndo||{};
function snapFood(){const d=today();(S.foodUndo[d]=S.foodUndo[d]||[]).push(S.food[d]?{...S.food[d]}:null);
 Object.keys(S.foodUndo).forEach(k=>{if(k!==d)delete S.foodUndo[k]});save()}
function addFood(){const k=num($('kc').value),pr=num($('pr').value);if(!k)return;snapFood();const d=today();
 const f=S.food[d]||{k:0,p:0};f.k=r1(f.k+k);f.p=r1(f.p+pr);S.food[d]=f;save();renderDiet()}
function setFood(){const k=num($('kc').value),pr=num($('pr').value);if(!k&&!pr)return;snapFood();
 S.food[today()]={k:r1(k),p:r1(pr)};save();renderDiet()}
function clearFood(){if(!S.food[today()])return;snapFood();delete S.food[today()];save();renderDiet()}
function undoFood(){const d=today(),h=S.foodUndo[d];if(!h||!h.length)return;
 const prev=h.pop();if(prev)S.food[d]=prev;else delete S.food[d];save();renderDiet()}
const bottleSize=()=>(S.profile&&S.profile.bottle)||750;
function waterGoal(){const g=S.profile.waterGoal;return g>0?g:Math.round(curW()*35/100)*100}
function addWater(ml){const d=today();S.water[d]=Math.max(0,(S.water[d]||0)+ml);save();renderDiet()}

/* ---------- Meal filtering ---------- */
const SLOTS=[['b','Breakfast',0.25,2],['l','Lunch',0.35,2],['d','Supper',0.30,2],['x','Snacks',0.10,3]];
const NONKOSHER=/pork|bacon|ham|shrimp|prawn|lobster|crab|shellfish/i;
function prefMatch(m,k){return k==='fish'?(m.f||'').split(',').includes('fish'):(m.g||'').split(',').includes(PREFS[k][1])}
function score(m){const p=S.profile;return(p.prefs||[]).filter(k=>prefMatch(m,k)).length+(p.chol?(m.h||0)-(m.c||0):0)+(m.mine?0.5:0)}
/* Foods to avoid: exact match, plurals handled, add * for related foods (e.g. tomato*) */
const stem=w=>{w=w.toLowerCase().trim();
 if(w.length>4&&w.endsWith('oes'))return w.slice(0,-2);
 if(w.length>4&&w.endsWith('ies'))return w.slice(0,-3)+'y';
 if(/(ch|sh|x)es$/.test(w))return w.slice(0,-2);
 if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss'))return w.slice(0,-1);return w};
const stemText=s=>' '+String(s).toLowerCase().split(/[^a-z]+/).filter(Boolean).map(stem).join(' ')+' ';
const SYN={nut:['almond','walnut','cashew','pistachio','hazelnut','pecan'],tomato:['salsa','ketchup','passata'],
 fish:['salmon','tuna','cod','sardine','tilapia','lox','bream','bass']};
function avoidHit(m,terms){const t=stemText(m.n+' '+(m.f||''));
 return terms.some(a=>{const wide=a.trim().endsWith('*'),s=stemText(a.replace(/\*/g,'')).trim();if(!s)return false;
  return t.includes(' '+s+' ')||(wide&&(SYN[s]||[]).some(x=>t.includes(' '+x+' ')))})}
function meals(){const p=S.profile,reg=p.region||'all',av=(p.avoid||'').split(',').map(s=>s.trim()).filter(Boolean);
 const al=(p.allergy||[]).flatMap(a=>ALLERGENS[a]?ALLERGENS[a][1]:[]);
 return MEALS.concat(S.myMeals).filter(m=>{const ing=(m.f||'').split(',').map(s=>s.trim()),txt=(m.n+','+(m.f||'')).toLowerCase();
  if(!m.mine&&m.r&&reg!=='all'&&!m.r.split(',').includes(reg))return false;
  if(p.kosher&&NONKOSHER.test(txt))return false;
  if(ing.some(i=>al.includes(i)))return false;
  return !avoidHit(m,av)})}

/* ---------- Rotation and shuffle ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
 t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function periodNum(){const rot=S.profile.rotate||2;return Math.floor(Math.floor(new Date(today()+'T12:00').getTime()/864e5)/rot)}
function periodKey(){return 'p'+(S.profile.rotate||2)+'-'+periodNum()+'-'}
function picksFor(slot,count){const off=S.shuf[periodKey()+slot]||0,dow=new Date().getDay(),isSh=dow===5||dow===6;
 const pool=meals().filter(m=>m.s===slot&&(!m.sh||isSh));
 const r=rng(periodNum()*131+slot.charCodeAt(0)*17+off*7919+(S.profile.rotate||2));
 const ranked=pool.map(m=>({m,k:r()-score(m)*0.35})).sort((a,b)=>a.k-b.k).map(x=>x.m);
 const out=ranked.slice(0,count);
 if(isSh&&(slot==='l'||slot==='d')&&out.length&&!out.some(m=>m.sh)){const sh=ranked.find(m=>m.sh);if(sh)out[out.length-1]=sh}
 return{out,pool}}
function shuffleSlot(s){const k=periodKey()+s;S.shuf[k]=(S.shuf[k]||0)+1;save();renderDiet()}
function shuffleAll(){SLOTS.forEach(([s])=>{const k=periodKey()+s;S.shuf[k]=(S.shuf[k]||0)+1});save();renderDiet()}
function pruneShuffles(){const pk=periodKey();Object.keys(S.shuf).forEach(k=>{if(!k.startsWith(pk))delete S.shuf[k]})}
function mealTags(m){const p=S.profile;let tg='';
 if(m.mine)tg+='<span class="tag mine">mine</span>';
 if(p.kosher)tg+=`<span class="tag ${m.t}">${m.t}</span>`;
 (p.prefs||[]).forEach(k=>{if(prefMatch(m,k))tg+=`<span class="tag pref">${PREFS[k][2]}</span>`});
 if(p.chol&&m.h)tg+='<span class="tag heart">heart-friendly</span>';
 if(p.chol&&m.c)tg+='<span class="tag occ">occasional</span>';return tg}

/* ---------- Diet tab ---------- */
function renderDiet(){if(!S.profile){$('plan').innerHTML='<div class="card">Fill in Settings first.</div>';return}
 pruneShuffles();
 const p=S.profile,t=targets(),d=today(),tgt=targetFor(d),f=S.food[d]||{k:0,p:0},prefs=p.prefs||[];
 const pct=Math.min(100,f.k/tgt*100),left=r1(tgt-f.k);let h='';
 if(isWeighDay()&&!loggedToday())h+=`<div class="banner" onclick="tab('log')">It's weigh-in day. Tap here to log your weight.</div>`;
 h+=`<div class="card"><h3>Today</h3>
  <div class="row"><div><small>Eaten</small><div class="big">${f.k}</div></div>
  <div><small>Target</small><div class="big" style="color:#e2e8f0">${tgt}</div></div></div>
  <div class="bar ${left<0?'over':''}"><div style="width:${pct}%"></div></div>
  <p>${left>=0?`<b>${left}</b> kcal left`:`<b>${-left}</b> kcal over`} &middot; Protein <b>${f.p}</b> / ${t.protein} g</p>
  <div class="row"><div><label>Calories</label><input id="kc" type="text" inputmode="decimal"></div>
  <div><label>Protein (g)</label><input id="pr" type="text" inputmode="decimal"></div></div>
  <div class="row"><button onclick="addFood()">Add meal</button><button class="sec" onclick="setFood()">Set day total</button></div>
  ${(S.foodUndo[d]||[]).length?'<button class="sec" onclick="undoFood()">Undo last entry</button>':''}
  <button class="sec" onclick="clearFood()">Clear today</button></div>`;
 const wml=S.water[d]||0,wg=waterGoal(),bt=bottleSize();
 h+=`<div class="card"><h3>Water</h3>
  <div class="big" style="color:#38bdf8">${(wml/1000).toFixed(2)} L <small>of ${(wg/1000).toFixed(1)} L</small></div>
  <div class="bar wbar"><div style="width:${Math.min(100,wml/wg*100)}%"></div></div>
  <p><small>${wml>=wg?'Goal reached, nice one.':`About ${Math.ceil((wg-wml)/250)} cups or ${((wg-wml)/bt).toFixed(1)} bottles to go.`}</small></p>
  <div class="row"><button class="blue" onclick="addWater(250)">+ Cup (250 ml)</button><button class="blue" onclick="addWater(${bt})">+ Bottle (${bt} ml)</button></div>
  <div class="row"><button class="sec" onclick="addWater(-250)">Undo cup</button><button class="sec" onclick="addWater(-${bt})">Undo bottle</button></div></div>`;
 const r10=x=>Math.round(x/10)*10,rotTxt={1:'every day',2:'every 2 days',3:'every 3 days',7:'every week'}[p.rotate||2];
 h+=`<div class="card"><h3>Today's menu</h3><small>New picks ${rotTxt}. Tap Shuffle for something different. Snacks are optional.`;
 if(p.kosher)h+=' Tagged meat, dairy or pareve; follow your own custom for waiting between meat and dairy.';
 h+='</small>';
 SLOTS.forEach(([k,name,frac,count])=>{const {out,pool}=picksFor(k,count);
  h+=`<div class="slothead"><h4>${name}</h4><button class="mini" onclick="shuffleSlot('${k}')">Shuffle</button></div>
   <small>about ${r10(tgt*frac)} kcal &middot; ${Math.round(t.protein*frac)} g protein &middot; ${k==='x'?'pick one or two':'pick one'}</small>`;
  if(prefs.includes('veg')&&k!=='x')h+='<br><small>Add a side salad or a portion of cooked veg.</small>';
  if(!out.length){h+='<p><small>No ideas left after your filters. Try loosening one in Settings.</small></p>';return}
  h+='<ul>'+out.map(m=>`<li>${esc(m.n)}${mealTags(m)}</li>`).join('')+'</ul>';
  const rest=pool.filter(m=>!out.includes(m));
  if(rest.length)h+=`<details><summary>See all ${pool.length} ideas</summary><ul>${rest.map(m=>`<li>${esc(m.n)}${mealTags(m)}</li>`).join('')}</ul></details>`});
 h+='<button class="sec" onclick="shuffleAll()">Shuffle the whole menu</button></div>';
 if(prefs.length)h+='<div class="card"><h3>Tips for your preferences</h3>'+prefs.map(k=>`<h4 style="margin-top:12px">${PREFS[k][0]}</h4><ul>${PREF_TIPS[k].map(x=>`<li>${x}</li>`).join('')}</ul>`).join('')+'</div>';
 if(p.chol)h+=`<div class="card"><h3>Cholesterol tips</h3><ul>
  <li>Eat oats, barley, beans and lentils often. Their soluble fibre helps lower LDL.</li>
  <li>Have fish such as salmon or sardines twice a week.</li>
  <li>Cook with olive oil instead of butter, margarine or schmaltz.</li>
  <li>Pick lean meat, skinless chicken and 0 to 5% dairy.</li>
  <li>Keep pastries, fried food and processed meats occasional.</li></ul>
  <small>General guidance only. Follow your doctor's advice and get your levels checked.</small></div>`;
 let wk=0,wkT=0,rows='';
 for(let i=6;i>=0;i--){const dd=new Date();dd.setDate(dd.getDate()-i);const s=ymd(dd),e=S.food[s],tg=targetFor(s),wa=S.water[s];
  wkT+=tg;if(e)wk+=e.k;rows+=`<tr><td>${dd.toLocaleDateString('en-GB',{weekday:'short',day:'numeric'})}</td><td>${e?e.k:'-'}</td><td><small>${tg}</small></td><td>${wa?(wa/1000).toFixed(1)+' L':'-'}</td></tr>`}
 h+=`<div class="card"><h3>Last 7 days</h3><table><tr><td><small>Day</small></td><td><small>Eaten</small></td><td><small>Target</small></td><td><small>Water</small></td></tr>${rows}</table>
  <p>Logged total: <b>${r1(wk)}</b> of ${wkT} kcal</p></div>`;
 h+=`<div class="card"><h3>Your targets</h3>`;
 h+=(p.shabbat&&t.extra>0)?`<p>Sunday to Thursday: <b>${t.weekday}</b><br>Friday and Saturday: <b>${t.weekend}</b></p><small>Same weekly total (an average of ${t.avg} a day).</small>`:`<p>Every day: <b>${t.avg}</b> kcal</p>`;
 h+=`<p><small>Maintenance is about ${t.tdee} kcal${S.adj?`. Adjusted ${S.adj>0?'+':''}${S.adj} kcal based on your progress`:''}.</small></p>
  <p>Protein: <b>${t.protein} g</b> &middot; Water: <b>${(wg/1000).toFixed(1)} L</b> &middot; Steps: <b>8,000+</b> &middot; Sleep: <b>7 to 9 h</b></p></div>`;
 $('plan').innerHTML=h;linkMeals()}

/* ---------- Training tab ---------- */
const LIB={
 full:{A:['Squat','Bench press','Barbell row','Romanian deadlift','Lateral raise','Plank'],
       B:['Deadlift','Overhead press','Lat pulldown','Split squat','Cable fly','Hanging knee raise'],
       C:['Leg press','Incline DB press','Seated cable row','Hip thrust','Face pull','Ab wheel']},
 ul:{Upper:['Bench press','Barbell row','Overhead press','Lat pulldown','Biceps curl','Triceps pushdown'],
     Lower:['Squat','Romanian deadlift','Leg press','Leg curl','Calf raise','Plank']},
 ppl:{Push:['Bench press','Overhead press','Incline DB press','Lateral raise','Triceps pushdown','Cable fly'],
      Pull:['Deadlift','Pull-ups or Lat pulldown','Seated cable row','Face pull','Biceps curl','Hammer curl'],
      Legs:['Squat','Romanian deadlift','Leg press','Leg curl','Calf raise','Hanging knee raise']}};
let editing=null;
function exFor(k){const sp=S.profile.split;return(S.custom[sp]&&S.custom[sp][k])||LIB[sp][k]}
function editW(k){editing=k;renderTrain()}
function saveW(k){const sp=S.profile.split,list=$('ed').value.split('\n').map(s=>s.trim()).filter(Boolean);
 if(!list.length)return alert('Add at least one exercise.');S.custom[sp]=S.custom[sp]||{};S.custom[sp][k]=list;editing=null;save();renderTrain()}
function resetW(k){const sp=S.profile.split;if(S.custom[sp])delete S.custom[sp][k];editing=null;save();renderTrain()}
function renderTrain(){if(!S.profile){$('train').innerHTML='<div class="card">Fill in Settings first.</div>';return}
 const p=S.profile,keys=Object.keys(LIB[p.split]);
 const note={straight:'3 sets of 6 to 12 reps. Rest 1.5 to 2 minutes.',
  superset:'Exercises are paired in the order listed (A1 then A2). Do them back to back, rest 60 to 90 seconds, repeat 3 times.',
  circuit:'Do every exercise once for 10 to 12 reps with little rest, then rest 2 minutes. 3 to 4 rounds.'}[p.style];
 let h=calendarHTML()+`<div class="card"><h3>How to train</h3><small>${note} When every set feels solid, add weight or a rep. Tap Edit to change any workout.</small></div>`;
 const shown=[];for(let i=0;i<p.days;i++)shown.push(keys[i%keys.length]);
 const nx=shown.indexOf(nextW());
 shown.forEach((k,i)=>{const ex=exFor(k);h+=`<div class="card"><h3>Day ${i+1}: ${k}${i===nx?' <span class="tag pref">next up</span>':''}</h3>`;
  if(editing===k&&shown.indexOf(k)===i){h+=`<small>One exercise per line, e.g. "Squat 4x6". Order matters for supersets.</small>
   <textarea id="ed">${ex.map(esc).join('\n')}</textarea>
   <div class="row"><button onclick="saveW('${k}')">Save</button><button class="sec" onclick="resetW('${k}')">Reset</button></div>
   <button class="sec" onclick="editing=null;renderTrain()">Cancel</button>`}
  else{if(p.style==='superset'){h+='<ul>';for(let j=0;j<ex.length;j+=2){const L=String.fromCharCode(65+j/2);
    h+=`<li><b>${L}1</b> ${esc(ex[j])}${ex[j+1]?`<br><b>${L}2</b> ${esc(ex[j+1])}`:''}</li>`}h+='</ul>'}
   else{const tg=p.style==='circuit'?'ol':'ul';h+=`<${tg}>`+ex.map(e=>`<li>${esc(e)}</li>`).join('')+`</${tg}>`}
   h+=`<button class="sec" onclick="editW('${k}')">Edit</button>`}
  h+='</div>'});
 $('train').innerHTML=h}

/* ---------- Progress, goal and auto-adjust ---------- */
function logWeight(){const w=+$('newW').value;if(!w)return;const d=today();S.logs=S.logs.filter(l=>l.d!==d);
 S.logs.push({d,w});S.logs.sort((a,b)=>a.d<b.d?-1:1);adjust();save();$('newW').value='';renderLog()}
function avg(a,b){const xs=S.logs.filter(l=>{const g=daysAgo(l.d);return g>=a&&g<b}).map(l=>l.w);
 return xs.length?xs.reduce((x,y)=>x+y)/xs.length:null}
function adjust(){const last=avg(0,7),prev=avg(7,14);if(!last||!prev)return;
 if(S.lastAdj&&daysAgo(S.lastAdj)<7)return;
 const rate=(prev-last)/prev*100;if(rate<0.25)S.adj-=150;else if(rate>1)S.adj+=150;else return;
 S.adj=Math.max(-600,Math.min(300,S.adj));S.lastAdj=today()}
function renderGoal(){const p=S.profile,g=p.goal;if(!g){$('goalCard').innerHTML='<div class="card"><small>Add a goal weight in Settings to track your progress towards it.</small></div>';return}
 const start=S.logs.length?S.logs[0].w:p.weight,now=avg(0,7)||curW(),prev=avg(7,14);
 const total=start-g,done=start-now,left=now-g;
 if(left<=0){$('goalCard').innerHTML=`<div class="card"><h3>Goal reached!</h3><p>You're at <b>${now.toFixed(1)} kg</b>, at or below your goal of ${g} kg. Brilliant work.</p><small>Set a new goal in Settings, or raise your calories slowly to maintenance.</small></div>`;return}
 const pct=total>0?Math.max(0,Math.min(100,done/total*100)):0;
 let rate=prev?prev-now:null;
 if(!rate||rate<=0){const t=targets();rate=(t.rawTdee-t.rawAvg)*7/7700}
 const weeks=left/rate,eta=new Date();eta.setDate(eta.getDate()+Math.round(weeks*7));
 $('goalCard').innerHTML=`<div class="card"><h3>Goal: ${g} kg</h3>
  <div class="row"><div><small>Now</small><div class="big">${now.toFixed(1)}</div></div><div><small>To go</small><div class="big" style="color:#e2e8f0">${left.toFixed(1)} kg</div></div></div>
  <div class="bar"><div style="width:${pct}%"></div></div>
  <p><small>${pct.toFixed(0)}% of the way there. At about ${rate.toFixed(2)} kg a week${prev?'':' (estimated)'}, you could reach it around <b>${eta.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</b>.</small></p></div>`}
function renderLog(){if(!S.profile){$('history').innerHTML='Fill in Settings first.';return}
 renderGoal();const wd=S.profile.wday||'daily';
 $('wtip').textContent=(wd==='daily'?'Weigh in every morning.':`Your weigh-in day is ${DAYNAMES[+wd]}.`)+' Same conditions each time: first thing, after the toilet, before food or drink. The app uses weekly averages.';
 const last=avg(0,7),prev=avg(7,14);let h='<h3>Progress</h3>';
 if(last)h+=`<p>This week's average: <b>${last.toFixed(1)} kg</b></p>`;
 if(last&&prev){const r=(prev-last)/prev*100;h+=`<p>Change from last week: <b>${(last-prev).toFixed(1)} kg</b><br><small>${r.toFixed(2)}% a week. The target is 0.25 to 1%.</small></p>`}
 h+='<ul>'+S.logs.slice(-14).reverse().map(l=>`<li>${l.d}: ${l.w} kg</li>`).join('')+'</ul>';$('history').innerHTML=h}

/* ---------- Tap a meal for its recipe ---------- */
(function(){const st=document.createElement('style');
 st.textContent='#plan li.meal{cursor:pointer}#plan li.meal>span.nm{text-decoration:underline dotted #64748b}'+
 '.modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;z-index:9}'+
 '.sheet{background:#1e293b;width:100%;max-width:520px;max-height:85vh;overflow:auto;border-radius:16px 16px 0 0;padding:18px 16px 28px}';
 document.head.appendChild(st);
 const s=document.createElement('script');s.src='recipes.js?v='+Date.now();s.onerror=()=>{};document.head.appendChild(s)})();
function linkMeals(){const all=MEALS.concat(S.myMeals);
 document.querySelectorAll('#plan li').forEach(li=>{const tn=li.firstChild;if(!tn||tn.nodeType!==3)return;
  const m=all.find(x=>x.n===tn.textContent.trim());if(!m)return;
  const sp=document.createElement('span');sp.className='nm';sp.textContent=tn.textContent;li.replaceChild(sp,tn);
  li.classList.add('meal');li.onclick=()=>showRecipe(m)})}
function closeRecipe(){const d=$('recipeModal');if(d)d.remove()}
function showRecipe(m){closeRecipe();
 const R=(window.RECIPES||{})[m.n];
 const q=encodeURIComponent((S.profile.kosher?'kosher ':'')+m.n.replace(/^Shabbat:\s*/,'')+' healthy recipe');
 const el=(tag,txt,css)=>{const e=document.createElement(tag);if(txt)e.textContent=txt;if(css)e.style.cssText=css;return e};
 const d=el('div');d.className='modal';d.id='recipeModal';
 const sh=el('div');sh.className='sheet';
 sh.appendChild(el('h3',m.n,'margin:0 0 6px'));
 if(R){if(R.serves)sh.appendChild(el('small',R.serves));
  const list=(title,items,tag)=>{if(!items)return;sh.appendChild(el('h4',title,'margin:14px 0 6px'));
   const l=el(tag);items.forEach(x=>l.appendChild(el('li',x)));sh.appendChild(l)};
  list('Ingredients',R.ing,'ul');list('Steps',R.steps,'ol');
  if(R.tip)sh.appendChild(el('p','Tip: '+R.tip,'opacity:.8;font-size:14px'))}
 else sh.appendChild(el('p','No built-in recipe for this one yet. Search below for ideas.'));
 const a=el('a','Search for recipes');a.href='https://www.google.com/search?q='+q;a.target='_blank';a.rel='noopener';
 a.style.cssText='display:block;text-align:center;padding:12px;margin-top:16px;border-radius:10px;background:#22c55e;color:#06210f;font-weight:600;text-decoration:none';
 const c=el('button','Close');c.className='sec';c.style.cssText='margin-top:10px;width:100%';c.onclick=closeRecipe;
 sh.appendChild(a);sh.appendChild(c);d.appendChild(sh);
 d.onclick=e=>{if(e.target===d)closeRecipe()};document.body.appendChild(d)}

/* ---------- Activity calendar ---------- */
S.workouts=S.workouts||{};
S.actTypes=S.actTypes||[{id:'weights',n:'Weights',e:'\u{1F3CB}\uFE0F'},{id:'basketball',n:'Basketball',e:'\u{1F3C0}'},
 {id:'cardio',n:'Cardio',e:'\u{1F3C3}'},{id:'walk',n:'Walk',e:'\u{1F6B6}'}];
const EMOJIS=['\u{1F4AA}','\u26BD','\u{1F3BE}','\u{1F3CA}','\u{1F6B4}','\u{1F9D8}','\u{1F94A}','\u{1F938}','\u{1F3D3}','\u{26F9}\uFE0F'];
let calMonth=(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)})();
(function(){const st=document.createElement('style');st.textContent=
 '.calhead{display:flex;align-items:center;justify-content:space-between;gap:8px}.calhead h3{margin:0}'+
 '.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:10px}'+
 '.cdh{text-align:center;font-size:12px;opacity:.6}'+
 '.cday{aspect-ratio:1;border-radius:10px;background:rgba(255,255,255,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;cursor:pointer}'+
 '.cday i{font-style:normal;font-size:11px;line-height:1.1;min-height:12px}'+
 '.cday.done{background:rgba(34,197,94,.25)}.cday.today{outline:2px solid #22c55e}.cday.fut{opacity:.35;cursor:default}'+
 '.actrow{display:flex;align-items:center;gap:10px;margin:8px 0}.actrow label{flex:1;margin:0}'+
 '.actrow input[type=checkbox],.pill input{width:auto;margin:0 6px 0 0}'+
 '.actrow input[type=number]{width:90px;flex:none;margin:0}'+
 '.pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}'+
 '.pill{display:flex;align-items:center;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.08)}'+
 '#dayModal .sheet>button{width:100%;margin-top:8px}'+
 '.actlist{padding-left:0;list-style:none}.actlist li{display:flex;justify-content:space-between;align-items:center;margin:6px 0}';
 document.head.appendChild(st)})();
function actById(id){return S.actTypes.find(a=>a.id===id)||{id,n:id,e:'\u2022'}}
function calMove(n){calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+n,1);renderTrain()}
function nextW(){const keys=Object.keys(LIB[S.profile.split]);
 for(const d of Object.keys(S.workouts).sort().reverse()){const w=S.workouts[d];
  if(w.w&&keys.includes(w.w))return keys[(keys.indexOf(w.w)+1)%keys.length]}
 return keys[0]}
function calendarHTML(){const y=calMonth.getFullYear(),m=calMonth.getMonth(),first=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),td=today();
 let h=`<div class="card"><div class="calhead"><button class="mini" onclick="calMove(-1)">&lsaquo; Prev</button>
  <h3>${calMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</h3><button class="mini" onclick="calMove(1)">Next &rsaquo;</button></div><div class="cal">`;
 ['S','M','T','W','T','F','S'].forEach(x=>h+=`<div class="cdh">${x}</div>`);
 for(let i=0;i<first;i++)h+='<div></div>';
 for(let d=1;d<=n;d++){const ds=ymd(new Date(y,m,d)),w=S.workouts[ds],fut=ds>td;
  const em=w?Object.keys(w.acts).map(id=>actById(id).e).slice(0,3).join(''):'';
  h+=`<div class="cday${w?' done':''}${ds===td?' today':''}${fut?' fut':''}"${fut?'':` onclick="openDay('${ds}')"`}><span>${d}</span><i>${em}</i></div>`}
 h+='</div>';
 const now=new Date(),sun=new Date(now);sun.setDate(now.getDate()-now.getDay());const ws=ymd(sun),mp=`${y}-${String(m+1).padStart(2,'0')}`;
 let sess=0,mins=0,wts=0,mdays=0,mmins=0;
 Object.entries(S.workouts).forEach(([ds,w])=>{const mn=Object.values(w.acts).reduce((a,b)=>a+(+b||0),0);
  if(ds>=ws&&ds<=td){sess++;mins+=mn;if('weights' in w.acts)wts++}
  if(ds.startsWith(mp)){mdays++;mmins+=mn}});
 h+=`<p><small>This week: <b>${sess}</b> active day${sess===1?'':'s'} &middot; <b>${mins}</b> min &middot; weights <b>${wts}</b> of ${S.profile.days} planned<br>
  ${calMonth.toLocaleDateString('en-GB',{month:'long'})}: <b>${mdays}</b> active days &middot; <b>${mmins}</b> min. Tap a day to log or edit it.</small></p>`;
 if(!S.workouts[td])h+=`<button onclick="openDay('${td}')">Log today's activity</button>`;
 return h+'</div>'}
function openDay(ds,draft){closeDay();
 const e=draft||S.workouts[ds]||{acts:{}},keys=Object.keys(LIB[S.profile.split]),wSel=e.w||nextW(),hasW='weights' in e.acts;
 const list=S.actTypes.filter(a=>!a.hide||a.id in e.acts);
 let h=`<h3>${new Date(ds+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</h3>
  <small>Tick what you did and add the minutes.</small>`;
 list.forEach(a=>{const on=a.id in e.acts;
  h+=`<div class="actrow"><label class="chk"><input type="checkbox" id="act-${a.id}"${on?' checked':''} onchange="actToggle('${a.id}')">${a.e} ${esc(a.n)}</label>
   <input id="min-${a.id}" type="number" inputmode="numeric" placeholder="min" value="${on&&e.acts[a.id]?e.acts[a.id]:''}"${on?'':' disabled'}></div>`});
 if(list.some(a=>a.id==='weights'))h+=`<div id="splitPick" style="display:${hasW?'block':'none'}"><small>Which workout?</small>
  <div class="pills">${keys.map(k=>`<label class="pill"><input type="radio" name="wk" value="${k}"${k===wSel?' checked':''}>${k}</label>`).join('')}</div></div>`;
 h+=`<button onclick="saveDay('${ds}')">Save</button>`;
 if(S.workouts[ds])h+=`<button class="sec" onclick="deleteDay('${ds}')">Delete this day</button>`;
 h+=`<button class="sec" onclick="closeDay()">Cancel</button>
  <details style="margin-top:14px"${draft&&draft.manage?' open':''}><summary>Manage activities</summary>
  <ul class="actlist">${S.actTypes.filter(a=>!a.hide).map(a=>`<li><span>${a.e} ${esc(a.n)}</span><button class="mini" onclick="removeAct('${a.id}','${ds}')">Remove</button></li>`).join('')}</ul>
  <label>New activity</label><input id="newActName" placeholder="e.g. Swimming">
  <label>Icon</label><select id="newActEmoji">${EMOJIS.map(x=>`<option>${x}</option>`).join('')}</select>
  <button class="sec" style="width:100%;margin-top:8px" onclick="addAct('${ds}')">Add activity</button></details>`;
 const d=document.createElement('div');d.className='modal';d.id='dayModal';d.innerHTML=`<div class="sheet">${h}</div>`;
 d.onclick=ev=>{if(ev.target===d)closeDay()};document.body.appendChild(d)}
function closeDay(){const d=$('dayModal');if(d)d.remove()}
function actToggle(id){const c=$('act-'+id),i=$('min-'+id);i.disabled=!c.checked;if(c.checked)i.focus();else i.value='';
 if(id==='weights'&&$('splitPick'))$('splitPick').style.display=c.checked?'block':'none'}
function readDay(){const acts={};S.actTypes.forEach(a=>{const c=$('act-'+a.id);if(c&&c.checked)acts[a.id]=+$('min-'+a.id).value||0});
 const r=document.querySelector('#dayModal input[name=wk]:checked');return{acts,w:r?r.value:''}}
function saveDay(ds){const e=readDay();if(!Object.keys(e.acts).length)return alert('Tick at least one activity, or tap Delete this day.');
 if(!('weights' in e.acts))delete e.w;S.workouts[ds]=e;save();closeDay();renderTrain()}
function deleteDay(ds){if(!confirm('Remove everything logged on this day?'))return;delete S.workouts[ds];save();closeDay();renderTrain()}
function addAct(ds){const n=$('newActName').value.trim();if(!n)return alert('Type a name for the new activity.');
 const draft=readDay();S.actTypes.push({id:'c'+Date.now().toString(36),n,e:$('newActEmoji').value});save();draft.manage=1;openDay(ds,draft)}
function removeAct(id,ds){if(S.actTypes.filter(a=>!a.hide).length<2)return alert('Keep at least one activity.');
 if(!confirm(`Remove ${actById(id).n} from the list? Days you already logged will keep it.`))return;
 const draft=readDay();delete draft.acts[id];actById(id).hide=1;save();draft.manage=1;openDay(ds,draft)}

/* ---------- Start ---------- */
renderMyMeals();
if(S.profile){FIELDS.forEach(f=>{if(S.profile[f])$(f).value=S.profile[f]});CHECKS.forEach(c=>$(c).checked=!!S.profile[c]);
 (S.profile.allergy||[]).forEach(a=>{const e=$('al-'+a);if(e)e.checked=true});
 (S.profile.prefs||[]).forEach(a=>{const e=$('pf-'+a);if(e)e.checked=true});tab('plan')}
else tab('profile');

/* ---------- Meal builder (replaces the menu) ---------- */
const BUILD={
 protein:{label:'Protein',items:[
  {n:'Chicken breast, cooked',v:31,t:'meat',f:'chicken'},
  {n:'Turkey breast, cooked',v:29,t:'meat',f:'turkey'},
  {n:'Lean beef, 5% fat, cooked',v:26,t:'meat',f:'beef'},
  {n:'Salmon, cooked',v:22,t:'pareve',f:'fish,salmon'},
  {n:'Tuna in water, drained',v:25,t:'pareve',f:'fish,tuna'},
  {n:'White fish (cod, tilapia, denis)',v:20,t:'pareve',f:'fish,cod'},
  {n:'Eggs',u:'egg',v:6.3,t:'pareve',f:'eggs'},
  {n:'Greek yoghurt, 0%',v:10,t:'dairy',f:'yoghurt,milk'},
  {n:'Cottage cheese, 5%',v:11,t:'dairy',f:'cheese,cottage cheese,milk'},
  {n:'Firm tofu',v:14,t:'pareve',f:'tofu,soy'},
  {n:'Whey protein',u:'scoop',v:24,t:'dairy',f:'whey,milk'}]},
 carbs:{label:'Carbs',items:[
  {n:'Rice, cooked',v:28,f:'rice'},
  {n:'Wholewheat pasta, cooked',v:30,f:'wheat,pasta,gluten'},
  {n:'Potatoes',v:17,f:'potato'},
  {n:'Sweet potato',v:20,f:'sweet potato'},
  {n:'Quinoa, cooked',v:21,f:'quinoa'},
  {n:'Couscous, cooked',v:23,f:'wheat,couscous,gluten'},
  {n:'Oats, dry',v:60,f:'oats'},
  {n:'Wholegrain bread',u:'slice',v:15,f:'wheat,bread,gluten'},
  {n:'Small pitta',u:'pitta',v:30,f:'wheat,bread,gluten'},
  {n:'Banana',u:'banana',v:25,f:'banana'},
  {n:'Berries',v:12,f:'berries'}]},
 fat:{label:'Fats (added)',items:[
  {n:'Olive oil',u:'tsp',v:4.5,f:'olive oil'},
  {n:'Avocado',v:15,f:'avocado'},
  {n:'Almonds',v:50,f:'nuts,almonds'},
  {n:'Walnuts',v:65,f:'nuts,walnuts'},
  {n:'Raw tahini',u:'tbsp',v:8,f:'sesame,tahini'},
  {n:'Olives',v:11,f:'olives'}]}};
const VEG=['Cucumber','Tomato','Peppers','Lettuce and leafy greens','Broccoli','Courgette','Carrots','Cauliflower','Mushrooms','Aubergine','Green beans','Onion'];
const PLURAL={egg:'eggs',scoop:'scoops',slice:'slices',pitta:'pittas',banana:'bananas',tsp:'tsp',tbsp:'tbsp'};
function dayMacros(kcal){const p=targets().protein,f=Math.round(kcal*0.27/9);
 return{p,f,c:Math.max(0,Math.round((kcal-p*4-f*9)/4))}}
function amt(it,g){
 if(it.n==='Eggs'){const e=g/it.v;if(e<=4)return Math.max(1,Math.round(e))+' eggs';
  return '2 eggs + '+Math.round((g-2*it.v)/3.6)+' egg whites'}
 if(it.u){const n=Math.max(it.u==='tsp'?1:0.5,Math.round(g/it.v*2)/2);return n+' '+(n>1?PLURAL[it.u]:it.u)}
 return Math.max(10,Math.round(g/it.v*10)*10)+' g'}
function okItem(it){const p=S.profile,av=(p.avoid||'').split(',').map(s=>s.trim()).filter(Boolean);
 const al=(p.allergy||[]).flatMap(a=>ALLERGENS[a]?ALLERGENS[a][1]:[]);
 if((it.f||'').split(',').some(x=>al.includes(x.trim())))return false;
 return !avoidHit({n:it.n,f:it.f||''},av)}
function builderHTML(){const p=S.profile,tgt=targetFor(today()),M=dayMacros(tgt),kos=p.kosher,pc=x=>Math.round(x/tgt*100);
 let h=` Build your meals Today: ${tgt} kcal &middot; protein ${M.p} g (${pc(M.p*4)}%) &middot; carbs ${M.c} g (${pc(M.c*4)}%) &middot; fat ${M.f} g (${pc(M.f*9)}%). For each meal, pick one option from each group. Amounts are approximate.`;
 SLOTS.forEach(([k,name,frac])=>{const mp=Math.round(M.p*frac),mc=Math.round(M.c*frac),mf=Math.round(M.f*frac);
  h+=` ${name} &middot; about ${Math.round(tgt*frac/10)*10} kcal &middot; P ${mp} g &middot; C ${mc} g &middot; F ${mf} g `;
  const groups=[['protein',mp],['carbs',mc]];if(k!=='x')groups.push(['fat',Math.round(mf*0.5)]);
  groups.forEach(([g,need])=>{const G=BUILD[g],list=G.items.filter(okItem);if(!list.length||need<=0)return;
   h+=` ${G.label} pick one &middot; about ${need} g ${g==='fat'?'fat':g} `+
    list.map(it=>` ${amt(it,need)} ${esc(it.n.toLowerCase())}${kos&&it.t?` ${it.t}`:''} `).join('')+''});
  if(k!=='x'){const v=VEG.filter(x=>okItem({n:x,f:x.toLowerCase()}));
   h+=` Vegetables half your plate, as much as you like ${v.map(esc).join(', ')} `}
  h+=''});
 if(kos)h+=' Keep each meal either meat or dairy. Pareve options go with both.';
 return h}
const _dietB=renderDiet;
renderDiet=function(){_dietB();if(!S.profile)return;
 const h3=[...document.querySelectorAll('#plan h3')].find(x=>x.textContent==="Today's menu");
 if(h3)h3.parentNode.innerHTML=builderHTML()};
if(!$('plan').classList.contains('hide'))renderDiet();

/* ---------- Meal builder v2: targets, meals a day, tap to pick ---------- */
(function(){const st=document.createElement('style');st.textContent=
'.mtiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}'+
'.mtile{border-radius:12px;padding:10px 4px;text-align:center;background:rgba(255,255,255,.06)}'+
'.mtile b{display:block;font-size:22px}.mtile small{opacity:.75;font-size:12px}'+
'.mp b{color:#f87171}.mc b{color:#fbbf24}.mf b{color:#60a5fa}'+
'.mcard{background:rgba(255,255,255,.04);border-radius:12px;padding:12px;margin-top:12px}'+
'.mealhd{display:flex;justify-content:space-between;align-items:baseline}.mealhd h4{margin:0}'+
'.mm{display:flex;gap:6px;margin:6px 0 4px}.mm span{font-size:12px;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.08)}'+
'.grp{margin-top:10px;font-size:13px;opacity:.8}'+
'.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}'+
'.chip{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);font-size:13px;cursor:pointer;border:1px solid transparent}'+
'.chip.on{border-color:#22c55e;background:rgba(34,197,94,.22)}'+
'.chip i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px}'+
'.chip i.meat{background:#ef4444}.chip i.dairy{background:#3b82f6}.chip i.pareve{background:#22c55e}';
document.head.appendChild(st)})();
const MEALPLANS={3:[['Breakfast',.3],['Lunch',.4],['Supper',.3]],
 4:[['Breakfast',.25],['Lunch',.35],['Snack',.1],['Supper',.3]],
 5:[['Breakfast',.25],['Snack',.1],['Lunch',.3],['Snack',.1],['Supper',.25]],
 6:[['Breakfast',.2],['Snack',.1],['Lunch',.25],['Snack',.1],['Supper',.25],['Evening snack',.1]]};
S.picks=S.picks||{};
function setMeals(n){S.profile.mealsN=+n;save();renderDiet()}
function pick(key,i){const d=today(),P=S.picks[d]=S.picks[d]||{};
 if(P[key]===i)delete P[key];else P[key]=i;
 Object.keys(S.picks).forEach(k=>{if(k!==d)delete S.picks[k]});save();renderDiet()}
builderHTML=function(){const p=S.profile,tgt=targetFor(today()),M=dayMacros(tgt),n=p.mealsN||4,plan=MEALPLANS[n],
 P=S.picks[today()]||{},pc=x=>Math.round(x/tgt*100);
 let h=`<h3>Your nutrition today</h3><small>${tgt} kcal</small>
 <div class="mtiles"><div class="mtile mp"><b>${M.p} g</b><small>Protein &middot; ${pc(M.p*4)}%</small></div>
 <div class="mtile mc"><b>${M.c} g</b><small>Carbs &middot; ${pc(M.c*4)}%</small></div>
 <div class="mtile mf"><b>${M.f} g</b><small>Fat &middot; ${pc(M.f*9)}%</small></div></div>
 <label>Meals a day</label><select onchange="setMeals(this.value)">${[3,4,5,6].map(x=>`<option${x===n?' selected':''}>${x}</option>`).join('')}</select>
 <p><small>Tap one option in each group to build each meal.${p.kosher?' Dots: red meat, blue dairy, green parve. Keep each meal meat or dairy.':''}</small></p>`;
 plan.forEach(([name,frac],mi)=>{const snack=frac<=.1,mp=Math.round(M.p*frac),mc=Math.round(M.c*frac),mf=Math.round(M.f*frac);
  h+=`<div class="mcard"><div class="mealhd"><h4>${name}</h4><small>${Math.round(tgt*frac/10)*10} kcal</small></div>
   <div class="mm"><span>Protein ${mp} g</span><span>Carbs ${mc} g</span><span>Fat ${mf} g</span></div>`;
  const groups=[['protein',mp],['carbs',mc]];if(!snack)groups.push(['fat',Math.round(mf*.5)]);
  groups.forEach(([g,need])=>{const list=BUILD[g].items.filter(okItem);if(!list.length||need<=0)return;const key=mi+g;
   h+=`<div class="grp">${BUILD[g].label}: pick one</div><div class="chips">`+
    list.map((it,i)=>`<span class="chip${P[key]===i?' on':''}" onclick="pick('${key}',${i})">${amt(it,need)} ${esc(it.n.toLowerCase())}${p.kosher&&it.t?`<i class="${it.t}"></i>`:''}</span>`).join('')+'</div>'});
  if(!snack)h+='<div class="grp">Vegetables: fill half the plate, as much as you like</div>';
  h+='</div>'});
 return h};
if(!$('plan').classList.contains('hide'))renderDiet();
