#!/usr/bin/env node
const fs=require("fs"),path=require("path");const F=path.join(process.env.HOME||".",".reading-list.json");
function ld(){return fs.existsSync(F)?JSON.parse(fs.readFileSync(F,"utf-8")):{items:[]}}
function sv(d){fs.writeFileSync(F,JSON.stringify(d,null,2))}
const args=process.argv.slice(2);const cmd=args[0]||"list";const data=ld();
if(cmd==="add"){data.items.push({title:args[1],status:"to-read",added:new Date().toISOString().split("T")[0]});sv(data);console.log("Added: "+args[1])}
else if(cmd==="finish"){const item=data.items.find(i=>i.title.toLowerCase().includes((args[1]||"").toLowerCase()));if(item){item.status="finished";sv(data);console.log("Finished: "+item.title)}}
else{console.log("\nReading List -- "+data.items.length+" items\n");data.items.forEach(i=>console.log("  "+(i.status==="finished"?"[x]":"[ ]")+" "+i.title))}