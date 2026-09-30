/* 移动端全面检查：多尺寸 × 多页面，重点查横向溢出与元素挤压 */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8777';

const DEVICES = [
  { name: 'iphone-se',  w: 375, h: 667 },
  { name: 'iphone-14',  w: 390, h: 844 },
  { name: 'pixel-7',    h: 915, w: 412 },
  { name: 'landscape',  w: 844, h: 390 }
];
const PAGES = ['/', '/#/game/2048', '/#/game/snake', '/#/game/breakout', '/#/game/whack', '/#/game/tictactoe'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const problems = [];

  for (const d of DEVICES) {
    const page = await browser.newPage({
      viewport: { width: d.w, height: d.h }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 2
    });
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout 
        ? await page.waitForTimeout(500) : null;

      // 横向溢出检测
      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        const out = [];
        if (de.scrollWidth > de.clientWidth + 1) {
          // 找出超出视口的元素
          document.querySelectorAll('*').forEach(n => {
            const r = n.getBoundingClientRect();
            if (r.width > 0 && r.right > de.clientWidth + 1) {
              out.push({
                tag: n.tagName.toLowerCase(),
                cls: (n.className || '').toString().slice(0, 40),
                right: Math.round(r.right), w: Math.round(r.width)
              });
            }
          });
        }
        return { docW: de.scrollWidth, viewW: de.clientWidth, offenders: out.slice(0, 6) };
      });
      if (overflow.docW > overflow.viewW + 1) {
        problems.push(`${d.name} ${p} 横向溢出 ${overflow.docW}>${overflow.viewW} :: ` +
          overflow.offenders.map(o => `${o.tag}.${o.cls}(right=${o.right},w=${o.w})`).join(' | '));
      }

      // 头部是否换行成多行（挤压）
      const headerH = await page.evaluate(() => {
        const h = document.querySelector('.common-header');
        return h ? Math.round(h.getBoundingClientRect().height) : 0;
      });
      if (headerH > 120) problems.push(`${d.name} ${p} 头部过高 ${headerH}px（元素换行挤压）`);

      // canvas 是否超出舞台
      const cv = await page.evaluate(() => {
        const c = document.querySelector('#stage canvas');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        const s = document.querySelector('.stage').getBoundingClientRect();
        return { cw: Math.round(r.width), sw: Math.round(s.width) };
      });
      if (cv && cv.cw > cv.sw + 1) problems.push(`${d.name} ${p} canvas 超出舞台 ${cv.cw}>${cv.sw}`);

      // 触控目标尺寸（<40px 视为偏小）
      const smallTargets = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a,button,select,input').forEach(n => {
          const r = n.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          // WCAG 2.5.8 豁免内联文本目标：正文段落与面包屑里的链接不计
          if (n.closest('.seo-block p, .breadcrumb, .empty-state, .footer-note, .copyright')) return;
          // 有伪元素扩展热区的按钮按实际热区计（视觉 32 + inset -7 => 46）
          const ext = (n.classList.contains('fav-btn') || n.classList.contains('search-clear')) ? 14 : 0;
          if (r.height + ext < 34 || r.width + ext < 34) {
            out.push(`${n.tagName.toLowerCase()}.${(n.className||'').toString().slice(0,26)}(${Math.round(r.width)}x${Math.round(r.height)})`);
          }
        });
        return [...new Set(out)].slice(0, 8);
      });
      if (smallTargets.length) problems.push(`${d.name} ${p} 触控目标偏小: ${smallTargets.join(', ')}`);
    }

    // 截图：首页 + 一个 canvas 游戏 + 一个 DOM 游戏
    for (const [p, tag] of [['/', 'home'], ['/#/game/breakout', 'breakout'], ['/#/game/2048', '2048']]) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `./out/m-${d.name}-${tag}.png` });
    }
    await page.close();
  }

  await browser.close();
  console.log('=============== 移动端问题清单 ===============');
  if (!problems.length) console.log('未发现问题');
  else [...new Set(problems)].forEach(p => console.log('⚠️  ' + p));
})().catch(e => { console.error(e); process.exit(1); });
