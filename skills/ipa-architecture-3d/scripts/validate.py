#!/usr/bin/env python3
"""Model + semantic dimensions + language + architecture evidence quality gate."""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

AXES={'boundary','layer','repo','runtime','environment','dataZone','trustZone','opsLayer','integrationLayer','extensionLayer','failureDomain','domain','owner'}
NODE_KINDS={'actor','system','service','process','module','runtime','database','external','gateway','plugin','security','operations','data','storage'}
EDGE_KINDS={'calls','uses','hosts','deploys','contains','publishes','reads','writes','authenticates','monitors','controls','extends','depends','replicates','recovers','exchanges'}
LANG_PATTERN=re.compile(r'^[a-z]{2,3}(?:-[A-Z][a-zA-Z0-9]{1,7})*$')
ID_PATTERN=re.compile(r'^[A-Za-z][A-Za-z0-9_-]*$')
TRANSLATED_KEYS={'name','description','title','evidence','stakeholders','concerns','questions','orderBy','boundary','layer','repo','runtime','environment','dataZone','trustZone','opsLayer','integrationLayer','extensionLayer','failureDomain','domain','owner','system','scope','sources','constraints','decisions','qualityAttributes','control','reviewIntent'}

def validate(model, strict=False, lang='zh-CN'):
    errors=[];warnings=[]
    def err(code, detail):errors.append(f'{code}: {detail}')
    def warn(code, detail):warnings.append(f'{code}: {detail}')
    if not isinstance(model,dict):return ['ROOT: 架构模型必须是 JSON 对象'],warnings
    meta=model.get('meta')
    if not isinstance(meta,dict):err('META','缺少 meta');meta={}
    for field in ['system','version','owner','description','evidenceState']:
        if not isinstance(meta.get(field),str) or not meta.get(field,'').strip():err('META',f'缺少 meta.{field}')
    if meta.get('evidenceState') not in {'illustrative','assumed','confirmed'}:err('META','evidenceState 只能是 illustrative/assumed/confirmed')
    if strict and meta.get('evidenceState')!='confirmed':err('EVIDENCE','严格模式要求整体证据状态为 confirmed')
    if not LANG_PATTERN.fullmatch(lang):err('LANG',f'无效 BCP-47 语言标识: {lang}')
    default=meta.get('language','zh-CN')
    if lang!=default:
        if lang not in meta.get('i18n',{}):err('LANG',f'当前模型缺少 meta.i18n.{lang}，禁止假装完成翻译')
    nodes=model.get('nodes');edges=model.get('edges');views=model.get('views')
    for key,data in [('nodes',nodes),('edges',edges),('views',views)]:
        if not isinstance(data,list):err('TYPE',f'{key} 必须为数组')
    if not all(isinstance(data,list) for data in [nodes,edges,views]):return errors,warnings
    if not nodes or not views:err('EMPTY','节点或视图为空')
    node_ids=set();node_by_id={};edge_ids=set();view_ids=set()
    def check_i18n(obj,loc,name):
        if lang==default:return
        tr=obj.get('i18n',{}).get(lang)
        if not isinstance(tr,dict):err('LANG',f'{name} 缺少 {lang} 翻译')
        elif not (tr.get('name') or tr.get('title') or tr.get('description') or tr.get('system')):err('LANG',f'{name} 缺少名称或说明翻译')
        if tr:
            for key in tr:
                if key not in TRANSLATED_KEYS:err('LANG',f'{name}.i18n.{lang}.{key} 不是允许翻译的字段')
    check_i18n(meta,'meta','meta')
    for i,node in enumerate(nodes):
        if not isinstance(node,dict):err('NODE',f'[{i}] 不是对象');continue
        nid=node.get('id');label=f'node[{i}]({nid})'
        if not isinstance(nid,str) or not ID_PATTERN.fullmatch(nid):err('NODE',f'{label} ID 格式不合格')
        elif nid in node_ids:err('NODE',f'{label} ID 重复')
        else:node_ids.add(nid);node_by_id[nid]=node
        if not node.get('name') or not node.get('description'):err('NODE',f'{label} 缺少 name/description')
        if node.get('kind') not in NODE_KINDS:err('NODE',f'{label} 类型未定义')
        if strict and (not node.get('evidence') or node.get('verification')!='confirmed'):err('EVIDENCE',f'{label} 缺少已核实的原始依据')
        if len(node.get('name',''))>35:warn('LABEL',f'{label} 名称过长，请拆分短标签与说明')
        check_i18n(node,'node',label)
    for i,edge in enumerate(edges):
        if not isinstance(edge,dict):err('EDGE',f'[{i}] 不是对象');continue
        eid=edge.get('id');label=f'edge[{i}]({eid})'
        if not isinstance(eid,str) or not ID_PATTERN.fullmatch(eid):err('EDGE',f'{label} ID 格式不合格')
        elif eid in edge_ids:err('EDGE',f'{label} ID 重复')
        else:edge_ids.add(eid)
        if edge.get('source') not in node_ids or edge.get('target') not in node_ids:err('EDGE',f'{label} 源或目标不存在')
        if edge.get('kind') not in EDGE_KINDS:err('EDGE',f'{label} 关系类别不支持')
        if strict and (not edge.get('evidence') or edge.get('verification')!='confirmed'):err('EVIDENCE',f'{label} 缺少已核实的关系依据')
        a=node_by_id.get(edge.get('source'));b=node_by_id.get(edge.get('target'))
        if a and b and a.get('trustZone')!=b.get('trustZone') and not edge.get('control'):
            warn('SECURITY',f'{label} 跨信任域关系缺少控制或待核实标识')
        # Demo edges are intentionally untranslated descriptions until a language-specific version is provided.
        if lang!=default and not edge.get('i18n',{}).get(lang):warn('LANG',f'{label} 沿用非用户界面的原始技术关系描述')
    for i,view in enumerate(views):
        if not isinstance(view,dict):err('VIEW',f'[{i}] 不是对象');continue
        vid=view.get('id');label=f'view[{i}]({vid})'
        if vid in view_ids:err('VIEW',f'{label} ID 重复')
        view_ids.add(vid)
        if not view.get('title') or not view.get('description'):err('VIEW',f'{label} 缺少标题或说明')
        if not all(isinstance(view.get(k),list) and view[k] for k in ['nodeIds','edgeKinds','stakeholders','concerns','questions']):err('VIEW',f'{label} 缺少对象/关系/审查关注点')
        if len(view.get('nodeIds',[]))!=len(set(view.get('nodeIds',[]))):err('VIEW',f'{label} 存在重复节点')
        for nid in view.get('nodeIds',[]):
            if nid not in node_ids:err('VIEW',f'{label} 引用了不存在的节点 {nid}')
        for kind in view.get('edgeKinds',[]):
            if kind not in EDGE_KINDS:err('VIEW',f'{label} 未知关系类型 {kind}')
        axes=view.get('dimensions',{})
        if not isinstance(axes,dict) or any(not isinstance(axes.get(a),dict) or axes[a].get('field') not in AXES for a in 'xyz'):
            err('AXES',f'{label} X/Y/Z 必须各有合法架构字段');continue
        fields=[axes[a]['field'] for a in 'xyz']
        if len(set(fields))!=3:err('AXES',f'{label} X/Y/Z 必须编码三个不同属性')
        for axis,field in zip('xyz',fields):
            values=[node_by_id[nid].get(field) for nid in view.get('nodeIds',[]) if nid in node_by_id]
            cardinality=len({str(v) for v in values if v})
            if cardinality<2:warn('DIMENSION',f'{label} {axis.upper()}={field} 仅有 {cardinality} 个有效类别；不得宣称此轴提供独立信息')
            if len(values)!=len([v for v in values if v]):warn('COVERAGE',f'{label} {axis.upper()}={field} 存在缺失值')
        # Conditional information gain: three different fields are not necessarily three useful axes.
        visible=[node_by_id[nid] for nid in view.get('nodeIds',[]) if nid in node_by_id]
        def groups(keys):
            return len({tuple(str(n.get(field,'—')) for field in keys) for n in visible})
        g1,g2,g3=groups(fields[:1]),groups(fields[:2]),groups(fields)
        for axis,gain in [('X',g1-1),('Y',g2-g1),('Z',g3-g2)]:
            if gain<=0:warn('SPATIAL_GAIN',f'{label} {axis} 没有增加可辨别组合，运行时必须折叠该轴')
        if view.get('groupBy') not in AXES:err('VIEW',f'{label} groupBy 不是合法类别')
        check_i18n(view,'view',label)
        if lang!=default and view.get('reviewIntent') and not view.get('i18n',{}).get(lang,{}).get('reviewIntent'):err('LANG',f'{label} 缺少审查意图的 {lang} 翻译')
    return errors,warnings

def main():
    parser=argparse.ArgumentParser(description='Validate factual 3D architecture and multilingual model')
    parser.add_argument('model',type=Path);parser.add_argument('--strict',action='store_true');parser.add_argument('--lang',default='zh-CN')
    a=parser.parse_args()
    try:model=json.loads(a.model.read_text(encoding='utf-8'))
    except (OSError,json.JSONDecodeError) as e:print(f'ERROR {e}',file=sys.stderr);return 2
    errors,warnings=validate(model,a.strict,a.lang)
    for w in warnings:print('WARN '+w)
    for e in errors:print('ERROR '+e)
    print(f'检查完成: {len(errors)} errors / {len(warnings)} warnings / {len(model.get("views",[]))} views · lang={a.lang}')
    return int(bool(errors))
if __name__=='__main__':sys.exit(main())
