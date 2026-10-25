import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true});
const context = await browser.newContext();
const page = await context.newPage();
const errors=[];
page.on('console', msg=>{ if(msg.type()==='error') errors.push('console: '+msg.text()); });
page.on('pageerror', err=>errors.push('pageerror: '+err.message));

await page.goto('http://127.0.0.1:8000/', {waitUntil:'networkidle'});

async function assert(cond,msg){ if(!cond) throw new Error(msg); }

// Dataset / meaning coverage
const data=await page.evaluate(()=>({
  junior:JUNIOR_WORDS.length,
  high:HIGH_WORDS.length,
  emptyJunior:JUNIOR_WORDS.filter(x=>!x.m).length,
  emptyHigh:HIGH_WORDS.filter(x=>!x.m).length,
  able:HIGH_WORDS.find(x=>x.w==='able')?.m||'',
  opencc:typeof OpenCC!=='undefined'
}));
await assert(data.junior===2066,'junior count '+data.junior);
await assert(data.high===6170,'high count '+data.high);
await assert(data.emptyJunior===0,'empty junior meanings '+data.emptyJunior);
await assert(data.emptyHigh===0,'empty high meanings '+data.emptyHigh);
await assert(data.opencc,'OpenCC did not load');
await assert(data.able.includes('有能力')&&data.able.includes('能幹'),'able meaning did not convert/display as expected: '+data.able);

// Enter high-school track
await page.getByRole('button',{name:/4,500 學測核心/}).click();
await assert(await page.getByText(/高中 4,500 學測核心/).count()>0,'high track did not open');

// Quiz session should contain unique words
await page.getByRole('button',{name:/開始今日學習/}).click();
let session=await page.evaluate(()=>qstate.items.map(x=>x.w));
await assert(session.length===10,'quiz session length '+session.length);
await assert(new Set(session).size===session.length,'duplicate word within session');

// Answer -> feedback -> next question
let meta1=await page.locator('#quiz .qmeta').textContent();
const optionTexts=await page.locator('.option').allTextContents();
await assert(optionTexts.length===4,'normal quiz did not show 4 options: '+optionTexts.length);
await assert(new Set(optionTexts).size===4,'normal quiz options not distinct: '+optionTexts.join('|'));
const firstOption=page.locator('.option').first();
await firstOption.click();
await assert(await page.locator('#feedbackBox .feedback').count()===1,'feedback not shown after answer');
const savedAfterFirst=await page.evaluate(()=>JSON.parse(localStorage.getItem('smart_vocab_progress_v5')||'{}'));
await assert(Object.values(savedAfterFirst).some(s=>(s.ok||0)+(s.bad||0)>0),'answer was not persisted immediately');
await assert(await page.getByRole('button',{name:'下一題'}).count()===1,'next button missing');
await page.getByRole('button',{name:'下一題'}).click();
let meta2=await page.locator('#quiz .qmeta').textContent();
await assert(meta1!==meta2 && /第 2 \/ 10 題/.test(meta2||''),'did not advance to question 2: '+meta2);

// Answer another question and confirm records refresh
await page.locator('.option').first().click();
await page.locator('.nav[data-nav="records"]').click();
const recordsText=await page.locator('#records').textContent();
await assert(/已記錄 [1-9]\d* 個單字/.test(recordsText||''),'learning record count not updated: '+recordsText);
await assert(/本機儲存正常/.test(recordsText||''),'storage status not normal');

// Reload and confirm persistence
const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('smart_vocab_progress_v5')||'{}'));
await page.reload({waitUntil:'networkidle'});
const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('smart_vocab_progress_v5')||'{}'));
await assert(Object.keys(before).length>0,'no progress in localStorage before reload');
await assert(JSON.stringify(before)===JSON.stringify(after),'progress changed/lost on reload');

// Return home and confirm learning card meaning visible
await page.getByRole('button',{name:'首頁'}).first().click();
await page.getByRole('button',{name:/1,200 會考核心/}).click();
await page.getByRole('button',{name:'單字學習'}).click();
await page.getByRole('button',{name:'顯示資料'}).click();
const meaning=await page.locator('#learnAnswer .meaning').textContent();
await assert((meaning||'').trim().length>0,'learning card Chinese meaning empty');
await assert(!(await page.locator('#learnAnswer').textContent()).includes('中文義尚未逐筆複核'),'old no-meaning warning still visible');

// Placement: 12 distinct words, proper page progression
await page.getByRole('button',{name:'首頁'}).first().click();
await page.getByRole('button',{name:/開始單字辨義練習/}).click();
const placementWords=[];
for(let i=1;i<=12;i++){
  const q=await page.locator('#placeBox .qtext').textContent();
  await assert(/最適合的中文意思/.test(q||''),'placement is not meaning-based: '+q);
  const m=(q||'').match(/「(.+?)」/);
  if(m) placementWords.push(m[1]);
  const opts=page.locator('#placeBox .option');
  await assert(await opts.count()===4,'placement options !=4 at '+i);
  await opts.first().click();
}
await assert(placementWords.length===12,'placement did not render 12 word questions');
await assert(new Set(placementWords).size===12,'placement repeated word: '+placementWords.join(','));
await assert((await page.locator('#placeBox').textContent()).includes('本次答對'),'placement did not reach result page');

// Second quiz session should not be identical to first
await page.locator('#placeBox button').filter({hasText:'高中 4,500 學測核心'}).click();
await page.getByRole('button',{name:'智慧測驗'}).click();
await page.getByRole('button',{name:/開始 10 題/}).click();
const session2=await page.evaluate(()=>qstate.items.map(x=>x.w));
await assert(session2.length===10 && new Set(session2).size===10,'second session invalid');
await assert(session2.join('|')!==session.join('|'),'second session identical to first');

// Cumulative frequency ranges; never combined into official corpora.
for(const n of [3000,5000,7000]){
 await page.getByRole('button',{name:'首頁'}).first().click();
 await page.locator(`button[onclick="selectTrack('c${n}')"]`).click();
 const counts=await page.evaluate(()=>({total:catalogPool().length,ready:pool().length,unique:new Set(pool().map(x=>x.w.toLowerCase())).size}));
 await assert(counts.total===n&&counts.ready===n&&counts.unique===n,'invalid frequency count '+JSON.stringify(counts));
 await assert((await page.locator('#trackDesc').textContent()).includes('非官方考試分級'),'frequency range mislabelled');
}
await page.getByRole('button',{name:'單字學習',exact:true}).click();
await page.getByRole('button',{name:'我會了',exact:true}).click();
await page.locator('.nav[data-nav="records"]').click();
const search=page.locator('#records .search');
await search.click();await search.pressSequentially('hear');
await assert(await search.inputValue()==='hear','record search loses characters');
await assert(await search.evaluate(el=>el===document.activeElement),'record search loses focus');
const commonSaved=await page.evaluate(()=>JSON.stringify(db));
await page.reload({waitUntil:'networkidle'});
await page.locator('.nav[data-nav="records"]').click();
await assert((await page.locator('#trackTitle').textContent()).includes('7,000'),'saved C range heading absent');
await assert(await page.evaluate(()=>JSON.stringify(db))===commonSaved,'C/J/H records lost on reload');
await page.getByRole('button',{name:'首頁'}).first().click();
await page.locator(`button[onclick="selectTrack('c3000')"]`).click();
await assert(await page.evaluate(()=>peekState(COMMON_WORDS[0].w).seen)>0,'C progress not shared across cumulative ranges');

// Asset checks
const assetStatus=await page.evaluate(async()=>({
  junior:(await fetch('./data/junior_official.js')).status,
  high:(await fetch('./data/high_official.js')).status,
  meanings:(await fetch('./data/meanings.js')).status,
  sw:(await fetch('./sw.js')).status,
  common:(await fetch('./data/common_frequency.js?v=1')).status,
  license:(await fetch('./LICENSE-ECDICT.txt')).status
}));
await assert(Object.values(assetStatus).every(x=>x===200),'asset fetch failed '+JSON.stringify(assetStatus));

if(errors.length) throw new Error('Browser errors: '+errors.join(' | '));
console.log(JSON.stringify({ok:true,data,placementWords,session,session2,assetStatus}));
await browser.close();
