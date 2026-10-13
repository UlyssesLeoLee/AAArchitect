/** Real 2D SVG architecture map. No WebGL, no perspective tricks, no CSS3D.
 * The axes are drawn as structure, not as captions: bands, lanes and dashed
 * containment groups are the visual grammar that carries the dimension meaning. */
import {flatEdgePath,flatCounts} from './flat.js';

const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{const node=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node};
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const fit=(s,max)=>{const t=String(s??'');return t.length<=max?t:t.slice(0,max-1)+'…'};
const verificationColor=v=>({confirmed:'#6fd39b',assumed:'#f2c17e'})[v]||'#8aa4b8';

function textNode(x,y,value,{size=12,fill='#dce9f5',anchor='start',weight=400,opacity=1}={}){
 const node=el('text',{x,y,'text-anchor':anchor,'font-size':size,fill,'font-weight':weight,opacity});
 node.textContent=value;
 return node;
}

export function drawFlat(svg,{plan,model,report,state,classColors,tr,text,onSelect}){
 while(svg.firstChild)svg.removeChild(svg.firstChild);
 svg.setAttribute('viewBox',`0 0 ${plan.width} ${plan.height}`);
 svg.setAttribute('role','img');
 svg.setAttribute('aria-label',text('flatCanvasLabel'));
 const counts=flatCounts(plan);
 const nodeMap=new Map(model.nodes.map(n=>[n.id,n]));
 const focusOf=id=>['x','y','z'].every(a=>!state.filters[a]||plan.nodes[id]?.category[a]===state.filters[a]);
 const visible=id=>Boolean(plan.nodes[id])&&focusOf(id);
 const kindColor=id=>hex(classColors[nodeMap.get(id)?.kind]||0x9dd1df);
 const meta=Object.fromEntries(plan.axisMeta.map(m=>[m.axis,m]));
 const {colHeader,rowHeader}=plan;

 svg.append(el('rect',{x:0,y:0,width:plan.width,height:plan.height,fill:'#0a1826'}));

 // X bands: the header strip names the axis, the category and how much sits in it.
 for(let ci=0;ci<plan.columns.length;ci++){
  const x=plan.colX[ci],w=plan.colWidths[ci];
  svg.append(el('rect',{x,y:0,width:w,height:plan.height,fill:hex(meta.x.color),opacity:ci%2?.035:.06}));
  svg.append(el('rect',{x,y:0,width:w,height:colHeader,fill:hex(meta.x.color),opacity:.16}));
  svg.append(el('line',{x1:x,y1:colHeader,x2:x+w,y2:colHeader,stroke:hex(meta.x.color),'stroke-width':1,opacity:.5}));
  svg.append(textNode(x+w/2,17,fit(plan.columns[ci],Math.max(5,Math.floor(w/9))),{size:12.5,fill:hex(meta.x.color),anchor:'middle',weight:700}));
  svg.append(textNode(x+w/2,33,`${counts.columns[ci]} ${text('elements')}`,{size:9.5,fill:'#8fb3c6',anchor:'middle'}));
 }

 // Y lanes on the left edge.
 for(let ri=0;ri<plan.rows.length;ri++){
  const y=plan.rowY[ri],h=plan.rowHeights[ri];
  svg.append(el('rect',{x:0,y,width:plan.width,height:h,fill:hex(meta.y.color),opacity:ri%2?.028:.045}));
  svg.append(el('rect',{x:0,y,width:rowHeader,height:h,fill:hex(meta.y.color),opacity:.14}));
  svg.append(el('line',{x1:rowHeader,y1:y,x2:plan.width,y2:y,stroke:hex(meta.y.color),'stroke-width':1,opacity:.4}));
  const label=fit(plan.rows[ri],16);
  svg.append(textNode(rowHeader-10,y+h/2-3,label,{size:12,fill:hex(meta.y.color),anchor:'end',weight:700}));
  svg.append(textNode(rowHeader-10,y+h/2+13,`${counts.rows[ri]} ${text('elements')}`,{size:9.5,fill:'#8fb3c6',anchor:'end'}));
 }

 // An empty cell is real information: that lane has no component in that zone.
 for(let ci=0;ci<plan.columns.length;ci++)for(let ri=0;ri<plan.rows.length;ri++){
  if(plan.cells.has(`${ci}/${ri}`))continue;
  const x=plan.colX[ci],y=plan.rowY[ri],w=plan.colWidths[ci],h=plan.rowHeights[ri];
  svg.append(el('rect',{x:x+7,y:y+7,width:w-14,height:h-14,rx:8,fill:'none',stroke:'#2b465c','stroke-width':1,'stroke-dasharray':'3 5',opacity:.55}));
  svg.append(textNode(x+w/2,y+h/2+3,text('flatEmpty'),{size:9.5,fill:'#436379',anchor:'middle'}));
 }

 // Axis titles, so a reader never has to guess what a band or lane is encoding.
 svg.append(textNode(rowHeader/2,colHeader/2+4,`X · ${tr.fieldLabel[meta.x.field]||meta.x.field}`,{size:11,fill:hex(meta.x.color),anchor:'middle',weight:700}));
 const yTitle=textNode(15,plan.height/2,`Y · ${tr.fieldLabel[meta.y.field]||meta.y.field}`,{size:11,fill:hex(meta.y.color),anchor:'middle',weight:700});
 yTitle.setAttribute('transform',`rotate(-90 15 ${plan.height/2})`);
 svg.append(yTitle);

 // Z as containment: a dashed group is a real "same class" relationship.
 for(const cell of plan.cells.values()){
  for(const group of cell.groups){
   if(!group.showHeader)continue;
   svg.append(el('rect',{x:group.x,y:group.y,width:group.w,height:group.h,rx:9,
    fill:hex(meta.z.color),'fill-opacity':.05,stroke:hex(meta.z.color),'stroke-width':1,'stroke-dasharray':'5 4',opacity:.42}));
   svg.append(textNode(group.x+12,group.y+15,`${text('zGroupLabel')} ${fit(group.z,18)}`,{size:10,fill:hex(meta.z.color),weight:700}));
  }
 }

 // Relations use orthogonal routing so crossings stay readable.
 const edgeLayer=el('g',{'aria-hidden':'true'});
 svg.append(edgeLayer);
 const defs=el('defs');
 for(const[id,color]of[['flat-arrow',0x72b7d3],['flat-arrow-cross',0xf6bd76]]){
  const marker=el('marker',{id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
  marker.append(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:hex(color)}));
  defs.append(marker);
 }
 svg.insertBefore(defs,svg.firstChild);
 if(state.showEdges){
  for(const edge of report.edges){
   const from=plan.nodes[edge.source],to=plan.nodes[edge.target];
   if(!from||!to||!visible(edge.source)||!visible(edge.target))continue;
   const highlighted=state.selected&&(edge.source===state.selected||edge.target===state.selected);
   if(state.selected&&!highlighted)continue;
   const a=nodeMap.get(edge.source),b=nodeMap.get(edge.target);
   const crossing=a?.trustZone&&b?.trustZone&&a.trustZone!==b.trustZone;
   const color=crossing?0xf6bd76:0x72b7d3;
   const p=flatEdgePath(from,to);
   edgeLayer.append(el('path',{d:p.d,fill:'none',stroke:hex(color),'stroke-width':crossing?1.9:1.2,opacity:highlighted?.95:.36,
    'marker-end':`url(#${crossing?'flat-arrow-cross':'flat-arrow'})`}));
  }
 }

 // Nodes last so nothing occludes a label.
 for(const[id,item]of Object.entries(plan.nodes)){
  const on=focusOf(id),chosen=state.selected===id;
  const group=el('g',{class:'flat-node',tabindex:0,role:'button','data-node':id,
   'aria-label':`${item.node.name} · ${id} · ${item.category.x} / ${item.category.y}${item.z!=='—'?` · ${item.z}`:''}`});
  group.append(el('rect',{x:item.x,y:item.y,width:item.w,height:item.h,rx:8,
   fill:chosen?'#22485f':'#16293a',stroke:chosen?'#66d2e5':'#33566d','stroke-width':chosen?2.2:1,opacity:on?1:.18}));
  group.append(el('rect',{x:item.x,y:item.y,width:4,height:item.h,rx:2,fill:kindColor(id),opacity:on?1:.18}));
  group.append(textNode(item.x+12,item.y+20,fit(item.node.name,15),{size:12,fill:'#eaf6ff',weight:600,opacity:on?1:.18}));
  group.append(textNode(item.x+12,item.y+36,id,{size:9.5,fill:'#8fb3c6',opacity:on?.95:.18}));
  group.append(el('circle',{cx:item.x+item.w-11,cy:item.y+13,r:3.6,fill:verificationColor(nodeMap.get(id)?.verification),opacity:on?1:.18}));
  group.addEventListener('click',()=>onSelect?.(id));
  group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.(id)}});
  svg.append(group);
 }

 // Legend: colours and shapes are only meaningful if the map explains them.
 const ly=plan.legendY+plan.legendH/2;
 svg.append(el('line',{x1:0,y1:plan.legendY,x2:plan.width,y2:plan.legendY,stroke:'#23354a','stroke-width':1}));
 let lx=rowHeader;
 const legend=[['line',hex(0x72b7d3),text('flatLegendRelation')],
  ['line',hex(0xf6bd76),text('flatLegendCross')],
  ['dot',verificationColor('confirmed'),text('flatLegendVerified')],
  ['dot',verificationColor('assumed'),text('flatLegendAssumed')],
  ['dash',hex(meta.z.color),text('flatLegendGroup')]];
 for(const[kind,color,label]of legend){
  if(kind==='line')svg.append(el('line',{x1:lx,y1:ly,x2:lx+18,y2:ly,stroke:color,'stroke-width':1.6}));
  if(kind==='dash')svg.append(el('rect',{x:lx,y:ly-6,width:18,height:12,rx:4,fill:color,'fill-opacity':.12,stroke:color,'stroke-dasharray':'4 3'}));
  if(kind==='dot')svg.append(el('circle',{cx:lx+9,cy:ly,r:4,fill:color}));
  svg.append(textNode(lx+25,ly+4,label,{size:10,fill:'#8fb3c6'}));
  lx+=25+label.length*10+22;
 }
 return {nodes:Object.keys(plan.nodes).length,counts};
}