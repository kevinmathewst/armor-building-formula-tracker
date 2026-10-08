(()=>{
'use strict';

const DATA_KEY='abf_data_v3';
const SCHEMA_VERSION=2;
let storageCorrupt=false; let storageError=false;
const schedule={
  1:[['Press','Calibrate load and technique'],['ABC','Calibrate load and technique'],['Press','Calibrate load and technique']],
  2:[['ABC','Calibrate load and technique'],['Press','Calibrate load and technique'],['ABC','Calibrate load and technique']],
  3:[['Press','Build from prior work'],['ABC','15–20 rounds'],['Press','Hardest session of the week']],
  4:[['ABC','Medium/light; progress only if sustainable'],['Press','Hardest session of the week'],['ABC','Medium/light']],
  5:[['Press','Build from prior work'],['ABC','20–25 rounds'],['Press','Hardest session; reduce afterward']],
  6:[['ABC','Medium/light; progress only if sustainable'],['Press','Hardest session of the week'],['ABC','Medium/light']],
  7:[['Press','3 × 2-3-5-10 or, if heavier, 5 × 2-3-5'],['ABC','GOAL: 30 rounds'],['Press','2 × 2-3-5-10 or 3–4 × 2-3-5']],
  8:[['ABC','About 15 rounds'],['Press','GOAL: 100 reps — 5 × 2-3-5-10 or 10 × 2-3-5'],['ABC','About 20 rounds']]
};

const pressGuides={
  'Double KB Press':{
    title:'Double KB Press',
    text:'Rack both bells. Press both overhead together. Lower to the rack and repeat.'
  },
  'Alternating KB Press':{
    title:'Alternating KB Press',
    text:'Rack both bells. Press one overhead, lower it, then press the other. Alternate sides.'
  },
  'See-Saw KB Press':{
    title:'See-Saw KB Press',
    text:'Rack both bells. As one bell goes up, the other comes down. Alternate continuously.'
  },
  'Touch-Down KB Press':{
    title:'Touch-Down KB Press',
    text:'Start with both bells overhead. Lower one to the shoulder, press it back to lockout, then alternate.'
  }
};

const abcGuides={
  bilateral:{
    title:'ABC — Two-Bell Bilateral',
    text:'Clean both bells to the rack. Press both overhead once. Front squat three times. Repeat.'
  },
  alternating:{
    title:'ABC — Single / Offset-Load Alternating',
    text:'Left clean & press → switch → right clean & press → right front squat ×2 → bells down/shake → reverse: right clean & press → switch → left clean & press → left front squat ×2.'
  }
};

function read(){
  try{const raw=localStorage.getItem(DATA_KEY);if(!raw)return{schemaVersion:SCHEMA_VERSION,startDate:localDate(),logs:[]};
    const d=JSON.parse(raw);if(!d||!Array.isArray(d.logs))throw 0;d.schemaVersion=SCHEMA_VERSION;return d;
  }catch{storageCorrupt=true;return{schemaVersion:SCHEMA_VERSION,startDate:localDate(),logs:[]}}
}
function write(d){try{d.schemaVersion=SCHEMA_VERSION;localStorage.setItem(DATA_KEY,JSON.stringify(d));return true}catch{storageError=true;toast('Could not save workout data');return false}}
function exportBackup(){
  const raw=localStorage.getItem(DATA_KEY);if(!raw){toast('No workout data to export');return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.download='abf-tracker-backup-'+localDate()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup exported');
}
function importBackup(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!d||!Array.isArray(d.logs))throw 0;if(!confirm('Replace the current ABF workout history with this backup?'))return;d.schemaVersion=SCHEMA_VERSION;if(write(d)){storageCorrupt=false;renderAll();toast('Backup imported')}}catch{toast('Invalid ABF backup file')}};reader.readAsText(file);
}
function toast(s){
  const e=document.getElementById('toast');if(!e)return;
  e.textContent=s;e.classList.add('show');clearTimeout(window.__abfToast);
  window.__abfToast=setTimeout(()=>e.classList.remove('show'),1800);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pad(n){return String(n).padStart(2,'0')}
function localDate(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function localTime(){const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`}
function timerStartParts(){const raw=Number(window.ABFTracker?.getWorkoutStartTimestamp?.()||0);if(!raw)return null;const d=new Date(raw);return{date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`}}
function formatDuration(seconds){seconds=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(seconds/60)}:${pad(seconds%60)}`}
function total(type,rounds,extra,setup,guide){return rounds*(type==='Press'?20:(setup==='Double'||guide==='ABC Bilateral'?6:8))+extra}
function goalFor(week,type,day){if(week===7&&day===2&&type==='ABC')return{label:'GOAL: 30 rounds',target:30,kind:'rounds'};if(week===8&&day===2&&type==='Press')return{label:'GOAL: 100 reps',target:100,kind:'reps'};return null}
function repBasis(type,setup,guide){return type==='Press'?20:(setup==='Double'||guide==='ABC Bilateral'?6:8)}

function migrate(x,type){
  const setup=x.setup||x.variant||'Double';
  let guide=x.guide||'';
  if(!guide){
    if(type==='ABC')guide=setup==='Double'?'ABC Bilateral':'ABC Single/Offset';
    else guide=setup==='Single'?'Alternating KB Press':setup==='Offset'?'See-Saw KB Press':'Double KB Press';
  }
  return{...x,setup,guide,total:type==='ABC'?total('ABC',Number(x.rounds)||0,Number(x.extra)||0,setup,guide):total('Press',Number(x.rounds)||0,Number(x.extra)||0,setup,guide)};
}
function currentPlan(d){
  for(let week=1;week<=8;week++)for(let day=1;day<=3;day++){
    const type=schedule[week][day-1][0],row=d.logs.find(x=>x.key===`${week}-${day}`);
    if(!row||!row[type.toLowerCase()]||!row[type.toLowerCase()].saved)return{week,day};
  }
  return{week:8,day:3,complete:true};
}
function getEntry(d,w,day,type){
  const row=d.logs.find(x=>x.key===`${w}-${day}`);
  return row?.[type.toLowerCase()]?{...migrate(row[type.toLowerCase()],type),date:row.date}:{};
}
function guideOptions(type,setup){
  if(type==='ABC')return setup==='Double'?[['ABC Bilateral','Two-Bell Bilateral']]:[['ABC Single/Offset','Single / Offset-Load Alternating']];
  if(setup==='Single')return[['Alternating KB Press','Alternating KB Press']];
  return Object.keys(pressGuides).map(k=>[k,pressGuides[k].title]);
}
function selectedGuide(type,setup,requested){
  const opts=guideOptions(type,setup).map(x=>x[0]);
  if(opts.includes(requested))return requested;
  if(type==='ABC')return setup==='Double'?'ABC Bilateral':'ABC Single/Offset';
  if(setup==='Offset')return 'See-Saw KB Press';
  if(setup==='Single')return 'Alternating KB Press';
  return 'Double KB Press';
}

function injectStyle(){
  if(document.getElementById('dayPickerStyle'))return;
  const s=document.createElement('style');
  s.id='dayPickerStyle';
  s.textContent=`
    .dayPicker{background:#fff;border:1px solid #e1e4e9;border-radius:20px;padding:14px 16px;margin:10px 0;box-shadow:0 4px 18px #20242b09}
    .dayPickerTitle{font-size:10px;font-weight:900;letter-spacing:.14em;color:#64748b;margin-bottom:8px}
    .dayPickerGrid,.dateTimeGrid,.bellRow,.logGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .dayPicker select,.dayPicker input,.movement select,.movement input{width:100%;border:1px solid #d7dbe2;border-radius:10px;padding:9px;background:#fff;color:#20242b}
    .selectedPlan{margin-top:9px;background:#f4f5f7;border-radius:12px;padding:9px 11px;font-size:12px;color:#64748b}
    .pickerActions{display:flex;gap:8px;margin-top:9px}.pickerActions button{flex:1;border:0;border-radius:10px;padding:10px;font-weight:900;background:#eef2f7;color:#20242b}
    .guideBox{margin:10px 0;border:1px solid #dfe3e8;border-radius:16px;overflow:hidden;background:#f7f8fa}
    .guideHead{display:flex;align-items:center;justify-content:space-between;padding:9px 11px 5px}
    .guideHead b{font-size:11px;letter-spacing:.08em}
    .guideHead span{font-size:10px;color:#64748b;font-weight:800}
    .guideVisual{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:6px}
    .guideStep{min-width:0;background:#fff;border:1px solid #e1e4e9;border-radius:11px;padding:5px 3px 4px;text-align:center}
    .guideStep svg{display:block;width:100%;height:112px}
    .guideStep strong{display:block;font-size:11px;line-height:1.1;margin-top:2px}
    .guideStep small{display:block;font-size:9px;line-height:1.1;color:#64748b;margin-top:2px}
    .guideText{padding:4px 10px 9px;color:#64748b;font-size:10px;line-height:1.3}
    .muted{color:#64748b}
    @media(max-width:300px){
      .dayPicker{border-radius:11px;padding:7px;margin:4px 0}.dayPickerTitle{font-size:6px}
      .dayPicker select,.dayPicker input,.movement select,.movement input{padding:5px;font-size:8px}
      .selectedPlan{font-size:8px;padding:5px}.dayPickerGrid,.dateTimeGrid,.bellRow,.logGrid{gap:4px}
      .pickerActions{gap:4px;margin-top:5px}.pickerActions button{font-size:8px;padding:6px}
      .guideHead{padding:6px 7px 3px}.guideHead b{font-size:8px}.guideHead span{font-size:7px}
      .guideVisual{gap:3px;padding:4px}.guideStep{border-radius:8px;padding:3px 2px}.guideStep svg{height:78px}
      .guideStep strong{font-size:7px}.guideStep small{font-size:6px}.guideText{font-size:7px;padding:3px 6px 6px}
    }
  `;
  document.head.appendChild(s);
}

function figureSVG(pose){
  const kb=(x,y,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-7 2 Q-7 -6 0 -7 Q7 -6 7 2 L6 7 Q0 10 -6 7 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-5 -7 Q-5 -15 0 -15 Q5 -15 5 -7" fill="none" stroke="currentColor" stroke-width="2"/></g>`;
  const head='<circle cx="50" cy="22" r="7" fill="none" stroke="currentColor" stroke-width="3"/>';
  const body='<path d="M50 30 L50 68" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  const legs='<path d="M50 68 L38 101 M50 68 L62 101" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  let arms='',bells='';
  if(pose==='down')arms='<path d="M50 40 L36 58 L30 72 M50 40 L64 58 L70 72" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='singleRack')arms='<path d="M50 40 L35 51 L29 47" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='singleLeftOverhead')arms='<path d="M50 40 L35 28 L29 9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='singleRightOverhead')arms='<path d="M50 40 L65 28 L71 9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='singleRightSquat')arms='<path d="M50 40 L65 50 L71 46" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='rack'||pose==='squat')arms='<path d="M50 40 L34 51 L28 47 M50 40 L66 51 L72 47" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='overhead'||pose==='touchdown')arms='<path d="M50 40 L35 24 L31 9 M50 40 L65 24 L69 9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='leftOverhead')arms='<path d="M50 40 L35 28 L29 9 M50 40 L67 52 L73 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='rightOverhead')arms='<path d="M50 40 L33 52 L27 48 M50 40 L65 28 L71 9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='leftSquat')arms='<path d="M50 40 L35 50 L29 46 M50 40 L64 48 L70 45" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='rightSquat')arms='<path d="M50 40 L36 48 L30 45 M50 40 L65 50 L71 46" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  if(pose==='rack'||pose==='overhead'||pose==='touchdown'||pose==='squat')bells=kb(28,47,.9)+kb(72,47,.9);
  if(pose==='down')bells=kb(28,76,.9)+kb(72,76,.9);
  if(pose==='singleRack')bells=kb(29,48,.9);
  if(pose==='singleLeftOverhead')bells=kb(29,9,.9);
  if(pose==='singleRightOverhead')bells=kb(71,9,.9);
  if(pose==='singleRightSquat')bells=kb(71,46,.9);
  if(pose==='leftOverhead')bells=kb(29,9,.9)+kb(72,48,.9);
  if(pose==='rightOverhead')bells=kb(28,48,.9)+kb(71,9,.9);
  if(pose==='leftSquat')bells=kb(29,46,.9);
  if(pose==='rightSquat')bells=kb(71,46,.9);
  return`<svg viewBox="0 0 100 112" aria-hidden="true" focusable="false"><g style="color:#20242b">${head}${body}${arms}${legs}${bells}</g></svg>`;
}
function guideStep(label,sub,pose){
  return`<div class="guideStep">${figureSVG(pose)}<strong>${esc(label)}</strong><small>${esc(sub)}</small></div>`;
}
function guideHTML(type,guide,setup='Double'){
  let title='',steps=[],cue='';
  if(type==='ABC'&&guide==='ABC Bilateral'){
    title='ABC · 2–1–3';cue='Clean → press → squat ×3 → set down.';
    steps=[guideStep('1 · CLEAN','2 reps','rack'),guideStep('2 · PRESS','1 rep','overhead'),guideStep('3 · SQUAT','3 reps','squat'),guideStep('4 · RESET','bells down','down')];
    }else if(type==='ABC'){
    if(setup==='Single'){
      title='ABC · SINGLE';cue='Left clean + press → right clean + press → right squat ×2 → reverse.';
      steps=[guideStep('1 · LEFT','clean + press','singleLeftOverhead'),guideStep('2 · RIGHT','clean + press','singleRightOverhead'),guideStep('3 · RIGHT','squat ×2','singleRightSquat'),guideStep('4 · REVERSE','right → left','singleLeftOverhead')];
    }else{
      title='ABC · OFFSET';cue='Left → right → right squat ×2 → bells down/shake → reverse.';
      steps=[guideStep('1 · LEFT','clean + press','leftOverhead'),guideStep('2 · RIGHT','clean + press','rightOverhead'),guideStep('3 · RIGHT','squat ×2','rightSquat'),guideStep('4 · RESET','bells down','down')];
    }
  }else if(guide==='Double KB Press'){
    title='DOUBLE PRESS';cue='Both bells move together.';
    steps=[guideStep('1 · RACK','start','rack'),guideStep('2 · PRESS','both up','overhead'),guideStep('3 · LOWER','to rack','rack'),guideStep('4 · REPEAT','same path','overhead')];
    }else if(guide==='Alternating KB Press'){
    title='ALTERNATING PRESS';cue=setup==='Single'?'One bell alternates sides.':'One bell presses while the other rests.';
    steps=setup==='Single'
      ?[guideStep('1 · RACK','start','singleRack'),guideStep('2 · LEFT','up / down','singleLeftOverhead'),guideStep('3 · RIGHT','up / down','singleRightOverhead'),guideStep('4 · REPEAT','alternate','singleLeftOverhead')]
      :[guideStep('1 · RACK','start','rack'),guideStep('2 · LEFT','up / down','leftOverhead'),guideStep('3 · RIGHT','up / down','rightOverhead'),guideStep('4 · REPEAT','alternate','leftOverhead')];
  }else if(guide==='See-Saw KB Press'){
    title='SEE-SAW PRESS';cue='One rises as the other falls.';
    steps=[guideStep('1 · RACK','start','rack'),guideStep('2 · LEFT UP','right down','leftOverhead'),guideStep('3 · RIGHT UP','left down','rightOverhead'),guideStep('4 · FLOW','alternate','leftOverhead')];
  }else{
    title='TOUCH-DOWN PRESS';cue='Both overhead; one bell at a time moves.';
    steps=[guideStep('1 · LOCKOUT','both up','touchdown'),guideStep('2 · LEFT','down / press','rightOverhead'),guideStep('3 · RIGHT','down / press','leftOverhead'),guideStep('4 · REPEAT','alternate','rightOverhead')];
  }
  return`<div class="guideBox"><div class="guideHead"><b>VISUAL GUIDE</b><span>${esc(title)}</span></div><div class="guideVisual">${steps.join('')}</div><div class="guideText">${esc(cue)}</div></div>`;
}

function setupControls(setup,left,right){
  if(setup==='Single')return`<div class="field"><label>BELL</label><select data-field="singleBell">${[20,30,40].map(w=>`<option value="${w}" ${left==w?'selected':''}>${w} lb</option>`).join('')}</select></div>`;
  if(setup==='Offset')return`<div class="bellRow"><div class="field"><label>LEFT BELL</label><select data-field="left">${[20,30,40].map(w=>`<option value="${w}" ${left==w?'selected':''}>${w} lb</option>`).join('')}</select></div><div class="field"><label>RIGHT BELL</label><select data-field="right">${[20,30,40].map(w=>`<option value="${w}" ${right==w?'selected':''}>${w} lb</option>`).join('')}</select></div></div><button type="button" class="btn" id="swapSides" style="width:100%;margin-top:7px">SWAP OFFSET SIDES</button>`;
  return`<div class="field"><label>BELLS</label><select data-field="doubleBell">${[20,30,40].map(w=>`<option value="${w}" ${left==w&&right==w?'selected':''}>${w} lb each</option>`).join('')}</select></div>`;
}

function updateTotal(host){
  const m=host.querySelector('.movement');
  host.querySelector('[data-total]').textContent=total(m.dataset.type,Number(host.querySelector('[data-field="rounds"]').value)||0,Number(host.querySelector('[data-field="extra"]').value)||0,m.querySelector('[data-field="setup"]').value,m.querySelector('[data-field="guide"]').value);
}

function renderProgress(){
  const host=document.getElementById('progressView');if(!host)return;
  const d=read(),logs=d.logs.flatMap(x=>['press','abc'].filter(k=>x[k]).map(k=>({...migrate(x[k],k==='abc'?'ABC':'Press'),date:x.date,key:x.key,type:k.toUpperCase()}))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const sessions=logs.length,bestABC=Math.max(0,...logs.filter(x=>x.type==='ABC').map(x=>x.rounds||0)),bestPress=Math.max(0,...logs.filter(x=>x.type==='PRESS').map(x=>x.total||0)),weights=Math.max(0,...logs.map(x=>Math.max(x.left||0,x.right||0)));
  host.innerHTML=`
    <section class="section"><h2>Progress</h2><div class="statGrid">
      <div class="stat"><span>SESSIONS</span><b>${sessions}</b></div>
      <div class="stat"><span>BEST ABC</span><b>${bestABC} rounds</b></div>
      <div class="stat"><span>BEST PRESS</span><b>${bestPress} reps</b></div>
      <div class="stat"><span>HEAVIEST BELL</span><b>${weights} lb</b></div>
    </div></section>
    <section class="section"><h2>Backup</h2><div class="pickerActions"><button type="button" id="exportBackup">EXPORT JSON</button><button type="button" id="importBackupBtn">IMPORT JSON</button><input id="importBackup" type="file" accept="application/json" hidden></div></section><section class="section"><h2>History</h2>${logs.length?logs.map(x=>`
      <div class="historyItem" data-edit="${x.key}">
        <div class="dateBox">${esc(String(x.date).slice(5))}</div>
        <div><b>${x.type}</b><small>${x.rounds||0} rounds · ${x.total||0} reps · ${Math.max(x.left||0,x.right||0)} lb${x.rpe?' · RPE '+x.rpe:''}<br>${esc(x.guide||'')} · ${esc(x.setup||'')}</small></div>
        <button type="button" class="btn danger" data-delete="${esc(x.key+'|'+x.type.toLowerCase())}">×</button>
      </div>`).join(''):'<div class="empty">No workouts logged yet.</div>'}</section>
`;
  host.querySelector('#exportBackup')?.addEventListener('click',exportBackup);
  host.querySelector('#importBackupBtn')?.addEventListener('click',()=>host.querySelector('#importBackup')?.click());
  host.querySelector('#importBackup')?.addEventListener('change',e=>importBackup(e.target.files?.[0]));
  host.querySelectorAll('[data-edit]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-delete]'))return;const [week,day]=el.dataset.edit.split('-').map(Number);selected={week,day};setTab('today');renderSelected(selected)}));
}
function renderProgram(){
  const host=document.getElementById('programView'),p=currentPlan(read());
  host.innerHTML=`
    <section class="section"><h2>Program</h2>
      <div class="statGrid">
        <div class="stat"><span>PRESS</span><b>2-3-5-10</b><small>20 reps per ladder · goal 100</small></div>
        <div class="stat"><span>ABC</span><b>2 · 1 · 3</b><small>6 bilateral · 8 single/offset · goal 30</small></div>
      </div>
      <div class="note" style="margin-top:10px"><b>Weeks 1–2:</b> one movement per day, alternating Press and ABC.<br><b>Weeks 3–6:</b> build volume; the hardest session alternates between Day Three (Weeks 3 and 5) and Day Two (Weeks 4 and 6).<br><b>Weeks 7–8:</b> goal weeks.</div>
      <div class="note" style="margin-top:8px"><b>Press guides:</b> Double · Alternating · See-Saw · Touch-Down<br><b>ABC guides:</b> Two-Bell Bilateral · Single / Offset-Load Alternating</div>
    </section>
    <section class="section"><h2>Weeks</h2>
      ${Object.entries(schedule).map(([w,days])=>`<details class="programWeek" ${Number(w)===p.week?'open':''}><summary>Week ${w}${w>=7?' — GOAL WEEK':''}</summary><div class="days">${days.map((x,i)=>`<div class="day"><b>Day ${i+1} · ${x[0]}</b><br><span class="muted">${esc(x[1])}</span></div>`).join('')}</div></details>`).join('')}
    </section>

    <section class="section"><h2>About</h2>
      <div class="note"><b>Created by Kevin Tharakan</b><br>Independent training tracker based on Dan John’s <i>The Armor Building Formula</i>.<br>This app is not affiliated with Dan John.</div>
    </section>`;
}

function deleteLog(token){
  const [key,type]=token.split('|'),d=read(),row=d.logs.find(x=>x.key===key);
  if(row)delete row[type];
  d.logs=d.logs.filter(x=>x.press||x.abc);write(d);renderAll();toast('Workout deleted');
}
function move(delta){if(window.ABFTracker?.isWorkoutRunning?.()){toast('Finish the current workout before changing sessions');return}
  const p=selected||currentPlan(read());let day=p.day+delta,week=p.week;
  if(day<1){if(week>1){week--;day=3}else return}
  else if(day>3){if(week<8){week++;day=1}else return}
  const target={week,day};renderSelected(target);
}
let selected=null;
function renderSelected(target){if(window.ABFTracker?.isWorkoutRunning?.()&&window.ABFTracker?.getWorkoutSlot?.()!==`${target.week}-${target.day}`){toast('Finish the current workout before changing sessions');return}const d=read();selected=target;
  const type=schedule[target.week][target.day-1][0],x=getEntry(d,target.week,target.day,type);
  renderWorkout(target,type,x);
}
function renderWorkout(target,type,x){
  window.ABFTracker?.setWorkoutSlot?.(`${target.week}-${target.day}`);
  const d=read(),note=schedule[target.week][target.day-1][1],setup=x.setup||'Offset',guide=selectedGuide(type,setup,x.guide);
  const rounds=x.rounds??0,extra=x.extra??0,timerStart=timerStartParts(),date=x.date||timerStart?.date||localDate(),startTime=x.startTime||timerStart?.time||localTime(),duration=x.duration||x.time||'',goal=goalFor(target.week,type,target.day),basis=repBasis(type,setup,guide);
  const host=document.getElementById('todayView');
  host.innerHTML=`
    <div class="logPrimary topLogPrimary">
      <div class="bigMetric"><label>ROUNDS</label><div class="metricInput"><button type="button" data-step="rounds" data-delta="-1">−</button><input data-field="rounds" type="number" inputmode="numeric" min="0" max="35" step="1" value="\${rounds}"><button type="button" data-step="rounds" data-delta="1">+</button></div><div class="metricHint">0–35 · tap number to type</div></div>
    </div>
    <div id="topGuideWrap">${guideHTML(type,guide,setup)}</div>
    <div class="dayPicker"><div class="dayPickerTitle">SELECT WORKOUT</div>
      <div class="dayPickerGrid">
        <select id="pickWeek" aria-label="Program week">${Array.from({length:8},(_,i)=>`<option value="${i+1}" ${target.week===i+1?'selected':''}>Week ${i+1}${i>=6?' — GOAL':''}</option>`).join('')}</select>
        <select id="pickDay" aria-label="Program day">${[1,2,3].map(i=>`<option value="${i}" ${target.day===i?'selected':''}>Day ${i} · ${schedule[target.week][i-1][0]}</option>`).join('')}</select>
      </div>
      <div class="selectedPlan"><b>${type}</b> · ${esc(note)} · ${goal?esc(goal.label):(type==='ABC'?basis+' reps/round':'20 reps/ladder')}</div>
      <div class="dateTimeGrid">
        <div><label class="field"><span style="display:block">EXERCISE DATE</span><input id="exerciseDate" type="date" value="${esc(date)}"></label></div>
        <div><label class="field"><span style="display:block">EXERCISE TIME</span><input id="exerciseTime" type="time" value="${esc(startTime)}"></label></div>
      </div>
      <div class="pickerActions"><button type="button" id="prevDay">‹ PREVIOUS</button><button type="button" id="nextDay">NEXT ›</button></div>
    </div>
    <div class="todayHead"><span class="week">WEEK ${target.week} · DAY ${target.day}</span><span class="pill ${goal?'goal':''}">${goal?'GOAL SESSION':'PROGRAM'}</span></div>
    <section class="section"><h2>${type}</h2><div class="note">${esc(note)} · ${goal?esc(goal.label):(type==='ABC'?basis+' reps per round':'20 reps per ladder')}</div>
      <div class="movement" data-type="${type}">
        <div class="field"><label>KETTLEBELL SETUP</label><select data-field="setup">
          <option value="Offset" ${setup==='Offset'?'selected':''}>Offset — two different weights</option>
          <option value="Double" ${setup==='Double'?'selected':''}>Double — two matched bells</option>
          <option value="Single" ${setup==='Single'?'selected':''}>Single — one bell</option>
        </select></div>
        <div class="field" style="margin-top:9px"><label>VISUAL GUIDE VARIANT</label><select data-field="guide">${guideOptions(type,setup).map(o=>`<option value="${esc(o[0])}" ${guide===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>
        <div id="setupWrap">${setupControls(setup,x.left??20,x.right??(setup==='Offset'?30:20))}</div>
      <div class="logGrid" style="margin-top:8px">
          <div class="field"><label>EXTRA REPS</label><input data-field="extra" type="number" inputmode="numeric" min="0" max="100" step="1" value="${extra}"></div>
          <div class="field"><label>SESSION RPE</label><select data-field="rpe"><option value="">—</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${Number(x.rpe)===i+1?'selected':''}>${i+1}</option>`).join('')}</select></div>
          <div class="field"><label>DURATION</label><input data-field="duration" value="${esc(duration)}" placeholder="Auto from timer or e.g. 12:40"></div>
          <div class="field"><label>NOTES</label><input data-field="notes" value="${esc(x.notes||'')}" placeholder="Optional"></div>
        </div>
        <div class="summary"><span>Total reps</span><strong data-total>${total(type,rounds,extra)}</strong></div>
        <button type="button" class="btn saveBtn" id="pickerSave">${x.saved?'UPDATE':'LOG '+type}</button>
      </div>
    </section>`;
  bindWorkout(target,type);
}
function bindWorkout(target,type){
  const host=document.getElementById('todayView'),m=host.querySelector('.movement');
  host.dataset.dateTimeTouched='0';
  const dateInput=host.querySelector('#exerciseDate'),timeInput=host.querySelector('#exerciseTime');
  [dateInput,timeInput].forEach(el=>el.addEventListener('input',()=>{host.dataset.dateTimeTouched='1'}));
  if(!window.__abfTimerStartBound){window.__abfTimerStartBound=true;document.addEventListener('abfWorkoutStarted',()=>{const view=document.getElementById('todayView');if(!view)return;const d=view.querySelector('#exerciseDate'),t=view.querySelector('#exerciseTime');const p=timerStartParts();if(d&&t&&p&&view.dataset.dateTimeTouched!=='1'){d.value=p.date;t.value=p.time}})}
  if(window.ABFTracker?.isWorkoutRunning?.()||window.ABFTracker?.getWorkoutSeconds?.()>0){const p=timerStartParts();if(p){dateInput.value=p.date;timeInput.value=p.time}}
  host.querySelector('#pickWeek').addEventListener('change',e=>{if(window.ABFTracker?.isWorkoutRunning?.()){toast('Finish the current workout before changing sessions');e.target.value=target.week;return}selected={week:Number(e.target.value),day:1};renderSelected(selected)});
  host.querySelector('#pickDay').addEventListener('change',e=>{if(window.ABFTracker?.isWorkoutRunning?.()){toast('Finish the current workout before changing sessions');e.target.value=target.day;return}selected={week:target.week,day:Number(e.target.value)};renderSelected(selected)});
  host.querySelector('#prevDay').addEventListener('click',()=>move(-1));
  host.querySelector('#nextDay').addEventListener('click',()=>move(1));
  host.querySelector('[data-field="setup"]').addEventListener('change',e=>{
    const setup=e.target.value,d=read(),x=getEntry(d,target.week,target.day,type);
    const guide=guideOptions(type,setup)[0][0];
    host.querySelector('[data-field="guide"]').innerHTML=guideOptions(type,setup).map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('');
    host.querySelector('[data-field="guide"]').value=guide;
    host.querySelector('#topGuideWrap').innerHTML=guideHTML(type,guide,setup);
    host.querySelector('#setupWrap').innerHTML=setupControls(setup,x.left??20,x.right??(setup==='Offset'?30:20));
    host.querySelector('#swapSides')?.addEventListener('click',()=>{const l=host.querySelector('[data-field="left"]'),rr=host.querySelector('[data-field="right"]');if(l&&rr){const v=l.value;l.value=rr.value;rr.value=v}});
    updateTotal(host);
  });
  host.querySelector('[data-field="guide"]').addEventListener('change',e=>host.querySelector('#topGuideWrap').innerHTML=guideHTML(type,e.target.value,host.querySelector('[data-field="setup"]').value));
  host.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{
    const f=host.querySelector('[data-field="'+b.dataset.step+'"]'),max=b.dataset.step==='rounds'?35:100;
    f.value=Math.max(0,Math.min(max,Number(f.value||0)+Number(b.dataset.delta)));updateTotal(host);
  }));
  host.querySelectorAll('[data-field="rounds"],[data-field="extra"]').forEach(f=>f.addEventListener('input',()=>updateTotal(host)));
  host.querySelector('#swapSides')?.addEventListener('click',()=>{const l=host.querySelector('[data-field="left"]'),rr=host.querySelector('[data-field="right"]');if(l&&rr){const v=l.value;l.value=rr.value;rr.value=v}});
  host.querySelector('#pickerSave').addEventListener('click',()=>saveWorkout(target,type));
}
function logToAppleHealth(type, row){
  let minutes=0;
  const rawDuration=String(row.duration||row.time||'').trim();
  if(/^\d+:\d{1,2}$/.test(rawDuration)){
    const [m,s]=rawDuration.split(':').map(Number);
    minutes=Math.max(0.01,m+(s/60));
  }else if(/^\d+(?:\.\d+)?$/.test(rawDuration)){
    minutes=Math.max(0.01,Number(rawDuration));
  }
  if(minutes<=0){toast('Use the workout timer or enter a duration');return}

  const startTime=row.startTime&&/^\d{2}:\d{2}$/.test(row.startTime)?row.startTime:'00:00';
  const dateTime=(row.date||row._date||new Date().toISOString().slice(0,10))+'T'+startTime;
  const startMs=Date.parse(dateTime);
  const endDateTime=Number.isFinite(startMs)
    ? new Date(startMs + Math.round(minutes*60000)).toISOString()
    : dateTime;
  // Fields 1–7 preserve the existing Shortcut contract. Fields 8–9 add
  // an exact Health-query window so the Shortcut can pull wearable data.
  const payload=[
    type,dateTime,minutes.toFixed(2),row.rounds||0,row.left||0,row.right||0,row.rpe||'',
    endDateTime,'ABF_HEALTH_V2'
  ].join('|');

  // Pass the payload directly through the Shortcuts URL. This avoids the
  // clipboard handoff, which is unreliable from an iOS Home Screen PWA.
  const url='shortcuts://run-shortcut?name='+encodeURIComponent('ABF — Log Workout')+
    '&input=text&text='+encodeURIComponent(payload);
  window.location.href=url;
}

function saveWorkout(target,type){
  const d=read(),m=document.querySelector('#todayView .movement'),setup=m.querySelector('[data-field="setup"]').value,guide=m.querySelector('[data-field="guide"]').value;
  const existing=getEntry(d,target.week,target.day,type),wasUpdate=!!existing.saved;
  if(window.ABFTracker?.isWorkoutRunning?.()&&window.ABFTracker?.getWorkoutSlot?.()!==`${target.week}-${target.day}`){toast('Timer belongs to another workout');return}
  let left=20,right=20;
  if(setup==='Single'){left=Number(m.querySelector('[data-field="singleBell"]').value);right=0}
  else if(setup==='Offset'){left=Number(m.querySelector('[data-field="left"]').value);right=Number(m.querySelector('[data-field="right"]').value)}
  else {left=Number(m.querySelector('[data-field="doubleBell"]').value);right=left}
  if(setup==='Offset'&&left===right){toast('Offset setup needs two different weights');return}
  const rounds=Math.max(0,Math.min(35,Number(m.querySelector('[data-field="rounds"]').value)||0)),extra=Math.max(0,Math.min(100,Number(m.querySelector('[data-field="extra"]').value)||0));
  let row=d.logs.find(x=>x.key===`${target.week}-${target.day}`);
  if(!row){row={key:`${target.week}-${target.day}`,date:localDate()};d.logs.push(row)}
  const timerSnapshot=window.ABFTracker?.peekWorkoutSession?.(`${target.week}-${target.day}`)||null;
  const timerSeconds=Number(timerSnapshot?.seconds||0);
  const timerStart=timerSnapshot?.startedAt?(()=>{const q=new Date(timerSnapshot.startedAt);return{date:`${q.getFullYear()}-${pad(q.getMonth()+1)}-${pad(q.getDate())}`,time:`${pad(q.getHours())}:${pad(q.getMinutes())}`}})():timerStartParts();
  const manualDuration=m.querySelector('[data-field="duration"]').value||'';
  const duration=timerSeconds>0?formatDuration(timerSeconds):manualDuration;
  const startDate=document.getElementById('exerciseDate').value||timerStart?.date||row.date||localDate();
  const startTime=document.getElementById('exerciseTime').value||timerStart?.time||row.startTime||localTime();
  row.date=startDate;
  row[type.toLowerCase()]={type,setup,guide,left,right,rounds,extra,total:total(type,rounds,extra,setup,guide),rpe:m.querySelector('[data-field="rpe"]').value?Number(m.querySelector('[data-field="rpe"]').value):null,startTime,duration,notes:m.querySelector('[data-field="notes"]').value,saved:true};
  if(!write(d))return;
  window.ABFTracker?.consumeWorkoutSession?.(`${target.week}-${target.day}`);
  renderProgress();renderWorkout(target,type,row[type.toLowerCase()]);toast((wasUpdate?'Updated ':'Saved ')+type);if(!wasUpdate)logToAppleHealth(type,{...row[type.toLowerCase()],date:startDate});
}
function renderAll(){const d=read(),p=currentPlan(d);selected=p;const type=schedule[p.week][p.day-1][0];renderWorkout(p,type,getEntry(d,p.week,p.day,type));renderProgress();renderProgram();if(storageCorrupt)toast('Stored data could not be read; import a backup to recover it')}
function setTab(tab){
  ['today','progress','program'].forEach(k=>document.getElementById(k+'View').classList.toggle('hidden',k!==tab));
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){setTab(b.dataset.tab);return}
  if(b.dataset.delete){if(confirm('Delete this logged workout?'))deleteLog(b.dataset.delete)}
});
function init(){injectStyle();renderAll();setTab('today')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();