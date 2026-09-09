const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json',
  '.ico':'image/x-icon'
};

const server = http.createServer((req,res)=>{
  let urlPath = decodeURIComponent((req.url||'/').split('?')[0]);
  if(urlPath==='/refresh'){
    refreshCatalog(res);
    return;
  }
  if(urlPath==='/' || urlPath==='/index.html') urlPath = '/auction-resell-dashboard.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if(!filePath.startsWith(ROOT)){
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath,(err,data)=>{
    if(err){
      res.writeHead(404,{'Content-Type':'text/plain'}); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const noCache = filePath.endsWith('musick-catalog.js') || filePath.endsWith('musick-catalog.json');
    res.writeHead(200,{
      'Content-Type': MIME[ext]||'application/octet-stream',
      'Cache-Control': noCache ? 'no-store' : 'public, max-age=3600'
    });
    res.end(data);
  });
});

let refreshing = false;
function refreshCatalog(res){
  if(refreshing){ respond(res, 429, {ok:false, error:'refresh already running'}); return; }
  refreshing = true;
  const ps = path.join(ROOT, 'pull-musick.ps1');
  execFile('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File', ps, '-SkipEbay'],
    {cwd: ROOT, timeout: 180000, maxBuffer: 4*1024*1024},
    (err, stdout, stderr)=>{
      refreshing = false;
      if(err){ console.error('refresh failed:', err.message); respond(res, 500, {ok:false, error: String(err.message||stderr||'').slice(0,300)}); return; }
      const m = stdout.match(/Wrote\s+(\d+)\s+lots/);
      const n = m ? +m[1] : (stdout.match(/parsed (\d+) lots/g) || []).reduce((a,c)=>a + (+c.replace(/\D/g,'')||0), 0);
      console.log('refresh ok:', n, 'lots');
      respond(res, 200, {ok:true, lots:n});
    });
}
function respond(res, code, obj){
  const body = JSON.stringify(obj);
  res.writeHead(code, {'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(body);
}

server.listen(PORT, '0.0.0.0', ()=>{
  console.log('Musick dashboard serving at:');
  console.log('  LAN:    http://' + getLAN());
  console.log('  Local:  http://localhost:' + PORT);
  console.log('  Tunnel: run the localhost.run command from a separate terminal (see instructions)');
});

function getLAN(){
  const nets = require('os').networkInterfaces();
  for(const name of Object.keys(nets)){
    for(const net of nets[name]){
      if(net.family==='IPv4' && !net.internal) return net.address+':'+PORT;
    }
  }
  return 'localhost:'+PORT;
}