(() => {
  const $ = selector => document.querySelector(selector);
  const smsText = 'Hei Remi! Kan jeg få en ny invitasjon til Hotellet vårt?';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('#contact-remi').href = 'sms:+4791666666' + (ios ? '&' : '?') + 'body=' + encodeURIComponent(smsText);
  $('#landing-help').onclick = () => $('#help-dialog').showModal();
  $('#close-help').onclick = () => $('#help-dialog').close();
  let invite = null;
  function receiveInvite() {
    const value = new URLSearchParams(location.hash.slice(1)).get('invite');
    if (!value) return;
    invite = value;
    history.replaceState(null, '', location.pathname + location.search);
    $('#message').textContent = 'Invitasjonen knytter denne nettleseren til din plass. Bruk din egen iPhone.';
    $('#activate').hidden = false;
  }
  $('#activate').onclick = async () => {
    const button = $('#activate');button.disabled = true;
    try {
      const response = await fetch('api.php', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'activate',token:invite})});
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || 'Invitasjonen kunne ikke åpnes. Prøv igjen.');
      location.reload();
    } catch (error) { $('#message').textContent = error.message;button.disabled = false; }
  };
  receiveInvite();window.addEventListener('hashchange', receiveInvite);
})();

const pairForm=document.querySelector('#pair-form');
if(pairForm)pairForm.addEventListener('submit',async e=>{e.preventDefault();const button=pairForm.querySelector('button'),result=document.querySelector('#pair-result');button.disabled=true;result.textContent='Kobler til …';try{const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'pairDevice',code:document.querySelector('#pair-code').value})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Kunne ikke koble til.');document.querySelector('#pair-code').value='';location.replace('./');}catch(error){result.textContent=error.message;button.disabled=false}});
