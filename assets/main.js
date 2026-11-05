(() => {
  const C = window.LION_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => n.toLocaleString('en-US');
  const waLink = text => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;

  /* ---------- generic WhatsApp links ---------- */
  const generalMsg = 'السلام عليكم كوتش أسد 👋\nعندي استفسار عن الاشتراك في Lion Coaching.';
  $$('[data-wa="general"]').forEach(a => { a.href = waLink(generalMsg); a.target = '_blank'; a.rel = 'noopener'; });
  const fn = $('#footNum'); if (fn) fn.textContent = '+' + C.whatsapp.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, '$1 $2 $3 $4');
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 20 || nav.hasAttribute('data-solid'));
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#menu');
  burger && burger.addEventListener('click', () => menu.classList.toggle('open'));
  menu && $$('a', menu).forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

  /* ---------- reveal ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 }) : null;
  const observe = () => $$('.rv:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* ---------- plans ---------- */
  const grid = $('#plansGrid');
  const perks = ['جدول تمارين مخصص لنقاط ضعفك', 'نظام غذائي من أكلك المفضل', 'مراجعة فيديوهات الأداء وتصحيحها', 'متابعة يومية مباشرة مع الكابتن', 'مكالمة دورية لمراجعة التقدم', 'فيديو كول بوزينج (فئة البطولات)'];
  if (grid) {
    grid.innerHTML = C.plans.map(p => `
      <div class="plan rv${p.featured ? ' featured' : ''}">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
        <span class="pen">${p.en}</span>
        <h3>${p.name}</h3>
        <div class="price"><b class="en">${fmt(p.price)}</b><span>جنيه / ${p.period}</span></div>
        <div class="was">${p.was ? `بدل <s>${fmt(p.was)}</s> — <em>توفير ${fmt(p.was - p.price)} جنيه</em>` : '&nbsp;'}</div>
        <p class="pnote">${p.note}</p>
        <ul>${perks.map(x => `<li>${x}</li>`).join('')}</ul>
        <button class="btn ${p.featured ? 'btn-gold' : 'btn-ghost'}" data-plan="${p.id}">اشترك في باقة ${p.name}</button>
        <div class="per-month">${p.months > 1 ? `يعني ${fmt(Math.round(p.price / p.months))} جنيه في الشهر` : 'بدون التزام لمدة أطول'}</div>
      </div>`).join('');
  }
  /* ---------- transformations ---------- */
  const rs = $('#results'), rg = $('#resultsGrid'), T = C.transformations || [];
  if (rs && rg && T.length) {
    rg.innerHTML = T.map(t => `
      <div class="result rv">
        ${t.image
          ? `<div class="single"><img src="${t.image}" alt="${t.title || ''}" loading="lazy"></div>`
          : `<div class="ba"><div><img src="${t.before}" alt="قبل" loading="lazy"><span>BEFORE</span></div><div><img src="${t.after}" alt="بعد" loading="lazy"><span>AFTER</span></div></div>`}
        <div class="meta"><b>${t.title || ''}</b>${t.duration ? `<small>المدة: ${t.duration}</small>` : ''}
          ${t.tags ? `<div class="tagline">${t.tags.map(x => `<span class="chip">${x}</span>`).join('')}</div>` : ''}</div>
      </div>`).join('');
    rs.hidden = false;
  }
  observe();

  /* ---------- checkout ---------- */
  const modal = $('#checkout');
  if (!modal) return;
  let plan = C.plans[0], step = 1;

  $('#planSwitch').innerHTML = C.plans.map(p => `<button type="button" data-sw="${p.id}">${p.name}</button>`).join('');
  $('#payMethods').innerHTML = C.payments.map(m => `
    <div class="pm"><div class="pm-head"><div><b>${m.name}</b><small>${m.hint}</small></div></div>
      <div class="pm-val"><code>${m.value}</code><button type="button" class="copy-btn" data-copy="${m.value}">نسخ</button></div></div>`).join('');
  $('#cMethod').innerHTML = C.payments.map(m => `<option>${m.name}</option>`).join('');

  const setPlan = id => {
    plan = C.plans.find(p => p.id === id) || C.plans[0];
    $$('#planSwitch button').forEach(b => b.classList.toggle('on', b.dataset.sw === plan.id));
    $('#sName').innerHTML = `باقة ${plan.name}<small>${plan.en} — متابعة ${plan.period}</small>`;
    $('#sPrice').innerHTML = `${fmt(plan.price)}<small>جنيه</small>`;
    $('#payAmount').textContent = fmt(plan.price);
  };
  const go = n => {
    step = n;
    $$('.step-pane', modal).forEach(p => p.classList.toggle('on', +p.dataset.step === n));
    $$('.progress i', modal).forEach((b, i) => b.classList.toggle('on', i < n));
    $('.sheet', modal).scrollTop = 0;
    if (n === 3) $('#waGo').href = waLink(buildMsg());
  };
  const open = id => { setPlan(id); go(1); modal.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(() => $('#cName').focus(), 200); };
  const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-plan]'); if (b) open(b.dataset.plan);
    const sw = e.target.closest('[data-sw]'); if (sw) setPlan(sw.dataset.sw);
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const done = () => { cp.textContent = 'اتنسخ ✓'; cp.classList.add('done'); setTimeout(() => { cp.textContent = 'نسخ'; cp.classList.remove('done'); }, 1800); };
      navigator.clipboard ? navigator.clipboard.writeText(cp.dataset.copy).then(done, done) : done();
    }
  });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  $$('[data-back]', modal).forEach(b => b.addEventListener('click', () => go(step - 1)));

  const val = {
    1() {
      let ok = true;
      const name = $('#cName').value.trim(), age = +$('#cAge').value, goal = $('input[name=goal]:checked');
      $('#fName').classList.toggle('bad', name.length < 3) && (ok = false);
      $('#fAge').classList.toggle('bad', !(age >= 12 && age <= 80)) && (ok = false);
      $('#fGoal').classList.toggle('bad', !goal) && (ok = false);
      return ok;
    },
    2() {
      const ok = $('#cAgree').checked;
      $('#agreeWrap').classList.toggle('bad', !ok);
      return ok;
    }
  };
  $$('[data-next]', modal).forEach(b => b.addEventListener('click', () => { if (val[step]()) go(step + 1); }));
  ['#cName', '#cAge'].forEach(s => $(s).addEventListener('input', e => e.target.closest('.field').classList.remove('bad')));
  $$('input[name=goal]').forEach(r => r.addEventListener('change', () => $('#fGoal').classList.remove('bad')));
  $('#cAgree').addEventListener('change', () => $('#agreeWrap').classList.remove('bad'));

  const buildMsg = () => {
    const goal = $('input[name=goal]:checked');
    return [
      'السلام عليكم كوتش أسد 🦁',
      'عايز أشترك في Lion Coaching وده إيصال التحويل 👇',
      '',
      `📦 الباقة: ${plan.name} (${plan.en})`,
      `💰 المبلغ المحوّل: ${fmt(plan.price)} جنيه`,
      `💳 طريقة الدفع: ${$('#cMethod').value}`,
      '',
      `👤 الاسم: ${$('#cName').value.trim()}`,
      `🎂 السن: ${$('#cAge').value}`,
      `📊 المستوى: ${$('#cLevel').value}`,
      `🎯 الهدف: ${goal ? goal.value : ''}`,
      '',
      '✅ موافق على الشروط والأحكام وسياسة الاسترداد.',
      '📎 مرفق صورة التحويل.'
    ].join('\n');
  };
  $('#waGo').addEventListener('click', () => { $('#waGo').href = waLink(buildMsg()); });

  // deep link: index.html?plan=3m opens checkout directly
  const q = new URLSearchParams(location.search).get('plan');
  if (q && C.plans.some(p => p.id === q)) open(q);
})();
