from pathlib import Path
p=Path('daily30.js')
s=p.read_text(encoding='utf-8')
old='function setPlayerContext(identity){if(!identity||typeof identity!=="object")return;let guestId=null;if(identity.isGuest){try{const saved=JSON.parse(localStorage.getItem(GUEST_IDENTITY_KEY)||"null");guestId=saved?.id||null;}catch(_){}}state.playerContext={isGuest:Boolean(identity.isGuest),userId:identity.userId||null,guestId,name:String(identity.isGuest?(getCustomGuestName()||""):(identity.name||"")).trim().slice(0,40)};try{localStorage.setItem(PLAYER_CONTEXT_KEY,JSON.stringify(state.playerContext));}catch(_){}}'
new='function setPlayerContext(identity){if(!identity||typeof identity!=="object")return;let guestId=null;try{const saved=JSON.parse(localStorage.getItem(GUEST_IDENTITY_KEY)||"null");guestId=saved?.id||null;}catch(_){}state.playerContext={isGuest:Boolean(identity.isGuest),userId:identity.userId||null,guestId:identity.isGuest?guestId:null,name:String(identity.isGuest?(getCustomGuestName()||""):(identity.name||"")).trim().slice(0,40)};try{localStorage.setItem(PLAYER_CONTEXT_KEY,JSON.stringify(state.playerContext));}catch(_){}if(!identity.isGuest&&identity.userId&&guestId){let client=null;try{client=typeof supabaseClient!=="undefined"?supabaseClient:null;}catch(_){}if(client){void client.rpc("daily30_attach_guest_to_current_user",{p_guest_player_key:`guest:${guestId}`}).then(({error,data})=>{if(!error&&data===true){window.KvizLeaderboards?.reloadRemote?.();window.KvizLeaderboards?.refreshAll?.();}}).catch(()=>{});}}}'
if s.count(old)!=1:
    raise SystemExit(f'setPlayerContext target count {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('patched daily30.js only')
