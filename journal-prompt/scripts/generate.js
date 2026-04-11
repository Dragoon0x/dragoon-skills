#!/usr/bin/env node
const M=["What would make today great?","What am I grateful for?","What did I learn yesterday?","If I could only accomplish one thing today, what?","What am I avoiding?","Who can I help today?","What would make me proud at end of today?"];
const E=["What went well today?","What did I struggle with?","What would I do differently?","Who made a positive impact?","What did I create today?","What am I looking forward to tomorrow?","What surprised me?"];
const args=process.argv.slice(2);const isEve=args.includes("--evening")||new Date().getHours()>=17;
const count=args.includes("--count")?parseInt(args[args.indexOf("--count")+1]):3;
const pool=isEve?E:M;const shuffled=[...pool].sort(()=>Math.random()-0.5).slice(0,count);
console.log("\nJournal Prompts -- "+(isEve?"Evening":"Morning")+"\n");
shuffled.forEach((p,i)=>console.log((i+1)+". "+p+"\n"));