#!/usr/bin/env node
const fs=require("fs"),path=require("path");const F=path.join(process.env.HOME||".",".okr-data.json");
function ld(){return fs.existsSync(F)?JSON.parse(fs.readFileSync(F,"utf-8")):{objectives:[]}}
function sv(d){fs.writeFileSync(F,JSON.stringify(d,null,2))}
const args=process.argv.slice(2);const cmd=args[0]||"summary";const data=ld();
if(cmd==="init"){const title=args[1];const krs=[];for(let i=0;i<args.length;i++)if(args[i]==="--kr"&&args[i+1])krs.push({title:args[i+1],progress:0});data.objectives.push({title:title,keyResults:krs});sv(data);console.log("Created: "+title)}
else if(cmd==="update"){const obj=data.objectives.find(o=>o.title.toLowerCase().includes((args[1]||"").toLowerCase()));const kr=args.includes("--kr")?parseInt(args[args.indexOf("--kr")+1])-1:0;const prog=args.includes("--progress")?parseInt(args[args.indexOf("--progress")+1]):null;if(obj&&prog!==null&&obj.keyResults[kr]){obj.keyResults[kr].progress=prog;sv(data);console.log("Updated: "+prog+"%")}}
else{console.log("\nOKR Summary\n");data.objectives.forEach(obj=>{const avg=obj.keyResults.length?Math.round(obj.keyResults.reduce((s,k)=>s+k.progress,0)/obj.keyResults.length):0;console.log("## "+obj.title+" -- "+avg+"%\n");obj.keyResults.forEach((kr,j)=>console.log("  KR"+(j+1)+": "+kr.title+" ["+kr.progress+"%]"))})}