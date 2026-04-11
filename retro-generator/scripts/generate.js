#!/usr/bin/env node
const F={"start-stop-continue":{name:"Start/Stop/Continue",sec:["Start (what to begin)","Stop (what to quit)","Continue (what works)"]},sailboat:{name:"Sailboat",sec:["Wind (propels us)","Anchor (holds back)","Rocks (risks)","Island (goal)"]},"4ls":{name:"4Ls",sec:["Liked","Learned","Lacked","Longed For"]}};
const args=process.argv.slice(2);if(args.includes("--list")||!args.length){console.log("\nFormats:");Object.entries(F).forEach(([k,v])=>console.log("  "+k+" -- "+v.name));process.exit(0)}
const fk=args.includes("--format")?args[args.indexOf("--format")+1]:"start-stop-continue";
const f=F[fk]||F["start-stop-continue"];
console.log("# Retrospective -- "+f.name+"\n");
f.sec.forEach(s=>{console.log("## "+s+"\n- \n- \n- \n")});
console.log("## Action Items\n- [ ] [Owner] -- [Action]\n");