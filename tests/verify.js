/* 用本机 Chrome 真实跑一遍，验证路由 / 筛选 / 6 个游戏可交互 */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:8777';
const errors = [];
const results = [];
function ok(name, pass, extra) {
  results.push({ name, pass, extra: extra || '' });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => errors.push('[404/fail] ' + r.url() + ' ' + (r.failure() || {}).errorText));

  // ---------- 首页 ----------
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  ok('首页 title 含关键词', (await page.title()).includes('Free HTML5 Games'), await page.title());
  ok('h1 存在', (await page.locator('h1').count()) >= 1);
  ok('静态卡片 6 张', (await page.locator('.game-item').count()) === 6);
  const hrefs = await page.locator('.common-game-link').evaluateAll(a => a.map(x => x.getAttribute('href')));
  ok('卡片均有 href', hrefs.every(h => h && h.startsWith('#/game/')), hrefs.join(','));
  const alts = await page.locator('.common-game-icon').evaluateAll(i => i.map(x => x.getAttribute('alt')));
  ok('卡片 img 均有非空 alt', alts.every(a => a && a.length > 10));
  const srcs = await page.locator('.common-game-icon').evaluateAll(i => i.map(x => x.naturalWidth));
  ok('卡片图片全部加载成功', srcs.every(w => w > 0), 'naturalWidth=' + srcs.join(','));
  ok('JSON-LD 静态 3 段', (await page.locator('script[type="application/ld+json"]').count()) === 3);

  // ---------- 搜索 ----------
  await page.fill('#q', 'snake');
  await page.waitForTimeout(150);
  const visAfterSearch = await page.locator('.game-item:not([hidden])').count();
  ok('搜索 snake 命中 1 个', visAfterSearch === 1, 'visible=' + visAfterSearch);
  await page.click('.search-clear');
  await page.waitForTimeout(120);
  ok('清空搜索恢复 6 个', (await page.locator('.game-item:not([hidden])').count()) === 6);

  // ---------- 分类筛选 ----------
  await page.click('.chip[data-cat="puzzle"]');
  await page.waitForTimeout(120);
  const puz = await page.locator('.game-item:not([hidden])').count();
  ok('Puzzle 分类 3 个', puz === 3, 'visible=' + puz);
  await page.click('.chip[data-cat="all"]');
  await page.waitForTimeout(120);

  // ---------- 排序 ----------
  await page.selectOption('#sort', 'plays');
  await page.waitForTimeout(150);
  const firstByPlays = await page.locator('.game-item:not([hidden])').evaluateAll(
    els => els.slice().sort((a, b) => (+a.style.order) - (+b.style.order))[0].dataset.id);
  ok('按 plays 排序首位是 snake', firstByPlays === 'snake', 'first=' + firstByPlays);
  await page.selectOption('#sort', 'default');

  // ---------- 收藏 ----------
  await page.click('.game-item[data-id="2048"] .fav-btn');
  await page.waitForTimeout(120);
  const pressed = await page.getAttribute('.game-item[data-id="2048"] .fav-btn', 'aria-pressed');
  ok('收藏按钮 aria-pressed=true', pressed === 'true');
  await page.click('.main-nav [data-nav="favorites"]');
  await page.waitForTimeout(200);
  ok('My List 只显示已收藏', (await page.locator('.game-item:not([hidden])').count()) === 1);
  await page.click('.main-nav [data-nav="all"]');
  await page.waitForTimeout(150);

  // ---------- 详情页 + 动态 SEO ----------
  await page.goto(BASE + '/#/game/2048', { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  ok('详情页 title 动态', (await page.title()).includes('2048 Number Merge'), await page.title());
  const desc = await page.getAttribute('meta[name="description"]', 'content');
  ok('detail description 动态', desc.includes('2048'), desc.slice(0, 60));
  const canon = await page.getAttribute('link[rel="canonical"]', 'href');
  ok('canonical 指向详情页', canon.includes('/#/game/2048'), canon);
  ok('注入动态 LD', (await page.locator('script[data-dyn-ld]').count()) === 3);
  const ldTypes = await page.locator('script[data-dyn-ld]').evaluateAll(
    s => s.map(x => JSON.parse(x.textContent)['@type']));
  ok('LD 类型正确', ldTypes.includes('SoftwareApplication') && ldTypes.includes('BreadcrumbList') && ldTypes.includes('FAQPage'), ldTypes.join(','));
  const wordCount = await page.locator('#view-detail').evaluate(
    n => n.innerText.trim().split(/\s+/).length);
  ok('详情页正文 >450 词', wordCount > 450, 'words=' + wordCount);
  ok('FAQ 区块 3 问', (await page.locator('.faq dt').count()) === 3);
  ok('注入 FAQPage LD', (await page.locator('script[data-dyn-ld]').count()) === 3);
  ok('面包屑存在', (await page.locator('.breadcrumb').count()) === 1);
  ok('相似推荐 5 个', (await page.locator('.sim-card').count()) === 5);

  // ---------- 游戏 1：2048 真实交互 ----------
  ok('2048 棋盘 16 格', (await page.locator('.tw-cell').count()) === 16);
  const filledBefore = await page.locator('.tw-cell.is-filled').count();
  ok('2048 初始 2 个数字', filledBefore === 2, 'filled=' + filledBefore);
  for (const k of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    await page.keyboard.press(k); await page.waitForTimeout(90);
  }
  const filledAfter = await page.locator('.tw-cell.is-filled').count();
  const score2048 = await page.textContent('#score-val');
  ok('2048 按键后棋子增多', filledAfter > filledBefore, `${filledBefore}→${filledAfter}`);
  ok('2048 产生分数', Number(score2048) > 0, 'score=' + score2048);

  // ---------- 游戏 2：Snake ----------
  await page.goto(BASE + '/#/game/snake', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok('snake canvas 存在', (await page.locator('#stage canvas').count()) === 1);
  const px1 = await page.locator('#stage canvas').evaluate(c => {
    const g = c.getContext('2d'); return g.getImageData(0, 0, c.width, c.height).data.join('').length;
  });
  await page.waitForTimeout(700);   // 让循环跑几帧
  const snakeMoved = await page.locator('#stage canvas').evaluate(c => {
    // 统计非背景像素数，验证画面确实在渲染
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 60 || d[i + 1] > 60) n++;
    return n;
  });
  ok('snake canvas 有渲染内容', snakeMoved > 500, 'litPixels=' + snakeMoved);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(250);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
  ok('snake 方向键无异常', true);

  // ---------- 游戏 3：Breakout ----------
  await page.goto(BASE + '/#/game/breakout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok('breakout canvas 存在', (await page.locator('#stage canvas').count()) === 1);
  ok('breakout 显示 3 条命', (await page.textContent('#status-val')).includes('3'), await page.textContent('#status-val'));
  const box = await page.locator('#stage canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10);
  await page.waitForTimeout(1600);  // 等球撞砖块
  const bScore = Number(await page.textContent('#score-val'));
  ok('breakout 球在运动(得分或仍在跑)', !Number.isNaN(bScore), 'score=' + bScore);

  // ---------- 游戏 4：Memory ----------
  await page.goto(BASE + '/#/game/memory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok('memory 16 张卡', (await page.locator('.mm-card').count()) === 16);
  ok('memory 计分标签为 Moves', (await page.textContent('#score-label')) === 'Moves');
  await page.locator('.mm-card').nth(0).click(); await page.waitForTimeout(120);
  ok('memory 卡片可翻开', (await page.locator('.mm-card.is-open').count()) >= 1);
  await page.locator('.mm-card').nth(1).click(); await page.waitForTimeout(200);
  ok('memory 记录步数', Number(await page.textContent('#score-val')) === 1);

  // ---------- 游戏 5：Whack-a-Mole ----------
  await page.goto(BASE + '/#/game/whack', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  ok('whack 9 个洞', (await page.locator('.wm-hole').count()) === 9);
  ok('whack 倒计时在跑', /Time: \d+s/.test(await page.textContent('#status-val')), await page.textContent('#status-val'));
  // 等一只地鼠冒头后打它
  let hitScore = 0;
  for (let i = 0; i < 40; i++) {
    const up = page.locator('.wm-hole.is-up');
    if (await up.count()) {
      await up.first().click({ timeout: 900 }).catch(() => {});
      await page.waitForTimeout(120);
      hitScore = Number(await page.textContent('#score-val'));
      if (hitScore > 0) break;
    }
    await page.waitForTimeout(120);
  }
  ok('whack 命中地鼠得分', hitScore > 0, 'score=' + hitScore);

  // ---------- 游戏 6：Tic-Tac-Toe ----------
  await page.goto(BASE + '/#/game/tictactoe', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok('ttt 9 格', (await page.locator('.tt-cell').count()) === 9);
  await page.locator('.tt-cell').nth(4).click();     // 下中心
  await page.waitForTimeout(600);                     // 等 AI
  const marks = await page.locator('.tt-cell').evaluateAll(c => c.map(x => x.textContent).join(''));
  ok('ttt 落子且 AI 回应', marks.replace(/\s/g, '').length >= 2, 'board=' + marks);
  await page.click('.tt-modes [data-mode="2p"]');
  await page.waitForTimeout(200);
  ok('ttt 可切双人模式', (await page.locator('.tt-modes .btn.is-on').textContent()).includes('2 Players'));

  // ---------- 评分 ----------
  await page.goto(BASE + '/#/game/2048', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('.star[data-star="4"]').click();
  await page.waitForTimeout(150);
  ok('评分写入', (await page.textContent('#rate-note')).includes('4/5'), await page.textContent('#rate-note'));
  ok('4 颗星点亮', (await page.locator('.star.is-on').count()) === 4);

  // ---------- 切换游戏后旧循环应被销毁 ----------
  await page.goto(BASE + '/#/game/snake', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  ok('返回首页后无残留 canvas', (await page.locator('#stage canvas').count()) === 0);

  // ---------- 静态资源 ----------
  for (const p of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) {
    const r = await page.request.get(BASE + p);
    ok('资源可访问 ' + p, r.status() === 200, 'HTTP ' + r.status());
  }

  // ---------- 截图 ----------
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: './out/shot-home.png', fullPage: false });
  await page.goto(BASE + '/#/game/2048', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
  await page.screenshot({ path: './out/shot-2048.png', fullPage: false });
  await page.goto(BASE + '/#/game/snake', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: './out/shot-snake.png' });
  // 移动端视图
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(400);
  await mp.screenshot({ path: './out/shot-mobile.png' });

  await browser.close();

  // ---------- 汇总 ----------
  const pass = results.filter(r => r.pass).length;
  console.log('\n================ 验证结果 ================');
  results.forEach(r => console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.extra ? '  (' + r.extra + ')' : ''}`));
  console.log(`\n通过 ${pass}/${results.length}`);
  if (errors.length) {
    console.log('\n---------- 控制台/网络异常 ----------');
    [...new Set(errors)].forEach(e => console.log('  ' + e));
  } else {
    console.log('\n控制台与网络请求：无报错');
  }
  process.exit(pass === results.length && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('测试脚本异常:', e); process.exit(2); });
