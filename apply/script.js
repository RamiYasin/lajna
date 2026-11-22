// رابط قناة استقبال طلبات التقديم
const DISCORD_CHANNEL_URL = "https://discord.com/channels/1545780494271258655/1574078972034289764";

const form = document.getElementById("applicationForm");
const submitButton = document.getElementById("submitButton");
const messageBox = document.getElementById("formMessage");
document.getElementById("year").textContent = new Date().getFullYear();

function keepDigitsOnly(input) {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
  });
}
keepDigitsOnly(document.getElementById("discordId"));
keepDigitsOnly(document.getElementById("nationalId"));

function getDiscordChannelLinks(url) {
  const match = String(url).trim().match(
    /^https:\/\/(?:www\.)?discord\.com\/channels\/(\d+)\/(\d+)(?:\/\d+)?\/?$/i
  );
  if (!match) return null;
  const [, guildId, channelId] = match;
  return {
    app: `discord://-/channels/${guildId}/${channelId}`,
    web: `https://discord.com/channels/${guildId}/${channelId}`
  };
}

function getDiscordMessage(data) {
  return `**(ا <@&1568305164480286920> ا)** 

**  نبارك لك القبول مبدئياً في لجنة الرقابة والانضباط الوزارية لوزارة الدفاع. :military_medal:  **

**اسم المتقدم: ** <@${data.discordId}>

**رقم الايدي: ** ${data.nationalId}

**الرتبة / المرتبة الوظيفية: ** ${data.rank}

**القطاع: ** ${data.department}

**اليونت العسكري: ** ${data.uniform}

**سنوات الخبرة في المجال الإداري أو القانوني : ** ${data.experience}

**الخبرات العسكرية والدورات ذات الصلة: ** ${data.qualifications}

**عليك مراجة **

(https://discord.com/channels/1258337314388705291/1263721586557718578/1340350745131749416)

(https://discord.com/channels/1255258917676515338/1372622776376234034)


||@here||`;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  if (!copied) throw new Error("تعذر نسخ الرسالة. افتح الموقع عبر HTTPS ثم حاول مجدداً.");
}

function showDiscordFallback(links) {
  messageBox.innerHTML = "";
  const text = document.createElement("p");
  text.textContent = "تم نسخ الطلب. إذا لم يفتح تطبيق Discord تلقائياً، استخدم أحد الرابطين:";
  const appLink = document.createElement("a");
  appLink.href = links.app;
  appLink.textContent = "فتح تطبيق Discord";
  appLink.className = "discord-fallback-link";
  const webLink = document.createElement("a");
  webLink.href = links.web;
  webLink.target = "_blank";
  webLink.rel = "noopener noreferrer";
  webLink.textContent = "فتح القناة في المتصفح";
  webLink.className = "discord-fallback-link secondary";
  messageBox.append(text, appLink, webLink);
  messageBox.className = "form-message success";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageBox.className = "form-message";
  messageBox.textContent = "";
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form).entries());
  if (!/^\d+$/.test(data.discordId) || !/^\d+$/.test(data.nationalId)) {
    messageBox.className = "form-message error";
    messageBox.textContent = "تأكد من إدخال Discord ID ورقم الهوية/العسكري بالأرقام فقط.";
    return;
  }

  const links = getDiscordChannelLinks(DISCORD_CHANNEL_URL);
  if (!links) {
    messageBox.className = "form-message error";
    messageBox.textContent = "رابط قناة Discord غير صالح. تأكد من وضع رابط القناة الكامل.";
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "جارٍ تجهيز رسالة Discord...";

  try {
    await copyText(getDiscordMessage(data));
    messageBox.className = "form-message success";
    messageBox.textContent = "تم نسخ طلبك. جارٍ محاولة فتح تطبيق Discord...";

    // Navigate directly to the registered Discord protocol handler.
    // Avoid creating an about:blank tab, which can remain as a white page.
    window.location.assign(links.app);

    // Provide explicit user-click fallbacks in case the browser blocks the app protocol.
    window.setTimeout(() => showDiscordFallback(links), 1200);
    form.reset();
  } catch (error) {
    messageBox.className = "form-message error";
    messageBox.textContent = error.message || "تعذر نسخ الرسالة. يرجى المحاولة مرة أخرى.";
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "اعتماد وإرسال طلب التقديم";
  }
});
