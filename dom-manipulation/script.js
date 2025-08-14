/**** Keys for Web Storage ****/
const LS_QUOTES_KEY = "dqg.quotes";
const SS_LAST_QUOTE_KEY = "dqg.session.lastQuote";
const APP_VERSION = 1;

/**** Defaults ****/
const DEFAULT_QUOTES = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Your time is limited, so don’t waste it living someone else’s life.", category: "Life" },
  { text: "Success is not the key to happiness. Happiness is the key to success.", category: "Success" }
];

let quotes = []; // runtime array

/**** DOM Handles (existing) ****/
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");

/**** Elements we will create dynamically ****/
let categorySelect;        // <select>
let importInputFile;       // <input type="file">
let statusLine;            // small status text

/**** Utilities ****/
const isValidQuoteObject = (obj) =>
  obj && typeof obj.text === "string" && obj.text.trim() &&
  typeof obj.category === "string" && obj.category.trim();

const normalizeQuote = (q) => ({
  text: q.text.trim(),
  category: q.category.trim()
});

function uniqueKey(q) {
  return `${q.text.trim().toLowerCase()}|${q.category.trim().toLowerCase()}`;
}

function saveQuotes() {
  try {
    localStorage.setItem(LS_QUOTES_KEY, JSON.stringify({ v: APP_VERSION, quotes }));
  } catch (e) {
    console.error("Failed to save quotes:", e);
    alert("Could not save to localStorage (maybe storage is full or blocked).");
  }
}

function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_QUOTES_KEY);
    if (!raw) return [...DEFAULT_QUOTES];

    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed?.quotes; // support both shapes
    if (!Array.isArray(arr)) return [...DEFAULT_QUOTES];

    return arr.filter(isValidQuoteObject).map(normalizeQuote);
  } catch {
    // If storage is corrupted, fall back to defaults
    return [...DEFAULT_QUOTES];
  }
}

function setLastViewedQuote(q) {
  try {
    sessionStorage.setItem(SS_LAST_QUOTE_KEY, JSON.stringify(q));
  } catch {/* ignore */}
}

function getLastViewedQuote() {
  try {
    const raw = sessionStorage.getItem(SS_LAST_QUOTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidQuoteObject(parsed) ? normalizeQuote(parsed) : null;
  } catch {
    return null;
  }
}

/**** UI Builders ****/
function createTopControls() {
  // Category select
  categorySelect = document.createElement("select");
  categorySelect.id = "categorySelect";

  // Import/export row
  const controlsRow = document.createElement("div");
  controlsRow.className = "row";
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export JSON";
  exportBtn.addEventListener("click", exportToJsonFile);

  const importBtn = document.createElement("button");
  importBtn.textContent = "Import JSON";
  importBtn.addEventListener("click", () => importInputFile.click());

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset to Defaults";
  resetBtn.addEventListener("click", resetToDefaults);

  // Hidden file input
  importInputFile = document.createElement("input");
  importInputFile.type = "file";
  importInputFile.accept = ".json";
  importInputFile.style.display = "none";
  importInputFile.addEventListener("change", importFromJsonFile);

  // Status line
  statusLine = document.createElement("div");
  statusLine.className = "muted";
  statusLine.textContent = "Ready.";

  // Insert into DOM
  const spacer = document.createElement("div");
  spacer.className = "spacer";

  // Put the category before the quote display
  document.body.insertBefore(categorySelect, quoteDisplay);
  document.body.insertBefore(spacer, quoteDisplay);

  // Put controls after Show New Quote
  newQuoteBtn.insertAdjacentElement("afterend", controlsRow);
  controlsRow.append(exportBtn, importBtn, resetBtn, importInputFile);
  controlsRow.insertAdjacentElement("afterend", statusLine);
}

function createAddQuoteForm() {
  const formSection = document.createElement("div");
  formSection.className = "form-section";

  const heading = document.createElement("h3");
  heading.textContent = "Add a New Quote";

  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";

  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Quote";
  addBtn.addEventListener("click", addQuote);

  const row = document.createElement("div");
  row.className = "row";
  row.append(quoteInput, categoryInput, addBtn);

  formSection.append(heading, row);
  document.body.appendChild(formSection);
}

/**** Category Handling ****/
function updateCategorySelect() {
  const current = categorySelect?.value;
  const categories = Array.from(
    new Set(quotes.map(q => q.category.trim()))
  ).sort((a, b) => a.localeCompare(b));

  categorySelect.innerHTML = "";
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // Try to preserve selection
  if (current && categories.includes(current)) {
    categorySelect.value = current;
  } else if (categories.length > 0) {
    categorySelect.value = categories[0];
  } else {
    // if no categories, ensure select is empty
  }
}

/**** Core App Logic ****/
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  const pool = quotes.filter(q => q.category === selectedCategory);

  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    status("No quotes in selected category.");
    return;
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  renderQuote(q);
  setLastViewedQuote(q);
}

function renderQuote(q) {
  quoteDisplay.innerHTML = `
    "${q.text}"
    <div class="category">— ${q.category}</div>
  `;
}

function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim();

  if (!text || !category) {
    alert("Please fill in both fields.");
    return;
  }

  const newQ = normalizeQuote({ text, category });

  // Deduplicate by (text+category)
  const exists = quotes.some(q => uniqueKey(q) === uniqueKey(newQ));
  if (exists) {
    alert("That quote already exists in this category.");
    return;
  }

  quotes.push(newQ);
  saveQuotes();
  updateCategorySelect();
  categorySelect.value = newQ.category; // switch to the new category
  renderQuote(newQ);
  setLastViewedQuote(newQ);
  textEl.value = "";
  catEl.value = "";
  status("Quote added and saved.");

  populateCategories();
  sendQuotesToServer();

}

/**** Import / Export ****/
function exportToJsonFile() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const ts = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const filename = `quotes-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    status("Exported quotes to JSON.");
  } catch (e) {
    console.error("Export failed:", e);
    alert("Export failed.");
  }
}

function importFromJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        alert("Invalid file: JSON must be an array of quotes.");
        return;
      }

      // Normalize, validate, and deduplicate merge
      const incoming = data.filter(isValidQuoteObject).map(normalizeQuote);
      const beforeCount = quotes.length;
      const seen = new Set(quotes.map(uniqueKey));
      const toAdd = [];

      for (const q of incoming) {
        const key = uniqueKey(q);
        if (!seen.has(key)) {
          seen.add(key);
          toAdd.push(q);
        }
      }

      quotes.push(...toAdd);
      saveQuotes();
      updateCategorySelect();

      const added = quotes.length - beforeCount;
      alert(`Quotes imported successfully! Added: ${added}`);
      status(`Imported ${added} new quotes.`);
      // clear file input so same file can be re-selected later if needed
      event.target.value = "";
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import: invalid JSON.");
    }
  };
  reader.readAsText(file);
}

/**** Session helpers ****/
function restoreLastViewedQuoteForSession() {
  const last = getLastViewedQuote();
  if (last) {
    // Ensure its category still exists (or re-add if missing)
    const categoryExists = quotes.some(q => q.category === last.category);
    if (!categoryExists) {
      quotes.push(last);
      saveQuotes();
    }
    updateCategorySelect();
    if (categorySelect.options.length) {
      categorySelect.value = last.category;
    }
    renderQuote(last);
    status("Restored last viewed quote (this tab).");
  } else {
    status("No last quote in this session. Click 'Show New Quote'.");
  }
}

/**** Extra helpers ****/
function resetToDefaults() {
  if (!confirm("Reset quotes to default and overwrite saved data?")) return;
  quotes = [...DEFAULT_QUOTES];
  saveQuotes();
  updateCategorySelect();
  quoteDisplay.textContent = "Defaults restored. Choose a category and click 'Show New Quote'.";
  status("Reset to default quotes.");
}

function status(msg) {
  if (statusLine) statusLine.textContent = msg;
}

/**** Init ****/
function init() {
  createTopControls();
  createAddQuoteForm();

  quotes = loadQuotes();
  updateCategorySelect();

  // Wire main button + category change
  newQuoteBtn.addEventListener("click", showRandomQuote);
  categorySelect.addEventListener("change", () => {
    // show a quote from the newly selected category
    showRandomQuote();
  });

  // Try to restore last viewed quote (sessionStorage)
  restoreLastViewedQuoteForSession();

  // If nothing rendered yet and categories exist, display one immediately
  if (!quoteDisplay.textContent || /Click "Show New Quote"/.test(quoteDisplay.textContent)) {
    if (categorySelect.options.length) showRandomQuote();
  }
}

init();

/* Optional: expose import function name for inline onchange compatibility (if you prefer HTML attribute approach)
   <input type="file" id="importFile" accept=".json" onchange="importFromJsonFile(event)" />
*/
window.importFromJsonFile = importFromJsonFile;

function populateCategories() {
  const categoryFilter = document.getElementById('categoryFilter');
  categoryFilter.innerHTML = '<option value="all">All Categories</option>'; // reset

  const categories = [...new Set(quotes.map(q => q.category))];
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  // Restore last selected category from localStorage
  const savedCategory = localStorage.getItem('selectedCategory');
  if (savedCategory) {
    categoryFilter.value = savedCategory;
    filterQuotes();
  }
}

function filterQuotes() {
  const selectedCategory = document.getElementById('categoryFilter').value;
  localStorage.setItem('selectedCategory', selectedCategory);

  let filteredQuotes = quotes;
  if (selectedCategory !== 'all') {
    filteredQuotes = quotes.filter(q => q.category === selectedCategory);
  }

  // Example: just display the first matching quote
  if (filteredQuotes.length > 0) {
    const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
    document.getElementById('quoteDisplay').innerText = randomQuote.text + " — " + randomQuote.category;
  } else {
    document.getElementById('quoteDisplay').innerText = "No quotes found in this category.";
  }
}



populateCategories();

const SERVER_URL = 'https://jsonplaceholder.typicode.com/posts'; // Simulated endpoint

async function fetchQuotesFromServer() {
  try {
    const response = await fetch(SERVER_URL);
    const serverData = await response.json();

    // Convert server data to quote format (simulation)
    const serverQuotes = serverData.map(item => ({
      text: item.title,
      category: "Server"
    }));

    handleServerSync(serverQuotes);
  } catch (error) {
    console.error("Error fetching server quotes:", error);
  }
}

async function sendQuotesToServer() {
  try {
    await fetch(SERVER_URL, {
      method: 'POST',
      body: JSON.stringify(quotes),
      headers: { 'Content-Type': 'application/json' }
    });
    console.log("Local quotes sent to server.");
  } catch (error) {
    console.error("Error sending quotes to server:", error);
  }
}

function handleServerSync(serverQuotes) {
  let updated = false;

  // Conflict resolution: server wins
  serverQuotes.forEach(serverQuote => {
    const existsLocally = quotes.some(localQuote => localQuote.text === serverQuote.text);
    if (!existsLocally) {
      quotes.push(serverQuote);
      updated = true;
    }
  });

  if (updated) {
    saveQuotes();
    populateCategories();
    showSyncNotification("Quotes updated from server (server version used).");
  }
}

setInterval(() => {
  fetchQuotesFromServer();
}, 30000); // every 30 seconds

function syncQuotes() {
  fetchQuotesFromServer(); // Get latest from server
  sendQuotesToServer();    // Push local changes
}

function showSyncNotification(message) {
  alert(message); // Basic version — you can later replace with custom UI banner
}
