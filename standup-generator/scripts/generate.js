#!/usr/bin/env node
const{execSync}=require("child_process");const args=process.argv.slice(2);
let y=[],t=[],b=[];
if(args.includes("--git")){try{y=execSync('git log --since="1 day ago" --pretty=format:"%s" 2>/dev/null',{encoding:"utf-8"}).split("\n").filter(Boolean)}catch(e){y=["(Not in git repo)"]}}
if(args.includes("--yesterday"))y=[args[args.indexOf("--yesterday")+1]];
if(args.includes("--today"))t=[args[args.indexOf("--today")+1]];
if(args.includes("--blocker"))b=[args[args.indexOf("--blocker")+1]];
const d=new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
console.log("# Standup -- "+d+"\n\n## Yesterday");y.forEach(x=>console.log("- "+x));
console.log("\n## Today");(t.length?t:["[Plan]"]).forEach(x=>console.log("- "+x));
console.log("\n## Blockers");(b.length?b:["None"]).forEach(x=>console.log("- "+x));