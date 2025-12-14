const STORAGE_KEY = "promptLibrary.prompts";

function normalizePrompts(prompts) {
  return prompts.map((p) => ({
    // keep existing fields, but ensure rating defaults exist
    id: p.id,
    title: typeof p.title === "string" ? p.title : "",
    content: typeof p.content === "string" ? p.content : "",
    createdAt: p.createdAt || new Date().toISOString(),
    rating: p.rating || { average: 0, count: 0 },
    userRating: typeof p.userRating === "number" ? p.userRating : null,
  }));
}

function loadPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizePrompts(parsed);
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
    rating: { average: 0, count: 0 },
    userRating: null,
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

      // stars container (rating UI)
      const starsContainer = document.createElement("div");
      starsContainer.className = "stars-container";
      starsContainer.setAttribute("data-prompt-id", p.id);
      renderStarComponent(starsContainer, p);

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
      card.appendChild(starsContainer);
      card.appendChild(preview);
      card.appendChild(row);

      container.appendChild(card);
    });
}

// Render the 5-star control into a container element for a given prompt
function renderStarComponent(containerEl, promptObj) {
  containerEl.innerHTML = "";
  const avg = promptObj.rating?.average || 0;
  const count = promptObj.rating?.count || 0;
  const user = promptObj.userRating || 0;

  const starsWrap = document.createElement("div");
  starsWrap.className = "stars-wrap";

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("button");
    star.type = "button";
    star.className = "star" + (i <= Math.round(user || avg) ? " filled" : "");
    star.setAttribute("aria-label", `Rate ${i} star${i > 1 ? "s" : ""}`);
    star.setAttribute("data-value", i);
    star.setAttribute("title", `${i} star${i > 1 ? "s" : ""}`);

    star.addEventListener("click", () => {
      ratePrompt(promptObj.id, i);
    });

    // basic keyboard support: Enter/Space to activate
    star.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        ratePrompt(promptObj.id, i);
      }
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        const prev = star.previousElementSibling;
        if (prev) prev.focus();
      }
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        const next = star.nextElementSibling;
        if (next) next.focus();
      }
    });

    star.textContent = i <= Math.round(user || avg) ? "★" : "☆";
    starsWrap.appendChild(star);
  }

  const meta = document.createElement("div");
  meta.className = "rating-meta";
  meta.textContent = `${avg.toFixed(1)} · ${count} ratings`;

  containerEl.appendChild(starsWrap);
  containerEl.appendChild(meta);
}

function ratePrompt(promptId, newRating) {
  const prompts = loadPrompts();
  const p = prompts.find((x) => x.id === promptId);
  if (!p) return;

  const prevRating = typeof p.userRating === "number" ? p.userRating : null;
  const prevCount = p.rating?.count || 0;
  const prevAvg = p.rating?.average || 0;

  let totalBefore = prevAvg * prevCount;
  let totalAfter;

  if (typeof prevRating === "number") {
    // user is changing their rating
    totalAfter = totalBefore - prevRating + newRating;
    // count remains the same
    p.rating.count = prevCount;
  } else {
    // new rater
    totalAfter = totalBefore + newRating;
    p.rating.count = prevCount + 1;
  }

  p.rating.average = p.rating.count > 0 ? totalAfter / p.rating.count : 0;
  p.userRating = newRating;

  savePrompts(prompts);
  updatePromptCardUI(p);
}

function updatePromptCardUI(promptObj) {
  const cardByDataset = document.querySelector(
    `.card[data-id='${promptObj.id}']`
  );
  if (!cardByDataset) {
    // try container search
    const starsContainer = document.querySelector(
      `.stars-container[data-prompt-id='${promptObj.id}']`
    );
    if (starsContainer) renderStarComponent(starsContainer, promptObj);
    return;
  }

  const starsContainer = cardByDataset.querySelector(".stars-container");
  if (starsContainer) renderStarComponent(starsContainer, promptObj);
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
