# 统一架构 JSON 数据契约

## 数据结构

```json
{
  "meta": {
    "system": "业务系统示例",
    "version": "1.0.0",
    "owner": "Architecture Team",
    "description": "示例说明",
    "evidenceState": "illustrative",
    "language": "zh-CN",
    "i18n": {"ja-JP": {"system": "システム例", "description": "説明"}, "en-US": {"system": "Sample System", "description": "Description"}}
  },
  "nodes": [
    {
      "id":"api",
      "name":"API 服务",
      "description":"处理经过验证的外部请求",
      "kind":"service",
      "layer":"应用层",
      "runtime":"后端进程",
      "trustZone":"内部域",
      "environment":"生产环境",
      "evidence":"design/basic.md#api",
      "verification":"illustrative",
      "i18n":{"ja-JP":{"name":"API サービス","description":"検証済み要求を処理"}, "en-US":{"name":"API Service","description":"Processes validated requests"}}
    }
  ],
  "edges": [],
  "views": [
    {
      "id":"logical",
      "title":"逻辑视图",
      "description":"模块职责与依赖",
      "stakeholders":["架构师"],
      "concerns":["模块边界"],
      "questions":["依赖是否合理？"],
      "reviewIntent":"识别跨层依赖",
      "nodeIds":["api"],
      "edgeKinds":["calls"],
      "groupBy":"layer",
      "orderBy":["应用层"],
      "dimensions":{"x":{"field":"layer"},"y":{"field":"trustZone"},"z":{"field":"environment"}}
    }
  ]
}
```

此片段仅展示字段格式；独立运行的完整示例位于 `assets/examples/illustrative-architecture.json`，需要多实体数据才能使三轴获得有效信息增量。

## 审计要求

- `meta.evidenceState`：`confirmed` / `assumed` / `illustrative`。严格模式只允许 `confirmed`。
- 每个 node 拥有稳定 ID、`kind`、`name`、`description`、`verification`、`evidence`；关联仅由 edge 的 `source`/`target` 指向 ID。
- edge 必须拥有 `id`、`source`、`target`、`kind`、`description`；严格模式需要 edge 自身的 `evidence` 和 `verification=confirmed`。跨信任域连接提供 `control` 或明确待核实标记。
- View `nodeIds` 是选择集合，`edgeKinds` 是连接类型白名单。每个 View 的 `dimensions` 指向不同且存在的真实属性字段。
- `i18n` **只翻译可显示文本**（包括参与分组的类目名称与 `orderBy`），禁止改变任何稳定 ID、关系端点、协议技术事实和原始证据状态。
- build `--lang` 只切换有资源的语言；缺少指定语言的翻译时报错而不是静默退回中文。
- 在非严格示例中允许 `illustrative`；必须在最终网页明确告知仅供演示。

## 可供三轴绑定的属性

`boundary` / `layer` / `repo` / `runtime` / `environment` / `dataZone` / `trustZone` / `opsLayer` / `integrationLayer` / `extensionLayer` / `failureDomain` / `domain` / `owner`。

注意：轴属性均为**分类**。不要把“Y=风险级别”伪装成可比数值，除非模型明确存有经过审批的度量定义、来源和单位，并在相应版本中正式扩展验证器。
