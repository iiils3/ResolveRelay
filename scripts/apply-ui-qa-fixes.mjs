import { readFileSync, writeFileSync } from 'node:fs';

const appPath = 'src/App.tsx';
const mainPath = 'src/main.tsx';
const cssPath = 'src/qa-fixes.css';
let app = readFileSync(appPath, 'utf8');
let main = readFileSync(mainPath, 'utf8');

function replaceRequired(label, search, replacement) {
  const next = typeof search === 'string' ? app.replace(search, replacement) : app.replace(search, replacement);
  if (next === app) throw new Error(`UI QA transform failed: ${label}`);
  app = next;
}

replaceRequired(
  'shell navigation',
  /function Shell\([\s\S]*?\nfunction Dashboard/,
  `function Shell({lang,toggle,session,profile,path}:{lang:Lang;toggle:()=>void;session:Session;profile:any;path:string}){const t=dict[lang];const [menu,setMenu]=useState(false);const merchant=profile?.role==='merchant';const nav=(p:string)=>{go(p);setMenu(false)};const active=(p:string)=>p==='/dashboard'?(path==='/dashboard'||path==='/'||(!['/notifications','/support','/new-case','/new-claim','/fingerprints'].includes(path))):path===p;return <div className='shell'><button className='mobileMenu' aria-label={menu?(lang==='ar'?'إغلاق القائمة':'Close menu'):(lang==='ar'?'فتح القائمة':'Open menu')} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>{menu&&<button className='menuBackdrop' aria-label={lang==='ar'?'إغلاق القائمة':'Close menu'} onClick={()=>setMenu(false)}/>}<aside className={'sidebar '+(menu?'open':'')}><Brand/><nav><button className={active('/dashboard')?'active':''} onClick={()=>nav('/dashboard')}>{t.dashboard}</button>{!merchant&&<button className={active('/new-claim')?'active':''} onClick={()=>nav('/new-claim')}><Plus/>{t.newCase}</button>}<button className={active('/notifications')?'active':''} onClick={()=>nav('/notifications')}><Bell/>{t.notifications}</button>{!merchant&&<button className={active('/fingerprints')?'active':''} onClick={()=>nav('/fingerprints')}><Fingerprint/>{t.fingerprints}</button>}<button className={active('/support')?'active':''} onClick={()=>nav('/support')}>{lang==='ar'?'الدعم والمساعدة':'Support & help'}</button></nav><div className='sideFoot'><div className='accountIdentity'><small>{profile?.display_name||session.user.email||'User'}</small><span className='roleTag'>{merchant?(lang==='ar'?'حساب تاجر':'Merchant account'):(lang==='ar'?'حساب مستهلك':'Consumer account')}</span></div><button onClick={toggle}><Globe2/>{t.language}</button><button onClick={async()=>{await supabase.auth.signOut();go('/')}}><LogOut/>{t.logout}</button></div></aside><main className='appMain'>{path==='/notifications'?<Notifications lang={lang} userId={session.user.id}/>:path==='/support'?<SupportPage lang={lang}/>:merchant?<Dashboard lang={lang} userId={session.user.id} role='merchant'/>:(path==='/new-case'||path==='/new-claim')?<NewCase lang={lang}/>:path==='/fingerprints'?<Fingerprints lang={lang} userId={session.user.id}/>:<Dashboard lang={lang} userId={session.user.id} role='consumer'/>}</main></div>}
function Dashboard`
);

replaceRequired(
  'new claim friendly error',
  `}catch(e:any){setError(e.message)}finally{setBusy(false)}};return <><div className='pageHead'>`,
  `}catch(e:any){console.error('create claim failed',e);setError(lang==='ar'?'تعذر إنشاء المطالبة. تحقق من الحقول والاتصال ثم حاول مرة أخرى.':'Could not create the claim. Check the fields and your connection, then try again.')}finally{setBusy(false)}};return <><div className='pageHead'>`
);

replaceRequired(
  'fingerprint delete aria label',
  `<button className='danger' onClick={()=>del(x.id)}><Trash2/></button>`,
  `<button className='danger' aria-label={lang==='ar'?'حذف بصمة المنتج':'Delete product fingerprint'} onClick={()=>del(x.id)}><Trash2/></button>`
);

replaceRequired(
  'merchant actions',
  /function MerchantActions\([\s\S]*?\nfunction InvitePage/,
  `function MerchantActions({lang,c,action}:{lang:Lang;c:CaseRow;action:(a:string,p?:any)=>void}){const t=dict[lang];const [msg,setMsg]=useState('');const [kind,setKind]=useState('full_refund');const [amount,setAmount]=useState('');const partial=kind==='partial_refund';const validAmount=!partial||Number(amount)>0;return <div className='card merchantBox'><h2>{t.merchantActions}</h2><label className='merchantActionField'>{lang==='ar'?'رسالة أو ملاحظة':'Message or note'}<textarea placeholder={lang==='ar'?'اكتب سبب طلب الدليل أو تفاصيل العرض أو سبب الرفض…':'Explain the evidence request, offer details, or rejection reason…'} value={msg} onChange={e=>setMsg(e.target.value)}/></label><button className='secondary wide' disabled={!msg.trim()} onClick={()=>action('request_evidence',{message:msg.trim(),label:'Evidence requested'})}>{t.requestEvidence}</button><label className='merchantActionField'>{lang==='ar'?'نوع الحل':'Resolution type'}<select value={kind} onChange={e=>{setKind(e.target.value);if(e.target.value!=='partial_refund')setAmount('')}}><option value='full_refund'>{t.full_refund}</option><option value='partial_refund'>{t.partial_refund}</option><option value='replacement'>{t.replacement}</option><option value='other'>{t.other}</option></select></label>{partial&&<label className='merchantActionField'>{lang==='ar'?'مبلغ الاسترداد الجزئي':'Partial refund amount'}<div className='amountWithCurrency'><input type='number' min='0.01' step='0.01' value={amount} onChange={e=>setAmount(e.target.value)} placeholder='0.00'/><span>{c.transactions?.[0]?.currency||'USD'}</span></div></label>}<button className='primary wide' disabled={!validAmount} onClick={()=>action('offer',{kind,note:msg.trim(),currency:c.transactions?.[0]?.currency||'USD',amount:partial?Number(amount):null,label:'Resolution offered'})}>{t.offer}</button><button className='danger wide' disabled={!msg.trim()} onClick={()=>action('reject',{message:msg.trim(),label:'Claim rejected'})}>{t.reject}</button>{!msg.trim()&&<small className='fieldHint'>{lang==='ar'?'اكتب رسالة قبل طلب دليل أو رفض المطالبة. ملاحظة العرض تبقى اختيارية.':'Write a message before requesting evidence or rejecting the claim. An offer note remains optional.'}</small>}</div>}
function InvitePage`
);

const evidenceComponent = `function EvidencePanel({lang,c,consumer,onChanged}:{lang:Lang;c:CaseRow;consumer:boolean;onChanged:()=>void}){const [busy,setBusy]=useState('');const [msg,setMsg]=useState('');const openEvidence=async(evidenceId:string)=>{setBusy(evidenceId);setMsg('');try{const d=await fn('evidence-url',{evidenceId});if(!d?.url)throw new Error('missing url');window.open(d.url,'_blank','noopener,noreferrer')}catch{setMsg(lang==='ar'?'تعذر فتح الدليل الآن. حاول مرة أخرى.':'Could not open the evidence right now. Try again.')}finally{setBusy('')}};const upload=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setMsg('');if(file.size>10*1024*1024){setMsg(lang==='ar'?'حجم الملف يجب ألا يتجاوز 10 MB.':'File size must not exceed 10 MB.');e.target.value='';return}setBusy('upload');try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('not signed in');const path=\`${'${user.id}'}/${'${c.id}'}/${'${crypto.randomUUID()}'}-${'${file.name}'}\`;const up=await supabase.storage.from('case-evidence').upload(path,file);if(up.error)throw up.error;const ins=await supabase.from('evidence').insert({case_id:c.id,file_name:file.name,file_size:file.size,mime_type:file.type||'application/octet-stream',storage_path:path,uploaded_by:user.id,category:'purchase_proof',merchant_visible:true});if(ins.error){await supabase.storage.from('case-evidence').remove([path]);throw ins.error}setMsg(lang==='ar'?'تم إرفاق الدليل بنجاح.':'Evidence attached successfully.');e.target.value='';onChanged()}catch(error){console.error('evidence upload failed',error);setMsg(lang==='ar'?'تعذر رفع الدليل. تحقق من الملف والاتصال ثم حاول مرة أخرى.':'Could not upload the evidence. Check the file and connection, then try again.')}finally{setBusy('')}};return <div className='card evidencePanel'><div className='sectionTitleRow'><div><h2>{lang==='ar'?'الأدلة المرفقة':'Attached evidence'}</h2><p>{lang==='ar'?'الملفات الخاصة بالمطالبة تُفتح برابط مؤقت وآمن.':'Claim files open through a temporary secure link.'}</p></div><span className='countBadge'>{c.evidence?.length||0}</span></div>{c.evidence?.length?<div className='evidenceList'>{c.evidence.map(x=><div className='evidenceItem' key={x.id}><div><FileText/><span>{x.file_name}</span></div><button className='secondary' disabled={busy===x.id} onClick={()=>openEvidence(x.id)}>{busy===x.id?(lang==='ar'?'جارٍ الفتح…':'Opening…'):(lang==='ar'?'فتح الدليل':'Open evidence')}</button></div>)}</div>:<p className='emptyInline'>{lang==='ar'?'لا يوجد دليل مرفق حتى الآن.':'No evidence is attached yet.'}</p>}{consumer&&<label className='evidenceUpload'>{lang==='ar'?'إضافة دليل':'Add evidence'}<input type='file' accept='image/*,application/pdf' disabled={busy==='upload'} onChange={upload}/><small>{lang==='ar'?'صور أو PDF، بحد أقصى 10 MB للملف.':'Images or PDF, up to 10 MB per file.'}</small></label>}{msg&&<p className={msg.includes('بنجاح')||msg.includes('successfully')?'successMsg':'error'}>{msg}</p>}</div>}
`;
replaceRequired('evidence panel insertion', 'function CasePage(', evidenceComponent + 'function CasePage(');

replaceRequired(
  'friendly case action error',
  `catch(e:any){alert(e.message)}};const mkInvite=async()=>{try{const d=await fn('merchant-invite',{caseId:id});const url=location.origin+location.pathname+'#'+d.path;setInvite(url)}catch(e:any){alert(e.message)}};`,
  `catch(e:any){console.error('case action failed',e);alert(lang==='ar'?'تعذر تنفيذ الإجراء في حالة المطالبة الحالية. حدّث الصفحة وحاول مرة أخرى.':'Could not perform this action in the claim\'s current state. Refresh and try again.')}};const mkInvite=async()=>{try{const d=await fn('merchant-invite',{caseId:id});const url=location.origin+location.pathname+'#'+d.path;setInvite(url)}catch(e:any){console.error('merchant invite failed',e);alert(lang==='ar'?'تعذر إنشاء دعوة التاجر الآن.':'Could not create the merchant invitation right now.')}};`
);

replaceRequired(
  'case header navigation',
  `<small dir='ltr'>{c.id}</small></div></div><div className='caseLayout'>`,
  `<small dir='ltr'>{c.id}</small></div><div className='caseHeadActions'><button className='secondary caseBackBtn' onClick={()=>go('/dashboard')}><ChevronLeft/>{lang==='ar'?'لوحة التحكم':'Dashboard'}</button></div></div><div className='caseLayout'>`
);

replaceRequired(
  'transaction passport fields',
  `<div className='passportGrid'><Row a={t.merchant} b={txn?.merchant_name||'—'}/><Row a={t.order} b={txn?.order_id||'—'}/><Row a={t.product} b={txn?.product_service||'—'}/><Row a={t.amount} b={txn?\`${'${txn.amount}'} ${'${txn.currency}'}\`:'—'}/><Row a={t.resolution} b={t[c.requested_resolution]||c.requested_resolution}/></div>`,
  `<div className='passportGrid'><Row a={t.consumerName} b={txn?.consumer_name||'—'}/><Row a={t.merchant} b={txn?.merchant_name||'—'}/><Row a={t.order} b={txn?.order_id||'—'}/><Row a={t.product} b={txn?.product_service||'—'}/><Row a={t.amount} b={txn?\`${'${txn.amount}'} ${'${txn.currency}'}\`:'—'}/><Row a={t.purchase} b={txn?.purchase_date?new Date(txn.purchase_date+'T00:00:00').toLocaleDateString(lang==='ar'?'ar-IQ':'en'):'—'}/><Row a={t.promised} b={txn?.promised_delivery_date?new Date(txn.promised_delivery_date+'T00:00:00').toLocaleDateString(lang==='ar'?'ar-IQ':'en'):'—'}/><Row a={t.resolution} b={t[c.requested_resolution]||c.requested_resolution}/><Row a={t.status} b={statusLabel(effectiveStatus,t)}/></div>`
);

replaceRequired(
  'evidence panel placement',
  `<div className='card'><h2>{t.description}</h2><p>{c.description}</p></div>{consumer&&<ClaimReadiness`,
  `<div className='card'><h2>{t.description}</h2><p className='claimDescription'>{c.description}</p></div><EvidencePanel lang={lang} c={c} consumer={consumer} onChanged={load}/>{consumer&&<ClaimReadiness`
);

replaceRequired(
  'chat keyboard shortcut',
  `<textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder={t.chatPlaceholder}/><button className='primary' disabled={chatBusy||!chatInput.trim()} onClick={sendChat}>`,
  `<textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendChat()}}} placeholder={t.chatPlaceholder}/><button className='primary' disabled={chatBusy||!chatInput.trim()} onClick={sendChat}>`
);

if (!main.includes("./qa-fixes.css")) {
  main = main.replace("import './index.css';", "import './index.css';\nimport './qa-fixes.css';");
}

const css = `
/* UI/UX hardening layered after resolverelay.css. */
:focus-visible{outline:3px solid #5fcf82;outline-offset:3px}
.sidebar nav button.active{background:var(--forest2);color:#fff;box-shadow:inset 3px 0 0 var(--mint)}
[dir=rtl] .sidebar nav button.active{box-shadow:inset -3px 0 0 var(--mint)}
.menuBackdrop{display:none}
.caseHeadActions{display:flex;align-items:center;gap:8px;flex:none}.caseBackBtn svg{width:18px;height:18px}[dir=rtl] .caseBackBtn svg{transform:scaleX(-1)}
.caseLayout>section,.caseLayout>aside{min-width:0}.caseLayout aside{display:grid;gap:18px}
.passportGrid .row{min-width:0;align-items:flex-start}.passportGrid .row span{flex:0 0 auto}.passportGrid .row b{text-align:end;overflow-wrap:anywhere;min-width:0}
.claimDescription{white-space:pre-wrap;line-height:1.75;overflow-wrap:anywhere}
.productLink{display:grid;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}.productLink span{font-size:12px;color:var(--muted);font-weight:700}.productLink a{overflow-wrap:anywhere;font-size:13px}
.sectionTitleRow{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.sectionTitleRow h2{margin:0 0 5px}.sectionTitleRow p{margin:0;color:var(--muted);line-height:1.6}.countBadge{display:grid;place-items:center;min-width:32px;height:32px;border-radius:999px;background:var(--mintSoft);color:#287443;font-weight:800}
.evidencePanel{display:grid;gap:16px}.evidenceList{display:grid;gap:9px}.evidenceItem{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--border);border-radius:12px;padding:11px 12px;background:#fbfdfb}.evidenceItem>div{display:flex;align-items:center;gap:9px;min-width:0}.evidenceItem svg{width:18px;height:18px;flex:none;color:#3e9b59}.evidenceItem span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.evidenceUpload{display:grid;gap:7px;font-size:12px;font-weight:700}.evidenceUpload small,.fieldHint{color:var(--muted);line-height:1.55}.emptyInline{margin:0;color:var(--muted)}.successMsg{margin:0;background:var(--mintSoft);color:#287443;border-radius:10px;padding:10px 12px}
.merchantActionField{display:grid;gap:7px;font-size:12px;font-weight:700}.amountWithCurrency{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}.amountWithCurrency span{min-width:58px;text-align:center;border:1px solid var(--border);border-radius:12px;padding:14px 10px;background:#f7faf8;font-weight:800}
.packageResult{display:grid;gap:10px;margin-top:14px}.packageResult pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.7;background:#f7faf8;border:1px solid var(--border);border-radius:12px;padding:14px}
.supportResults{display:grid;gap:14px;margin-top:16px}.supportResults>div{display:grid;gap:7px}.supportResults a{overflow-wrap:anywhere}.supportEmail{display:grid;gap:3px}.supportEmail small{color:var(--muted)}
.readinessHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.readinessHead h2{margin:0 0 6px}.readinessHead p{margin:0;color:var(--muted);line-height:1.6}.readinessHead strong{font-size:24px}.readinessBar{height:8px;background:#edf3ef;border-radius:999px;overflow:hidden;margin:14px 0}.readinessBar span{display:block;height:100%;background:var(--mint);border-radius:inherit}.readinessChecks{display:flex;gap:8px;flex-wrap:wrap}.readinessChecks span{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);border-radius:999px;padding:6px 9px;font-size:11px;color:var(--muted)}.readinessChecks span.done{background:var(--mintSoft);color:#287443;border-color:#cce9d5}.readinessChecks svg{width:14px;height:14px}.optionalEvidence{display:grid;gap:8px;margin-top:14px}.optionalEvidence>b{font-size:12px}
.notices article>div,.timeline article div{min-width:0}.notices b,.notices p,.timeline b{overflow-wrap:anywhere}
.chatComposer .primary{min-width:104px}.aiDrawer{padding-bottom:max(22px,env(safe-area-inset-bottom))}.drawerHistory{scrollbar-gutter:stable}.aiDrawer .chatComposer textarea{color:var(--text)}
.fingerprintActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fingerprintActions .secondary{flex:1}.fingerprintActions .danger{flex:none}
@media(max-width:760px){.menuBackdrop{display:block;position:fixed;inset:0;z-index:29;border:0;background:#07100b70}.caseHead{flex-direction:column;align-items:stretch}.caseHeadActions,.caseBackBtn{width:100%}.caseBackBtn{justify-content:center}.passportGrid .row{gap:10px}.passportGrid .row span{max-width:46%}.passportGrid .row b{max-width:54%}.evidenceItem{align-items:stretch;flex-direction:column}.evidenceItem .secondary{width:100%}.evidenceItem span{white-space:normal;overflow-wrap:anywhere}.sectionTitleRow{align-items:flex-start}.amountWithCurrency{grid-template-columns:1fr}.amountWithCurrency span{width:100%}.readinessHead{align-items:center}.chatComposer .primary{min-width:0}.fingerprintActions{display:grid;grid-template-columns:1fr auto}.simple{padding-inline:16px}.simple .brand{font-size:18px}}
`;

writeFileSync(appPath, app);
writeFileSync(mainPath, main);
writeFileSync(cssPath, css.trimStart());
console.log('UI QA fixes applied');
