const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||__dirname+'/../index.html','utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(code);
const controller=code.slice(code.indexOf('// Keep speak()'),code.indexOf('function listeningToMeaning'));
let passed=0;function test(name,fn){fn();console.log('PASS '+name);passed++}
function env(){
 const timers=new Map(),events={},calls=[],status={textContent:''},notice={classList:{toggle(){}}};let tid=0;
 const synth={voices:[],paused:false,speaking:false,pending:false,getVoices(){return this.voices},cancel(){calls.push('cancel')},resume(){calls.push('resume');this.paused=false},speak(u){calls.push(u)},addEventListener(n,fn){events[n]=fn}};
 const c={window:{speechSynthesis:synth,SpeechSynthesisUtterance:function(t){this.text=t},addEventListener(n,f){events[n]=f}},document:{getElementById:id=>id==='speechStatus'?status:notice,addEventListener(n,f){events[n]=f}},setTimeout:(f,ms)=>{timers.set(++tid,{f,ms});return tid},clearTimeout:id=>timers.delete(id)};
 vm.createContext(c);vm.runInContext(controller,c);return {c,synth,calls,status,timers,events,run:s=>vm.runInContext(s,c),last:()=>calls.findLast(x=>typeof x==='object')};
}
test('synchronous first tap, empty voice list still speaks, explicit English volume/rate',()=>{let e=env();e.c.speakWord('apple');assert.equal(e.calls.length,1);assert.equal(e.last().lang,'en-US');assert.equal(e.last().volume,1);assert.equal(e.last().rate,.85);assert.match(e.status.textContent,/請求/)});
test('loaded voices choose local English; voiceschanged never autoplays',()=>{let e=env();e.synth.voices=[{lang:'zh-TW',localService:true},{lang:'en-US',localService:true}];e.events.voiceschanged();assert.equal(e.calls.length,0);e.c.speakWord('book');assert.equal(e.last().voice,e.synth.voices[1])});
test('paused synthesis resumes before speak',()=>{let e=env();e.synth.paused=true;e.c.speakWord('book');assert.equal(e.calls[0],'resume')});
test('engine callbacks do not claim heard audio',()=>{let e=env();e.c.speakWord('book');e.last().onstart();assert.match(e.status.textContent,/裝置回報已開始/);e.last().onend();assert.match(e.status.textContent,/若沒有聽到/);assert.equal(e.timers.size,0)});
test('repeated taps cancel prior, stale error/end cannot clobber new request',()=>{let e=env();e.c.speakWord('one');let old=e.last();e.c.speakWord('two');old.onerror({error:'canceled'});old.onend();assert.match(e.status.textContent,/請求/);assert.equal(e.last().text,'two');assert(e.calls.includes('cancel'))});
test('start timeout reports failure and retains explicit retry word',()=>{let e=env();e.c.speakWord('book');[...e.timers.values()][0].f();assert.match(e.status.textContent,/未回報開始/);assert.equal(e.run('speechState.lastWord'),'book');assert.equal(e.run('speechState.utterance'),null)});
test('not allowed, missing voice, and thrown errors visible',()=>{for(let error of ['not-allowed','voice-unavailable']){let e=env();e.c.speakWord('book');e.last().onerror({error});assert(!/正在請求/.test(e.status.textContent));assert.equal(e.timers.size,0)}let e=env();e.synth.speak=()=>{throw Error()};e.c.speakWord('book');assert.match(e.status.textContent,/無法啟動/)});
test('unsupported browser visible and does not throw',()=>{let e=env();delete e.c.window.speechSynthesis;e.c.speakWord('book');assert.match(e.status.textContent,/不支援/)});
test('background/navigation cancels and invalidates callbacks',()=>{let e=env();e.c.speakWord('book');const old=e.last();e.c.document.hidden=true;e.events.visibilitychange();old.onstart();assert.equal(e.status.textContent,'');assert.equal(e.timers.size,0)});
test('no timer autoplay, listening fallback explicitly classified en',()=>{assert(!/setTimeout\(\(\)=>speakWord/.test(code));assert.match(html,/聽不到？改用字義題/);assert.match(code,/fallbackMeaningQuestion\(qstate.items\[qstate.i\],'en'/)});
console.log(`${passed} focused speech controller checks passed; mocked engine, not audible iPhone verification.`);
