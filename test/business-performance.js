'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require('node:path').join(__dirname,'../business/performance.js'),'utf8');
async function run(payload,fail=false){const elements=new Map();const context={document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:id==='reportMethod'?'Methods.':''});return elements.get(id);}},fetch:async(url,options)=>{assert.equal(url,'https://hub.forgeddestinygaming.com/api/public/business-analytics?scope=all');assert.equal(options.credentials,'omit');if(fail)throw Error();return{ok:true,json:async()=>payload};},setTimeout:()=>1,clearTimeout:()=>{},AbortController,Date,Number};vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));return Object.fromEntries([...elements].map(([k,v])=>[k,v.textContent]));}
(async()=>{
 const payload={scope:'all',reporting_start:'2026-08',reporting_end:'2026-09',months_reported:2,creators_reported:2,last_updated:'2026-10-01T00:00:00Z',totals:{total_views:12500,content_published:10,combined_followers:590,average_livestream_reach:40,platforms_represented:['Twitch','YouTube'],highest_performing_post:{creator:'<script>example</script>',views:800}}};
 const good=await run(payload);assert.equal(good.totalMonthlyViews,'12,500');assert.equal(good.combinedFollowers,'590');assert.match(good.reportingPeriod,/August 2026 – September 2026/);assert.match(good.reportMethod,/not all are independently verified/);assert.equal(good.highestPerformingPost,'<script>example</script>','content is assigned as literal text');
 assert.match((await run({scope:'all',totals:null})).reportingPeriod,/No approved reports/);
 assert.match((await run({},true)).reportingPeriod,/temporarily unavailable/);
 assert.match((await run({totals:payload.totals})).reportingPeriod,/temporarily unavailable/,'old latest-month feed is not misrepresented as cumulative');
 assert.match((await run({...payload,totals:{...payload.totals,total_views:'incorrect'}})).reportingPeriod,/temporarily unavailable/);
 assert.equal((await run({...payload,totals:{...payload.totals,followers_reported:false}})).combinedFollowers,'Not reported');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../business/index.html'),'utf8');assert.doesNotMatch(html,/fetch\('\/business-data.json'/);assert.match(html,/business\/performance.js/);assert.match(html,/Total reported views/);
 console.log('Website feed checks passed: cumulative Hub URL, correct field mapping/periods, safe text rendering, empty/error/old-contract states and truthful labels.');
})().catch(e=>{console.error(e);process.exit(1)});
