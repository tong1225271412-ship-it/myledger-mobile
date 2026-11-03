/* MyLedger V0.1.4: optional Firebase cloud sync, local-first. */
'use strict';
const firebaseConfig = {
  apiKey: 'AIzaSyBr9CdFpNwMz0N1az-knS65SIm7wQhQkWw',
  authDomain: 'myledger-90b47.firebaseapp.com',
  projectId: 'myledger-90b47',
  storageBucket: 'myledger-90b47.firebasestorage.app',
  messagingSenderId: '46224783256',
  appId: '1:46224783256:web:8edb8d1f7ef1d59d3f5ded'
};
const SDK_VERSION='13.1.0';
const fbase=`https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
let fb, auth, firestore, currentUser=null, unsubscribe=null, snapshotRows=[],snapshotFromServer=false;
let firebaseLoading=null, draining=false, starting=false;
const $ = (id)=>document.getElementById(id);
const bridge = () => window.MyLedgerBridge;
function say(message, mode='idle'){
  const status=$('cloudState');
  if(status)status.textContent=message;
  status?.setAttribute('data-mode',mode);
}
function info(message){const box=$('cloudDetails');if(box)box.textContent=message;}
function humanError(err){
 const codes={
  'auth/invalid-credential':'邮箱或密码不正确。','auth/wrong-password':'密码不正确。',
  'auth/too-many-requests':'登录尝试过多，请稍后重试。',
  'auth/network-request-failed':'网络或 Firebase 连接失败，请检查网络。',
  'auth/operation-not-allowed':'尚未启用 Firebase 邮箱密码登录。',
  'permission-denied':'云端拒绝访问，请检查 Firestore 规则和登录账号。'
 };
 return codes[err?.code] || `${err?.code||'操作失败'}：${err?.message||String(err)}`;
}
function updateButtons(){
 const logged=!!currentUser;
 $('cloudLoginForm').hidden=logged;
 $('cloudLogout').hidden=!logged;
 $('cloudActivate').hidden=!logged || bridge()?.cloudOwner()===currentUser.uid;
 $('cloudSyncNow').hidden=!logged || bridge()?.cloudOwner()!==currentUser.uid;
}
async function library(){
 if(fb)return fb;
 if(firebaseLoading)return firebaseLoading;
 if(!navigator.onLine)throw Error('当前处于离线状态；首次登录云端需要联网。');
 firebaseLoading=Promise.all([
   import(`${fbase}/firebase-app.js`),
   import(`${fbase}/firebase-auth.js`),
   import(`${fbase}/firebase-firestore.js`)
 ]).then(([app,authModule,storeModule])=>{
   const firebaseApp=app.initializeApp(firebaseConfig);
   auth=authModule.getAuth(firebaseApp);
   firestore=storeModule.getFirestore(firebaseApp);
   fb={...authModule,...storeModule};
   fb.onAuthStateChanged(auth,user=>onUserChanged(user).catch(e=>info(humanError(e))));
   return fb;
 }).catch(e=>{firebaseLoading=null;throw e;});
 return firebaseLoading;
}
async function onUserChanged(user){
 if(unsubscribe){unsubscribe();unsubscribe=null;}
 currentUser=user;
 if(!user){snapshotRows=[];snapshotFromServer=false;say('未登录');info('本地记账仍可正常使用。');updateButtons();return;}
 if(!bridge()){info('本地账本尚未初始化，请刷新页面。');return;}
 const old=bridge().cloudOwner();
 if(old && old!==user.uid){
   info('本设备之前连接过另一个 MyLedger 账户。为避免混账，请先切回原账户，并导出 JSON 备份。');
   say('账户不一致','error');updateButtons();return;
 }
 say(old===user.uid?'同步连接中':'已登录 · 待启用','pending');
 info(`已登录：${user.email||'当前账号'}。正在读取云端账目……`);
 updateButtons();
 const ref=fb.collection(firestore,'users',user.uid,'transactions');
 unsubscribe=fb.onSnapshot(ref,{includeMetadataChanges:true},async (snap)=>{
   if(currentUser?.uid!==user.uid)return;
   snapshotFromServer=!snap.metadata.fromCache;
   snapshotRows=snap.docs.map(d=>({...d.data(),uid:d.id})).filter(r=>r.uid&&typeof r.amountCents==='number'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.txnDate));
   const active=bridge().cloudOwner()===user.uid;
   if(active){
     try{await bridge().applyCloudDocs(user.uid,snapshotRows,snapshotFromServer);}
     catch(err){info('云端读取成功，但本地应用记录失败：'+humanError(err));return;}
     say(!snapshotFromServer?'缓存中 · 待联网确认':snap.metadata.hasPendingWrites?'同步中':'已连接 · 已同步',snapshotFromServer?'ok':'pending');
     await reportStatus();
     drain().catch(e=>info(humanError(e)));
   } else {
     say('已登录 · 待启用','pending');
     info(`本机 ${bridge().getRecords().length} 笔，云端 ${snapshotRows.length} 笔${snapshotFromServer?'（已联网确认）':'（暂为缓存）'}。请先备份，再点击“首次启用同步”。`);
   }
 },err=>{say('云连接异常','error');info(humanError(err));});
}
async function reportStatus(){
 const n=(await bridge().readOps()).filter(op=>op.owner===currentUser?.uid).length;
 info(`云端 ${snapshotRows.length} 笔；本机 ${bridge().getRecords().length} 笔；待上传操作 ${n} 项。${!navigator.onLine?'当前离线，将在恢复联网后尝试同步。':n?'正在提交或等待服务器确认。':'当前设备已完成同步队列。'} 同步可能有短暂延迟。`);
}
async function activate(){
 if(!currentUser||!bridge())return;
 if(!snapshotFromServer){alert('还没有从服务器获得完整的云端账本，请确认联网后重试。');return;}
 const owner=currentUser.uid,locals=bridge().getRecords(),remote=snapshotRows;
 const localIds=new Set(locals.map(r=>r.uid)),remoteIds=new Set(remote.map(r=>r.uid));
 if(locals.length&&remote.length&&(
   locals.some(r=>!remoteIds.has(r.uid))||remote.some(r=>!localIds.has(r.uid))
 )){
   alert('为防止同一笔历史消费被重复计算：检测到本机和云端各有不完全相同的账目，本测试版不会自动混合。请先分别导出 JSON/CSV 备份，再指定其中一端作为初次迁移来源。');
   return;
 }
 if(!confirm(`本机 ${locals.length} 笔，云端 ${remote.length} 笔。请先确认已保存 JSON 备份。\n\n${!remote.length?'将把本机账目上传到云端。':'将以同一编号的云端账目连接本机。'}\n\n确定开始吗？`))return;
 bridge().activateOwner(owner);
 updateButtons();
 if(!remote.length&&locals.length){
   await bridge().queueHistory(owner);
   say('正在首次上传','pending');
   await reportStatus();
   drain();
 }else{
   await bridge().applyCloudDocs(owner,remote,true);
   say('云端同步已启用','ok');
   await reportStatus();
 }
}
async function drain(){
 if(draining||!fb||!currentUser||!bridge()||!navigator.onLine)return;
 const owner=currentUser.uid;
 if(bridge().cloudOwner()!==owner)return;
 draining=true;
 try{
   const ops=(await bridge().readOps()).filter(op=>op.owner===owner);
   for(const op of ops){
     if(!navigator.onLine)break;
     const path=fb.doc(firestore,'users',owner,'transactions',op.uid);
     if(op.kind==='delete')await fb.deleteDoc(path);
     else await fb.setDoc(path,{
       uid:op.uid,txnDate:op.payload.txnDate,txnType:op.payload.txnType,
       amountCents:op.payload.amountCents,category:op.payload.category,
       payment:op.payload.payment,note:op.payload.note||'',
       createdAt:op.payload.createdAt,updatedAt:op.payload.updatedAt,
       sourceId:op.payload.sourceId||''
     });
     await bridge().dropOpIfSame(op.uid,op.changedAt);
   }
   if(currentUser?.uid===owner)await reportStatus();
 }catch(err){say('待同步 · 连接异常','error');info('本地账目仍然保留，待网络恢复重试。'+humanError(err));}
 finally{draining=false;}
}
async function login(event){
 event.preventDefault();
 const button=$('cloudLoginForm').querySelector('button[type=submit]');button.disabled=true;
 say('登录连接中','pending');
 try{
   await library();
   await fb.signInWithEmailAndPassword(auth,$('cloudEmail').value.trim(),$('cloudPassword').value);
   $('cloudPassword').value='';
 }catch(err){say('登录未完成','error');info(humanError(err));}
 finally{button.disabled=false;}
}
async function signOut(){
 if(!confirm('退出 Firebase 登录吗？本机已缓存的账目仍会保留。'))return;
 try{await fb.signOut(auth);}catch(err){alert(humanError(err));}
}
function setup(){
 if(starting)return;
 starting=true;
 $('cloudLoginForm')?.addEventListener('submit',login);
 $('cloudActivate')?.addEventListener('click',()=>activate().catch(e=>alert(humanError(e))));
 $('cloudSyncNow')?.addEventListener('click',()=>drain());
 $('cloudLogout')?.addEventListener('click',signOut);
 window.addEventListener('myledger:changed',()=>{if(!navigator.onLine&&currentUser){say('离线 · 待同步','pending');reportStatus().catch(()=>{});}else drain();});
 window.addEventListener('online',()=>{library().then(()=>drain()).catch(e=>info(humanError(e)));});
 window.addEventListener('offline',()=>{if(currentUser&&bridge()?.cloudOwner()===currentUser.uid){say('离线 · 本地保存','pending');reportStatus().catch(()=>{});}});
 const load=()=>{
   if(!bridge())return;
   if(navigator.onLine)library().catch(e=>info('本地记账正常，但云端模块暂不可用：'+humanError(e)));
 };
 if(bridge())load();else window.addEventListener('myledger:ready',load,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
