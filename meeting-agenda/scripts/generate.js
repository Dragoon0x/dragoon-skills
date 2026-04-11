#!/usr/bin/env node
const args=process.argv.slice(2);const title=args[0]||"Meeting";
const dur=args.includes("--duration")?parseInt(args[args.indexOf("--duration")+1]):30;
const topics=(args.includes("--topics")?args[args.indexOf("--topics")+1]:"Topic 1;Topic 2").split(";").map(t=>t.trim()).filter(Boolean);
const perTopic=Math.floor((dur-5)/topics.length);
console.log("# "+title+"\n\nDuration: "+dur+"min\n\n| Time | Topic |\n|------|-------|");
let c=0;console.log("| +0min | Welcome (2min) |");c=2;
topics.forEach(t=>{console.log("| +"+c+"min | "+t+" ("+perTopic+"min) |");c+=perTopic});
console.log("| +"+c+"min | Action items (3min) |\n\n## Actions\n- [ ] [Owner] -- [Action]\n");