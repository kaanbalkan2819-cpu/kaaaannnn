var $=function(i){return document.getElementById(i)},SV='wc_save_v1',FC='⚀⚁⚂⚃⚄⚅',PC=['#2f7bff','#22c55e'];
// V26: panel yüksekliği önbelleği — render sırasında offsetHeight okuyup zorunlu yerleşim (forced layout) tetiklemeyi önler
var QUICK=0;
var WCL={ph:0,last:0,fresh:false,q:0};
function panelH(){var p=$('panel');if(!p||p.style.display!='block')return 0;if(WCL.fresh&&WCL.ph>0)return WCL.ph;WCL.ph=p.offsetHeight;if(WCL.ph>0)WCL.last=WCL.ph;WCL.fresh=true;return WCL.ph}
function panelHEst(){var p=$('panel');if(!p||p.style.display!='block')return 0;return WCL.ph>0?WCL.ph:(WCL.last||0)}
function panelDirty(){WCL.fresh=false;if(WCL.q)return;WCL.q=requestAnimationFrame(function(){requestAnimationFrame(function(){WCL.q=0;var p=$('panel');if(!p||p.style.display!='block'){WCL.ph=0;WCL.fresh=true;return}var h=p.offsetHeight,ch=h!==WCL.ph;WCL.ph=h;if(h>0)WCL.last=h;WCL.fresh=true;if(ch&&window.v7EndBtn&&G){try{v7EndBtn()}catch(e){}}})})}
var T={tr:{turn:'Tur',rolling:'Tur zarı atılıyor…',r1:'Zar 1: önce bir istatistiği kalıcı %10 geliştir, sonra tek savaş yap. Keşif yok.',rn:'savaş yapmalısın. Birini kaybedersen tur biter.',go:'Başla',set:'Ayarlar',vol:'Genel ses',mus:'Müzik seviyesi',sfx:'Efekt seviyesi',musOn:'Müzik açık',sfxOn:'Ses efektleri açık',rm:'Animasyonları azalt',big:'Büyük yazı',spd:'Savaş animasyonu',nor:'Normal',fast:'Hızlı',skipb:'Atla',why_land:'Kara sınırı: saldırılabilir',why_sea:'Deniz menzilinde: saldırılabilir',why_no:'Saldırılamaz: kara bağlantısı veya deniz menzili yok',ru1:'Saldıran en az 3 karşılaştırmayı kazandı',ru2:'Savunan en az 3 karşılaştırmayı kazandı',ru3:'Kimse 3 karşılaştırmaya ulaşamadı: savunan kazanır',hi:'Yüksek zar',eqd:'Eşit zar: çarpan yok',weak:'Zayıf',mid:'Orta',str:'Güçlü',rep:'Savaş tazminatı (Ekonomi)',pick:'Başlangıç ülkeni seç',rnd:'Rastgele',ok:'Seç',cont:'Devam Et',nw:'Yeni Oyun',m1:'Tek Oyunculu',m2:'Çift Oyunculu (aynı cihaz)',lg:'English',del:'Mevcut kayıt silinecek. Devam edilsin mi?',yes:'Evet',no:'İptal',pl:'Oyuncu',roll:'Tur zarı',left:'Kalan savaş',atk:'Saldır',sc:'Keşfet',st:'Savaşı Başlat',skip:'Turu Geç',upg:'Zar 1! Geliştirilecek istatistiği seç (+%10)',S:['Nüfus','Ordu Gücü','Ekonomi','Teknoloji','Diplomasi'],win:'ZAFER',lose:'YENİLGİ',gain:'Ele geçirilen bölge',lost:'Kaybedilen bölge',A:'Saldıran',D:'Savunan',dd:'Zar farkı',mul:'Çarpan',cl:'Kapat',menu:'Menü',wn:'Kazanan',tm:'Süre',ws:'Kazanılan savaş',ls:'Kaybedilen savaş',cq:'Fethedilen ülke',scr:'Keşif sonucu',allk:'Tüm istatistikler biliniyor',bad:'Kayıt bozuk veya okunamadı.',taken:'Bu ülke alınmış.',nol:'Saldırılabilir ülke yok',pn:'tur'},
en:{turn:'Turn',rolling:'Rolling turn die…',r1:'Rolled 1: first upgrade one stat by 10%, then fight exactly one battle. No scouting.',rn:'battles required. Losing one ends your turn.',go:'Start',set:'Settings',vol:'Master volume',mus:'Music volume',sfx:'Effects volume',musOn:'Music on',sfxOn:'Sound effects on',rm:'Reduce motion',big:'Large text',spd:'Battle animation',nor:'Normal',fast:'Fast',skipb:'Skip',why_land:'Land border: attackable',why_sea:'Within sea range: attackable',why_no:'Not attackable: no land link or sea range',ru1:'Attacker won at least 3 comparisons',ru2:'Defender won at least 3 comparisons',ru3:'Nobody reached 3 comparisons: defender wins',hi:'Higher die',eqd:'Equal dice: no multiplier',weak:'Weak',mid:'Medium',str:'Strong',rep:'War reparations (Economy)',pick:'Choose your start country',rnd:'Random',ok:'Select',cont:'Continue',nw:'New Game',m1:'Single Player',m2:'Two Players (same device)',lg:'Türkçe',del:'The existing save will be deleted. Continue?',yes:'Yes',no:'Cancel',pl:'Player',roll:'Turn roll',left:'Battles left',atk:'Attack',sc:'Scout',st:'Start Battle',skip:'Skip turn',upg:'Rolled 1! Choose a stat to upgrade (+10%)',S:['Population','Army','Economy','Technology','Diplomacy'],win:'VICTORY',lose:'DEFEAT',gain:'Territory captured',lost:'Territory lost',A:'Attacker',D:'Defender',dd:'Dice diff',mul:'Multiplier',cl:'Close',menu:'Menu',wn:'Winner',tm:'Time',ws:'Battles won',ls:'Battles lost',cq:'Countries conquered',scr:'Scouting result',allk:'All stats already known',bad:'Save is corrupted or unreadable.',taken:'Country already taken.',nol:'No attackable countries',pn:'turn'}};
var L='tr';try{L=localStorage.getItem('wc_l')||'tr'}catch(e){}
function t(k){return T[L][k]||k}
function H(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296}
function d6(){return 1+Math.floor(Math.random()*6)}
/* V59: SAVAŞ zarı — 6 gelirse tekrar atılır (toplam sayılır, en çok 4 zar); tur zarında geçerli DEĞİL */
/* V66: savaş zarı — 6 gelirse yeni zar eklenir (en çok 2 kez 6 → en çok 3 zar). Toplam hesapta; zarlar r.da / r.dd dizisinde ekran için saklanır */
var DQ=[];function d6c(){var a=[],x;do{x=d6();a.push(x)}while(x===6&&a.length<3);return a}
function d6b(){var a=d6c();DQ.push(a);if(DQ.length>8)DQ.shift();return a.reduce(function(p,q){return p+q},0)}
var R=[],M={},BASE={},TG={},G=null,svg,g,lab,proj,path,pel,zm,Kc=1;
var DT={};('USA,335,27360,916;CHN,1410,17790,296;IND,1430,3550,84;RUS,144,2020,109;JPN,124,4210,50;DEU,84,4460,67;GBR,68,3340,75;FRA,68,3030,61;ITA,59,2250,36;BRA,216,2170,22;CAN,40,2140,27;KOR,52,1710,47;AUS,26,1720,32;ESP,48,1580,26;MEX,128,1790,11;IDN,277,1370,9;TUR,85,1110,16;SAU,36,1070,76;NLD,18,1120,16;CHE,9,885,6;POL,37,810,32;SWE,10,585,8;BEL,12,628,8;ARG,46,640,4;NOR,5.5,485,9;ISR,9.8,510,27;UKR,37,180,65;IRN,89,400,10;EGY,112,400,5;ZAF,60,380,3;NGA,224,363,3;PAK,240,340,8;THA,72,515,6;SGP,6,501,12;ARE,9.5,510,22;VNM,99,430,6;PHL,117,437,4;MYS,34,400,4;BGD,173,437,4;COL,52,365,12;CHL,20,335,6;FIN,5.6,300,6;DNK,6,405,8;AUT,9,516,4;IRL,5,545,1;PRT,10,287,6;GRC,10.4,238,7;CZE,10.8,330,5;ROU,19,350,6;HUN,9.6,212,4;NZL,5.2,252,3;PER,34,267,3;KAZ,20,262,2;DZA,45,240,9;IRQ,45,250,8;QAT,2.7,213,7;KWT,4.3,164,8;MAR,37,144,5;ETH,126,156,1;KEN,55,108,1;TWN,23.4,756,17;BLR,9.2,72,2').split(';').forEach(function(s){var a=s.split(',');DT[a[0]]=[+a[1],+a[2],+a[3]]});
var P5={USA:1,CHN:1,RUS:1,GBR:1,FRA:1};
function sc(x,m,e){return Math.min(100,100*Math.pow(x/m,e))}
var NUKE24={USA:1,RUS:1,CHN:1,GBR:1,FRA:1,IND:1,PAK:1,PRK:1,ISR:1},
 TECH24={USA:1.25,CHN:1.15,JPN:1.2,KOR:1.2,DEU:1.15,GBR:1.12,FRA:1.12,ISR:1.3,TWN:1.25,NLD:1.15,CHE:1.15,SWE:1.15,SGP:1.2,CAN:1.08,FIN:1.1,DNK:1.1,NOR:1.05,AUS:1.05,RUS:1.05,IND:1.1,ARE:1.05},
 SOFT24={USA:12,CHN:10,FRA:10,GBR:10,DEU:9,JPN:8,IND:6,ITA:5,CAN:5,TUR:5,ESP:4,BRA:4,KOR:4,AUS:4,CHE:4,SAU:4,NLD:3,SWE:3,NOR:3,ARE:3,QAT:3,EGY:3,ZAF:3,IDN:3,MEX:2,ARG:2};
// V24: daha gerçekçi değerleme (nükleer caydırıcılık + insan gücü, teknoloji liderleri, yumuşak güç); Türkiye bir kademe güçlü
function genStats(id){var d=DT[id]||[8,30,.5],p=d[0],g=d[1],m=d[2],ge=sc(g,27360,.4),pp=sc(p,1425,.35),ar=sc(m,916,.4),tc=.55*100*Math.pow(Math.min(80,g/p)/80,.6)+.45*ge,dp=Math.min(100,.5*ge+.3*pp+(P5[id]?20:0));
 ar=ar*(NUKE24[id]?1.1:1)*(.92+.16*pp/100);tc=tc*(TECH24[id]||1);dp=dp+(SOFT24[id]||0);
 var v=[pp,ar,ge,tc,dp];if(id=='TUR'){v=[pp*1.1,ar*1.15,ge*1.12,tc*1.15,dp*1.15]}
 if(id=='ISR'){v=v.map(function(x){return x*.85})}   /* V83: İsrail %15 daha zayıf */
 return v.map(function(x){return Math.round(Math.min(100,x)*10)/10})}
/* V89: ülkeler arası fark daraltıldı — 50 üstü değerler sıkıştırılır (ABD/Çin/Rusya/Hindistan zirvesi ~%72-80), sonra üs .8 ile zayıflar yukarı çekilir. Ayar: SQ_KNEE, SQ_TOP, SQ_POW. */
var SQ_KNEE=50,SQ_TOP=.45,SQ_POW=.8;
(function(){var _g=genStats;genStats=function(id){return _g(id).map(function(x){x=Math.min(100,x);if(x>SQ_KNEE)x=SQ_KNEE+(x-SQ_KNEE)*SQ_TOP;return Math.round(100*Math.pow(x/100,SQ_POW)*10)/10})}})();
var LLK=('AFG,AND,ARM,AUT,AZE,BLR,BTN,BOL,BWA,BDI,CAF,TCD,CZE,SWZ,ETH,HUN,KAZ,KGZ,LAO,LSO,LIE,LUX,MKD,MWI,MLI,MDA,MNG,NPL,NER,PRY,RWA,SRB,SVK,SSD,TJK,TKM,UGA,UZB,ZMB,ZWE,XKX,SMR,VAT').split(','),SEA=.5;
function geoInit(){R.forEach(function(r){var g=r.f.geometry,ps=g.type=='Polygon'?[g.coordinates]:g.coordinates,a=[];ps.forEach(function(p){var q=p[0],k=Math.max(1,Math.ceil(q.length/40));for(var i=0;i<q.length;i+=k){var la=q[i][1]*Math.PI/180,lo=q[i][0]*Math.PI/180;a.push(Math.cos(la)*Math.cos(lo),Math.cos(la)*Math.sin(lo),Math.sin(la))}});r.xyz=a})}
function gap(A,B){var m=-1;for(var i=0;i<A.length;i+=3)for(var j=0;j<B.length;j+=3){var d=A[i]*B[j]+A[i+1]*B[j+1]+A[i+2]*B[j+2];if(d>m)m=d}return Math.acos(Math.min(1,m))}
function seaRow(r){if(r.row)return r.row;var o={};R.forEach(function(x){if(x!==r)o[x.id]=gap(r.xyz,x.xyz)});return r.row=o}
function targets(p,ow){var s={};R.forEach(function(a){if(ow[a.id]!==p)return;a.nb.forEach(function(n){if(ow[n]!==p)s[n]='land'});if(LLK.indexOf(a.id)<0){var row=seaRow(a);R.forEach(function(r){if(ow[r.id]!==p&&!s[r.id]&&LLK.indexOf(r.id)<0&&row[r.id]<SEA)s[r.id]='sea'})}});return s}
var SET={vol:.8,mus:.5,sfx:.9,musOn:1,sfxOn:1,rm:0,spd:1,big:0};try{Object.assign(SET,JSON.parse(localStorage.getItem('wc_set')||'{}'))}catch(e){}
function setSave(){try{localStorage.setItem('wc_set',JSON.stringify(SET))}catch(e){}document.body.classList.toggle('rm',!!SET.rm);document.body.classList.toggle('lgf',!!SET.big);AU.vol()}
var AU=(function(){var c,mg,mu,sf;function init(){if(c){if(c.state=='suspended')c.resume();return}try{c=new(window.AudioContext||window.webkitAudioContext)();mg=c.createGain();mg.connect(c.destination);mu=c.createGain();mu.connect(mg);sf=c.createGain();sf.connect(mg);vol();music()}catch(e){c=null}}
function vol(){if(!c)return;mg.gain.value=SET.vol;mu.gain.value=SET.musOn?SET.mus*.35:0;sf.gain.value=SET.sfxOn?SET.sfx:0}
function tone(f,t0,d,ty,g,dst){var o=c.createOscillator(),e=c.createGain();o.type=ty||'sine';o.frequency.value=f;e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(g,t0+.02);e.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(e);e.connect(dst||sf);o.start(t0);o.stop(t0+d+.05)}
function noise(t0,d,g){var n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(var i=0;i<n;i++)a[i]=Math.random()*2-1;var s=c.createBufferSource(),e=c.createGain(),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;s.buffer=b;e.gain.setValueAtTime(g,t0);e.gain.exponentialRampToValueAtTime(.0001,t0+d);s.connect(f);f.connect(e);e.connect(sf);s.start(t0)}
function play(k){if(!c||!SET.sfxOn)return;var t0=c.currentTime,i;try{if(k=='click')tone(660,t0,.08,'triangle',.3);else if(k=='tick')tone(880,t0,.06,'sine',.25);else if(k=='dice'){for(i=0;i<7;i++)noise(t0+i*.07,.05,.5)}else if(k=='win'){[523,659,784,1047].forEach(function(f,i){tone(f,t0+i*.12,.35,'triangle',.4)})}else if(k=='lose'){[392,330,262,196].forEach(function(f,i){tone(f,t0+i*.18,.4,'sawtooth',.25)})}else if(k=='conq'){[262,330,392].forEach(function(f){tone(f,t0,.8,'square',.12)});tone(523,t0+.15,.8,'triangle',.3)}}catch(e){}}
function music(){var sc=[220,261.6,293.7,349.2,392,440],i=0;setInterval(function(){if(!c||!SET.musOn||document.hidden)return;var t0=c.currentTime,f=sc[Math.floor(Math.random()*sc.length)];tone(f/2,t0,3.2,'sine',.5,mu);if(i++%2==0)tone(f,t0+.4,2.4,'triangle',.18,mu)},1800)}
return{init:init,vol:vol,play:play}})();
var FL={};('AFG:AF;AGO:AO;ALB:AL;ARE:AE;ARG:AR;ARM:AM;AUS:AU;AUT:AT;AZE:AZ;BDI:BI;BEL:BE;BEN:BJ;BFA:BF;BGD:BD;BGR:BG;BHS:BS;BIH:BA;BLR:BY;BLZ:BZ;BOL:BO;BRA:BR;BRN:BN;BTN:BT;BWA:BW;CAF:CF;CAN:CA;CHE:CH;CHL:CL;CHN:CN;CIV:CI;CMR:CM;COD:CD;COG:CG;COL:CO;CRI:CR;CUB:CU;CYP:CY;CZE:CZ;DEU:DE;DJI:DJ;DNK:DK;DOM:DO;DZA:DZ;ECU:EC;EGY:EG;ERI:ER;ESP:ES;EST:EE;ETH:ET;FIN:FI;FJI:FJ;FRA:FR;GAB:GA;GBR:GB;GEO:GE;GHA:GH;GIN:GN;GMB:GM;GNB:GW;GNQ:GQ;GRC:GR;GRL:GL;GTM:GT;GUY:GY;HND:HN;HRV:HR;HTI:HT;HUN:HU;IDN:ID;IND:IN;IRL:IE;IRN:IR;IRQ:IQ;ISL:IS;ISR:IL;ITA:IT;JAM:JM;JOR:JO;JPN:JP;KAZ:KZ;KEN:KE;KGZ:KG;KHM:KH;KOR:KR;KWT:KW;LAO:LA;LBN:LB;LBR:LR;LBY:LY;LKA:LK;LSO:LS;LTU:LT;LUX:LU;LVA:LV;MAR:MA;MDA:MD;MDG:MG;MEX:MX;MKD:MK;MLI:ML;MMR:MM;MNE:ME;MNG:MN;MOZ:MZ;MRT:MR;MWI:MW;MYS:MY;NAM:NA;NER:NE;NGA:NG;NIC:NI;NLD:NL;NOR:NO;NPL:NP;NZL:NZ;OMN:OM;PAK:PK;PAN:PA;PER:PE;PHL:PH;PNG:PG;POL:PL;PRK:KP;PRT:PT;PRY:PY;QAT:QA;ROU:RO;RUS:RU;RWA:RW;SAU:SA;SDN:SD;SEN:SN;SLB:SB;SLE:SL;SLV:SV;SOM:SO;SRB:RS;SSD:SS;SUR:SR;SVK:SK;SVN:SI;SWE:SE;SWZ:SZ;SYR:SY;TCD:TD;TGO:TG;THA:TH;TJK:TJ;TKM:TM;TLS:TL;TTO:TT;TUN:TN;TUR:TR;TWN:TW;TZA:TZ;UGA:UG;UKR:UA;URY:UY;USA:US;UZB:UZ;VEN:VE;VNM:VN;VUT:VU;YEM:YE;ZAF:ZA;ZMB:ZM;ZWE:ZW;PSE:PS;XKX:XK;BHR:BH;MLT:MT;SGP:SG;MUS:MU;COM:KM;CPV:CV;SYC:SC;BRB:BB;TON:TO;WSM:WS;KIR:KI;AND:AD;LIE:LI;MCO:MC;SMR:SM;MDV:MV;ATG:AG;DMA:DM;GRD:GD;LCA:LC;VCT:VC;KNA:KN;ESH:EH;NCL:NC').split(';').forEach(function(x){var a=x.split(':');FL[a[0]]=a[1]});
function flag(id){var c=FL[id];return c?String.fromCodePoint(c.charCodeAt(0)+127397,c.charCodeAt(1)+127397):'🏳'}
function settings(){var s=SET;function sl(k){return'<div class="set"><span>'+t(k)+'</span><input type="range" min="0" max="1" step=".05" value="'+s[k]+'" oninput="SET.'+k+'=+this.value;setSave()"></div>'}
 function tg(k){return'<div class="set"><span>'+t(k)+'</span><input type="checkbox" '+(s[k]?'checked':'')+' onchange="SET.'+k+'=this.checked?1:0;setSave()"></div>'}
 modal('<h2>⚙ '+t('set')+'</h2>'+sl('vol')+sl('mus')+sl('sfx')+tg('musOn')+tg('sfxOn')+tg('rm')+tg('big')+'<div class="set"><span>'+t('spd')+'</span><select onchange="SET.spd=+this.value;setSave()"><option value="1" '+(s.spd==1?'selected':'')+'>'+t('nor')+'</option><option value="2" '+(s.spd==2?'selected':'')+'>'+t('fast')+'</option><option value="0" '+(s.spd==0?'selected':'')+'>'+t('skipb')+'</option></select></div><button class="big" onclick="setLang();settings()">'+t('lg')+'</button><button class="big pri" onclick="closeSet()">'+t('cl')+'</button>')}
function closeSet(){closeMod();if(G)render();else menu()}
// ---- SAF OYUN MANTIĞI (UI'dan bağımsız) ----
var PREV_WIN=1.35; // V84: önceki zafer bonusu (eski 1.5; zincirleme fetihi azaltmak için düşürüldü)
var DIE_STEP=.15; // zar farkı başına çarpan etkisi (V45: %10 → %15)
function battle(A,D,ra,rd,bA,bD){var d=Math.abs(ra-rd),m=1+d*DIE_STEP,mA=ra>rd?m:1,mD=rd>ra?m:1,a=[],b=[],rows=[],aw=0,dw=0;
 for(var i=0;i<5;i++){a[i]=A[i]*(bA?PREV_WIN:1)*mA;b[i]=D[i]*(bD?PREV_WIN:1)*mD;var w=a[i]>b[i]?'a':a[i]<b[i]?'d':'-';if(w=='a')aw++;if(w=='d')dw++;rows.push({a:a[i],d:b[i],w:w})}
 return{ra:ra,rd:rd,diff:d,mult:m,rows:rows,aw:aw,dw:dw,win:aw>=3,bA:!!bA,bD:!!bD,mA:mA,mD:mD,A:A,D:D}}
(function(){var _b=battle;battle=function(A,D,ra,rd){var r=_b.apply(this,arguments),n=DQ.length,a=DQ[n-2],d=DQ[n-1];function ok(x,v){return x&&x.reduce(function(p,q){return p+q},0)===v}
 r.da=ok(a,ra)?a.slice():[ra];r.dd=ok(d,rd)?d.slice():[rd];DQ.length=0;return r}})();
function st(e){return typeof e=='number'?G.P[e].s:BASE[e].map(function(v,i){return i==2?v+((G.ed||{})[e]||0):v})}
function repar(w,l,m){var k=Math.min(1.5,Math.max(.5,l/Math.max(w,1))),a=l*(.05+.02*m)*k;return Math.round(Math.min(a,Math.max(0,l-1))*100)/100}
function addEco(e,d){if(typeof e=='number')G.P[e].s[2]+=d;else{G.ed=G.ed||{};G.ed[e]=(G.ed[e]||0)+d}}
function v1(v){return Math.round(v*10)/10}
function mk(v,tv,p,e,i){if(e===p||know(p,e,i))return'';var c=tv<35?0:tv<65?1:2,lo=[0,35,65][c],hi=[35,65,1e9][c];return v<lo?'🔴':v>=hi?'🟢':'🟡'}
function cls(v){return v<35?t('weak'):v<65?t('mid'):t('str')}
function nm(e){return typeof e=='number'?G.P[e].name+(G.P[e].start?' ('+M[G.P[e].start].name+')':''):M[e].name}
function owned(p){return R.filter(function(r){return G.owner[r.id]===p})}
function nearest(p,tid){var b=null,bd=9;owned(p).forEach(function(r){var d=d3.geo.distance(r.c,M[tid].c);if(d<bd){bd=d;b=r.id}});return b}
function know(p,e,i){return G.kn[p][e]&&G.kn[p][e][i]}
window.WC={battle:battle,repar:repar,genStats:genStats,targets:targets};
// ---- KAYIT ----
function save(){try{var n=Date.now();G.el+=n-G.ts;G.ts=n;localStorage.setItem(SV,JSON.stringify(G))}catch(e){}}
function hasSave(){try{return!!localStorage.getItem(SV)}catch(e){return false}}
function cont(){try{G=JSON.parse(localStorage.getItem(SV));if(!G||!G.owner||!G.P||G.v!=3)throw 0;G.ts=Date.now();G.busy=0;G.sel=null;
  // Eski tek oyunculu kayıtlar: tur zarı / zorunlu geliştirme aşamaları artık yok
  if(G.P.length==1){G.up=G.up||0;if(G.ph=='upg')G.up++;if(G.ph=='roll'||G.ph=='upg')G.ph='act';G.left=0;G.noscout=0}
  closeMod();render();home(0)}catch(e){G=null;toast(t('bad'));menu()}}

// ---- Yeni çeviriler ----
Object.assign(T.tr,{own:'Senin',neu:'Tarafsız',foe:'Rakip',det:'Detay',army:'Ordu',atkable:'Saldırılabilir',landb:'kara',seab:'deniz',noatk:'Saldırılamaz',world:'Dünya görünümü',zin:'Yakınlaştır',zout:'Uzaklaştır',
 terr:'Ülke',upgp:'Geliştir',upgNote:'Her 5 fetihte 1 geliştirme puanı kazanırsın.',upgGot:'+1 geliştirme puanı kazandın!',tgtHint:'Kırmızı çerçeveli ülkelere saldırabilirsin',winner:'KAZANAN',loser:'KAYBEDEN',pts:'Puan',cont2:'Devam',
 nopts:'Seçili ülkeye şu an saldırılamaz',m1d:'Sınırsız saldırı, serbest keşif',m2d:'Tur zarı ve sıra sistemi',closeb:'Kapat',roll2:'Zarı at',stats:'İstatistikler',yours:'Ülkenin toplam gücü',unknownS:'Keşfedilmedi',scouted:'keşfedildi',upgfor:'Geliştirme puanı',cancel:'Vazgeç',noMoves:'Saldırılabilir ülke kalmadı'});
Object.assign(T.en,{own:'Yours',neu:'Neutral',foe:'Rival',det:'Details',army:'Army',atkable:'Attackable',landb:'land',seab:'sea',noatk:'Cannot attack',world:'World view',zin:'Zoom in',zout:'Zoom out',
 terr:'Countries',upgp:'Upgrade',upgNote:'You earn 1 upgrade point every 5 conquests.',upgGot:'+1 upgrade point earned!',tgtHint:'You can attack countries outlined in red',winner:'WINNER',loser:'LOSER',pts:'Points',cont2:'Continue',
 nopts:'The selected country cannot be attacked right now',m1d:'Unlimited attacks, free scouting',m2d:'Turn die and turn order',closeb:'Close',roll2:'Roll',stats:'Stats',yours:'Your total strength',unknownS:'Not scouted',scouted:'scouted',upgfor:'Upgrade points',cancel:'Cancel',noMoves:'No attackable countries left'});

Object.assign(T.tr,{pre:'SAVAŞ ÖNCESİ ZAR',bz:'Önceki zafer bonusu',tp:'Toplam güç',startB:'Savaşı Başlat',dieL:'Zar',base:'Temel',fin2:'Nihai',none:'yok',hiD:'Yüksek zar çarpanı'});
Object.assign(T.en,{pre:'PRE-BATTLE DICE',bz:'Previous-win bonus',tp:'Total power',startB:'Start Battle',dieL:'Die',base:'Base',fin2:'Final',none:'none',hiD:'Higher-die multiplier'});
FL.ATF='TF';FL.FLK='FK';FL.GUF='GF';FL.PRI='PR';

// ---- Sabitler / durum ----
var UPG_EVERY=5,KMIN=3,KMAX=70,LAT_N=84,LAT_S=-57;
var W=0,H_=0,S=1,WB={x0:0,y0:0,x1:1,y1:1},CAM={x:0,y:0,k:1},gc,ov,mkg,bgr,OV={},BT=null,BSH=false,FLASH=null,grat;
function solo(){return !!G&&G.P.length==1}
function ownerOf(id){return OV[id]!==undefined?OV[id]:G.owner[id]}

// ---- Renkler ----
var NP=[[38,34,52],[14,34,46],[345,26,52],[290,16,50],[215,24,50],[178,28,40],[128,20,42],[68,26,42]],NC={},LAND,coast;
function colorGraph(){R.slice().sort(function(a,b){return b.nb.length-a.nb.length}).forEach(function(r){var u={};r.nb.forEach(function(n){if(NC[n]!=null)u[NC[n]]=1});var k=0;while(u[k])k++;NC[r.id]=k%NP.length})}
function col(e){if(typeof e=='number')return PC[e];var p=NP[NC[e]||0],l=p[2]+(H(e)-.5)*5;return'hsl('+p[0]+','+p[1]+'%,'+l.toFixed(1)+'%)'}

// ---- Simgeler / bayrak / zar ----
function svgi(p){return'<svg class="ic" viewBox="0 0 24 24">'+p+'</svg>'}
var IC={world:svgi('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3.5 3.5 14.500 0 18M12 3c-3.5 3.5-3.5 14.500 0 18"/>'),
 set:svgi('<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>'),
 menu:svgi('<path d="M4 6h16M4 12h16M4 18h16"/>'),plus:svgi('<path d="M12 5v14M5 12h14"/>'),minus:svgi('<path d="M5 12h14"/>'),x:svgi('<path d="M6 6l12 12M18 6L6 18"/>')};
function fimg(id,c){var code=FL[id];c=c||'';return code?'<img class="fi '+c+'" src="'+(window.FLAGSVG&&FLAGSVG[code]||'flags/'+code+'.svg')+'" alt="" draggable="false">':'<span class="fi ph '+c+'">'+(id||'?')+'</span>'}
var PIP={1:[[5,5]],2:[[2.6,2.6],[7.4,7.4]],3:[[2.6,2.6],[5,5],[7.4,7.4]],4:[[2.6,2.6],[7.4,2.6],[2.6,7.4],[7.4,7.4]],5:[[2.6,2.6],[7.4,2.6],[5,5],[2.6,7.4],[7.4,7.4]],6:[[2.6,2.6],[7.4,2.6],[2.6,5],[7.4,5],[2.6,7.4],[7.4,7.4]]};
function pips(n){return PIP[n].map(function(q){return'<circle class="p" cx="'+q[0]+'" cy="'+q[1]+'" r="1.05"/>'}).join('')}
function dieSvg(n,id,c){return'<svg class="die '+(c||'')+'" id="'+id+'" viewBox="0 0 10 10">'+pips(n)+'</svg>'}
function setDie(id,n,c){var e=$(id);if(!e)return;e.innerHTML=pips(n);if(c!=null)e.setAttribute('class','die '+c)}
function rnd6(){return 1+Math.floor(Math.random()*6)}

// ---- AKIŞ ----
function newGame(m){G={mode:m,P:[],owner:{},cur:0,roll:0,left:0,ph:'pick',pi:0,noscout:0,rv:{},ed:{},v:3,kn:[],st:[],el:0,ts:Date.now(),sel:null,up:0};
 for(var i=0;i<m;i++){G.P.push({s:[0,0,0,0,0],name:t('pl')+' '+(i+1)});G.kn.push({});G.st.push({w:0,l:0,c:0})}
 R.forEach(function(r){G.owner[r.id]=r.id});OV={};BT=null;BSH=false;try{document.body.classList.remove('bsh')}catch(e){}$('bs').style.display='none';closeMod();render();home(0)}
function pickOk(){var id=G.sel;if(!id)return;if(G.owner[id]!==id)return toast(t('taken'));var i=G.pi;G.owner[id]=i;G.P[i].s=BASE[id].slice();G.P[i].start=id;G.pi++;G.sel=null;
 if(G.pi>=G.P.length){G.cur=0;if(solo()){G.ph='act';G.turn=0;G.up=0;G.left=0}else startTurn()}save();render();home()}
function pickRnd(){var f=R.filter(function(r){return G.owner[r.id]===r.id});G.sel=f[Math.floor(Math.random()*f.length)].id;render();focusSel()}
function startTurn(){G.turn=(G.turn||0)+1;G.roll=d6();G.sel=null;G.ph='roll';G.left=0;G.noscout=0}
function rollOk(){if(G.ph!='roll')return;if(G.roll==1){G.ph='upg';G.left=1;G.noscout=1}else{G.ph='act';G.left=G.roll;G.noscout=0}closeMod();save();render()}
function showRoll(){var done=0,iv,to,r=G.roll;
 modal('<h3>'+t('turn')+' '+G.turn+' — '+G.P[G.cur].name+'</h3><div id="rz" style="text-align:center;cursor:pointer;padding:6px">'+dieSvg(rnd6(),'rd','rolling').replace('class="die rolling"','class="die rolling" style="width:72px;height:72px;display:inline-block"')+'</div><div id="rr" style="text-align:center;min-height:100px;color:var(--tx2)">'+t('rolling')+'</div>');
 $('rz').onclick=fin;AU.play('dice');if(SET.rm||!SET.spd)fin();iv=setInterval(function(){setDie('rd',rnd6())},80);to=setTimeout(fin,1300);
 function fin(){if(done)return;done=1;clearInterval(iv);clearTimeout(to);setDie('rd',r,'');$('rr').innerHTML='<div class="big2">'+r+'</div>'+(r==1?t('r1'):r+' '+t('rn'))+'<button class="big pri" onclick="rollOk()">'+t('go')+'</button>'}}
// Tek oyunculuda tur kavramı yok; yalnızca iki oyunculu modda sıra değişir.
function endTurn(){if(solo())return;if(G.P.length==2)G.cur=1-G.cur;startTurn()}
function upgrade(i){G.P[G.cur].s[i]*=1.1;if(solo()){G.up=Math.max(0,(G.up||0)-1)}else G.ph='act';closeMod();save();render()}
function check(){var c=[0,0];for(var k in G.owner)if(typeof G.owner[k]=='number')c[G.owner[k]]++;
 if(G.P.length==1){if(c[0]==0)G.over={w:-1};else if(c[0]==R.length)G.over={w:0}}else for(var i=0;i<2;i++)if(c[i]==0)G.over={w:1-i};
 if(G.over){G.ph='over';try{localStorage.removeItem(SV)}catch(e){}}}
function scout(){var p=G.cur,e=G.owner[G.sel],u=[];if(!TG[G.sel])return toast(t('nopts'));for(var i=0;i<5;i++)if(!know(p,e,i))u.push(i);if(!u.length)return toast(t('allk'));
 var i=u[Math.floor(Math.random()*u.length)];G.kn[p][e]=G.kn[p][e]||[0,0,0,0,0];G.kn[p][e][i]=1;
 if(!solo()){G.left--;if(G.left<=0)endTurn()}   // tek oyunculuda keşif serbest
 save();render();toast(t('scr')+': '+nm(e)+' — '+t('S')[i]+' = '+v1(st(e)[i]))}
function nearestView(p,tid){var b=null,bd=9;R.forEach(function(r){if(ownerOf(r.id)!==p)return;var d=d3.geo.distance(r.c,M[tid].c);if(d<bd){bd=d;b=r.id}});return b}
function doAttack(){if(G.busy||G.ph!='act'||BSH)return;var tg=G.sel;if(!tg)return;var p=G.cur;TG=targets(p,G.owner);
 if(G.owner[tg]===p||!TG[tg])return toast(t('nopts'));   // komşu olmayan / geçersiz saldırı engellenir
 G.busy=1;var e=G.owner[tg];
 var r=battle(G.P[p].s,st(e),d6b(),d6b(),!!G.rv[p+'>'+e],!!G.rv[e+'>'+p]),mv=null,eA=G.P[p].s[2],eD=st(e)[2],mg=Math.abs(r.aw-r.dw),amt=repar(r.win?eA:eD,r.win?eD:eA,mg);r.rep={w:r.win?p:e,l:r.win?e:p,amt:amt};
 // savaş animasyonu bitene kadar haritada eski sahiplik gösterilir
 var pre=R.filter(function(x){return G.owner[x.id]===p}).map(function(x){return x.id});
 var attIds=battleSides(p,tg);
 addEco(r.rep.w,amt);addEco(r.rep.l,-amt);
 OV={};OV[tg]=e;
 if(r.win){G.owner[tg]=p;G.st[p].w++;G.st[p].c++;G.rv[p+'>'+e]=1;delete G.rv[e+'>'+p];if(!solo())G.left--;
   if(solo()&&G.st[p].c%UPG_EVERY==0){G.up=(G.up||0)+1;r.upg=1}}
 else{G.st[p].l++;mv=nearest(p,tg);G.owner[mv]=e;OV[mv]=p;G.rv[e+'>'+p]=1;delete G.rv[p+'>'+e];if(!solo())G.left=0}
 G.kn[p][e]=[1,1,1,1,1];if(typeof e=='number')G.kn[e][p]=[1,1,1,1,1];
 check();if(!solo()&&!G.over&&G.left<=0)endTurn();save();G.busy=0;showBattle(r,p,e,tg,mv,attIds)}

// ---- Toast / modal ----
function toast(m){var x=$('toast');x.textContent=m;x.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(function(){x.style.display='none'},2600)}
function modal(h){$('box').onclick=null;$('box').innerHTML=h;$('mod').style.display='flex'}function closeMod(){$('mod').style.display='none'}
function setLang(){L=L=='tr'?'en':'tr';try{localStorage.setItem('wc_l',L)}catch(e){}if(G)G.P.forEach(function(p,i){p.name=t('pl')+' '+(i+1)});if(G&&!BSH)render();if($('mod').style.display=='flex'&&!G)menu()}
function menu(){modal('<h2>🌍 World Conquest</h2><button class="big pri" '+(hasSave()?'':'disabled')+' onclick="cont()">'+t('cont')+'</button><button class="big" onclick="askNew()">'+t('nw')+'</button><button class="big" onclick="settings()">⚙ '+t('set')+'</button><button class="big ghost" onclick="setLang()">🌐 '+t('lg')+'</button>'+(G?'<button class="big ghost" onclick="closeMod()">'+t('cl')+'</button>':''))}
function closeSet(){closeMod();if(G&&!BSH)render();else if(!G)menu()}
function askNew(){hasSave()?modal('<p>'+t('del')+'</p><button class="big pri" onclick="modes()">'+t('yes')+'</button><button class="big" onclick="menu()">'+t('no')+'</button>'):modes()}
function modes(){modal('<button class="big" onclick="newGame(1)">'+t('m1')+'<br><small style="color:var(--tx2)">'+t('m1d')+'</small></button>')}
/* V98: bilinmeyen değerler OYUNCUNUN ülkesine göre derecelendirilir (5 kademe): ABD seçince çoğu ülke zayıf/çok zayıf, Libya seçince güçlü/çok güçlü görünür.
   Ölçüt: rakip değer / oyuncunun 5 değerinin ortalaması. Eşikler: <.5 çok zayıf, <.85 zayıf, <1.2 orta, <1.8 güçlü, üstü çok güçlü. */
function relTier(p,v){var a=st(p),m=0,k;for(k=0;k<a.length;k++)m+=a[k];m=Math.max(1,m/a.length);var r=v/m;return r<.5?0:r<.85?1:r<1.2?2:r<1.8?3:4}
function relTxt(p,v){var q=relTier(p,v),tr=(typeof L=='undefined'||L=='tr');return [tr?'Çok zayıf':'Very weak',t('weak'),t('mid'),t('str'),tr?'Çok güçlü':'Very strong'][q]}
function rangeTxt(p,e,i){var v=st(e)[i];if(G.ph=='pick'||e===p||know(p,e,i))return''+v1(v);try{return relTxt(p,v)}catch(x){return cls(v)}}
function ownerInfo(o,p){if(o===p)return{c:'me',txt:G.P.length>1?G.P[p].name:t('own'),bg:PC[p]};if(typeof o=='number')return{c:'foe',txt:G.P[o].name,bg:PC[o]};return{c:'neu',txt:t('neu')}}
function badge(o,p){var i=ownerInfo(o,p);return'<span class="bdg '+i.c+'"'+(i.bg?' style="background:'+i.bg+'"':'')+'>'+i.txt+'</span>'}

// ---- Render ----
function render(){if(!G)return;TG=G.ph=='act'?targets(G.cur,G.owner):{};hud();paint();panel();hint();if(G.ph=='roll'&&!BSH)showRoll();else if(G.ph=='upg'&&!BSH)showUpg();if(G.over&&!BSH)showOver()}
function hud(){var h='',p=G.cur;
 if(G.ph=='pick')h='<span class="ttl">'+G.P[G.pi].name+': '+t('pick')+'</span><button onclick="pickRnd()">🎲 <span class="lab">'+t('rnd')+'</span></button>';
 else if(G.ph!='over'){
  if(solo()){h='<span class="chip pl" style="background:'+PC[0]+'">🏳 <b style="color:#fff">'+owned(0).length+'</b><span class="lab">/'+R.length+' '+t('terr')+'</span></span><span class="chip">⚔ <b>'+G.st[0].c+'</b><span class="lab"> '+t('cq')+'</span></span>';
   if(G.up>0)h+='<button class="hb up" onclick="showUpg()">⬆ '+t('upgp')+' ('+G.up+')</button>'}
  else{h='<span class="chip pl" style="background:'+PC[p]+'">'+G.P[p].name+'</span><span class="chip"><span class="lab">'+t('turn')+' </span><b>'+G.turn+'</b></span><span class="chip">🎲 <b>'+G.roll+'</b></span><span class="chip">⚔ <b>'+G.left+'</b></span>';
   if(G.ph=='act'&&!Object.keys(TG).length)h+='<button onclick="endTurn();render()">'+t('skip')+'</button>'}}
 $('hud').innerHTML=h+'<span class="sp"></span><button class="hb" title="'+t('world')+'" onclick="worldView()">'+IC.world+'</button><button class="hb" onclick="settings()">'+IC.set+'</button><button class="hb" onclick="menu()">'+IC.menu+'</button>'}
function hint(){var el=$('hint');if(!G||G.ph!='act'||G.sel||BSH||G.over){el.style.display='none';return}el.textContent=Object.keys(TG).length?t('tgtHint'):t('noMoves');el.style.display='block'}
function paint(){try{var _m=document.getElementById('map');if(_m&&_m.classList.contains('v30on'))return}catch(e){}pel.each(function(r){var c=col(ownerOf(r.id));if(r._c!==c){r._c=c;this.style.fill=c}});overlay();labels()}
function overlay(){var L=[];if(G){if(BT){BT.a.forEach(function(id){L.push({id:id,c:'ba'})});L.push({id:BT.d,c:'bd'})}else{Object.keys(TG).forEach(function(id){L.push({id:id,c:'atks'});L.push({id:id,c:'atk'})});if(G.sel)L.push({id:G.sel,c:'sel'})}
  if(FLASH)L.push({id:FLASH,c:'cap'})}
 var s=ov.selectAll('path').data(L,function(o){return o.id+o.c});s.exit().remove();s.enter().append('path').attr('class',function(o){return'hl '+o.c}).attr('d',function(o){return ovd(o.id)})}

// ---- Kompakt ülke paneli ----
function panel(){var el=$('panel'),id=G.sel;if(!id||G.over||BSH){el.style.display='none';return}
 var o=G.owner[id],p=G.cur,tag='',h;
 if(G.ph=='act'&&o!==p)tag=TG[id]?'<span class="tag ok">⚔ '+t('atkable')+' · '+t(TG[id]=='land'?'landb':'seab')+'</span>':'<span class="tag no">'+t('noatk')+'</span>';
 h='<div class="pc">'+fimg(id)+'<div style="min-width:0"><div class="pn"><span class="nm">'+M[id].name+'</span>'+badge(o,p)+'</div><div class="pm"><span class="tag pw">🎖 '+t('army')+' <b>'+rangeTxt(p,o,1)+'</b></span>'+tag+'</div></div><button class="cls" onclick="deselect()">'+IC.x+'</button>'+
 '<div class="px"><button onclick="details()">'+t('det')+'</button>'+(G.ph=='pick'?'<button class="pri" onclick="pickOk()">'+t('ok')+'</button>':(G.ph=='act'&&TG[id]?'<button class="pri" onclick="doAttack()">⚔ '+t('atk')+'</button>':''))+'</div></div>';
 el.innerHTML=h;el.style.display='block'}
function deselect(){if(!G)return;G.sel=null;render()}
function details(){var id=G.sel;if(!id)return;var o=G.owner[id],p=G.cur,SI=['👥','🎖','💰','🔬','🕊'],h='<div class="dh">'+fimg(id,'lg')+'<div><h3 style="margin:0 0 6px">'+M[id].name+'</h3>'+badge(o,p)+'</div></div>';
 if(o===p)h+='<div style="color:var(--tx2)">'+t('yours')+'</div>';
 else if(G.ph=='act')h+='<div style="color:var(--tx2);margin-bottom:4px">'+(TG[id]?'✔ '+t(TG[id]=='land'?'why_land':'why_sea'):'✖ '+t('why_no'))+'</div>';
 for(var i=0;i<5;i++){var v=st(o)[i],kn=G.ph=='pick'||o===p||know(p,o,i),c=v<35?0:v<65?1:2,w=kn?Math.min(100,v):[17,50,83][c];
  h+='<div class="stat"><span style="font-size:18px">'+SI[i]+'</span><div><div>'+t('S')[i]+(kn?'':' <small>· '+t('unknownS')+'</small>')+'</div><div class="bar"><i style="width:'+w+'%;'+(kn?'':'opacity:.45')+'"></i></div></div><b>'+rangeTxt(p,o,i)+'</b></div>'}
 if(G.ph=='act'&&TG[id])h+='<button class="big pri" onclick="closeMod();doAttack()">⚔ '+t('atk')+'</button><button class="big" '+(G.noscout?'disabled':'')+' onclick="scout();details()">🔍 '+t('sc')+'</button>';
 if(solo()&&G.up>0)h+='<button class="big" onclick="showUpg()">⬆ '+t('upgfor')+': '+G.up+'</button>';
 modal(h+'<button class="big ghost" onclick="closeMod()">'+t('closeb')+'</button>')}
function showUpg(){var h='<h3>'+(solo()?t('upgfor')+': '+G.up:t('upg'))+'</h3>';for(var i=0;i<5;i++)h+='<button class="big" onclick="upgrade('+i+')">'+t('S')[i]+' ('+v1(G.P[G.cur].s[i])+' → '+v1(G.P[G.cur].s[i]*1.1)+')</button>';
 if(solo())h+='<p style="color:var(--tx2);margin:4px 0">'+t('upgNote')+'</p><button class="big ghost" onclick="closeMod()">'+t('cancel')+'</button>';modal(h)}

// ---- Savaş sayfası ----
function battleSides(p,tg){var a=M[tg].nb.filter(function(n){return G.owner[n]===p});if(a.length)return a;var bd=9,bi=null;R.forEach(function(r){if(G.owner[r.id]!==p)return;var d=seaRow(r)[tg];if(d!=null&&d<bd){bd=d;bi=r.id}});return bi?[bi]:[]}
// ---- 3D ZAR (CSS 3D, 6 gerçek yüz) ----
var PIPC={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]},
FT={1:'translateZ(var(--h))',6:'rotateY(180deg) translateZ(var(--h))',3:'rotateY(90deg) translateZ(var(--h))',4:'rotateY(-90deg) translateZ(var(--h))',2:'rotateX(90deg) translateZ(var(--h))',5:'rotateX(-90deg) translateZ(var(--h))'},
ORI={1:[0,0],6:[0,180],3:[0,-90],4:[0,90],2:[-90,0],5:[90,0]},NRM={1:[0,0,1],6:[0,0,-1],3:[1,0,0],4:[-1,0,0],2:[0,-1,0],5:[0,1,0]};
function die3d(id,cl){var f='';for(var v=1;v<=6;v++){var p='';for(var i=0;i<9;i++)p+='<i'+(PIPC[v].indexOf(i)>=0?' class="p"':'')+'></i>';f+='<div class="f" data-v="'+v+'" style="transform:'+FT[v]+'">'+p+'</div>'}
 return'<div class="d3w"><div class="d3 '+cl+'" id="'+id+'"><div class="sdw"></div><div class="bx"><div class="cb">'+f+'<div class="k k1"></div><div class="k k2"></div></div></div></div><div class="dn" id="'+id+'n"></div></div>'}
function oriT(v,n){var o=ORI[v];return'rotateX('+(o[0]+360*(n||0))+'deg) rotateY('+(o[1]+360*(n||0))+'deg) rotateZ('+(360*(n||0))+'deg)'}
function shade(e,v){try{var o=ORI[v],m=new DOMMatrix('rotateX(-20deg) rotateY(-26deg) rotateX('+o[0]+'deg) rotateY('+o[1]+'deg)');
 e.querySelectorAll('.f').forEach(function(f){var q=NRM[f.dataset.v],n=m.transformPoint(new DOMPoint(q[0],q[1],q[2],0)),d=-.4*n.x-.55*n.y+.73*n.z;f.style.setProperty('--sh',Math.max(0,(1-d)*.3).toFixed(2))})}catch(x){}}
function setDie3(id,v){var e=$(id);if(!e)return;var tot=v;v=((v-1)%6)+1;e.getAnimations().forEach(function(a){a.cancel()});var c=e.querySelector('.cb');c.style.transition='none';c.style.transform=oriT(v,0);shade(e,v);$(id+'n').textContent=tot>6?(tot+' ('+v+')'):v;$(id+'n').className='dn on'} function rollDie(id,v,ms,dir,cb){var tot=v;v=((v-1)%6)+1;var e=$(id),c=e.querySelector('.cb');c.style.transition='none';c.style.transform=oriT(1,0);void c.offsetWidth;
 c.style.transition='transform '+ms+'ms cubic-bezier(.12,.65,.25,1)';c.style.transform=oriT(v,2+Math.floor(Math.random()*2));
 var sx=dir*(34+Math.random()*16),E='cubic-bezier(.2,.7,.4,1)',I='cubic-bezier(.6,0,.9,.5)';
 e.animate([{transform:'translate('+sx+'px,0) scale(1)',easing:E},{transform:'translate('+sx*.45+'px,-34px) scale(1.2)',offset:.28,easing:I},{transform:'translate(0,0) scale(1)',offset:.52,easing:E},
  {transform:'translate(0,-15px) scale(1.07)',offset:.68,easing:I},{transform:'translate(0,0)',offset:.82,easing:E},{transform:'translate(0,-4px)',offset:.91,easing:I},{transform:'translate(0,0)'}],{duration:ms});
 setTimeout(function(){shade(e,v);$(id+'n').textContent=tot>6?(tot+' ('+v+')'):v;$(id+'n').className='dn on';if(cb)cb()},ms)}
function bonus(r,a){var z=a?r.bA:r.bD,m=a?r.mA:r.mD,B=a?r.A:r.D,die=a?r.ra:r.rd,s0=0,k=(z?PREV_WIN:1)*m;B.forEach(function(v){s0+=v});
 function ln(i,l,v,c){return'<div class="bl'+(c?' '+c:'')+'"><span>'+i+' '+l+'</span><b>'+v+'</b></div>'}
 return ln('🎲',t('dieL')+' '+die,m>1?'×'+m.toFixed(2):t('none'),m>1?'g':'')+ln('🔥',t('bz'),z?'×'+PREV_WIN.toFixed(2):t('none'),z?'g':'')+
  ln('🎖',t('army'),v1(B[1])+' → <em>'+v1(B[1]*k)+'</em>')+ln('Σ',t('tp'),v1(s0)+' → <em>'+v1(s0*k)+'</em>')}
function splash(w){if(SET.rm)return;var s=document.createElement('div');s.className='spl '+(w?'w':'l');s.textContent=w?t('win'):t('lose');
 if(w)for(var i=0;i<18;i++){var q=document.createElement('i');q.style.cssText='--x:'+(((Math.random()-.5)*320)|0)+'px;--y:'+((-30-Math.random()*150)|0)+'px;background:'+['#f5b53a','#34d399','#60a5fa','#fff'][i%4];s.appendChild(q)}
 $('map').appendChild(s);setTimeout(function(){s.remove()},1800)}
function showBattle(r,p,e,tg,mv,att){var done=0,ph=0,tm=[],sp=SET.rm?0:SET.spd,SI=['👥','🎖','💰','🔬','🕊'],sa=(typeof p=='number'?G.P[p].start:p)||tg,aw=0,dw=0,bs=$('bs'),RM=sp?1300/Math.min(sp,1.25):0;
 BT={a:att,d:tg};BSH=true;try{document.body.classList.add('bsh')}catch(e){}$('panel').style.display='none';$('hint').style.display='none';bs.className='';
 var h='<div class="sides"><div class="sd" id="sa"><div class="rl">'+t('A')+'</div>'+fimg(sa)+'<div class="nm">'+nm(p)+'</div>'+die3d('da','at')+'<div class="bn" id="ba"></div><div class="sub">'+t('pts')+': <b id="pa">–</b></div></div><div class="mid"><div class="sw">⚔</div><div class="mu" id="mu">'+t('pre')+'</div></div><div class="sd" id="sdf"><div class="rl">'+t('D')+'</div>'+fimg(tg)+'<div class="nm">'+M[tg].name+'</div>'+die3d('db','df')+'<div class="bn" id="bb"></div><div class="sub">'+t('pts')+': <b id="pd">–</b></div></div></div><div class="pre" id="pre"></div><div class="cmp">';
 for(var i=0;i<5;i++)h+='<div class="sr" id="r'+i+'"><div class="v"></div><div><div class="lbl"></div><div class="bar"><i class="a"></i><i class="d"></i></div></div><div class="v"></div></div>';
 bs.innerHTML=h+'</div><div class="fin" id="fn"></div>';bs.style.display='block';bs.scrollTop=0;paint();fitBattle(tg,att);
 function rolled(){if(ph>0)return;ph=1;setDie3('da',r.ra);setDie3('db',r.rd);$('da').classList.toggle('hi',r.ra>r.rd);$('db').classList.toggle('hi',r.rd>r.ra);
  $('mu').innerHTML=r.diff?t('hi')+'<br><b>'+(r.ra>r.rd?t('A'):t('D'))+' ×'+r.mult.toFixed(2)+'</b>':t('eqd');$('ba').innerHTML=bonus(r,1);$('bb').innerHTML=bonus(r,0);
  $('pre').innerHTML='<button class="big pri" id="go">⚔ '+t('startB')+'</button>';$('go').onclick=function(){go()};AU.play('dtick')}
 function row(i,snd){var x=r.rows[i],el=$('r'+i),tot=x.a+x.d||1;el.children[0].textContent=v1(x.a);el.children[0].className='v'+(x.w=='a'?' up':'');el.children[2].textContent=v1(x.d);el.children[2].className='v'+(x.w=='d'?' up':'');
  el.children[1].children[0].textContent=SI[i]+' '+t('S')[i];var b=el.children[1].children[1].children;b[0].style.width=(x.a/tot*100)+'%';b[1].style.width=(x.d/tot*100)+'%';
  el.className='sr on '+(x.w=='a'?'a':x.w=='d'?'d':'');if(x.w=='a')aw++;if(x.w=='d')dw++;$('pa').textContent=aw;$('pd').textContent=dw;if(snd)AU.play('dtick')}
 function go(){if(ph!=1)return;ph=2;$('pre').innerHTML='';$('mu').innerHTML='';if(!sp){finish();return}var i=0;(function nx(){if(done)return;if(i<5){row(i++,1);tm.push(setTimeout(nx,380/sp))}else tm.push(setTimeout(finish,350/sp))})()}
 function finish(){if(done)return;done=1;ph=3;tm.forEach(clearTimeout);rolled();$('pre').innerHTML='';aw=0;dw=0;for(var i=0;i<5;i++)row(i,0);
  $('sa').className='sd '+(r.win?'win':'lose');$('sdf').className='sd '+(r.win?'lose':'win');$('sa').firstChild.textContent=r.win?t('winner'):t('loser');$('sdf').firstChild.textContent=r.win?t('loser'):t('winner');bs.className=r.win?'vw':'vl';
  $('fn').innerHTML='<div class="fh"><span class="banner '+(r.win?'w':'l')+'">'+(r.win?t('win'):t('lose'))+'</span><span class="tl">'+r.aw+' – '+r.dw+'</span></div><p class="rs">'+(r.win?t('ru1'):r.dw>=3?t('ru2'):t('ru3'))+'. '+(r.win?t('gain')+': <b>'+M[tg].name+'</b>':t('lost')+': <b>'+M[mv].name+'</b>')+'</p>'+
   '<p class="rs">💰 '+t('rep')+': <b class="w">'+nm(r.rep.w)+' +'+v1(r.rep.amt)+'</b> / <b class="l">'+nm(r.rep.l)+' −'+v1(r.rep.amt)+'</b></p>'+(r.upg?'<p class="rs w"><b>⬆ '+t('upgGot')+'</b></p>':'')+'<button class="big pri" onclick="closeBattle()">'+t('cont2')+'</button>';
  OV={};if(r.win){FLASH=tg;setTimeout(function(){FLASH=null;if(G)overlay()},1300)}paint();splash(r.win);bs.scrollTop=bs.scrollHeight;
  AU.play(r.win?'win':'lose');if(r.win)tm.push(setTimeout(function(){AU.play('conq')},500))}
 bs.onclick=function(ev){if(ev.target.closest&&ev.target.closest('button'))return;if(ph==0)rolled();else if(ph==2)finish()};
 if(!sp){rolled();finish();return}
 AU.play('dice');rollDie('da',r.ra,RM,-1);rollDie('db',r.rd,RM,1,rolled)}
function closeBattle(){BSH=false;try{document.body.classList.remove('bsh')}catch(e){}BT=null;OV={};FLASH=null;var b=$('bs');b.style.display='none';b.onclick=null;if(!G)return;
 // Fetihten sonra yeni sahip olunan ülke seçili kalır; komşu hedefler kırmızı çerçeveyle görünür
 render();if(G.sel&&!G.over)focusSel();else if(!G.over)home()}
function fmt(ms){var s=Math.floor(ms/1000),m=Math.floor(s/60);return m+':'+('0'+s%60).slice(-2)}
function showOver(){var o=G.over,h='<h2>'+(G.P.length==1?(o.w==0?t('win'):((typeof L!='undefined'&&L=='en')?'Game Over 🌱':'Oyun Bitti 🌱')):t('wn')+': '+G.P[o.w].name)+'</h2><div class="row"><span>'+t('tm')+'</span><b>'+fmt(G.el+Date.now()-G.ts)+'</b></div>';
 G.st.forEach(function(s,i){h+=(G.P.length>1?'<b>'+G.P[i].name+'</b>':'')+'<div class="row"><span>'+t('ws')+'</span><b>'+s.w+'</b></div><div class="row"><span>'+t('ls')+'</span><b>'+s.l+'</b></div><div class="row"><span>'+t('cq')+'</span><b>'+s.c+'</b></div>'});
 modal(h+'<button class="big pri" onclick="G=null;menu()">'+t('menu')+'</button>')}

// ---- HARİTA: projeksiyon, kamera, yakınlaşma ----
var AMOVE=false,AC=null;function area(){if(AMOVE&&AC)return AC;var r=area0();if(AMOVE)AC=r;return r}
function area0(){var ib=0,ir=0,il=0,p=$('panel'),b=$('bs'),LS=false;
 try{LS=window.matchMedia('(orientation:landscape) and (max-height:520px)').matches}catch(e){}   /* V58: yatay telefonda paneller yan tarafta */
 if(b.style.display=='block'){if(LS||window.innerWidth>=900)ir=b.offsetWidth;else ib=b.offsetHeight}else if(p.style.display=='block'){if(LS)il=Math.min(W*.6,p.offsetLeft+p.offsetWidth+6);else ib=panelH()+10}
 return{w:Math.max(160,W-ir-il),h:Math.max(120,H_-ib),x:il}}
function clampT(tt,k){var A=area(),m=Math.min(A.w,A.h)*.25*Math.min(1,(k-1)*3),x=tt[0],y=tt[1];
 var AX=A.x||0,lx=AX+A.w-WB.x1*k-m,hx=AX-WB.x0*k+m,ly=A.h-WB.y1*k-m,hy=-WB.y0*k+m;
 x=lx>hx?(lx+hx)/2:Math.max(lx,Math.min(hx,x));y=ly>hy?(ly+hy)/2:Math.max(ly,Math.min(hy,y));return[x,y]}
var CAMRAF=0;function applyCam(tt,k){CAM.x=tt[0];CAM.y=tt[1];CAM.k=k;if(CAMRAF)return;CAMRAF=requestAnimationFrame(function(){CAMRAF=0;var n=g.node();n.setAttribute('transform','translate('+CAM.x+','+CAM.y+')scale('+CAM.k+')')})}
function goTo(tt,k,dur){if(dur>150)dur=150;k=Math.max(KMIN,Math.min(KMAX,k));tt=clampT(tt,k);zm.translate(tt).scale(k);
 if(!dur||SET.rm)svg.interrupt().call(zm.event);else{QUICK=1;svg.transition().duration(dur).ease('cubic-in-out').call(zm.event)}}
function durFor(k){return Math.round(500+Math.min(500,Math.abs(Math.log(k/CAM.k))*230))}
function homeId(){if(!G)return null;if(G.sel&&M[G.sel])return G.sel;var o=[];try{o=owned(G.cur||0)}catch(e){}return o.length&&M[o[0].id]?o[0].id:null}
function home(dur){if(!svg)return;var id=homeId(),d=dur==null?650:dur;if(id){fit(focusBox(id),d);return}var A=area();goTo([(A.x||0)+A.w/2-(W/2)*KMIN,A.h/2-(H_*.42)*KMIN],KMIN,d)}
function panBy(f){var A=area();goTo([CAM.x-f*A.w*.55,CAM.y],CAM.k,260)}
function worldView(){if(G){G.sel=null;if(!BSH)render()}home()}
function zoomBy(f){var A=area(),k=Math.max(KMIN,Math.min(KMAX,CAM.k*f)),c=[(A.x||0)+A.w/2,A.h/2];goTo([c[0]-(c[0]-CAM.x)*k/CAM.k,c[1]-(c[1]-CAM.y)*k/CAM.k],k,300)}
function uni(b,x){return b?[Math.min(b[0],x[0]),Math.min(b[1],x[1]),Math.max(b[2],x[2]),Math.max(b[3],x[3])]:x.slice()}
function inter(a,b){var x0=Math.max(a[0],b[0]),y0=Math.max(a[1],b[1]),x1=Math.min(a[2],b[2]),y1=Math.min(a[3],b[3]);return x1>x0&&y1>y0?[x0,y0,x1,y1]:null}
function grow(b,f,mn){var w=Math.max(b[2]-b[0],mn),h=Math.max(b[3]-b[1],mn),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;return[cx-w*(.5+f),cy-h*(.5+f),cx+w*(.5+f),cy+h*(.5+f)]}
// Ülkenin kendi geometrisine göre sığdırma: ülke + çevresindeki ilgili (saldırılabilir / sahip olunan) komşular
function fit(b,dur){var A=area(),pad=Math.min(34,A.w*.06),mn=Math.max(W,H_)*.045,w=Math.max(b[2]-b[0],mn),h=Math.max(b[3]-b[1],mn),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,
 k=Math.max(KMIN,Math.min(KMAX,Math.min((A.w-2*pad)/w,(A.h-2*pad)/h)));goTo([(A.x||0)+A.w/2-cx*k,A.h/2-cy*k],k,dur==null?durFor(k):dur)}
function focusBox(id){var r=M[id],mn=Math.max(W,H_)*.03,b=grow(r.bb,0,mn),win=grow(r.bb,.8,mn);
 R.forEach(function(n){if(n.id==id||!n.bb)return;var rel=G&&G.ph=='act'?(TG[n.id]||G.owner[n.id]===G.cur):r.nb.indexOf(n.id)>=0;if(!rel)return;var x=inter(n.bb,win);if(x)b=uni(b,x)});return b}
function focusSel(dur){if(!G||!G.sel||!M[G.sel])return;fit(focusBox(G.sel),dur)}
function fitBattle(tg,att){var r=M[tg],mn=Math.max(W,H_)*.03,b=grow(r.bb,0,mn),win=grow(r.bb,.8,mn);
 att.forEach(function(id){var q=M[id],x=inter(q.bb,win);b=uni(b,x||(M[tg].nb.indexOf(id)<0?q.bb:null)||b)});fit(b)}

function pickC(id){if(!G||G.ph=='over'||BSH)return;G.sel=id;render();focusSel()}
function labels(){if(!lab)return;var k=CAM.k,gm=G;lab.selectAll('text').remove();mkg.selectAll('g').remove();
 var sh=R.filter(function(r){return r.bw*k>26&&r.bw*k>r.name.length*5.2});
 lab.selectAll('text').data(sh).enter().append('text').attr('class','lb').attr('x',function(r){return r.px[0]}).attr('y',function(r){return r.px[1]}).attr('font-size',11/k).style('stroke-width',(3/k)+'px').text(function(r){return r.name});
 // çok küçük ülkeler için dokunulabilir işaretçiler
 var tiny=R.filter(function(r){var m=Math.max(r.bw,r.bh)*k;return m<8&&r.px&&!isNaN(r.px[0])&&(k>=2.2||(gm&&(r.id==gm.sel||TG[r.id]||typeof ownerOf(r.id)=='number')))});
 var e=mkg.selectAll('g').data(tiny).enter().append('g').attr('class',function(r){return'mk'+(gm&&r.id==gm.sel?' sel':'')+(gm&&TG[r.id]?' atk':'')}).on('click',function(r){if(d3.event&&d3.event.defaultPrevented)return;pickC(r.id)});
 e.append('circle').attr('class','hit').attr('cx',function(r){return r.px[0]}).attr('cy',function(r){return r.px[1]}).attr('r',11/k);
 e.append('circle').attr('class','dot').attr('cx',function(r){return r.px[0]}).attr('cy',function(r){return r.px[1]}).attr('r',3.6/k).style('stroke-width',(1.3/k)+'px').style('fill',function(r){return col(gm?ownerOf(r.id):r.id)})}
// Çizimde 180° boylamını aşan parçalar (RUS, FJI...) için sınır kutusu: yalnızca noktaların çoğunun bulunduğu tarafı kullan
function partBounds(pg){var b=path.bounds(pg);if(b[1][0]-b[0][0]<Math.PI*S)return b;
 var ring=pg.coordinates[0],pos=[],neg=[];ring.forEach(function(q){(q[0]>=0?pos:neg).push(q)});var use=pos.length>=neg.length?pos:neg,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 use.forEach(function(q){var z=proj(q);if(z[0]<x0)x0=z[0];if(z[0]>x1)x1=z[0];if(z[1]<y0)y0=z[1];if(z[1]>y1)y1=z[1]});return[[x0,y0],[x1,y1]]}

// V36: 180° boylamını aşan ülkelerde (RUS...) seçim/vurgu katmanı bozuk dolgu (karartı) üretmesin
function ovd(id){var r=M[id];if(!r)return'';if(r.dS!==undefined)return r.dS||r.d;
 var need=false;r.parts.forEach(function(p){var b=path.bounds(p.g);if(b[1][0]-b[0][0]>=Math.PI*S*.9)need=true});
 if(!need){r.dS=null;return r.d}
 var out='';
 r.parts.forEach(function(p){var b=path.bounds(p.g);
  if(b[1][0]-b[0][0]<Math.PI*S*.9){out+=path(p.g)||'';return}
  p.g.coordinates.forEach(function(ring){var sides=[[],[]],prev=null;
   ring.forEach(function(q){var lon=q[0],lat=q[1],sd=lon>=0?0:1;
    if(prev&&Math.abs(lon-prev[0])>180){var e0=prev[0]>=0?180:-180,e1=lon>=0?180:-180;sides[prev[0]>=0?0:1].push([e0,lat]);sides[sd].push([e1,lat])}
    sides[sd].push([lon,lat]);prev=q});
   sides.forEach(function(sp){if(sp.length<3)return;var d='';sp.forEach(function(q,i){var z=proj(q);d+=(i?'L':'M')+z[0].toFixed(1)+','+z[1].toFixed(1)});out+=d+'Z'})})});
 r.dS=out;return out}
function setup(){var el=$('map'),w=el.clientWidth,h=el.clientHeight;if(!w||!h||!pel)return;W=w;H_=h;
 var span=(LAT_N-LAT_S)*Math.PI/180;S=Math.min(W/(2*Math.PI),H_/span);
 proj=d3.geo.equirectangular().scale(S).translate([W/2,S*LAT_N*Math.PI/180]).precision(.1);path=d3.geo.path().projection(proj);
 WB={x0:W/2-Math.PI*S,x1:W/2+Math.PI*S,y0:0,y1:S*span};
 R.forEach(function(r){r.dS=undefined;r.d=path(r.f);var mb=null,bb=null,mx=0;r.parts.forEach(function(p){p.b=partBounds(p.g);if(p.a>mx)mx=p.a});
  r.parts.forEach(function(p){var b=[p.b[0][0],p.b[0][1],p.b[1][0],p.b[1][1]];if(p.a==mx){mb=b;r.px=path.centroid(p.g)}if(p.a>=mx*.2)bb=uni(bb,b)});
  r.bb=bb||mb;r.bw=mb?mb[2]-mb[0]:0;r.bh=mb?mb[3]-mb[1]:0;if(!r.px||isNaN(r.px[0]))r.px=path.centroid(r.f)});
 pel.attr('d',function(r){return r.d});ov.selectAll('path').attr('d',function(o){return ovd(o.id)});
 if(LAND)coast.attr('d',path(LAND));grat.attr('d',path(d3.geo.graticule().extent([[-180,-60],[180,84]]).step([30,30])()));
 svg.attr('width',W).attr('height',H_);bgr.attr('width',W).attr('height',H_);zm.size([W,H_]);
 if(G&&G.sel)focusSel(0);else home(0);labels()}
// V12: arc'ları (paylaşılan sınırlar) 0.03° toleransla sadeleştir; görünüm aynı, çizim yükü azalır
function simplifyTopo(t){if(!t||t.__s12||!t.transform)return;t.__s12=1;var sx=t.transform.scale[0],sy=t.transform.scale[1],E2=.03*.03;
 t.arcs=t.arcs.map(function(a){if(a.length<=4)return a;var x=0,y=0,P=a.map(function(d){x+=d[0];y+=d[1];return[x,y,x*sx,y*sy]}),n=P.length,keep=new Uint8Array(n),st=[[0,n-1]];keep[0]=keep[n-1]=1;
  while(st.length){var s=st.pop(),i0=s[0],i1=s[1];if(i1-i0<2)continue;var A=P[i0],B=P[i1],dx=B[2]-A[2],dy=B[3]-A[3],l2=dx*dx+dy*dy,mx=-1,mi=-1;
   for(var i=i0+1;i<i1;i++){var px=P[i][2]-A[2],py=P[i][3]-A[3],d;if(l2===0)d=px*px+py*py;else{var u=Math.max(0,Math.min(1,(px*dx+py*dy)/l2)),qx=px-u*dx,qy=py-u*dy;d=qx*qx+qy*qy}if(d>mx){mx=d;mi=i}}
   if(mx>E2){keep[mi]=1;st.push([i0,mi],[mi,i1])}}
  var out=[],px0=0,py0=0,cnt=0;for(var i=0;i<n;i++)if(keep[i]){out.push([P[i][0]-px0,P[i][1]-py0]);px0=P[i][0];py0=P[i][1];cnt++}
  var closed=P[0][0]===P[n-1][0]&&P[0][1]===P[n-1][1];return cnt<(closed?4:2)?a:out})}
function init(){setSave();document.addEventListener('pointerdown',function(e){AU.init();if(e.target.closest&&e.target.closest('button'))AU.play('click')});
 if(!window.Datamap||!window.topojson){$('hud').textContent='Harita verisi yüklenemedi / Map data failed to load.';return}
 var topo=Datamap.prototype.worldTopo;simplifyTopo(topo);var geoms=topo.objects.world.geometries,fs=topojson.feature(topo,topo.objects.world).features,nb=topojson.neighbors(geoms);
 fs.forEach(function(f,i){var id=geoms[i].id;if(!/^[A-Z]{3}$/.test(id)||id=='ATA')return;var r={id:id,name:f.properties.name||id,f:f,c:d3.geo.centroid(f),ar:d3.geo.area(f),idx:i,nbi:nb[i]};
  var gg=f.geometry,ps=gg.type=='Polygon'?[gg.coordinates]:gg.coordinates;r.parts=ps.map(function(c){var pg={type:'Polygon',coordinates:c};return{g:pg,a:d3.geo.area(pg)}});M[id]=r;R.push(r)});
 R.forEach(function(r){r.nb=r.nbi.map(function(j){return geoms[j].id}).filter(function(x){return M[x]})});
 R.forEach(function(r){BASE[r.id]=genStats(r.id)});geoInit();colorGraph();try{LAND=topojson.merge(topo,geoms.filter(function(x){return M[x.id]}))}catch(e){LAND=null}
 svg=d3.select('#map').insert('svg',':first-child');bgr=svg.append('rect').attr('class','bgr').on('click',function(){if(d3.event&&d3.event.defaultPrevented)return;if(G&&!BSH&&G.sel){G.sel=null;render()}});
 g=svg.append('g');grat=g.append('path').attr('class','grat');coast=g.append('path').attr('class','coast');gc=g.append('g');ov=g.append('g');mkg=g.append('g');lab=g.append('g');
 pel=gc.selectAll('path').data(R).enter().append('path').attr('class','c').on('click',function(r){if(d3.event&&d3.event.defaultPrevented)return;pickC(r.id)});
 var mp=$('map');
 zm=d3.behavior.zoom().scaleExtent([KMIN,KMAX]).on('zoomstart',function(){AMOVE=true;AC=null;mp.classList.add('moving')}).on('zoom',function(){var e=d3.event,tt=clampT(e.translate,e.scale);if(tt[0]!==e.translate[0]||tt[1]!==e.translate[1])zm.translate(tt);applyCam(tt,e.scale)}).on('zoomend',function(){AMOVE=false;AC=null;QUICK=0;mp.classList.remove('moving');g.style('--sw',(.9/CAM.k).toFixed(4)+'px');g.style('--cw',(4.5/CAM.k).toFixed(4)+'px');labels()});
 svg.call(zm).on('dblclick.zoom',null);
 pel.style('fill','#2a3a6e');setup();window.addEventListener('resize',setup);if(window.ResizeObserver)new ResizeObserver(function(){if(mp.clientWidth!==W||mp.clientHeight!==H_)setup()}).observe(mp);
 $('ctl').innerHTML='<button onclick="zoomBy(2)" title="'+t('zin')+'">'+IC.plus+'</button><button onclick="zoomBy(.5)" title="'+t('zout')+'">'+IC.minus+'</button><button onclick="worldView()" title="'+t('world')+'">'+IC.world+'</button>';
 menu()}
window.addEventListener('load',init);

// =====================================================================
// ---- V4 YAMASI: komşu kuralı, bayrak çarkı, pusula ışını, performans ----
// =====================================================================
KMIN=6;SEA=.62;                       // V11: uzak kamera yok; minimum zoom = yakın oynanabilir ölçek (otomatik zoom-out yok)
var D2R=Math.PI/180,WH=null,TGT=null,RG=null,RAYP=null,LBK=null,WAITW=false,CMPK=0;
function isSolo(){return !!G&&G.mode==1&&G.v==4}
// -- geometri ön hesapları: birim vektörler, merkez, yarıçap, ışın için halkalar
function geoInit(){R.forEach(function(r){var g=r.f.geometry,ps=g.type=='Polygon'?[g.coordinates]:g.coordinates,a=[],pr=[];
 ps.forEach(function(p){var q=p[0],k=Math.max(1,Math.ceil(q.length/40));
  for(var i=0;i<q.length;i+=k){var la=q[i][1]*D2R,lo=q[i][0]*D2R;a.push(Math.cos(la)*Math.cos(lo),Math.cos(la)*Math.sin(lo),Math.sin(la))}
  var rg=[],off=0,pl=q[0][0],x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  q.forEach(function(c,i){var d=c[0]-pl;if(i){if(d>180)off-=360;else if(d<-180)off+=360}pl=c[0];var X=c[0]+off;rg.push([X,c[1]]);if(X<x0)x0=X;if(X>x1)x1=X;if(c[1]<y0)y0=c[1];if(c[1]>y1)y1=c[1]});
  pr.push({b:[x0,y0,x1,y1],g:rg})});
 r.xyz=a;r.pr=pr;var sx=0,sy=0,sz=0,n=a.length/3,i;for(i=0;i<a.length;i+=3){sx+=a[i];sy+=a[i+1];sz+=a[i+2]}
 var m=Math.sqrt(sx*sx+sy*sy+sz*sz)||1;r.cu=[sx/m,sy/m,sz/m];var rad=0;
 for(i=0;i<a.length;i+=3){var d=Math.acos(Math.max(-1,Math.min(1,a[i]*r.cu[0]+a[i+1]*r.cu[1]+a[i+2]*r.cu[2])));if(d>rad)rad=d}r.rad=rad})}
// -- hızlı ön eleme: ülke kürelerinin açısal mesafesi menzilden büyükse nokta çiftlerine hiç bakma
function seaD(a,b){var dc=Math.acos(Math.max(-1,Math.min(1,a.cu[0]*b.cu[0]+a.cu[1]*b.cu[1]+a.cu[2]*b.cu[2])));if(dc-a.rad-b.rad>=SEA)return 9;return gap(a.xyz,b.xyz)}
function seaRow(r){if(r.row)return r.row;var o={};R.forEach(function(x){if(x!==r)o[x.id]=(x.row&&x.row[r.id]!==undefined)?x.row[r.id]:seaD(r,x)});return r.row=o}
// -- saldırı kuralı: herkes yalnızca kara komşusuna; kara komşusu kalmadıysa deniz aşırı
function targets(p,ow){var land={},sea={},hasLand=0;
 R.forEach(function(a){if(ow[a.id]!==p)return;a.nb.forEach(function(n){if(ow[n]!==p){land[n]='land';hasLand=1}})});
 if(hasLand)return land;
 R.forEach(function(a){if(ow[a.id]!==p||LLK.indexOf(a.id)>=0)return;var row=seaRow(a);
  R.forEach(function(r){if(ow[r.id]!==p&&!sea[r.id]&&LLK.indexOf(r.id)<0&&row[r.id]<SEA)sea[r.id]='sea'})});
 return sea}
// -- istatistik: bir imparatorluk (tek oyunculuda ülke kodu) tek ortak özellik setini kullanır
function st(e){if(typeof e=='number')return G.P[e].s;var b=(G.es&&G.es[e])||BASE[e];return b.map(function(v,i){return i==2?v+((G.ed||{})[e]||0):v})}
function know(p,e,i){var k=G.kn&&G.kn[p];return !!(k&&k[e]&&k[e][i])}
function ownerInfo(o,p){if(typeof o=='string'&&isSolo())return{c:o===p?'me':'foe',txt:o===p?(L=='en'?'You':'Siz'):M[o].name,bg:col(o)};
 if(o===p)return{c:'me',txt:G.P.length>1?G.P[p].name:t('own'),bg:PC[p]};if(typeof o=='number')return{c:'foe',txt:G.P[o].name,bg:PC[o]};return{c:'neu',txt:t('neu')}}
// -- ışın: büyük daire üzerinde ilerler, kenar (±180°) kesilmesini halkaları açarak çözer
function rayParts(){if(RAYP)return RAYP;RAYP=[];R.forEach(function(r){r.pr.forEach(function(q){RAYP.push({id:r.id,b:q.b,g:q.g})})});return RAYP}
function pip(x,y,g){var c=false;for(var i=0,j=g.length-1;i<g.length;j=i++){var xi=g[i][0],yi=g[i][1],xj=g[j][0],yj=g[j][1];if((yi>y)!=(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function castRay(o,ang,own,maxD){var P=rayParts(),la0=o[1]*D2R,lo0=o[0]*D2R,th=ang*D2R,step=.15,n=Math.round((maxD||120)/step),pts=[o.slice()],hit=null;
 for(var s=1;s<=n&&!hit;s++){var dl=s*step*D2R,la=Math.asin(Math.sin(la0)*Math.cos(dl)+Math.cos(la0)*Math.sin(dl)*Math.cos(th)),
  lo=lo0+Math.atan2(Math.sin(th)*Math.sin(dl)*Math.cos(la0),Math.cos(dl)-Math.sin(la0)*Math.sin(la)),X=((lo/D2R+540)%360)-180,Y=la/D2R;
  if(s%6==0)pts.push([X,Y]);
  for(var i=0;i<P.length;i++){var q=P[i];if(Y<q.b[1]||Y>q.b[3]||own(q.id))continue;
   if((X>=q.b[0]&&X<=q.b[2]&&pip(X,Y,q.g))||(X+360>=q.b[0]&&X+360<=q.b[2]&&pip(X+360,Y,q.g))||(X-360>=q.b[0]&&X-360<=q.b[2]&&pip(X-360,Y,q.g))){hit=q.id;pts.push([X,Y]);break}}}
 return{id:hit,path:pts}}
function bearing(a,b){var f1=a[1]*D2R,f2=b[1]*D2R,dl=(b[0]-a[0])*D2R;return(Math.atan2(Math.sin(dl)*Math.cos(f2),Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dl))/D2R+360)%360}
function originOf(p){var h=(M[p]&&G.owner[p]===p)?p:(owned(p)[0]||{}).id;return M[h||p].c}
// -- hedef seçimi (tamamen önceden hesaplanır; animasyon yalnızca gösterir)
function soloPick(p,rnd){rnd=rnd||Math.random;var tg=targets(p,G.owner),keys=Object.keys(tg),o=originOf(p),own=function(id){return G.owner[id]===p},res,ang;
 if(!keys.length)return{kind:'boost',why:'notargets',ang:rnd()*360,tries:0};
 for(var i=0;i<24;i++){ang=rnd()*360;var h=castRay(o,ang,own);
  if(!h.id)return{kind:'boost',why:'miss',ang:ang,tries:i+1,path:h.path};
  if(tg[h.id]&&(!G.done[G.owner[h.id]]||i>=12))return{kind:'hit',id:h.id,rule:tg[h.id],ang:ang,tries:i+1,path:h.path}}
 var best=null,bd=999;keys.forEach(function(k){if(G.done[G.owner[k]])return;var b=bearing(o,M[k].c),d=Math.abs(((b-ang+540)%360)-180);if(d<bd){bd=d;best=k}});
 if(!best)best=keys[0];var b=bearing(o,M[best].c);return{kind:'hit',id:best,rule:tg[best],ang:b,tries:24,snap:1,path:[o,M[best].c]}}
function applyBoost(p){G.es=G.es||{};var cur=st(p);G.es[p]=cur.map(function(v){return Math.round(v*1.1*1e6)/1e6});if(G.ed)G.ed[p]=0;G.boosts=(G.boosts||0)+1}
// -- tur döngüsü
function aliveEmp(){var s={};for(var k in G.owner)s[G.owner[k]]=1;return Object.keys(s)}
function ensureCycle(){var a=aliveEmp().filter(function(e){return!G.done[e]});if(!a.length){G.cyc=(G.cyc||1)+1;G.done={};a=aliveEmp()}return a}
// -- yeni tek oyunculu oyun
var _newGame=newGame;
newGame=function(m){if(m!=1)return _newGame(m);
 G={mode:1,v:4,P:[{s:[0,0,0,0,0],name:t('pl')+' 1'}],owner:{},cur:null,act:null,roll:0,left:0,ph:'wheel',pi:1,noscout:0,rv:{},ed:{},es:{},kn:[{}],st:[{w:0,l:0,c:0}],el:0,ts:Date.now(),sel:null,up:0,cyc:1,done:{},boosts:0,turn:0};
 R.forEach(function(r){G.owner[r.id]=r.id});OV={};BT=null;BSH=false;try{document.body.classList.remove('bsh')}catch(e){}TGT=null;WH=null;WAITW=false;clearRay();$('bs').style.display='none';closeMod();render();home(0);save()};
// -- bayrak çarkı (yatay çark şeridi)
function showWheel(){if(WAITW||!G||G.ph!='wheel'||BSH)return;if(WH&&WH.stop)return;if(WH)cancelAnimationFrame(WH.raf);
 var el=ensureCycle(),base=[],i,CW=84;for(i=0;i<24;i++)base.push(el[Math.floor(Math.random()*el.length)]);
 var cards=[];for(i=0;i<60;i++)cards.push(base[i%24]);WH={cards:cards,pos:0,v:11,last:0,raf:0,stop:0,el:el};
 function card(e){return'<div class="wc">'+fimg(e)+'<span>'+M[e].name+'</span></div>'}
 modal('<h3>'+t('wheelT')+' — '+t('cycle')+' '+G.cyc+'</h3><div class="wsub">'+t('left2')+': '+el.length+'</div><div id="wh" class="wheel"><div id="wr" class="reel">'+cards.map(card).join('')+'</div><div class="wmark"></div></div><button class="big pri" id="wstop">'+t('wheelStop')+'</button>');
 var box=$('wh'),rl=$('wr');function draw(){rl.style.transform='translateX('+(box.clientWidth/2-(WH.pos+.5)*CW)+'px)'}
 function tick(ts){if(!WH||WH.stop)return;var dt=Math.min(.05,(ts-(WH.last||ts))/1000);WH.last=ts;WH.pos+=WH.v*dt;if(WH.pos>=24)WH.pos-=24;draw();WH.raf=requestAnimationFrame(tick)}
 function stop(){if(!WH||WH.stop||!G||G.ph!='wheel')return;WH.stop=1;cancelAnimationFrame(WH.raf);AU.play('dtick');
  var w=WH.el[Math.floor(Math.random()*WH.el.length)],tgt=Math.floor(WH.pos)+14,from=WH.pos,t0=0,dur=(SET.rm||!SET.spd)?0:1700;
  WH.cards[tgt]=w;rl.children[tgt].outerHTML=card(w);var tk=WH;
  function fin(){if(WH!==tk)return;WH=null;wheelDone(w)}
  if(!dur){tk.pos=tgt;draw();fin();return}
  (function an(ts){if(WH!==tk)return;if(!t0)t0=ts;var x=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-x,3);tk.pos=from+(tgt-from)*e;draw();if(x<1)tk.raf=requestAnimationFrame(an);else setTimeout(fin,350)})(performance.now())}
 $('wstop').onclick=stop;box.onclick=stop;
 if(SET.rm||!SET.spd){draw();return}
 WH.raf=requestAnimationFrame(tick)}
function wheelDone(e){if(!G||G.ph!='wheel')return;if(!G.owner||aliveEmp().indexOf(e)<0)return;G.act=e;G.cur=e;G.ph='compass';G.sel=null;G.turn=(G.turn||0)+1;closeMod();save();render();home(SET.rm?0:500);setTimeout(startCompass,SET.rm?0:650)}
// -- pusula
function clearRay(){if(RG)RG.selectAll('path').remove()}
function drawRay(pts){if(!g)return;if(!RG)RG=g.append('g').attr('class','rayg');clearRay();var d='',px=null;
 pts.forEach(function(q,i){var z=proj(q);if(!z)return;d+=(i==0||(px!==null&&Math.abs(z[0]-px)>W/2)?'M':'L')+z[0].toFixed(2)+','+z[1].toFixed(2);px=z[0]});
 RG.append('path').attr('class','ray').attr('d',d)}
function startCompass(){if(!G||G.ph!='compass'||G.busy||BSH)return;var p=G.act,res=soloPick(p),tk=++CMPK;
 modal('<h3>🧭 '+t('compassT')+'</h3><div class="cmpw"><svg viewBox="-64 -64 128 128"><circle r="60" class="cr"/><circle r="46" class="cr2"/><text y="-48" class="cn">N</text><text x="50" y="4" class="cn">E</text><text y="55" class="cn">S</text><text x="-50" y="4" class="cn">W</text><g id="ndl"><path d="M0,-40 L6,0 L0,8 L-6,0Z" class="nd1"/><path d="M0,40 L6,0 L0,8 L-6,0Z" class="nd2"/></g></svg></div><div id="cmpt" class="wsub">'+t('spinning')+'</div>');
 var n=$('ndl'),fin=SET.rm||!SET.spd,rot=360*(3+Math.floor(Math.random()*3))+res.ang;AU.play('dice');
 if(fin){n.style.transform='rotate('+res.ang+'deg)'}else{n.style.transition='transform 2.4s cubic-bezier(.12,.7,.1,1)';requestAnimationFrame(function(){requestAnimationFrame(function(){n.style.transform='rotate('+rot+'deg)'})})}
 setTimeout(function(){if(CMPK!==tk||!G||G.ph!='compass')return;
  if(res.kind=='boost'){applyBoost(p);G.done[p]=1;G.act=null;G.cur=null;G.ph='wheel';WAITW=true;closeMod();TGT=null;clearRay();save();toast(t('boostMsg').replace('{c}',M[p].name));render();
   setTimeout(function(){WAITW=false;if(G&&G.ph=='wheel')render()},SET.rm?200:1600);return}
  $('cmpt').innerHTML=t('tgtFound')+': <b>'+M[res.id].name+'</b> ('+t(res.rule=='land'?'landb':'seab')+')';
  setTimeout(function(){if(CMPK!==tk||!G||G.ph!='compass')return;closeMod();TGT=res.id;drawRay(res.path);render();fit(focusBox(res.id),SET.rm?0:600);
   setTimeout(function(){if(CMPK!==tk)return;TGT=null;clearRay();soloAttack(res.id)},SET.rm?100:1200)},SET.rm?0:700)},fin?0:2700)}
function soloAttack(tg){if(!G||G.busy||BSH||G.ph!='compass')return;var p=G.act,e=G.owner[tg];if(!p||!M[tg]||e===p)return;
 var T0=targets(p,G.owner);if(!T0[tg])return;G.busy=1;G.ph='battle';
 var A=st(p),D=st(e),r=battle(A,D,d6b(),d6b(),!!G.rv[p+'>'+e],!!G.rv[e+'>'+p]),mv=null,eA=A[2],eD=D[2],mg=Math.abs(r.aw-r.dw),amt=repar(r.win?eA:eD,r.win?eD:eA,mg);
 r.rep={w:r.win?p:e,l:r.win?e:p,amt:amt};var att=battleSides(p,tg);addEco(r.rep.w,amt);addEco(r.rep.l,-amt);OV={};OV[tg]=e;
 if(r.win){G.owner[tg]=p;G.st[0].w++;G.st[0].c++;G.rv[p+'>'+e]=1;delete G.rv[e+'>'+p]}
 else{G.st[0].l++;mv=nearest(p,tg);G.owner[mv]=e;OV[mv]=p;G.rv[e+'>'+p]=1;delete G.rv[p+'>'+e]}
 G.done[p]=1;G.busy=0;save();showBattle(r,p,e,tg,mv,att)}
var _closeBattle=closeBattle;
closeBattle=function(){var was=G&&isSolo()&&G.ph=='battle';_closeBattle();if(was&&G&&G.ph=='battle'){G.act=null;G.cur=null;G.ph='wheel';G.sel=null;save();render()}};
// -- sarmalayıcılar: render / hud / hint / overlay / check / cont / doAttack
var _render=render;
render=function(){if(!G)return;if(!isSolo()){_render();return}TG=(G.ph=='compass'||G.ph=='battle')&&G.act?targets(G.act,G.owner):{};hud();paint();panel();hint();if(G.ph=='wheel'&&!BSH)showWheel()};
var _hud=hud;
hud=function(){if(!isSolo()){_hud();return}var al=aliveEmp(),dn=al.filter(function(e){return G.done[e]}).length,h='<span class="chip">🔄 <span class="lab">'+t('cycle')+' </span><b>'+G.cyc+'</b></span><span class="chip">✅ <b>'+dn+'/'+al.length+'</b></span>';
 if(G.act)h+='<span class="chip pl" style="background:'+col(G.act)+'">'+fimg(G.act,'sm')+' <b style="color:#fff">'+M[G.act].name+'</b></span>';
 $('hud').innerHTML=h+'<span class="sp"></span><button class="hb" title="'+t('world')+'" onclick="worldView()">'+IC.world+'</button><button class="hb" onclick="settings()">'+IC.set+'</button><button class="hb" onclick="menu()">'+IC.menu+'</button>'};
var _hint=hint;hint=function(){if(isSolo()){$('hint').style.display='none';return}_hint()};
overlay=function(){var L=[];if(G){if(BT){BT.a.forEach(function(id){L.push({id:id,c:'ba'})});L.push({id:BT.d,c:'bd'})}
 else{Object.keys(TG).forEach(function(id){L.push({id:id,c:'atks'});L.push({id:id,c:'atk'})});if(G.sel)L.push({id:G.sel,c:'sel'});
  if(isSolo()&&G.act&&G.ph=='compass'){owned(G.act).forEach(function(r){L.push({id:r.id,c:'act'})});if(TGT)L.push({id:TGT,c:'bd'})}}
 if(FLASH)L.push({id:FLASH,c:'cap'})}
 var s=ov.selectAll('path').data(L,function(o){return o.id+o.c});s.exit().remove();s.enter().append('path').attr('class',function(o){return'hl '+o.c}).attr('d',function(o){return ovd(o.id)})};
var _check=check;check=function(){if(isSolo())return;_check()};
var _doAttack=doAttack;doAttack=function(){if(isSolo())return;_doAttack()};
var _scout=scout;scout=function(){if(isSolo())return;_scout()};
// -- kayıt: sürüm doğrulama, bozuk kayıtta kontrollü hata
cont=function(){try{var s=JSON.parse(localStorage.getItem(SV));if(!s||typeof s!='object'||!s.owner||!s.P||!s.P.length)throw 0;
 var solo1=s.mode==1||s.P.length==1;
 if(solo1){if(s.v!=4||s.mode!=1||!s.es||!s.done||!s.st)throw 0;for(var k in s.owner)if(typeof s.owner[k]!='string'||!M[s.owner[k]])throw 0}
 else{if(s.v!=3)throw 0;for(var k2 in s.owner)if(typeof s.owner[k2]=='string'&&!M[s.owner[k2]])throw 0}
 if(Object.keys(s.owner).length!=R.length)throw 0;
 G=s;G.ts=Date.now();G.busy=0;G.sel=null;OV={};TGT=null;WH=null;WAITW=false;clearRay();
 if(solo1){G.ph='wheel';G.act=null;G.cur=null;G.cyc=G.cyc||1;G.rv=G.rv||{};G.ed=G.ed||{};G.kn=G.kn||[{}]}
 closeMod();render();home(0)}catch(e){G=null;toast(t('bad'));menu()}};
function autoSave(){try{if(G&&G.ph!='pick'&&!G.over&&!BSH)save()}catch(e){}}
document.addEventListener('visibilitychange',function(){if(document.hidden)autoSave()});window.addEventListener('pagehide',autoSave);
// -- etiketler: yalnızca yakınlaştırma basamağı değişince yeniden kurulur (render başına tüm DOM'u silmez)
labels=function(){if(!lab)return;var k=CAM.k,gm=G,key=Math.round(Math.log(k)*8)+'|'+W+'|'+H_;
 if(key!==LBK){LBK=key;lab.selectAll('text').remove();var sh=R.filter(function(r){return r.bw*k>26&&r.bw*k>r.name.length*5.2});
  lab.selectAll('text').data(sh).enter().append('text').attr('class','lb').attr('x',function(r){return r.px[0]}).attr('y',function(r){return r.px[1]}).attr('font-size',11/k).style('stroke-width',(3/k)+'px').text(function(r){return r.name})}
 mkg.selectAll('g').remove();var tiny=R.filter(function(r){var m=Math.max(r.bw,r.bh)*k;return m<8&&r.px&&!isNaN(r.px[0])&&(k>=2.2||(gm&&(r.id==gm.sel||TG[r.id]||typeof ownerOf(r.id)!='undefined'&&r.id!=ownerOf(r.id))))});
 var e=mkg.selectAll('g').data(tiny).enter().append('g').attr('class',function(r){return'mk'+(gm&&r.id==gm.sel?' sel':'')+(gm&&TG[r.id]?' atk':'')}).on('click',function(r){if(d3.event&&d3.event.defaultPrevented)return;pickC(r.id)});
 e.append('circle').attr('class','hit').attr('cx',function(r){return r.px[0]}).attr('cy',function(r){return r.px[1]}).attr('r',11/k);
 e.append('circle').attr('class','dot').attr('cx',function(r){return r.px[0]}).attr('cy',function(r){return r.px[1]}).attr('r',3.6/k).style('stroke-width',(1.3/k)+'px').style('fill',function(r){return col(gm?ownerOf(r.id):r.id)})};
// -- uzak kamera yok: "dünya" düğmesi aktif ülkeye / seçili ülkeye yakın görünüm verir
worldView=function(){if(G){G.sel=null;if(!BSH)render()}var id=(G&&G.act&&M[G.act])?G.act:homeId();if(id)fit(focusBox(id),500);else home()};
window.WC.castRay=castRay;window.WC.soloPick=soloPick;window.WC.applyBoost=applyBoost;window.WC.bearing=bearing;window.WC.ensureCycle=ensureCycle;window.WC.targets=targets;
// -- çeviriler
Object.assign(T.tr,{wheelT:'Bayrak Çarkı',wheelStop:'Durdur',cycle:'Tur',left2:'Sırası gelmemiş ülke',compassT:'Pusula',spinning:'Pusula dönüyor…',tgtFound:'Hedef',boostMsg:'{c}: ışın hiçbir ülkeye değmedi, 5 özellik kalıcı %10 arttı',m1d:'Bir ülke seç, tur zarıyla hamle yap, her tur rakip bir kez saldırır'});
Object.assign(T.en,{wheelT:'Flag Wheel',wheelStop:'Stop',cycle:'Round',left2:'Countries still to play',compassT:'Compass',spinning:'Compass spinning…',tgtFound:'Target',boostMsg:'{c}: the ray hit no country, all 5 stats permanently +10%',m1d:'Pick a country, move by turn die, a rival attacks once each round'});
// -- harita yolları: koordinatlar 2 ondalığa yuvarlanır (en yüksek yakınlaştırmada hata < 0.4px) -> daha az veri, daha hızlı çizim
var _setup=setup;
setup=function(){_setup();if(!pel)return;R.forEach(function(r){if(r.d&&!r._r){r.d=r.d.replace(/(\d+\.\d\d)\d+/g,"$1")}});
 pel.attr('d',function(r){return r.d});ov.selectAll('path').attr('d',function(o){return ovd(o.id)})};
