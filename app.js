const R=ScheduleRules, dayNames=R.dayNames;
const toFa=value=>String(value??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const fmtDate=value=>value?new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(R.parse(value)):'—';
const nowParts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,p)=>(a[p.type]=p.value,a),{}),todayKey=`${nowParts.year}-${nowParts.month}-${nowParts.day}`;
const localDemo=location.protocol==='file:'||location.hostname==='127.0.0.1'||location.hostname==='localhost',localPassword='Atieh-Admin-2026!';
let weekStart=R.saturdayOf(R.parse(todayKey)),events=JSON.parse(localStorage.getItem('academy_events')||'null')||demoEvents,revision=Number(localStorage.getItem('academy_revision')||1),isAdmin=sessionStorage.getItem('academy_admin')==='1',serverReady=localDemo,selectedDay=null,selectedEvent=null,editingId=null,lastFocus=null;
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));
async function api(path,method='GET',body){
  if(localDemo){
    if(path==='session')return {admin:sessionStorage.getItem('academy_admin')==='1'};
    if(path==='login'){if(body.username!=='admin'||body.password!==localPassword)throw new Error('نام کاربری یا رمز عبور اشتباه است.');sessionStorage.setItem('academy_admin','1');return {admin:true};}
    if(path==='logout'){sessionStorage.removeItem('academy_admin');return {admin:false};}
    if(path==='events'&&method==='GET')return {events,revision};
    if(!isAdmin)throw new Error('فقط مدیر واردشده اجازه تغییر برنامه را دارد.');
    if(body.revision!==revision)throw new Error('برنامه در این پیش‌نمایش تغییر کرده است.');
    if(method==='DELETE')events=events.filter(e=>e.id!==body.id);else if(method==='PUT')events=events.map(e=>e.id===body.event.id?body.event:e);else events=events.concat({...body.event,id:'local-'+Date.now()});
    revision++;localStorage.setItem('academy_events',JSON.stringify(events));localStorage.setItem('academy_revision',String(revision));return {events,revision};
  }
  const result=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const data=await result.json();
  if(!result.ok){if(result.status===401){isAdmin=false;updateAccess()}if(result.status===409)await loadEvents();throw new Error(data.error||'خطا در ارتباط با سرور.');}
  return data;
}
async function loadEvents(){const data=await api('events');events=data.events;revision=data.revision;serverReady=true;render();}
function weekTitle(){return `${fmtDate(R.iso(weekStart))} تا ${fmtDate(R.iso(R.addDays(weekStart,6)))}`;}
function render(){
  $('weekTitle').textContent=weekTitle();$('schedule').innerHTML='';let occurrenceCount=0,repeatCount=0;
  dayNames.forEach((name,index)=>{
    const date=R.addDays(weekStart,index),dateKey=R.iso(date),daily=events.filter(e=>R.applies(e,date));occurrenceCount+=daily.length;repeatCount+=daily.filter(e=>e.repeat).length;
    const section=document.createElement('section');section.className='day-section'+(dateKey===todayKey?' today-row':'');section.dataset.day=index;if(selectedDay!==null&&selectedDay!==index)section.classList.add('filtered-out');
    const header=document.createElement('div');header.className='day-header';header.innerHTML=`<strong class="day-name">${name}${dateKey===todayKey?'<em>امروز</em>':''}</strong><span class="day-date">${fmtDate(dateKey)}</span><span class="day-badge">${daily.length?toFa(daily.length)+' جلسه':'بدون برنامه'}</span>`;section.appendChild(header);
    const grid=document.createElement('div');grid.className='room-grid';
    for(let room=1;room<=4;room++){
      const list=daily.filter(e=>e.room===String(room)).sort((a,b)=>a.start.localeCompare(b.start)),col=document.createElement('div');col.className='room-column';col.innerHTML=`<div class="room-head"><span class="room-number">کلاس ${toFa(room)}</span></div>`;
      const container=document.createElement('div');container.className='event-list';if(!list.length)container.innerHTML='<div class="empty-cell">زمان آزاد</div>';
      list.forEach(event=>{const card=document.createElement('button');card.type='button';card.className=`event-card ${event.color}`;card.innerHTML=`<div class="event-time"><bdi>${toFa(event.start)}</bdi><span>تا</span><bdi>${toFa(event.end)}</bdi></div><div class="event-title">${escapeHtml(event.title)}</div><div class="event-teacher">مدرس: ${escapeHtml(event.teacher)}</div><div class="event-repeat">${event.repeat?'↻ تکرار هفتگی':'فقط این هفته'}</div>`;card.addEventListener('click',()=>showDetails(event,dateKey));container.appendChild(card)});col.appendChild(container);grid.appendChild(col);
    }section.appendChild(grid);$('schedule').appendChild(section);
  });
  $('eventCount').textContent=toFa(occurrenceCount);$('repeatCount').textContent=toFa(repeatCount);
}
function showDetails(event,dateKey){
  selectedEvent=event;$('detailAccent').style.background={violet:'#6240bf',teal:'#087f75',amber:'#ad6209',rose:'#b3375e'}[event.color];$('modalTitle').textContent=event.title;
  const repeat=event.repeat?(event.repeatMode==='range'?`هفتگی؛ از ${fmtDate(event.repeatStart)} تا ${fmtDate(event.repeatEnd)}`:'هفتگی بدون پایان'):'فقط هفته انتخاب‌شده';
  $('modalBody').innerHTML=[['تاریخ جلسه',fmtDate(dateKey)],['ساعت',`${toFa(event.start)} تا ${toFa(event.end)}`],['اتاق',`کلاس ${toFa(event.room)}`],['مدرس / اجاره‌دهنده',event.teacher],['روزهای برگزاری',event.days.map(d=>dayNames[d]).join('، ')],['تکرار',repeat],['تماس',event.phone||'ثبت نشده'],['قیمت اجاره',event.price||'ثبت نشده'],['توضیحات',event.description||'ثبت نشده']].map(([label,value])=>`<div class="detail-item"><span class="label">${label}</span><span class="value">${escapeHtml(value)}</span></div>`).join('');
  $('editBtn').classList.toggle('is-hidden',!isAdmin);$('deleteBtn').classList.toggle('is-hidden',!isAdmin);openModal('eventModal');
}
function openModal(id){lastFocus=document.activeElement;$(id).classList.add('is-open');$(id).setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$(id).querySelector('input,button')?.focus();}
function closeModal(id){$(id).classList.remove('is-open');$(id).setAttribute('aria-hidden','true');if(!document.querySelector('.modal-backdrop.is-open')){document.body.style.overflow='';lastFocus?.focus();}}
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)closeModal(el.id)}));
document.addEventListener('keydown',e=>{const modal=document.querySelector('.modal-backdrop.is-open');if(!modal)return;if(e.key==='Escape')closeModal(modal.id);if(e.key==='Tab'){const list=[...modal.querySelectorAll('input:not([disabled]),button:not(.is-hidden),select,textarea')].filter(x=>x.getClientRects().length),first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
function updateAccess(){$('adminBtn').textContent=isAdmin?'＋ افزودن برنامه':'ورود مدیر';$('logoutBtn').classList.toggle('is-hidden',!isAdmin);$('connectionStatus').textContent=serverReady?(localDemo?'پیش‌نمایش محلی · اطلاعات این دستگاه ذخیره می‌شود؛ برای انتشار عمومی باید بخش آنلاین را تنظیم کنید.':(isAdmin?'وارد پنل مدیریت شده‌اید؛ افزودن، ویرایش و حذف فعال است.':'حالت مشاهده · فقط مدیر می‌تواند برنامه را تغییر دهد. روی هر جلسه کلیک کنید.')):'پیش‌نمایش نمونه · برای ورود مدیر، نسخه سرور را اجرا یا سایت را آنلاین کنید.';}
function repeatUi(){const form=$('eventForm'),repeat=form.elements.repeatWeekly.checked,range=form.elements.repeatMode.value==='range';$('repeatOptions').classList.toggle('is-hidden',!repeat);document.querySelector('.range-fields').style.display=repeat&&range?'grid':'none';form.elements.date.disabled=repeat;form.elements.date.required=!repeat;form.elements.repeatStart.required=repeat&&range;form.elements.repeatEnd.required=repeat&&range;}
function openEditor(event){if(!isAdmin)return;const form=$('eventForm');form.reset();editingId=event?.id||null;$('adminTitle').textContent=event?'ویرایش برنامه':'افزودن برنامه جدید';if(event){['title','teacher','room','phone','start','end','color','price','description','date','repeatStart','repeatEnd'].forEach(key=>form.elements[key].value=event[key]||'');form.elements.repeatWeekly.checked=event.repeat;form.elements.repeatMode.value=event.repeatMode||'forever';}else{form.elements.date.value=R.iso(weekStart)}document.querySelectorAll('input[name="days"]').forEach(input=>input.checked=event?event.days.includes(Number(input.value)):Number(input.value)===0);repeatUi();openModal('adminModal');}
$('adminBtn').addEventListener('click',()=>{if(isAdmin)openEditor();else if(serverReady)openModal('loginModal');else showToast('برای ورود مدیر، نسخه سرور یا سایت آنلاین را باز کنید.');});
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button[type="submit"]');button.disabled=true;$('loginError').textContent='';try{await api('login','POST',Object.fromEntries(new FormData(e.target)));isAdmin=true;e.target.reset();closeModal('loginModal');updateAccess();showToast('ورود مدیر موفق بود.')}catch(error){$('loginError').textContent=error.message}finally{button.disabled=false}});
$('logoutBtn').addEventListener('click',async()=>{try{await api('logout','POST',{});isAdmin=false;updateAccess();['eventModal','adminModal'].forEach(closeModal);showToast('از مدیریت خارج شدید.')}catch(error){showToast(error.message)}});
$('editBtn').addEventListener('click',()=>{closeModal('eventModal');openEditor(selectedEvent)});$('deleteBtn').addEventListener('click',()=>{closeModal('eventModal');openModal('deleteModal')});
$('confirmDeleteBtn').addEventListener('click',async()=>{if(!isAdmin)return;try{const data=await api('events','DELETE',{id:selectedEvent.id,revision});events=data.events;revision=data.revision;closeModal('deleteModal');render();showToast('برنامه حذف شد.')}catch(error){showToast(error.message)}});
$('prevWeek').addEventListener('click',()=>{weekStart=R.addDays(weekStart,-7);render()});$('nextWeek').addEventListener('click',()=>{weekStart=R.addDays(weekStart,7);render()});$('todayBtn').addEventListener('click',()=>{weekStart=R.saturdayOf(R.parse(todayKey));render()});
[null,0,1,2,3,4,5,6].forEach(day=>{const button=document.createElement('button');button.type='button';button.textContent=day===null?'کل هفته':dayNames[day];button.className=day===null?'active':'';button.setAttribute('aria-pressed',day===null);button.addEventListener('click',()=>{selectedDay=day;[...$('dayTabs').children].forEach(x=>{x.classList.toggle('active',x===button);x.setAttribute('aria-pressed',x===button)});render()});$('dayTabs').appendChild(button)});
dayNames.forEach((day,i)=>{const label=document.createElement('label');label.className='day-check';label.innerHTML=`<input type="checkbox" name="days" value="${i}" ${i===0?'checked':''}><span>${day}</span>`;$('dayChecks').appendChild(label)});
$('repeatWeekly').addEventListener('change',repeatUi);document.querySelectorAll('input[name="repeatMode"]').forEach(input=>input.addEventListener('change',repeatUi));repeatUi();
$('eventForm').addEventListener('submit',async e=>{e.preventDefault();if(!isAdmin)return showToast('ابتدا وارد مدیریت شوید.');const button=e.target.querySelector('button[type="submit"]');button.disabled=true;try{const data=Object.fromEntries(new FormData(e.target));data.days=[...e.target.querySelectorAll('input[name="days"]:checked')].map(x=>Number(x.value));data.repeat=e.target.elements.repeatWeekly.checked;const event=R.normalize(data,editingId||'new'),overlap=R.conflict(event,events);if(overlap)throw new Error(`تداخل با «${overlap.title}»؛ حداقل ۱۵ دقیقه فاصله لازم است.`);const response=await api('events',editingId?'PUT':'POST',{event,revision});events=response.events;revision=response.revision;closeModal('adminModal');render();showToast('برنامه برای همه بازدیدکنندگان ذخیره شد.')}catch(error){showToast(error.message)}finally{button.disabled=false}});
$('printBtn').addEventListener('click',async()=>{await document.fonts.ready;window.print();});
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),5000)}
async function initialize(){render();updateAccess();if(localDemo){return}try{await loadEvents();const session=await api('session');isAdmin=session.admin;updateAccess()}catch(error){serverReady=false;updateAccess();showToast(error.message)}}
initialize();
