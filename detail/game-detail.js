/* ============================================================
   game-detail.js
   商店风格详情页的行为层，原生 JS 实现。

   URL 参数：
     gid        游戏 id
     cp         渠道，显示为开发者名
     st / re    来源埋点参数，仅透传
     is_detail  是否详情页模式
     sty        样式变体：1 = 浅蓝描述卡（默认），2 = 大标题布局 + 可展开描述
     theme      dark 时切换暗色主题（由 html[data-theme] 控制）
   ============================================================ */
(function () {
  'use strict';

  const A = '../assets/detail/';

  /* ---------------- 游戏数据 ---------------- */
  const GAMES = {
    blackjack: {
      title: 'Black Of Jack',
      icon: A + 'icon-blackjack.svg',
      tags: ['Card', "Texas Hold'em"],
      rating: '4.7',
      ratingCount: '28M Ratings',
      players: '100M+',
      rate: 'Rate of 12+',
      rateShort: '12+',
      desc: 'Black Jack Story - this is an exciting card game in a beautiful fantasy setting, built on the rules of the good old Black Jack!',
      longDesc: 'Black Jack Story - this is an exciting card game in a beautiful fantasy setting, built on the rules of the good old Black Jack! Take a seat at the table, place your bet and try to beat the dealer without going over 21. Double down when the odds are in your favour, split a pair to play two hands at once, and read the dealer\'s upcard before you decide to hit or stand. Climb through a series of increasingly wealthy tables, unlock new venues, and collect a daily chip bonus to keep the streak alive.',
      // 单图走 large 模式（item 含左右 padding = 393px）；多图横滑见 solitaire / slots
      shots: [A + 'screenshot-1.svg']
    },
    solitaire: {
      title: 'Solitaire Classic',
      icon: A + 'g1.svg',
      tags: ['Card', 'Patience', 'Single Player'],
      rating: '4.5',
      ratingCount: '12M Ratings',
      players: '50M+',
      rate: 'Rate of 3+',
      rateShort: '3+',
      desc: 'The Klondike solitaire you already know, rebuilt for the phone with one-tap moves and unlimited undo.',
      longDesc: 'The Klondike solitaire you already know, rebuilt for the phone with one-tap moves and unlimited undo. Choose between drawing one card or three, turn on winnable-only deals if you prefer a guaranteed solution, and track your best times across every difficulty.',
      shots: [A + 'screenshot-3.svg', A + 'screenshot-1.svg', A + 'screenshot-2.svg']
    },
    slots: {
      title: 'Slots Fever',
      icon: A + 'g3.svg',
      tags: ['Casino', 'Slots'],
      rating: '4.2',
      ratingCount: '9M Ratings',
      players: '30M+',
      rate: 'Rate of 18+',
      rateShort: '18+',
      desc: 'Spin five reels across a dozen themed machines, each with its own bonus round and jackpot ladder.',
      longDesc: 'Spin five reels across a dozen themed machines, each with its own bonus round and jackpot ladder. Free spins stack, wilds expand, and the progressive pot grows with every player at the table.',
      shots: [A + 'screenshot-2.svg', A + 'screenshot-3.svg', A + 'screenshot-1.svg']
    }
  };

  const RECOMMEND = ['g2', 'g4', 'g5', 'g6', 'g7', 'g8'];
  const MODAL_POOL = ['g1','g2','g3','g4','g5','g6','g7','g8','g9','g10','g11','g12','g13','g14'];

  /* 分类数据。名称不带 "Games" 后缀 —— 由 CSS ::after 自动补，最后一项补单数。 */
  const CATEGORIES = [
    { slug: 'card',     name: 'Card' },
    { slug: 'casino',   name: 'Casino' },
    { slug: 'slots',    name: 'Slots' },
    { slug: 'puzzle',   name: 'Puzzle' },
    { slug: 'arcade',   name: 'Arcade' },
    { slug: 'board',    name: 'Board' },
    { slug: 'dice',     name: 'Dice' },
    { slug: 'bingo',    name: 'Bingo' },
    { slug: 'strategy', name: 'Strategy' }
  ];
  const TAGS = ['1-player', 'html5', 'mobile', 'android', 'ios',
                'touchscreen', 'free', 'online', 'no-download'];

  /* ---------------- 参数解析 ---------------- */
  const qs = new URLSearchParams(location.search);
  const gid = qs.get('gid') || 'blackjack';
  const cp = qs.get('cp') || 'FunMax Studio';
  const sty = qs.get('sty') || '1';
  const isDetail = qs.get('is_detail') !== '0';
  const theme = qs.get('theme');
  const game = GAMES[gid] || GAMES.blackjack;

  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  const $ = (id) => document.getElementById(id);

  // home 按钮是 fixed（top 26.02vw / right 2.55vw），按该定位显示会压住标签行，
  // 因此默认隐藏，用 ?home=1 单独查看。
  if (qs.get('home') !== '1') $('home-btn').hidden = true;

  /* ---------------- 渲染基础信息 ---------------- */
  document.title = game.title + ' - Game Center';
  $('g-icon').src = game.icon;
  $('g-title').textContent = game.title;
  $('g-dev').textContent = cp;
  $('g-rating').textContent = game.rating;
  $('g-rating-count').textContent = game.ratingCount;
  $('g-players').textContent = game.players;
  $('g-rate').textContent = game.rate;
  $('g-rate-short').textContent = game.rateShort;
  $('banner-title').textContent = game.title;
  document.querySelector('.dp-banner-icon img').src = game.icon;

  $('g-tags').innerHTML = game.tags
    .map((t) => `<div class="game-tag-item">${t}</div>`)
    .join('');

  /* ---------------- 样式变体 ---------------- */
  // sty=2：切到大标题布局 + 可展开描述，隐藏浅蓝描述卡
  if (sty === '2') {
    $('game-content').classList.add('game-content-new');
    $('g-desc').hidden = true;
    const dn = $('desc-new');
    dn.hidden = false;
    $('desc-new-content').innerHTML =
      `<span id="desc-new-text">${game.longDesc}</span>` +
      `<span class="game-description-new-expend-overlay" id="desc-toggle" role="button" tabindex="0">` +
      `expand<svg class="game-description-new-expend-icon" width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true">` +
      `<path d="M1 1.5 5 5.5l4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    wireDescToggle();
  } else {
    $('g-desc').textContent = game.desc;
  }

  // 展开 / 收起
  function wireDescToggle() {
    const box = $('desc-new-content');
    const toggle = $('desc-toggle');
    if (!box || !toggle) return;
    // 超出 4.2em 才显示 expand
    requestAnimationFrame(() => {
      if (box.scrollHeight > box.clientHeight + 2) box.classList.add('has-overflow');
      else toggle.style.display = 'none';
    });
    const flip = () => {
      const collapsed = box.classList.toggle('collapsed');
      toggle.firstChild.textContent = collapsed ? 'expand' : 'collapse';
      toggle.querySelector('svg').style.transform = collapsed ? '' : 'rotate(180deg)';
    };
    toggle.addEventListener('click', flip);
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });
  }

  /* ---------------- 截图 ---------------- */
  // 单张走大图模式，多张走小图横滑
  const large = game.shots.length === 1;
  $('shots').innerHTML = game.shots
    .map(
      (s) =>
        `<div class="game-screenshot-item${large ? ' game-large-screenshot-item' : ''}">` +
        `<img src="${s}" alt="screenshot" /></div>`
    )
    .join('');
  // 第一张用大图样式，其余小图横滑
  if (!large) {
    const items = $('shots').children;
    items[0].classList.add('game-large-screenshot-item');
  }

  /* ---------------- 推荐 3×2 ---------------- */
  $('recommend-list').innerHTML = RECOMMEND.map(
    (g) => `<div class="game-modal-item"><img src="${A}${g}.svg" alt="game" /></div>`
  ).join('');
  $('recommend-list').addEventListener('click', (e) => {
    const item = e.target.closest('.game-modal-item');
    if (item) openModal();
  });

  /* ---------------- 游戏分类导航 ---------------- */
  $('cat-list').innerHTML = CATEGORIES.map(
    (c) =>
      `<a href="../index.html#/t/${c.slug}" aria-label="${c.name} games">` +
      `<div class="item"><img src="${A}cat-${c.slug}.svg" alt="${c.name}" loading="lazy" /></div>` +
      `<div class="name"><span class="text">${c.name}</span></div></a>`
  ).join('');

  $('tag-list').innerHTML = TAGS.map(
    (t) => `<li><a href="../index.html#/t/${t}">${t}</a></li>`
  ).join('');

  // 随机挑一个内置 gid 跳过去，排除当前这个
  $('random-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const ids = Object.keys(GAMES).filter((id) => id !== gid);
    if (!ids.length) return;
    const next = ids[Math.floor(Math.random() * ids.length)];
    const p = new URLSearchParams(location.search);
    p.set('gid', next);
    location.search = p.toString();
  });

  /* ---------------- 底部 banner ---------------- */
  // banner 存在时给 main 加 padding，避免内容被遮住
  if (isDetail) {
    $('main').classList.add('main-with-banner');
    $('float-bar').classList.add('floating-play-bar-above-banner');
  } else {
    $('dp-banner').hidden = true;
  }
  $('banner-btn').addEventListener('click', startPlay);

  /* ---------------- 播放流程 ---------------- */
  const playBtn = $('play-btn');
  const playText = $('play-btn-text');
  const playIcon = $('play-icon');
  const spinner = $('loading-spinner');
  const autoInner = $('auto-loading-inner');
  let busy = false;

  // 进场 1.2s 后开始呼吸，吸引点击
  setTimeout(() => playBtn.classList.add('breathing-effect'), 1200);

  function startPlay() {
    if (busy) return;
    busy = true;
    playBtn.classList.remove('breathing-effect');
    playBtn.classList.add('game-play-btn-loading', 'auto-loading-btn');
    playIcon.hidden = true;
    spinner.hidden = false;
    playText.textContent = 'Loading…';
    autoInner.hidden = false;

    // clip-path 从 inset(0 100% 0 0) 收到 0，模拟加载进度
    let p = 0;
    const timer = setInterval(() => {
      p += 4 + Math.random() * 7;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setTimeout(finishPlay, 260);
      }
      autoInner.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      autoInner.textContent = Math.round(p) + '%';
    }, 110);
  }

  function finishPlay() {
    busy = false;
    playBtn.classList.remove('game-play-btn-loading', 'auto-loading-btn');
    playIcon.hidden = false;
    spinner.hidden = true;
    playText.textContent = 'Click to play';
    autoInner.hidden = true;
    autoInner.style.clipPath = 'inset(0 100% 0 0)';
    openModal();
  }

  playBtn.addEventListener('click', startPlay);
  $('float-btn').addEventListener('click', startPlay);

  /* ---------------- 游戏墙弹窗 ---------------- */
  // style2/4 用 14 格不规则 grid，style3 用 5×4
  function openModal() {
    const content = $('modal-content');
    const styleClass = sty === '3' ? 'game-modal-style3'
      : sty === '4' ? 'game-modal-style4'
      : 'game-modal-style2';
    content.className = 'game-modal-content ' + styleClass;
    const count = styleClass === 'game-modal-style3' ? 20 : 14;
    content.innerHTML = MODAL_POOL.slice(0, Math.min(count, MODAL_POOL.length))
      .concat(MODAL_POOL)
      .slice(0, count)
      .map((g) => `<div class="game-modal-item"><img src="${A}${g}.svg" alt="game" /></div>`)
      .join('');
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('modal').hidden = true;
    document.body.style.overflow = '';
  }
  $('modal-close').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => {
    if (e.target === $('modal')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('modal').hidden) closeModal();
  });

  /* ---------------- 滚动浮出播放条 ---------------- */
  // 主 CTA 滚出视口后浮条出现；但滚到页面尾部时收起 ——
  // 尾部有游戏导航的 Random 按钮和底部品牌条的 Play，三个圆角按钮叠在一起会糊成一团。
  const floatBar = $('float-bar');
  let ctaHidden = false;
  const BOTTOM_GUARD = 140;                 // 距底多少像素开始收起

  const syncFloatBar = () => {
    const doc = document.documentElement;
    const nearBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - BOTTOM_GUARD;
    floatBar.classList.toggle('floating-play-bar-visible', ctaHidden && !nearBottom);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => { ctaHidden = !en.isIntersecting; });
      syncFloatBar();
    },
    { threshold: 0 }
  );
  io.observe(playBtn);

  let fbTicking = false;
  window.addEventListener('scroll', () => {
    if (fbTicking) return;
    fbTicking = true;
    requestAnimationFrame(() => { syncFloatBar(); fbTicking = false; });
  }, { passive: true });
  window.addEventListener('resize', syncFloatBar);

  /* ---------------- App 风格顶部导航栏 ----------------
     默认关闭，需要时用 ?topnav=1 打开。 */
  const nav = $('detail-nav');
  if (qs.get('topnav') !== '1') {
    nav.hidden = true;
    $('nav-toast').remove();
  } else {
    $('nav-title').textContent = game.title;

    // 滚过游戏图标后：导航落实背景 + 标题淡入。
    // 不用 IntersectionObserver 的 rootMargin —— 它只接受 px / %，不认 vw，
    // 而这里的阈值依赖 vw 换算，滚动监听还能顺带自适应 resize。
    const icon = document.querySelector('.game-icon');
    let ticking = false;
    const syncNav = () => {
      const y = window.scrollY;
      const navH = window.innerWidth * 0.132653;          // 13.2653vw
      // 背景：一滚就落实，否则内容会从透明导航下穿过
      nav.classList.toggle('is-scrolled', y > 4);
      // 标题：图标中线滚到导航下沿时淡入。
      // 用中线而不是底边 —— 底边要求滚过 96px，而本页可滚距离只有 95px，
      // 会导致标题永远不出现。
      const iconMid = icon.offsetTop + icon.offsetHeight / 2;
      nav.classList.toggle('is-titled', y > iconMid - navH);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncNav);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    syncNav();

    // 返回：有历史就回退，否则回 FunMax 首页
    $('nav-back').addEventListener('click', () => {
      if (history.length > 1) history.back();
      else location.href = '../index.html';
    });

    $('nav-search').addEventListener('click', () => {
      location.href = '../index.html#/';
    });

    // 分享：优先系统分享面板，否则复制链接
    $('nav-share').addEventListener('click', async () => {
      const data = { title: game.title, text: game.desc, url: location.href };
      try {
        if (navigator.share) { await navigator.share(data); return; }
        await navigator.clipboard.writeText(location.href);
        toast('Link copied');
      } catch (e) {
        // 用户取消分享或无剪贴板权限，静默处理
        if (e && e.name !== 'AbortError') toast('Could not share');
      }
    });

    // 更多菜单
    const moreBtn = $('nav-more');
    const menu = $('nav-menu');
    const setMenu = (open) => {
      menu.hidden = !open;
      moreBtn.setAttribute('aria-expanded', String(open));
    };
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenu(menu.hidden);
    });
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-act]');
      if (!item) return;
      setMenu(false);
      const act = item.dataset.act;
      if (act === 'wishlist') {
        const key = 'fm.wishlist';
        let list = [];
        try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (err) { list = []; }
        if (list.includes(gid)) toast('Already in wishlist');
        else {
          list.push(gid);
          try { localStorage.setItem(key, JSON.stringify(list)); } catch (err) { /* 隐私模式 */ }
          toast('Added to wishlist');
        }
      } else if (act === 'copy') {
        navigator.clipboard.writeText(location.href)
          .then(() => toast('Link copied'))
          .catch(() => toast('Could not copy'));
      } else if (act === 'home') {
        location.href = '../index.html';
      }
    });
    document.addEventListener('click', () => { if (!menu.hidden) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) setMenu(false);
    });
  }

  let toastTimer;
  function toast(msg) {
    const t = $('nav-toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
  }
})();
