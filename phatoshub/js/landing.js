// PhatosHub – interações da landing page
(function () {
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Ano no rodapé
  document.getElementById('ano').textContent = new Date().getFullYear();

  // Menu mobile
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );

  // Contadores animados
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1200, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Revelar ao rolar
  const revealEls = document.querySelectorAll('.pain, .module, .flow li, .testimonials figure, .price, .faq details');
  revealEls.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.dataset.count) animateCount(e.target);
        else e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    counters.forEach((c) => io.observe(c));
    revealEls.forEach((el) => io.observe(el));
  } else {
    counters.forEach((c) => (c.textContent = c.dataset.count));
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // Simulador de comissão
  const ids = ['simMensal', 'simAgenc', 'simVital', 'simRepasse', 'simMeses'];
  const val = (id) => Math.max(0, parseFloat(document.getElementById(id).value) || 0);
  const calc = () => {
    const mensal = val('simMensal');
    const agenciamento = mensal * (val('simAgenc') / 100);
    const vitalicio = mensal * (val('simVital') / 100) * val('simMeses');
    const total = agenciamento + vitalicio;
    const corretor = total * (Math.min(val('simRepasse'), 100) / 100);
    document.getElementById('simTotal').textContent = brl(total);
    document.getElementById('simCorretor').textContent = brl(corretor);
    document.getElementById('simMargem').textContent = brl(total - corretor);
  };
  ids.forEach((id) => document.getElementById(id).addEventListener('input', calc));
  calc();

  // Mensal / anual
  document.querySelectorAll('.billing__opt').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.billing__opt').forEach((b) => b.classList.toggle('is-active', b === btn));
      const mode = btn.dataset.billing;
      document.querySelectorAll('.price__value b[data-mensal]').forEach((b) => (b.textContent = b.dataset[mode]));
    })
  );

  // Formulário de lead (demonstração: salva no navegador)
  const form = document.getElementById('leadForm');
  const msg = document.getElementById('leadMsg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '');
    const phoneOk = (data.whatsapp || '').replace(/\D/g, '').length >= 10;
    if (!data.nome || !emailOk || !phoneOk || !data.tamanho) {
      msg.textContent = 'Preencha nome, e-mail válido, WhatsApp com DDD e o tamanho da equipe.';
      msg.className = 'cta__msg err';
      return;
    }
    try {
      const leads = JSON.parse(localStorage.getItem('phatoshub_site_leads') || '[]');
      leads.push({ ...data, criadoEm: new Date().toISOString() });
      localStorage.setItem('phatoshub_site_leads', JSON.stringify(leads));
    } catch (_) { /* armazenamento indisponível */ }
    msg.textContent = `Obrigado, ${data.nome.split(' ')[0]}! Em breve entraremos em contato pelo WhatsApp.`;
    msg.className = 'cta__msg ok';
    form.reset();
  });
})();
