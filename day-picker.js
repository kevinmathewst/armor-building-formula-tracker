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
const KEY=DATA_KEY;
function read(){try{return JSON.parse(localStorage.getItem(KEY))||{logs:[]}}catch{return{logs:[]}}}
function write(d){localStorage.setItem(KEY,JSON.stringify(d));try{localStorage.setItem('abf_backup_v3',JSON.stringify({schema:3,savedAt:new Date().toISOString(),data:d}))}catch{}}
function esc(s){return String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function pad(n){return String(n).padStart(2,'0')}
function localDate(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function total(type,r,e){return (type==='ABC'?r*6:r*20)+e}
let selected={week:1,day:1};
function findExisting(){const d=read(),key=`${selected.week}-${selected.day}`;return d.logs.find(x=>x.key===key)||null}
function injectStyle(){if(document.getElementById('dayPickerStyle'))return;const s=document.createElement('style');s.id='dayPickerStyle';s.textContent=`
.dayPicker{background:#fff;border:1px solid #e2e5eb;border-radius:20px;padding:14px 16px;margin:10px 0;box-shadow:0 4px 18px #17233b09}.dayPickerTitle{font-size:10px;font-weight:900;letter-spacing:.14em;color:#687386;margin-bottom:8px}.dayPickerGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dayPicker select{width:100%;border:1px solid #d8dce4;border-radius:10px;padding:10px;background:#fff;color:#17233b;font-weight:800}.selectedPlan{margin-top:9px;background:#f2f3f7;border-radius:12px;padding:9px 11px;font-size:12px;color:#596579}.dateTimeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.dayPicker input{width:100%;border:1px solid #d8dce4;border-radius:10px;padding:9px;background:#fff;color:#17233b}.pickerActions{display:flex;gap:8px;margin-top:9px}.pickerActions button{flex:1;border:0;border-radius:10px;padding:10px;font-weight:900;background:#eef0f5;color:#17233b}.pickerActions .todayBtn{background:#1d2d5b;color:#fff}@media(max-width:300px){.dayPicker{border-radius:11px;padding:7px;margin:4px 0}.dayPickerTitle{font-size:6px}.dayPicker select,.dayPicker input{padding:5px;font-size:8px}.selectedPlan{font-size:8px;padding:5px}.dateTimeGrid,.dayPickerGrid{gap:4px}.pickerActions{gap:4px;margin-top:5px}.pickerActions button{font-size:8px;padding:6px}}
`;document.head.appendChild(s)}
function render(){
 injectStyle();
 const host=document.getElementById('todayView');if(!host)return;
 const d=read(),key=`${selected.week}-${selected.day}`,row=d.logs.find(x=>x.key===key)||{},type=schedule[selected.week][selected.day-1][0],note=schedule[selected.week][selected.day-1][1],x=row[type.toLowerCase()]||{};
 const date=x.date||row.date||localDate(),time=x.time||'';
 let html=`<div class="dayPicker"><div class="dayPickerTitle">SELECT WORKOUT</div><div class="dayPickerGrid"><select id="pickWeek" aria-label="Program week">${Array.from({length:8},(_,i)=>`<option value="${i+1}" ${selected.week===i+1?'selected':''}>Week ${i+1}${i>=6?' — GOAL':''}</option>`).join('')}</select><select id="pickDay" aria-label="Program day">${[1,2,3].map(i=>`<option value="${i}" ${selected.day===i?'selected':''}>Day ${i} · ${schedule[selected.week][i-1][0]}</option>`).join('')}</select></div><div class="selectedPlan"><b>${type}</b> · ${esc(note)}</div><div class="dateTimeGrid"><div><label style="display:block;font-size:9px;font-weight:900;letter-spacing:.08em;color:#6b7586;margin-bottom:5px">EXERCISE DATE</label><input id="exerciseDate" type="date" value="${esc(date)}"></div><div><label style="display:block;font-size:9px;font-weight:900;letter-spacing:.08em;color:#6b7586;margin-bottom:5px">EXERCISE TIME</label><input id="exerciseTime" type="time" value="${esc(time)}"></div></div><div class="pickerActions"><button type="button" id="prevDay">‹ PREVIOUS</button><button type="button" id="nextDay">NEXT ›</button></div></div>`;
 const goal=selected.week>=7?(type==='ABC'?'Goal week: 30 rounds.':'Goal week: 100 reps.'):(type==='ABC'?'6 reps per round.':'20 reps per full ladder.');
 const variant=x.variant||'Double',left=x.left||20,right=x.right||20,rounds=x.rounds??0,extra=x.extra??0;
 html+=`<div class="todayHead"><span class="week">WEEK ${selected.week} · DAY ${selected.day}</span><span class="pill ${selected.week>=7?'goal':''}">${selected.week>=7?'GOAL WEEK':'SELECTED'}</span></div><section class="section"><h2>${type}</h2><div class="note">${esc(note)}</div><section class="movement" data-type="${type}"><div class="movementTitle"><h3>${type}</h3><span class="pill">${type==='ABC'?'2 cleans · 1 press · 3 squats':'2-3-5-10 ladder'}</span></div><div class="note">${goal} Log the work you actually complete.</div><div class="field" style="margin-top:9px"><label>EXECUTION</label></div><div class="seg"><button type="button" data-v="Double" class="${variant==='Double'?'on':''}">Double</button><button type="button" data-v="Single" class="${variant==='Single'?'on':''}">Single</button><button type="button" data-v="Offset" class="${variant==='Offset'?'on':''}">Offset</button></div><div class="field"><label>KETTLEBELLS</label></div><div class="bells"><button type="button" data-w="20" class="${left==20?'on':''}">20 lb</button><button type="button" data-w="30" class="${left==30?'on':''}">30 lb</button><button type="button" data-w="40" class="${left==40?'on':''}">40 lb</button></div><div class="bellRow"><div class="field"><label>LEFT BELL</label><select data-field="left"><option ${left==20?'selected':''}>20</option><option ${left==30?'selected':''}>30</option><option ${left==40?'selected':''}>40</option></select></div><div class="field"><label>RIGHT BELL</label><select data-field="right"><option ${right==20?'selected':''}>20</option><option ${right==30?'selected':''}>30</option><option ${right==40?'selected':''}>40</option></select></div></div><div class="logGrid" style="margin-top:8px"><div class="field"><label>ROUNDS</label><div class="stepper"><button type="button" data-step="rounds" data-delta="-1">−</button><strong data-field="rounds">${rounds}</strong><button type="button" data-step="rounds" data-delta="1">+</button></div></div><div class="field"><label>EXTRA REPS</label><div class="stepper"><button type="button" data-step="extra" data-delta="-1">−</button><strong data-field="extra">${extra}</strong><button type="button" data-step="extra" data-delta="1">+</button></div></div><div class="field"><label>RPE</label><select data-field="rpe"><option value="">—</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${Number(x.rpe)===i+1?'selected':''}>${i+1}</option>`).join('')}</select></div><div class="field"><label>TIME</label><input data-field="time" value="${esc(time)}" placeholder="e.g. 12:40"></div><div class="field wide"><label>NOTES</label><input data-field="notes" value="${esc(x.notes||'')}" placeholder="Optional"></div></div><div class="summary"><span>Total reps</span><strong data-total>${total(type,rounds,extra)}</strong></div><button type="button" class="btn saveBtn" id="pickerSave">${x.saved?'UPDATE':'LOG '+type}</button></section></section>`;
 host.innerHTML=html;
 bind();
}
function bind(){
 const host=document.getElementById('todayView');if(!host)return;
 document.getElementById('pickWeek').addEventListener('change',e=>{selected.week=Number(e.target.value);selected.day=1;render()});
 document.getElementById('pickDay').addEventListener('change',e=>{selected.day=Number(e.target.value);render()});
 document.getElementById('prevDay').addEventListener('click',()=>move(-1));document.getElementById('nextDay').addEventListener('click',()=>move(1));
 host.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>{host.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on')}));
 host.querySelectorAll('[data-w]').forEach(b=>b.addEventListener('click',()=>{host.querySelector('[data-field="left"]').value=b.dataset.w;host.querySelector('[data-field="right"]').value=b.dataset.w;host.querySelectorAll('[data-w]').forEach(x=>x.classList.toggle('on',x===b))}));
 host.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{const f=host.querySelector('[data-field="'+b.dataset.step+'"]');const max=b.dataset.step==='rounds'?35:100;f.textContent=Math.max(0,Math.min(max,Number(f.textContent)+Number(b.dataset.delta)));updateTotal()}));
 document.getElementById('pickerSave').addEventListener('click',save);
}
function updateTotal(){const f=document.querySelector('#todayView .movement'),type=f.dataset.type,r=Number(f.querySelector('[data-field="rounds"]').textContent),e=Number(f.querySelector('[data-field="extra"]').textContent);f.querySelector('[data-total]').textContent=total(type,r,e)}
function move(delta){let d=selected.day+delta,w=selected.week;if(d<1){if(w>1){w--;d=3}else return}else if(d>3){if(w<8){w++;d=1}else return}selected={week:w,day:d};render()}
function save(){
 const host=document.getElementById('todayView'),f=host.querySelector('.movement'),type=f.dataset.type,g=n=>f.querySelector('[data-field="'+n+'"]');
 const date=document.getElementById('exerciseDate').value||localDate(),time=g('time').value||document.getElementById('exerciseTime').value||'';
 const rounds=Number(f.querySelector('[data-field="rounds"]').textContent)||0,extra=Number(f.querySelector('[data-field="extra"]').textContent)||0;
 const d=read(),key=`${selected.week}-${selected.day}`;let row=d.logs.find(x=>x.key===key);if(!row){row={key,date};d.logs.push(row)}row.date=date;row[type.toLowerCase()]={type,variant:f.querySelector('.seg .on')?.dataset.v||'Double',left:Number(g('left').value),right:Number(g('right').value),rounds,extra,total:total(type,rounds,extra),rpe:g('rpe').value?Number(g('rpe').value):null,time,notes:g('notes').value,saved:true};write(d);render();toast('Saved '+type+' · Week '+selected.week+' Day '+selected.day+' · '+date+(time?' '+time:''));
}
function toast(s){const e=document.getElementById('toast');if(!e)return;e.textContent=s;e.classList.add('show');clearTimeout(window.__pickerToast);window.__pickerToast=setTimeout(()=>e.classList.remove('show'),2200)}
function init(){if(!document.getElementById('todayView'))return;render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
