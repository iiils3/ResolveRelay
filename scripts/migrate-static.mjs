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

const workflow = `name: Build ResolveRelay\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - name: Install locked dependencies\n        run: npm ci --no-audit --no-fund\n      - name: Typecheck\n        run: npm run typecheck\n      - name: Build frontend\n        run: npm run build\n      - name: Validate WebMCP registration exists\n        run: grep -q 'modelContext' src/App.tsx && grep -q 'registerTool' src/App.tsx\n      - name: Validate AI relay source exists\n        run: test -f supabase/functions/ai-relay/index.ts\n      - name: Audit production dependencies\n        run: npm audit --omit=dev --audit-level=high\n`;
fs.writeFileSync('.github/workflows/build.yml', workflow);

if (fs.existsSync('server.mjs')) fs.rmSync('server.mjs');
fs.rmSync('.github/workflows/migrate-static.yml');
fs.rmSync('scripts/migrate-static.mjs');
try { fs.rmdirSync('scripts'); } catch {}
