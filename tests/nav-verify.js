/* 顶部导航栏验证 + 确认开启后其他元素坐标未变 */
const { chromium } = require('playwright-core');

// 顶栏默认关闭，需 topnav=1 显式开启
const BASE = 'http://localhost:8777/detail/game-detail.html?gid=blackjack&is_detail=1&sty=1&topnav=1';

// 期望值基准（390px）
const BASELINE = {
  icon: [35, 52, 96, 96], title: [147, 59, 231, 27], tag1: [147, 91, 43, 23],
  dev: [147, 119, 231, 21], info: [0, 163, 390, 40], desc: [12, 218, 366, 85],
  btn: [12, 322, 366, 48], shot: [0, 385, 393, 199]
};

const out = [];
const ok = (n, pass, extra) => out.push([n, pass, extra || '']);
const near = (a, b, t = 1.2) => Math.abs(a - b) <= t;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const errs = [];
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text()))
      errs.push('[console] ' + m.text());
  });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(120);

  // ---- 关键：开启顶栏后其他元素坐标必须不变 ----
  const boxes = await page.evaluate(() => {
    const pick = (s) => {
      const n = document.querySelector(s);
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    };
    return {
      icon: pick('.game-icon'), title: pick('.game-title'), tag1: pick('.game-tag-item'),
      dev: pick('.game-developer'), info: pick('.game-info-container'),
      desc: pick('.game-description'), btn: pick('.game-play-btn'),
      shot: pick('.game-screenshot-item')
    };
  });
  let maxDrift = 0;
  for (const [k, base] of Object.entries(BASELINE)) {
    const got = boxes[k];
    if (!got) { ok('坐标校验 ' + k, false, '元素缺失'); continue; }
    const d = Math.max(...got.map((v, i) => Math.abs(v - base[i])));
    maxDrift = Math.max(maxDrift, d);
    ok('坐标校验 ' + k, d === 0, d ? `偏差 ${d}px [${got}] vs [${base}]` : '');
  }

  // ---- 导航栏本体 ----
  const navBox = await page.evaluate(() => {
    const n = document.getElementById('detail-nav');
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return { x: r.left, y: r.top, w: r.width, h: r.height, pos: cs.position, z: cs.zIndex, bg: cs.backgroundColor };
  });
  ok('导航高度 = 13.2653vw (51.73px)', near(navBox.h, 51.7347), navBox.h.toFixed(2) + 'px');
  ok('导航满宽固定在顶部', navBox.pos === 'fixed' && navBox.y === 0 && near(navBox.w, 390));
  ok('导航初始背景透明', navBox.bg === 'rgba(0, 0, 0, 0)', navBox.bg);
  ok('导航高度正好等于 game-content 顶部留白',
    near(navBox.h, await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.game-content')).paddingTop))));

  const btnSize = await page.evaluate(() => {
    const b = document.getElementById('nav-back').getBoundingClientRect();
    return { w: b.width, h: b.height };
  });
  ok('导航按钮 ≥43px 触控', btnSize.w >= 43 && btnSize.h >= 43, `${btnSize.w.toFixed(1)}x${btnSize.h.toFixed(1)}`);
  ok('4 个导航按钮', (await page.locator('.detail-nav .nav-btn').count()) === 4);
  ok('导航标题取游戏名', (await page.textContent('#nav-title')) === 'Black Of Jack');
  ok('标题初始不可见',
    (await page.evaluate(() => getComputedStyle(document.getElementById('nav-title')).opacity)) === '0');

  // ---- 滚动切换（两阶段）----
  // 390x844 下整页仅 939px，可滚 95px，不足以让图标滚出导航；标题阶段用矮视口验证
  await page.evaluate(() => window.scrollTo(0, 40));
  await page.waitForTimeout(350);
  ok('轻微滚动即落实背景',
    await page.evaluate(() => document.getElementById('detail-nav').classList.contains('is-scrolled')));
  const scrolledBg = await page.evaluate(() => getComputedStyle(document.getElementById('detail-nav')).backgroundColor);
  ok('滚动后背景为白', scrolledBg === 'rgb(255, 255, 255)', scrolledBg);
  ok('此时标题仍未淡入（未过图标中线）',
    (await page.evaluate(() => getComputedStyle(document.getElementById('nav-title')).opacity)) === '0');
  // 默认视口滚到底（95px）应已过图标中线 48.27px，标题必须出现
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  ok('默认视口滚到底时标题已出现',
    (await page.evaluate(() => getComputedStyle(document.getElementById('nav-title')).opacity)) === '1');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  ok('回到顶部导航恢复透明',
    !(await page.evaluate(() => document.getElementById('detail-nav').classList.contains('is-scrolled'))));

  // 矮视口下验证标题淡入
  const sp = await browser.newPage({ viewport: { width: 390, height: 420 }, isMobile: true, hasTouch: true });
  await sp.goto(BASE, { waitUntil: 'load' });
  await sp.waitForTimeout(700);
  await sp.evaluate(() => window.scrollTo(0, 200));
  await sp.waitForTimeout(450);
  ok('滚过图标后标题淡入',
    await sp.evaluate(() => document.getElementById('detail-nav').classList.contains('is-titled')));
  ok('标题 opacity 变 1',
    (await sp.evaluate(() => getComputedStyle(document.getElementById('nav-title')).opacity)) === '1');
  await sp.close();

  // ---- 更多菜单 ----
  await page.click('#nav-more');
  await page.waitForTimeout(250);
  ok('更多菜单可展开', await page.evaluate(() => !document.getElementById('nav-menu').hidden));
  ok('aria-expanded 同步', (await page.getAttribute('#nav-more', 'aria-expanded')) === 'true');
  ok('菜单 3 项', (await page.locator('.nav-menu-item').count()) === 3);

  // 加入 wishlist
  await page.click('.nav-menu-item[data-act="wishlist"]');
  await page.waitForTimeout(350);
  ok('wishlist 提示出现', await page.evaluate(() => !document.getElementById('nav-toast').hidden));
  ok('wishlist 写入 localStorage',
    await page.evaluate(() => (JSON.parse(localStorage.getItem('fm.wishlist') || '[]'))
      .includes('blackjack')));
  // 再加一次应提示已存在
  await page.click('#nav-more'); await page.waitForTimeout(200);
  await page.click('.nav-menu-item[data-act="wishlist"]'); await page.waitForTimeout(300);
  ok('重复加入提示 Already',
    (await page.textContent('#nav-toast')).includes('Already'),
    await page.textContent('#nav-toast'));

  // Esc 关闭菜单
  await page.click('#nav-more'); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  ok('Esc 关闭菜单', await page.evaluate(() => document.getElementById('nav-menu').hidden));

  // 复制链接
  await page.click('#nav-more'); await page.waitForTimeout(200);
  await page.click('.nav-menu-item[data-act="copy"]'); await page.waitForTimeout(450);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok('复制链接写入剪贴板', clip.includes('game-detail.html'), clip.slice(0, 48));

  // ---- home 按钮不与导航重叠 ----
  await page.goto(BASE + '&home=1', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important}' });
  await page.waitForTimeout(120);
  const overlap = await page.evaluate(() => {
    const a = document.getElementById('detail-nav').getBoundingClientRect();
    const b = document.getElementById('home-btn').getBoundingClientRect();
    return !(b.top >= a.bottom || b.bottom <= a.top);
  });
  ok('home 按钮已下移，不与导航重叠', !overlap);

  // ---- 不带 topnav 时应回到纯复刻 ----
  await page.goto(BASE.replace('&topnav=1', ''), { waitUntil: 'load' });
  await page.waitForTimeout(600);
  ok('不带 topnav 参数时顶栏隐藏',
    await page.evaluate(() => document.getElementById('detail-nav').hidden));
  const box2 = await page.evaluate(() => {
    const r = document.querySelector('.game-icon').getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  });
  ok('顶栏隐藏时坐标符合基准', box2.join() === BASELINE.icon.join(), '[' + box2 + ']');

  // ---- 暗色主题下导航 ----
  await page.goto(BASE + '&theme=dark', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 40));
  await page.waitForTimeout(400);
  const darkBg = await page.evaluate(() => getComputedStyle(document.getElementById('detail-nav')).backgroundColor);
  ok('暗色下导航背景 #161824', darkBg === 'rgb(22, 24, 36)', darkBg);
  const darkTitle = await page.evaluate(() => getComputedStyle(document.getElementById('nav-title')).color);
  ok('暗色下标题为浅色', darkTitle === 'rgb(232, 232, 232)', darkTitle);

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: './out/nav-top.png' });
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForTimeout(500);
  await page.screenshot({ path: './out/nav-scrolled.png' });
  await page.click('#nav-more');
  await page.waitForTimeout(400);
  await page.screenshot({ path: './out/nav-menu.png' });

  await browser.close();

  console.log('================= 导航栏验证 =================');
  out.forEach(([n, p, e]) => console.log(`${p ? '✅' : '❌'} ${n}${e ? '  (' + e + ')' : ''}`));
  const pass = out.filter(o => o[1]).length;
  console.log(`\n通过 ${pass}/${out.length}   原有元素最大坐标偏移 ${maxDrift}px`);
  if (errs.length) { console.log('\n异常:'); [...new Set(errs)].forEach(e => console.log('  ' + e)); }
  else console.log('控制台无报错');
})().catch(e => { console.error(e); process.exit(1); });
