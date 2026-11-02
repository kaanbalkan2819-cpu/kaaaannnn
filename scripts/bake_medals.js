const {createCanvas, loadImage}=require('canvas');const fs=require('fs');
global.document={createElement:()=>createCanvas(1,1)};global.window={};
require('./ranked_real.js');
const out='../www/medals';fs.mkdirSync(out,{recursive:true});
(async()=>{for(let l=0;l<6;l++){const divs=l==5?[0]:[1,2,3];for(const d of divs){
 const u=window.WCRealMedal.render(l,d);fs.writeFileSync(`${out}/m_${l}_${d}.png`,Buffer.from(u.split(',')[1],'base64'));}}
console.log(fs.readdirSync(out).length,'files');})();
