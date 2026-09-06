import fs from 'node:fs';
const path='scroll-tracking.js';
let s=fs.readFileSync(path,'utf8');
s=s.replace("  async function start(topic) {","  async function start(topic, sharedEntry = false) {");
s=s.replace("share_clicks:0}).select('id').single();","share_clicks:0,shared_question_entry:sharedEntry}).select('id').single();");
s=s.replace("  else if(p.get('shared'))start('Podijeljeno pitanje');","  else if(p.get('q')||p.get('shared'))start('Podijeljeno pitanje', true);");
fs.writeFileSync(path,s);
