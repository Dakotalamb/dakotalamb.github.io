(()=>{'use strict';
 if(window.__fdgArrivalTrackerV2)return;window.__fdgArrivalTrackerV2=true;
 if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
 const main=['forgeddestinygaming.com','www.forgeddestinygaming.com'].includes(location.hostname),hub=location.hostname==='hub.forgeddestinygaming.com';
 if(!main&&!hub)return;
 const path=location.pathname;
 if(!main&&!(/^\/(?:fdgcast(?:\/[a-z0-9-]+)?|discover|supporter|business|newsletter|sign-in|privacy|data-and-cookies)?$/.test(path)||/^\/(?:creators|e|t|r)\/[a-zA-Z0-9_-]+$/.test(path)))return;
 const section=/^\/fdgcast(?:\/|$)/.test(path)?'fdgcast':main?'main':'hub';
 const key='fdg-arrival-visit-v2:'+section,windowMs=30*60*1000;
 async function count(){
  const now=Date.now();let state;
  try{state=JSON.parse(localStorage.getItem(key)||'null');
   if(!state){const old=JSON.parse(localStorage.getItem('fdg-arrival-visit-v2')||'null');if(old&&typeof old.entry==='string'){const oldSection=/^\/fdgcast(?:\/|$)/.test(old.entry)?'fdgcast':main?'main':'hub';if(oldSection===section)state=old;}}
  }catch{return;}
  if(!state||typeof state.id!=='string'||!Number.isFinite(state.lastSeen)||now-state.lastSeen>=windowMs||now<state.lastSeen){
   if(!crypto?.getRandomValues)return;
   state={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),lastSeen:now,counted:false,entry:path};
  }
  state.lastSeen=now;
  try{localStorage.setItem(key,JSON.stringify(state));}catch{return;}
  if(state.counted)return;
  try{
   const response=await fetch('https://hub.forgeddestinygaming.com/api/public/website-visit',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'text/plain'},body:JSON.stringify({path:state.entry,visitId:state.id}),keepalive:true});
   if(response.ok){const current=JSON.parse(localStorage.getItem(key)||'null');if(current?.id===state.id){current.counted=true;localStorage.setItem(key,JSON.stringify(current));}}
  }catch{}
 }
 if(navigator.locks?.request)navigator.locks.request('fdg-arrival-visit-v2',count).catch(()=>{});else count().catch(()=>{});
})();
