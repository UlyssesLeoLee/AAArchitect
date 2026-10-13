# IPA Architecture 3D Plugin 2.0

**默认语言：简体中文（zh-CN）**。可通过生成器的 `--lang ja-JP` 或 `--lang en-US` 切换，也可添加完整语言字典扩展。日本 IPA 标准资料是架构审查参考，不存在官方的“12 View 强制标准”或本插件的 IPA 认证。

## 为什么使用 Plugin + Skill + Three.js

- **Plugin**：可被识别的插件包、版本和分发边界。
- **Skill**：从设计源文件提取证据、规划 12 种可选 View、按 IPA / ISO 42010 的审查关注点生成架构 JSON、检查多语一致性和信息增益。
- **Three.js**：内置可复用的 WebGL Viewer **源码**（位于 `skills/ipa-architecture-3d/assets/viewer/`）；按同一架构 JSON 呈现真实 3D 对象和关系、切换 X/Y/Z 分类、正交投影和节点详情。
- **npm**：第三方 Three.js/Vite 安装为前端构建依赖，并不会因为压缩为 Plugin ZIP 就自动变成离线运行包。正式离线分发需在联网或 npm 缓存完整的环境构建 `dist/`。

## Claude Code 本地加载（无需提交 Marketplace）

```powershell
claude --plugin-dir "E:\tools\ipa-architecture-3d-plugin"
```

解压时保留 `plugin.json`、`.claude-plugin/` 和 `skills/` 的相对路径。只在信任这些脚本与依赖时安装。参见 https://code.claude.com/docs/en/plugins 。

## Codex 私有 Plugin

使用官方本地 Marketplace 机制：将插件目录放在仓库 `plugins/ipa-architecture-3d/`，再将 `integration-examples/codex-marketplace.json` 内容存为仓库 `.agents/plugins/marketplace.json`，重启支持 Plugin 的 Codex 主机，在 Plugin Directory 中从 `local-architecture` 安装/启用。此操作不需要公开发布到市场。

如果当前 Codex 版本仅支持直接 Skill，则运行独立 Skill 安装脚本即可。不要把 `plugin.json` 误认为 npm/浏览器加载清单。

## Hermes / 独立 Skill 安装

```powershell
cd E:\tools\ipa-architecture-3d-plugin\skills\ipa-architecture-3d
.\scripts\install_windows.ps1 -Agents claude,codex,hermes -Force
```

注意：这是 Skill 兼容性安装路径，不是通用 Hermes Plugin API。

## 生成真正的 Three.js 网站

```powershell
cd E:\tools\ipa-architecture-3d-plugin\skills\ipa-architecture-3d
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
cd E:\tools\ipa-architecture-3d-plugin\skills\ipa-architecture-3d
python -m unittest discover -s tests -v
node --test .\assets\viewer\tests\layout.test.mjs
```

## 标准与许可

参考 IPA 共通フレーム2013、非機能要求グレード2018 与 ISO/IEC/IEEE 42010:2022。Three.js 为 MIT 协议，编译再分发应保留著作权声明及许可文本。见 `THIRD_PARTY_NOTICES.md`。
