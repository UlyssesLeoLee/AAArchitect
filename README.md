# IPA Architecture 3D Plugin 2.0

**默认语言：简体中文（zh-CN）**。可通过生成器的 `--lang ja-JP` 或 `--lang en-US` 切换，也可添加完整语言字典扩展。日本 IPA 标准资料是架构审查参考，不存在官方的“12 View 强制标准”或本插件的 IPA 认证。

## 为什么使用 Plugin + Skill + Three.js

- **Plugin**：可被识别的插件包、版本和分发边界。
- **Skill**：从设计源文件提取证据、规划 12 种可选 View、按 IPA / ISO 42010 的审查关注点生成架构 JSON、检查多语一致性和信息增益。
- **Three.js**：内置可复用的 WebGL Viewer **源码**（位于 `skills/ipa-architecture-3d/assets/viewer/`）；按同一架构 JSON 呈现真实 3D 对象和关系、切换 X/Y/Z 分类、正交投影和节点详情。
- **npm**：第三方 Three.js/Vite 安装为前端构建依赖，并不会因为压缩为 Plugin ZIP 就自动变成离线运行包。正式离线分发需在联网或 npm 缓存完整的环境构建 `dist/`。

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

Skill 通道（不经过 PM）：

```powershell
hermes skills list
```

Hermes 的 Skill 根目录是 `$env:LOCALAPPDATA\hermes\skills\<分类>\`，不是 `~/.hermes/skills`。

### 4. MiniMax Code —— 本地插件包

```powershell
claude plugin validate --strict .   # 复用同一份源文件
```

把仓库内容组装为 MiniMax 插件包（`.minimax-plugin/plugin.json` + `skills/<name>/SKILL.md` + `icon.png`），放到 `C:\Users\<用户>\.minimax\plugins\ipa-architecture-3d\`，MiniMax Code 会自动重扫识别。注意：包根目录**不要**放 Agent Plugins v1 的 `plugin.json`，否则会覆盖 MiniMax 格式；只用 `.minimax-plugin/plugin.json`。

### 统一 Skill 安装脚本（四个渠道通用）

```powershell
cd .\skills\ipa-architecture-3d
.\scripts\install_windows.ps1 -Agents claude,codex,hermes,minimax
.\scripts\install_windows.ps1 -Agents claude,codex,hermes,minimax -Force   # 覆盖前自动备份
```

`hermes` 和 `minimax` 在这里是 **Skill 回退通道**（`$env:LOCALAPPDATA\hermes\skills\<分类>\` 和 `~/.minimax/skills/`），不是它们各自的插件包机制。


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
