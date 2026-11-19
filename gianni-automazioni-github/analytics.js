// Local event analytics. No form contents, keystrokes, recordings or network requests.
(()=>{
 if(window.gianniAnalytics)return;
 const KEY='gianni-activity-v1',PREF='gianni-activity-enabled',SESSION='gianni-activity-session';
 const LIMIT=5000,RETENTION=30*24*60*60*1000;
 let memory=[],storageAvailable=true,enabled=true,session;
 try{enabled=localStorage.getItem(PREF)!=='false'}catch{storageAvailable=false}
 try{session=sessionStorage.getItem(SESSION);if(!session){session=crypto.randomUUID();sessionStorage.setItem(SESSION,session)}}catch{session='session-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
 const page=()=>location.hash==='#azienda'||/azienda\.html$/.test(location.pathname)?'azienda':'servizi';
 const read=()=>{
  let rows=memory;
  if(storageAvailable){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');rows=Array.isArray(value)?value:[]}catch{storageAvailable=false}}
  const cutoff=Date.now()-RETENTION;
  return rows.filter(e=>e&&typeof e.event==='string'&&Number.isFinite(e.time)&&e.time>=cutoff).slice(-LIMIT);
 };
 const persist=rows=>{memory=rows;try{if(storageAvailable)localStorage.setItem(KEY,JSON.stringify(rows))}catch{storageAvailable=false}};
 const track=(event,data={},onPage=page())=>{
  if(!enabled)return;
  // Only explicitly approved event metadata can enter the log.
  const safe={};
  for(const key of ['elevator','action','channel','field','percent','duration_ms','result','control','state']){
   const value=data[key];
   if(typeof value==='number'&&Number.isFinite(value))safe[key]=Math.max(0,Math.round(value));
   if(typeof value==='string')safe[key]=value.slice(0,80);
  }
  const row={time:Date.now(),event,page:onPage,session,data:safe};
  const rows=read();rows.push(row);persist(rows.slice(-LIMIT));
  window.dispatchEvent(new CustomEvent('gianni:activity',{detail:row}));
 };
 const download=(name,value)=>{
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
 };
 window.gianniAnalytics={track,read,clear:()=>persist([]),export:()=>download('gianni-attivita.json',{scope:'this_browser_only',retention_days:30,events:read()}),setEnabled:value=>{enabled=!!value;try{localStorage.setItem(PREF,String(enabled))}catch{}},get enabled(){return enabled}};
 let activeSince=document.visibilityState==='hidden'?null:performance.now(),lastPage=page(),scrollSeen=new Set(),scrollTimer;
 const flush=()=>{if(activeSince!==null){const duration=performance.now()-activeSince;if(duration>=1000)track('page_engagement',{duration_ms:duration},lastPage);activeSince=null}};
 const view=()=>{
  lastPage=page();scrollSeen=new Set();
  track('page_view');activeSince=document.visibilityState==='hidden'?null:performance.now();
 };
 const start=()=>{try{if(!sessionStorage.getItem('gianni-activity-started')){track('session_start');sessionStorage.setItem('gianni-activity-started','1')}}catch{track('session_start')}view()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else queueMicrotask(start);
 window.addEventListener('hashchange',()=>{if(page()!==lastPage){flush();view()}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();else activeSince=performance.now()});
 window.addEventListener('pagehide',flush);
 window.addEventListener('blur',flush);
 window.addEventListener('focus',()=>{if(document.visibilityState!=='hidden'&&activeSince===null)activeSince=performance.now()});
 window.addEventListener('scroll',()=>{
  if(scrollTimer)return;
  scrollTimer=setTimeout(()=>{
   scrollTimer=null;
   const max=document.documentElement.scrollHeight-innerHeight;
   if(max<=0)return;
   const percent=Math.min(100,Math.round(scrollY/max*100));
   [25,50,75,100].forEach(level=>{if(percent>=level&&!scrollSeen.has(level)){scrollSeen.add(level);track('scroll_depth',{percent:level})}});
  },200);
 },{passive:true});
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('a,button,summary');
  if(!target||target.closest('[data-analytics-panel]'))return;
  if(target.matches('.contact-call'))track('contact_click',{channel:'phone'});
  else if(target.matches('.contact-whatsapp'))track('contact_click',{channel:'whatsapp'});
  else if(target.matches('.contact-video'))track('contact_click',{channel:'video'});
  else if(target.matches('[data-company-link]'))track('company_open_requested');
  else if(target.matches('a[href="index.html"]'))track('company_back');
  else if(target.matches('[data-export-company]'))track('company_export_requested');
  else if(!target.matches('[data-elevator],[data-save-company]')&&!target.hasAttribute('download'))track('control_click',{control:target.tagName.toLowerCase()});
 });
 const editing=new WeakMap();
 document.addEventListener('focusin',event=>{const field=event.target.closest?.('[data-company-field]');if(field)track('company_field_focus',{field:field.dataset.companyField})});
 document.addEventListener('input',event=>{
  const field=event.target.closest?.('[data-company-field]');if(!field)return;
  clearTimeout(editing.get(field));editing.set(field,setTimeout(()=>track('company_field_edited',{field:field.dataset.companyField}),500));
 });
 window.addEventListener('error',()=>track('site_error',{result:'javascript_or_resource_error'}),true);
 window.addEventListener('unhandledrejection',()=>track('site_error',{result:'unhandled_promise'}));
 const names={session_start:'Inizio sessione',page_view:'Pagina visitata',page_engagement:'Tempo attivo',scroll_depth:'Scorrimento',contact_click:'Contatto',elevator_toggle:'Ascensore',crew_completed:'Animazione completata',company_open_requested:'Apertura informazioni',company_back:'Torna ai servizi',company_field_focus:'Campo selezionato',company_field_edited:'Campo modificato',company_save:'Salvataggio dati',company_export_requested:'Download sito',control_click:'Altro clic',site_error:'Errore'};
 window.mountActivityPanel=()=>{
  const editor=document.querySelector('.company-editor');if(!editor||editor.querySelector('[data-analytics-panel]'))return;
  const panel=document.createElement('details');panel.dataset.analyticsPanel='';panel.className='activity-panel';
  panel.innerHTML='<summary>Statistiche e registro attività</summary><p class="activity-scope">Registro locale: mostra solo le attività di questo browser, non quelle di altri visitatori. Conservazione: 30 giorni, massimo 5.000 eventi. I testi compilati, le foto e i video non vengono registrati.</p><label class="activity-preference"><input type="checkbox"> Registra le attività su questo dispositivo</label><div class="activity-totals"></div><div class="activity-actions"><button type="button" data-activity-export>Esporta registro JSON</button><button type="button" data-activity-refresh>Aggiorna</button><button type="button" data-activity-clear>Svuota registro</button></div><p class="activity-storage" role="status"></p><div class="activity-table-wrap"><table><thead><tr><th>Quando</th><th>Attività</th><th>Pagina</th><th>Dettagli</th></tr></thead><tbody></tbody></table></div>';
  editor.append(panel);
  const render=()=>{
   const rows=read();const count=name=>rows.filter(row=>row.event===name).length;
   const minutes=Math.round(rows.filter(row=>row.event==='page_engagement').reduce((sum,row)=>sum+(row.data?.duration_ms||0),0)/60000);
   panel.querySelector('.activity-totals').textContent=`${count('page_view')} pagine · ${count('contact_click')} clic di contatto · ${count('elevator_toggle')} aperture/chiusure · ${minutes} minuti attivi`;
   panel.querySelector('.activity-storage').textContent=storageAvailable?'Salvataggio locale attivo. Nessun evento viene inviato a un server.':'Il browser blocca lo spazio locale: il registro rimane solo in memoria fino alla chiusura della pagina.';
   panel.querySelector('input').checked=enabled;
   const tbody=panel.querySelector('tbody');tbody.replaceChildren();
   rows.slice(-100).reverse().forEach(row=>{
    const tr=document.createElement('tr');
    [new Date(row.time).toLocaleString('it-IT'),names[row.event]||row.event,row.page,JSON.stringify(row.data||{})].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});
    tbody.append(tr);
   });
  };
  panel.addEventListener('toggle',()=>{if(panel.open)render()});
  panel.querySelector('input').addEventListener('change',event=>{window.gianniAnalytics.setEnabled(event.target.checked);render()});
  panel.querySelector('[data-activity-export]').addEventListener('click',()=>window.gianniAnalytics.export());
  panel.querySelector('[data-activity-refresh]').addEventListener('click',render);
  panel.querySelector('[data-activity-clear]').addEventListener('click',()=>{window.gianniAnalytics.clear();render()});
 };
})();
