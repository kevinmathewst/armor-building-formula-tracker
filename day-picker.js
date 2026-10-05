(()=>{
'use strict';

const DATA_KEY='abf_data_v3';
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
  try{
    const d=JSON.parse(localStorage.getItem(DATA_KEY));
    return d&&Array.isArray(d.logs)?d:{startDate:localDate(),logs:[]};
  }catch{return{startDate:localDate(),logs:[]}}
}
function write(d){
  localStorage.setItem(DATA_KEY,JSON.stringify(d));
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
function total(type,rounds,extra){return(type==='ABC'?rounds*6:rounds*20)+extra}

function migrate(x,type){
  const setup=x.setup||x.variant||'Double';
  let guide=x.guide||'';
  if(!guide){
    if(type==='ABC')guide=setup==='Double'?'ABC Bilateral':'ABC Single/Offset';
    else guide=setup==='Single'?'Alternating KB Press':setup==='Offset'?'See-Saw KB Press':'Double KB Press';
  }
  return{...x,setup,guide};
}
function currentPlan(d){
  const start=new Date((d.startDate||localDate())+'T00:00:00');
  const today=new Date();today.setHours(0,0,0,0);
  const n=Math.max(0,Math.floor((today-start)/86400000));
  const week=Math.min(8,Math.floor(n/7)+1);
  const day=n%7+1;
  return{week,day};
}
function getEntry(d,w,day,type){
  const row=d.logs.find(x=>x.key===`${w}-${day}`);
  return row?.[type.toLowerCase()]?{...migrate(row[type.toLowerCase()],type),date:row.date}:{};
}
function guideOptions(type,setup){
  if(type==='ABC')return setup==='Double'
    ?[['ABC Bilateral','Two-Bell Bilateral']]
    :[['ABC Single/Offset','Single / Offset-Load Alternating']];
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
    .guideBox{margin:10px 0;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden;background:#f7f8fa}
    .guideText{padding:11px 12px;color:#20242b;font-size:13px;line-height:1.4}
    .muted{color:#64748b}
    @media(max-width:300px){
      .dayPicker{border-radius:11px;padding:7px;margin:4px 0}.dayPickerTitle{font-size:6px}
      .dayPicker select,.dayPicker input,.movement select,.movement input{padding:5px;font-size:8px}
      .selectedPlan{font-size:8px;padding:5px}.dayPickerGrid,.dateTimeGrid,.bellRow,.logGrid{gap:4px}
      .pickerActions{gap:4px;margin-top:5px}.pickerActions button{font-size:8px;padding:6px}
      .guideText{font-size:8px;padding:6px}
    }
  `;
  document.head.appendChild(s);
}

function guideHTML(type,guide){
  const g=type==='ABC'?(guide==='ABC Bilateral'?abcGuides.bilateral:abcGuides.alternating):pressGuides[guide];
  return`<div class="guideBox"><div class="guideText"><b>${esc(g.title)}</b><br>${esc(g.text)}</div></div>`;
}

function setupControls(setup,left,right){
  if(setup==='Single')return`<div class="field"><label>BELL</label><select data-field="singleBell">${[20,30,40].map(w=>`<option value="${w}" ${left==w?'selected':''}>${w} lb</option>`).join('')}</select></div>`;
  if(setup==='Offset')return`<div class="bellRow"><div class="field"><label>LEFT BELL</label><select data-field="left">${[20,30,40].map(w=>`<option value="${w}" ${left==w?'selected':''}>${w} lb</option>`).join('')}</select></div><div class="field"><label>RIGHT BELL</label><select data-field="right">${[20,30,40].map(w=>`<option value="${w}" ${right==w?'selected':''}>${w} lb</option>`).join('')}</select></div></div>`;
  return`<div class="field"><label>BELLS</label><select data-field="doubleBell">${[20,30,40].map(w=>`<option value="${w}" ${left==w&&right==w?'selected':''}>${w} lb each</option>`).join('')}</select></div>`;
}

function updateTotal(host){
  const m=host.querySelector('.movement');
  host.querySelector('[data-total]').textContent=total(
    m.dataset.type,
    Number(host.querySelector('[data-field="rounds"]').value)||0,
    Number(host.querySelector('[data-field="extra"]').value)||0
  );
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
    <section class="section"><h2>History</h2>${logs.length?logs.map(x=>`
      <div class="historyItem">
        <div class="dateBox">${esc(String(x.date).slice(5))}</div>
        <div><b>${x.type}</b><small>${x.rounds||0} rounds · ${x.total||0} reps · ${Math.max(x.left||0,x.right||0)} lb${x.rpe?' · RPE '+x.rpe:''}<br>${esc(x.guide||'')} · ${esc(x.setup||'')}</small></div>
        <button type="button" class="btn danger" data-delete="${esc(x.key+'|'+x.type.toLowerCase())}">×</button>
      </div>`).join(''):'<div class="empty">No workouts logged yet.</div>'}</section>
`;
}
function renderProgram(){
  const host=document.getElementById('programView'),p=currentPlan(read());
  host.innerHTML=`
    <section class="section"><h2>Program</h2>
      <div class="statGrid">
        <div class="stat"><span>PRESS</span><b>2-3-5-10</b><small>20 reps per ladder · goal 100</small></div>
        <div class="stat"><span>ABC</span><b>2 · 1 · 3</b><small>6 reps per round · goal 30</small></div>
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
function move(delta){
  const p=selected||currentPlan(read());let day=p.day+delta,week=p.week;
  if(day<1){if(week>1){week--;day=3}else return}
  else if(day>3){if(week<8){week++;day=1}else return}
  const target={week,day};renderSelected(target);
}
let selected=null;
function renderSelected(target){
  const d=read();selected=target;
  const type=schedule[target.week][target.day-1][0],x=getEntry(d,target.week,target.day,type);
  renderWorkout(target,type,x);
}
function renderWorkout(target,type,x){
  const d=read(),note=schedule[target.week][target.day-1][1],setup=x.setup||'Offset',guide=selectedGuide(type,setup,x.guide);
  const rounds=x.rounds??0,extra=x.extra??0,timerStart=timerStartParts(),date=x.date||timerStart?.date||localDate(),startTime=x.startTime||timerStart?.time||localTime(),duration=x.duration||x.time||'',goal=target.week>=7?(type==='ABC'?'Goal: 30 rounds':'Goal: 100 reps'):(type==='ABC'?'6 reps per round':'20 reps per ladder');
  const host=document.getElementById('todayView');
  host.innerHTML=`
    <div class="logPrimary topLogPrimary">
      <div class="bigMetric"><label>ROUNDS</label><div class="metricInput"><button type="button" data-step="rounds" data-delta="-1">−</button><input data-field="rounds" type="number" inputmode="numeric" min="0" max="35" step="1" value="\${rounds}"><button type="button" data-step="rounds" data-delta="1">+</button></div><div class="metricHint">0–35 · tap number to type</div></div>
    </div>
    <div class="dayPicker"><div class="dayPickerTitle">SELECT WORKOUT</div>
      <div class="dayPickerGrid">
        <select id="pickWeek" aria-label="Program week">${Array.from({length:8},(_,i)=>`<option value="${i+1}" ${target.week===i+1?'selected':''}>Week ${i+1}${i>=6?' — GOAL':''}</option>`).join('')}</select>
        <select id="pickDay" aria-label="Program day">${[1,2,3].map(i=>`<option value="${i}" ${target.day===i?'selected':''}>Day ${i} · ${schedule[target.week][i-1][0]}</option>`).join('')}</select>
      </div>
      <div class="selectedPlan"><b>${type}</b> · ${esc(note)}</div>
      <div class="dateTimeGrid">
        <div><label class="field"><span style="display:block">EXERCISE DATE</span><input id="exerciseDate" type="date" value="${esc(date)}"></label></div>
        <div><label class="field"><span style="display:block">EXERCISE TIME</span><input id="exerciseTime" type="time" value="${esc(startTime)}"></label></div>
      </div>
      <div class="pickerActions"><button type="button" id="prevDay">‹ PREVIOUS</button><button type="button" id="nextDay">NEXT ›</button></div>
    </div>
    <div class="todayHead"><span class="week">WEEK ${target.week} · DAY ${target.day}</span><span class="pill ${target.week>=7?'goal':''}">${target.week>=7?'GOAL WEEK':'TODAY'}</span></div>
    <section class="section"><h2>${type}</h2><div class="note">${esc(note)} · ${goal}</div>
      <div class="movement" data-type="${type}">
        <div class="field"><label>KETTLEBELL SETUP</label><select data-field="setup">
          <option value="Offset" ${setup==='Offset'?'selected':''}>Offset — two different weights</option>
          <option value="Double" ${setup==='Double'?'selected':''}>Double — two matched bells</option>
          <option value="Single" ${setup==='Single'?'selected':''}>Single — one bell</option>
        </select></div>
        <div class="field" style="margin-top:9px"><label>VISUAL GUIDE</label><select data-field="guide">${guideOptions(type,setup).map(o=>`<option value="${esc(o[0])}" ${guide===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>
        <div id="guideWrap">${guideHTML(type,guide)}</div>
        <div id="setupWrap">${setupControls(setup,x.left??20,x.right??(setup==='Offset'?30:20))}</div>
      <div class="logGrid" style="margin-top:8px">
          <div class="field"><label>EXTRA REPS</label><input data-field="extra" type="number" inputmode="numeric" min="0" max="100" step="1" value="${extra}"></div>
          <div class="field"><label>RPE</label><select data-field="rpe"><option value="">—</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${Number(x.rpe)===i+1?'selected':''}>${i+1}</option>`).join('')}</select></div>
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
  host.querySelector('#pickWeek').addEventListener('change',e=>{selected={week:Number(e.target.value),day:1};renderSelected(selected)});
  host.querySelector('#pickDay').addEventListener('change',e=>{selected={week:target.week,day:Number(e.target.value)};renderSelected(selected)});
  host.querySelector('#prevDay').addEventListener('click',()=>move(-1));
  host.querySelector('#nextDay').addEventListener('click',()=>move(1));
  host.querySelector('[data-field="setup"]').addEventListener('change',e=>{
    const setup=e.target.value,d=read(),x=getEntry(d,target.week,target.day,type);
    const guide=guideOptions(type,setup)[0][0];
    host.querySelector('[data-field="guide"]').innerHTML=guideOptions(type,setup).map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('');
    host.querySelector('[data-field="guide"]').value=guide;
    host.querySelector('#guideWrap').innerHTML=guideHTML(type,guide);
    host.querySelector('#setupWrap').innerHTML=setupControls(setup,x.left??20,x.right??(setup==='Offset'?30:20));
  });
  host.querySelector('[data-field="guide"]').addEventListener('change',e=>host.querySelector('#guideWrap').innerHTML=guideHTML(type,e.target.value));
  host.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{
    const f=host.querySelector('[data-field="'+b.dataset.step+'"]'),max=b.dataset.step==='rounds'?35:100;
    f.value=Math.max(0,Math.min(max,Number(f.value||0)+Number(b.dataset.delta)));updateTotal(host);
  }));
  host.querySelectorAll('[data-field="rounds"],[data-field="extra"]').forEach(f=>f.addEventListener('input',()=>updateTotal(host)));
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
  const payload=[type,dateTime,minutes.toFixed(2),row.rounds||0,row.left||0,row.right||0,row.rpe||''].join('|');

  // Pass the payload directly through the Shortcuts URL. This avoids the
  // clipboard handoff, which is unreliable from an iOS Home Screen PWA.
  const url='shortcuts://run-shortcut?name='+encodeURIComponent('ABF — Log Workout')+
    '&input=text&text='+encodeURIComponent(payload);
  window.location.href=url;
}

function saveWorkout(target,type){
  const d=read(),m=document.querySelector('#todayView .movement'),setup=m.querySelector('[data-field="setup"]').value,guide=m.querySelector('[data-field="guide"]').value;
  let left=20,right=20;
  if(setup==='Single'){left=Number(m.querySelector('[data-field="singleBell"]').value);right=0}
  else if(setup==='Offset'){left=Number(m.querySelector('[data-field="left"]').value);right=Number(m.querySelector('[data-field="right"]').value)}
  else {left=Number(m.querySelector('[data-field="doubleBell"]').value);right=left}
  if(setup==='Offset'&&left===right){toast('Offset setup needs two different weights');return}
  const rounds=Math.max(0,Math.min(35,Number(m.querySelector('[data-field="rounds"]').value)||0)),extra=Math.max(0,Math.min(100,Number(m.querySelector('[data-field="extra"]').value)||0));
  let row=d.logs.find(x=>x.key===`${target.week}-${target.day}`);
  if(!row){row={key:`${target.week}-${target.day}`,date:localDate()};d.logs.push(row)}
  const timerSeconds=Number(window.ABFTracker?.getWorkoutSeconds?.()||0);
  const timerStart=timerStartParts();
  const manualDuration=m.querySelector('[data-field="duration"]').value||'';
  const duration=timerSeconds>0?formatDuration(timerSeconds):manualDuration;
  const startDate=document.getElementById('exerciseDate').value||timerStart?.date||row.date||localDate();
  const startTime=document.getElementById('exerciseTime').value||timerStart?.time||row.startTime||localTime();
  row.date=startDate;
  row[type.toLowerCase()]={type,setup,guide,left,right,rounds,extra,total:total(type,rounds,extra),rpe:m.querySelector('[data-field="rpe"]').value?Number(m.querySelector('[data-field="rpe"]').value):null,startTime,duration,notes:m.querySelector('[data-field="notes"]').value,saved:true};
  write(d);renderProgress();renderWorkout(target,type,row[type.toLowerCase()]);toast('Saved '+type);logToAppleHealth(type,{...row[type.toLowerCase()],date:startDate});
}
function renderAll(){const d=read(),p=currentPlan(d);selected=p;renderWorkout(p,schedule[p.week][p.day-1][0],getEntry(d,p.week,p.day,schedule[p.week][p.day-1][0]));renderProgress();renderProgram()}
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