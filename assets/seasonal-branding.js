(function(root){
 'use strict';
 function validDay(value){if(!/^\d{2}-\d{2}$/.test(value||''))return false;const date=new Date('2000-'+value+'T12:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(5,10)===value;}
 function safeImage(value){return typeof value==='string'&&/^\/assets\/seasonal\/[a-zA-Z0-9_./-]+\.(png|webp|jpg|jpeg|svg)$/.test(value)&&!value.includes('..');}
 function choose(config,date=new Date()){
  if(!config||config.enabled!==true)return null;let day;try{const parts=new Intl.DateTimeFormat('en-US',{timeZone:config.timeZone||'America/New_York',month:'2-digit',day:'2-digit'}).formatToParts(date);day=parts.find(p=>p.type==='month').value+'-'+parts.find(p=>p.type==='day').value;}catch{return null;}
  const themes=(Array.isArray(config.themes)?config.themes:[]).filter(t=>t.enabled===true&&typeof t.id==='string'&&safeImage(t.src)&&validDay(t.start)&&validDay(t.end));
  if(config.override&&config.override!=='auto')return config.override==='normal'?null:themes.find(t=>t.id===config.override)||null;
  return themes.filter(t=>t.start<=t.end?day>=t.start&&day<=t.end:day>=t.start||day<=t.end).sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||a.id.localeCompare(b.id))[0]||null;
 }
 if(typeof module==='object'&&module.exports){module.exports={choose,validDay,safeImage};return;}
 root.FDGSeasonalBranding={choose};
 const script=document.currentScript,configUrl=new URL('seasonal-branding.json',script.src),images=[...document.querySelectorAll('img[data-seasonal-logo]')],saved=images.map(img=>({img,src:img.getAttribute('src'),hidden:img.hidden,slot:img.closest('[data-seasonal-logo-slot]')}));let config=null,active='',generation=0;
 function restore(){for(const s of saved){if(s.src)s.img.setAttribute('src',s.src);else s.img.removeAttribute('src');s.img.hidden=s.hidden;s.img.classList.remove('seasonal-logo-active');if(s.slot){const fallback=s.slot.querySelector('[data-seasonal-fallback]');if(fallback)fallback.hidden=false;}}active='';}
 function apply(){const revision=++generation,theme=choose(config),id=theme?theme.id+theme.src:'';if(id===active)return;if(!theme){restore();return;}const probe=new Image();probe.onload=()=>{if(revision!==generation)return;for(const s of saved){s.img.src=theme.src;s.img.hidden=false;s.img.classList.add('seasonal-logo-active');if(s.slot){const fallback=s.slot.querySelector('[data-seasonal-fallback]');if(fallback)fallback.hidden=true;}}active=id;};probe.onerror=()=>{if(revision===generation)restore();};probe.src=theme.src;}
 async function load(){try{const response=await fetch(configUrl,{cache:'no-cache',credentials:'omit',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();config=await response.json();apply();}catch{config=null;++generation;restore();}}
 if(images.length){load();setInterval(load,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});}
})(typeof window==='object'?window:globalThis);
