# FunMax Games

一个零依赖、零构建的 HTML5 小游戏聚合站 demo，内置 6 个原生实现、真实可玩的游戏。纯 HTML + CSS + 原生 JavaScript。

另附一个商店风格的游戏详情页 demo（`detail/`），演示移动端 vw 布局与 App 化交互。

## 快速开始

```bash
python3 -m http.server 8777
# 打开 http://localhost:8777
```

也可以直接双击 `index.html`，但 `manifest.webmanifest` 在 `file://` 协议下会被浏览器拒绝，建议用上面的方式起服务。

## 内置游戏

| 游戏 | 类型 | 操作 | 实现要点 |
| :--- | :--- | :--- | :--- |
| 2048 Number Merge | 益智 | 方向键 / WASD / 滑动 | 行压缩合并算法，90/10 概率生成 2 或 4 |
| Snake Classic | 街机 | 方向键 / WASD / 滑动 | 20×20 网格，禁止 180° 反向，每 50 分提速 |
| Breakout Brick Smash | 街机 | 鼠标 / 触摸 / ← → | 45 块分层计分，落点决定反弹角，速度有上限 |
| Memory Match | 益智 | 点击 / 触摸 | Fisher-Yates 洗牌，计步数而非分数（越少越好） |
| Whack-a-Mole | 街机 | 点击 / 触摸 | 30 秒倒计时，空挥扣 2 分，停留时长随时间递减 |
| Tic-Tac-Toe vs AI | 益智 | 点击 / 触摸 | 完整 minimax 搜索，按深度加权（快赢慢输），含双人模式 |

游戏引擎都在 `games.js`，统一契约：

```js
GameEngines[id].mount(stageEl, host) -> { destroy(), restart(), scoreLabel?, bestLabel? }
```

`destroy()` 必须清掉 RAF、timer 和所有事件监听 —— 切换游戏时依赖它，否则旧循环会在后台继续跑。

## 技术要点

### SEO

游戏卡片直接静态写在 `index.html` 里，带齐 `href`、`src`、`alt` 与可见游戏名，不依赖客户端 JS 填充 —— 这是纯前端项目里最容易踩的坑：SSR 只吐骨架、数据靠 JS 补，爬虫拿到的就是一张白页。

其余：每个视图动态写 `title` / `description` / `canonical` / OG 卡片；首页三段 JSON-LD（`Organization` + `BreadcrumbList` + `ItemList`），详情页五段（`SoftwareApplication` + `AggregateRating` + `Offer` + `BreadcrumbList` + `FAQPage`）；`robots.txt` 内声明 sitemap；详情页正文 490 词，分 How to play / Controls / Tips / About / FAQ 五节。

### 无障碍

skip-link、`:focus-visible` 焦点环、`aria-pressed` / `aria-current` / `aria-live`、全部交互元素键盘可达、`prefers-reduced-motion` 兜底。深色底文字对比度按 WCAG AA 调过。

### 移动端适配

响应式是移动端优先写的，几个关键决定：

- **头部两行**：`logo + 搜索` 一行，导航横向滚动一行。用 `flex-wrap` 让三者自动换行的话，375px 下会撑成三行共 152px，吃掉近四分之一首屏。
- **卡片文字 10.5px**：3 列时卡片仅约 105px 宽，更大的字号会把 `2048 Number Merge` 截断。560px 以上卡片变宽后字号回调到 12.5px。
- **`.stage` 必须是 `flex-direction: column`**：canvas 与操作提示是兄弟节点，横向 flex 会把提示挤到 canvas 右侧压成一列竖排字符。
- **触控目标**：导航与按钮 ≥40px。卡片上的收藏按钮视觉 32px，靠 `::after { inset: -7px }` 把热区扩到 46px，因为 105px 宽的卡片放不下 44px 的按钮本体。
- **`.is-wide` 只在移动端生效**：3 列时 2×2 大卡正好把 9 个格位填满，列数变多后同样的跨格会在行尾留空洞。

## 上线前必做

这个 demo 是纯静态、无后端，有两点和生产要求不一致：

1. **hash 路由换成 history 路由。** 搜索引擎不索引 `#` 之后的内容，所以 `#/game/2048` 在 SEO 上等价于首页。生产必须是 `/game/2048` 真实路径。`sitemap.xml` 里已经按目标形态写好了。
2. **详情页要服务端渲染或预渲染。** 现在详情页正文和 JSON-LD 是 JS 注入的。Google 能执行 JS，但首屏抓取不保证拿到，其他爬虫（Bing、社交平台抓取器）基本拿不到。用 Nuxt/Next 的 SSR，或构建期预渲染成静态 HTML。

另外 `GAMES` 元数据现在硬编码在 `app.js` 里，真实站点应来自后端或 CMS；`ORIGIN` 常量要改成真实域名。

## 文件结构

```
index.html              首页 + 详情/支持视图容器，卡片静态渲染在此
styles.css              全站样式 + 6 个游戏的内部样式
games.js                6 个游戏引擎，导出 window.GameEngines
app.js                  路由 / 筛选 / 详情页渲染 / 动态 SEO / 收藏评分
robots.txt              含 Sitemap 声明
sitemap.xml             按生产目标路径编写
manifest.webmanifest    PWA
assets/                 游戏图标 + OG 封面，均为内联 SVG
detail/                 商店风格详情页 demo（独立视觉，不共用 styles.css）
tests/                  playwright 验证脚本
```

## 验证

用本机 Chrome 跑了五套端到端检查，全部通过，控制台与网络无报错。

| 套件 | 覆盖 |
| :--- | :--- |
| `tests/verify.js` | 49 项：静态卡片完整性、搜索筛选排序、收藏、动态 SEO、6 个游戏真实交互、离开详情页后循环销毁 |
| `tests/mobile-check.js` | 4 尺寸 × 6 页面：横向溢出、头部高度、canvas 溢出、触控目标尺寸 |
| `tests/detail-verify.js` | 43 项：详情页 demo 的样式数值与交互流程 |
| `tests/nav-verify.js` | 36 项：App 风格顶栏 |
| `tests/gamenav-verify.js` | 33 项：游戏分类导航 |

跑法（需要本机装有 Chrome）：

```bash
cd tests && npm i playwright-core
node verify.js
```

游戏交互不只查 DOM 存在性 —— 会真的按方向键确认 2048 出分、读 canvas 像素确认贪吃蛇在渲染、等地鼠冒头再点确认命中加分、落子后确认 AI 回应。

---

# 附：商店风格详情页（detail/）

`detail/` 下是一个应用商店风格的游戏详情页 demo，亮色、纯移动端 vw 布局。它与主站是两套独立视觉，**不共用 `styles.css`**。

```
detail/game-detail.html    结构
detail/game-detail.css     样式，全部 vw 单位
detail/game-detail.js      行为，URL 参数驱动
assets/detail/             31 个自绘 SVG
```

打开方式（必须用移动端视图）：

```
http://localhost:8777/detail/game-detail.html?gid=blackjack&sty=1&is_detail=1
```

## URL 参数

| 参数 | 作用 |
| :--- | :--- |
| `gid` | 游戏 id，内置 `blackjack`、`solitaire`、`slots` |
| `cp` | 渠道，渲染为开发者名 |
| `st` / `re` | 来源埋点，仅透传 |
| `is_detail` | `0` 时隐藏底部品牌条 |
| `sty` | `1` 浅蓝描述卡（默认）；`2` 大标题布局 + 可展开描述；`3`/`4` 改变游戏墙弹窗的 grid |
| `theme` | `dark` 启用暗色主题 |
| `home` | `1` 显示右上角 home 按钮 |
| `topnav` | `1` 显示 App 风格顶栏 |
| `nav` | `0` 隐藏游戏分类导航 |

## 组件

- 图标 + 标题 + 标签 + 开发者
- 三段数据条（评分 / 玩家数 / 分级），中间 1px 竖分隔线
- 描述卡，`sty=2` 下换成可展开收起版本（超过 4.2em 才出现 expand）
- 主 CTA：呼吸动画 → spinner + `clip-path` 进度填充 → 弹出游戏墙
- 截图横滑，单图走大图模式，多图走小图横滑
- 游戏墙弹窗：`style2`/`style4` 是 4×5 里 14 个不规则 `grid-area`，`style3` 是 5×4
- 推荐位 3×2
- 底部固定品牌条，与 `main-with-banner` 联动调整页面下边距
- 滚动浮出的播放条，`IntersectionObserver` 监听 CTA 出视口
- 右上角 home 按钮，pulse 缩放动画
- 游戏分类导航：3 列缩略图网格 + 标签 pill + 随机游戏按钮
- 亮 / 暗双主题

### 游戏分类导航

分类名用 `::after` 自动补 `" Games"` 后缀，最后一项补单数 `" Game"`，数据里只存 `Card`、`Puzzle` 这样的裸名：

```css
.name .text::after { content: ' Games'; }
a:last-child .name .text::after { content: ' Game'; }
```

### 布局上踩过的坑

- **竖条用固定 4px 而非 vw**：`border-width` 会被浏览器取整，`1.02041vw` 在 390px 下算出 3.98px 会渲染成 3px。
- **描述卡不能加 `box-sizing: border-box`**：`width` 不含左右 padding 时总宽 366px，加了 border-box 会缩到 342px。
- **尾部三个圆角按钮会叠在一起**：底部品牌条（`bottom: 0`）、浮动播放条（`bottom: 18.37vw`）、分类导航的随机游戏按钮都在页面尾部。现在滚到距底 140px 内会主动收起浮动播放条。
- **`:not([hidden])` 不能省**：顶栏默认隐藏但节点仍在 DOM 里，`.detail-nav ~ .home-btn` 会无条件命中，把 home 按钮位置带偏。
- **`IntersectionObserver` 的 `rootMargin` 不认 vw**，只接受 px 和 %，依赖 vw 换算的阈值得用滚动监听。

## 关于 viewport

`detail/` 这个页面为了贴合移动端商店页的呈现，写了：

```html
<meta content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover" name="viewport" />
<meta content="portrait" name="screen-orientation" />
```

`user-scalable=no` 加 `maximum-scale=1.0` 会禁用双指缩放，**不满足 WCAG 1.4.4**；`screen-orientation: portrait` 强制竖屏。真要上线建议改成 `maximum-scale=5.0` 并去掉强制竖屏。主站 `index.html` 用的是可缩放的写法。

已加 `prefers-reduced-motion` 兜底：系统开启「减少动态效果」时停掉 pulse、呼吸与 spinner 旋转，静态视觉不变。

## License

MIT。所有游戏与图形素材均为本项目原创实现。
