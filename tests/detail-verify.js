/* 详情页：逐元素比对尺寸、色值、圆角、字号 */
const { chromium } = require('playwright-core');

const MINE = 'http://localhost:8777/detail/game-detail.html?gid=blackjack&is_detail=1&sty=1';

// 期望值基准（390px 视口）
const EXPECT = [
  ['.game-content',        { padTop: 51.7347, radius: '0px 0px 19.898px 19.898px' }],
  ['.game-detail',         { w: 390, h: 96 }],
  ['.game-icon',           { w: 96, h: 96, radius: '18.2962px' }],
  ['.game-title',          { fs: 19.898, fw: '500', color: 'rgb(0, 0, 0)' }],
  ['.game-tag-item',       { fs: 13.9286, fw: '500', color: 'rgb(0, 132, 255)',
                             bg: 'rgba(0, 132, 255, 0.2)', radius: '7.9592px' }],
  ['.game-developer',      { fs: 15.9184, fw: '500', color: 'rgb(118, 118, 118)' }],
  ['.game-info-container', { h: 40 }],
  ['.game-info-item-value',{ fs: 15.9184, fw: '600', color: 'rgb(26, 26, 26)' }],
  ['.game-info-item-title',{ fs: 11.9388, color: 'rgb(163, 163, 163)' }],
  ['.game-description',    { w: 366.13, fs: 13.9286, color: 'rgb(26, 26, 26)',
                             bg: 'rgba(0, 132, 255, 0.05)', radius: '11.9388px' }],
  ['.game-play-btn',       { w: 366.122, h: 47.7551, fs: 16.9132,
                             bg: 'rgb(13, 132, 255)', color: 'rgb(255, 255, 255)',
                             radius: '39.7959px' }],
  // item 393x199（93.11vw + 左右 padding），内部 img 363x199
  ['.game-large-screenshot-item',     { w: 393,     h: 199 }],
  ['.game-large-screenshot-item img', { w: 363.138, h: 199, radius: '11.9388px' }],
  ['.dp-banner',           { h: 55.7143 }],
  ['.dp-banner-icon',      { w: 35.8163, h: 35.8163 }],
  ['.dp-banner-btn',       { fs: 13.9286, bg: 'rgb(52, 130, 255)' }],
  ['.floating-play-btn',   { w: 334.286, h: 49.7449, bg: 'rgb(52, 130, 255)' }],
  ['.game-recommend-list .game-modal-item', { w: 112.612, h: 112.612, radius: '15.9184px' }],
];

const near = (a, b, tol = 1.2) => Math.abs(a - b) <= tol;
const results = [];
const errs = [];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2
  });
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  page.on('console', m => {
    // favicon.ico 的 404 是浏览器默认请求，页面未声明 favicon，不计入异常
    if (m.type() === 'error' && !/favicon/i.test(m.text()) && !/Failed to load resource/i.test(m.text()))
      errs.push('[console] ' + m.text());
  });
  page.on('requestfailed', r => errs.push('[reqfail] ' + r.url()));
  page.on('response', r => {
    if (r.status() >= 400 && !/favicon/i.test(r.url())) errs.push('[HTTP ' + r.status() + '] ' + r.url());
  });

  await page.goto(MINE, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // 量尺寸前冻结动画：pulse / breathing 会让 boundingRect 随时间变化
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(150);

  for (const [sel, exp] of EXPECT) {
    const got = await page.evaluate((s) => {
      const n = document.querySelector(s);
      if (!n) return null;
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      return {
        w: r.width, h: r.height,
        fs: parseFloat(cs.fontSize), fw: cs.fontWeight,
        color: cs.color, bg: cs.backgroundColor,
        radius: cs.borderRadius,
        padTop: parseFloat(cs.paddingTop)
      };
    }, sel);
    if (!got) { results.push([sel, false, '元素不存在']); continue; }
    const bad = [];
    for (const [k, v] of Object.entries(exp)) {
      if (typeof v === 'number') { if (!near(got[k], v)) bad.push(`${k}: ${got[k].toFixed(2)} ≠ ${v}`); }
      else if (k === 'radius') {
        // 逐个半径值按数值比对，容忍 Chrome 的舍入（39.796 vs 39.7959）
        const a = String(got[k]).match(/[\d.]+/g) || [];
        const b = String(v).match(/[\d.]+/g) || [];
        if (a.length !== b.length || a.some((x, i) => !near(+x, +b[i], 0.05)))
          bad.push(`${k}: ${got[k]} ≠ ${v}`);
      }
      else if (got[k] !== v) bad.push(`${k}: ${got[k]} ≠ ${v}`);
    }
    results.push([sel, bad.length === 0, bad.join('; ')]);
  }

  // ---- 交互 ----
  const inter = [];
  inter.push(['标签渲染 2 个', (await page.locator('.game-tag-item').count()) === 2]);
  inter.push(['分隔线 2 条', (await page.evaluate(() =>
    Array.from(document.querySelectorAll('.game-info-item'))
      .filter(n => getComputedStyle(n, '::after').content === '""').length)) === 2]);
  inter.push(['推荐 6 个', (await page.locator('.game-recommend-list .game-modal-item').count()) === 6]);
  inter.push(['开发者名取默认值', (await page.textContent('#g-dev')) === 'FunMax Studio']);
  inter.push(['title 用游戏名', (await page.title()).startsWith('Black Of Jack')]);

  // 呼吸动画
  await page.waitForTimeout(700);
  inter.push(['CTA 呼吸动画已启动',
    await page.evaluate(() => document.getElementById('play-btn').classList.contains('breathing-effect'))]);

  // 浮条：初始隐藏，滚动后出现
  inter.push(['浮条初始隐藏',
    !(await page.evaluate(() => document.getElementById('float-bar').classList.contains('floating-play-bar-visible')))]);
  // 390x844 下整页仅 939px，可滚距离 95px，CTA 滚不出视口 —— 换矮视口验证浮条逻辑
  const short = await browser.newPage({ viewport: { width: 390, height: 420 }, isMobile: true, hasTouch: true });
  await short.goto(MINE, { waitUntil: 'load' });
  await short.waitForTimeout(700);
  await short.evaluate(() => window.scrollTo(0, 600));
  await short.waitForTimeout(700);
  inter.push(['滚动后浮条出现',
    await short.evaluate(() => document.getElementById('float-bar').classList.contains('floating-play-bar-visible'))]);
  inter.push(['浮条避开底部 banner',
    await short.evaluate(() => document.getElementById('float-bar').classList.contains('floating-play-bar-above-banner'))]);
  await short.close();

  // 播放流程 -> 弹窗
  await page.click('#play-btn', { force: true });
  await page.waitForTimeout(300);
  inter.push(['点击后进入 loading',
    await page.evaluate(() => document.getElementById('play-btn').classList.contains('game-play-btn-loading'))]);
  inter.push(['进度条 clip-path 在推进',
    await page.evaluate(() => {
      const cp = document.getElementById('auto-loading-inner').style.clipPath;
      return cp && cp !== 'inset(0 100% 0 0)';
    })]);
  await page.waitForTimeout(3800);
  const modalOpen = await page.evaluate(() => !document.getElementById('modal').hidden);
  inter.push(['加载完成后弹出游戏墙', modalOpen]);
  inter.push(['style2 弹窗 14 格', (await page.locator('#modal-content .game-modal-item').count()) === 14]);
  const grid = await page.evaluate(() => {
    const c = document.getElementById('modal-content');
    const cs = getComputedStyle(c);
    return { cols: cs.gridTemplateColumns.split(' ').length, rows: cs.gridTemplateRows.split(' ').length };
  });
  inter.push(['弹窗 4 列 5 行', grid.cols === 4 && grid.rows === 5, JSON.stringify(grid)]);
  const firstArea = await page.evaluate(() => {
    const n = document.querySelector('#modal-content .game-modal-item');
    return getComputedStyle(n).gridArea;
  });
  inter.push(['首格跨 2×2', firstArea.replace(/\s/g, '').startsWith('1/1/3/3'), firstArea]);
  await page.click('#modal-close', { force: true });
  await page.waitForTimeout(300);
  inter.push(['关闭弹窗', await page.evaluate(() => document.getElementById('modal').hidden)]);

  await page.screenshot({ path: './out/clone-full.png', fullPage: true });
  await page.screenshot({ path: './out/clone-view.png' });

  // sty=2 变体
  await page.goto(MINE.replace('sty=1', 'sty=2'), { waitUntil: 'load' });
  await page.waitForTimeout(800);
  inter.push(['sty=2 启用 contentNew',
    await page.evaluate(() => document.getElementById('game-content').classList.contains('game-content-new'))]);
  inter.push(['sty=2 显示可展开描述',
    await page.evaluate(() => !document.getElementById('desc-new').hidden)]);
  inter.push(['sty=2 隐藏浅蓝描述卡',
    await page.evaluate(() => document.getElementById('g-desc').hidden)]);
  inter.push(['sty=2 标题字号 5.61vw',
    near(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.game-title')).fontSize)), 21.888, 1)]);
  await page.screenshot({ path: './out/clone-sty2.png', fullPage: true });

  // 暗色主题
  await page.goto(MINE + '&theme=dark', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  inter.push(['暗色主题背景 #161824',
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(22, 24, 36)']);
  await page.screenshot({ path: './out/clone-dark.png', fullPage: true });

  // home 按钮（默认隐藏，?home=1 开启）
  await page.goto(MINE + '&home=1', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important}' });
  await page.waitForTimeout(120);
  const hb = await page.evaluate(() => {
    const n = document.querySelector('.home-btn img');
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return { w: r.width, h: r.height, radius: getComputedStyle(n).borderRadius,
             top: Math.round(document.querySelector('.home-btn').getBoundingClientRect().top) };
  });
  inter.push(['?home=1 显示 home 按钮 15.31vw', hb && near(hb.w, 59.6939) && near(hb.h, 59.6939),
    hb ? `${hb.w.toFixed(1)}x${hb.h.toFixed(1)} top=${hb.top}` : 'null']);
  inter.push(['home 按钮定位 top 26.02vw', hb && near(hb.top, 101.5, 1.5), hb ? 'top=' + hb.top : '']);
  inter.push(['默认不显示 home 按钮', await (async () => {
    await page.goto(MINE, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    return page.evaluate(() => document.getElementById('home-btn').hidden);
  })()]);

  // 无广告确认
  const adCount = await page.evaluate(() =>
    document.querySelectorAll('ins.adsbygoogle, .ads-box, .game-ext-container, [class*="google-anno"]').length);
  inter.push(['页面无任何广告节点', adCount === 0, 'found=' + adCount]);

  await browser.close();

  console.log('========== 样式比对（基准 390px） ==========');
  results.forEach(([s, ok, msg]) => console.log(`${ok ? '✅' : '❌'} ${s}${msg ? '  → ' + msg : ''}`));
  console.log('\n========== 交互与变体 ==========');
  inter.forEach(([n, ok, extra]) => console.log(`${ok ? '✅' : '❌'} ${n}${extra ? '  (' + extra + ')' : ''}`));
  const p1 = results.filter(r => r[1]).length, p2 = inter.filter(i => i[1]).length;
  console.log(`\n样式 ${p1}/${results.length}  交互 ${p2}/${inter.length}`);
  if (errs.length) { console.log('\n异常:'); [...new Set(errs)].forEach(e => console.log('  ' + e)); }
  else console.log('\n控制台与资源加载：无报错');
})().catch(e => { console.error(e); process.exit(1); });
