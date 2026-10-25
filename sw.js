const CACHE='smart-vocab-v14-ranges';
const ASSETS=[
  './','./index.html','./manifest.webmanifest','./icon.svg',
  './data/junior_official.js','./data/high_official.js','./data/meanings.js?v=2','./data/junior_official.js?v=1','./data/high_official.js?v=1',
  './data/common_frequency.js?v=1','./README-SOURCES.md','./LICENSE-ECDICT.txt'
];
const OPTIONAL=['https://cdn.jsdelivr.net/npm/opencc-js@1.4.2/dist/umd/full.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache=>{
      await cache.addAll(ASSETS);
      await Promise.all(OPTIONAL.map(async url=>{
        try{const r=await fetch(url,{mode:'cors'});if(r.ok)await cache.put(url,r)}catch(e){}
      }));
    })
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('smart-vocab-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request))
  );
});
