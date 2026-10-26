// Requiere Node.js y Python 3. Prueba ambos servidores con API HTTP y HTTPS.
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bodega-proxy-'));
const openssl = process.env.OPENSSL || 'openssl';
const key = path.join(tmp, 'key.pem'), cert = path.join(tmp, 'cert.pem');
const generated = spawnSync(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'], {stdio:'pipe'});
assert.equal(generated.status, 0, 'OpenSSL debe estar disponible para el certificado de prueba.');
const listen = s => new Promise(resolve => s.listen(0,'127.0.0.1',resolve));
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
let cases = 0;
try {
  for (const secure of [false,true]) {
    const handler = (req,res) => {
      const data=[];req.on('data',c=>data.push(c));req.on('end',()=>{
        res.writeHead(req.method==='POST'?201:200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({path:req.url,auth:req.headers.authorization,body:Buffer.concat(data).toString()}));
      });
    };
    const api = secure ? https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},handler) : http.createServer(handler);
    await listen(api);
    try {
      for (const kind of ['node','python']) {
        const reservation=http.createServer();await listen(reservation);const port=reservation.address().port;
        await new Promise(r=>reservation.close(r));
        const command=kind==='node'?process.execPath:(process.env.PYTHON||'python3');
        const args=kind==='node'?['server.mjs']:['server.py'];
        const child=spawn(command,args,{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',API_TARGET:`${secure?'https':'http'}://127.0.0.1:${api.address().port}`,NODE_EXTRA_CA_CERTS:cert,SSL_CERT_FILE:cert},stdio:'pipe'});
        let startupError='';child.on('error',e=>startupError=e.message);
        try {
          const url=`http://127.0.0.1:${port}`;
          let ready=false;
          for(let n=0;n<80;n++) {
            if(startupError) throw Error(startupError);
            try {if((await fetch(url)).status===200){ready=true;break;}} catch {}
            await pause(50);
          }
          assert.ok(ready,`${kind} no inició`);
          for(const route of ['/server.mjs','/server.py','/.env.example','/.gitignore','/README.md','/assets/../server.py']) {
            assert.equal((await fetch(url+route)).status,404,`${kind}: ${route}`);cases++;
          }
          assert.equal((await fetch(url+'/productos/63')).status,200);cases++;
          assert.equal((await fetch(url+'/js/config.js')).status,200);cases++;
          const head=await fetch(url+'/js/config.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);cases++;
          const response=await fetch(url+'/api/prueba?q=uno',{method:'POST',headers:{Authorization:'Bearer token-prueba','Content-Type':'text/plain'},body:'comprobante de prueba'});
          assert.equal(response.status,201);
          assert.deepEqual(await response.json(),{path:'/api/prueba?q=uno',auth:'Bearer token-prueba',body:'comprobante de prueba'});cases++;
          console.log(`${kind} + API ${secure?'HTTPS':'HTTP'}: correcto`);
        } finally {child.kill();await new Promise(r=>child.once('close',r));}
      }
    } finally {await new Promise(r=>api.close(r));}
  }
  console.log(`${cases} comprobaciones aprobadas.`);
} finally {
  // Sólo los archivos temporales generados por esta prueba.
  fs.unlinkSync(key);fs.unlinkSync(cert);fs.rmdirSync(tmp);
}
