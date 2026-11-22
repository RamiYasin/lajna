// خادم استقبال الطلبات وإرسالها إلى قناة Discord عبر Webhook.
// ضع رابط Webhook في متغير البيئة DISCORD_WEBHOOK_URL ولا تضعه في ملفات المتصفح.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const ROOT = __dirname;
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".jpg":"image/jpeg", ".png":"image/png" };

function send(res, status, body) {
  res.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" });
  res.end(JSON.stringify(body));
}
function clean(value, max=500) {
  return String(value || "").trim().slice(0, max).replace(/@everyone/g, "@ everyone").replace(/@here/g, "@ here");
}
async function handleApplication(req, res) {
  let raw = "";
  req.on("data", chunk => { raw += chunk; if (raw.length > 20000) req.destroy(); });
  req.on("end", async () => {
    try {
      if (!WEBHOOK) return send(res, 503, { message:"لم يتم إعداد قناة Discord بعد." });
      const d = JSON.parse(raw || "{}");
      const fields = [
        ["الاسم الرباعي", clean(d.fullName, 120)],
        ["رقم الهوية / الرقم العسكري", clean(d.nationalId, 10)],
        ["الرتبة / المرتبة الوظيفية", clean(d.rank, 100)],
        ["الجهة / الإدارة", clean(d.department, 150)],
        ["الزي العسكري", clean(d.uniform, 100)],
        ["سنوات الخبرة", clean(d.experience, 80)],
        ["المؤهلات والدورات", clean(d.qualifications, 900)]
      ];
      if (fields.some(([,v]) => !v) || !/^\d{10}$/.test(fields[1][1]) || d.agreement !== "on") {
        return send(res, 400, { message:"يرجى التأكد من تعبئة جميع الحقول بشكل صحيح والموافقة على الإقرار." });
      }
      const reference = "APP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const embed = {
        title: "طلب التحاق جديد باللجنة",
        description: `رقم الطلب المرجعي: **${reference}**`,
        color: 0xCBA24C,
        fields: fields.map(([name,value]) => ({ name, value: value.slice(0, 1024), inline: false })),
        footer: { text: "بوابة التقديم الإلكترونية · يرجى التعامل مع البيانات بسرية" },
        timestamp: new Date().toISOString()
      };
      const discordResponse = await fetch(WEBHOOK, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ username:"بوابة التقديم", embeds:[embed], allowed_mentions:{parse:[]} })
      });
      if (!discordResponse.ok) {
        console.error("Discord webhook error:", discordResponse.status);
        return send(res, 502, { message:"تعذر تسليم الطلب إلى قناة Discord. يرجى المحاولة لاحقاً." });
      }
      return send(res, 200, { ok:true, reference });
    } catch (err) {
      console.error(err);
      return send(res, 400, { message:"تعذر قراءة بيانات الطلب." });
    }
  });
}

const server = http.createServer((req,res) => {
  if (req.method === "POST" && req.url === "/api/applications") return handleApplication(req,res);
  if (req.method !== "GET" && req.method !== "HEAD") return send(res,405,{message:"طريقة الطلب غير مدعومة"});
  let requested = decodeURIComponent((req.url || "/").split("?")[0]);
  if (requested === "/") requested = "/index.html";
  const file = path.resolve(ROOT, "." + requested);
  if (!file.startsWith(ROOT + path.sep)) return send(res,403,{message:"ممنوع"});
  fs.readFile(file,(err,content)=>{
    if(err) return send(res,404,{message:"الصفحة غير موجودة"});
    res.writeHead(200,{"Content-Type":MIME[path.extname(file)] || "application/octet-stream"});
    res.end(req.method === "HEAD" ? undefined : content);
  });
});
server.listen(PORT,()=>console.log(`Portal running on http://localhost:${PORT}`));
