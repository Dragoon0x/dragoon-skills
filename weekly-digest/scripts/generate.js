#!/usr/bin/env node
const{execSync}=require("child_process");const args=process.argv.slice(2);
let commits=[];try{commits=execSync('git log --since="7 days ago" --pretty=format:"%h|%s|%ai" 2>/dev/null',{encoding:"utf-8"}).split("\n").filter(Boolean).map(l=>{const p=l.split("|");return{hash:p[0],msg:p[1],date:p[2]?p[2].split(" ")[0]:""}})}catch(e){}
console.log("# Weekly Digest\n\nCommits: "+commits.length+"\n");
if(commits.length){const byDate={};commits.forEach(c=>{if(!byDate[c.date])byDate[c.date]=[];byDate[c.date].push(c)});
Object.entries(byDate).sort().reverse().forEach(([d,items])=>{console.log("### "+d);items.forEach(c=>console.log("- "+c.msg));console.log("")})}