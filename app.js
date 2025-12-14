const STORAGE_KEY = "promptLibrary.prompts";
const NOTES_KEY = "promptLibrary.notes";

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
      // notes section for this prompt
      const notesContainer = document.createElement("section");
      notesContainer.className = "notes";
      notesContainer.setAttribute("data-prompt-id", p.id);
      renderNotesForPrompt(notesContainer, p.id);
      card.appendChild(notesContainer);
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

// -------------------- Notes feature (localStorage-backed) --------------------

function loadAllNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load notes", e);
    return {};
  }
}

function saveAllNotes(notesObj) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notesObj));
    return true;
  } catch (e) {
    console.error("Failed to save notes", e);
    if (e && (e.name === "QuotaExceededError" || e.code === 22)) {
      alert("Unable to save note: localStorage quota exceeded.");
    }
    return false;
  }
}

function getNotesForPrompt(promptId) {
  const all = loadAllNotes();
  return Array.isArray(all[promptId]) ? all[promptId] : [];
}

function setNotesForPrompt(promptId, notesArray) {
  const all = loadAllNotes();
  all[promptId] = notesArray;
  return saveAllNotes(all);
}

function createNoteObject(content) {
  const now = Date.now();
  return {
    id: `note-${now}`,
    content: content || "",
    createdAt: now,
    updatedAt: now,
  };
}

function formatTimeAgo(ms) {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// debounce timers per note id while editing
const _debounceTimers = new Map();

function renderNotesForPrompt(containerEl, promptId) {
  containerEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "notes-header";
  const h = document.createElement("strong");
  h.textContent = "Notes";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn ghost note-add";
  addBtn.textContent = "Add Note";
  addBtn.addEventListener("click", () => {
    const notes = getNotesForPrompt(promptId);
    const n = createNoteObject("");
    notes.push(n);
    if (setNotesForPrompt(promptId, notes))
      renderNotesForPrompt(containerEl, promptId);
  });

  header.appendChild(h);
  header.appendChild(addBtn);

  const list = document.createElement("div");
  list.className = "notes-list";

  const notes = getNotesForPrompt(promptId);
  if (notes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notes-empty";
    empty.textContent = "No notes";
    list.appendChild(empty);
  } else {
    notes.forEach((note) => {
      const item = document.createElement("article");
      item.className = "note";
      item.dataset.noteId = note.id;

      const meta = document.createElement("div");
      meta.className = "note-meta";
      meta.textContent = formatTimeAgo(note.updatedAt);

      const contentWrap = document.createElement("div");
      contentWrap.className = "note-content-wrap";

      const contentView = document.createElement("div");
      contentView.className = "note-content";
      contentView.textContent = note.content || "(empty)";

      const textarea = document.createElement("textarea");
      textarea.className = "note-textarea";
      textarea.value = note.content || "";
      textarea.rows = 4;
      textarea.style.display = "none";

      contentWrap.appendChild(contentView);
      contentWrap.appendChild(textarea);

      const actions = document.createElement("div");
      actions.className = "note-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn ghost note-edit";
      editBtn.textContent = "Edit";

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn primary note-save";
      saveBtn.textContent = "Save";
      saveBtn.style.display = "none";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn note-cancel";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.display = "none";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn note-delete";
      delBtn.textContent = "Delete";

      const savingHint = document.createElement("span");
      savingHint.className = "note-saving";
      savingHint.textContent = "";

      const saveBadge = document.createElement("span");
      saveBadge.className = "save-badge";
      saveBadge.setAttribute("aria-hidden", "true");

      actions.appendChild(editBtn);
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(delBtn);
      actions.appendChild(savingHint);
      actions.appendChild(saveBadge);

      // Edit flow
      editBtn.addEventListener("click", () => {
        contentView.style.display = "none";
        textarea.style.display = "block";
        editBtn.style.display = "none";
        saveBtn.style.display = "inline-block";
        cancelBtn.style.display = "inline-block";
        textarea.focus();
        // attach input debounce auto-save
        textarea.addEventListener("input", onInput);
      });

      function onInput() {
        savingHint.textContent = "Saving...";
        if (_debounceTimers.has(note.id))
          clearTimeout(_debounceTimers.get(note.id));
        _debounceTimers.set(
          note.id,
          setTimeout(() => {
            const newContent = textarea.value;
            note.content = newContent;
            note.updatedAt = Date.now();
            setNotesForPrompt(promptId, notes);
            savingHint.textContent = "";
            saveBadge.classList.add("show");
            setTimeout(() => saveBadge.classList.remove("show"), 900);
            // update meta time
            meta.textContent = formatTimeAgo(note.updatedAt);
            contentView.textContent = newContent || "(empty)";
            _debounceTimers.delete(note.id);
          }, 800)
        );
      }

      // Save explicit
      saveBtn.addEventListener("click", () => {
        if (_debounceTimers.has(note.id))
          clearTimeout(_debounceTimers.get(note.id));
        textarea.removeEventListener("input", onInput);
        note.content = textarea.value;
        note.updatedAt = Date.now();
        setNotesForPrompt(promptId, notes);
        contentView.textContent = note.content || "(empty)";
        meta.textContent = formatTimeAgo(note.updatedAt);
        textarea.style.display = "none";
        contentView.style.display = "block";
        saveBtn.style.display = "none";
        cancelBtn.style.display = "none";
        editBtn.style.display = "inline-block";
        saveBadge.classList.add("show");
        setTimeout(() => saveBadge.classList.remove("show"), 900);
      });

      cancelBtn.addEventListener("click", () => {
        if (_debounceTimers.has(note.id))
          clearTimeout(_debounceTimers.get(note.id));
        textarea.removeEventListener("input", onInput);
        textarea.value = note.content || "";
        textarea.style.display = "none";
        contentView.style.display = "block";
        saveBtn.style.display = "none";
        cancelBtn.style.display = "none";
        editBtn.style.display = "inline-block";
        savingHint.textContent = "";
      });

      // Ctrl/Cmd+Enter -> save
      textarea.addEventListener("keydown", (ev) => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
          ev.preventDefault();
          saveBtn.click();
        }
      });

      delBtn.addEventListener("click", () => {
        if (!confirm("Delete this note?")) return;
        const idx = notes.findIndex((n) => n.id === note.id);
        if (idx === -1) return;
        notes.splice(idx, 1);
        setNotesForPrompt(promptId, notes);
        renderNotesForPrompt(containerEl, promptId);
      });

      item.appendChild(meta);
      item.appendChild(contentWrap);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  containerEl.appendChild(header);
  containerEl.appendChild(list);
}

// -------------------- end notes feature --------------------

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prompt-form");
  form.addEventListener("submit", addPromptFromForm);
  renderPrompts();
});
