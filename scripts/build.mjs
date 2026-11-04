import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/index.html',fs.readFileSync('index.html'));
for (const file of ['fernandes-sprite-aprovado.webp','wilson-ready-corrigido.png','wilson-dive-corrigido.png']) {
 fs.copyFileSync(file,path.join('dist',file));
}
console.log('Só Mais Uma: interface e sprites publicados em dist/');
