'use strict';
const access=require('./event-access'),watch=require('./event-watch');
async function load(db,user,scope='all'){
 const rows=(await db.query(`SELECT e.*,u.username AS owner_name,u.public_slug AS owner_slug,u.avatar_url AS owner_avatar_url,
 f.creator_id AS followed_creator,p.response AS invitation_response,r.response AS creator_response,w.response AS watch_response
 FROM events e JOIN users u ON u.id=e.owner_id
 LEFT JOIN creator_follows f ON f.creator_id=e.owner_id AND f.follower_id=$1
 LEFT JOIN event_participants p ON p.event_id=e.id AND p.user_id=$1
 LEFT JOIN rsvps r ON r.event_id=e.id AND r.user_id=$1
 LEFT JOIN event_watch_rsvps w ON w.event_id=e.id AND w.user_id=$1
 WHERE e.is_draft=FALSE AND e.lineup_removed=FALSE AND u.is_blocked=FALSE
 AND e.status!='cancelled' AND e.lifecycle_status NOT IN('cancelled','completed') AND e.event_kind!='away'
 AND COALESCE(e.ends_at,e.starts_at+INTERVAL '6 hours')>=NOW()
 AND (p.user_id IS NOT NULL OR r.user_id IS NOT NULL OR w.user_id IS NOT NULL OR e.owner_id=$1
 OR (e.visibility='public' AND e.schedule_published=TRUE))
 ORDER BY CASE WHEN p.response='invited' AND e.owner_id<>$1 THEN 0 WHEN f.creator_id IS NOT NULL OR p.user_id IS NOT NULL OR r.user_id IS NOT NULL OR w.user_id IS NOT NULL OR e.owner_id=$1 THEN 1 ELSE 2 END,e.starts_at,e.id LIMIT 200`,[user.id])).rows;
 const visible=[];
 for(const e of rows){
  if(!(await access.permission(db,user,e)).view)continue;
  e.is_host=String(e.owner_id)===String(user.id);
  e.is_invitation=!e.is_host&&e.invitation_response==='invited';
  e.is_personal=e.is_host||!!e.invitation_response||!!e.creator_response||!!e.watch_response;
  // Following/discovery never reveal unlisted or restricted events through a follow.
  if(scope==='following'&&(!e.followed_creator||e.visibility!=='public'||!e.schedule_published))continue;
  if(scope==='discover'&&(e.visibility!=='public'||!e.schedule_published||!['public','legacy'].includes(e.access_mode)))continue;
  e.response_kind=null;
  if(!e.has_sessions&&!e.is_host){
   if(e.invitation_response)e.response_kind='invitation';
   else if(e.creator_response&&await access.canAttend(db,user,e))e.response_kind='creator';
   else if(await watch.allowed(db,user,e))e.response_kind='watch';
  }
  visible.push(e);
 }
 const invitations=visible.filter(e=>e.is_invitation).slice(0,20);
 const personal=visible.filter(e=>!e.is_invitation&&(e.is_personal||e.followed_creator));
 const fallback=scope==='all'&&!personal.length;
 const events=(scope==='all'&&!fallback?personal:visible.filter(e=>!e.is_invitation)).slice(0,30);
 return {invitations,events,scope,fallback};
}
module.exports={load};
