# IPA Architecture 3D Plugin 2.1

**默认语言：简体中文（zh-CN）**。可通过生成器的 `--lang ja-JP` 或 `--lang en-US` 切换，也可添加完整语言字典扩展。日本 IPA 标准资料是架构审查参考，不存在官方的“12 View 强制标准”或本插件的 IPA 认证。

## 为什么使用 Plugin + Skill + Three.js

- **Plugin**：可被识别的插件包、版本和分发边界。
- **Skill**：从设计源文件提取证据、规划 12 种可选 View、按 IPA / ISO 42010 的审查关注点生成架构 JSON、检查多语一致性和信息增益。
- **Three.js**：内置可复用的 WebGL Viewer **源码**（位于 `skills/ipa-architecture-3d/assets/viewer/`）；按同一架构 JSON 呈现真实 3D 对象和关系、切换 X/Y/Z 分类、正交投影和节点详情。
- **2D 平面**：同一份架构事实的第二种表达，读者可自行选择。原生 SVG 实现，无需 WebGL：X 画成纵向分层带、Y 画成横向泳道、Z 诚实降级为虚线包含容器，每条带/泳道都标注轴名、类别与节点数，空格子显式标注「无组件」，关系走正交折线。两版共用同一套轴字段与节点 ID，切换不会改变任何架构结论。
- **npm**：第三方 Three.js/Vite 安装为前端构建依赖，并不会因为压缩为 Plugin ZIP 就自动变成离线运行包。正式离线分发需在联网或 npm 缓存完整的环境构建 `dist/`。

## 其他用户如何下载与安装

### 一条命令（Windows）

```powershell
git clone https://github.com/UlyssesLeoLee/AAArchitect.git
cd AAArchitect
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

`install.ps1` 会依次处理四个渠道，某个渠道缺少对应 CLI 时自动降级为目录复制而不是整体失败。可用参数：

| 参数 | 说明 |
| --- | --- |
| `-Agents claude,codex,hermes,minimax` | 只装指定渠道 |
| `-Force` | 额外生成 Hermes 的 portable 插件包目录，并覆盖已存在的包 |
| `-NoCli` | 不调用任何 agent CLI，只做目录/清单投递（CI 与冒烟测试用） |
| `-UserHome` / `-HermesHome` / `-PluginsRoot` | 覆盖默认目标目录，用于测试或非标准安装位置 |

安装结束后每个 agent 重启一次即可发现新插件/技能。

### 手动安装（任意平台）

四个渠道本质上都是「把 Skill 目录放到对应位置」，复制以下目录即可：

```
skills/ipa-architecture-3d/          ← 要复制的 Skill 本体
plugin.json                          ← Agent Plugins v1 清单（仓库根目录）
.claude-plugin/                      ← Claude Code 插件市场清单
```

| 渠道 | 目标位置 |
| --- | --- |
| Claude Code（插件） | `claude plugin marketplace add <仓库路径>` → `claude plugin install ipa-architecture-3d@aaarchitect` |
| Claude Code（Skill 回退） | `~/.claude/skills/ipa-architecture-3d/` |
| Codex | `~/.agents/skills/ipa-architecture-3d/` + `~/.agents/plugins/marketplace.json` |
| Hermes | `%LOCALAPPDATA%/hermes/skills/<分类>/ipa-architecture-3d/`；插件形态为 `%LOCALAPPDATA%/hermes/plugins/ipa-architecture-3d/` |
| MiniMax Code | 用 `skills/ipa-architecture-3d/scripts/build_minimax_plugin.ps1` 生成 `%USERPROFILE%/.minimax/plugins/ipa-architecture-3d/` |

macOS / Linux 用户没有 PowerShell 时，直接按上表手动复制目录；MiniMax 包结构也可以手工组装，只要满足 `.minimax-plugin/plugin.json` + `skills/<name>/SKILL.md` + `icon` 即可。

### 远程 URL 安装（无需克隆）

```powershell
# Claude Code：默认分支必须含 .claude-plugin/marketplace.json
claude plugin marketplace add UlyssesLeoLee/AAArchitect
claude plugin install ipa-architecture-3d@aaarchitect

# Hermes：Skill 走 raw URL（URL 里的 main 是仓库默认分支），插件包走 Git URL + 固定 commit
hermes skills install https://raw.githubusercontent.com/UlyssesLeoLee/AAArchitect/main/skills/ipa-architecture-3d/SKILL.md --category software-development
hermes plugins install https://github.com/UlyssesLeoLee/AAArchitect.git
```

`hermes plugins install` 只接受 Git URL 或 `owner/repo`，不接受本地路径；需要固定版本时加 `--ref <40位 commit SHA>`。

## 四个插件渠道的安装方式

本仓库同时是 **Agent Plugins v1 portable 包**（根目录 `plugin.json` + `skills/`）和 **Claude Code 插件市场源**（`.claude-plugin/`），因此同一份内容可以投放到下面四个渠道。

### 1. Claude Code —— 本地插件市场（推荐）

```powershell
claude plugin validate --strict .
claude plugin marketplace add .
claude plugin install ipa-architecture-3d@aaarchitect
claude plugin list
```

`marketplace add` 接受仓库目录，所以插件内容始终跟随仓库更新，不需要每次重新安装。仓库推到 GitHub 之后也可以改用 `claude plugin marketplace add UlyssesLeoLee/AAArchitect`。若只想临时加载单个目录而不注册市场，用 `claude --plugin-dir "<仓库路径>"`。参见 https://code.claude.com/docs/en/plugins 。

### 2. Codex —— Skill + 私有市场清单

```powershell
Copy-Item .\integration-examples\codex-marketplace.json "$HOME\.agents\plugins\marketplace.json"
```

同时把 Skill 目录放到 `$HOME\.agents\skills\ipa-architecture-3d\`（见下方统一脚本）。`marketplace.json` 里的 `source.path` 是仓库根目录，因为根目录本身就是插件包；需要指向别处时把它改成绝对路径。

### 3. Hermes —— portable v1 插件目录 + Skill

```powershell
hermes plugins validate .
git clone --no-hardlinks . "$env:LOCALAPPDATA\hermes\plugins\ipa-architecture-3d"
hermes plugins show ipa-architecture-3d
hermes plugins enable ipa-architecture-3d
```

Hermes 扫描 `$env:LOCALAPPDATA\hermes\plugins\<插件名>\`，根目录 `plugin.json` 会作为 portable Agent Plugins v1 包被发现。`hermes plugins doctor <路径>` 可在不启用的情况下验证运行时契约。portable 包默认处于禁用状态，需要 `hermes plugins enable`；该步骤会触发 PM 的 venv 同步。

**注意：Hermes 的供应链扫描会拦截本插件。** 从 Git URL 安装时会被判为 `CAUTION` 并默认 BLOCKED，必须显式放行：

```powershell
hermes plugins install https://github.com/UlyssesLeoLee/AAArchitect.git --force
```

当前实测只有 **1 项** finding，逐条核对为启发式误报：

| 判据 | 位置 | 实际情况 |
| --- | --- | --- |
| `inline_shell_exec` | `assets/viewer/src/main.js`（`root.replaceChildren()`） | DOM 元素清空方法，被 shell 执行启发式误判。全文件不调用 `exec`/`eval`/`spawn`，也无任何进程创建；所有文本均通过 `textContent` 写入，不存在 HTML 注入 |

早期的 6 项 finding 中，README 里的 `git clone` 文案、`i18n.js` 的中日文字面量、SKILL.md 的 npm 构建步骤，随文档改写已不再触发。该拦截由启发式规则驱动，finding 数量会随源码变化，**以你本机 `hermes plugins validate .` 的实际输出为准**。

| 判据 | 位置 | 实际情况 |
| --- | --- | --- |
| `execution` (HIGH) | `assets/viewer/src/main.js:241` | 搜索过滤用的模板字符串，渲染走 `textContent`，不执行任何 shell |
| `supply_chain` (MEDIUM) | `README.md` 的安装说明 | 文档里的 `git clone` 命令被当成供应链风险 |
| `supply_chain` (MEDIUM) | `assets/viewer/src/i18n.js:3` / `:6` | 中/日文界面文案被当成可疑非 ASCII 字符串 |
| `supply_chain` (MEDIUM) | `SKILL.md:28` | `npm install && npm run test && npm run build` 构建步骤被当成包管理器调用 |

这些由文档与多语言资源本身触发，不应为绕过扫描而删改。也可在 `config.yaml` 里设 `plugins.scan_on_install` 关闭拦截。技能通道 `hermes skills install <raw URL>` 不受此拦截影响。

Skill 通道（不经过 PM）：

```powershell
hermes skills list
```

Hermes 的 Skill 根目录是 `$env:LOCALAPPDATA\hermes\skills\<分类>\`，不是 `~/.hermes/skills`。

### 4. MiniMax Code —— 本地插件包

```powershell
.\skills\ipa-architecture-3d\scripts\build_minimax_plugin.ps1
```

脚本从仓库内容组装 MiniMax 插件包（`.minimax-plugin/plugin.json` + `skills/<name>/SKILL.md` + 明暗图标），写入 `%USERPROFILE%\.minimax\plugins\ipa-architecture-3d\`，MiniMax Code 自动重扫识别。图标优先取本机 MiniMax 自带的分类图标池，取不到时自动生成占位图，因此在没装 MiniMax 的机器上也能构建。版本号与描述直接读仓库根目录 `plugin.json`，不会与源文件脱节。

注意：包根目录**不要**放 Agent Plugins v1 的 `plugin.json`，否则会覆盖 MiniMax 格式；只用 `.minimax-plugin/plugin.json`。

### 只装 Skill（不装插件包）

```powershell
cd .\skills\ipa-architecture-3d
.\scripts\install_windows.ps1 -Agents claude,codex,hermes,minimax
.\scripts\install_windows.ps1 -Agents claude,codex,hermes,minimax -Force   # 覆盖前自动备份
```

这条路径只做 Skill 目录投递：`hermes` 和 `minimax` 在这里是 **Skill 回退通道**（`$env:LOCALAPPDATA\hermes\skills\<分类>\` 和 `~/.minimax/skills/`），不是它们各自的插件包机制。需要完整插件包请用仓库根目录的 `install.ps1`。

> Windows PowerShell 5.1 注意事项：仓库内 `.ps1` 文件带 UTF-8 BOM。手动编辑后若删掉 BOM，脚本里的中文字面量会被按 ANSI 解析并导致语法错误。


## 生成真正的 Three.js 网站

```powershell
cd .\skills\ipa-architecture-3d
python .\scripts\validate.py .\assets\examples\illustrative-architecture.json
python .\scripts\build.py .\assets\examples\illustrative-architecture.json --out E:\arch3d-cn
# 需要日语时：追加 --lang ja-JP
cd E:\arch3d-cn
npm install
npm run test
npm run build
npm run dev
```

`npm run build` 的结果在 `dist/`，用于静态网站部署。`npm run dev` 提供本地预览；它们需要 Three.js npm 依赖。本包不声称下载了 Three.js 二进制或已经通过 WebGL 浏览器端到端测试。

## 架构设计约束

- 单一事实模型、稳定节点 ID 和关系，严禁推断不存在的组件或通道。
- 对每个 View 计算 `X`, `XY`, `XYZ` 逐级分类增益，冗余轴折叠；不得拿随机坐标充当第三维。
- 切换 View 改变坐标轴、标签、层面、关系筛选及信息增益，而不只是换颜色。
- 默认每 View 6–18 节点，远超信息密度预算时分解子视图；长文本放详情，不挤压 3D 标签。
- 支持 3D 透视、俯视 XZ、正视 XY、侧视 ZY。跨信任域关系需要真实来源、明确标注未确认控制。
- 实际审查目标要求每条架构事实可追溯。虚构演示数据不能冒充任何真实产品架构。

## 无需 npm 的模型验证

```powershell
cd .\skills\ipa-architecture-3d
python -m unittest discover -s tests -v
node --test .\assets\viewer\tests\layout.test.mjs
```

## 标准与许可

参考 IPA 共通フレーム2013、非機能要求グレード2018 与 ISO/IEC/IEEE 42010:2022。Three.js 为 MIT 协议，编译再分发应保留著作权声明及许可文本。见 `THIRD_PARTY_NOTICES.md`。
