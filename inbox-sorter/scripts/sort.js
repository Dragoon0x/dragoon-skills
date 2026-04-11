#!/usr/bin/env node
const fs=require("fs");
const C={action:{kw:["please","can you","need","approve","review"],act:"Reply"},meeting:{kw:["meeting","calendar","invite","schedule"],act:"Accept/Decline"},urgent:{kw:["urgent","asap","critical","down"],act:"Handle NOW"},newsletter:{kw:["newsletter","digest","weekly"],act:"Read Later"}};
function cat(s){const l=s.toLowerCase();for(const[k,v]of Object.entries(C))if(v.kw.some(w=>l.includes(w)))return{cat:k,act:v.act};return{cat:"other",act:"Review"}}
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node sort.js \"subj1; subj2\"");process.exit(0)}
let subs=fs.existsSync(args[0])?fs.readFileSync(args[0],"utf-8").split("\n").filter(Boolean):args[0].split(";").map(s=>s.trim()).filter(Boolean);
console.log("\nInbox Sorted\n");
subs.map(s=>({subject:s,...cat(s)})).forEach(s=>console.log("  ["+s.cat+"] "+s.subject+" -> "+s.act));