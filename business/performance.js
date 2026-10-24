(()=>{'use strict';
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
 const ids=['totalMonthlyViews','totalContentPublished','combinedFollowers','highestPerformingPost','platformsRepresented','averageLivestreamReach'];
 const number=n=>Number(n).toLocaleString('en-US');
 const month=m=>/^\d{4}-\d{2}$/.test(m||'')?new Date(m+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}):'';
 (async()=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch('https://hub.forgeddestinygaming.com/api/public/business-analytics?scope=all',{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(!response.ok)throw Error('Report feed unavailable');const data=await response.json();
   if(data.scope!=='all')throw Error('Cumulative reporting feed has not been deployed');
   const totals=data.totals;
   if(!totals){ids.forEach(id=>set(id,'—'));set('highestPerformingViews','');set('reportingPeriod','No approved reports published yet.');set('lastUpdated','');return;}
   if(!['total_views','content_published','combined_followers','average_livestream_reach'].every(k=>typeof totals[k]==='number'&&Number.isFinite(totals[k])&&totals[k]>=0))throw Error('Invalid report totals');
   set('totalMonthlyViews',number(totals.total_views));set('totalContentPublished',number(totals.content_published));set('combinedFollowers',totals.followers_reported===false?'Not reported':number(totals.combined_followers));set('averageLivestreamReach',number(totals.average_livestream_reach));
   set('platformsRepresented',Array.isArray(totals.platforms_represented)&&totals.platforms_represented.length?totals.platforms_represented.join(', '):'Not reported');
   const post=totals.highest_performing_post;set('highestPerformingPost',post?post.creator:'Not reported');set('highestPerformingViews',post?number(post.views)+' views':'');
   const start=month(data.reporting_start),end=month(data.reporting_end);set('reportingPeriod','Approved reports: '+(start===end?end:start+' – '+end)+' · '+data.months_reported+' reported month'+(data.months_reported===1?'':'s')+' · '+data.creators_reported+' creator'+(data.creators_reported===1?'':'s'));
   const updated=new Date(data.last_updated);set('lastUpdated',data.last_updated&&Number.isFinite(+updated)?' · Last updated '+updated.toLocaleDateString('en-US'):'');
   const method=document.getElementById('reportMethod');if(method)method.textContent+=(data.all_figures_independently_verified?' All included reports are marked independently verified.':' Figures are creator-reported and approved by FDG; not all are independently verified.');
  }catch{ids.forEach(id=>set(id,'—'));set('highestPerformingViews','');set('reportingPeriod','Performance figures are temporarily unavailable. Please try again later.');set('lastUpdated','');}
  finally{clearTimeout(timeout);}
 })();
})();
