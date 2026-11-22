// وجهات الأنظمة داخل مجلد المشروع
const SYSTEM_URLS = {
  admin: "./HQ/index.html",       // النظام الموجود داخل مجلد HQ
  apply: "./apply/index.html"     // نظام التقديم
};

const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
document.querySelectorAll("[data-system]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const target = SYSTEM_URLS[link.dataset.system];
    if (target) window.location.href = target;
    else showToast("تعذر العثور على النظام المطلوب.");
  });
});
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }));
}
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
