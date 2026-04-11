#!/usr/bin/env node
const T={formal:{g:"Dear",c:"Best regards,"},friendly:{g:"Hi",c:"Cheers,"},direct:{g:"Hi",c:"Thanks,"},diplomatic:{g:"Hi",c:"Thank you for understanding,"}};
const args=process.argv.slice(2);if(!args.length){console.log("Usage: node draft.js \"situation\" [--tone formal|friendly|direct|diplomatic]");process.exit(0)}
const sit=args[0],tone=args.includes("--tone")?args[args.indexOf("--tone")+1]:"friendly";
const t=T[tone]||T.friendly;
console.log("\n  Email Draft -- "+tone+"\n\n  Situation: "+sit+"\n\n  "+t.g+" [Name],\n\n  [Draft body]\n\n  "+t.c+"\n  [Your name]\n");