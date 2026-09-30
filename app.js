/* ============================================================
   app.js — 路由 / 筛选 / 详情页 / 收藏 / 评分
   要点：
     语义化 hash 路径 #/game/{slug}，不用查询参数
     每页动态 title / description / canonical / OG
     详情页正文（玩法 + 操作 + 技巧 + FAQ + 相似推荐）
     详情页注入 SoftwareApplication + AggregateRating + Breadcrumb + FAQPage
     搜索 / 分类筛选 / 排序 / 收藏 / 评分 / 全屏
   ============================================================ */
(function () {
  'use strict';

  /* ================== 游戏元数据 ==================
     真实站点这份数据应来自后端/CMS，并在服务端渲染进 HTML。 */
  const GAMES = {
    '2048': {
      id: '2048',
      name: '2048 Number Merge',
      short: 'Slide and combine numbered tiles until you reach 2048.',
      cats: ['Puzzle', 'Brain'],
      tags: ['puzzle', 'brain', 'classic'],
      rating: 4.6, ratingCount: 27566, plays: 18420,
      published: '2026-03-12', modified: '2026-09-20',
      howto: `2048 is played on a four-by-four grid. Every move slides all tiles in one direction until they hit
        the wall or another tile. When two tiles carrying the same number collide they merge into a single tile
        worth double, and the value of that merge is added to your score. After each move a new 2 or 4 appears
        in a random empty cell, so the board fills up steadily whether or not your move accomplished anything.
        The goal is a single tile worth 2048, which takes roughly 700 moves of clean play. The game ends when
        the grid is full and no two neighbouring tiles share a value.`,
      controls: [
        ['Arrow keys', 'Slide tiles up, down, left or right'],
        ['W A S D', 'Same as the arrow keys'],
        ['Swipe', 'Drag in any direction on a touch screen'],
        ['Restart button', 'Clear the board and start over']
      ],
      tips: `Pick one corner and never move the tiles out of it. Most players keep their largest tile in the
        bottom-left and only ever press left, down and right, reserving up for emergencies. Build your big
        numbers along a single edge so they stay adjacent and mergeable. If the board is getting crowded, look
        for the move that creates the most merges at once rather than the one that clears the most space.`,
      about: `2048 was written by Gabriele Cirulli in 2014 over a single weekend, itself a riff on the earlier
        games Threes and 1024. It spread quickly because the rules fit in one sentence while the decision space
        stays genuinely hard, and because a run takes minutes rather than hours. This implementation keeps the
        original four-by-four board, the 90/10 split between spawning a 2 and a 4, and the standard scoring rule
        where each merge adds the value of the tile it creates.`,
      faq: [
        ['Is 2048 free to play?',
         'Yes. 2048 Number Merge runs entirely in your browser with no download, no install and no account. There is nothing to pay and no time limit.'],
        ['What is the highest tile possible?',
         'On a four-by-four board the theoretical maximum is 131072, but it requires flawless play. Reaching 2048 is the normal win condition and already puts you ahead of most casual players.'],
        ['Does my score save if I close the tab?',
         'Your best score is stored in your browser on this device, so it survives a refresh. The board itself resets, and clearing site data will clear the record.']
      ]
    },
    snake: {
      id: 'snake',
      name: 'Snake Classic',
      short: 'Eat, grow, and try not to run into your own tail.',
      cats: ['Arcade', 'Reflex'],
      tags: ['arcade', 'reflex', 'classic'],
      rating: 4.4, ratingCount: 19204, plays: 24106,
      published: '2026-02-04', modified: '2026-09-18',
      howto: `You control a snake that moves continuously across a twenty-by-twenty grid and never stops. Each
        red dot you eat adds ten points and one segment to your tail, and the snake speeds up slightly for every
        fifty points you bank. The run ends the moment your head touches a wall or any part of your own body,
        which becomes the real constraint once the tail is long enough to block your own escape routes. There
        are no lives and no continues, so every run is a single attempt at your best score.`,
      controls: [
        ['Arrow keys', 'Turn up, down, left or right'],
        ['W A S D', 'Same as the arrow keys'],
        ['Swipe', 'Flick in the direction you want to turn'],
        ['Note', 'You cannot reverse straight back into yourself']
      ],
      tips: `Move in wide loops around the edge of the board rather than cutting across the middle, which keeps
        the centre free as an escape hatch. Before you commit to a turn, check that you are not sealing off a
        pocket of the board you will later need. Once the snake is long, the safest pattern is a boustrophedon
        sweep: go along one row, drop down, come back along the next.`,
      about: `Snake dates back to the 1976 arcade game Blockade and reached a mass audience in 1997 when Nokia
        shipped it on the 6110. Its appeal is that the difficulty is self-inflicted: the board never changes, but
        your own tail turns the space progressively against you. This version uses a twenty-by-twenty grid with
        wall collisions enabled and no wrap-around, which is the stricter of the two common rule sets.`,
      faq: [
        ['Can I play Snake on my phone?',
         'Yes. Swipe anywhere on the board to turn. The grid scales to your screen width, and the game works in both portrait and landscape.'],
        ['Does the snake get faster?',
         'It does. The step interval shortens for every fifty points you score, from 130 milliseconds down to a floor of 62 milliseconds, so late-game runs demand much quicker reactions.'],
        ['Why did I die without touching anything?',
         'Almost always a wall. The head occupies a full grid cell, so it dies the moment that cell would fall outside the twenty-by-twenty board, which can feel early if you were judging by the visible gap.']
      ]
    },
    breakout: {
      id: 'breakout',
      name: 'Breakout Brick Smash',
      short: 'Bounce the ball off your paddle to clear forty-five bricks.',
      cats: ['Arcade', 'Reflex'],
      tags: ['arcade', 'reflex', 'classic'],
      rating: 4.3, ratingCount: 14882, plays: 12980,
      published: '2026-01-22', modified: '2026-09-11',
      howto: `Forty-five bricks are stacked in five coloured rows at the top of the field. You move a paddle
        along the bottom edge and keep the ball in play by bouncing it upward. Bricks in higher rows are worth
        more: the top row pays fifty points and the bottom row ten. You start with three lives and lose one
        each time the ball falls past the paddle. Clear every brick to win the round; run out of lives and the
        run ends. The ball accelerates as the angle sharpens, so late-game rallies are considerably faster.`,
      controls: [
        ['Mouse', 'Move the paddle by moving the pointer'],
        ['Touch', 'Drag anywhere on the playfield'],
        ['← →', 'Nudge the paddle left and right'],
        ['Restart button', 'Reset bricks, score and lives']
      ],
      tips: `Where the ball lands on the paddle decides the rebound angle — hit it with the paddle edge for a
        sharp diagonal, hit it centrally for a near-vertical return. Steep angles are how you tunnel up the side
        of the stack and reach the valuable top rows early. When only a few bricks remain, aim for a shallow
        angle so the ball spends less time travelling and you spend less time waiting.`,
      about: `Breakout was built at Atari in 1976 by Nolan Bushnell and Steve Bristow, with the prototype
        hardware famously reworked by Steve Wozniak. It established the brick-clearing genre that later produced
        Arkanoid and dozens of successors. This implementation uses five rows of nine bricks with tiered scoring,
        three lives, and paddle-position-dependent rebound angles rather than simple mirror reflection.`,
      faq: [
        ['How many points is a perfect game?',
         'Clearing all forty-five bricks without losing a life gives 1350 points: nine bricks per row at fifty, forty, thirty, twenty and ten points from top to bottom.'],
        ['Can I control the ball direction?',
         'Indirectly. The rebound angle depends on where the ball strikes the paddle, so hitting with the edge sends it out at a sharp diagonal and hitting centrally returns it almost straight up.'],
        ['Does the ball speed up?',
         'The speed is capped, but the horizontal component grows with edge hits, which makes rallies feel considerably faster even though the total velocity stays bounded.']
      ]
    },
    memory: {
      id: 'memory',
      name: 'Memory Match',
      short: 'Flip cards two at a time and clear all eight pairs.',
      cats: ['Puzzle', 'Brain'],
      tags: ['puzzle', 'brain', 'kids'],
      rating: 4.0, ratingCount: 8410, plays: 9340,
      published: '2026-08-30', modified: '2026-09-25',
      howto: `Sixteen face-down cards hide eight matching pairs of fruit. Click or tap any two cards to reveal
        them. If the two faces match they stay open and turn green; if they do not, both flip back over after a
        short pause. Your score counts moves rather than points, so a lower number is better, and the timer
        runs until the last pair is found. A perfect game is eight moves, which requires knowing every position
        in advance — in practice anything under twenty is strong. The layout is reshuffled on every restart.`,
      controls: [
        ['Click / Tap', 'Flip a face-down card'],
        ['Restart button', 'Reshuffle and reset the move counter'],
        ['Note', 'Your best result is the fewest moves, not the highest score']
      ],
      tips: `Work the grid systematically instead of clicking at random: reveal cards in reading order so their
        positions are easier to encode. When you turn over a card you have seen before, resolve that pair
        immediately rather than gambling on a new one. Saying the fruit and position to yourself as you flip
        gives you a verbal anchor alongside the visual one, which measurably reduces repeat mistakes.`,
      about: `Concentration, also sold as Pelmanism or simply Memory, has been played with ordinary playing
        cards since at least the nineteenth century and became a fixture of children's game shelves in the
        twentieth. It is one of the few games where the only skill involved is recall, which makes it a common
        tool in cognitive testing. This version uses eight fruit pairs on a four-by-four grid and scores by move
        count so that accuracy matters more than speed.`,
      faq: [
        ['Is Memory Match suitable for kids?',
         'Yes. There is no timer pressure to fail against, no losing condition and no text to read, so it works for pre-readers as well as adults.'],
        ['Why is a lower score better here?',
         'This game counts moves rather than points. Each pair of flips is one move, so eight is a theoretical perfect game and anything under twenty is a strong result.'],
        ['Are the cards shuffled every time?',
         'Yes, every restart reshuffles all sixteen cards with a Fisher-Yates shuffle, so memorising one layout will not help on the next round.']
      ]
    },
    whack: {
      id: 'whack',
      name: 'Whack-a-Mole',
      short: 'Thirty seconds, nine holes, as many moles as you can hit.',
      cats: ['Arcade', 'Reflex'],
      tags: ['arcade', 'reflex', 'kids'],
      rating: 4.1, ratingCount: 11035, plays: 15220,
      published: '2026-09-02', modified: '2026-09-26',
      howto: `A mole pops out of one of nine holes and stays up for a limited window before dropping back down.
        Hitting it scores ten points. Clicking an empty hole costs you two points, so wild swinging is actively
        punished. You have thirty seconds, and the time a mole stays visible shrinks steadily as the clock runs
        down, from roughly nine tenths of a second at the start to under half a second at the end. Scores above
        two hundred require near-perfect accuracy in the final ten seconds.`,
      controls: [
        ['Click / Tap', 'Hit the mole that is currently up'],
        ['Restart button', 'Reset the clock and score'],
        ['Penalty', 'Minus two points for hitting an empty hole']
      ],
      tips: `Rest your pointer near the centre of the grid between hits so every hole is roughly equidistant.
        Watch the whole board with soft focus rather than tracking one hole — peripheral vision detects the pop
        faster than a deliberate scan. Because misses cost points, the correct response to uncertainty is to
        wait rather than swing; a skipped mole is worth zero, a wild swing is worth minus two.`,
      about: `Whac-A-Mole began as a physical arcade cabinet built by Aaron Fechter in 1976 and became shorthand
        for any problem that reappears elsewhere as soon as you solve it. The digital version keeps the core
        tension of the original: the reward for speed is constantly weighed against the cost of a mistimed swing.
        This implementation adds a two-point penalty for empty hits and shortens the mole's visible window as the
        thirty-second clock runs down.`,
      faq: [
        ['What is a good score?',
         'Anything over 150 is solid and over 200 is strong. A flawless thirty seconds tops out near 300, which needs both perfect accuracy and no hesitation in the final stretch.'],
        ['Why did my score go down?',
         'Clicking a hole with no mole in it costs two points. The penalty exists so that rapidly clicking every hole is worse than waiting and aiming.'],
        ['Does it get harder over time?',
         'Yes. The window a mole stays visible shrinks from about 900 milliseconds at the start to roughly 420 by the final seconds.']
      ]
    },
    tictactoe: {
      id: 'tictactoe',
      name: 'Tic-Tac-Toe vs AI',
      short: 'Three in a row, against a friend or an unbeatable computer.',
      cats: ['Puzzle', '2 Player'],
      tags: ['puzzle', '2p', 'classic'],
      rating: 3.8, ratingCount: 6220, plays: 7115,
      published: '2026-04-18', modified: '2026-09-14',
      howto: `Players alternate marking cells on a three-by-three grid, X first, and the first to line up three
        of their own marks horizontally, vertically or diagonally wins. In two-player mode you and a friend
        share one device. In computer mode the AI searches the full game tree with minimax, which means it
        plays perfectly: it will punish any mistake and never make one of its own. Against perfect play the
        best available result from either side is a draw, so treat every draw as a win on your part.`,
      controls: [
        ['Click / Tap', 'Place your mark in an empty cell'],
        ['vs Computer', 'Play against the perfect minimax AI'],
        ['2 Players', 'Hand the device back and forth'],
        ['Restart button', 'Clear the board, X starts again']
      ],
      tips: `Opening in the centre gives you the most winning lines; opening in a corner is the best way to set
        a trap against a weaker opponent. If the computer takes the centre, take a corner — never an edge. Look
        for forks, positions where a single move creates two separate threats, because a fork is the only way to
        force a win. Against the AI no fork exists, so your goal is simply to block every threat and draw.`,
      about: `Tic-Tac-Toe descends from Roman terni lapilli and is one of the earliest games to be solved
        completely: with perfect play from both sides it is always a draw. That property makes it a standard
        teaching example for game-tree search, which is exactly what powers the opponent here. The AI runs full
        minimax over all 255,168 possible games, scoring wins by depth so that it prefers faster victories and
        slower defeats.`,
      faq: [
        ['Can I actually beat the computer?',
         'No. The AI evaluates the complete game tree with minimax, so it never makes a losing move. Forcing a draw is the best possible outcome and counts as playing perfectly.'],
        ['Can two people play on one device?',
         'Yes. Switch to the 2 Players mode and take turns on the same screen. X always moves first and the AI stays out of it.'],
        ['What is the best opening move?',
         'The centre, because it sits on four of the eight winning lines. A corner is second best and creates more trap opportunities against a human opponent.']
      ]
    }
  };

  const ORDER = ['2048', 'snake', 'breakout', 'memory', 'whack', 'tictactoe'];
  const SITE = 'FunMax Games';
  const ORIGIN = 'https://suda-go.github.io/funmax-games';

  /* ================== 本地存储 ================== */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 隐私模式下静默失败 */ } }
  };
  const favs = () => LS.get('fm.favs', []);
  const toggleFav = (id) => {
    const f = favs();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    LS.set('fm.favs', f);
    return i < 0;
  };
  const myRating = (id) => LS.get('fm.rate.' + id, 0);

  /* ================== DOM 引用 ================== */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const views = { home: $('#view-home'), detail: $('#view-detail'), support: $('#view-support') };
  const listEl = $('#game-list');
  const searchInput = $('#q');
  const clearBtn = $('.search-clear');
  const sortSel = $('#sort');
  const emptyEl = $('#empty-state');
  const headingEl = $('#list-heading');

  let active = null;      // 当前挂载的游戏实例
  let state = { cat: 'all', q: '', sort: 'default' };

  /* ================== 动态 SEO ================== */
  function setMeta({ title, desc, url, image }) {
    document.title = title;
    const set = (sel, attr, val) => { const n = $(sel); if (n) n.setAttribute(attr, val); };
    set('meta[name="description"]', 'content', desc);
    set('link[rel="canonical"]', 'href', url);
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', desc);
    set('meta[property="og:url"]', 'content', url);
    set('meta[name="twitter:title"]', 'content', title);
    set('meta[name="twitter:description"]', 'content', desc);
    if (image) {
      set('meta[property="og:image"]', 'content', image);
      set('meta[name="twitter:image"]', 'content', image);
    }
  }
  // 详情页注入 SoftwareApplication + BreadcrumbList，离开时移除
  function setGameJsonLd(g) {
    $$('script[data-dyn-ld]').forEach(n => n.remove());
    if (!g) return;
    const url = `${ORIGIN}/#/game/${g.id}`;
    const app = {
      '@context': 'https://schema.org/',
      '@type': 'SoftwareApplication',
      applicationCategory: 'GameApplication',
      applicationSubCategory: g.cats[0],
      name: g.name,
      description: g.short,
      url,
      image: `${ORIGIN}/assets/icon-${g.id}.svg`,
      genre: g.cats,
      operatingSystem: 'any',
      datePublished: g.published,
      dateModified: g.modified,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(g.rating), bestRating: '5', worstRating: '1',
        ratingCount: String(g.ratingCount)
      },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      author: { '@type': 'Organization', name: SITE }
    };
    const crumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, item: { '@id': ORIGIN, name: 'Games' } },
        { '@type': 'ListItem', position: 2, item: { '@id': `${ORIGIN}/#/t/${g.tags[0]}`, name: g.cats[0] } },
        { '@type': 'ListItem', position: 3, item: { '@id': url, name: g.name } }
      ]
    };
    // FAQPage —— Google 可据此在结果页直接展开问答
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: g.faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a }
      }))
    };
    [app, crumbs, faq].forEach(obj => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.dynLd = '1';
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
    });
  }

  /* ================== 首页筛选 ================== */
  function applyFilter() {
    const q = state.q.trim().toLowerCase();
    let shown = 0;
    const items = $$('.game-item', listEl);

    items.forEach(li => {
      const g = GAMES[li.dataset.id];
      const inCat =
        state.cat === 'all' ? true :
        state.cat === 'fav' ? favs().includes(g.id) :
        (li.dataset.cat || '').split(/\s+/).includes(state.cat);
      const inQ = !q || g.name.toLowerCase().includes(q) ||
                  g.short.toLowerCase().includes(q) ||
                  g.tags.join(' ').includes(q);
      const ok = inCat && inQ;
      li.hidden = !ok;
      if (ok) shown++;
    });

    // 排序：改 order 而非搬 DOM
    const keyed = items.map(li => {
      const g = GAMES[li.dataset.id];
      return { li, g, def: ORDER.indexOf(g.id) };
    });
    const cmp = {
      default: (a, b) => a.def - b.def,
      rating: (a, b) => b.g.rating - a.g.rating,
      plays: (a, b) => b.g.plays - a.g.plays,
      az: (a, b) => a.g.name.localeCompare(b.g.name)
    }[state.sort];
    keyed.sort(cmp).forEach((x, i) => { x.li.style.order = i; });

    emptyEl.hidden = shown > 0;
    const label = state.cat === 'all' ? 'All Games'
      : state.cat === 'fav' ? 'My List'
      : state.cat.replace(/^\w/, c => c.toUpperCase()) + ' Games';
    headingEl.textContent = q ? `Results for “${state.q.trim()}”` : label;
  }

  function syncFavButtons() {
    const f = favs();
    $$('[data-fav]').forEach(btn => {
      const on = f.includes(btn.dataset.fav);
      btn.setAttribute('aria-pressed', String(on));
      const g = GAMES[btn.dataset.fav];
      if (g) btn.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${g.name} ${on ? 'from' : 'to'} My List`);
    });
  }

  /* ================== 详情页 ================== */
  function renderDetail(id) {
    const g = GAMES[id];
    if (!g) return go('#/');
    // 先停掉上一个游戏，再替换 DOM，避免旧循环短暂操作已被移除的节点
    destroyGame();

    const isFav = favs().includes(g.id);
    const mine = myRating(g.id);

    views.detail.innerHTML = `
      <div class="detail-top">
        <a class="back-btn" href="#/">&larr; All games</a>
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="#/">Games</a><span>/</span>
          <a href="#/t/${g.tags[0]}">${g.cats[0]}</a><span>/</span>
          <span aria-current="page">${g.name}</span>
        </nav>
      </div>

      <div class="detail-head">
        <img class="detail-icon" src="assets/icon-${g.id}.svg" width="92" height="92"
             alt="${g.name} icon">
        <div>
          <h1 class="detail-h1">${g.name} — Play Free Online, No Download</h1>
          <p class="detail-sub">
            <span class="pill">${g.cats.join(' · ')}</span>
            <span>★ ${g.rating.toFixed(1)} (${g.ratingCount.toLocaleString('en-US')})</span>
            <span>${g.plays.toLocaleString('en-US')} plays</span>
          </p>
        </div>
      </div>

      <div class="stage-wrap" id="stage-wrap">
        <div class="stage-bar">
          <span class="stage-score"><span id="score-label">Score</span>: <b id="score-val">0</b></span>
          <span class="stage-score"><span id="best-label">Best</span>: <b id="best-val">0</b></span>
          <span class="stage-score" id="status-val"></span>
          <span class="stage-spacer"></span>
          <button type="button" class="btn" id="btn-restart">Restart</button>
          <button type="button" class="btn" id="btn-fs">Fullscreen</button>
          <button type="button" class="btn ${isFav ? 'btn-primary' : ''}" id="btn-fav"
                  aria-pressed="${isFav}">${isFav ? '♥ In My List' : '♡ Add to List'}</button>
        </div>
        <div class="stage" id="stage"></div>
      </div>

      <div class="rate-row">
        <div class="stars" id="stars" role="group" aria-label="Rate this game">
          ${[1,2,3,4,5].map(n => `<button type="button" class="star${n <= mine ? ' is-on' : ''}" data-star="${n}"
             aria-label="Rate ${n} of 5 stars">★</button>`).join('')}
        </div>
        <span class="rate-note" id="rate-note">${mine ? `You rated this ${mine}/5` : 'Rate this game'}</span>
      </div>

      <section class="seo-block">
        <h2>How to play ${g.name}</h2>
        <p>${g.howto}</p>

        <h2>Controls</h2>
        <ul class="ctrl-list">
          ${g.controls.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('')}
        </ul>

        <h2>Tips and strategy</h2>
        <p>${g.tips}</p>

        <h2>About this version</h2>
        <p>${g.about}</p>

        <h2>Frequently asked questions</h2>
        <dl class="faq">
          ${g.faq.map(([q, a]) => `<dt>${q}</dt><dd>${a}</dd>`).join('')}
        </dl>
      </section>

      <section class="seo-block">
        <h2>Similar games</h2>
        <ul class="similar-list">
          ${similar(g).map(s => `
            <li>
              <a class="sim-card" href="#/game/${s.id}">
                <img src="assets/icon-${s.id}.svg" width="96" height="96" alt="${s.name} icon">
                <span>${s.name}</span>
              </a>
            </li>`).join('')}
        </ul>
      </section>
    `;

    mountGame(g);
    wireDetail(g);

    setMeta({
      title: `${g.name} — Play Free Online | ${SITE}`,
      desc: `${g.short} Play ${g.name} free in your browser, no download and no install. Works on mobile and desktop.`,
      url: `${ORIGIN}/#/game/${g.id}`,
      image: `${ORIGIN}/assets/icon-${g.id}.svg`
    });
    setGameJsonLd(g);
  }

  function similar(g) {
    return ORDER.filter(id => id !== g.id)
      .map(id => GAMES[id])
      .sort((a, b) => {
        const sa = a.tags.filter(t => g.tags.includes(t)).length;
        const sb = b.tags.filter(t => g.tags.includes(t)).length;
        return sb - sa || b.rating - a.rating;
      })
      .slice(0, 5);
  }

  /* ---------- 游戏挂载 ---------- */
  function mountGame(g) {
    destroyGame();
    const stage = $('#stage');
    const engine = window.GameEngines[g.id];
    if (!engine) {
      stage.innerHTML = '<p class="tw-hint">This game failed to load.</p>';
      return;
    }
    const bestKey = 'fm.best.' + g.id;
    const host = {
      setScore: (v) => { const n = $('#score-val'); if (n) n.textContent = v; },
      setBest: (v) => { const n = $('#best-val'); if (n) n.textContent = v || 0; },
      setStatus: (t) => { const n = $('#status-val'); if (n) n.textContent = t || ''; },
      loadBest: () => LS.get(bestKey, 0),
      saveBest: (v) => LS.set(bestKey, v),
      overlay: ({ title, text, btn, onBtn }) => {
        host.clearOverlay();
        const box = document.createElement('div');
        box.className = 'g-msg';
        box.innerHTML = `<h3>${title}</h3><p>${text || ''}</p>`;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-primary'; b.textContent = btn || 'Play again';
        b.addEventListener('click', () => { host.clearOverlay(); onBtn && onBtn(); });
        box.appendChild(b);
        stage.appendChild(box);
        b.focus();
      },
      clearOverlay: () => { const o = $('.g-msg', stage); if (o) o.remove(); }
    };
    active = engine.mount(stage, host);
    // 引擎可自定义计分口径（如 Memory 用步数，越少越好）
    if (active && active.scoreLabel) $('#score-label').textContent = active.scoreLabel;
    if (active && active.bestLabel) $('#best-label').textContent = active.bestLabel;
    host.setBest(LS.get(bestKey, 0));
  }
  function destroyGame() {
    if (active && typeof active.destroy === 'function') {
      try { active.destroy(); } catch (e) { console.warn('destroy failed', e); }
    }
    active = null;
  }

  /* ---------- 详情页交互 ---------- */
  function wireDetail(g) {
    $('#btn-restart').addEventListener('click', () => {
      if (active && active.restart) active.restart(); else mountGame(g);
    });

    $('#btn-fs').addEventListener('click', () => {
      const box = $('#stage-wrap');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
      else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
    });

    const favBtn = $('#btn-fav');
    favBtn.addEventListener('click', () => {
      const on = toggleFav(g.id);
      favBtn.setAttribute('aria-pressed', String(on));
      favBtn.textContent = on ? '♥ In My List' : '♡ Add to List';
      favBtn.classList.toggle('btn-primary', on);
      syncFavButtons();
    });

    $('#stars').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-star]');
      if (!btn) return;
      const n = Number(btn.dataset.star);
      LS.set('fm.rate.' + g.id, n);
      $$('#stars .star').forEach(s => s.classList.toggle('is-on', Number(s.dataset.star) <= n));
      $('#rate-note').textContent = `Thanks! You rated this ${n}/5`;
    });
  }

  /* ================== 路由 ================== */
  function show(which) {
    Object.entries(views).forEach(([k, v]) => { if (v) v.hidden = k !== which; });
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);

    // 离开详情页：停循环 + 清空 DOM（否则 canvas 与游戏节点会一直挂在隐藏视图里）
    if (parts[0] !== 'game') {
      destroyGame();
      setGameJsonLd(null);
      views.detail.innerHTML = '';
    }

    $$('.main-nav a').forEach(a => a.removeAttribute('aria-current'));

    if (parts[0] === 'game' && parts[1]) {
      show('detail');
      renderDetail(parts[1]);
      window.scrollTo(0, 0);
      return;
    }

    if (parts[0] === 'support') {
      show('support');
      setMeta({
        title: `Support & FAQ | ${SITE}`,
        desc: 'Questions about FunMax Games, how the games run, and where your scores are stored.',
        url: `${ORIGIN}/#/support`
      });
      window.scrollTo(0, 0);
      return;
    }

    // 首页系列：#/ , #/t/:tag , #/favorites
    show('home');
    if (parts[0] === 'favorites') {
      state.cat = 'fav';
      $$('.chip').forEach(c => c.classList.remove('is-active'));
      $('.main-nav [data-nav="favorites"]').setAttribute('aria-current', 'page');
      setMeta({ title: `My List | ${SITE}`, desc: 'Games you saved on FunMax.', url: `${ORIGIN}/#/favorites` });
    } else if (parts[0] === 't' && parts[1]) {
      const tag = parts[1].toLowerCase();
      const known = ['puzzle', 'arcade', 'brain', 'reflex', '2p', 'new', 'hot', 'best'];
      if (tag === 'new') { state.cat = 'all'; state.sort = 'default'; sortSel.value = 'default'; }
      else if (tag === 'hot') { state.cat = 'all'; state.sort = 'plays'; sortSel.value = 'plays'; }
      else if (tag === 'best') { state.cat = 'all'; state.sort = 'rating'; sortSel.value = 'rating'; }
      else state.cat = known.includes(tag) ? tag : 'all';
      $$('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.cat === state.cat));
      const nav = $(`.main-nav [data-nav="${tag}"]`);
      if (nav) nav.setAttribute('aria-current', 'page');
      const nice = tag.replace(/^\w/, c => c.toUpperCase());
      setMeta({
        title: `${nice} Games — Play Free Online | ${SITE}`,
        desc: `Browse ${nice.toLowerCase()} games on FunMax. Free HTML5 games that run instantly in your browser.`,
        url: `${ORIGIN}/#/t/${tag}`
      });
    } else {
      state.cat = 'all';
      $$('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.cat === 'all'));
      $('.main-nav [data-nav="all"]').setAttribute('aria-current', 'page');
      setMeta({
        title: `${SITE} - Play 6 Free HTML5 Games Online, No Download`,
        desc: 'FunMax Games offers free HTML5 games you can play instantly in the browser: 2048, Snake, Breakout, Memory Match, Whack-a-Mole and Tic-Tac-Toe. No download, no install, works on mobile and desktop.',
        url: `${ORIGIN}/`,
        image: `${ORIGIN}/assets/og-cover.svg`
      });
    }
    applyFilter();
    syncFavButtons();
  }

  /* ================== 首页事件绑定 ================== */
  $$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.cat = chip.dataset.cat;
      $$('.chip').forEach(c => c.classList.toggle('is-active', c === chip));
      applyFilter();
    });
  });

  searchInput.addEventListener('input', () => {
    state.q = searchInput.value;
    clearBtn.hidden = !state.q;
    if (!views.home.hidden) applyFilter();
    else go('#/');
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = ''; state.q = ''; clearBtn.hidden = true;
    applyFilter(); searchInput.focus();
  });

  sortSel.addEventListener('change', () => { state.sort = sortSel.value; applyFilter(); });

  $('#reset-filters').addEventListener('click', () => {
    state.q = ''; state.cat = 'all'; searchInput.value = ''; clearBtn.hidden = true;
    $$('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.cat === 'all'));
    applyFilter();
  });

  // 首页卡片上的收藏按钮（阻止冒泡到链接）
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    toggleFav(btn.dataset.fav);
    syncFavButtons();
    if (state.cat === 'fav') applyFilter();
  });

  window.addEventListener('hashchange', route);
  // 页面卸载前清理，避免 RAF 泄漏
  window.addEventListener('beforeunload', destroyGame);

  route();
})();
