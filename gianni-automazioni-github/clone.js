// Independent interactions for the copy of the original Framer design.
function bindSite(){
const editor=document.querySelector('.company-editor');
if(editor){
  const fields=[...document.querySelectorAll('[data-company-field]')];
  const status=editor.querySelector('[role="status"]');
  const key='gianni-company-profile-v1';
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved)fields.forEach(field=>{if(typeof saved[field.dataset.companyField]==='string')field.textContent=saved[field.dataset.companyField]});
  }catch{}
  fields.forEach(field=>field.addEventListener('input',()=>{status.textContent='Modifiche da salvare'}));
  editor.querySelector('[data-save-company]').addEventListener('click',()=>{
    const data=Object.fromEntries(fields.map(field=>[field.dataset.companyField,field.innerText.trim()]));
    try{localStorage.setItem(key,JSON.stringify(data));status.textContent='Dati salvati su questo dispositivo';window.gianniAnalytics?.track('company_save',{result:'success'})}
    catch{status.textContent='Il browser non permette il salvataggio locale. Scarica il sito compilato.';window.gianniAnalytics?.track('company_save',{result:'storage_unavailable'})}
  });
  const download=editor.querySelector('[data-export-company]');
  download.hidden=typeof window.downloadPersonalizedSite!=='function';
  download.addEventListener('click',()=>window.downloadPersonalizedSite());
  window.mountActivityPanel?.();
}
document.querySelectorAll('[data-elevator]').forEach(button=>{
  const name=button.getAttribute('name');
  const prices=button.querySelector('[data-framer-name="Prezzi"]');
  const crew=button.hasAttribute('data-crew');
  let crewBusy=false;
  let crewParked=false;
  const workers=crew?[...button.querySelectorAll('.worker')]:[];
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const effort=(worker,on)=>{
    worker.classList.toggle('is-walking',on);
    worker.classList.toggle('is-straining',on);
  };
  button.addEventListener('click',()=>{
    if(crew){
      if(crewBusy)return;
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ms=value=>reduced?0:value;
      const gait=duration=>{
        const steps=Math.max(2,Math.round(duration/350));
        const stops=['0'];
        for(let i=0;i<steps;i++){
          stops.push(`${i/steps} ${(i+.2)/steps*100}%`);
          stops.push(`${(i+1)/steps} ${(i+.85)/steps*100}%`);
        }
        stops.push('1');
        return {easing:`linear(${stops.join(',')})`,cycle:duration/steps*2};
      };
      const move=(left,right,duration)=>{
        button.style.setProperty('--crew-duration',`${ms(duration)}ms`);
        button.style.setProperty('--crew-easing',gait(duration).easing);
        if(left!==null)button.style.setProperty('--left-door-x',left);
        if(right!==null)button.style.setProperty('--right-door-x',right);
      };
  const place=(worker,position,duration)=>{
        worker.style.transitionDuration=`${ms(duration)}ms`;
        worker.style.transitionTimingFunction=gait(duration).easing;
        worker.style.setProperty('--walk-cycle',`${ms(gait(duration).cycle)}ms`);
        worker.style.left=position;
      };
      const open=!button.classList.contains('is-open');
      window.gianniAnalytics?.track('elevator_toggle',{elevator:button.dataset.elevator,action:open?'open':'close'});
      crewBusy=true;
      button.setAttribute('aria-busy','true');
      button.classList.add('is-working');
      (async()=>{
        const [left,right]=workers;
        if(open){
          workers.forEach(w=>w.classList.remove('is-facing-away'));
          button.dataset.doorState='opening';
          if(crewParked){
            workers.forEach(w=>effort(w,true));
            place(left,'calc(50% - var(--worker-width) * .96)',1500);
            place(right,'calc(50% - var(--worker-width) * .04)',1500);
            await wait(ms(1500));
          }
          button.classList.add('is-open');
          button.setAttribute('aria-expanded','true');
          prices.setAttribute('aria-hidden','false');
          workers.forEach(w=>effort(w,true));
          move('-100%','100%',6000);
          place(left,'calc(var(--crew-gutter) - var(--worker-width) * .96)',6000);
          place(right,'calc(100% - var(--crew-gutter) - var(--worker-width) * .04)',6000);
          await wait(ms(6000));
          workers.forEach(w=>effort(w,false));
          button.dataset.doorState='open';
          crewParked=false;
        }else{
          button.dataset.doorState='closing';
          button.classList.remove('is-open');
          button.setAttribute('aria-expanded','false');
          prices.setAttribute('aria-hidden','true');
          workers.forEach(w=>w.classList.add('is-facing-away'));
          await wait(ms(500));
          // The left worker closes his half first.
          effort(left,true);move('0%',null,6500);
          place(left,'calc(50% - var(--worker-width) * .96)',6500);
          await wait(ms(6500));effort(left,false);
          // He steps aside before the other worker approaches the centre.
          left.classList.add('is-walking');place(left,'calc(var(--crew-gutter) - var(--worker-width) * .96)',1800);
          await wait(ms(1800));left.classList.remove('is-walking');
          effort(right,true);move(null,'0%',6500);
          place(right,'calc(50% - var(--worker-width) * .04)',6500);
          await wait(ms(6500));effort(right,false);
          right.classList.add('is-walking');place(right,'calc(100% - var(--crew-gutter) - var(--worker-width) * .04)',1400);
          await wait(ms(1400));right.classList.remove('is-walking');
          button.dataset.doorState='closed';
          crewParked=true;
        }
      })().finally(()=>{
        window.gianniAnalytics?.track('crew_completed',{elevator:button.dataset.elevator,state:button.dataset.doorState});
        crewBusy=false;
        button.classList.remove('is-working');
        button.removeAttribute('aria-busy');
        button.setAttribute('aria-label',button.classList.contains('is-open')?'Richiudi lentamente le porte con gli operai':'Apri lentamente le porte con gli operai');
      });
      return;
    }
    const open=button.classList.toggle('is-open');
    window.gianniAnalytics?.track('elevator_toggle',{elevator:button.dataset.elevator,action:open?'open':'close'});
    button.dataset.doorState=open?'open':'closed';
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',crew?(open?'Richiudi lentamente le porte con gli operai':'Apri lentamente le porte con gli operai'):`${name}: ${open?'nascondi':'mostra'} prezzi`);
    prices.setAttribute('aria-hidden',String(!open));
  });
});
document.querySelectorAll('[data-company-link]').forEach(button=>{
  button.addEventListener('click',()=>{
    if(button.classList.contains('title-opening'))return;
    button.classList.add('title-opening');
    button.setAttribute('aria-expanded','true');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(()=>{
      if(window.openCompanyPage)window.openCompanyPage();
      else location.href='azienda.html';
    },reduced?0:1050);
  });
});
}
bindSite();
