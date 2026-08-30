import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

const transitions:Record<string,Record<string,string[]>>={
  consumer:{
    submit:['ready'],
    reply_evidence:['evidence_requested'],
    accept_offer:['resolution_offered'],
    decline_offer:['resolution_offered'],
    confirm_refund:['resolved'],
  },
  merchant:{
    view:['submitted'],
    request_evidence:['submitted','merchant_viewed','consumer_replied'],
    offer:['submitted','merchant_viewed','consumer_replied'],
    reject:['submitted','merchant_viewed','consumer_replied'],
  },
};
const targets:Record<string,string>={
  submit:'submitted',
  view:'merchant_viewed',
  request_evidence:'evidence_requested',
  reply_evidence:'consumer_replied',
  offer:'resolution_offered',
  accept_offer:'resolved',
  decline_offer:'submitted',
  reject:'rejected',
  confirm_refund:'closed',
};

const cleanText=(value:unknown,max=2000)=>String(value??'').trim().slice(0,max);

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
  try{
    const auth=req.headers.get('Authorization')??'';
    const url=Deno.env.get('SUPABASE_URL')!;
    const userClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
    const{data:{user}}=await userClient.auth.getUser();
    if(!user||user.is_anonymous===true)throw new Error('Registered account required');

    const{caseId,action,payload={}}=await req.json();
    if(typeof caseId!=='string'||!caseId)throw new Error('Case ID is required');
    if(typeof action!=='string'||!targets[action])throw new Error('Unsupported action');

    const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const{data:record,error:recordError}=await service.from('cases').select('id,status,version,consumer_id,merchant_id').eq('id',caseId).single();
    if(recordError)throw new Error(`Case load failed: ${recordError.message}`);
    if(!record)throw new Error('Case not found');

    const{data:profile}=await service.from('profiles').select('role').eq('id',user.id).single();
    let role=record.consumer_id===user.id?'consumer':null;
    if(profile?.role==='merchant'){
      const{data:membership}=await service.from('case_members').select('id').eq('case_id',caseId).eq('profile_id',user.id).is('revoked_at',null).maybeSingle();
      if(membership)role='merchant';
    }
    if(!role||!transitions[role]?.[action]?.includes(record.status))throw new Error('Action is not permitted in the current case state');

    const next=targets[action];
    const safePayload={...payload};

    if(action==='offer'){
      const kind=String(payload.kind??'');
      if(!['full_refund','partial_refund','replacement','other'].includes(kind))throw new Error('Invalid offer kind');
      const note=cleanText(payload.note);
      if(String(payload.note??'').trim().length>2000)throw new Error('Offer note is too long');

      const{data:transaction,error:transactionError}=await service.from('transactions').select('amount,currency').eq('case_id',caseId).order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(transactionError)throw new Error('Could not validate the purchase amount');
      if(!transaction)throw new Error('Purchase transaction is missing');

      let amount:null|number=null;
      if(kind==='partial_refund'){
        amount=Number(payload.amount);
        if(!Number.isFinite(amount)||amount<=0)throw new Error('A positive partial refund amount is required');
        if(amount>Number(transaction.amount))throw new Error('Partial refund cannot exceed the purchase amount');
      }
      safePayload.kind=kind;
      safePayload.amount=amount;
      safePayload.currency=transaction.currency;
      safePayload.note=note;
      const{error:offerError}=await service.from('resolution_offers').insert({
        case_id:caseId,
        merchant_id:record.merchant_id,
        kind,
        amount,
        currency:transaction.currency,
        note,
      });
      if(offerError)throw offerError;
    }

    if(action==='request_evidence'||action==='reject'){
      const message=cleanText(payload.message);
      if(message.length<3)throw new Error(action==='reject'?'A written rejection reason is required':'A specific evidence request is required');
      if(String(payload.message??'').trim().length>2000)throw new Error('Message is too long');
      safePayload.message=message;
      const{error:responseError}=await service.from('merchant_responses').insert({
        case_id:caseId,
        merchant_id:record.merchant_id,
        response_type:action==='reject'?'rejection':'evidence_request',
        message,
      });
      if(responseError)throw responseError;
    }

    if(action==='accept_offer'||action==='decline_offer'){
      const status=action==='accept_offer'?'accepted':'declined';
      const{error:offerUpdateError}=await service.from('resolution_offers').update({status,responded_at:new Date().toISOString()}).eq('case_id',caseId).eq('status','pending');
      if(offerUpdateError)throw offerUpdateError;
    }
    if(action==='confirm_refund'){
      const{error:refundError}=await service.from('resolution_offers').update({refund_received_at:new Date().toISOString()}).eq('case_id',caseId).eq('status','accepted');
      if(refundError)throw refundError;
    }

    const{data:updated,error:updateError}=await service.from('cases').update({
      status:next,
      version:record.version+1,
      updated_at:new Date().toISOString(),
      ...(next==='resolved'?{resolved_at:new Date().toISOString()}:{}),
    }).eq('id',caseId).eq('version',record.version).select().single();
    if(updateError||!updated)throw new Error('Case changed; refresh and try again');

    const label=cleanText(payload.label??action.replaceAll('_',' '),160)||action.replaceAll('_',' ');
    safePayload.label=label;
    const{error:eventError}=await service.from('case_events').insert({
      case_id:caseId,
      actor_profile_id:user.id,
      actor_role:role,
      event_type:action,
      from_status:record.status,
      to_status:next,
      payload:safePayload,
    });
    if(eventError)console.error('case event insert failed after state update',eventError);

    const recipient=role==='merchant'
      ?record.consumer_id
      :(await service.from('case_members').select('profile_id').eq('case_id',caseId).eq('role','merchant').is('revoked_at',null).maybeSingle()).data?.profile_id;
    if(recipient){
      const notification=action==='request_evidence'
        ?{type:'evidence_requested',title:'Merchant requested additional evidence',body:'The merchant requested additional purchase evidence for this case.'}
        :{type:action,title:label,body:cleanText(payload.detail??`Case status changed to ${next.replaceAll('_',' ')}.`,500)};
      const{error:notificationError}=await service.from('notifications').insert({profile_id:recipient,case_id:caseId,...notification});
      if(notificationError)console.error('notification insert failed after state update',notificationError);
    }

    return Response.json({ok:true,status:next},{headers:cors});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:'Request failed'},{status:400,headers:cors});
  }
});
