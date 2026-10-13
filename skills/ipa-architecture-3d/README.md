# IPA Architecture 3D Skill v2.0

基于 **Three.js + WebGL + Vite** 的真实三维架构视图生成 Skill，**简体中文默认**，可使用 `--lang ja-JP` 或 `--lang en-US` 输出本地化版本。日本 IPA 公开资料用于设计审查参考，不代表取得官方认证。

## 核心特性

- **真实的语义三维**：X/Y/Z 映射具体架构属性，动态切换 View 时重排实体位置、轴刻度、Y 层平面及关系箭头。
- **信息增益校验**：只有能进一步区分实体组合的轴才算有效，冗余轴自动折叠并标记；不会用高度/深度随机散布冒充复杂度。
- **空间剖面**：Three.js 透视摄像机 + 上方 XZ、正面 XY、侧面 ZY 三种正交投影。
- **分析能力**：12 个示例 View、按 X/Y/Z 分类聚焦、字段重映射、跨信任域高亮、节点选择与稳定 ID、侧栏证据。
- **可信来源**：唯一架构 JSON、显式事实状态、跨域关系与来源校验、无事实不推断。
- **多语言**：`zh-CN` 默认、`ja-JP`、`en-US`。如需其他语言，需增加架构文本和 UI 字典，避免不完整翻译。

## 安装到 Windows Agent

```powershell
cd E:\skills\ipa-architecture-3d
.\scripts\install_windows.ps1 -Agents claude,codex,hermes -Force
```

在本地对当前项目使用 Skill 时，参考 `SKILL.md` 的开发流程生成数据、运行建站器即可。

## 生成 Three.js 演示网页

```powershell
python .\scripts\validate.py .\assets\examples\illustrative-architecture.json
python .\scripts\build.py .\assets\examples\illustrative-architecture.json --out E:\arch-3d-demo
cd E:\arch-3d-demo
npm install
npm run test
npm run dev
```

`--lang ja-JP` 或 `--lang en-US` 将 HTML、Viewer UI 以及带翻译的架构文字一并换成目标语言。输出目录需要为空。命令仍然依赖在可联网或 npm 缓存完整的环境中安装前端包。

**发布**：`npm run build` 得到 `dist/`。建议用 WebGL2 浏览器查看，不能将 `index.html` 作为裸文件双击运行（Vite 前端有 ES 模块导入）。

## 技术构成

```
ipa-architecture-3d/
├── SKILL.md
├── README.md
├── references/
│   ├── spatial-design.md
│   ├── viewpoint-catalog.md
│   ├── model-contract.md
│   ├── localization.md
│   ├── ipa-quality.md
│   └── japanese-ui.md
├── scripts/
│   ├── install_windows.ps1
│   ├── validate.py
│   └── build.py
├── tests/
│   └── test_builder.py
└── assets/
    ├── examples/illustrative-architecture.json
    └── viewer/
        ├── index.html
        ├── package.json
        ├── src/main.js
        ├── src/layout.js
        ├── src/i18n.js
        ├── src/style.css
        └── tests/layout.test.mjs
```

## 质量验证与状态说明

Python 校验器和 Node 空间单元测试无需下载依赖，可以检查 12 个 View 的三轴信息增益、模型引用以及语言。**浏览器端 Three.js 渲染依赖 npm 的 three/vite 包**；若当前运行环境无法访问 npm，则不得宣称 WebGL 浏览器端完整验证通过。

## 设计依据

- [IPA 共通フレーム2013](https://www.ipa.go.jp/publish/secbooks20130304.html)
- [IPA 非機能要求グレード2018](https://www.ipa.go.jp/archive/digital/iot-en-ci/jyouryuu/hikinou/ent03-b.html)
- [ISO/IEC/IEEE 42010:2022](https://www.iso.org/standard/74393.html)
- [Agent Skills](https://agentskills.io/specification)

内置示例明确为虚构配置，不是任何真实项目的权威设计。
