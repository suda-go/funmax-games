/* ============================================================
   games.js — 6 个原生实现的小游戏引擎
   统一契约：
     GameEngines[id].mount(stageEl, host) -> { destroy() }
   host 提供：
     setScore(n) / setBest(n) / setStatus(str)
     overlay({title, text, btn, onBtn}) / clearOverlay()
     loadBest() / saveBest(n)
   每个引擎必须在 destroy() 里清掉 RAF、timer 与全部事件监听，
   否则切换游戏后旧循环会继续跑。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 小工具 ---------- */
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const rnd = (n) => Math.floor(Math.random() * n);

  // 统一的事件绑定登记器，destroy 时一次性解绑
  function Binder() {
    const list = [];
    return {
      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        list.push([target, type, fn, opts]);
      },
      off() { list.forEach(([t, ty, f, o]) => t.removeEventListener(ty, f, o)); list.length = 0; }
    };
  }

  // 触摸滑动识别（2048 / Snake 共用）
  function swipe(binder, target, onDir) {
    let sx = 0, sy = 0, active = false;
    binder.on(target, 'touchstart', (e) => {
      const t = e.changedTouches[0];
      sx = t.clientX; sy = t.clientY; active = true;
    }, { passive: true });
    binder.on(target, 'touchend', (e) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });
  }

  const KEYDIR = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
  };

  const Engines = {};

  /* ============================================================
     1) 2048 — 数字合并
     ============================================================ */
  Engines['2048'] = {
    mount(stage, host) {
      const b = Binder();
      const SIZE = 4;
      let grid, score, best = host.loadBest(), over = false;

      const wrap = el('div', 'tw-wrap');
      wrap.innerHTML = `
        <div class="tw-board" role="grid" aria-label="2048 board"></div>
        <p class="tw-hint">Arrow keys / WASD to move · swipe on touch</p>`;
      stage.appendChild(wrap);
      const board = wrap.querySelector('.tw-board');

      const COLORS = {
        2: ['#eee4da', '#776e65'], 4: ['#ede0c8', '#776e65'], 8: ['#f2b179', '#fff'],
        16: ['#f59563', '#fff'], 32: ['#f67c5f', '#fff'], 64: ['#f65e3b', '#fff'],
        128: ['#edcf72', '#fff'], 256: ['#edcc61', '#fff'], 512: ['#edc850', '#fff'],
        1024: ['#edc53f', '#fff'], 2048: ['#edc22e', '#fff']
      };

      function reset() {
        grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        score = 0; over = false;
        addTile(); addTile();
        host.clearOverlay(); host.setScore(0); host.setBest(best);
        draw();
      }
      function addTile() {
        const free = [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) free.push([r, c]);
        if (!free.length) return;
        const [r, c] = free[rnd(free.length)];
        grid[r][c] = Math.random() < 0.9 ? 2 : 4;
      }
      function draw() {
        board.innerHTML = '';
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
          const v = grid[r][c];
          const cell = el('div', 'tw-cell' + (v ? ' is-filled' : ''), v ? String(v) : '');
          cell.setAttribute('role', 'gridcell');
          if (v) {
            const [bgc, fg] = COLORS[v] || ['#3c3a32', '#fff'];
            cell.style.background = bgc; cell.style.color = fg;
            cell.style.fontSize = v >= 1024 ? '18px' : v >= 128 ? '22px' : '26px';
          }
          board.appendChild(cell);
        }
      }
      // 把一行压缩合并，返回 [新行, 得分]
      function collapse(row) {
        const a = row.filter(Boolean);
        let gained = 0;
        for (let i = 0; i < a.length - 1; i++) {
          if (a[i] === a[i + 1]) { a[i] *= 2; gained += a[i]; a.splice(i + 1, 1); }
        }
        while (a.length < SIZE) a.push(0);
        return [a, gained];
      }
      function lines(dir) {
        const out = [];
        for (let i = 0; i < SIZE; i++) {
          const line = [];
          for (let j = 0; j < SIZE; j++) {
            if (dir === 'left') line.push([i, j]);
            else if (dir === 'right') line.push([i, SIZE - 1 - j]);
            else if (dir === 'up') line.push([j, i]);
            else line.push([SIZE - 1 - j, i]);
          }
          out.push(line);
        }
        return out;
      }
      function move(dir) {
        if (over) return;
        let moved = false, gained = 0;
        for (const line of lines(dir)) {
          const vals = line.map(([r, c]) => grid[r][c]);
          const [next, g] = collapse(vals);
          gained += g;
          next.forEach((v, k) => {
            const [r, c] = line[k];
            if (grid[r][c] !== v) { grid[r][c] = v; moved = true; }
          });
        }
        if (!moved) return;
        score += gained;
        addTile();
        draw();
        host.setScore(score);
        if (score > best) { best = score; host.saveBest(best); host.setBest(best); }
        if (grid.flat().includes(2048)) {
          over = true;
          host.overlay({ title: 'You made 2048! 🎉', text: `Score ${score}`, btn: 'Play again', onBtn: reset });
          return;
        }
        if (!canMove()) {
          over = true;
          host.overlay({ title: 'No moves left', text: `Final score ${score}`, btn: 'Try again', onBtn: reset });
        }
      }
      function canMove() {
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
          if (!grid[r][c]) return true;
          if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
          if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
        }
        return false;
      }

      b.on(window, 'keydown', (e) => {
        const d = KEYDIR[e.key];
        if (d) { e.preventDefault(); move(d); }
      });
      swipe(b, wrap, move);

      reset();
      host.setStatus('Merge tiles to reach 2048');
      return { destroy() { b.off(); }, restart: reset };
    }
  };

  /* ============================================================
     2) Snake — 贪吃蛇
     ============================================================ */
  Engines['snake'] = {
    mount(stage, host) {
      const b = Binder();
      const N = 20, CELL = 18, W = N * CELL;
      const cv = el('canvas'); cv.width = W; cv.height = W;
      cv.setAttribute('aria-label', 'Snake game board');
      const hint = el('p', 'tw-hint', 'Arrow keys / WASD · swipe on touch');
      stage.append(cv, hint);
      const ctx = cv.getContext('2d');

      let snake, dir, pending, food, score, best = host.loadBest(), alive, raf, last = 0, stepMs;

      function reset() {
        snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        dir = { x: 1, y: 0 }; pending = null;
        score = 0; alive = true; stepMs = 130;
        placeFood();
        host.clearOverlay(); host.setScore(0); host.setBest(best);
        last = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
      function placeFood() {
        do { food = { x: rnd(N), y: rnd(N) }; }
        while (snake.some(s => s.x === food.x && s.y === food.y));
      }
      function turn(d) {
        const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
        const nd = map[d];
        // 禁止 180° 反向
        if (nd.x === -dir.x && nd.y === -dir.y) return;
        pending = nd;
      }
      function step() {
        if (pending) { dir = pending; pending = null; }
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
            snake.some(s => s.x === head.x && s.y === head.y)) {
          alive = false;
          if (score > best) { best = score; host.saveBest(best); host.setBest(best); }
          host.overlay({ title: 'Game over', text: `You scored ${score}`, btn: 'Play again', onBtn: reset });
          return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10; host.setScore(score);
          stepMs = Math.max(62, 130 - Math.floor(score / 50) * 8);  // 逐步加速
          placeFood();
        } else snake.pop();
      }
      function render() {
        ctx.fillStyle = '#0b1038'; ctx.fillRect(0, 0, W, W);
        ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
        for (let i = 1; i < N; i++) {
          ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, W); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
        }
        // 食物
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2.5, 0, Math.PI * 2);
        ctx.fill();
        // 蛇身
        snake.forEach((s, i) => {
          ctx.fillStyle = i === 0 ? '#ffffff' : `hsl(150 62% ${58 - Math.min(i * 1.5, 26)}%)`;
          const pad = i === 0 ? 1 : 2;
          const r = 4;
          const x = s.x * CELL + pad, y = s.y * CELL + pad, w = CELL - pad * 2, h = w;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
          ctx.fill();
        });
      }
      function loop(ts) {
        if (!alive) { render(); return; }
        if (!last) last = ts;
        if (ts - last >= stepMs) { last = ts; step(); }
        render();
        raf = requestAnimationFrame(loop);
      }

      b.on(window, 'keydown', (e) => {
        const d = KEYDIR[e.key];
        if (d) { e.preventDefault(); turn(d); }
      });
      swipe(b, cv, turn);

      reset();
      host.setStatus('Eat the red dots, avoid walls and yourself');
      return {
        destroy() { cancelAnimationFrame(raf); b.off(); },
        restart: reset
      };
    }
  };

  /* ============================================================
     3) Breakout — 打砖块
     ============================================================ */
  Engines['breakout'] = {
    mount(stage, host) {
      const b = Binder();
      const W = 480, H = 360;
      const cv = el('canvas'); cv.width = W; cv.height = H;
      cv.setAttribute('aria-label', 'Breakout game board');
      const hint = el('p', 'tw-hint', 'Move: mouse / touch / ← → keys');
      stage.append(cv, hint);
      const ctx = cv.getContext('2d');

      const ROWS = 5, COLS = 9, BW = 46, BH = 16, GAP = 5, OFF_X = 14, OFF_Y = 34;
      const ROW_COLORS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc'];
      let bricks, paddle, ball, score, lives, best = host.loadBest(), running, raf, keys = {};

      function reset() {
        bricks = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          bricks.push({ x: OFF_X + c * (BW + GAP), y: OFF_Y + r * (BH + GAP), alive: true, row: r });
        }
        paddle = { w: 84, h: 12, x: W / 2 - 42 };
        score = 0; lives = 3; running = true;
        launch();
        host.clearOverlay(); host.setScore(0); host.setBest(best);
        host.setStatus(`Lives: ${lives}`);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
      function launch() {
        ball = { x: W / 2, y: H - 46, r: 7, vx: (Math.random() < .5 ? -1 : 1) * 3.1, vy: -3.6 };
      }
      function loop() {
        if (!running) return;
        // 键盘控制挡板
        if (keys.left) paddle.x -= 7;
        if (keys.right) paddle.x += 7;
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        ball.x += ball.vx; ball.y += ball.vy;
        // 左右墙
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; }
        // 顶
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
        // 挡板
        const py = H - 24;
        if (ball.vy > 0 && ball.y + ball.r >= py && ball.y + ball.r <= py + paddle.h + 6 &&
            ball.x >= paddle.x - 2 && ball.x <= paddle.x + paddle.w + 2) {
          ball.y = py - ball.r;
          ball.vy = -Math.abs(ball.vy);
          // 落点决定反弹角度
          const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          ball.vx = hit * 4.4;
          const sp = Math.hypot(ball.vx, ball.vy);
          const max = 6.6;
          if (sp > max) { ball.vx *= max / sp; ball.vy *= max / sp; }
        }
        // 掉落
        if (ball.y - ball.r > H) {
          lives--;
          if (lives <= 0) {
            running = false;
            if (score > best) { best = score; host.saveBest(best); host.setBest(best); }
            host.overlay({ title: 'Game over', text: `You scored ${score}`, btn: 'Play again', onBtn: reset });
            render(); return;
          }
          host.setStatus(`Lives: ${lives}`);
          launch();
        }
        // 砖块碰撞
        for (const br of bricks) {
          if (!br.alive) continue;
          if (ball.x + ball.r > br.x && ball.x - ball.r < br.x + BW &&
              ball.y + ball.r > br.y && ball.y - ball.r < br.y + BH) {
            br.alive = false;
            score += (ROWS - br.row) * 10;
            host.setScore(score);
            // 按穿入深度决定反弹轴
            const ox = Math.min(Math.abs(ball.x - br.x), Math.abs(ball.x - (br.x + BW)));
            const oy = Math.min(Math.abs(ball.y - br.y), Math.abs(ball.y - (br.y + BH)));
            if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
            break;
          }
        }
        if (!bricks.some(x => x.alive)) {
          running = false;
          if (score > best) { best = score; host.saveBest(best); host.setBest(best); }
          host.overlay({ title: 'Cleared! 🎉', text: `All bricks down — ${score} points`, btn: 'Play again', onBtn: reset });
          render(); return;
        }
        render();
        raf = requestAnimationFrame(loop);
      }
      function render() {
        ctx.fillStyle = '#0b1038'; ctx.fillRect(0, 0, W, H);
        bricks.forEach(br => {
          if (!br.alive) return;
          ctx.fillStyle = ROW_COLORS[br.row];
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(br.x, br.y, BW, BH, 4); else ctx.rect(br.x, br.y, BW, BH);
          ctx.fill();
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(paddle.x, H - 24, paddle.w, paddle.h, 6);
        else ctx.rect(paddle.x, H - 24, paddle.w, paddle.h);
        ctx.fill();
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      }
      function moveTo(clientX) {
        const rect = cv.getBoundingClientRect();
        const x = (clientX - rect.left) * (W / rect.width);
        paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
      }

      b.on(cv, 'mousemove', (e) => moveTo(e.clientX));
      b.on(cv, 'touchmove', (e) => { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });
      b.on(cv, 'touchstart', (e) => moveTo(e.touches[0].clientX), { passive: true });
      b.on(window, 'keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
        if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
      });
      b.on(window, 'keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
      });

      reset();
      return {
        destroy() { running = false; cancelAnimationFrame(raf); b.off(); },
        restart: reset
      };
    }
  };

  /* ============================================================
     4) Memory Match — 记忆翻牌
     ============================================================ */
  Engines['memory'] = {
    mount(stage, host) {
      const b = Binder();
      const FACES = ['🍒', '🍋', '🍇', '🥝', '🍉', '🍑', '🥥', '🍍'];
      let deck, open, matched, moves, timer, seconds, best = host.loadBest(), lock;

      const wrap = el('div', 'mm-wrap');
      wrap.innerHTML = `<div class="mm-board" role="grid" aria-label="Memory match board"></div>
                        <p class="tw-hint">Find all 8 pairs — fewer moves is better</p>`;
      stage.appendChild(wrap);
      const board = wrap.querySelector('.mm-board');

      function reset() {
        deck = FACES.concat(FACES).map((f, i) => ({ id: i, face: f, flipped: false, done: false }));
        // Fisher-Yates 洗牌
        for (let i = deck.length - 1; i > 0; i--) { const j = rnd(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        open = []; matched = 0; moves = 0; seconds = 0; lock = false;
        host.clearOverlay(); host.setScore(0); host.setBest(best);
        host.setStatus('Time: 0s');
        clearInterval(timer);
        timer = setInterval(() => { seconds++; host.setStatus(`Time: ${seconds}s`); }, 1000);
        draw();
      }
      function draw() {
        board.innerHTML = '';
        deck.forEach((card, idx) => {
          const btn = el('button', 'mm-card' + (card.flipped || card.done ? ' is-open' : '') + (card.done ? ' is-done' : ''));
          btn.type = 'button';
          btn.setAttribute('aria-label', card.flipped || card.done ? `Card ${card.face}` : 'Hidden card');
          btn.textContent = (card.flipped || card.done) ? card.face : '';
          btn.addEventListener('click', () => flip(idx));
          board.appendChild(btn);
        });
      }
      function flip(idx) {
        if (lock) return;
        const card = deck[idx];
        if (card.done || card.flipped) return;
        card.flipped = true;
        open.push(idx);
        draw();
        if (open.length === 2) {
          moves++; host.setScore(moves);
          const [a, c] = open.map(i => deck[i]);
          if (a.face === c.face) {
            a.done = c.done = true; matched++;
            open = [];
            draw();
            if (matched === FACES.length) finish();
          } else {
            lock = true;
            setTimeout(() => {
              a.flipped = c.flipped = false; open = []; lock = false; draw();
            }, 620);
          }
        }
      }
      function finish() {
        clearInterval(timer);
        // 分数越低越好，best 记录最少步数
        if (!best || moves < best) { best = moves; host.saveBest(best); host.setBest(best); }
        host.overlay({
          title: 'All pairs found! 🎉',
          text: `${moves} moves in ${seconds}s`,
          btn: 'Play again', onBtn: reset
        });
      }

      reset();
      return {
        destroy() { clearInterval(timer); b.off(); },
        restart: reset,
        scoreLabel: 'Moves', bestLabel: 'Fewest'
      };
    }
  };

  /* ============================================================
     5) Whack-a-Mole — 打地鼠
     ============================================================ */
  Engines['whack'] = {
    mount(stage, host) {
      const b = Binder();
      const HOLES = 9, DURATION = 30;
      let score, best = host.loadBest(), left, popTimer, tickTimer, current = -1, hideTimer, playing;

      const wrap = el('div', 'wm-wrap');
      wrap.innerHTML = `<div class="wm-board" role="group" aria-label="Whack a mole holes"></div>
                        <p class="tw-hint">Tap or click the mole · 30 seconds</p>`;
      stage.appendChild(wrap);
      const board = wrap.querySelector('.wm-board');

      const cells = [];
      for (let i = 0; i < HOLES; i++) {
        const btn = el('button', 'wm-hole');
        btn.type = 'button';
        btn.setAttribute('aria-label', `Hole ${i + 1}`);
        btn.innerHTML = '<span class="wm-mole" aria-hidden="true">🐹</span>';
        btn.addEventListener('click', () => hit(i));
        board.appendChild(btn);
        cells.push(btn);
      }

      function reset() {
        score = 0; left = DURATION; playing = true; current = -1;
        cells.forEach(c => c.classList.remove('is-up'));
        host.clearOverlay(); host.setScore(0); host.setBest(best);
        host.setStatus(`Time: ${left}s`);
        clearInterval(tickTimer); clearTimeout(popTimer); clearTimeout(hideTimer);
        tickTimer = setInterval(() => {
          left--;
          host.setStatus(`Time: ${left}s`);
          if (left <= 0) finish();
        }, 1000);
        pop();
      }
      function pop() {
        if (!playing) return;
        let i; do { i = rnd(HOLES); } while (i === current && HOLES > 1);
        current = i;
        cells[i].classList.add('is-up');
        // 随剩余时间递减停留时长，难度渐增
        const upMs = Math.max(420, 900 - (DURATION - left) * 16);
        hideTimer = setTimeout(() => {
          cells[i].classList.remove('is-up');
          if (current === i) current = -1;
          popTimer = setTimeout(pop, 180 + rnd(320));
        }, upMs);
      }
      function hit(i) {
        if (!playing) return;
        if (!cells[i].classList.contains('is-up')) {
          score = Math.max(0, score - 2);         // 空挥扣分
          host.setScore(score);
          cells[i].classList.add('is-miss');
          setTimeout(() => cells[i].classList.remove('is-miss'), 200);
          return;
        }
        score += 10; host.setScore(score);
        cells[i].classList.remove('is-up');
        cells[i].classList.add('is-bonk');
        setTimeout(() => cells[i].classList.remove('is-bonk'), 200);
        if (current === i) current = -1;
        clearTimeout(hideTimer);
        popTimer = setTimeout(pop, 140 + rnd(240));
      }
      function finish() {
        playing = false;
        clearInterval(tickTimer); clearTimeout(popTimer); clearTimeout(hideTimer);
        cells.forEach(c => c.classList.remove('is-up'));
        if (score > best) { best = score; host.saveBest(best); host.setBest(best); }
        host.overlay({ title: "Time's up!", text: `You scored ${score}`, btn: 'Play again', onBtn: reset });
      }

      reset();
      return {
        destroy() { playing = false; clearInterval(tickTimer); clearTimeout(popTimer); clearTimeout(hideTimer); b.off(); },
        restart: reset
      };
    }
  };

  /* ============================================================
     6) Tic-Tac-Toe — 井字棋（minimax 完美 AI + 双人）
     ============================================================ */
  Engines['tictactoe'] = {
    mount(stage, host) {
      const b = Binder();
      let cellsState, turn, mode = 'ai', finished, wins = host.loadBest() || 0;

      const wrap = el('div', 'tt-wrap');
      wrap.innerHTML = `
        <div class="tt-modes" role="group" aria-label="Game mode">
          <button type="button" class="btn is-on" data-mode="ai">vs Computer</button>
          <button type="button" class="btn" data-mode="2p">2 Players</button>
        </div>
        <div class="tt-board" role="grid" aria-label="Tic tac toe board"></div>
        <p class="tt-turn" aria-live="polite"></p>`;
      stage.appendChild(wrap);
      const board = wrap.querySelector('.tt-board');
      const turnLabel = wrap.querySelector('.tt-turn');

      wrap.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          mode = btn.dataset.mode;
          wrap.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('is-on', x === btn));
          reset();
        });
      });

      const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

      function reset() {
        cellsState = Array(9).fill('');
        turn = 'X'; finished = false;
        host.clearOverlay(); host.setScore(wins); host.setBest(wins);
        draw();
      }
      function winnerOf(s) {
        for (const [a, b2, c] of LINES) {
          if (s[a] && s[a] === s[b2] && s[a] === s[c]) return { who: s[a], line: [a, b2, c] };
        }
        return s.every(Boolean) ? { who: 'draw', line: [] } : null;
      }
      function draw(hl) {
        board.innerHTML = '';
        cellsState.forEach((v, i) => {
          const btn = el('button', 'tt-cell' + (v ? ' is-' + v.toLowerCase() : '') + (hl && hl.includes(i) ? ' is-win' : ''));
          btn.type = 'button';
          btn.textContent = v;
          btn.setAttribute('aria-label', v ? `Cell ${i + 1}, ${v}` : `Cell ${i + 1}, empty`);
          btn.disabled = !!v || finished;
          btn.addEventListener('click', () => play(i));
          board.appendChild(btn);
        });
        turnLabel.textContent = finished ? '' :
          (mode === 'ai' ? (turn === 'X' ? 'Your turn (X)' : 'Computer thinking…') : `Player ${turn}'s turn`);
      }
      function play(i) {
        if (finished || cellsState[i]) return;
        cellsState[i] = turn;
        const res = winnerOf(cellsState);
        if (res) return end(res);
        turn = turn === 'X' ? 'O' : 'X';
        draw();
        if (mode === 'ai' && turn === 'O') {
          setTimeout(() => {
            if (finished) return;
            const mv = bestMove(cellsState);
            if (mv != null) {
              cellsState[mv] = 'O';
              const r2 = winnerOf(cellsState);
              if (r2) return end(r2);
              turn = 'X';
            }
            draw();
          }, 260);
        }
      }
      function end(res) {
        finished = true;
        draw(res.line);
        let title, text;
        if (res.who === 'draw') { title = 'Draw'; text = 'Nobody wins this one.'; }
        else if (mode === 'ai') {
          if (res.who === 'X') { title = 'You win! 🎉'; text = 'You beat the computer.'; wins++; host.saveBest(wins); host.setScore(wins); host.setBest(wins); }
          else { title = 'Computer wins'; text = 'The AI plays perfectly — a draw is the best you can force.'; }
        } else { title = `Player ${res.who} wins!`; text = 'Nice one.'; }
        host.overlay({ title, text, btn: 'Play again', onBtn: reset });
      }
      // minimax（3x3 搜索空间很小，无需剪枝也够快）
      function bestMove(s) {
        let bestScore = -Infinity, move = null;
        for (let i = 0; i < 9; i++) {
          if (s[i]) continue;
          s[i] = 'O';
          const sc = minimax(s, 0, false);
          s[i] = '';
          if (sc > bestScore) { bestScore = sc; move = i; }
        }
        return move;
      }
      function minimax(s, depth, isMax) {
        const r = winnerOf(s);
        if (r) {
          if (r.who === 'O') return 10 - depth;
          if (r.who === 'X') return depth - 10;
          return 0;
        }
        let best2 = isMax ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) {
          if (s[i]) continue;
          s[i] = isMax ? 'O' : 'X';
          const sc = minimax(s, depth + 1, !isMax);
          s[i] = '';
          best2 = isMax ? Math.max(best2, sc) : Math.min(best2, sc);
        }
        return best2;
      }

      reset();
      host.setStatus('X goes first');
      return { destroy() { b.off(); }, restart: reset, scoreLabel: 'Wins', bestLabel: 'Total wins' };
    }
  };

  window.GameEngines = Engines;
})();
