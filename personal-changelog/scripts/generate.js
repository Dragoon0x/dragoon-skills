#!/usr/bin/env node
const{execSync}=require("child_process");const args=process.argv.slice(2);
let shipped=[];if(args.includes("--git")){try{shipped=execSync('git log --since="7 days ago" --pretty=format:"%s" 2>/dev/null',{encoding:"utf-8"}).split("\n").filter(Boolean)}catch(e){shipped=["(Not in git repo)"]}}
if(args.includes("--manual"))shipped.push(...args[args.indexOf("--manual")+1].split(";").map(s=>s.trim()));
console.log("# Changelog -- "+new Date().toLocaleDateString("en-US",{month:"long",day:"numeric"})+"\n");
if(shipped.length){console.log("## Shipped");shipped.forEach(s=>console.log("- "+s));console.log("")}
console.log("## Next Week\n- [Fill in]\n");