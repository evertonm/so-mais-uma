import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLevel, resolveKick } from './lib/physics.js';
import { zoneAt, pointsFor, nextScore } from './lib/scoring.js';

test('as zonas do gol dão bônus distintos',()=>{
 assert.equal(zoneAt({x:3,z:2}).points,300);
 assert.equal(zoneAt({x:-2.6,z:.3}).points,240);
 assert.equal(zoneAt({x:3,z:1.1}).points,180);
 assert.equal(zoneAt({x:0,z:2}).points,140);
 assert.equal(zoneAt({x:0,z:.4}).points,100);
});
test('penalidade sobe a cada erro e pontuação nunca é negativa',()=>{
 assert.equal(pointsFor('save',{x:0,z:0},0,0).delta,-35);
 assert.equal(pointsFor('save',{x:0,z:0},0,7).delta,-120);
 assert.equal(nextScore(20,-35),0);
 assert.equal(pointsFor('goal',{x:3,z:2},2,0).delta,370);
});
test('física do servidor processa seis níveis',()=>{
 for(let i=0;i<6;i++){
  const level=makeLevel(i),r=resolveKick({direction:0,pitch:30,swerve:0,power:.8},level);
  assert.ok(['goal','save','wall','short','over','wide','post'].includes(r.result));
  assert.ok(Number.isFinite(r.point.x));
  assert.ok(Number.isFinite(r.point.z));
 }
});
