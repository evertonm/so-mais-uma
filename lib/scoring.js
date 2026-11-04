// As mesmas zonas e regras devem valer no cliente e no servidor.
export const ZONES = [
  { minX:-3.54, maxX:-2.25, minZ:1.55, maxZ:2.32, points:300, label:'Ângulo superior' },
  { minX: 2.25, maxX: 3.54, minZ:1.55, maxZ:2.32, points:300, label:'Ângulo superior' },
  { minX:-3.54, maxX:-2.25, minZ:0, maxZ:.78, points:240, label:'Canto rasteiro' },
  { minX: 2.25, maxX: 3.54, minZ:0, maxZ:.78, points:240, label:'Canto rasteiro' },
  { minX:-3.54, maxX:-2.25, minZ:.78, maxZ:1.55, points:180, label:'Lateral do gol' },
  { minX: 2.25, maxX: 3.54, minZ:.78, maxZ:1.55, points:180, label:'Lateral do gol' },
  { minX:-2.25, maxX: 2.25, minZ:1.55, maxZ:2.32, points:140, label:'Parte alta central' },
  { minX:-2.25, maxX: 2.25, minZ:0, maxZ:1.55, points:100, label:'Centro do gol' }
];
export function zoneAt(p) { return ZONES.find(z => p.x >= z.minX && p.x <= z.maxX && p.z >= z.minZ && p.z <= z.maxZ) || ZONES[7]; }
export function pointsFor(result, point, goalsCompleted, missesInStage) {
  if (result === 'goal') {
    const zone=zoneAt(point);
    const bonus=goalsCompleted*25 + Math.min(60,goalsCompleted*10);
    return {delta:zone.points+bonus, zone:zone.label, base:zone.points, bonus};
  }
  return {delta:-Math.min(120,35+missesInStage*15),zone:'Erro',base:0,bonus:0};
}
export function nextScore(score,delta) { return Math.max(0, score+delta); }
