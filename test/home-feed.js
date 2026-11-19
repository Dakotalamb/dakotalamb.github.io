'use strict';
const assert=require('node:assert/strict'),request=require('supertest');
const {setup}=require('./release-ux-fixture');
(async()=>{
 const {app,pool,owner,outsider,event}=await setup();
 const agent=request.agent(app);const get=url=>agent.get(url).set('X-Forwarded-Proto','https');
 const guest=await request(app).get('/').set('X-Forwarded-Proto','https');assert.equal(guest.status,200);assert.match(guest.text,/Stream schedules and creator collaboration/);assert.doesNotMatch(guest.text,/Your event feed/);
 await agent.get('/__test/login/'+outsider.id);await pool.query('INSERT INTO creator_follows(follower_id,creator_id) VALUES($1,$2)',[outsider.id,owner.id]);
 const add=async(slug,privacy=false)=>(await pool.query(`INSERT INTO events(owner_id,slug,title,game_name,visibility,access_mode,schedule_published,starts_at,ends_at,access_rules) VALUES($1,$2,$2,'Co-op',$3,$4,$5,$6,$7,$8) RETURNING *`,[owner.id,slug,privacy?'private':'public',privacy?'invite':'public',!privacy,new Date(Date.now()+2*86400000),new Date(Date.now()+2*86400000+3600000),JSON.stringify({guests:[String(outsider.id)]})])).rows[0];
 const invited=await add('feed-invited',true),secret=await add('feed-secret',true),draft=await add('feed-draft'),ended=await add('feed-ended');
 await pool.query('UPDATE events SET is_draft=TRUE WHERE id=$1',[draft.id]);await pool.query("UPDATE events SET lifecycle_status='completed' WHERE id=$1",[ended.id]);
 await pool.query('INSERT INTO event_participants(event_id,user_id,invited_by) VALUES($1,$2,$3)',[invited.id,outsider.id,owner.id]);
 let page=await get('/');assert.equal(page.status,200,page.text);assert.equal(page.headers['cache-control'],'private, no-store');assert.match(page.text,/noindex/);assert.match(page.text,/Invitations awaiting your response/);assert.match(page.text,/data-feed-event="feed-invited"/);assert.match(page.text,/data-feed-event="ux-public"/);assert.doesNotMatch(page.text,/data-feed-event="(?:feed-secret|feed-draft|feed-ended)"/);assert.doesNotMatch(page.text,/Bring your Twitch, YouTube and Kick chats together/);assert.ok(page.text.indexOf('data-feed-event="feed-invited"')<page.text.indexOf('data-feed-event="ux-public"'));
 assert.match(page.text,/Joining as a creator\?/);assert.match(page.text,/Planning to watch\?/);
 const csrf=page.text.match(/name="_csrf" value="([^"]+)"/)[1];
 let r=await agent.post('/e/'+invited.slug+'/participants/respond').send({_csrf:csrf,response:'accepted'});assert.equal(r.status,302,r.text);assert.equal((await pool.query('SELECT response FROM event_participants WHERE event_id=$1 AND user_id=$2',[invited.id,outsider.id])).rows[0].response,'accepted');
 r=await agent.post('/e/'+event.slug+'/watch-rsvp').send({_csrf:csrf,response:'going',activity_ids:String(event.id)});assert.equal(r.status,302,r.text);assert.equal((await pool.query('SELECT response FROM event_watch_rsvps WHERE event_id=$1 AND user_id=$2',[event.id,outsider.id])).rows[0].response,'going');assert.equal((await pool.query('SELECT * FROM rsvps WHERE event_id=$1 AND user_id=$2',[event.id,outsider.id])).rows.length,0,'watching does not join creator lineup');
 r=await agent.post('/e/'+event.slug+'/watch-rsvp').send({response:'declined',activity_ids:String(event.id)});assert.equal(r.status,403,'CSRF remains required');
 page=await get('/collab/following');assert.equal(page.status,200,page.text);assert.match(page.text,/event-feed/);assert.match(page.text,/watch-rsvp/);assert.doesNotMatch(page.text,/data-feed-event="feed-secret"/);
 page=await get('/?feed=discover');assert.equal(page.status,200);assert.doesNotMatch(page.text,/data-feed-event="feed-invited"/);
 await pool.query("UPDATE event_watch_rsvps SET email_opt_in=TRUE,email_address='viewer@example.test',email_consented_at=NOW(),reminder_eligible=FALSE WHERE event_id=$1 AND user_id=$2",[event.id,outsider.id]);
 r=await agent.post('/e/'+event.slug+'/watch-rsvp').send({_csrf:csrf,response:'going',activity_ids:String(event.id),feed_response:'1'});assert.equal(r.status,302);assert.equal((await pool.query('SELECT email_opt_in FROM event_watch_rsvps WHERE event_id=$1 AND user_id=$2',[event.id,outsider.id])).rows[0].email_opt_in,true,'quick response preserves existing reminder choice');
 // A public-looking child must not disclose a restricted parent through the feed.
 await pool.query('UPDATE events SET has_sessions=TRUE WHERE id=$1',[secret.id]);const child=await add('feed-restricted-child');await pool.query('UPDATE events SET session_parent_id=$1 WHERE id=$2',[secret.id,child.id]);
 page=await get('/');assert.doesNotMatch(page.text,/data-feed-event="feed-restricted-child"/);
 await pool.query('DELETE FROM event_participants WHERE event_id=$1 AND user_id=$2',[invited.id,outsider.id]);page=await get('/');assert.doesNotMatch(page.text,/data-feed-event="feed-invited"/,'revoked invitation is no longer exposed');
 // Organizers may have retained participant rows, including generated program invitations.
 await pool.query('INSERT INTO event_participants(event_id,user_id,invited_by) VALUES($1,$2,$2)',[event.id,owner.id]);
 const program=await add('feed-owner-program');await pool.query('UPDATE events SET has_sessions=TRUE WHERE id=$1',[program.id]);
 const activity=await add('feed-owner-activity');await pool.query('UPDATE events SET session_parent_id=$1 WHERE id=$2',[program.id,activity.id]);
 for(const owned of [program,activity])await pool.query('INSERT INTO event_participants(event_id,user_id,invited_by) VALUES($1,$2,$2)',[owned.id,owner.id]);
 const ownerFeed=await require('../src/home-feed').load(pool,owner);
 assert.equal(ownerFeed.invitations.length,0,'owned events never become invitations');
 for(const owned of [event,program,activity]){const row=ownerFeed.events.find(e=>String(e.id)===String(owned.id));assert.ok(row,'owned event stays in personal feed');assert.equal(row.is_host,true);assert.equal(row.is_invitation,false);assert.equal(row.response_kind,null);}
 const host=request.agent(app);await host.get('/__test/login/'+owner.id);const hostPage=await host.get('/').set('X-Forwarded-Proto','https');
 assert.equal(hostPage.status,200);assert.doesNotMatch(hostPage.text,/Invitations awaiting your response|Invited you|data-feed-response/);assert.match(hostPage.text,/Your event/);assert.match(hostPage.text,/Manage event/);
 assert.equal((await pool.query('SELECT response FROM event_participants WHERE event_id=$1 AND user_id=$2',[event.id,owner.id])).rows[0].response,'invited','fix is read-only and preserves participant records');
 console.log('Home feed passed: public introduction, private personalized feed, follow reuse, invitation priority, quick responses, viewer/creator separation, CSRF, restricted parents and revoked access.');await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});
