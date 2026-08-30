import { readFileSync, writeFileSync } from 'node:fs';

const appPath='src/App.tsx';
const cssPath='src/qa-fixes.css';
let app=readFileSync(appPath,'utf8');
let css=readFileSync(cssPath,'utf8');

function replaceRequired(label, search, replacement){
  const next=typeof search==='string'?app.replace(search,replacement):app.replace(search,replacement);
  if(next===app) throw new Error(`Final UI polish failed: ${label}`);
  app=next;
}

const confirmDialog=`function ConfirmDialog({open,lang,title,message,danger,onConfirm,onCancel}:{open:boolean;lang:Lang;title?:string;message?:string;danger?:boolean;onConfirm:()=>void;onCancel:()=>void}){if(!open)return null;return <div className='confirmBackdrop' onClick={onCancel}><section className='confirmDialog card' role='dialog' aria-modal='true' aria-labelledby='confirm-title' onClick={e=>e.stopPropagation()}><h2 id='confirm-title'>{title||(lang==='ar'?'تأكيد الإجراء':'Confirm action')}</h2><p>{message||(lang==='ar'?'راجع الإجراء قبل المتابعة.':'Review this action before continuing.')}</p><div className='actions'><button className='secondary' onClick={onCancel}>{lang==='ar'?'إلغاء':'Cancel'}</button><button className={danger?'danger':'primary'} onClick={onConfirm}>{lang==='ar'?'تأكيد':'Confirm'}</button></div></section></div>}
`;
replaceRequired('confirm dialog insertion','function Fingerprints(',confirmDialog+'function Fingerprints(');

replaceRequired(
  'fingerprint state',
  "const [msg,setMsg]=useState('');const load=()=>",
  "const [msg,setMsg]=useState('');const [deleteId,setDeleteId]=useState<string|null>(null);const load=()=>"
);
replaceRequired(
  'fingerprint delete handler',
  /const del=async\(id:string\)=>\{if\(!confirm\([\s\S]*?\);load\(\)\};const startClaim=/,
  "const del=async()=>{if(!deleteId)return;const id=deleteId;setDeleteId(null);const {error}=await supabase.from('product_fingerprints').delete().eq('id',id);if(error){setMsg(lang==='ar'?'تعذر حذف بصمة المنتج الآن.':'Could not delete the product fingerprint right now.');return}load()};const startClaim="
);
replaceRequired(
  'fingerprint delete trigger',
  "onClick={()=>del(x.id)}><Trash2/>",
  "onClick={()=>setDeleteId(x.id)}><Trash2/>"
);
replaceRequired(
  'fingerprint confirmation render',
  "</div></article>)}</div></>}\nfunction Notifications",
  "</div></article>)}</div><ConfirmDialog open={Boolean(deleteId)} lang={lang} danger title={lang==='ar'?'حذف بصمة المنتج':'Delete product fingerprint'} message={lang==='ar'?'سيتم حذف هذه البصمة من حسابك. لا يؤثر ذلك على أي مطالبة أُنشئت منها سابقًا.':'This fingerprint will be removed from your account. Existing claims created from it will not be affected.'} onCancel={()=>setDeleteId(null)} onConfirm={del}/></>}\nfunction Notifications"
);

replaceRequired(
  'notifications component',
  /function Notifications\([\s\S]*?\nfunction EvidencePanel/,
  `function Notifications({lang,userId}:{lang:Lang;userId:string}){const t=dict[lang];const [items,setItems]=useState<any[]>([]);const [busy,setBusy]=useState('');const [error,setError]=useState('');const load=useCallback(async()=>{setError('');const {data,error}=await supabase.from('notifications').select('*').eq('profile_id',userId).order('created_at',{ascending:false}).limit(30);if(error){setError(lang==='ar'?'تعذر تحميل الإشعارات الآن.':'Could not load notifications right now.');return}setItems(data||[])},[userId,lang]);useEffect(()=>{load();const ch=supabase.channel('notes-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:\`profile_id=eq.${'${userId}'}\`},load).subscribe();return()=>{supabase.removeChannel(ch)}},[load,userId]);const unread=items.filter(n=>!n.read_at).length;const markOne=async(n:any,openClaim=false)=>{if(busy)return;setBusy(n.id);setError('');try{if(!n.read_at){const readAt=new Date().toISOString();const {error}=await supabase.from('notifications').update({read_at:readAt}).eq('id',n.id).eq('profile_id',userId);if(error)throw error;setItems(rows=>rows.map(x=>x.id===n.id?{...x,read_at:readAt}:x))}if(openClaim&&n.case_id)go('/claim/'+n.case_id)}catch{setError(lang==='ar'?'تعذر تحديث الإشعار الآن.':'Could not update the notification right now.')}finally{setBusy('')}};const markAll=async()=>{if(!unread||busy)return;setBusy('all');setError('');const readAt=new Date().toISOString();try{const {error}=await supabase.from('notifications').update({read_at:readAt}).eq('profile_id',userId).is('read_at',null);if(error)throw error;setItems(rows=>rows.map(x=>x.read_at?x:{...x,read_at:readAt}))}catch{setError(lang==='ar'?'تعذر تعليم الإشعارات كمقروءة.':'Could not mark notifications as read.')}finally{setBusy('')}};return <><div className='pageHead notificationHead'><div><small>{t.notifications}</small><h1>{t.notifications}</h1><p>{unread?(lang==='ar'?\`${'${unread}'} إشعار غير مقروء\`:\`${'${unread}'} unread notification${'${unread===1?\'\':\'s\'}'}\`):(lang==='ar'?'لا توجد إشعارات جديدة':'You are all caught up')}</p></div>{unread>0&&<button className='secondary' disabled={busy==='all'} onClick={markAll}><Check/>{busy==='all'?(lang==='ar'?'جارٍ التحديث…':'Updating…'):(lang==='ar'?'تعليم الكل كمقروء':'Mark all as read')}</button>}</div>{error&&<div className='card error'>{error}</div>}<div className='card notices notificationList'>{items.length?items.map(n=>{const title=n.type==='evidence_requested'?(lang==='ar'?'طلب التاجر أدلة إضافية':'Merchant requested additional evidence'):n.title;const body=n.type==='evidence_requested'?(lang==='ar'?'طلب التاجر أدلة شراء إضافية لهذه المطالبة.':'The merchant requested additional purchase evidence for this claim.'):n.body;return <article className={n.read_at?'noticeItem':'noticeItem unread'} key={n.id}><div className='noticeIcon'><Bell/></div><div className='noticeContent'><div className='noticeTitleRow'><b>{title}</b>{!n.read_at&&<span className='unreadDot' aria-label={lang==='ar'?'غير مقروء':'Unread'}/>}</div><p>{body}</p><small>{new Date(n.created_at).toLocaleString(lang==='ar'?'ar-IQ':'en')}</small><div className='noticeActions'>{!n.read_at&&<button className='ghost' disabled={busy===n.id} onClick={()=>markOne(n,false)}><Check/>{lang==='ar'?'تعليم كمقروء':'Mark as read'}</button>}{n.case_id&&<button className='secondary' disabled={busy===n.id} onClick={()=>markOne(n,true)}>{lang==='ar'?'فتح المطالبة':'Open claim'}</button>}</div></div></article>}):<div className='noticeEmpty'><Bell/><p>{lang==='ar'?'لا توجد إشعارات حتى الآن. ستظهر هنا تحديثات المطالبات المهمة.':'No notifications yet. Important claim updates will appear here.'}</p></div>}</div></>}
function EvidencePanel`
);

replaceRequired(
  'case action state',
  "const [chatBusy,setChatBusy]=useState(false);const persistChat=",
  "const [chatBusy,setChatBusy]=useState(false);const [confirmAction,setConfirmAction]=useState<{a:string;payload:any}|null>(null);const [actionMsg,setActionMsg]=useState('');const persistChat="
);
replaceRequired(
  'case action implementation',
  /const action=async\(a:string,payload:any=\{\}\)=>\{if\(!confirm\([\s\S]*?\}\};const mkInvite=async\(\)=>\{try\{const d=await fn\('merchant-invite',[\s\S]*?\}\};const claimContext=/,
  `const action=(a:string,payload:any={})=>{setActionMsg('');setConfirmAction({a,payload})};const runConfirmedAction=async()=>{const pending=confirmAction;if(!pending)return;setConfirmAction(null);setActionMsg('');try{await fn('case-action',{caseId:id,action:pending.a,payload:pending.payload});await load();setTimeout(()=>load(),500)}catch(e:any){console.error('case action failed',e);setActionMsg(lang==='ar'?'تعذر تنفيذ الإجراء في حالة المطالبة الحالية. حدّث الصفحة وحاول مرة أخرى.':'Could not perform this action in the current claim state. Refresh and try again.')}};const mkInvite=async()=>{setActionMsg('');try{const d=await fn('merchant-invite',{caseId:id});const url=location.origin+location.pathname+'#'+d.path;setInvite(url)}catch(e:any){console.error('merchant invite failed',e);setActionMsg(lang==='ar'?'تعذر إنشاء دعوة التاجر الآن.':'Could not create the merchant invitation right now.')}};const claimContext=`
);
replaceRequired(
  'case inline error',
  "</div></div><div className='caseLayout'>",
  "</div></div>{actionMsg&&<div className='inlineNotice error'>{actionMsg}</div>}<div className='caseLayout'>"
);
replaceRequired(
  'case confirmation render',
  "</section></div>}</SimpleTop>}\nfunction ClaimReadiness",
  "</section></div>}<ConfirmDialog open={Boolean(confirmAction)} lang={lang} danger={confirmAction?.a==='reject'} title={lang==='ar'?'تأكيد الإجراء':'Confirm action'} message={confirmAction?.a==='reject'?(lang==='ar'?'سيتم تسجيل رفض المطالبة في السجل. تأكد من أن السبب المكتوب واضح قبل المتابعة.':'The rejection will be recorded in the claim history. Make sure the written reason is clear before continuing.'):(lang==='ar'?'سيتم تسجيل هذا الإجراء في سجل المطالبة. هل تريد المتابعة؟':'This action will be recorded in the claim history. Continue?')} onCancel={()=>setConfirmAction(null)} onConfirm={runConfirmedAction}/></SimpleTop>}\nfunction ClaimReadiness"
);

if(/\bconfirm\s*\(|\balert\s*\(/.test(app)) throw new Error('Native confirm/alert still present after final polish');

const extraCss=`
/* Final presentation polish: notifications and in-app confirmations. */
.confirmBackdrop{position:fixed;inset:0;z-index:180;background:#07100b8a;display:grid;place-items:center;padding:18px}.confirmDialog{width:min(460px,100%);box-shadow:0 24px 80px #0005}.confirmDialog h2{margin:0 0 8px}.confirmDialog p{margin:0;color:var(--muted);line-height:1.7}.confirmDialog .actions{margin-top:22px}
.inlineNotice{margin:0 0 18px}.notificationHead p{margin:6px 0 0;color:var(--muted)}.notificationHead>.secondary{flex:none}.notificationList{padding:0;overflow:hidden}.noticeItem{display:grid!important;grid-template-columns:auto minmax(0,1fr);gap:13px!important;padding:18px 20px!important;align-items:flex-start;background:#fff;transition:.15s}.noticeItem.unread{background:#f6fcf8}.noticeIcon{width:38px;height:38px;border-radius:11px;background:var(--mintSoft);color:#287443;display:grid;place-items:center}.noticeIcon svg{width:18px;height:18px}.noticeContent{min-width:0}.noticeTitleRow{display:flex;align-items:center;gap:8px}.noticeTitleRow b{min-width:0;overflow-wrap:anywhere}.unreadDot{width:8px;height:8px;border-radius:999px;background:#3e9b59;flex:none}.noticeActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.noticeActions button{min-height:38px;padding-block:7px}.noticeActions .ghost{border:1px solid var(--border);border-radius:10px;color:var(--text)}.noticeActions svg{width:15px;height:15px}.noticeEmpty{padding:48px 24px;text-align:center;color:var(--muted)}.noticeEmpty>svg{width:42px;height:42px;padding:10px;border-radius:13px;background:var(--mintSoft);color:#287443}.noticeEmpty p{max-width:520px;margin:12px auto 0;line-height:1.7}
@media(max-width:760px){.confirmBackdrop{align-items:end;padding:12px}.confirmDialog{border-radius:18px}.confirmDialog .actions{display:grid;grid-template-columns:1fr 1fr}.notificationHead>.secondary{width:100%}.noticeItem{padding:16px!important}.noticeActions{display:grid;grid-template-columns:1fr}.noticeActions button{width:100%;justify-content:center}}
`;
if(!css.includes('Final presentation polish: notifications and in-app confirmations.')) css+=extraCss;

writeFileSync(appPath,app);
writeFileSync(cssPath,css);
console.log('Final UI polish applied');
