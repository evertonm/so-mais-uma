import { makeLevel, resolveKick } from '../lib/physics.js';
import { pointsFor, nextScore } from '../lib/scoring.js';

const KEY = 'sma:ranking:v1';
const MAX_SHOTS = 90;
const MAX_RANK = 20;
const SKILLS = [
 {power:.98,curve:1,precision:.97,loft:1,keeperDelay:.04},
 {power:1.03,curve:1.12,precision:1,loft:1},
 {power:1.12,curve:.75,precision:.9,loft:1},
 {power:1.01,curve:1.52,precision:.91,loft:1.02},
 {power:1.1,curve:.9,precision:.88,loft:.96},
 {power:1,curve:1,precision:.94,loft:1,keeperDelay:.07}
];
const isValidNick=v=>typeof v==='string'&&/^[\p{L}\p{N}_ .-]{3,18}$/u.test(v.trim());
const isValidId=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const dataKey=id=>`sma:player:${id}`;
const redisUrl=process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisReadToken=process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN;
const redisWriteToken=process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(commands,{write=false}={}) {
 const token=write?redisWriteToken:redisReadToken;
 if(!redisUrl||!token)throw new Error('Redis não configurado');
 const response=await fetch(`${redisUrl.replace(/\/$/,'')}/pipeline`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify(commands),signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error(`Redis indisponível (${response.status})`);
 const output=await response.json();
 if(!Array.isArray(output)||output.some(x=>x?.error))throw new Error('Comando Redis inválido');
 return output.map(x=>x.result);
}
function replay(shots) {
 let goals=0, score=0, misses=0, missesInStage=0;
 for(const kick of shots){
  if(goals===6)throw new Error('Cobranças extras não são permitidas');
  if(!kick || typeof kick!=='object')throw new Error('Cobrança inválida');
  const keys=['direction','pitch','swerve','power'];
  if(keys.some(k=>typeof kick[k]!=='number'||!Number.isFinite(kick[k])))throw new Error('Parâmetros inválidos');
  const s=SKILLS[goals],bound=(v,min,max)=>v>=min-1e-7&&v<=max+1e-7;
  if(!bound(kick.direction,-30,30)||!bound(kick.pitch,4,57)||!bound(kick.swerve,-4.4,4.4)||!bound(kick.power,.15,1.1))throw new Error('Cobrança fora dos limites');
  const level=makeLevel(goals);level.reaction+=s.keeperDelay||0;
  const r=resolveKick(kick,level);
  const calc=pointsFor(r.result,r.point,goals,missesInStage);
  score=nextScore(score,calc.delta);
  if(r.result==='goal'){goals++;missesInStage=0;}
  else{misses++;missesInStage++;}
 }
 if(goals!==6)throw new Error('Complete as seis fases antes de entrar no ranking');
 return {score,goals,misses};
}
const parseLeaderboard=async(playerId)=>{
 const cmds=[['ZREVRANGE',KEY,0,MAX_RANK-1,'WITHSCORES'],['ZCARD',KEY]];
 if(isValidId(playerId))cmds.push(['ZREVRANK',KEY,playerId],['ZSCORE',KEY,playerId]);
 const [raw,total,rank,personalScore]=await redis(cmds);
 const items=Array.isArray(raw)?raw:[];
 const ids=items.filter((_,i)=>i%2===0);
 const info=ids.length?await redis(ids.map(id=>['HMGET',dataKey(id),'nickname','misses','updatedAt'])):[];
 const ranking=ids.map((id,i)=>({position:i+1,nickname:info[i]?.[0]||'Jogador',score:Number(items[i*2+1]||0),misses:Number(info[i]?.[1]||0),updatedAt:info[i]?.[2]||null}));
 return {ranking,total:Number(total||0),me:rank!=null?{position:Number(rank)+1,score:Number(personalScore||0)}:null};
};

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido'});
 if(!redisUrl||!redisReadToken)return res.status(503).json({error:'Ranking ainda não configurado. Conecte Upstash Redis no Vercel.'});
 if(req.method==='GET' && (req.query?.health==='1' || req.query?.debug==='1')){
  const [total]=await redis([['ZCARD',KEY]]);
  return res.status(200).json({
   configured:true,
   writable:Boolean(redisWriteToken),
   provider:process.env.KV_REST_API_URL?'vercel-kv/upstash':'upstash',
   key:KEY,
   total:Number(total||0)
  });
 }
 try{
  if(req.method==='GET')return res.status(200).json(await parseLeaderboard(req.query?.playerId));
  const size=Number(req.headers['content-length']||0);
  if(size>22000)return res.status(413).json({error:'Partida grande demais'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||!isValidNick(body.nickname)||!isValidId(body.playerId)||!Array.isArray(body.shots)||body.shots.length<6||body.shots.length>MAX_SHOTS)return res.status(400).json({error:'Partida ou apelido inválido'});
  // Pequeno limite por identificador de instalação, para evitar disparos acidentais.
  const minute=Math.floor(Date.now()/60000);
  if(!redisWriteToken)return res.status(503).json({error:'Ranking conectado apenas para leitura. Verifique KV_REST_API_TOKEN.'});
  const [count]=await redis([['INCR',`sma:limit:${body.playerId}:${minute}`],['EXPIRE',`sma:limit:${body.playerId}:${minute}`,120]],{write:true});
  if(Number(count)>8)return res.status(429).json({error:'Muitas partidas enviadas. Tente mais tarde.'});
  const result=replay(body.shots);
  const playerId=body.playerId;
  const nickname=body.nickname.trim();
  const [previous]=await redis([['ZSCORE',KEY,playerId]]);
  if(previous===null||result.score>Number(previous)){
   await redis([['ZADD',KEY,result.score,playerId],['HSET',dataKey(playerId),'nickname',nickname,'misses',result.misses,'updatedAt',new Date().toISOString()]],{write:true});
  }else{
   await redis([['HSET',dataKey(playerId),'nickname',nickname]],{write:true});
  }
  const board=await parseLeaderboard(playerId);
  return res.status(200).json({...result,...board});
 }catch(err){
  if(/inválid|limites|extras|Complete as/.test(err.message))return res.status(422).json({error:err.message});
  console.error('Erro de ranking:',err.message);
  return res.status(503).json({error:'Não foi possível consultar o ranking agora.',detail:process.env.NODE_ENV!=='production'?err.message:undefined});
 }
}
