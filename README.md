# 喜报 · B站粉丝见证

用 GitHub Actions 定时抓取 B 站 UP 主的粉丝数，写入仓库，再由 GitHub Pages 把一张「奖状」图片展示成全屏喜报网页。名字、粉丝数、字体、文案、刷新间隔、虚报数值等都能在 `config.json` 里改。
https://qishidanr.github.io/bilibilifans
## 文件结构

```
├── .github/workflows/update-followers.yml   # 定时抓取 + 自动提交
├── scripts/fetch.mjs                        # 抓取脚本（Node 20，无第三方依赖）
├── data/followers.json                      # 数据文件（真实粉丝数 + 历史）
├── assets/certificate.jpg                   # 奖状底图
├── config.json                              # ← 所有可配置项都在这
├── index.html / style.css / app.js          # 喜报网页（全屏）
└── README.md
```

## 配置（config.json）

| 字段 | 说明 | 示例 |
|---|---|---|
| `uid` | 监控哪个 B 站账户 | `9434166` |
| `offset` | 在真实粉丝数上虚报多少（仅显示层，原始数据不变） | `10` 多报 10；`-100` 少报 100 |
| `refreshSeconds` | 页面几秒自动刷新一次 | `60` |
| `showSideGradient` | 是否显示两侧红渐变底色 | `true` 显示 / `false` 不显示（纯深色） |
| `font` | 普通文字字体（名字/标签），CSS `font-family` 写法 | `"STKaiti", "KaiTi", serif` |
| `numberFont` | 粉丝数字体 | `Georgia, "Times New Roman", serif` |
| `texts.documentTitle` | 浏览器标签页标题 | `喜报 · 粉丝见证` |
| `texts.label` | 粉丝数上方的那行小字 | `哔哩哔哩粉丝数` |
| `texts.unit` | 数字后面的单位 | `位` |
| `texts.deltaUp` / `deltaDown` | 涨/跌提示，`{n}` 会被替换成数字 | `较上次 +{n}` |
| `texts.loading` | 加载中占位文案 | `加载中…` |

改完配置后，本地刷新页面即可生效（`config.json` 也会被 Pages 托管）。`offset` 只影响页面显示，`data/followers.json` 里始终是真实粉丝数。

## 部署步骤

1. **建仓库**：在 GitHub 新建一个 **public** 仓库（免费版 Pages 只支持 public）。
2. **推送代码**：
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
3. **开启 Pages**：仓库 `Settings → Pages → Source 选 "Deploy from a branch" → 分支选 main、目录选 /(root) → Save`。
4. **手动跑一次**：`Actions` 标签页里选 `Update Follower Count` → `Run workflow`，验证抓取和提交正常。
5. **访问**：`https://<你的用户名>.github.io/<仓库名>/`（浏览器按 F11 可进入真·全屏）。

## 工作原理

- 每小时（cron `17 * * * *`，UTC）触发一次 workflow，也可 `workflow_dispatch` 手动触发。
- `scripts/fetch.mjs` 读 `config.json` 里的 `uid`，调 B 站公开接口 `https://api.bilibili.com/x/web-interface/card?mid=<uid>`，失败自动重试 3 次。
- 写入 `data/followers.json`，由 `git-auto-commit-action` 提交回仓库。
- 网页加载时读 `config.json` + `data/followers.json`，按 `offset` 计算显示值、套用字体文案，并按 `refreshSeconds` 定时重读数据。

## 换奖状底图

替换 `assets/certificate.jpg`。若新图尺寸不是 1111×768，同步改 `style.css` 里 `.certificate` 的 `aspect-ratio` 和 `width` 计算式，并微调 `.overlay` 的 `inset` 让文字落在留白处。

## 说明

- 数据来自 B 站公开接口，仅用于个人自娱自乐。
- GitHub 的定时任务存在几分钟到十几分钟的调度延迟，属正常现象；页面自动刷新再快，也只会重复读到已提交的最新数据（数据本身每小时才变一次）。
- Pages 的 CDN 可能短暂缓存 `followers.json`，如需立刻看到最新值可硬刷新（Ctrl+F5）。
