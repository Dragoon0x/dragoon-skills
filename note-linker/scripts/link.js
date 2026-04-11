#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const STOP=new Set(["the","and","for","are","but","not","you","all","can","had","was","one","our","with","this","that","from","have","been"]);
function kw(t){return t.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>3&&!STOP.has(w))}
function find(dir){const r=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()&&!e.name.startsWith("."))r.push(...find(f));else if(e.name.endsWith(".md"))r.push(f)}return r}
const dir=process.argv[2]||".";const min=2;const files=find(dir);
const docs=files.map(f=>({name:path.basename(f,".md"),kws:new Set(kw(fs.readFileSync(f,"utf-8")))}));
const conn=[];for(let i=0;i<docs.length;i++)for(let j=i+1;j<docs.length;j++){const shared=[...docs[i].kws].filter(k=>docs[j].kws.has(k));if(shared.length>=min)conn.push({a:docs[i].name,b:docs[j].name,score:shared.length,shared:shared.slice(0,5)})}
conn.sort((a,b)=>b.score-a.score);
console.log("\nNote Connections -- "+files.length+" files\n");
conn.slice(0,15).forEach((c,i)=>console.log((i+1)+". "+c.a+" <-> "+c.b+" ("+c.score+")\n   "+c.shared.join(", ")+"\n"));