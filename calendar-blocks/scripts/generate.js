#!/usr/bin/env node
const fs=require("fs");
function classify(t){const l=t.toLowerCase();if(["writing","coding","design","strategy","create","build","draft"].some(k=>l.includes(k)))return"high";if(["meeting","standup","review","sync","call","1:1"].some(k=>l.includes(k)))return"medium";return"low"}
function dur(t){const l=t.toLowerCase();if(/standup|sync/.test(l))return 15;if(/meeting|review|call/.test(l))return 30;if(/write|draft|build|design/.test(l))return 90;return 45}
function fmt(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node generate.js \"task1; task2\"");process.exit(0)}
let tasks=fs.existsSync(args[0])?fs.readFileSync(args[0],"utf-8").split("\n").filter(Boolean):args[0].split(";").map(t=>t.trim()).filter(Boolean);
let cursor=540;const sorted=tasks.map(t=>({task:t,e:classify(t),d:dur(t)})).sort((a,b)=>({high:0,medium:1,low:2}[a.e])-({high:0,medium:1,low:2}[b.e]));
console.log("\n| Time | Dur | Task | Energy |\n|------|-----|------|--------|");
sorted.forEach(s=>{if(cursor>=720&&cursor<780){console.log("| "+fmt(720)+" | 60m | Lunch | break |");cursor=780}
console.log("| "+fmt(cursor)+" | "+s.d+"m | "+s.task+" | "+s.e+" |");cursor+=s.d+15});