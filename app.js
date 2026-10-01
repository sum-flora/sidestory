(() => {
'use strict';
const data=window.STORY_DATA;
const byId=id=>document.getElementById(id);
const screens=['login','card-screen','quote-screen','game'];
let pendingScroll=null;
const state={node:null,queue:[],index:0,phase:'idle',next:'',busy:false,epoch:0};
function el(tag,className,text){const item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
function showScreen(id){screens.forEach(s=>byId(s).hidden=s!==id);window.scrollTo({top:0,behavior:'instant'});}
function card(){
 const c=data.card,wrap=el('article','employee-card');wrap.setAttribute('aria-label',c.title);
 const title=el('h3','employee-card-title');title.append(el('span','card-seal','缉'),document.createTextNode(c.title));wrap.append(title);
 const content=el('div','card-content');const photo=el('img','employee-photo');photo.src='./assets/fufu.png';photo.alt='付馥的工卡照片';photo.width=252;photo.height=424;
 const info=el('div','employee-info');info.append(el('p','employee-name-label','员工姓名'),el('h4','employee-name',c.name));const fields=el('dl','employee-fields');
 for(const [label,value] of [['编号',c.number],['部门',c.department],['岗位／职称',c.job]]){const row=el('div');row.append(el('dt','',label),el('dd',label==='编号'?'employee-number':'',value));fields.append(row);}
 info.append(fields);content.append(photo,info);wrap.append(content,el('div','card-bottom-line'));return wrap;
}
byId('entry-card').append(card());byId('modal-card').append(card());byId('opening-quote').textContent=data.quote;
byId('login-form').addEventListener('submit',e=>{e.preventDefault();const input=byId('employee-name');const name=input.value.trim();if(name!==data.card.name){input.setAttribute('aria-invalid','true');byId('login-error').textContent=name?'未找到该员工，请确认姓名。':'请先输入员工姓名。';input.focus();return;}input.removeAttribute('aria-invalid');byId('login-error').textContent='';showScreen('card-screen');byId('start-game').focus({preventScroll:true});});
byId('employee-name').addEventListener('input',()=>{byId('login-error').textContent='';byId('employee-name').removeAttribute('aria-invalid');});
byId('return-login').addEventListener('click',()=>{showScreen('login');byId('employee-name').focus();});
byId('start-game').addEventListener('click',()=>{showScreen('quote-screen');byId('skip-quote').focus({preventScroll:true});});
byId('skip-quote').addEventListener('click',startGame);
function announce(text){byId('announcement').textContent=text;}
function scrollToAction(){const anchor=pendingScroll;pendingScroll=null;requestAnimationFrame(()=>{const target=anchor||byId('controls');const rect=target.getBoundingClientRect();if(rect.bottom>window.innerHeight-12||rect.top<100)target.scrollIntoView({block:anchor?'start':'end',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});}
function addText(row,kind){if(!row.text)return;let wrap;
 const speaker=row.speaker||'旁白';
 if(kind==='player'||speaker==='付馥'||speaker==='月涟'||speaker==='司徒月涟'){
  const isYue=speaker==='月涟'||speaker==='司徒月涟';wrap=el('div','story-row speech '+(kind==='player'?'player':isYue?'yuelian':'fu'));
  const circle=el('span','avatar '+(isYue?'yuelian-avatar':'fu-avatar'));circle.setAttribute('aria-hidden','true');const body=el('div','speech-body');body.append(el('div','speaker-name',isYue?'司徒月涟':'付馥'),el('div','speech-text',row.text));wrap.append(circle,body);
 }else wrap=el('p','story-row narration',row.text);
 byId('transcript').append(wrap);pendingScroll??=wrap;
}
function button(label,callback,cls='continue-button'){const b=el('button',cls,label);b.type='button';b.addEventListener('click',callback);return b;}
function clearControls(){byId('controls').replaceChildren();}
function setContinue(callback){clearControls();byId('controls').append(button('继续 →',callback));scrollToAction();}
function startGame(){state.epoch++;state.busy=false;pendingScroll=null;byId('transcript').replaceChildren();clearControls();showScreen('game');enterNode(data.start);}
function enterNode(id){const node=data.nodes[id];if(!node){finish();return;}state.node=id;state.phase='intro';state.queue=node.intro;state.index=0;state.next='';byId('transcript').append(el('div','scene-divider',node.title));advance();}
function advance(){
 if(state.index<state.queue.length){const row=state.queue[state.index++];addText(row);if(row.next)state.next=row.next;announce(row.text);}
 if(state.index<state.queue.length){setContinue(advance);return;}
 if(state.phase==='intro'){
  const options=data.nodes[state.node].options;
  if(options.length){presentOptions(options);return;}
  if(state.next){const destination=state.next;setContinue(()=>enterNode(destination));return;}
  finish();return;
 }
 if(state.next){const destination=state.next;setContinue(()=>enterNode(destination));return;}
 finish();
}
function presentOptions(options){clearControls();state.phase='choices';byId('controls').append(el('p','controls-hint','选择你的行动'));
 options.forEach((option,i)=>{
  const b=button('',()=>choose(option),'choice-button');b.append(el('span','choice-number',String(i+1).padStart(2,'0')));const inside=el('span','choice-inner');inside.append(el('span','choice-label',option.label));
  if(option.check)inside.append(el('span','choice-check',`${option.skill} ${data.stats[option.skill]} · 掷骰鉴定`));b.append(inside,el('span','choice-arrow','→'));byId('controls').append(b);
 });scrollToAction();
}
function randomRoll(){const max=data.rules.maxRoll;const limit=Math.floor(4294967296/max)*max;const values=new Uint32Array(1);do{crypto.getRandomValues(values);}while(values[0]>=limit);return values[0]%max+1;}
function classify(roll,value){const r=data.rules;if(roll>=r.criticalMin&&roll<=r.criticalMax)return '大成功';if(roll>=r.fumbleMin&&roll<=r.fumbleMax)return '大失败';if(roll<=Math.floor(value*r.extreme))return '极难成功';if(roll<=Math.floor(value*r.hard))return '困难成功';if(roll<=value)return '成功';return '失败';}
function resultRows(option,type){const exact=option.rows.filter(r=>r.type===type&&r.text);if(exact.length)return exact;const fallback=(type==='大失败'||type==='失败')?'失败':'成功';return option.rows.filter(r=>r.type===fallback&&r.text);}
function drawRoll(skill,roll,type){const fail=['失败','大失败'].includes(type),box=el('div','story-row roll-result'+(fail?' failure':''));box.setAttribute('role','status');const top=el('div','roll-top');top.append(el('span','',`${skill} · 1D${data.rules.maxRoll}`),el('b','',type));const number=el('div','roll-number',String(roll).padStart(2,'0'));number.append(el('span','',`／ ${data.stats[skill]}`));const v=data.stats[skill];box.append(top,number,el('div','roll-threshold',`普通 ${v}  ·  困难 ${Math.floor(v*data.rules.hard)}  ·  极难 ${Math.floor(v*data.rules.extreme)}`));byId('transcript').append(box);pendingScroll??=box;announce(`${skill}鉴定，掷出${roll}，${type}。`);}
async function choose(option){
 if(state.busy||state.phase!=='choices')return;state.busy=true;state.phase='result';addText({speaker:'付馥',text:option.label},'player');clearControls();let rows=option.rows;const epoch=state.epoch;
 if(option.check){const rolling=button('掷骰中…',()=>{},'continue-button');rolling.disabled=true;byId('controls').append(rolling);scrollToAction();await new Promise(resolve=>setTimeout(resolve,400));if(epoch!==state.epoch)return;const roll=randomRoll();const type=classify(roll,data.stats[option.skill]);drawRoll(option.skill,roll,type);rows=resultRows(option,type);}
 state.queue=rows;state.index=0;state.next=option.next;state.busy=false;
 if(!rows.length&&state.next){const destination=state.next;setContinue(()=>enterNode(destination));return;}advance();
}
function finish(){clearControls();state.phase='ended';const end=el('div','ending');end.append(el('div','ending-symbol','✳'),el('h2','','未完待续'),el('p','','当前试玩到此结束。'),button('从头再玩一次',startGame,'secondary'));byId('controls').append(end);announce('当前试玩到此结束。');scrollToAction();}
byId('open-card').addEventListener('click',()=>byId('card-dialog').showModal());byId('close-card').addEventListener('click',()=>byId('card-dialog').close());
byId('card-dialog').addEventListener('click',e=>{if(e.target===byId('card-dialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
byId('restart-game').addEventListener('click',()=>byId('restart-dialog').showModal());byId('cancel-restart').addEventListener('click',()=>byId('restart-dialog').close());byId('confirm-restart').addEventListener('click',()=>{byId('restart-dialog').close();startGame();});
// Expose the pure classifier for authoring checks; production state stays private.
window.JXS_RULES={classify,resultRows};
})();
