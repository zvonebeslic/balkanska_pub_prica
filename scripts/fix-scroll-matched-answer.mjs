import fs from 'node:fs';

let html=fs.readFileSync('scroll-znanje.html','utf8');
const oldSuccess="fbNote.textContent=doneOk?(currentLang==='en'?'Message sent. Thank you!':'Poruka je poslana. Hvala!'):(currentLang==='en'?'The message could not be sent.':'Poruka nije poslana.');if(doneOk)fbText.value='';";
const newSuccess="if(doneOk){fbNote.innerHTML=currentLang==='en'?'<strong>Thank you for your feedback!</strong><br>Your message has been successfully received and will help us make KvizToGo even better. Thank you for helping us improve!':'<strong>Hvala na povratnim informacijama!</strong><br>Vaša poruka je uspješno zaprimljena i pomoći će nam da KvizToGo bude još bolji. Hvala što sudjelujete u njegovom razvoju!';fbText.value='';window.setTimeout(()=>fbBox.classList.remove('open'),2500);}else{fbNote.textContent=currentLang==='en'?'The message could not be sent. Please try again.':'Poruka nije poslana. Pokušaj ponovno.';}";
if(html.includes(oldSuccess)) html=html.replace(oldSuccess,newSuccess);
else if(!html.includes('Hvala na povratnim informacijama!')) throw new Error('Scroll feedback success tekst nije pronađen');
html=html.replace(/scroll-tracking\.js\?v=[^\"']+/,'scroll-tracking.js?v=20260906-9');
fs.writeFileSync('scroll-znanje.html',html);

let js=fs.readFileSync('scroll-tracking.js','utf8');
const start="  document.addEventListener('scroll-feedback', async e => {";
const end="  document.addEventListener('visibilitychange',()=>{tick();flush();});";
const a=js.indexOf(start), b=js.indexOf(end,a);
if(a<0||b<0) throw new Error('Scroll feedback listener nije pronađen');
const replacement=`  document.addEventListener('scroll-feedback', async e => {\n    const d=e.detail||{}, card=d.card; let ok=false;\n    try {\n      if(!card||!d.message) throw new Error('Nema poruke');\n      const { data: authData } = await client.auth.getUser();\n      const u=authData?.user||null;\n      let username=u?.user_metadata?.username||u?.user_metadata?.display_name||u?.email?.split('@')[0]||(document.documentElement.lang==='en'?'Guest':'Gost');\n      if(u?.id){\n        try{\n          const { data: profile } = await client.from('profiles').select('username').eq('id',u.id).maybeSingle();\n          if(profile?.username) username=profile.username;\n        }catch(_){}\n      }\n      const { data, error } = await client.functions.invoke('send-quiz-feedback',{body:{\n        username,\n        questionId:null,\n        question:card.querySelector('.qt')?.textContent?.trim()||'',\n        correctAnswer:card.dataset.correctAnswer||null,\n        topic:card.dataset.topic||activeTopic,\n        questionType:'scroll',\n        message:d.message,\n        language:document.documentElement.lang==='en'?'en':'hr',\n        pageUrl:location.href\n      }});\n      if(error) throw error;\n      if(!data?.ok) throw new Error(data?.error||'Slanje nije potvrđeno.');\n      ok=true;\n    } catch(err){ console.warn('Scroll feedback:',err); }\n    try{d.done?.(ok)}catch(_){}\n  });\n\n`;
js=js.slice(0,a)+replacement+js.slice(b);
fs.writeFileSync('scroll-tracking.js',js);
