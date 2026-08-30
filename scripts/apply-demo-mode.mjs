import fs from 'node:fs';

const path='src/App.tsx';
let s=fs.readFileSync(path,'utf8');
const start=s.indexOf('function AuthPage(');
const end=s.indexOf('\nfunction Shell(',start);
if(start<0||end<0) throw new Error('AuthPage markers not found');

const auth=`function AuthPage({lang,toggle,session}:{lang:Lang;toggle:()=>void;session:Session|null}){
 const t=dict[lang];
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [role,setRole]=useState<'consumer'|'merchant'>(()=>sessionStorage.getItem('rr-auth-role')==='merchant'?'merchant':'consumer');
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(session){sessionStorage.removeItem('rr-auth-role');const next=sessionStorage.getItem('rr-next');if(next){sessionStorage.removeItem('rr-next');go(next)}else go('/dashboard')}},[session]);
 const submit=async(e:FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setMsg('');try{const {data,error}=await supabase.functions.invoke('demo-login',{body:{role,email:email.trim(),password}});if(error||!data?.session?.access_token||!data?.session?.refresh_token)throw error||new Error('DEMO_LOGIN_FAILED');const {error:setError}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});if(setError)throw setError}catch(error){console.error('demo login failed',error);setMsg(lang==='ar'?'تعذر فتح الحساب التجريبي الآن. حاول مرة أخرى.':'Could not open demo access right now. Try again.')}finally{setBusy(false)}};
 return <div className='auth'><div className='authTop'><Brand/><button className='ghost' onClick={toggle}><Globe2/>{t.language}</button></div><form className='card authCard' onSubmit={submit}><h1>{lang==='ar'?'دخول تجريبي':'Demo access'}</h1><p className='accountTypeNote'>{lang==='ar'?'اختر نوع الحساب ثم اكتب أي بريد إلكتروني وأي كلمة مرور. حساب المستهلك وحساب التاجر منفصلان بالكامل.':'Choose an account type, then enter any email and any password. Consumer and merchant use completely separate demo identities.'}</p><div className='rolePicker'><button type='button' className={'roleChoice '+(role==='consumer'?'active':'')} onClick={()=>setRole('consumer')}><b>{lang==='ar'?'مستهلك':'Consumer'}</b><small>{lang==='ar'?'ينشئ المطالبات ويتابعها':'Creates and follows claims'}</small></button><button type='button' className={'roleChoice '+(role==='merchant'?'active':'')} onClick={()=>setRole('merchant')}><b>{lang==='ar'?'تاجر':'Merchant'}</b><small>{lang==='ar'?'يستقبل المطالبات ويرد عليها':'Receives and responds to claims'}</small></button></div><label>{lang==='ar'?'البريد الإلكتروني':'Email'}<input dir='ltr' type='email' value={email} onChange={e=>setEmail(e.target.value)} required autoComplete='off' placeholder={role==='merchant'?'merchant@example.com':'consumer@example.com'}/></label><label>{lang==='ar'?'كلمة المرور':'Password'}<input dir='ltr' type='password' value={password} onChange={e=>setPassword(e.target.value)} required minLength={1} autoComplete='off' placeholder={lang==='ar'?'أي كلمة مرور':'Any password'}/></label>{msg&&<p className='error'>{msg}</p>}<button className='primary wide' disabled={busy||!email.trim()||!password}>{busy?t.loading:(role==='merchant'?(lang==='ar'?'دخول كتاجر':'Enter as merchant'):(lang==='ar'?'دخول كمستهلك':'Enter as consumer'))}</button></form></div>}
`;

s=s.slice(0,start)+auth+s.slice(end);
s=s.replace("<div className='webmcpTestNote'><b>{lang==='ar'?'للتجربة في المسابقة':'Hackathon testing'}</b><span>{lang==='ar'?'افتح الموقع في متصفح ChatGPT الداخلي أو Chrome 149+ مع WebMCP مفعّل، سجّل الدخول وافتح مطالبة. تظهر الأدوات تلقائيًا حسب دور الحساب.':'Open the site in ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled, sign in, and open a claim. Tools are registered automatically for the current account role.'}</span></div>","<div className='webmcpTestNote'><b>{lang==='ar'?'دعم WebMCP في المتصفح':'WebMCP browser support'}</b><span>{lang==='ar'?'في المتصفح الذي يدعم WebMCP، سجّل الدخول وافتح مطالبة لتظهر الأدوات تلقائيًا حسب نوع الحساب وحالة المطالبة.':'In a WebMCP-capable browser, sign in and open a claim. Tools are registered automatically for the current account role and claim state.'}</span></div>");
if(/Hackathon testing|للتجربة في المسابقة/.test(s)) throw new Error('Competition text still present in product UI');
fs.writeFileSync(path,s);
console.log('Demo access UI applied');
