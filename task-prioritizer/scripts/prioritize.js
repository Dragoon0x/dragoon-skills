#!/usr/bin/env node
const fs=require("fs");
const U={high:["bug","fix","urgent","critical","production"],medium:["review","update","meeting"],low:["plan","explore","research","someday"]};
const I={high:["roadmap","strategy","launch","revenue","core"],medium:["feature","improvement","docs"],low:["cleanup","minor","tweak"]};
function score(task){const l=task.toLowerCase();let u=2,i=2;
if(U.high.some(k=>l.includes(k)))u=3;else if(U.low.some(k=>l.includes(k)))u=1;
if(I.high.some(k=>l.includes(k)))i=3;else if(I.low.some(k=>l.includes(k)))i=1;
const s=u*2+i*3;const q=u>=2&&i>=2?"DO FIRST":u<2&&i>=2?"SCHEDULE":u>=2&&i<2?"DELEGATE":"ELIMINATE";
return{task:task,score:s,quadrant:q}}
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node prioritize.js \"task1; task2\"");process.exit(0)}
let tasks=fs.existsSync(args[0])?fs.readFileSync(args[0],"utf-8").split("\n").filter(Boolean):args[0].split(";").map(t=>t.trim()).filter(Boolean);
const scored=tasks.map(score).sort((a,b)=>b.score-a.score);
console.log("\n| # | Task | Score | Action |\n|---|------|-------|--------|");
scored.forEach((s,i)=>console.log("| "+(i+1)+" | "+s.task+" | "+s.score+" | "+s.quadrant+" |"));