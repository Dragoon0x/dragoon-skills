#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const DECISION_RE=[/(?:decided|agreed|decision|going to|approved|confirmed)\s+(?:to\s+)?(.+)/gi,/^\s*decision:\s*(.+)/gmi];
const ACTION_RE=[/(?:action|todo|task|follow-?up):\s*(.+)/gi,/@(\w+)\s+(?:will|should|to)\s+(.+)/gi,/^\s*\[\s*\]\s+(.+)/gm];
const QUESTION_RE=[/(?:question|open item|tbd):\s*(.+)/gi,/(.+\?)\s*$/gm];
function extract(text,patterns){const items=[];patterns.forEach(p=>{let m;const re=new RegExp(p.source,p.flags);while((m=re.exec(text))!==null){const item=(m[2]||m[1]).trim();if(item.length>5&&item.length<300)items.push(item)}});return[...new Set(items)]}
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node process.js <file|-> [--output file]");process.exit(0)}
let text=args[0]==="-"?fs.readFileSync(0,"utf-8"):fs.readFileSync(args[0],"utf-8");
const title=args.includes("--title")?args[args.indexOf("--title")+1]:"Meeting Notes";
const date=new Date().toISOString().split("T")[0];
const d=extract(text,DECISION_RE),a=extract(text,ACTION_RE),q=extract(text,QUESTION_RE);
let md="# "+title+" -- "+date+"\n\n";
if(d.length){md+="## Decisions\n";d.forEach(x=>{md+="- "+x+"\n"});md+="\n"}
if(a.length){md+="## Action Items\n";a.forEach(x=>{md+="- [ ] "+x+"\n"});md+="\n"}
if(q.length){md+="## Open Questions\n";q.forEach(x=>{md+="- "+x+"\n"});md+="\n"}
const out=args.includes("--output")?args[args.indexOf("--output")+1]:null;
if(out){fs.writeFileSync(out,md);console.log("Written to "+out)}else console.log(md);
console.log("Extracted: "+d.length+" decisions, "+a.length+" actions, "+q.length+" questions");