"use strict";
/* KvizToGo live room: ephemeral Realtime Broadcast. No quiz data is stored in Supabase. */
(function(){
 const URL="https://hssfjguysejbosvholqu.supabase.co";
 const KEY="sb_publishable_1wlZVov1csReXuZEgcuInA_7F7_gzIy";
 const client=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let channel=null,role="",activeRoom="",secret="",latest=null,connected=false,callbacks={},broadcastTick=null;
 const validRoom=x=>/^[A-HJ-NP-Z2-9]{8}$/.test(String(x||"").toUpperCase());
 const rand=n=>{
  if(!crypto?.getRandomValues)throw Error("Sigurno nasumično generiranje nije dostupno.");
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",v=new Uint8Array(n);crypto.getRandomValues(v);
  return Array.from(v,x=>chars[x%chars.length]).join("");
 };
 function genRoom(){return rand(8);}
 function genSecret(){const a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,"0")).join("");}
 function status(s){callbacks.onStatus?.(s);}
 function stop(){
  if(broadcastTick){clearInterval(broadcastTick);broadcastTick=null;}
  if(channel&&client){client.removeChannel(channel);}
  channel=null;role="";activeRoom="";secret="";latest=null;connected=false;callbacks={};
 }
 async function transmit(event,payload){
  if(!channel||!connected)return false;
  try{const r=await channel.send({type:"broadcast",event,payload});return r==="ok"||r==="OK"||r?.status==="ok";}
  catch(e){return false;}
 }
 function subscribe(room,roleName,handlers){
  if(!client)throw Error("Veza za različite uređaje nije dostupna (Supabase se nije učitao).");
  if(!validRoom(room))throw Error("Kod mora imati 8 znakova.");
  stop();role=roleName;activeRoom=room.toUpperCase();callbacks=handlers||{};
  channel=client.channel("ktg-stage-"+activeRoom,{config:{broadcast:{self:false,ack:true}}});
  channel.on("broadcast",{event:"hello"},()=>{
   if(role==="host"&&latest)transmit("state",latest);
  }).on("broadcast",{event:"state"},event=>{
   if(role!=="host"&&event.payload&&event.payload.kind==="ktg-slide")callbacks.onState?.(event.payload);
  }).on("broadcast",{event:"command"},event=>{
   if(role==="host"&&secret&&event.payload?.secret===secret&&["next","previous","reveal","board"].includes(event.payload.action)){
    callbacks.onCommand?.(event.payload.action);
   }
  });
  channel.subscribe((state)=>{
   if(state==="SUBSCRIBED"){
    connected=true;status("Povezano");
    if(role==="host"&&latest)transmit("state",latest);
    else transmit("hello",{device:role});
   }else if(state==="CHANNEL_ERROR"||state==="TIMED_OUT"||state==="CLOSED"){
    connected=false;status("Veza je prekinuta. Provjeri internet.");
   }
  });
  status("Spajanje…");
 }
 function startHost({room,controlSecret,getState,onStatus,onCommand}){
  if(!validRoom(room))throw Error("Neispravan kod sobe.");
  subscribe(room,"host",{onStatus,onCommand});
  secret=controlSecret;
  latest=getState?.()||null;
  if(connected&&latest)transmit("state",latest);
  broadcastTick=setInterval(()=>{if(role==="host"&&connected&&latest)transmit("state",latest);},14000);
 }
 function startAudience({room,onState,onStatus}){
  subscribe(room,"audience",{onState,onStatus});
 }
 function startController({room,controlSecret,onState,onStatus}){
  if(!/^[0-9a-f]{48}$/.test(controlSecret||""))throw Error("Privatna voditeljska poveznica nije valjana.");
  subscribe(room,"controller",{onState,onStatus});
  secret=controlSecret;
 }
 function broadcastHost(slide){
  if(role!=="host")return;
  latest=slide;
  if(connected)transmit("state",slide);
 }
 function sendCommand(action){
  if(role!=="controller"||!secret||!["next","previous","reveal","board"].includes(action))return;
  if(!connected){status("Nema veze. Provjeri internet.");return;}
  transmit("command",{action,secret});
 }
 function isHost(){return role==="host";}
 function room(){return activeRoom;}
 window.KTGSync={genRoom,genSecret,startHost,startAudience,startController,broadcastHost,sendCommand,stop,isHost,room,validRoom};
})();
