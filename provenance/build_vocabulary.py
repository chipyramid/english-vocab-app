import csv,re,json,sys,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'pythonlibs'))
from opencc import OpenCC
base=Path(__file__).parent
cc=OpenCC('s2twp')
# Original short teaching glosses for obvious source defects or Taiwan usage.
fix={
'a':'art. 一個；一種（不定冠詞）','the':'art. 這個、那個（定冠詞，指特定的人或事物）',
'be':'v. 是；在；存在','can':'aux. 能；可以\nn. 罐子\nv. 裝罐',
'will':'aux. 將；願意\nn. 意志；遺囑','as':'prep. 作為；當作\nconj. 當……時；因為；如同\nadv. 同樣地',
'like':'v. 喜歡\nprep. 像；如同\nadj. 相似的','internet':'n. 網際網路',
'online':'adj./adv. 線上的；在線上','affordable':'adj. 負擔得起的；價格合理的',
'laptop':'n. 筆記型電腦','download':'v./n. 下載','upload':'v./n. 上傳',
'computer':'n. 電腦','software':'n. 軟體','hardware':'n. 硬體；五金器具',
'video':'n. 影片；錄影\nadj. 視訊的','information':'n. 資訊；消息',
'quality':'n. 品質；特質\nadj. 優質的','taxi':'n. 計程車\nv.（飛機）滑行',
'bus':'n. 公車；巴士\nv. 以巴士接送','bicycle':'n. 腳踏車；自行車',
'potato':'n. 馬鈴薯','tomato':'n. 番茄','yogurt':'n. 優格',
'competitiveness':'n. 競爭力；競爭心','internally':'adv. 在內部；從內部',
'extremist':'n. 極端主義者\nadj. 極端的','limo':'n. 豪華轎車（limousine 的簡稱）',
'deployment':'n. 部署；調度','benchmark':'n. 基準；衡量標準\nv. 以基準評估',
'globalization':'n. 全球化','privatization':'n. 民營化；私有化',
'impeachment':'n. 彈劾','genome':'n. 基因組','hierarchical':'adj. 階層式的；分等級的',
'confidentiality':'n. 保密；機密性','interdisciplinary':'adj. 跨學科的',
'checklist':'n. 檢查清單；核對表','cellphone':'n. 手機','smartphone':'n. 智慧型手機',
}
rows=[]
for r in csv.DictReader((base/'ecdict.csv').open()):
 w=r['word']; t=r['translation']; frq=int(r['frq'] or 0); bnc=int(r['bnc'] or 0)
 if not re.fullmatch('[a-z]+(?:-[a-z]+)?',w):continue
 if not re.search('[\u4e00-\u9fff]',t) or frq<=0:continue
 if re.search(r'(?:^|/)0:',r['exchange']):continue
 # Require a second corpus or a vocabulary tag for unstarred items.
 if not (bnc or r['collins'] or r['oxford'] or r['tag']):continue
 lines=t.replace(r'\r','').replace(r'\n','\n').splitlines()
 # Keep general senses rather than duplicate technical abbreviations.
 general=[s.strip() for s in lines if not re.match(r'^\s*\[',s)]
 if general:lines=general
 lines=[s for s in lines if not re.search(r'的(?:过去式|过去分词|复数形式)$',s)]
 meaning=fix.get(w,cc.convert('\n'.join(lines).strip()))
 if not re.search('[\u4e00-\u9fff]',meaning):continue
 rows.append((frq,bnc or 999999,w,r,meaning))
rows.sort(key=lambda x:(x[0],x[1],x[2]))
seen=set(); out=[]
for frq,bnc,w,r,meaning in rows:
 if w.casefold() in seen:continue
 seen.add(w.casefold()); rank=len(out)+1
 out.append({'id':'common-'+w,'word':w,'meaning':meaning,'phonetic':r['phonetic'],'rank':rank,'tier':3000 if rank<=3000 else 5000 if rank<=5000 else 7000,'frequencyRank':frq,'source':'ECDICT','glossEdited':w in fix})
 if len(out)==7000:break
assert len(out)==7000 and len(seen)==7000
for n in [3000,5000,7000]: assert len([r for r in out if r['rank']<=n])==n
assert all(r['meaning'] and re.search('[\u4e00-\u9fff]',r['meaning']) for r in out)
(base/'vocabulary.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
stats={'entries':len(out),'uniqueCaseInsensitive':len(seen),'cumulativeTiers':[3000,5000,7000],'blankChinese':0,'examplesIncluded':0,'originalGlossCorrections':sum(r['glossEdited'] for r in out),'firstWords':[r['word'] for r in out[:15]],'lastWords':[r['word'] for r in out[-10:]],'sourceCsvSha256':hashlib.sha256((base/'ecdict.csv').read_bytes()).hexdigest(),'jsonSha256':hashlib.sha256((base/'vocabulary.json').read_bytes()).hexdigest()}
(base/'validation.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(stats,ensure_ascii=False,indent=2))
