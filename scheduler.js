/* Shared by the browser and the server: occurrence dates and collision rules. */
(function (root) {
  const dayNames = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  const parse = value => new Date(value + 'T12:00:00Z');
  const iso = date => date.toISOString().slice(0,10);
  const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
  const dayIndex = date => (date.getUTCDay() + 1) % 7;
  const saturdayOf = date => addDays(date, -dayIndex(date));
  const minutes = value => Number(value.slice(0,2))*60 + Number(value.slice(3));
  function isDate(value) { return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(parse(value)) && iso(parse(value))===value; }
  function applies(event, date) {
    const d = typeof date==='string' ? parse(date) : date;
    const key=iso(d);
    if (!event.days.includes(dayIndex(d))) return false;
    if (!event.repeat) return (event.dates || [event.date]).includes(key);
    return event.repeatMode!=='range' || (key>=event.repeatStart && key<=event.repeatEnd);
  }
  function periodsOverlap(a,b,day) {
    if (!a.repeat) return (a.dates || [a.date]).some(d=>isDate(d) && dayIndex(parse(d))===day && applies(b,d));
    if (!b.repeat) return periodsOverlap(b,a,day);
    const firstA=a.repeatMode==='range'?a.repeatStart:'2000-01-01';
    const firstB=b.repeatMode==='range'?b.repeatStart:'2000-01-01';
    const lastA=a.repeatMode==='range'?a.repeatEnd:'9999-12-31';
    const lastB=b.repeatMode==='range'?b.repeatEnd:'9999-12-31';
    const first=firstA>firstB?firstA:firstB, last=lastA<lastB?lastA:lastB;
    if(first>last) return false;
    const next=addDays(parse(first),(day-dayIndex(parse(first))+7)%7);
    return iso(next)<=last;
  }
  function normalize(raw,id) {
    const text = (key,max,required=false) => {
      const value=String(raw[key]??'').trim();
      if(value.length>max || (required && !value)) throw new Error('عنوان و نام مدرس را کامل کنید؛ متن واردشده بیش از حد طولانی نباشد.');
      return value;
    };
    const event={id,title:text('title',80,true),teacher:text('teacher',60,true),room:String(raw.room),days:[...new Set(raw.days||[])],start:raw.start,end:raw.end,repeat:raw.repeat===true,repeatMode:raw.repeatMode,color:raw.color,phone:text('phone',40),price:text('price',50),description:text('description',1200)};
    if(!['1','2','3','4'].includes(event.room) || !event.days.length || event.days.some(d=>!Number.isInteger(d)||d<0||d>6)) throw new Error('کلاس و روزهای برگزاری را درست انتخاب کنید.');
    if(!['violet','teal','amber','rose'].includes(event.color)) event.color='violet';
    if(!/^\d{2}:\d{2}$/.test(event.start||'') || !/^\d{2}:\d{2}$/.test(event.end||'') || Number(event.start.slice(3))>59 || Number(event.end.slice(3))>59 || minutes(event.start)<480 || minutes(event.end)>1320 || minutes(event.end)-minutes(event.start)<15) throw new Error('زمان برنامه باید بین ۸ صبح و ۱۰ شب باشد و حداقل ۱۵ دقیقه طول بکشد.');
    if(event.repeat) {
      if(!['forever','range'].includes(event.repeatMode)) throw new Error('حالت تکرار هفتگی را انتخاب کنید.');
      if(event.repeatMode==='range') {
        if(!isDate(raw.repeatStart)||!isDate(raw.repeatEnd)||raw.repeatStart>raw.repeatEnd) throw new Error('تاریخ شروع و پایان تکرار را درست وارد کنید.');
        event.repeatStart=raw.repeatStart; event.repeatEnd=raw.repeatEnd;
        if(!event.days.some(d=>iso(addDays(parse(raw.repeatStart),(d-dayIndex(parse(raw.repeatStart))+7)%7))<=raw.repeatEnd)) throw new Error('بازه انتخابی هیچ‌کدام از روزهای برگزاری را شامل نمی‌شود.');
      }
    } else {
      if(!isDate(raw.date)) throw new Error('یک تاریخ از هفته برگزاری انتخاب کنید.');
      event.date=raw.date;
      const week=saturdayOf(parse(raw.date));
      event.dates=event.days.map(day=>iso(addDays(week,day)));
    }
    return event;
  }
  function conflict(event,events) {
    return events.find(old=>old.id!==event.id && old.room===event.room && minutes(event.start)<minutes(old.end)+15 && minutes(event.end)+15>minutes(old.start) && event.days.some(day=>old.days.includes(day)&&periodsOverlap(event,old,day)));
  }
  root.ScheduleRules={dayNames,parse,iso,addDays,dayIndex,saturdayOf,applies,normalize,conflict};
})(globalThis);
