const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../index.html','utf8').replace(/<script src="([^"]+)"[^>]*><\/script>/g,(_,p)=>p.startsWith('https:')?'':'<script>'+fs.readFileSync(__dirname+'/../'+p.split('?')[0],'utf8')+'</script>');
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'dangerously',beforeParse(w){w.alert=()=>{};w.confirm=()=>false;}});
const w=dom.window,d=w.document,run=s=>w.eval(s);let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name)}
function session(n){w.startPlacement();const words=[];for(let i=0;i<12;i++){
 const text=d.querySelector('#placeBox .qtext').textContent,word=text.match(/「(.+)」/)[1];words.push(word);
 const meaning=run(`JUNIOR_WORDS.concat(HIGH_WORDS).find(x=>x.w===${JSON.stringify(word)}).m`);
 const opts=[...d.querySelectorAll('#placeBox .option')];assert.equal(opts.length,4);
 const matches=opts.filter(b=>w.dec(b.dataset.v)===meaning);assert.equal(matches.length,1);
 const b=i<n?matches[0]:opts.find(b=>w.dec(b.dataset.v)!==meaning);b.click();b.click();
 }assert.equal(new Set(words).size,12);assert(d.querySelector('#placeBox').textContent.includes('本次答對 '+n+' / 12 題'));return words;
}
test('all wrong = 0/12, no inferred high-school recommendation',()=>{session(0);assert(!d.querySelector('#placeBox').textContent.includes('試用建議'));assert(d.querySelector('#placeBox').textContent.includes('不判定國中／高中程度'))});
test('low correct = 3/12 (25%)',()=>{session(3);assert(d.querySelector('#placeBox').textContent.includes('25%'))});
test('all correct = 12/12 (100%), no proficiency diagnosis',()=>{session(12);assert(d.querySelector('#placeBox').textContent.includes('100%'))});
test('each run samples exactly 3 items from each of four J/H bands',()=>{for(let i=0;i<100;i++)assert(run('(()=>{const a=buildPlacementItems();return a.length===12&&new Set(a.map(r=>r.x.w.toLowerCase())).size===12&&PLACEMENT_BANDS.every(b=>a.filter(r=>r.band===b.id).length===3)})()'))});
test('three consecutive sessions avoid prior two session words',()=>{const a=session(0),b=session(0),c=session(0);assert.equal(new Set([...a,...b,...c]).size,36)});
test('all four existing J/H course choices remain available',()=>{for(const id of ['j1200','j2000','h4500','h6000'])assert(d.querySelector(`#placeBox [onclick="selectTrack('${id}')"]`))});
test('no speech API needed and no sound-scored items',()=>{assert.equal(w.speechSynthesis,undefined);session(6);assert(d.querySelector('#placeBox').textContent.includes('不評估聽力'))});
test('stale options from previous question/run cannot add answers',()=>{w.startPlacement();const old=[...d.querySelectorAll('#placeBox .option')];old[0].click();const q=d.querySelector('#placeBox').textContent;old[1].click();assert.equal(d.querySelector('#placeBox').textContent,q);w.startPlacement();const q2=d.querySelector('#placeBox').textContent;old[2].click();assert.equal(d.querySelector('#placeBox').textContent,q2)});
test('short pool reports exact answered denominator and insufficient data',()=>{run('JUNIOR_WORDS.splice(4);HIGH_WORDS.length=0');w.startPlacement();let n=0;while(d.querySelector('#placeBox .option')){d.querySelector('#placeBox .option').click();n++;assert(n<=4)}const text=d.querySelector('#placeBox').textContent;assert(n>0&&n<12);assert(text.includes(' / '+n+' 題'));assert(text.includes('本次資料不足'))});
test('empty pool reports insufficient data, not 0% or level',()=>{run('JUNIOR_WORDS.length=0;HIGH_WORDS.length=0');w.startPlacement();const text=d.querySelector('#placeBox').textContent;assert(text.includes('目前沒有足夠題目'));assert(text.includes('本次資料不足'));assert(!text.includes('NaN'));assert(!text.includes('試用建議'))});
console.log(count+' placement checks passed');dom.window.close();
