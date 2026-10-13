/** Pure 2D planning for the flat architecture map.
 *
 * The flat map has to *communicate* what each axis means, not merely print category
 * strings next to boxes. So every dimension gets a real piece of visual grammar:
 *   X -> vertical bands with an axis header, the category and its node count
 *   Y -> horizontal lanes with the same treatment on the left edge
 *   Z -> dashed containment groups inside a cell (a group is a container, which is
 *        how architecture diagrams express "belongs to the same Z class")
 * A plane has no depth, so Z is drawn as containment rather than pretending to be a
 * third spatial axis, and `axisMeta` reports what each axis actually contributed. */
import {dimensionPlan,AXIS_COLORS,NO_VALUE} from './layout.js';

export const FLAT_METRICS={
 nodeW:172,nodeH:42,nodeGap:10,
 groupPadX:12,groupPadY:9,groupGap:10,groupHeader:19,
 colHeader:38,rowHeader:126,padX:14,padY:11,
 legendH:26,
};

const byId=(a,b)=>(a<b?-1:a>b?1:0);

export function plan2d(model,view,requested){
 const spatial=dimensionPlan(model,view,requested);
 const m=FLAT_METRICS;
 const axes=spatial.axes;
 const columns=spatial.effective.x?axes.x.values:[NO_VALUE];
 const rows=spatial.effective.y?axes.y.values:[NO_VALUE];
 const zDemoted=axes.z.size>1;
 const zValues=zDemoted?axes.z.values:[];
 const nodes=view.nodeIds.map(id=>model.nodes.find(n=>n.id===id)).filter(Boolean);

 const cells=new Map();
 for(const node of nodes){
  const p=spatial.positions[node.id];
  const ci=Math.max(0,columns.indexOf(p.category.x));
  const ri=Math.max(0,rows.indexOf(p.category.y));
  const key=`${ci}/${ri}`;
  if(!cells.has(key))cells.set(key,{column:ci,row:ri,groups:[]});
  const cell=cells.get(key);
  let group=cell.groups.find(g=>g.z===p.category.z);
  if(!group){group={z:p.category.z,nodes:[]};cell.groups.push(group)}
  group.nodes.push({node,category:p.category});
 }
 for(const cell of cells.values()){
  cell.groups.sort((a,b)=>{
   const za=zValues.indexOf(a.z),zb=zValues.indexOf(b.z);
   return(za<0?Number.MAX_SAFE_INTEGER:za)-(zb<0?Number.MAX_SAFE_INTEGER:zb)||byId(a.z,b.z);
  });
  for(const group of cell.groups){
   group.nodes.sort((a,b)=>byId(a.node.id,b.node.id));
   const count=group.nodes.length;
   group.cols=Math.max(1,Math.min(5,Math.ceil(Math.sqrt(count))));
   group.rows=Math.ceil(count/group.cols);
   group.w=group.cols*m.nodeW+(group.cols-1)*m.nodeGap+m.groupPadX*2;
   group.h=group.rows*m.nodeH+(group.rows-1)*m.nodeGap+m.groupPadY*2+(zDemoted&&group.nodes.length?m.groupHeader:0);
  }
  cell.contentW=Math.max(0,...cell.groups.map(g=>g.w));
  cell.contentH=cell.groups.reduce((sum,g,i)=>sum+g.h+(i?m.groupGap:0),0);
  cell.colW=cell.contentW+m.padX*2;
  cell.rowH=cell.contentH+m.padY*2;
 }

 const colWidths=columns.map((_,ci)=>Math.max(m.nodeW+m.groupPadX*2+m.padX*2,...rows.map((_,ri)=>cells.get(`${ci}/${ri}`)?.colW||0)));
 const rowHeights=rows.map((_,ri)=>Math.max(m.nodeH+m.groupPadY*2+m.padY*2,...columns.map((_,ci)=>cells.get(`${ci}/${ri}`)?.rowH||0)));

 const colX=[];let accX=m.rowHeader;
 for(const w of colWidths){colX.push(accX);accX+=w}
 const rowY=[];let accY=m.colHeader;
 for(const h of rowHeights){rowY.push(accY);accY+=h}
 const height=accY+m.legendH;

 // Per-axis report so the reader can see what each dimension contributed.
 const axisMeta=['x','y','z'].map(axis=>{
  const a=axes[axis];
  return {axis,field:a.field,size:a.size,complete:a.complete,total:a.total,effective:spatial.effective[axis],
   incremental:spatial.incremental[axis],color:AXIS_COLORS[axis],
   role:axis==='x'?'column':axis==='y'?'row':(zDemoted?'group':'none')};
 });

 const placed={};
 for(const cell of cells.values()){
  const cellX=colX[cell.column],cellY=rowY[cell.row];
  let cursorY=cellY+m.padY;
  for(const group of cell.groups){
   const gx=cellX+(colWidths[cell.column]-group.w)/2;
   const showHeader=zDemoted&&group.nodes.length>0;
   const startY=cursorY+m.groupPadY+(showHeader?m.groupHeader:0);
   group.x=gx;group.y=cursorY;group.w=group.w;group.h=group.h;group.showHeader=showHeader;
   group.nodes.forEach((item,index)=>{
    const slot=index%group.cols,line=Math.floor(index/group.cols);
    const id=item.node.id;
    placed[id]={id,node:item.node,category:item.category,z:group.z,group,
     x:gx+m.groupPadX+slot*(m.nodeW+m.nodeGap),
     y:startY+line*(m.nodeH+m.nodeGap),
     w:m.nodeW,h:m.nodeH,column:cell.column,row:cell.row};
   });
   cursorY+=group.h+m.groupGap;
  }
  cell.x=cellX;cell.y=cellY;cell.w=colWidths[cell.column];cell.h=rowHeights[cell.row];
 }
 return {axes,columns,rows,zValues,zDemoted,nodes:placed,cells,colX,rowY,colWidths,rowHeights,axisMeta,
  colHeader:m.colHeader,rowHeader:m.rowHeader,width:accX,height,legendY:accY,legendH:m.legendH,metrics:m,
  depth:spatial.depth,effective:spatial.effective,warnings:spatial.warnings,incremental:spatial.incremental};
}

/** Orthogonal elbow routing: architecture diagrams read as system flow, not spaghetti. */
export function flatEdgePath(from,to){
 const forward=to.x>=from.x;
 const sx=forward?from.x+from.w:from.x,sy=from.y+from.h/2;
 const ex=forward?to.x-9:to.x+to.w+9,ey=to.y+to.h/2;
 const midX=forward?(sx+ex)/2:(sx+ex)/2;
 const gap=6;
 return {d:`M ${sx} ${sy} H ${midX} V ${ey} H ${ex}`,mid:{x:midX,y:ey},gap};
}

/** Node counts per column and per row, so the headers carry real information. */
export function flatCounts(plan){
 const columns=plan.columns.map((_,ci)=>Object.values(plan.nodes).filter(n=>n.column===ci).length);
 const rows=plan.rows.map((_,ri)=>Object.values(plan.nodes).filter(n=>n.row===ri).length);
 const groups=[];
 for(const cell of plan.cells.values())for(const group of cell.groups)groups.push({z:group.z,count:group.nodes.length});
 return {columns,rows,groups};
}