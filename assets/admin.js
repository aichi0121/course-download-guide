const contentPath = "content/guide.json";
const platforms = document.getElementById("platforms");
const platformTemplate = document.getElementById("platform-template");
const stepTemplate = document.getElementById("step-template");
const linkTemplate = document.getElementById("link-template");
const status = document.getElementById("status");
let sourceSha = "";

function addStep(container, value = "") {
  const step = stepTemplate.content.cloneNode(true);
  const row = step.querySelector(".step");
  row.querySelector("textarea").value = value;
  row.querySelector("button").addEventListener("click", () => row.remove());
  container.appendChild(step);
}
function addLink(container, link = { label: "", url: "" }) {
  const item = linkTemplate.content.cloneNode(true);
  const row = item.querySelector(".link-row"); const inputs = row.querySelectorAll("input");
  inputs[0].value = link.label || ""; inputs[1].value = link.url || "";
  row.querySelector("button").addEventListener("click", () => row.remove());
  container.appendChild(item);
}

function addPlatform(platform = { name: "", label: "", description: "", url: "", linkLabel: "", steps: [] }) {
  const item = platformTemplate.content.cloneNode(true);
  const card = item.querySelector(".platform");
  const set = (field, value = "") => { const input = card.querySelector(`[data-field="${field}"]`); input.value = value; };
  set("name", platform.name); set("label", platform.label); set("description", platform.description); set("url", platform.url); set("linkLabel", platform.linkLabel);
  const linkList = card.querySelector(".link-list");
  (platform.links || (platform.download ? [platform.download] : [])).forEach(link => addLink(linkList, link));
  const list = card.querySelector(".step-list");
  (platform.steps || []).forEach(value => addStep(list, value));
  card.querySelector(".add-step").addEventListener("click", () => addStep(list));
  card.querySelector(".add-link").addEventListener("click", () => addLink(linkList));
  card.querySelector(".remove").addEventListener("click", () => card.remove());
  platforms.appendChild(item);
}

function collect() {
  return {
    introTitle: document.querySelector('[name="introTitle"]').value.trim(),
    introText: document.querySelector('[name="introText"]').value.trim(),
    platforms: [...platforms.querySelectorAll(".platform")].map(card => {
      const value = field => card.querySelector(`[data-field="${field}"]`).value.trim();
      const links = [...card.querySelectorAll(".link-row")].map(row => { const inputs = row.querySelectorAll("input"); return { label: inputs[0].value.trim(), url: inputs[1].value.trim() }; }).filter(link => link.label && link.url);
      return { name: value("name"), label: value("label"), description: value("description"), url: value("url"), linkLabel: value("linkLabel"), steps: [...card.querySelectorAll(".step textarea")].map(input => input.value.trim()).filter(Boolean), ...(links.length ? { links } : {}) };
    })
  };
}

async function load() {
  const response = await fetch(contentPath, { cache: "no-store" });
  const data = await response.json();
  document.querySelector('[name="introTitle"]').value = data.introTitle;
  document.querySelector('[name="introText"]').value = data.introText;
  data.platforms.forEach(addPlatform);
  const github = await fetch("https://api.github.com/repos/aichi0121/course-download-guide/contents/content/guide.json");
  if (github.ok) sourceSha = (await github.json()).sha;
}

document.getElementById("add-platform").addEventListener("click", () => addPlatform());
document.getElementById("editor").addEventListener("submit", async event => {
  event.preventDefault(); status.className = ""; status.textContent = "";
  const token = document.getElementById("token").value.trim();
  if (!token) { status.className = "failure"; status.textContent = "請先貼上 GitHub 存取權杖。"; return; }
  const button = document.getElementById("publish"); button.disabled = true; button.textContent = "發布中…";
  try {
    const text = JSON.stringify(collect(), null, 2) + "\n";
    const content = btoa(unescape(encodeURIComponent(text)));
    const response = await fetch("https://api.github.com/repos/aichi0121/course-download-guide/contents/content/guide.json", { method: "PUT", headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Update course guide content", content, sha: sourceSha }) });
    if (!response.ok) throw new Error((await response.json()).message || "發布失敗");
    sourceSha = (await response.json()).content.sha;
    status.className = "success"; status.textContent = "已發布。約一分鐘後，公開頁會顯示新內容。";
  } catch (error) { status.className = "failure"; status.textContent = `無法發布：${error.message}`; }
  finally { button.disabled = false; button.textContent = "發布更新"; }
});
load().catch(() => { status.className = "failure"; status.textContent = "無法載入現有內容，請重新整理。"; });
