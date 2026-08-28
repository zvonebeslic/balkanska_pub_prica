from pathlib import Path
p=Path('daily30.js')
s=p.read_text(encoding='utf-8')
old='if(client){void client.rpc("daily30_attach_guest_to_current_user",{p_guest_player_key:`guest:${guestId}`}).then(({error,data})=>{if(!error&&data===true){window.KvizLeaderboards?.reloadRemote?.();window.KvizLeaderboards?.refreshAll?.();}}).catch(()=>{});}'
new='if(client){void client.rpc("daily30_attach_guest_to_current_user",{p_guest_player_key:`guest:${guestId}`}).then(({error,data})=>{if(!error&&data?.ok===true){if(data.results&&typeof data.results==="object")saveResults(data.results);renderCalendar();updateSelectionNote();window.KvizLeaderboards?.reloadRemote?.();window.KvizLeaderboards?.refreshAll?.();}}).catch(()=>{});}'
if s.count(old)!=1: raise SystemExit(f'target count {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
