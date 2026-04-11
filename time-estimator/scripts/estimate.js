#!/usr/bin/env node
const fs=require("fs");
const C={simple:{b:2,o:1,p:4},medium:{b:5,o:3,p:10},complex:{b:13,o:8,p:21}};
const KW={simple:["update","fix","tweak","typo"],medium:["build","create","add","feature"],complex:["integrate","migrate","refactor","auth"]};
function detect(t){const l=t.toLowerCase();for(const[k,v]of Object.entries(KW))if(v.some(w=>l.includes(w)))return k;return"medium"}
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node estimate.js \"task1; task2\"");process.exit(0)}
const buf=args.includes("--buffer")?parseFloat(args[args.indexOf("--buffer")+1]):1.5;
let tasks=args[0].split(";").map(t=>t.trim()).filter(Boolean);
console.log("\n| Task | Complexity | Realistic | Pessimistic |\n|------|-----------|-----------|-------------|");
tasks.forEach(t=>{const c=detect(t);const v=C[c]||C.medium;console.log("| "+t+" | "+c+" | "+Math.round(v.b*buf)+"h | "+Math.round(v.p*buf)+"h |")});