#!/usr/bin/env node
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node format.js \"observation\" [--type constructive|appreciative|corrective]");process.exit(0)}
const obs=args[0];const type=args.includes("--type")?args[args.indexOf("--type")+1]:"constructive";
console.log("\nFeedback ("+type+")\n\nSituation: "+obs+"\n\nBehavior: [What specifically happened?]\n\nImpact: [Effect on team/outcome?]\n");
if(type!=="appreciative")console.log("Suggestion: [What instead?]\n");