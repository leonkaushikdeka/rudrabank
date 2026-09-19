const STORAGE_KEY = "rudra-bank-v1";
const CURRENCIES = {
  INR: { symbol: "₹", locale: "en-IN", quick: [10, 20, 50, 100] },
  USD: { symbol: "$", locale: "en-US", quick: [1, 5, 10, 20] },
  EUR: { symbol: "€", locale: "de-DE", quick: [1, 5, 10, 20] },
  GBP: { symbol: "£", locale: "en-GB", quick: [1, 5, 10, 20] },
  JPY: { symbol: "¥", locale: "ja-JP", quick: [100, 500, 1000, 2000] }
};

const defaults = { name: "Saver", currency: "INR", goalName: "Dream fund", goalAmount: 10000, transactions: [] };
let state = loadState();
let transactionType = "deposit";
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const els = {
  greeting: $("#greeting"), entryCount: $("#entryCount"), balance: $("#balance"), balanceCaption: $("#balanceCaption"),
  goalName: $("#goalName"), goalSaved: $("#goalSaved"), goalTarget: $("#goalTarget"), goalMessage: $("#goalMessage"),
  progressBar: $("#progressBar"), progressTrack: $(".progress-track"), currencySymbol: $("#currencySymbol"),
  quickAmounts: $("#quickAmounts"), amount: $("#amount"), note: $("#note"), submitButton: $("#submitButton"),
  saveHeading: $("#saveHeading"), historyList: $("#historyList"), emptyState: $("#emptyState"),
  goalDialog: $("#goalDialog"), settingsDialog: $("#settingsDialog"), toast: $("#toast")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.transactions) ? { ...defaults, ...saved } : { ...defaults };
  } catch { return { ...defaults }; }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function totalSaved() {
  return state.transactions.reduce((sum, item) => sum + (item.type === "deposit" ? item.amount : -item.amount), 0);
}

function money(value, withDecimals = false) {
  const config = CURRENCIES[state.currency] || CURRENCIES.INR;
  return new Intl.NumberFormat(config.locale, {
    style: "currency", currency: state.currency,
    maximumFractionDigits: withDecimals || value % 1 ? 2 : 0
  }).format(value);
}

function render() {
  const total = Math.max(0, totalSaved());
  const progress = state.goalAmount > 0 ? Math.min(100, (total / state.goalAmount) * 100) : 0;
  const deposits = state.transactions.filter((item) => item.type === "deposit").length;
  const config = CURRENCIES[state.currency] || CURRENCIES.INR;

  els.greeting.textContent = `Hello, ${state.name || "Saver"}!`;
  els.entryCount.textContent = deposits;
  els.balance.textContent = money(total, true);
  els.balanceCaption.textContent = total === 0 ? "Your first coin is waiting." : deposits === 1 ? "A lovely start — keep going." : "Built one small save at a time.";
  els.goalName.textContent = state.goalName;
  els.goalSaved.textContent = `${money(total)} saved`;
  els.goalTarget.textContent = `of ${money(state.goalAmount)}`;
  els.progressBar.style.width = `${progress}%`;
  els.progressTrack.setAttribute("aria-valuenow", Math.round(progress));
  els.goalMessage.textContent = progress >= 100 ? "You made it! Your goal is fully funded. 🎉" : total === 0 ? "Start with any amount — every coin counts." : `${money(Math.max(0, state.goalAmount - total))} to go. You're ${Math.round(progress)}% there.`;
  els.currencySymbol.textContent = config.symbol;
  renderQuickAmounts(config);
  renderHistory();
}

function renderQuickAmounts(config) {
  els.quickAmounts.innerHTML = "";
  config.quick.forEach((amount) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `+ ${config.symbol}${amount.toLocaleString(config.locale)}`;
    button.addEventListener("click", () => {
      els.amount.value = amount;
      els.amount.focus();
    });
    els.quickAmounts.appendChild(button);
  });
}

function renderHistory() {
  els.historyList.innerHTML = "";
  els.emptyState.hidden = state.transactions.length > 0;
  $("#clearHistoryButton").hidden = state.transactions.length === 0;

  state.transactions.slice(0, 12).forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const isOut = item.type === "withdrawal";
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.date));
    li.innerHTML = `
      <span class="history-icon ${isOut ? "out" : ""}">${isOut ? "−" : "+"}</span>
      <span class="history-info"><strong></strong><span>${date}</span></span>
      <strong class="history-amount ${isOut ? "out" : ""}">${isOut ? "−" : "+"}${money(item.amount, true)}</strong>
      <button class="delete-entry" type="button" aria-label="Delete entry" title="Delete entry">×</button>`;
    li.querySelector(".history-info strong").textContent = item.note || (isOut ? "Taken from piggy" : "Added to piggy");
    li.querySelector(".delete-entry").addEventListener("click", () => {
      const remaining = state.transactions.filter((entry) => entry.id !== item.id);
      const nextTotal = remaining.reduce((sum, entry) => sum + (entry.type === "deposit" ? entry.amount : -entry.amount), 0);
      if (nextTotal < 0) return showToast("Remove a later withdrawal first");
      state.transactions = remaining;
      saveState();
      showToast("Entry removed");
    });
    els.historyList.appendChild(li);
  });
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

document.querySelectorAll(".switch-option").forEach((button) => {
  button.addEventListener("click", () => {
    transactionType = button.dataset.type;
    document.querySelectorAll(".switch-option").forEach((item) => item.classList.toggle("active", item === button));
    const withdrawing = transactionType === "withdrawal";
    els.saveHeading.textContent = withdrawing ? "Take coins from your piggy" : "Add coins to your piggy";
    els.submitButton.innerHTML = withdrawing ? '<span aria-hidden="true">−</span> Take from piggy' : '<span aria-hidden="true">＋</span> Drop into piggy';
  });
});

$("#transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(els.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) return showToast("Enter an amount greater than zero");
  if (transactionType === "withdrawal" && amount > totalSaved()) return showToast("Your piggy doesn't have that much yet");
  state.transactions.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, type: transactionType, amount, note: els.note.value.trim(), date: new Date().toISOString() });
  saveState();
  event.target.reset();
  showToast(transactionType === "deposit" ? "Coins added to your piggy!" : "Withdrawal recorded");
});

$("#editGoalButton").addEventListener("click", () => {
  $("#goalNameInput").value = state.goalName;
  $("#goalAmountInput").value = state.goalAmount;
  els.goalDialog.showModal();
});

$("#goalForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const amount = Number($("#goalAmountInput").value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.goalName = $("#goalNameInput").value.trim() || "Dream fund";
  state.goalAmount = amount;
  saveState();
  els.goalDialog.close();
  showToast("Goal updated");
});

$("#settingsButton").addEventListener("click", () => {
  $("#userNameInput").value = state.name;
  $("#currencyInput").value = state.currency;
  els.settingsDialog.showModal();
});

$("#settingsForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  state.name = $("#userNameInput").value.trim() || "Saver";
  state.currency = $("#currencyInput").value;
  saveState();
  els.settingsDialog.close();
  showToast("Preferences saved");
});

$("#clearHistoryButton").addEventListener("click", () => {
  if (confirm("Clear all savings activity? This cannot be undone unless you exported a backup.")) {
    state.transactions = [];
    saveState();
    showToast("History cleared");
  }
});

$("#exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `rudra-bank-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Backup downloaded");
});

$("#importButton").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.transactions)) throw new Error("Invalid backup");
    state = { ...defaults, ...imported };
    saveState();
    els.settingsDialog.close();
    showToast("Backup restored");
  } catch { showToast("That file isn't a valid Rudra Bank backup"); }
  event.target.value = "";
});

render();
