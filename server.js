const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=process.env.PORT||3000, ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"ChangeMe123!", DATA=path.join(__dirname,"data.json");
function load(){if(!fs.existsSync(DATA))fs.writeFileSync(DATA,JSON.stringify({nextNumber:1,tickets:{},sessions:{}},null,2));return JSON.parse(fs.readFileSync(DATA));}
function save(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2))}
function send(r,s,b,type="application/json"){r.writeHead(s,{"Content-Type":type+"; charset=utf-8","Cache-Control":"no-store"});r.end(type==="application/json"?JSON.stringify(b):b)}
function parse(req){return new Promise((ok,no)=>{let x="";req.on("data",c=>x+=c);req.on("end",()=>{try{ok(x?JSON.parse(x):{})}catch(e){no(e)}})})}
function auth(req,d){let t=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");return t&&d.sessions[t]}
function file(r,f){fs.readFile(f,(e,b)=>e?send(r,404,"Not found","text/plain"):send(r,200,b,path.extname(f)===".html"?"text/html":path.extname(f)===".css"?"text/css":"text/javascript"))}
http.createServer(async(req,res)=>{
 const u=new URL(req.url,"http://"+req.headers.host),d=load();
 if(req.method==="GET"&&u.pathname==="/")return file(res,path.join(__dirname,"public/index.html"));
 if(req.method==="GET"&&u.pathname==="/admin")return file(res,path.join(__dirname,"public/admin.html"));
 if(req.method==="POST"&&u.pathname==="/api/claim"){try{let b=await parse(req),name=String(b.name||"").trim().slice(0,80),phone=String(b.phone||"").trim().slice(0,40);if(!name||!phone)return send(res,400,{ok:false,error:"Name and phone are required."});let old=Object.values(d.tickets).find(t=>t.phone===phone);if(old)return send(res,200,{ok:true,ticket:old.number,existing:true});let n=d.nextNumber++,t={number:"#"+String(n).padStart(4,"0"),name,phone,claimedAt:new Date().toISOString()};d.tickets[n]=t;save(d);return send(res,201,{ok:true,ticket:t.number})}catch(e){return send(res,400,{ok:false,error:"Invalid request"})}}
 if(req.method==="POST"&&u.pathname==="/api/admin/login"){let b=await parse(req);if(String(b.password||"")!==ADMIN_PASSWORD)return send(res,401,{ok:false,error:"Incorrect password"});let t=crypto.randomBytes(32).toString("hex");d.sessions[t]=Date.now();save(d);return send(res,200,{ok:true,token:t})}
 if(req.method==="GET"&&u.pathname==="/api/admin/tickets"){if(!auth(req,d))return send(res,401,{ok:false,error:"Unauthorized"});return send(res,200,{ok:true,tickets:Object.values(d.tickets),nextNumber:d.nextNumber})}
 if(req.method==="POST"&&u.pathname==="/api/admin/reset"){if(!auth(req,d))return send(res,401,{ok:false,error:"Unauthorized"});d.nextNumber=1;d.tickets={};save(d);return send(res,200,{ok:true})}
 if(req.method==="POST"&&u.pathname==="/api/admin/logout"){let t=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");delete d.sessions[t];save(d);return send(res,200,{ok:true})}
 send(res,404,"Not found","text/plain")
}).listen(PORT,()=>console.log("Bayas Kitchen Raffle running on "+PORT));