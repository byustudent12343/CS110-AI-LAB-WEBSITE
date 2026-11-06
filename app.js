// ============================================================================
// app.js — WHAT MAKES THE WEBSITE INTERACTIVE
// ============================================================================
// WHAT THIS FILE IS:
//   This is a JavaScript file: a program the web browser runs. index.html
//   gives the page its structure and styles.css makes it look nice, but this
//   file makes things HAPPEN when you click, type, or scroll. It also builds
//   parts of the page (service cards, quiz, checklist) from the information
//   stored in data.js, and saves your progress in localStorage.
//
// KEY WORDS (the first time each appears, it is also explained nearby):
//   - VARIABLE: a named box that holds a value. "const" makes one that won't
//     be reassigned; "let" makes one whose value can change later.
//   - FUNCTION: a reusable, named set of instructions. You "call" a function
//     (run it) by writing its name followed by parentheses, like toast("Hi").
//     Values passed in the parentheses are called ARGUMENTS (or PARAMETERS
//     from the function's point of view).
//   - ARROW FUNCTION: a shorter way to write a function:
//         (x) => x * 2      means "a function that takes x and gives back x*2".
//   - RETURN: the value a function gives back when it finishes.
//   - DOM (Document Object Model): the browser's live version of the HTML page,
//     which JavaScript can read and change. Each HTML element becomes an
//     "element object" JavaScript can work with.
//   - EVENT: something that happens on the page (a click, a key press, typing).
//     An EVENT LISTENER is a function that waits for an event and runs when it
//     happens. addEventListener("click", someFunction) sets one up.
//   - localStorage: a small storage area built into the browser. Data saved
//     there stays even after the tab or browser is closed, but only on this
//     computer and in this browser. Nothing is sent to a server.
//   - STRING: text in quotes. A TEMPLATE LITERAL is text in backticks `like
//     this` where ${something} inserts a value into the text.
//   - if / else: run some code only if a condition is true (else: if not).
//   - === means "is exactly equal to"; !== means "is not equal to".
//     && means AND, || means OR, ! means NOT.
//   - TERNARY: a compact if/else:  condition ? valueIfTrue : valueIfFalse
//   - LOOP: code that repeats. .forEach(...) runs a function once for every
//     item in a list. .map(...) makes a NEW list by transforming each item.
//     .filter(...) makes a new list with only the items that pass a test.
//   - .join("") glues the items of a list together into one string.
//   - classList.add / remove / toggle: add, remove, or switch a class on an
//     element. Since styles.css styles elements by class, this changes how
//     they look (for example, showing or hiding them).
// ============================================================================

/* HomeLab Hub — interactive behavior. No build step, no dependencies. */
// ("No build step, no dependencies" means this file runs exactly as written,
//  with no extra tools or outside code libraries needed.)

// The whole program below is wrapped in (() => { ... })(); — this is called
// an IIFE ("Immediately Invoked Function Expression"): a function that is
// created and run right away. WHY: any variables made inside it stay private
// to this file, so they can't accidentally clash with other code on the page.
(() => {
  // "use strict" turns on JavaScript's strict mode, which reports common
  // mistakes as errors instead of silently ignoring them.
  "use strict";

  // ==========================================================================
  // SMALL HELPER FUNCTIONS used throughout the rest of the file
  // ==========================================================================

  // $ and $$ are shortcuts for finding elements on the page using a CSS
  // selector (the same kind of selector used in styles.css, like "#toast" or
  // ".tab").
  //   $(".tab")  finds the FIRST matching element.
  //   $$(".tab") finds ALL matching elements and returns them as an ARRAY
  //              (a list). The [... ] part converts the browser's result into
  //              a normal array so we can use .map, .filter, etc. on it.
  // "root = document" is a DEFAULT VALUE: if you don't say where to search, it
  // searches the whole page (document); otherwise only inside "root".
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  // Escape any text before it is placed in HTML, so data can never inject markup/scripts.
  // ("Escaping" means replacing special characters like < and > with safe
  // codes like &lt; and &gt;. Otherwise text containing "<script>" could be
  // treated as real code. That kind of attack is called XSS, cross-site
  // scripting.) .replace finds every special character using a REGULAR
  // EXPRESSION (a text pattern, written between slashes: /[&<>"']/g, where
  // the g means "global", i.e. every match) and swaps in its safe code.
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Only allow http(s) links; anything else (javascript:, data:, …) becomes "#".
  // ("try { } catch { }" means: TRY running this code, and if it causes an
  // error, run the "catch" part instead of crashing. Here, an invalid web
  // address simply becomes "#", a link that goes nowhere.)
  const safeUrl = (u) => {
    try { const url = new URL(u, location.href); return /^https?:$/.test(url.protocol) ? url.href : "#"; }
    catch { return "#"; }
  };
  // The only two allowed guest types. A Set is a list with no duplicates that
  // can quickly answer "is this item in it?".
  const GUEST_TYPES = new Set(["VM", "LXC"]);
  // guestType makes sure a service's type is a known value ("VM" or "LXC");
  // anything unexpected is treated as "LXC". WHY: the type is placed into
  // the page as a class name, so only safe, known values are allowed.
  const guestType = (t) => (GUEST_TYPES.has(t) ? t : "LXC");
  // byId is a lookup table built from SERVICES (from data.js). A Map stores
  // pairs of key -> value; here, service id -> service object. WHY: so code can
  // find a service instantly with byId.get("jellyfin") instead of searching
  // the whole list each time.
  const byId = new Map(SERVICES.map((s) => [s.id, s]));

  // ---------- Persistent state ----------
  // "Persistent" means it's remembered between visits. "State" means the
  // current situation of the page: what you've chosen, typed, ticked, etc.
  //
  // "store" is an object with two functions (called METHODS when they belong
  // to an object) for reading and writing localStorage:
  //   store.get(key, fallback) — read a saved value. If nothing is saved, or
  //                              it can't be read, return "fallback" instead.
  //   store.set(key, value)    — save a value.
  // Every key gets the prefix "hlh:" (short for HomeLab Hub), so this site's
  // saved data is easy to identify and won't clash with other data.
  // localStorage can only store text, so values are converted with JSON
  // (JavaScript Object Notation, a standard text format for data):
  //   JSON.stringify turns a value into text; JSON.parse turns text back.
  // The try/catch parts mean the site keeps working even if the browser has
  // storage turned off (for example in some private-browsing modes).
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("hlh:" + key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("hlh:" + key, JSON.stringify(value)); } catch { /* storage disabled */ }
    },
  };

  // arr: returns the value if it's an array (list), or an empty list if not.
  // A safety check for saved data that might be broken.
  const arr = (v) => (Array.isArray(v) ? v : []);
  // clampNum: turns v into a whole number between min and max. If v isn't a
  // valid number at all, it returns "def" (the default) instead.
  // Math.round rounds to a whole number; Math.max/Math.min keep it in range.
  const clampNum = (v, min, max, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
  };
  // Saved values can be edited by anyone with devtools or corrupted, so validate them.
  // ("Devtools" are the developer tools built into every browser, which let
  // anyone view and change a page's saved data. "Validate" means check that
  // values are sensible before using them.)
  //
  // loadHost: reads the saved host computer specs (CPU, RAM, disk, and
  // whether ZFS is used). Each number is kept within the same range as the
  // sliders in index.html, with a sensible default if missing.
  function loadHost() {
    const h = store.get("host", {}) || {};
    return {
      cpu: clampNum(h.cpu, 2, 64, 8),
      ram: clampNum(h.ram, 4, 256, 32),
      disk: clampNum(h.disk, 128, 16000, 1000),
      zfs: h.zfs === true,
    };
  }
  // loadChecks: reads which checklist boxes were ticked. They're saved as an
  // object like { "0-2": true }, meaning "group 0, item 2 is ticked".
  // Object.create(null) makes a completely empty object. The "for...of" loop
  // goes through each saved entry and only keeps ones that look right: the
  // key must match the pattern number-dash-number (checked with a regular
  // expression: \d+ means "one or more digits") and the value must be true.
  function loadChecks() {
    const raw = store.get("checks", {});
    const out = Object.create(null);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) if (/^\d+-\d+$/.test(k) && v === true) out[k] = true;
    }
    return out;
  }

  // "state" holds everything the page needs to remember while it's open:
  //   plan     — the list of service ids added to the Lab Builder. It's loaded
  //              from localStorage, duplicates removed (new Set), and anything
  //              that isn't a real service id is filtered out.
  //   host     — the host computer specs (from loadHost above).
  //   checks   — the ticked checklist boxes (from loadChecks above).
  //   category — the currently selected category filter (starts as "All").
  //   query    — the current search text (starts empty).
  const state = {
    plan: [...new Set(arr(store.get("plan", [])))].filter((id) => typeof id === "string" && byId.has(id)),
    host: loadHost(),
    checks: loadChecks(),
    category: "All",
    query: "",
  };

  // Formatting helpers that turn numbers into friendly text.
  // fmtRam: 512 -> "512 MB", 2048 -> "2 GB", 1536 -> "1.5 GB".
  //   (.toFixed(1) shows one decimal place; % gives the remainder after
  //   dividing, used here to decide whether a decimal is needed.)
  // fmtDisk: 500 -> "500 GB", 2000 -> "2.0 TB" (terabytes).
  const fmtRam = (mb) => (mb >= 1024 ? (mb / 1024).toFixed(mb % 1024 ? 1 : 0) + " GB" : mb + " MB");
  const fmtDisk = (gb) => (gb >= 1000 ? (gb / 1000).toFixed(1) + " TB" : gb + " GB");

  // toast: shows a short pop-up message at the bottom of the screen, then
  // hides it again after 2.2 seconds.
  //   - textContent sets the element's text (safely; it is never treated as HTML).
  //   - Adding the "show" class makes styles.css slide the toast into view.
  //   - setTimeout(fn, 2200) runs fn after 2200 milliseconds (2.2 seconds).
  //   - clearTimeout cancels any earlier timer first, so if two toasts appear
  //     quickly, the first timer doesn't hide the second message too early.
  //     The timer is remembered on toast._t so the next call can cancel it.
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- Theme ----------
  // Sets up light/dark mode.
  //   1. Use the theme saved in localStorage, if it's a valid one.
  //   2. Otherwise, use the visitor's computer setting: matchMedia checks
  //      whether their system prefers light colors.
  //   3. Put the theme on the <html> element (document.documentElement) as
  //      data-theme="light" or "dark". styles.css swaps colors based on this.
  //   4. When the ◐ button is clicked, switch to the other theme and save it.
  function initTheme() {
    const t = store.get("theme", null);
    const saved = t === "light" || t === "dark" ? t : null;
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
    $("#theme-toggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      store.set("theme", next);
    });
  }

  // ---------- Nav ----------
  // Sets up the navigation menu at the top.
  function initNav() {
    const toggle = $(".nav-toggle");
    const links = $(".nav-links");
    // On phones: tapping ☰ opens/closes the menu by switching the "open" class.
    // classList.toggle returns true if the class is now on, and that value is
    // copied to aria-expanded so screen readers know if the menu is open.
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    // Tapping any menu link also closes the menu.
    $$(".nav-links a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));

    // Highlight the section currently in view
    // navMap pairs each section id with its menu link. For example, the link
    // href="#quiz" becomes "quiz" (.slice(1) cuts off the first character, #).
    // An IntersectionObserver is a browser tool that tells you when an element
    // scrolls into or out of view. The rootMargin shrinks the "viewing area"
    // to a thin band across the middle of the screen, so a section counts as
    // "in view" when it crosses the middle. When that happens, its menu link
    // gets the "active" class (brighter text) and all others lose it.
    const navMap = new Map($$(".nav-links a").map((a) => [a.getAttribute("href").slice(1), a]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && navMap.has(e.target.id)) {
          navMap.forEach((a) => a.classList.remove("active"));
          navMap.get(e.target.id).classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    // Start watching every <section> that has an id.
    $$("section[id]").forEach((s) => observer.observe(s));
  }

  // ---------- Terminal animation ----------
  // Makes the fake terminal at the top "type" the commands from
  // TERMINAL_SCRIPT (in data.js), one letter at a time, in an endless loop.
  function initTerminal() {
    const out = $("#terminal-output");
    // Does the visitor's computer ask for reduced motion? (an accessibility setting)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let html = "";

    // If reduced motion is on: skip the animation and show all the text at
    // once. "return" then exits the function early.
    // ({ cmd, out: o } pulls the cmd and out properties out of each step;
    // "out" is renamed to "o" because the name "out" is already used above.)
    // innerHTML sets an element's contents as HTML. That's why every piece of
    // text is passed through esc() first, for safety.
    if (reduce) {
      TERMINAL_SCRIPT.forEach(({ cmd, out: o }) => {
        html += `<span class="p">root@pve:~#</span> ${esc(cmd)}\n` + (o ? `<span class="o">${esc(o)}</span>\n` : "");
      });
      out.innerHTML = html;
      return;
    }

    // Otherwise, animate. "line" tracks which step of the script we're on.
    // sleep(ms) creates a pause of ms milliseconds. It returns a Promise (an
    // object representing something that will finish later). Inside an
    // "async" function, "await sleep(...)" waits for the pause to finish
    // before continuing, without freezing the rest of the page.
    let line = 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async function run() {
      // while (true) repeats forever; the animation loops for as long as the
      // page is open.
      while (true) {
        const { cmd, out: o } = TERMINAL_SCRIPT[line];
        const prefix = `<span class="p">root@pve:~#</span> `;
        // A "for" loop: i counts up from 0 to the command's length. Each time,
        // show one more letter (cmd.slice(0, i) is the first i letters) plus a
        // blinking cursor, then pause. Long commands type faster (12ms per
        // letter) than short ones (45ms) so they don't take too long.
        for (let i = 0; i <= cmd.length; i++) {
          out.innerHTML = html + prefix + esc(cmd.slice(0, i)) + '<span class="cursor">&nbsp;</span>';
          await sleep(cmd.length > 60 ? 12 : 45);
        }
        // The command is fully typed: add it and its output to the finished text.
        html += prefix + esc(cmd) + "\n" + (o ? `<span class="o">${esc(o)}</span>\n` : "");
        out.innerHTML = html + '<span class="cursor">&nbsp;</span>';
        await sleep(900);
        // Move on to the next step (++ adds 1). After the last one, wait 2.5
        // seconds, then clear the screen and start again from the first step.
        line++;
        if (line >= TERMINAL_SCRIPT.length) {
          await sleep(2500);
          line = 0;
          html = "";
        }
      }
    })();
  }

  // ---------- Tabs ----------
  // Makes the "Proxmox in a nutshell" tabs work. When a tab is clicked:
  //   - it gets the "active" class and every other tab loses it, and
  //   - the panel whose data-panel matches the tab's data-tab gets "active"
  //     (so it's shown) and every other panel loses it (so they're hidden).
  // classList.toggle("active", condition) adds the class if the condition is
  // true and removes it if false. ".dataset.tab" reads the data-tab attribute.
  function initTabs() {
    $$(".tab").forEach((tab) =>
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
        $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab));
      })
    );
  }

  // ---------- Service explorer ----------
  // Sets up the search box, category filter buttons, and service cards.
  function initServices() {
    // Build the list of categories: "All", followed by each category found in
    // SERVICES, with duplicates removed (new Set). The "..." (SPREAD syntax)
    // unpacks the items of one list into another.
    const categories = ["All", ...new Set(SERVICES.map((s) => s.category))];
    const chipWrap = $("#category-chips");
    // Create one button ("chip") per category. "All" starts as active.
    chipWrap.innerHTML = categories
      .map((c) => `<button class="chip${c === "All" ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`)
      .join("");
    // One click listener on the chips' container handles ALL the chips. This
    // technique is called EVENT DELEGATION. e.target is the exact element that
    // was clicked; .closest(".chip") finds the chip it belongs to (or nothing,
    // if the click was in an empty gap, in which case we stop with "return").
    // Then: remember the category, highlight the chosen chip, redraw the cards.
    chipWrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.category = chip.dataset.cat;
      $$(".chip", chipWrap).forEach((c) => c.classList.toggle("active", c === chip));
      renderServices();
    });

    // Every time you type in the search box (the "input" event), save the text
    // (with extra spaces trimmed off and converted to lowercase, so searches
    // ignore capital letters) and redraw the cards.
    $("#service-search").addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      renderServices();
    });

    // Clicks on the card grid (event delegation again):
    //   - if the "＋ Add" button was clicked, add/remove that service from the
    //     plan. e.stopPropagation() stops the click from ALSO counting as a
    //     click on the card (which would open the pop-up).
    //   - otherwise, if a card was clicked, open its details pop-up.
    const grid = $("#service-grid");
    grid.addEventListener("click", (e) => {
      const add = e.target.closest(".add-btn");
      const card = e.target.closest(".service-card");
      if (add) { e.stopPropagation(); togglePlan(add.dataset.id); return; }
      if (card) openModal(card.dataset.id);
    });
    // Keyboard support: if a card is selected using the Tab key, pressing
    // Enter or Space opens it. e.preventDefault() stops the browser's normal
    // reaction to that key (Space would otherwise scroll the page).
    grid.addEventListener("keydown", (e) => {
      const card = e.target.closest(".service-card");
      if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openModal(card.dataset.id);
      }
    });

    // Draw the cards for the first time.
    renderServices();
  }

  // matches(s): decides whether service "s" should be shown, based on the
  // current category filter and search text. Returns true (show) or false (hide).
  //   1. If a category is chosen and this service isn't in it, hide it.
  //   2. If there's no search text, show it.
  //   3. Otherwise, combine all of its searchable text into one lowercase
  //      string (the "haystack") and check that EVERY word typed appears in it.
  //      .split(/\s+/) breaks the search text into words at the spaces.
  function matches(s) {
    if (state.category !== "All" && s.category !== state.category) return false;
    if (!state.query) return true;
    const hay = [s.name, s.desc, s.category, s.type, ...s.tags].join(" ").toLowerCase();
    return state.query.split(/\s+/).every((w) => hay.includes(w));
  }

  // renderServices: (re)draws the service cards. "Render" means to build and
  // display something on the page.
  //   - Keep only services that match the current filter and search.
  //   - Update the "X of Y services" count.
  //   - If any matched, build one card of HTML per service and join them
  //     together; if none matched, show a "No services match" message instead.
  //   - Each card's Add button shows "✓ Added" if the service is already in the
  //     plan. Every piece of data goes through esc() for safety.
  //   - tabindex="0" lets a card be selected with the keyboard's Tab key.
  function renderServices() {
    const list = SERVICES.filter(matches);
    $("#result-count").textContent = `${list.length} of ${SERVICES.length} services`;
    $("#service-grid").innerHTML = list.length
      ? list.map((s) => {
          const added = state.plan.includes(s.id);
          return `
          <article class="service-card" tabindex="0" data-id="${esc(s.id)}" aria-label="${esc(s.name)} details">
            <div class="top"><span class="emoji">${esc(s.emoji)}</span>
              <div><h3>${esc(s.name)}</h3><span class="cat">${esc(s.category)}</span></div></div>
            <p>${esc(s.desc)}</p>
            <div class="foot">
              <span class="type-tag ${guestType(s.type)}">${guestType(s.type)}</span>
              <button class="btn add-btn${added ? " added" : ""}" data-id="${esc(s.id)}">${added ? "✓ Added" : "＋ Add"}</button>
            </div>
          </article>`;
        }).join("")
      : `<p class="muted">No services match. Try another search term.</p>`;
  }

  // ---------- Modal ----------
  // openModal(id): fills the pop-up window with one service's details and
  // opens it.
  //   - Look up the service by its id, and check if it's already in the plan.
  //   - Build the pop-up's HTML: emoji, name, category, descriptions, a row
  //     of four spec boxes, tags, an Add/Remove button, and a link to the
  //     official site.
  //   - The link opens in a new tab (target="_blank"). rel="noopener
  //     noreferrer" is a security setting that stops the new page from being
  //     able to control this one. safeUrl() makes sure it's a normal web link.
  //   - When the Add/Remove button is clicked, update the plan and close the
  //     pop-up. showModal() opens the <dialog> on top of the page.
  function openModal(id) {
    const s = byId.get(id);
    const added = state.plan.includes(id);
    $("#modal-content").innerHTML = `
      <div class="modal-head"><span class="emoji">${esc(s.emoji)}</span>
        <div><h2 class="modal-title">${esc(s.name)}</h2><span class="muted">${esc(s.category)} · recommended as <span class="type-tag ${guestType(s.type)}">${guestType(s.type)}</span></span></div>
      </div>
      <p>${esc(s.desc)}</p>
      <p class="muted">${esc(s.details)}</p>
      <div class="spec-row">
        <div class="spec"><strong>${esc(s.cpu)}</strong><span>vCPU</span></div>
        <div class="spec"><strong>${esc(fmtRam(s.ram))}</strong><span>RAM</span></div>
        <div class="spec"><strong>${esc(s.disk)} GB</strong><span>Disk</span></div>
        <div class="spec"><strong>${guestType(s.type)}</strong><span>Guest type</span></div>
      </div>
      <p class="small muted">Tags: ${esc(s.tags.join(", "))}</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="modal-add">${added ? "Remove from lab" : "＋ Add to lab"}</button>
        <a class="btn btn-ghost" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">Official site ↗</a>
      </div>`;
    $("#modal-add").addEventListener("click", () => { togglePlan(id); $("#service-modal").close(); });
    $("#service-modal").showModal();
  }

  // initModal: sets up the two ways to close the pop-up: clicking the ✕
  // button, or clicking the darkened area outside the box. (A click on the
  // dark backdrop counts as a click on the <dialog> element itself, which is
  // why e.target === modal detects it.)
  function initModal() {
    const modal = $("#service-modal");
    $(".modal-close", modal).addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  }

  // ---------- Lab builder ----------
  // togglePlan(id): adds a service to the plan, or removes it if already there.
  //   - indexOf finds the service's position in the plan list (-1 = not found).
  //   - If found, splice(i, 1) removes 1 item at position i; otherwise push
  //     adds it to the end of the list.
  //   - Show a toast message, save the plan to localStorage, and redraw both
  //     the service cards (to update their Add buttons) and the plan table.
  function togglePlan(id) {
    const i = state.plan.indexOf(id);
    if (i >= 0) { state.plan.splice(i, 1); toast(`Removed ${byId.get(id).name}`); }
    else { state.plan.push(id); toast(`Added ${byId.get(id).name} to your lab`); }
    store.set("plan", state.plan);
    renderServices();
    renderPlan();
  }

  // initBuilder: sets up all the controls in the Lab Builder section.
  function initBuilder() {
    // The three sliders, grouped in an object so they can be handled together.
    const inputs = { cpu: $("#host-cpu"), ram: $("#host-ram"), disk: $("#host-disk") };
    // Object.entries gives [name, element] pairs, e.g. ["cpu", the CPU slider].
    // For each slider: set its position from the saved specs, and whenever
    // it's moved, store the new value (kept within the slider's min/max; the
    // + in front of el.min converts the text to a number) and save.
    Object.entries(inputs).forEach(([k, el]) => {
      el.value = state.host[k];
      el.addEventListener("input", () => { state.host[k] = clampNum(el.value, +el.min, +el.max, state.host[k]); saveHost(); });
    });
    // The ZFS checkbox: set it from the saved specs, and save whenever it changes.
    $("#use-zfs").checked = state.host.zfs;
    $("#use-zfs").addEventListener("change", (e) => { state.host.zfs = e.target.checked; saveHost(); });

    // Preset buttons: copy that preset's numbers (from PRESETS in data.js)
    // into the host specs (Object.assign copies properties from one object
    // into another), move the sliders to match, save, and show a message.
    // [data-preset] is a CSS selector meaning "any element with a data-preset
    // attribute".
    $$("[data-preset]").forEach((b) =>
      b.addEventListener("click", () => {
        Object.assign(state.host, PRESETS[b.dataset.preset]);
        Object.entries(inputs).forEach(([k, el]) => (el.value = state.host[k]));
        saveHost();
        toast(`Loaded "${b.textContent}" preset`);
      })
    );

    // The ✕ buttons in the plan table remove that service (event delegation,
    // since the table rows are rebuilt often).
    $("#plan-body").addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-btn");
      if (btn) togglePlan(btn.dataset.id);
    });

    // "Load starter pack": add each STARTER_PACK service that isn't already
    // in the plan, save, and redraw.
    $("#starter-pack").addEventListener("click", () => {
      STARTER_PACK.forEach((id) => { if (!state.plan.includes(id)) state.plan.push(id); });
      store.set("plan", state.plan);
      renderServices(); renderPlan();
      toast("Starter pack loaded");
    });
    // "Clear": if the plan isn't already empty (.length is the number of
    // items), ask the user to confirm with a browser pop-up (confirm returns
    // true for OK, false for Cancel). If confirmed, empty the plan, save, and
    // redraw.
    $("#clear-plan").addEventListener("click", () => {
      if (!state.plan.length) return;
      if (!confirm("Remove all services from your lab plan?")) return;
      state.plan = [];
      store.set("plan", state.plan);
      renderServices(); renderPlan();
    });
    // "Copy plan": run exportPlan (defined further down).
    $("#export-plan").addEventListener("click", exportPlan);

    // Draw the plan table and meters for the first time.
    renderPlan();
  }

  // saveHost: save the host specs to localStorage and redraw the results.
  function saveHost() {
    store.set("host", state.host);
    renderPlan();
  }

  // hostReserve: how much of the host's resources Proxmox needs for itself,
  // so they aren't counted as available for services: 1 CPU thread, 32 GB of
  // disk, and 2 GB of RAM plus extra if ZFS is used. The result's RAM is
  // converted to MB (x 1024) to match the services' RAM numbers.
  // "const { ram } = state.host" is DESTRUCTURING: it's shorthand for
  // "const ram = state.host.ram".
  function hostReserve() {
    const { ram } = state.host;
    // Proxmox itself ~2 GB; ZFS ARC defaults to roughly 10% of RAM on new installs (capped at 16 GB).
    // (ARC is ZFS's memory cache, a part of RAM it uses to speed up disk access.)
    const zfsRam = state.host.zfs ? Math.min(ram * 0.1, 16) : 0;
    return { cpu: 1, ramMb: (2 + zfsRam) * 1024, diskGb: 32 };
  }

  // totals: adds up the CPU, RAM and disk of every service in the plan.
  // .reduce goes through a list and builds up a single result: it starts with
  // { cpu: 0, ram: 0, disk: 0 } (the "t" for totals) and adds each service's
  // numbers to it. (+= means "add to the current value".)
  function totals() {
    return state.plan.reduce(
      (t, id) => { const s = byId.get(id); t.cpu += s.cpu; t.ram += s.ram; t.disk += s.disk; return t; },
      { cpu: 0, ram: 0, disk: 0 }
    );
  }

  // warnAt/badAt are percentages. CPU can be safely overcommitted, so it uses higher thresholds.
  // ("Overcommitted" means giving services more virtual CPUs in total than the
  // host really has. That's normally fine, since services rarely all work hard
  // at the same moment.)
  //
  // setMeter: updates one progress-bar meter.
  //   id     which meter element to update
  //   used   how much the services need
  //   avail  how much the host has available
  //   label  the text to display, e.g. "4 / 7 vCPU"
  //   warnAt / badAt  percentages where the bar turns yellow / red (defaults:
  //          80 and 100, used if no other values are given)
  // It calculates the percentage used (100% if nothing is available, to avoid
  // dividing by zero), sets the bar's width (a full bar = badAt), picks its
  // color class, writes the label, and returns the percentage.
  function setMeter(id, used, avail, label, warnAt = 80, badAt = 100) {
    const pct = avail > 0 ? (used / avail) * 100 : 100;
    const el = $("#" + id);
    const fill = $(".meter-fill", el);
    fill.style.width = Math.min((pct / badAt) * 100, 100) + "%";
    fill.className = "meter-fill" + (pct > badAt ? " bad" : pct > warnAt ? " warn" : "");
    $(".meter-val", el).textContent = `${label} (${Math.round(pct)}%)`;
    return pct;
  }

  // renderPlan: redraws everything in the Lab Builder's results.
  function renderPlan() {
    // Show the current slider values next to each slider label.
    const h = state.host;
    $("#cpu-out").textContent = h.cpu;
    $("#ram-out").textContent = h.ram;
    $("#disk-out").textContent = fmtDisk(h.disk);

    // Work out what's left for services after Proxmox's own reserve, and what
    // the selected services need in total. (RAM: GB x 1024 = MB.)
    const r = hostReserve();
    const t = totals();
    const availCpu = h.cpu - r.cpu;
    const availRam = h.ram * 1024 - r.ramMb;
    const availDisk = h.disk - r.diskGb;

    // Update the three meters. CPU uses higher limits (yellow over 200%, red
    // over 400%) because CPU can be safely overcommitted; RAM and disk use the
    // defaults (80% and 100%).
    const cpuPct = setMeter("meter-cpu", t.cpu, availCpu, `${t.cpu} / ${availCpu} vCPU`, 200, 400);
    const ramPct = setMeter("meter-ram", t.ram, availRam, `${fmtRam(t.ram)} / ${fmtRam(Math.max(0, Math.round(availRam)))}`);
    const diskPct = setMeter("meter-disk", t.disk, availDisk, `${fmtDisk(t.disk)} / ${fmtDisk(availDisk)}`);

    // Write the verdict message, checking the conditions in order:
    //   no services        -> a friendly prompt
    //   RAM or disk > 100% -> red "Over capacity" (says which one is short)
    //   getting high       -> yellow "tight" warning
    //   otherwise          -> green "Looks good" with the spare RAM
    const v = $("#verdict");
    if (!state.plan.length) {
      v.className = "verdict"; v.textContent = "👋 Add some services to see if they fit.";
    } else if (ramPct > 100 || diskPct > 100) {
      v.className = "verdict bad";
      v.textContent = `🚫 Over capacity — ${ramPct > 100 ? "you need more RAM" : "you need more storage"}, or trim some services.`;
    } else if (ramPct > 80 || diskPct > 80 || cpuPct > 200) {
      v.className = "verdict warn";
      v.textContent = "⚠️ It'll fit, but it's tight. Leave headroom for updates and growth.";
    } else {
      v.className = "verdict";
      v.textContent = `✅ Looks good! ~${fmtRam(Math.round(availRam - t.ram))} RAM to spare.`;
    }

    // Update the count badge, and show EITHER the "No services yet" note OR
    // the table, depending on whether the plan is empty.
    $("#selected-count").textContent = state.plan.length;
    $("#plan-empty").classList.toggle("hidden", state.plan.length > 0);
    $(".plan-table").classList.toggle("hidden", state.plan.length === 0);
    // Build one table row (<tr>) per planned service. "i" is the row's
    // position (0, 1, 2...), used to give each a pretend Proxmox ID starting
    // at 100 (Proxmox numbers its guests from 100).
    $("#plan-body").innerHTML = state.plan.map((id, i) => {
      const s = byId.get(id);
      return `<tr>
        <td class="mono">${100 + i}</td>
        <td>${esc(s.emoji)} ${esc(s.name)}</td>
        <td><span class="type-tag ${guestType(s.type)}">${guestType(s.type)}</span></td>
        <td class="mono">${esc(s.cpu)}</td>
        <td class="mono">${esc(fmtRam(s.ram))}</td>
        <td class="mono">${esc(s.disk)} GB</td>
        <td><button class="remove-btn" data-id="${esc(id)}" aria-label="Remove ${esc(s.name)}">✕</button></td>
      </tr>`;
    }).join("");
  }

  // exportPlan: copies the plan to your clipboard (the copy/paste memory) as
  // a Markdown table. Markdown is a simple text format where | characters
  // make table columns; it displays nicely on sites like GitHub.
  //   - If the plan is empty, just show a message and stop.
  //   - Build the text line by line in an array. Any | or line-break
  //     characters in a service name are replaced with spaces so they can't
  //     break the table.
  //   - navigator.clipboard.writeText copies the text. It's "async" (it may
  //     take a moment), hence "await". If copying isn't allowed (catch), show
  //     a pop-up box containing the text so you can copy it by hand.
  async function exportPlan() {
    if (!state.plan.length) { toast("Your plan is empty"); return; }
    const t = totals();
    const lines = [
      "# My Proxmox Lab Plan",
      `Host: ${state.host.cpu} threads, ${state.host.ram} GB RAM, ${fmtDisk(state.host.disk)} storage${state.host.zfs ? " (ZFS)" : ""}`,
      "",
      "| ID | Service | Type | vCPU | RAM | Disk |",
      "|----|---------|------|------|-----|------|",
      ...state.plan.map((id, i) => {
        const s = byId.get(id);
        return `| ${100 + i} | ${String(s.name).replace(/[|\r\n]/g, " ")} | ${s.type} | ${s.cpu} | ${fmtRam(s.ram)} | ${s.disk} GB |`;
      }),
      "",
      `Totals: ${t.cpu} vCPU, ${fmtRam(t.ram)} RAM, ${t.disk} GB disk`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast("Plan copied as Markdown 📋");
    } catch {
      prompt("Copy your plan:", lines.join("\n"));
    }
  }

  // ---------- Quiz ----------
  // Runs the "VM or LXC?" game. The smaller functions inside initQuiz can all
  // share its variables:
  //   order    the questions in shuffled order
  //   idx      the current question's position (index) in that order
  //   score    how many answers were right so far
  //   answered whether the current question has been answered yet
  function initQuiz() {
    let order, idx, score, answered;
    // best: reads the saved best score from localStorage, but only trusts it
    // if it's a whole number (integer) between 0 and the number of questions.
    const best = () => {
      const b = store.get("quizBest", null);
      return Number.isInteger(b) && b >= 0 && b <= QUIZ.length ? b : null;
    };
    // showBest: displays "Your best score: X / 10" (or nothing if there's none yet).
    const showBest = () => {
      const b = best();
      $("#quiz-best").textContent = b !== null ? `Your best score: ${b} / ${QUIZ.length}` : "";
    };
    // Remember the quiz card's original HTML, so it can be restored when
    // starting over (the results screen replaces it).
    const card = $("#quiz-card");
    const original = card.innerHTML;

    // start: begin a new game.
    //   - Restore the original card.
    //   - Shuffle the questions: [...QUIZ] copies the list, and sorting with a
    //     random comparison (Math.random() gives a random number between 0 and
    //     1) mixes up the order.
    //   - Reset the position and score to 0.
    //   - Hook up the answer and Next buttons (they're new elements after
    //     restoring the card, so their listeners must be added again).
    //   - Show the first question and the best score.
    function start() {
      card.innerHTML = original;
      order = [...QUIZ].sort(() => Math.random() - 0.5);
      idx = 0; score = 0;
      $$(".quiz-btn", card).forEach((b) => b.addEventListener("click", () => answer(b)));
      $("#quiz-next").addEventListener("click", next);
      show();
      showBest();
    }

    // show: display the current question. Updates the counter and progress
    // bar, clears old feedback, hides the Next button, and re-enables the
    // answer buttons with their green/red colors removed.
    function show() {
      answered = false;
      const item = order[idx];
      $("#quiz-count").textContent = `Question ${idx + 1} of ${order.length} · Score ${score}`;
      $("#quiz-progress-fill").style.width = (idx / order.length) * 100 + "%";
      $("#quiz-question").textContent = item.q;
      $("#quiz-feedback").textContent = "";
      $("#quiz-next").classList.add("hidden");
      $$(".quiz-btn", card).forEach((b) => { b.disabled = false; b.classList.remove("correct", "wrong"); });
    }

    // answer(btn): runs when you click VM or LXC.
    //   - Ignore extra clicks if this question was already answered.
    //   - Check whether the clicked button's data-answer matches the correct
    //     answer; if so, add 1 to the score.
    //   - Disable both buttons, color the correct one green, and if you picked
    //     wrong, color your choice red.
    //   - Show the explanation and updated score.
    //   - Show the Next button (labeled "See results →" on the last question)
    //     and move keyboard focus to it so keyboard users can press Enter.
    function answer(btn) {
      if (answered) return;
      answered = true;
      const item = order[idx];
      const right = btn.dataset.answer === item.a;
      if (right) score++;
      $$(".quiz-btn", card).forEach((b) => {
        b.disabled = true;
        if (b.dataset.answer === item.a) b.classList.add("correct");
        else if (b === btn) b.classList.add("wrong");
      });
      $("#quiz-feedback").innerHTML = `<strong>${right ? "✅ Correct!" : "❌ Not quite."}</strong> ${esc(item.why)}`;
      $("#quiz-count").textContent = `Question ${idx + 1} of ${order.length} · Score ${score}`;
      const next = $("#quiz-next");
      next.textContent = idx === order.length - 1 ? "See results →" : "Next →";
      next.classList.remove("hidden");
      next.focus();
    }

    // next: go to the next question, or, after the last one, show results.
    //   - If there are questions left, show the next one and stop.
    //   - Otherwise, save the score as the new best if it beats the old one.
    //   - Pick a message based on the fraction correct (1 = 100%, 0.7 = 70%).
    //   - Replace the card with a results screen and a "Play again" button
    //     that calls start().
    function next() {
      idx++;
      if (idx < order.length) return show();
      const b = best();
      if (b === null || score > b) store.set("quizBest", score);
      const pct = score / order.length;
      const msg = pct === 1 ? "Perfect! You're ready to build. 🏆"
        : pct >= 0.7 ? "Nice work — you know your guests. 👍"
        : "Check out the VMs vs LXC tab and try again!";
      card.innerHTML = `
        <div class="quiz-progress"><div id="quiz-progress-fill" class="full"></div></div>
        <h3>Results</h3>
        <div class="quiz-score">${esc(score)} / ${esc(order.length)}</div>
        <p>${esc(msg)}</p>
        <button class="btn btn-primary" id="quiz-restart">Play again</button>`;
      $("#quiz-restart").addEventListener("click", start);
      showBest();
    }

    // Start the first game when the page loads.
    start();
  }

  // ---------- Checklist ----------
  // Builds the getting-started checklist from CHECKLIST (in data.js).
  function initChecklist() {
    const wrap = $("#checklist-groups");
    // For each group (g, at position gi) build a collapsible <details> box.
    // Only the first group (gi === 0) starts open. Inside, build one checkbox
    // per item (at position ii). Each checkbox gets a key like "1-3" (group 1,
    // item 3), which is how its ticked state is saved.
    wrap.innerHTML = CHECKLIST.map((g, gi) => `
      <details class="check-group" ${gi === 0 ? "open" : ""}>
        <summary>${esc(g.group)} <span class="count" data-count="${gi}"></span></summary>
        <ul>${g.items.map((item, ii) => {
          const key = `${gi}-${ii}`;
          return `<li><label><input type="checkbox" data-key="${key}"><span>${esc(item)}</span></label></li>`;
        }).join("")}</ul>
      </details>`).join("");

    // Tick the boxes that were saved as ticked. (!! turns any value into a
    // plain true or false.)
    $$("input[data-key]", wrap).forEach((cb) => (cb.checked = !!state.checks[cb.dataset.key]));

    // Whenever a box is ticked or unticked (the "change" event): record it
    // (delete removes the entry when unticked), save to localStorage, and
    // update the progress display.
    wrap.addEventListener("change", (e) => {
      const cb = e.target.closest("input[data-key]");
      if (!cb) return;
      if (cb.checked) state.checks[cb.dataset.key] = true;
      else delete state.checks[cb.dataset.key];
      store.set("checks", state.checks);
      renderChecklist();
    });

    // "Reset checklist": after confirming, clear every tick, save, and redraw.
    $("#reset-checklist").addEventListener("click", () => {
      if (!confirm("Reset all checklist progress?")) return;
      state.checks = Object.create(null);
      store.set("checks", state.checks);
      $$("input[data-key]", wrap).forEach((cb) => (cb.checked = false));
      renderChecklist();
    });

    // Draw the progress for the first time.
    renderChecklist();
  }

  // renderChecklist: updates the progress displays.
  //   - Count how many boxes are ticked, and cross out finished items (class "done").
  //   - Update each group's "n/4" count.
  //   - Work out the overall percentage and move the progress ring. The
  //     circle's circumference (2 x pi x radius 52) is how long the orange line
  //     would be at 100%; the offset hides the unfinished part (see the
  //     .ring-fg notes in styles.css).
  //   - If you've JUST reached 100% (it wasn't 100% last time), show a
  //     celebration toast. The last percentage is remembered on
  //     renderChecklist._last. It is "undefined" (not set yet) on the very
  //     first draw, so the toast doesn't appear just from loading a page that
  //     was already complete.
  function renderChecklist() {
    const boxes = $$("#checklist-groups input[data-key]");
    const done = boxes.filter((b) => b.checked).length;
    boxes.forEach((b) => b.closest("li").classList.toggle("done", b.checked));
    CHECKLIST.forEach((g, gi) => {
      const n = g.items.filter((_, ii) => state.checks[`${gi}-${ii}`]).length;
      $(`[data-count="${gi}"]`).textContent = `${n}/${g.items.length}`;
    });
    const pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
    const circ = 2 * Math.PI * 52;
    $("#ring-fg").style.strokeDashoffset = circ * (1 - pct / 100);
    $("#ring-text").textContent = pct + "%";
    if (pct === 100 && renderChecklist._last !== undefined && renderChecklist._last !== 100) toast("🎉 Checklist complete — welcome to the homelab club!");
    renderChecklist._last = pct;
  }

  // ---------- Boot ----------
  // "Booting" means starting up. Everything above only DEFINED functions;
  // nothing runs until they're called. These lines call each setup function
  // once, in order, to bring every part of the page to life.
  initTheme();
  initNav();
  initTerminal();
  initTabs();
  initModal();
  initServices();
  initBuilder();
  initQuiz();
  initChecklist();
})();
