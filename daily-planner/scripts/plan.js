#!/usr/bin/env node
const date=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const args=process.argv.slice(2);const isEve=args.includes("--evening");
const tasks=(args.includes("--tasks")?args[args.indexOf("--tasks")+1]:"").split(";").map(t=>t.trim()).filter(Boolean);
if(isEve){console.log("# Evening Review -- "+date+"\n\n## Completed\n- \n\n## Energy [1-5]\n- Morning:\n- Afternoon:\n\n## Learned\n- \n\n## Gratitude\n- \n")}
else{console.log("# Daily Plan -- "+date+"\n\n## Top 3\n1. "+(tasks[0]||"[Priority 1]")+"\n2. "+(tasks[1]||"[Priority 2]")+"\n3. "+(tasks[2]||"[Priority 3]")+"\n\n## Schedule\n| Time | Task |\n|------|------|\n| 09-10:30 | Deep work |\n| 10:45-12 | Deep work |\n| 12-13 | Lunch |\n| 13-15 | Meetings |\n| 15-16:30 | Admin |\n| 16:30-17 | Wrap up |\n")}