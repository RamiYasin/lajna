(() => {
  "use strict";

  const config = window.SUPABASE_CONFIG || {};
  const toast = document.getElementById("toast");
  let toastTimer;
  let supabase = null;
  let sectors = [];
  let members = [];
  let eliteMembers = [];

  const $ = (id) => document.getElementById(id);
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  async function copyText(text, message = "تم النسخ للحافظة بنجاح") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    showToast(message);
  }

  function setStatusText(element, status, activeText, inactiveText) {
    if (!element) return;
    const active = status === "active";
    element.className = `status-toggle-btn ${active ? "active" : "stopped"}`;
    element.innerHTML = `<span class="dot"></span><span>${active ? activeText : inactiveText}</span>`;
  }

  function renderSectors() {
    const container = $("sectorsContainer");
    if (!container) return;
    container.replaceChildren();

    const count = document.querySelector("#sectors .gold-note");
    if (count) count.textContent = `${sectors.length} قطاعات مسجلة`;

    if (!sectors.length) {
      container.textContent = "لا توجد قطاعات مسجلة في قاعدة البيانات";
      return;
    }

    sectors.forEach(sector => {
      const active = sector.status === "active";
      const review = sector.status === "under_review";
      const card = document.createElement("div");
      card.className = "sector-card";
      const name = document.createElement("span");
      name.className = "sector-name";
      name.textContent = sector.sector_name || "قطاع بدون اسم";
      const status = document.createElement("span");
      status.className = `sector-btn ${active ? "open" : "locked"}`;
      status.innerHTML = `<span class="dot"></span><span>${active ? "مفعل" : review ? "تحت المراقبة" : "متوقف"}</span>`;
      card.append(name, status);
      container.appendChild(card);
    });

    const select = $("fwSector");
    if (select) {
      const previous = select.value;
      select.innerHTML = '<option value="">اختر القطاع</option>';
      sectors.filter(s => s.status === "active").forEach(sector => {
        const option = document.createElement("option");
        option.value = sector.id;
        option.textContent = sector.sector_name;
        option.dataset.mention = sector.discord_mention || "";
        select.appendChild(option);
      });
      if ([...select.options].some(o => o.value === previous)) select.value = previous;
      select.dispatchEvent(new Event("change"));
    }
  }

  function renderMembers() {
    const container = $("membersContainer");
    if (!container) return;
    container.replaceChildren();
    if (!members.length) {
      container.textContent = "لا يوجد أعضاء مسجلون حالياً";
      return;
    }

    members.forEach((member, index) => {
      const row = document.createElement("div");
      row.className = "member-row";
      const num = document.createElement("div");
      num.className = "member-num";
      num.textContent = String(index + 1);
      const name = document.createElement("div");
      name.className = "member-readonly";
      name.textContent = member.member_name || "—";
      const mention = document.createElement("div");
      mention.className = "member-readonly";
      mention.textContent = member.mention || "—";
      const sector = document.createElement("div");
      sector.className = "member-readonly";
      sector.textContent = member.sector || "—";
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const copy = document.createElement("button");
      copy.className = "btn-sm btn-copy-sm";
      copy.type = "button";
      copy.textContent = "نسخ";
      copy.addEventListener("click", () => copyText(
        `\`عضو لجنة التفتيش:\` ${member.mention || ""} | القطاع: **${member.sector || ""}**`,
        "تم نسخ بيانات العضو"
      ));
      actions.appendChild(copy);
      row.append(num, name, mention, sector, actions);
      container.appendChild(row);
    });
  }

  function renderInspectorChecklist() {
    const container = $("fwInspectorsList");
    if (!container) return;
    container.replaceChildren();

    const groups = [
      { title: "أعضاء اللجنة", items: members, kind: "member" },
      { title: "أعضاء النخبة", items: eliteMembers, kind: "elite" }
    ];

    let rendered = 0;
    groups.forEach(group => {
      if (!group.items.length) return;

      const heading = document.createElement("div");
      heading.className = "fw-checklist-heading";
      heading.textContent = group.title;
      container.appendChild(heading);

      group.items.forEach((person, index) => {
        rendered++;
        const label = document.createElement("label");
        label.className = "fw-check-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "fwInspector";
        checkbox.value = `${group.kind}:${person.id || index}`;
        checkbox.dataset.memberName = person.member_name || "";
        checkbox.dataset.mention = person.mention || "";
        checkbox.dataset.kind = group.kind;

        const displayName = person.member_name || person.mention || `عضو ${index + 1}`;
        const details = group.kind === "elite" && person.role
          ? `${displayName} — ${person.role}`
          : displayName;
        const text = document.createElement("span");
        text.textContent = person.mention ? `${details} — ${person.mention}` : details;

        checkbox.addEventListener("change", () => { updateFieldworkPreview(); updateDecisionPreview(); });
        label.append(checkbox, text);
        container.appendChild(label);
      });
    });

    if (!rendered) {
      const empty = document.createElement("p");
      empty.className = "fw-checklist-empty";
      empty.textContent = "لا توجد أسماء متاحة للاختيار";
      container.appendChild(empty);
    }
  }

  function getSelectedInspectors() {
    return [...document.querySelectorAll('#fwInspectorsList input[name="fwInspector"]:checked')]
      .map(input => input.dataset.mention || input.dataset.memberName)
      .filter(Boolean)
      .join("\\n");
  }

  function renderElite() {
    const container = $("eliteContainer");
    if (!container) return;
    container.replaceChildren();
    if (!eliteMembers.length) {
      container.textContent = "لا يوجد أعضاء نخبة مسجلون حالياً";
      return;
    }

    eliteMembers.forEach((member, index) => {
      const row = document.createElement("div");
      row.className = "member-row";
      const num = document.createElement("div");
      num.className = "member-num";
      num.textContent = String(index + 1);
      const name = document.createElement("div");
      name.className = "member-readonly";
      name.textContent = member.member_name || "—";
      const mention = document.createElement("div");
      mention.className = "member-readonly";
      mention.textContent = member.mention || "—";
      const role = document.createElement("div");
      role.className = "member-readonly";
      role.textContent = member.role || "—";
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const copy = document.createElement("button");
      copy.className = "btn-sm btn-copy-sm";
      copy.type = "button";
      copy.textContent = "نسخ";
      copy.addEventListener("click", () => copyText(
        `\`عضو النخبة:\` ${member.mention || ""} | الصفة: **${member.role || ""}**`,
        "تم نسخ بيانات العضو"
      ));
      actions.appendChild(copy);
      row.append(num, name, mention, role, actions);
      container.appendChild(row);
    });
  }

  async function loadTable(table, columns, orderColumn = "sort_order") {
    const { data, error } = await supabase.from(table).select(columns).order(orderColumn, { ascending: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    return data || [];
  }

  async function loadAllData() {
    if (!supabase) return;
    const sectorBox = $("sectorsContainer");
    const memberBox = $("membersContainer");
    const eliteBox = $("eliteContainer");
    if (sectorBox) sectorBox.textContent = "جاري تحميل القطاعات...";
    if (memberBox) memberBox.textContent = "جاري تحميل الأعضاء...";
    if (eliteBox) eliteBox.textContent = "جاري تحميل أعضاء النخبة...";

    const results = await Promise.allSettled([
      loadTable("sectors", "id, sector_name, discord_mention, status, sort_order"),
      loadTable("members", "id, member_name, mention, sector, sort_order"),
      loadTable("elite_members", "id, member_name, mention, role, sort_order")
    ]);

    if (results[0].status === "fulfilled") {
      sectors = results[0].value;
      renderSectors();
    } else if (sectorBox) {
      sectorBox.textContent = "تعذر تحميل القطاعات. تحقق من إعدادات القراءة العامة (RLS).";
      console.error(results[0].reason);
    }

    if (results[1].status === "fulfilled") {
      members = results[1].value;
      renderMembers();
      renderInspectorChecklist();
      updateDecisionPreview();
    } else if (memberBox) {
      memberBox.textContent = "تعذر تحميل الأعضاء. تحقق من إعدادات القراءة العامة (RLS).";
      renderInspectorChecklist();
      updateDecisionPreview();
      console.error(results[1].reason);
    }

    if (results[2].status === "fulfilled") {
      eliteMembers = results[2].value;
      renderElite();
      renderInspectorChecklist();
      updateDecisionPreview();
    } else if (eliteBox) {
      eliteBox.textContent = "تعذر تحميل أعضاء النخبة. تحقق من إعدادات القراءة العامة (RLS).";
      renderInspectorChecklist();
      console.error(results[2].reason);
    }
  }

  function formatDiscordDate(value) {
    if (!value) return "";
    // Date inputs return YYYY-MM-DD; Discord template uses YYYY\MM\DD.
    const parts = value.split("-");
    return parts.length === 3 ? `${parts[0]}\\${parts[1]}\\${parts[2]}` : value;
  }

  function updateFieldworkPreview() {
    const ids = ["fwScore1", "fwScore2", "fwScore3", "fwScore4", "fwScore5"];
    const maxes = [25, 20, 20, 15, 20];
    const labels = ["الانضباط العسكري", "النشاط والتفاعل", "الالتزام بالأوامر", "أداء القيادة", "جودة السيناريوهات"];
    const scores = ids.map((id, i) => {
      const input = $(id);
      const value = Math.max(0, Math.min(maxes[i], Number(input?.value || 0)));
      if (input) input.value = value;
      return value;
    });
    const total = scores.reduce((a, b) => a + b, 0);
    if ($("totalScoreDisplay")) $("totalScoreDisplay").textContent = `النتيجة النهائية: ${total}/100`;

    const select = $("fwSector");
    const selected = select?.selectedOptions?.[0];
    const sectorName = selected?.textContent && selected.value ? selected.textContent : "";
    const sectorMention = selected?.dataset?.mention || "";
    const sectorText = [sectorName, sectorMention].filter(Boolean).join(" ");
    const inspectors = getSelectedInspectors();
    const today = formatDiscordDate($("fwTodayDate")?.value || "");
    const inspectionDate = formatDiscordDate($("fwInspectDate")?.value || "");
    const negatives = $("fwNegatives")?.value?.trim() || "لا توجد";
    const positives = $("fwPositives")?.value?.trim() || "لا توجد";

    const report = [
      "**`﷽̲ `**",
      "**السلام عليكم ورحمة الله وبركاته اما بعد**",
      `**تاريخ اليوم ${today}**`,
      "",
      "** <:3_:1376702691094429767> ` لجنة الرقابة والانضباط الوزارية لوزارة الدفاع ` <:3_:1376702691094429767> **",
      "",
      `\`اسم القطاع: ${sectorText}\``,
      "",
      `\`تاريخ التفتيش: ${inspectionDate}\``,
      "",
      `\`اعضاء لجنة التفتيش:\``,
      inspectors || "لم يتم اختيار أعضاء",
      "",
      "**درجات التقييم**",
      "",
      ...scores.map((score, i) => `\`${labels[i]}: ${score}/${maxes[i]}\``),
      "",
      "`معايير التقييم :`",
      `**الإيجابيات:** ${positives}`,
      `**السلبيات:** ${negatives}`,
      "",
      `**النتيجة النهائية: ${total}/100**`,
      "",
      "`ملاحظة` **نتمنى منهم تأدية الواجب بالشكل الصحيح لعدم تجميد صلاحياتهم**",
      "",
      "||@here||"
    ].join("\n");

    if ($("fwPreview")) $("fwPreview").textContent = report;
    return report;
  }

  function updateDecisionPreview() {
    const selectedPeople = [...document.querySelectorAll('#fwInspectorsList input[name="fwInspector"]:checked')];
    const roster = selectedPeople.map(input => {
      const mention = input.dataset.mention || input.dataset.memberName || "";
      const person = members.concat(eliteMembers).find(item =>
        (item.mention || "") === (input.dataset.mention || "") &&
        (item.member_name || "") === (input.dataset.memberName || "")
      );
      const sector = person?.sector || person?.role || "";
      return `\`عضو لجنة التفتيش:\`\n${mention}${sector ? ` (${sector})` : ""}`;
    }).join("\n");

    const report = [
      "**`﷽̲ `**",
      "**السلام عليكم ورحمة الله وبركاته اما بعد**",
      "",
      "** <:3_:1376702691094429767> ` لجنة الرقابة والانضباط الوزارية لوزارة الدفاع ` <:3_:1376702691094429767> **",
      "",
      roster || "لم يتم اختيار أعضاء",
      "",
      "||@here||"
    ].join("\n");

    if ($("genPreview")) $("genPreview").textContent = report;
    return report;
  }

  function initBackground() {
    const canvas = $("bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, dots = [];
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      dots = Array.from({ length: Math.min(65, Math.floor(w / 22)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.5 + .4, v: Math.random() * .22 + .05
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      dots.forEach(p => {
        p.y -= p.v;
        if (p.y < 0) { p.y = h; p.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56,189,248,.28)";
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  function init() {
    // Website is intentionally read-only: there are no Supabase INSERT/UPDATE/DELETE calls.
    document.querySelectorAll("#addMemberBtn,#addEliteBtn,#uploadLogo,#uploadSquad").forEach(el => el?.remove());
    const squadStatus = $("squadStatusBtn");
    if (squadStatus) {
      squadStatus.replaceWith(Object.assign(document.createElement("div"), {
        id: "squadStatusBtn", className: "status-toggle-btn active",
        innerHTML: '<span class="dot"></span><span id="squadStatusText">الحالة الميدانية: للعرض فقط</span>'
      }));
    }

    const today = new Date().toISOString().slice(0, 10);
    if ($("fwTodayDate") && !$("fwTodayDate").value) $("fwTodayDate").value = today;
    if ($("fwInspectDate") && !$("fwInspectDate").value) $("fwInspectDate").value = today;

    ["copyCharterHero", "copyCharterBtn"].forEach(id => $(id)?.addEventListener("click", () => {
      const text = $("charter")?.innerText || "";
      copyText(text, "تم نسخ الصلاحيات");
    }));

    $("copyMembersBtn")?.addEventListener("click", () => copyText(
      members.map((m, i) => `${i + 1}. ${m.member_name || ""} ${m.mention || ""} | ${m.sector || ""}`).join("\n"),
      "تم نسخ تشكيل الأعضاء"
    ));
    $("copyEliteBtn")?.addEventListener("click", () => copyText(
      eliteMembers.map((m, i) => `${i + 1}. ${m.member_name || ""} ${m.mention || ""} | ${m.role || ""}`).join("\n"),
      "تم نسخ قائمة النخبة"
    ));

    document.querySelectorAll(".fw-input").forEach(el => el.addEventListener("input", updateFieldworkPreview));
    $("fwSector")?.addEventListener("change", updateFieldworkPreview);
    document.querySelectorAll(".gen-input").forEach(el => el.addEventListener("input", updateDecisionPreview));
    $("copyFwBtn")?.addEventListener("click", () => copyText(updateFieldworkPreview(), "تم نسخ تقرير التفتيش"));
    $("copyGenBtn")?.addEventListener("click", () => copyText(updateDecisionPreview(), "تم نسخ القرار"));
    updateFieldworkPreview();
    updateDecisionPreview();
    initBackground();

    if (!config.url || !config.anonKey || config.anonKey.includes("PASTE_YOUR")) {
      const message = "أضف Supabase Publishable/anon key داخل config.js لإظهار البيانات.";
      ["sectorsContainer", "membersContainer", "eliteContainer"].forEach(id => { if ($(id)) $(id).textContent = message; });
      console.warn(message);
      return;
    }

    if (!window.supabase?.createClient) {
      showToast("تعذر تحميل مكتبة Supabase");
      return;
    }
    supabase = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    loadAllData().catch(error => {
      console.error(error);
      showToast("تعذر تحميل البيانات من Supabase");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
