/* 游戏分类导航验证 + 确认其他元素坐标不变 */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:8777/detail/game-detail.html?gid=blackjack&is_detail=1&sty=1';

const BASELINE = {
  icon: [35, 52, 96, 96], title: [147, 59, 231, 27], tag1: [147, 91, 43, 23],
  dev: [147, 119, 231, 21], info: [0, 163, 390, 40], desc: [12, 218, 366, 85],
  btn: [12, 322, 366, 48], shot: [0, 385, 393, 199]
};

const out = [];
const ok = (n, p, e) => out.push([n, p, e || '']);
const near = (a, b, t = 1.2) => Math.abs(a - b) <= t;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2
  });
  const errs = [];
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text()))
      errs.push('[console] ' + m.text());
  });
  page.on('response', r => {
    if (r.status() >= 400 && !/favicon/i.test(r.url())) errs.push('[HTTP ' + r.status() + '] ' + r.url());
  });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(120);

  // ---- 新增分类导航后，其他元素坐标必须不变 ----
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
  let drift = 0;
  for (const [k, base] of Object.entries(BASELINE)) {
    const g = boxes[k];
    const d = g ? Math.max(...g.map((v, i) => Math.abs(v - base[i]))) : 999;
    drift = Math.max(drift, d);
  }
  ok('核心元素坐标未偏移', drift === 0, '最大偏移 ' + drift + 'px');

  // ---- 顶部导航默认关闭 ----
  ok('顶部导航默认关闭',
    await page.evaluate(() => document.getElementById('detail-nav').hidden));

  // ---- 游戏导航存在性与结构 ----
  ok('游戏导航区块存在', (await page.locator('#game-category').count()) === 1);
  ok('标题为 Game Categories',
    (await page.textContent('.game-category .box-header h2')).trim() === 'Game Categories');

  const bh = await page.evaluate(() => {
    const h = document.querySelector('.game-category .box-header h2');
    const cs = getComputedStyle(h);
    const hdr = getComputedStyle(document.querySelector('.game-category .box-header'));
    return { bl: cs.borderLeftWidth, blc: cs.borderLeftColor, fs: parseFloat(cs.fontSize),
             bb: hdr.borderBottomStyle, h: parseFloat(hdr.height) };
  });
  ok('标题左侧竖条 = 4px', parseFloat(bh.bl) === 4, bh.bl + ' ' + bh.blc);
  ok('标题下点线分隔', bh.bb === 'dotted', bh.bb);
  ok('box-header 高 9.18vw (36px)', near(bh.h, 35.8163), bh.h.toFixed(2) + 'px');

  // 3 列网格
  const grid = await page.evaluate(() => {
    const l = document.querySelector('.game-category .list');
    return getComputedStyle(l).gridTemplateColumns.split(' ').length;
  });
  ok('分类为 3 列', grid === 3, grid + ' 列');
  ok('9 个分类项', (await page.locator('.game-category .list a').count()) === 9);

  // 缩略图全部加载
  const imgsOk = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.game-category .list img')).every(i => i.naturalWidth > 0));
  ok('分类缩略图全部加载成功', imgsOk);
  const lazy = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.game-category .list img')).every(i => i.loading === 'lazy'));
  ok('缩略图启用 lazy', lazy);

  // ::after 自动补后缀
  const suffix = await page.evaluate(() => {
    const els = document.querySelectorAll('.game-category .list .name .text');
    return {
      first: getComputedStyle(els[0], '::after').content,
      last: getComputedStyle(els[els.length - 1], '::after').content
    };
  });
  ok('分类名自动补 " Games"', /Games/.test(suffix.first), suffix.first);
  ok('最后一项补单数 " Game"', suffix.last.includes('Game') && !suffix.last.includes('Games'), suffix.last);

  // 渲染出来的可读文本
  const catText = await page.evaluate(() =>
    document.querySelector('.game-category .list a').innerText.trim());
  ok('首个分类文本为 Card', catText === 'Card', catText);

  // 分类链接指向标签页
  const hrefs = await page.locator('.game-category .list a').evaluateAll(a => a.map(x => x.getAttribute('href')));
  ok('分类链接指向 #/t/{slug}', hrefs.every(h => h.includes('#/t/')), hrefs[0]);

  // ---- 标签 pill ----
  ok('标签区块存在', (await page.locator('.game-category .tag-panel').count()) === 1);
  ok('9 个标签 pill', (await page.locator('.nav-pills-tags a').count()) === 9);
  const pill = await page.evaluate(() => {
    const a = document.querySelector('.nav-pills-tags a');
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    return { h: r.height, radius: cs.borderRadius, color: cs.color };
  });
  ok('pill 触控高度 ≥30px', pill.h >= 30, pill.h.toFixed(1) + 'px');
  ok('pill 为全圆角', parseFloat(pill.radius) > 100, pill.radius);

  // ---- Random Game 按钮 ----
  ok('Random 按钮存在', (await page.locator('#random-btn').count()) === 1);
  ok('Random 按钮文案正确',
    (await page.textContent('#random-btn')).trim() === 'Play A Random Game');
  const rb = await page.evaluate(() => {
    const r = document.getElementById('random-btn').getBoundingClientRect();
    return r.height;
  });
  ok('Random 按钮高度 ≥44px', rb >= 44, rb.toFixed(1) + 'px');

  // Random 按钮在页面最底部，要同时避开两个 fixed 元素：品牌条与浮动播放条。
  // 先滚到底并等 IntersectionObserver 回调跑完，否则浮动条还没显示，检测等于没做。
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  // 尾部主动收起浮动条，避免和 Random 按钮、品牌条 Play 三个圆角按钮叠在一起
  const fbarAtBottom = await page.evaluate(() =>
    document.getElementById('float-bar').classList.contains('floating-play-bar-visible'));
  ok('滚到尾部时浮动播放条已收起', !fbarAtBottom);

  // 中段（CTA 已出视口但未到尾部）浮动条应当可见
  const midShown = await page.evaluate(() => {
    const doc = document.documentElement;
    window.scrollTo(0, Math.max(0, doc.scrollHeight - window.innerHeight - 400));
    return new Promise((res) => setTimeout(() =>
      res(document.getElementById('float-bar').classList.contains('floating-play-bar-visible')), 400));
  });
  ok('页面中段浮动播放条正常显示', midShown);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);

  const occl = await page.evaluate(() => {
    const btn = document.getElementById('random-btn');
    const b = btn.getBoundingClientRect();
    const banner = document.getElementById('dp-banner').getBoundingClientRect();
    const fbar = document.getElementById('float-bar');
    const fb = fbar.querySelector('.floating-play-btn').getBoundingClientRect();
    const fbarVisible = fbar.classList.contains('floating-play-bar-visible');
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return {
      overlapped: b.bottom > banner.top,
      floatOverlap: fbarVisible && !(b.bottom <= fb.top || b.top >= fb.bottom),
      fbarVisible,
      hitIsBtn: !!hit && (hit.id === 'random-btn' || btn.contains(hit)),
      hitTag: hit ? (hit.id || hit.className || hit.tagName) : 'null',
      gap: Math.round(fb.top - b.bottom)
    };
  });
  ok('滚到底时 Random 按钮未被品牌条遮挡', !occl.overlapped,
     occl.overlapped ? '按钮底边低于 banner 顶边' : '');
  ok('滚到底时 Random 按钮与浮动条无重叠', !occl.floatOverlap,
     occl.floatOverlap ? '与浮动条重叠' : (occl.fbarVisible ? `间距 ${occl.gap}px` : '浮动条已收起'));
  ok('Random 按钮可被真实点击命中', occl.hitIsBtn, '命中: ' + occl.hitTag);

  // 用 DOM click 触发（按钮在长页面底部，坐标点击易落空）
  await page.evaluate(() => document.getElementById('random-btn').click());
  await page.waitForTimeout(1500);
  const newGid = await page.evaluate(() => new URLSearchParams(location.search).get('gid'));
  ok('Random 跳到其他游戏', newGid && newGid !== 'blackjack', 'gid=' + newGid);
  const newTitle = await page.textContent('#g-title');
  ok('跳转后标题已更新', newTitle !== 'Black Of Jack', newTitle);

  // ---- 分类导航应位于推荐位之后 ----
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const order = await page.evaluate(() => {
    const rec = document.getElementById('recommend').getBoundingClientRect().top;
    const cat = document.getElementById('game-category').getBoundingClientRect().top;
    return cat > rec;
  });
  ok('游戏导航位于推荐位下方', order);

  // ---- 暗色主题 ----
  await page.goto(BASE + '&theme=dark', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const dk = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.game-category .list a')).backgroundColor,
    h2: getComputedStyle(document.querySelector('.game-category .box-header h2')).color
  }));
  ok('暗色下分类卡片为深色', dk.card === 'rgb(31, 34, 48)', dk.card);
  ok('暗色下标题为浅色', dk.h2 === 'rgb(232, 232, 232)', dk.h2);

  // ---- topnav=1 仍可用 ----
  await page.goto(BASE + '&topnav=1', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  ok('topnav=1 可开启顶栏',
    !(await page.evaluate(() => document.getElementById('detail-nav').hidden)));

  // 截图
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  await page.screenshot({ path: './out/gamenav.png' });
  await page.screenshot({ path: './out/gamenav-full.png', fullPage: true });
  await page.goto(BASE + '&theme=dark', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: './out/gamenav-dark.png' });

  await browser.close();

  console.log('============== 游戏导航验证 ==============');
  out.forEach(([n, p, e]) => console.log(`${p ? '✅' : '❌'} ${n}${e ? '  (' + e + ')' : ''}`));
  console.log(`\n通过 ${out.filter(o => o[1]).length}/${out.length}`);
  if (errs.length) { console.log('\n异常:'); [...new Set(errs)].forEach(e => console.log('  ' + e)); }
  else console.log('控制台与资源加载：无报错');
})().catch(e => { console.error(e); process.exit(1); });
