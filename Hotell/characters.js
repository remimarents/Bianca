/* Visual casting only. Never mutates guests, choices, progression or player avatars. */
window.hotelCharacters = (() => {
  const names = ['mia','noah','alma','oliver','ella','leo'];
  const labels = {mia:'Mia',noah:'Noah',alma:'Alma',oliver:'Oliver',ella:'Ella',leo:'Leo',toddler:'Småbarn med bamse',boy:'Barn med kart',girl:'Barn med bok',dog:'Familiehund',elder:'Eldre gjest', 'wheelchair-manual':'Gjest i manuell rullestol','wheelchair-power':'Gjest i elektrisk rullestol',musician:'Musiker',baker:'Baker',courier:'Bud',technician:'Fagperson'};
  const size = {toddler:40,boy:54,'boy-night':54,girl:60,dog:30,'wheelchair-manual':58,'wheelchair-power':60};
  const dimensions = {"mia": [107, 328], "noah": [113, 328], "alma": [108, 328], "oliver": [111, 328], "ella": [120, 328], "leo": [117, 328], "mia-baby": [123, 328], "toddler": [113, 328], "boy": [114, 328], "girl": [104, 328], "dog": [248, 280], "elder": [127, 328], "mia-night": [106, 328], "mia-swim": [113, 328], "mia-party": [109, 328], "noah-night": [115, 328], "noah-swim": [118, 328], "noah-party": [120, 328], "wheelchair-manual": [208, 328], "wheelchair-power": [210, 328], "musician": [182, 328], "alma-tour": [138, 328], "baker": [133, 328], "courier": [122, 328], "mia-rain": [123, 328], "noah-rain": [116, 328], "alma-rain": [105, 328], "leo-tour": [131, 328], "technician": [131, 328], "boy-night": [99, 328]};
  const inList = (id, ids) => ids.split(' ').includes(id);
  const source = e => e?.sourceId || '';
  function outfit(g, s, visual, participant) {
    const base = names.includes((g.name||'').toLowerCase()) ? g.name.toLowerCase() : names[((Number(g.id)||1)-1)%6];
    if (!participant) return base;
    const e=s.event||{},id=source(e),kind=visual.kind;
    if (base==='mia' && (inList(id,'rom-06') || (s.tasks||[]).some(t=>source(t)==='jobb-09'&&!t.done))) return 'mia-baby';
    if (['mia','noah'].includes(base)) {
      if (id==='vaer-13' && !e.resolved || id==='basseng' && /Vannleken er populær/.test(e.text||'') && !e.resolved || g.status==='pool' && !['meal','repair','read'].includes(kind)) return base+'-swim';
      if (kind==='rain') return base+'-rain';
      if (inList(id,'gjester-03 rom-01 rom-03 rom-08 rom-14')) return base+'-night';
      if (id==='bryllup' || ['celebrate','dance'].includes(kind)) return base+'-party';
    }
    if (base==='alma' && kind==='rain') return 'alma-rain';
    if (['alma','leo'].includes(base) && (inList(id,'sykkel gjester-03 gjester-15 mat-05 mat-09 okonomi-07 okonomi-13 naboer-04 vaer-01 vaer-04 vaer-09') || kind==='tour')) return base+'-tour';
    return base;
  }
  function extras(e, visual) {
    const id=source(e),kind=visual.kind,out=[];
    if (inList(id,'gjester-01 gjester-02 gjester-07 gjester-15 rom-14 feiring-01 bursdag teater marked hagekonsert hage-10 feiring-15 jobb-18 jobb-59')) {
      out.push(id==='gjester-02'||id==='gjester-15'?'toddler':id==='rom-14'?'boy-night':'boy');
      if(inList(id,'gjester-07 teater hage-10'))out.push('girl');
    }
    if(id==='hund' && !(e.resolved && e.chosen==='b') && !(e.storyStep===2 && /møtestedet/.test(e.text||'')))out.push('dog');
    if(inList(id,'hage-04 oppskrift'))out.push('elder');
    if(id==='vedlikehold-14')out.push('wheelchair-power');
    if(id==='bryllup' && e.storyStep===2 && /jevn|tilgjengelig/.test(e.text||''))out.push('wheelchair-manual');
    if(inList(id,'hagekonsert naboer-08') && !(id==='naboer-08'&&e.resolved&&e.chosen==='b'))out.push('musician');
    if(inList(id,'naboer-02 jobb-54'))out.push('baker');
    if(inList(id,'mat-03 mat-13 naboer-10 jobb-34 jobb-52'))out.push('courier');
    if(kind==='repair' && (id.startsWith('vedlikehold-')||id==='storm'||inList(id,'jobb-27 jobb-29')))out.push('technician');
    return out;
  }
  function sprite(id, action='talk', mood=65, name='') {
    if(!dimensions[id])id='mia';
    const h=size[id]||72,w=h*dimensions[id][0]/dimensions[id][1];
    const label=name||labels[id]||labels[id.split('-')[0]]||'Gjest';
    const safe=label.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const chair=id.startsWith('wheelchair');
    return `<g class="realistic-character ${chair?'rolling-character':''} ${action==='dance'&&!chair?'gentle-dance':''}" data-character="${id}" data-mood="${mood<45?'concerned':mood>=70?'happy':'calm'}"><title>${safe}</title><ellipse cy="0" rx="${Math.min(w*.4,18)}" ry="3" fill="#30251c25"/><image href="asset.php?f=characters/${id}.webp&amp;v=1" x="${-w/2}" y="${-h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"/></g>`;
  }
  return {outfit,extras,sprite,source,ids:Object.keys(dimensions)};
})();
