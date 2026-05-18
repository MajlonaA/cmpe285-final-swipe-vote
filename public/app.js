const state = {
  items: [],
  votes: new Map(),
  results: [],
  analytics: { totalSwipes: 0, sessions: 0, averageDecisionMs: 0 },
  deck: [],
  currentIndex: 0,
  currentItem: null,
  lastVote: null,
  cardShownAt: Date.now(),
  sort: "most-loved",
  view: "swipe",
  drag: null,
  isRefreshing: false,
  sessionId: getSessionId()
};

const elements = {
  tabs: [...document.querySelectorAll(".tab")],
  viewButtons: [...document.querySelectorAll("[data-view-target]")],
  swipeView: document.querySelector("#swipeView"),
  resultsView: document.querySelector("#resultsView"),
  matchesView: document.querySelector("#matchesView"),
  voteCard: document.querySelector("#voteCard"),
  emptyState: document.querySelector("#emptyState"),
  cardImage: document.querySelector("#cardImage"),
  cardCategory: document.querySelector("#cardCategory"),
  cardTitle: document.querySelector("#cardTitle"),
  cardDescription: document.querySelector("#cardDescription"),
  progressLabel: document.querySelector("#progressLabel"),
  sessionLabel: document.querySelector("#sessionLabel"),
  noButton: document.querySelector("#noButton"),
  yesButton: document.querySelector("#yesButton"),
  undoButton: document.querySelector("#undoButton"),
  refreshButton: document.querySelector("#refreshButton"),
  sortSelect: document.querySelector("#sortSelect"),
  statsStrip: document.querySelector("#statsStrip"),
  resultList: document.querySelector("#resultList"),
  matchList: document.querySelector("#matchList")
};

function getSessionId() {
  const existing = localStorage.getItem("cat-match-session");
  if (existing) {
    return existing;
  }
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const session = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("cat-match-session", session);
  return session;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

async function initialize() {
  elements.sessionLabel.textContent = `Session ${state.sessionId.slice(0, 6)}`;
  const [itemsPayload, votesPayload, resultsPayload] = await Promise.all([
    api("/api/items"),
    api(`/api/my-votes?sessionId=${encodeURIComponent(state.sessionId)}`),
    api("/api/results")
  ]);

  state.items = itemsPayload.items;
  state.votes = new Map(votesPayload.votes.map((vote) => [vote.itemId, vote.choice]));
  state.results = resultsPayload.results;
  state.analytics = resultsPayload.analytics || state.analytics;
  rebuildDeck();
  renderAll();
  startResultsPolling();
}

function rebuildDeck() {
  state.deck = state.items.filter((item) => !state.votes.has(item.id));
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, state.deck.length - 1));
  state.currentItem = state.deck[state.currentIndex] || null;
  state.cardShownAt = Date.now();
}

function setView(view) {
  state.view = view;
  elements.tabs.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  elements.swipeView.classList.toggle("active", view === "swipe");
  elements.resultsView.classList.toggle("active", view === "results");
  elements.matchesView.classList.toggle("active", view === "matches");
  if (view !== "swipe") {
    refreshResults();
  }
}

function renderAll() {
  renderCard();
  renderResults();
  renderMatches();
}

function renderCard() {
  const item = state.currentItem;
  const completed = state.votes.size;
  elements.progressLabel.textContent = `${completed} / ${state.items.length} voted`;
  elements.undoButton.disabled = !state.lastVote;

  if (!item) {
    elements.voteCard.hidden = true;
    elements.emptyState.hidden = false;
    elements.noButton.disabled = true;
    elements.yesButton.disabled = true;
    return;
  }

  elements.voteCard.hidden = false;
  elements.emptyState.hidden = true;
  elements.noButton.disabled = false;
  elements.yesButton.disabled = false;
  resetCardPosition();

  elements.cardImage.src = item.image;
  elements.cardImage.alt = `${item.name} generated visual`;
  elements.cardCategory.textContent = item.category;
  elements.cardTitle.textContent = item.name;
  elements.cardDescription.textContent = item.description;
}

function sortedResults() {
  const myYesIds = new Set(
    [...state.votes.entries()]
      .filter(([, choice]) => choice === "yes")
      .map(([itemId]) => itemId)
  );

  return [...state.results]
    .filter((item) => (state.sort === "my-yes" ? myYesIds.has(item.id) : true))
    .sort((a, b) => {
      if (state.sort === "most-loved") {
        return b.yesRate - a.yesRate || b.yes - a.yes || a.name.localeCompare(b.name);
      }
      if (state.sort === "most-divisive") {
        return Math.abs(50 - a.yesRate) - Math.abs(50 - b.yesRate) || b.total - a.total;
      }
      if (state.sort === "most-votes") {
        return b.total - a.total || b.yesRate - a.yesRate;
      }
      return a.name.localeCompare(b.name);
    });
}

function renderResults() {
  elements.statsStrip.innerHTML = [
    statMarkup(state.analytics.totalSwipes, "total swipes"),
    statMarkup(state.analytics.sessions, "sessions"),
    statMarkup(formatDuration(state.analytics.averageDecisionMs), "avg decision")
  ].join("");

  const items = sortedResults();
  if (items.length === 0) {
    elements.resultList.innerHTML = `<li class="empty-list">No matching results yet.</li>`;
    return;
  }
  elements.resultList.innerHTML = items.map(resultMarkup).join("");
}

function renderMatches() {
  const yesIds = new Set(
    [...state.votes.entries()]
      .filter(([, choice]) => choice === "yes")
      .map(([itemId]) => itemId)
  );
  const matches = state.results
    .filter((item) => yesIds.has(item.id) && item.total > 0 && item.yesRate >= 70)
    .sort((a, b) => b.yesRate - a.yesRate || b.total - a.total);

  if (matches.length === 0) {
    elements.matchList.innerHTML = `<div class="empty-list">Vote yes on popular picks to build this list.</div>`;
    return;
  }
  elements.matchList.innerHTML = matches.map(resultMarkup).join("");
}

function statMarkup(value, label) {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function formatDuration(milliseconds) {
  if (!milliseconds) {
    return "0s";
  }
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  const seconds = milliseconds / 1000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
}

function resultMarkup(item) {
  return `
    <li class="result-card">
      <img src="${item.image}" alt="${escapeHtml(item.name)} visual">
      <div class="result-copy">
        <div class="result-title">
          <h3>${escapeHtml(item.name)}</h3>
          <span>${item.yesRate}%</span>
        </div>
        <div class="meter" aria-label="${item.yesRate}% yes">
          <span style="width: ${item.yesRate}%"></span>
        </div>
        <div class="result-meta">
          <span>${item.yes} yes</span>
          <span>${item.no} no</span>
          <span>${item.total} total</span>
        </div>
      </div>
    </li>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function refreshResults() {
  if (state.isRefreshing) {
    return;
  }
  state.isRefreshing = true;
  try {
    const payload = await api("/api/results");
    state.results = payload.results;
    state.analytics = payload.analytics || state.analytics;
    renderResults();
    renderMatches();
  } finally {
    state.isRefreshing = false;
  }
}

async function vote(choice) {
  if (!state.currentItem) {
    return;
  }

  const item = state.currentItem;
  elements.noButton.disabled = true;
  elements.yesButton.disabled = true;

  await api("/api/vote", {
    method: "POST",
    body: JSON.stringify({
      itemId: item.id,
      choice,
      sessionId: state.sessionId,
      decisionMs: Date.now() - state.cardShownAt
    })
  });

  state.votes.set(item.id, choice);
  state.lastVote = { item, choice };
  state.deck.splice(state.currentIndex, 1);
  state.currentItem = state.deck[state.currentIndex] || null;
  await refreshResults();
  renderCard();
}

async function undoLastVote() {
  if (!state.lastVote) {
    return;
  }

  const { item } = state.lastVote;
  await api("/api/vote", {
    method: "DELETE",
    body: JSON.stringify({ itemId: item.id, sessionId: state.sessionId })
  });
  state.votes.delete(item.id);
  state.deck.splice(state.currentIndex, 0, item);
  state.currentItem = item;
  state.lastVote = null;
  await refreshResults();
  renderCard();
}

function resetCardPosition() {
  elements.voteCard.classList.remove("dragging", "hint-yes", "hint-no");
  elements.voteCard.style.transform = "";
  elements.voteCard.style.opacity = "";
}

function updateDrag(dx, dy) {
  const rotation = Math.max(-16, Math.min(16, dx / 12));
  elements.voteCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
  elements.voteCard.classList.toggle("hint-yes", dx > 48);
  elements.voteCard.classList.toggle("hint-no", dx < -48);
}

function onPointerDown(event) {
  if (!state.currentItem || event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  state.drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY
  };
  elements.voteCard.classList.add("dragging");
  elements.voteCard.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }
  const dx = event.clientX - state.drag.startX;
  const dy = event.clientY - state.drag.startY;
  updateDrag(dx, dy);
}

async function onPointerUp(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }
  const dx = event.clientX - state.drag.startX;
  const dy = event.clientY - state.drag.startY;
  state.drag = null;
  elements.voteCard.releasePointerCapture(event.pointerId);

  if (dy > 95 && Math.abs(dy) > Math.abs(dx)) {
    resetCardPosition();
    setView("results");
    return;
  }

  if (dx > 92) {
    elements.voteCard.style.opacity = "0";
    await vote("yes");
    return;
  }

  if (dx < -92) {
    elements.voteCard.style.opacity = "0";
    await vote("no");
    return;
  }

  resetCardPosition();
}

elements.tabs.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

elements.viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewTarget));
});

elements.yesButton.addEventListener("click", () => vote("yes"));
elements.noButton.addEventListener("click", () => vote("no"));
elements.undoButton.addEventListener("click", undoLastVote);
elements.refreshButton.addEventListener("click", refreshResults);
elements.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderResults();
});
elements.voteCard.addEventListener("pointerdown", onPointerDown);
elements.voteCard.addEventListener("pointermove", onPointerMove);
elements.voteCard.addEventListener("pointerup", onPointerUp);
elements.voteCard.addEventListener("pointercancel", () => {
  state.drag = null;
  resetCardPosition();
});

function startResultsPolling() {
  window.setInterval(() => {
    if (state.view !== "swipe" && document.visibilityState === "visible") {
      refreshResults().catch(() => {});
    }
  }, 8000);
}

initialize().catch((error) => {
  elements.cardTitle.textContent = "Unable to load";
  elements.cardDescription.textContent = error.message;
});
