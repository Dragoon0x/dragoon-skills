#!/usr/bin/env node
const fs=require("fs");const args=process.argv.slice(2);if(!args.length){console.log("Usage: node process.js <file> [--output file]");process.exit(0)}
let text=fs.readFileSync(args[0],"utf-8");
const FILLER=/\b(um|uh|like|you know|basically|actually|so yeah|I mean|kind of|sort of)\b/gi;
const cleaned=text.replace(FILLER,"").replace(/\s{2,}/g," ").trim();
const points=cleaned.split(/[.!?]+/).filter(l=>l.trim().length>20).slice(0,10);
console.log("# Voice Memo Notes\n\n## Key Points\n");
points.forEach((p,i)=>console.log((i+1)+". "+p.trim()+"."));
const out=args.includes("--output")?args[args.indexOf("--output")+1]:null;
if(out){let md="# Voice Memo Notes\n\n";points.forEach((p,i)=>{md+=(i+1)+". "+p.trim()+".\n"});md+="\n## Full Transcript\n\n"+cleaned;fs.writeFileSync(out,md);console.log("\nWritten to "+out)}