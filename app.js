const STORAGE_KEY = "promptLibrary.prompts";

function loadPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load prompts", e);
    return [];
  }
}

function savePrompts(prompts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function createPromptObject(title, content) {
  return {
    id: Date.now().toString(),
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
}

function previewText(text, words = 15) {
  if (!text) return "";
  const w = text.trim().split(/\s+/).slice(0, words).join(" ");
  return text.trim().length > w.length ? w + "…" : w;
}

function renderPrompts() {
  const container = document.getElementById("prompts-container");
  container.innerHTML = "";
  const prompts = loadPrompts();

  if (prompts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML =
      '<div class="title">No prompts saved</div><div class="preview">Use the form to the left to save a prompt to local storage.</div>';
    container.appendChild(empty);
    return;
  }

  // reverse so newest first
  prompts
    .slice()
    .reverse()
    .forEach((p) => {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = p.id;

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = p.title || "(untitled)";

      const preview = document.createElement("div");
      preview.className = "preview";
      preview.textContent = previewText(p.content, 18);

      const row = document.createElement("div");
      row.className = "card-row";

      const meta = document.createElement("small");
      const date = new Date(p.createdAt);
      meta.textContent = date.toLocaleString();

      const del = document.createElement("button");
      del.className = "delete-btn";
      del.textContent = "Delete";
      del.setAttribute("aria-label", `Delete prompt ${p.title}`);
      del.addEventListener("click", () => deletePrompt(p.id));

      row.appendChild(meta);
      row.appendChild(del);

      card.appendChild(title);
      card.appendChild(preview);
      card.appendChild(row);

      container.appendChild(card);
    });
}

function addPromptFromForm(e) {
  e.preventDefault();
  const titleEl = document.getElementById("title");
  const contentEl = document.getElementById("content");
  const title = titleEl.value;
  const content = contentEl.value;

  if (!title.trim() || !content.trim()) {
    // simple validation
    if (!title.trim()) titleEl.focus();
    else contentEl.focus();
    return;
  }

  const prompts = loadPrompts();
  const obj = createPromptObject(title, content);
  prompts.push(obj);
  savePrompts(prompts);

  // reset form and re-render
  titleEl.value = "";
  contentEl.value = "";
  renderPrompts();
}

function deletePrompt(id) {
  const prompts = loadPrompts();
  const idx = prompts.findIndex((p) => p.id === id);
  if (idx === -1) return;
  prompts.splice(idx, 1);
  savePrompts(prompts);
  renderPrompts();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prompt-form");
  form.addEventListener("submit", addPromptFromForm);
  renderPrompts();
});
