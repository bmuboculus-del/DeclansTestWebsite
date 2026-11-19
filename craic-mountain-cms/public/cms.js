(()=>{'use strict';
let content=null;
const $=s=>document.querySelector(s);
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
function toast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),5000);}
function navbutton(label,target){const b=el('button','section-link',label);b.setAttribute('data-go',target);b.onclick=()=>{history.pushState(null,'','#'+target);document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===target));window.scrollTo({top:0,behavior:'instant'});};return b;}
function apply(c){content=c;
const brand=$('.brand-name');if(brand){brand.textContent='';brand.append(document.createTextNode(c.brand.split(' ')[0]+' '));brand.append(el('span','',c.brand.split(' ').slice(1).join(' ')));}
document.querySelectorAll('.footer .brand-name').forEach(b=>{b.textContent='';b.append(document.createTextNode(c.brand.split(' ')[0]+' '));b.append(el('span','',c.brand.split(' ').slice(1).join(' ')));});
const eyebrow=$('.hero .eyebrow');if(eyebrow)eyebrow.textContent=c.eyebrow;
const h=$('.hero h1');if(h){h.textContent='';h.append(document.createTextNode(c.heroLine1));h.append(document.createElement('br'));h.append(el('em','',c.heroLine2));}
const intro=$('.hero .lead');if(intro)intro.textContent=c.heroDescription;
const banner=$('.section.alt .banner p');if(banner)banner.textContent=c.announcement;
const rules=$('#rules .shell[style]');if(rules){rules.textContent='';c.rules.forEach((r,i)=>{const d=el('details','rule');if(i===0)d.open=true;d.append(el('summary','',String(i+1).padStart(2,'0')+' — '+r.title));d.append(el('p','',r.description));rules.append(d);});}
const departments=$('#departments .grid3');if(departments){departments.textContent='';c.departments.forEach(d=>{const card=el('div','info-card');card.append(el('div','feature-icon',d.icon||'🏔️'));card.append(el('h3','',d.title));card.append(el('p','',d.description));card.append(navbutton('Apply or join →','applications'));departments.append(card);});}
const events=$('#events .grid3');if(events){events.textContent='';c.events.forEach(event=>{const card=el('div','info-card');card.append(el('span','status',event.date||'COMING SOON'));card.append(el('h3','cms-event-title',event.title));card.append(el('p','',event.description));events.append(card);});}
document.querySelectorAll('[data-auth]').forEach(btn=>btn.textContent='Join our Discord ↗');
document.title=c.brand+' Roleplay | Where the craic begins';
}
fetch('/api/content',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Server unavailable');return r.json()}).then(apply).catch(()=>toast('Could not load the latest content.'));
document.addEventListener('click',e=>{const btn=e.target.closest('[data-auth]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();if(content?.discordInvite){window.open(content.discordInvite,'_blank','noopener,noreferrer');}else{toast('Discord invite has not been added yet.');}},true);
})();
