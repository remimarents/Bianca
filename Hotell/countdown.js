(() => {
  // Rebecca's birthday: midnight in Norway (CET), not the device's local midnight.
  const opening = Date.parse('2026-12-03T00:00:00+01:00');
  const banners = [...document.querySelectorAll('[data-opening-countdown]')];
  function update() {
    const remaining = Math.max(0, opening - Date.now());
    const minutes = Math.ceil(remaining / 60000);
    const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), mins = minutes % 60;
    for (const banner of banners) {
      banner.dataset.open = String(remaining === 0);
      banner.querySelector('[data-countdown-title]').textContent = remaining ? 'Snart er dere tre på hotellet!' : 'Nå kan dere spille alle tre!';
      banner.querySelector('[data-countdown-message]').textContent = remaining ? '3. desember har Rebecca bursdag. Da kan Bianca, Rebecca og Leandra drive hotellet sammen.' : 'Felles hotellstart er her! Bianca, Rebecca og Leandra kan nå ønske gjestene velkommen sammen.';
      const timer = banner.querySelector('[data-countdown-time]');
      timer.hidden = remaining === 0;
      timer.setAttribute('aria-label', `${days} dager, ${hours} timer og ${mins} minutter til felles hotellstart`);
      for (const [key,value] of Object.entries({days,hours,minutes:mins})) banner.querySelector(`[data-${key}]`).textContent = String(value).padStart(2,'0');
      banner.querySelector('[data-countdown-footer]').textContent = remaining ? 'Bianca kan spille og gjøre hotellet klart allerede nå.' : 'Åpne hver deres personlige invitasjon for å bli med.';
    }
  }
  update();setInterval(update,1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
})();
