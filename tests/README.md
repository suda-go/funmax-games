# 验证脚本

用本机 Chrome 跑端到端检查，不下载额外浏览器（走 `channel: 'chrome'`）。

## 准备

```bash
cd tests
npm i playwright-core
```

另需在项目根起一个静态服务：

```bash
cd .. && python3 -m http.server 8777
```

## 运行

```bash
node verify.js           # 49 项：主站功能与 6 个游戏交互
node mobile-check.js     # 4 尺寸 × 6 页面：移动端适配
node detail-verify.js    # 43 项：详情页样式数值与交互流程
node nav-verify.js       # 36 项：App 风格顶栏
node gamenav-verify.js   # 33 项：游戏分类导航
```

截图输出到 `tests/out/`（已 gitignore）。

## 设计说明

几个容易写出「假通过」的地方，脚本里都做了处理：

- **动画会干扰 `getBoundingClientRect`。** 量尺寸前先注入 `*{animation:none!important}` 冻结动画，否则 pulse、呼吸效果会让读数随时间变化。
- **`IntersectionObserver` 回调是异步的。** `scrollTo` 之后必须 `waitForTimeout` 再断言，否则读到的还是滚动前的状态 —— 这类断言会稳定地假通过。
- **页面可滚动距离有限。** 390×844 下整页仅 939px，可滚 95px，不足以让某些元素滚出视口。相关断言改用矮视口（390×420）验证。
- **`content-box` 与 `border-box` 的读数口径。** 期望值按 `getBoundingClientRect` 写（含 padding/border），不要和 `getComputedStyle().width` 混用。
- **持续动画的元素点不动。** 带呼吸动画的按钮 playwright 会判定 "element is not stable"，用 `{ force: true }` 或 `page.evaluate(() => el.click())`。
- **`favicon.ico` 的 404** 是浏览器默认请求，不计入异常。
