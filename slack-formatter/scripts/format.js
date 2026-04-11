#!/usr/bin/env node
const fs=require("fs");const args=process.argv.slice(2);if(!args.length){console.log("Usage: node format.js \"text\" [--type announcement|status] [--convert]");process.exit(0)}
let text=args[0];if(fs.existsSync(text))text=fs.readFileSync(text,"utf-8");
if(args.includes("--convert"))text=text.replace(/^#+\s+(.+)$/gm,"*$1*").replace(/\*\*(.+?)\*\*/g,"*$1*").replace(/^-\s/gm,"\u2022 ");
const type=args.includes("--type")?args[args.indexOf("--type")+1]:null;
if(type==="announcement")text=":mega: *Announcement*\n\n"+text;
else if(type==="status")text=":white_check_mark: *Status*\n\n"+text;
console.log("\n"+text+"\n");