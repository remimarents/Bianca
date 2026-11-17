/* Shared installation UI; copies live beside each app for independent scope. */
(() => {
  const script = document.currentScript;
  const base = new URL('.', script.src);
  const name = script.dataset.appName || document.title;
  let pendingPrompt = null;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const buttons = () => document.querySelectorAll('[data-install-pwa]');
  const hideInstalled = () => buttons().forEach(button => { button.hidden = standalone(); });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pendingPrompt = event; });
  window.addEventListener('appinstalled', () => { pendingPrompt = null; buttons().forEach(button => { button.hidden = true; }); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(new URL('sw.js', base), {scope: base.pathname, updateViaCache: 'none'}).catch(() => {});
  }
  const style = document.createElement('style');
  style.textContent = `[data-install-pwa][hidden]{display:none!important}#pwa-install-dialog{box-sizing:border-box;position:fixed;inset:0;margin:auto;width:min(460px,calc(100vw - 24px));max-height:85dvh;overflow:auto;padding:24px;border:0;border-radius:20px;background:#fffaf2;color:#294c42;font:16px/1.55 system-ui,sans-serif;text-align:left;z-index:1000}#pwa-install-dialog::backdrop{background:#14251c99}#pwa-install-dialog h2{font-size:23px;line-height:1.25;margin:0 0 15px;color:inherit}#pwa-install-dialog p{font:inherit;color:inherit;margin:12px 0}#pwa-install-dialog ol{padding-left:22px}#pwa-install-dialog li{margin:10px 0}#pwa-install-dialog button{font:inherit;min-height:44px;padding:10px 18px;border:0;border-radius:12px;color:#fff;background:#386b54;cursor:pointer}#pwa-install-dialog button:focus-visible{outline:3px solid #a35b24;outline-offset:3px}`;
  document.head.append(style);
  function instructions() {
    let dialog = document.getElementById('pwa-install-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'pwa-install-dialog'; dialog.setAttribute('aria-labelledby', 'pwa-install-title');
      dialog.innerHTML = '<h2 id="pwa-install-title"></h2><p>Da får du et eget ikon på hjemskjermen, som åpner denne appen.</p><strong>På iPhone</strong><ol><li>Åpne siden i Safari og trykk på Del. I noen visninger finner du Del under menyknappen.</li><li>Velg «Legg til på Hjem-skjerm». La «Åpne som nettapp» være på hvis valget vises.</li><li>Trykk «Legg til».</li></ol><p>Appen trenger nettforbindelse. Spilldata kan lagres separat i appen og i nettleseren. Bruk gjerne appen fast når du har lagt den til.</p><p id="pwa-hotel-note" hidden>For hotellet: Åpne din personlige invitasjon i Safari først, og legg deretter hotellet på hjemskjermen. Hvis appen ber om en ny invitasjon, bruk «Send SMS til Remi».</p><button type="button">Lukk</button>';
      dialog.querySelector('h2').textContent = 'Lagre ' + name + ' som app';
      dialog.querySelector('#pwa-hotel-note').hidden = !base.pathname.includes('/hotell/');
      dialog.querySelector('button').onclick = () => dialog.close();
      document.body.append(dialog);
    }
    dialog.showModal();
  }
  buttons().forEach(button => button.addEventListener('click', async () => {
    if (pendingPrompt) {
      const prompt = pendingPrompt; pendingPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch { instructions(); }
    } else instructions();
  }));
  hideInstalled();
})();
