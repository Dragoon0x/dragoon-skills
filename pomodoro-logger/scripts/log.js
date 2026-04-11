#!/usr/bin/env node
const fs=require("fs"),path=require("path");const F=path.join(process.env.HOME||".",".pomodoro-log.json");
function ld(){return fs.existsSync(F)?JSON.parse(fs.readFileSync(F,"utf-8")):{sessions:[],active:null}}
function sv(d){fs.writeFileSync(F,JSON.stringify(d,null,2))}
const args=process.argv.slice(2);const cmd=args[0]||"summary";const log=ld();const now=new Date();
if(cmd==="start"){log.active={task:args.slice(1).join(" ")||"Untitled",start:now.toISOString()};sv(log);console.log("Started: "+log.active.task)}
else if(cmd==="stop"){if(!log.active){console.log("No active session.");process.exit(0)}const dur=Math.round((now-new Date(log.active.start))/60000);log.sessions.push({task:log.active.task,date:now.toISOString().split("T")[0],duration:dur});console.log("Done: "+log.active.task+" ("+dur+"min)");log.active=null;sv(log)}
else{const today=log.sessions.filter(s=>s.date===now.toISOString().split("T")[0]);console.log("\nToday: "+today.length+" sessions, "+today.reduce((s,x)=>s+x.duration,0)+"min");today.forEach(s=>console.log("  - "+s.task+" ("+s.duration+"min)"))}