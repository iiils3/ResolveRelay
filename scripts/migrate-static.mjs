import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
const start = app.indexOf('const parseApiResponse=');
const end = app.indexOf('type Lang=');
if (start < 0 || end < 0 || end <= start) throw new Error('Could not locate legacy API helper');
const replacement = `const api={post:async(path:string,body?:unknown)=>{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('AUTH_REQUIRED');const route=path.replace(/^\\/api\\//,'');const {data,error}=await supabase.functions.invoke('ai-relay',{body:{route,payload:body??{}}});if(error)throw error;if(data?.error)throw new Error(data.error);return {data}}};\n`;
app = app.slice(0, start) + replacement + app.slice(end);
fs.writeFileSync(appPath, app);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.scripts.start;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

if (fs.existsSync('server.mjs')) fs.rmSync('server.mjs');
fs.rmSync('scripts/migrate-static.mjs');
try { fs.rmdirSync('scripts'); } catch {}
