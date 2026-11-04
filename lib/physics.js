// Modelo físico extraído da versão local v15, usado para validar cobranças no servidor.
const rad=Math.PI/180;
const FIELD={goalWidth:7.32,goalHeight:2.44,wallDistance:9.15};
function advanceStage(stage){return stage<3?stage+1:'shoot';}
// Arco calibrado: o ângulo do medidor é um comando arcade, NÃO o ângulo físico em graus.
// A força altera tempo de voo e queda, sem transformar um pequeno toque em isolamento.
function launchAngle(kick,level){
 const speed=15+Math.max(.05,kick.power)*13;
 const distance=level.distance;
 const a=9.81*distance*distance/(2*speed*speed);
 const aimHeight=1.23+(kick.pitch-30)*.115;
 const disc=distance*distance-4*a*(a+aimHeight-.12);
 const tangent=disc>=0?(distance-Math.sqrt(disc))/(2*a):distance/(2*a);
 return Math.atan(Math.max(.035,Math.min(1.2,tangent)));
}
function velocity(kick,level){const speed=15+Math.max(.05,kick.power)*13,angle=launchAngle(kick,level);return {forward:Math.cos(angle)*speed,up:Math.sin(angle)*speed,speed,angle};}
function trajectory(kick,t,level){
 const v=velocity(kick,level),y=v.forward*t,progress=Math.min(1,Math.max(0,y/level.distance));
 // Magnus horizontal: começa quase reto, ganha curva forte no fim, como nos jogos clássicos.
 const curve=kick.swerve*(-.30*progress+1.50*progress*progress);
 const x=level.offset+y*Math.tan(kick.direction*rad)+curve;
 // Pequena sustentação aerodinâmica no meio do percurso e queda na chegada.
 const aero=.68*Math.min(1,kick.power/.55)*Math.max(0,1-Math.abs(kick.pitch-33)/47)*Math.sin(Math.PI*progress);
 return {x,y,z:.12+v.up*t-4.905*t*t+aero};
}
function makeLevel(goals){const distance=22+Math.min(goals,10)*.8,offset=[0,-2.5,3.5,-4.5,5,-3,0,5.5][goals%8];const n=Math.min(5,Math.ceil(goals/2));const center=offset*(1-FIELD.wallDistance/distance)+.35;return {distance,offset,wall:Array.from({length:n},(_,i)=>center+(i-(n-1)/2)*.58),keeperX:Math.sin(goals*1.7)*.6,reaction:Math.max(.32,.82-goals*.045),reach:Math.min(2.65,1.3+goals*.12)};}
function bounceSim(kick,level,tg){
 const p=trajectory(kick,tg,level),v=velocityAt(kick,level,tg-.004),dt=.01;
 const s={x:p.x,y:p.y,z:.12,vx:v.vx*.84,vy:v.vy*.84,vz:Math.abs(v.vz)*.39},out=[{t:tg,x:s.x,y:s.y,z:s.z}];let t=tg;
 for(let i=0;i<800;i++){s.vz-=9.81*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;if(s.z<.12){s.z=.12;s.vz=s.vz<-.9?-s.vz*.5:0;}
  if(s.z<=.12&&s.vz===0){const f=1-dt*2.9;s.vx*=f;s.vy*=f;}t+=dt;out.push({t,x:s.x,y:s.y,z:s.z});
  if(s.y>=level.distance+.2||(s.z<=.12&&Math.hypot(s.vx,s.vy)<.3))break;}
 return out;
}
function crossAt(path,yT){for(let i=1;i<path.length;i++){if(path[i].y>=yT){const a=path[i-1],b=path[i],u=(yT-a.y)/Math.max(1e-9,b.y-a.y);return {i,t:a.t+(b.t-a.t)*u,x:a.x+(b.x-a.x)*u,y:yT,z:a.z+(b.z-a.z)*u};}}return null;}
// Posição da bola em t, incluindo quique depois de cair no gramado.
function ballAt(kick,level,outcome,t){
 const P=outcome.path;if(!P||t<=P[0].t)return trajectory(kick,Math.min(t,P?P[0].t:t),level);
 if(t>=P[P.length-1].t){const e=P[P.length-1];return {x:e.x,y:e.y,z:e.z};}
 let i=Math.min(P.length-2,Math.max(0,Math.floor((t-P[0].t)/.01)));while(i>0&&P[i].t>t)i--;while(i<P.length-2&&P[i+1].t<t)i++;
 const a=P[i],b=P[i+1],u=(t-a.t)/Math.max(1e-9,b.t-a.t);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u};
}
function resolveKick(kick,level){
 const v=velocity(kick,level),time=level.distance/v.forward,wallTime=FIELD.wallDistance/v.forward;
 const ground=(v.up+Math.sqrt(v.up*v.up+2*9.81*.12))/9.81;
 const wallHit=pt=>pt.z<1.95+.12&&level.wall.some(x=>Math.abs(x-pt.x)<.38);
 let point,t=time,path=null;
 if(ground>=wallTime){const atWall=trajectory(kick,wallTime,level);if(wallHit(atWall))return {result:'wall',time:wallTime,point:atWall};}
 if(ground<time){
  path=bounceSim(kick,level,ground);
  if(ground<wallTime){const w=crossAt(path,FIELD.wallDistance);if(w&&wallHit(w)){path=path.slice(0,w.i).concat([{t:w.t,x:w.x,y:w.y,z:w.z}]);return {result:'wall',time:w.t,point:{x:w.x,y:w.y,z:w.z},path};}}
  const g=crossAt(path,level.distance);
  if(!g){const e=path[path.length-1];return {result:'short',time:e.t,point:{x:e.x,y:e.y,z:0},path};}
  path=path.slice(0,g.i).concat([{t:g.t,x:g.x,y:g.y,z:g.z}]);point={x:g.x,y:g.y,z:g.z};t=g.t;
 }else point=trajectory(kick,time,level);
 const x=Math.abs(point.x),extra=path?{path}:{};
 if(x>3.78)return {result:'wide',time:t,point,...extra};
 if(point.z>2.56)return {result:'over',time:t,point,...extra};
 if(x>=3.54||point.z>=2.32)return {result:'post',time:t,point,...extra};
 const rolling=point.z<.42;
 const skidding=!!path&&point.z<.24;
 const reaction=Math.max(.05,level.reaction-(rolling ? .16 : 0));
 const movementSpeed=rolling?3.6:2.8;
 const reach=level.reach+(rolling ? .38 : 0);
 const movement=Math.min(Math.abs(point.x-level.keeperX),reach,Math.max(0,t-reaction)*movementSpeed);
 const keeper=level.keeperX+Math.sign(point.x-level.keeperX)*movement;
 const saveWindow=rolling ? .96 : .66;
 const saveHeight=rolling?1.15:2.25;
 const saved=Math.abs(point.x-keeper)<saveWindow&&point.z<saveHeight;
 return {result:saved?'save':'goal',time:t,point,keeper,...extra};
}
export {makeLevel,resolveKick};
