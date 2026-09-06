import fs from 'node:fs';
const p='scroll-znanje.html';
let t=fs.readFileSync(p,'utf8');
if(t.includes('scroll-tracking.js')) process.exit(0);
const marker='</script></body></html>';
if(!t.includes(marker)) throw new Error('Završetak scroll stranice nije pronađen.');
const insert='</script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="scroll-tracking.js?v=20260906-1"></script></body></html>';
t=t.replace(marker,insert);
fs.writeFileSync(p,t,'utf8');