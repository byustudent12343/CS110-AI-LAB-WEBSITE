/* HomeLab Hub — interactive behavior. No build step, no dependencies. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  // Escape any text before it is placed in HTML, so data can never inject markup/scripts.
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Only allow http(s) links; anything else (javascript:, data:, …) becomes "#".
  const safeUrl = (u) => {
    try { const url = new URL(u, location.href); return /^https?:$/.test(url.protocol) ? url.href : "#"; }
    catch { return "#"; }
  };
  const GUEST_TYPES = new Set(["VM", "LXC"]);
  const guestType = (t) => (GUEST_TYPES.has(t) ? t : "LXC");
  const byId = new Map(SERVICES.map((s) => [s.id, s]));

  // ---------- Persistent state ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("hlh:" + key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("hlh:" + key, JSON.stringify(value)); } catch { /* storage disabled */ }
    },
  };

  const arr = (v) => (Array.isArray(v) ? v : []);
  const clampNum = (v, min, max, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
  };
  // Saved values can be edited by anyone with devtools or corrupted, so validate them.
  function loadHost() {
    const h = store.get("host", {}) || {};
    return {
      cpu: clampNum(h.cpu, 2, 64, 8),
      ram: clampNum(h.ram, 4, 256, 32),
      disk: clampNum(h.disk, 128, 16000, 1000),
      zfs: h.zfs === true,
    };
  }
  function loadChecks() {
    const raw = store.get("checks", {});
    const out = Object.create(null);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) if (/^\d+-\d+$/.test(k) && v === true) out[k] = true;
    }
    return out;
  }

  const state = {
    plan: [...new Set(arr(store.get("plan", [])))].filter((id) => typeof id === "string" && byId.has(id)),
    host: loadHost(),
    checks: loadChecks(),
    category: "All",
    query: "",
  };

  const fmtRam = (mb) => (mb >= 1024 ? (mb / 1024).toFixed(mb % 1024 ? 1 : 0) + " GB" : mb + " MB");
  const fmtDisk = (gb) => (gb >= 1000 ? (gb / 1000).toFixed(1) + " TB" : gb + " GB");

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- Theme ----------
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
  function initNav() {
    const toggle = $(".nav-toggle");
    const links = $(".nav-links");
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    $$(".nav-links a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));

    // Highlight the section currently in view
    const navMap = new Map($$(".nav-links a").map((a) => [a.getAttribute("href").slice(1), a]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && navMap.has(e.target.id)) {
          navMap.forEach((a) => a.classList.remove("active"));
          navMap.get(e.target.id).classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$("section[id]").forEach((s) => observer.observe(s));
  }

  // ---------- Terminal animation ----------
  function initTerminal() {
    const out = $("#terminal-output");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let html = "";

    if (reduce) {
      TERMINAL_SCRIPT.forEach(({ cmd, out: o }) => {
        html += `<span class="p">root@pve:~#</span> ${esc(cmd)}\n` + (o ? `<span class="o">${esc(o)}</span>\n` : "");
      });
      out.innerHTML = html;
      return;
    }

    let line = 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async function run() {
      while (true) {
        const { cmd, out: o } = TERMINAL_SCRIPT[line];
        const prefix = `<span class="p">root@pve:~#</span> `;
        for (let i = 0; i <= cmd.length; i++) {
          out.innerHTML = html + prefix + esc(cmd.slice(0, i)) + '<span class="cursor">&nbsp;</span>';
          await sleep(cmd.length > 60 ? 12 : 45);
        }
        html += prefix + esc(cmd) + "\n" + (o ? `<span class="o">${esc(o)}</span>\n` : "");
        out.innerHTML = html + '<span class="cursor">&nbsp;</span>';
        await sleep(900);
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
  function initTabs() {
    $$(".tab").forEach((tab) =>
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
        $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab));
      })
    );
  }

  // ---------- Service explorer ----------
  function initServices() {
    const categories = ["All", ...new Set(SERVICES.map((s) => s.category))];
    const chipWrap = $("#category-chips");
    chipWrap.innerHTML = categories
      .map((c) => `<button class="chip${c === "All" ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`)
      .join("");
    chipWrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.category = chip.dataset.cat;
      $$(".chip", chipWrap).forEach((c) => c.classList.toggle("active", c === chip));
      renderServices();
    });

    $("#service-search").addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      renderServices();
    });

    const grid = $("#service-grid");
    grid.addEventListener("click", (e) => {
      const add = e.target.closest(".add-btn");
      const card = e.target.closest(".service-card");
      if (add) { e.stopPropagation(); togglePlan(add.dataset.id); return; }
      if (card) openModal(card.dataset.id);
    });
    grid.addEventListener("keydown", (e) => {
      const card = e.target.closest(".service-card");
      if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openModal(card.dataset.id);
      }
    });

    renderServices();
  }

  function matches(s) {
    if (state.category !== "All" && s.category !== state.category) return false;
    if (!state.query) return true;
    const hay = [s.name, s.desc, s.category, s.type, ...s.tags].join(" ").toLowerCase();
    return state.query.split(/\s+/).every((w) => hay.includes(w));
  }

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

  function initModal() {
    const modal = $("#service-modal");
    $(".modal-close", modal).addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  }

  // ---------- Lab builder ----------
  function togglePlan(id) {
    const i = state.plan.indexOf(id);
    if (i >= 0) { state.plan.splice(i, 1); toast(`Removed ${byId.get(id).name}`); }
    else { state.plan.push(id); toast(`Added ${byId.get(id).name} to your lab`); }
    store.set("plan", state.plan);
    renderServices();
    renderPlan();
  }

  function initBuilder() {
    const inputs = { cpu: $("#host-cpu"), ram: $("#host-ram"), disk: $("#host-disk") };
    Object.entries(inputs).forEach(([k, el]) => {
      el.value = state.host[k];
      el.addEventListener("input", () => { state.host[k] = clampNum(el.value, +el.min, +el.max, state.host[k]); saveHost(); });
    });
    $("#use-zfs").checked = state.host.zfs;
    $("#use-zfs").addEventListener("change", (e) => { state.host.zfs = e.target.checked; saveHost(); });

    $$("[data-preset]").forEach((b) =>
      b.addEventListener("click", () => {
        Object.assign(state.host, PRESETS[b.dataset.preset]);
        Object.entries(inputs).forEach(([k, el]) => (el.value = state.host[k]));
        saveHost();
        toast(`Loaded "${b.textContent}" preset`);
      })
    );

    $("#plan-body").addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-btn");
      if (btn) togglePlan(btn.dataset.id);
    });

    $("#starter-pack").addEventListener("click", () => {
      STARTER_PACK.forEach((id) => { if (!state.plan.includes(id)) state.plan.push(id); });
      store.set("plan", state.plan);
      renderServices(); renderPlan();
      toast("Starter pack loaded");
    });
    $("#clear-plan").addEventListener("click", () => {
      if (!state.plan.length) return;
      if (!confirm("Remove all services from your lab plan?")) return;
      state.plan = [];
      store.set("plan", state.plan);
      renderServices(); renderPlan();
    });
    $("#export-plan").addEventListener("click", exportPlan);

    renderPlan();
  }

  function saveHost() {
    store.set("host", state.host);
    renderPlan();
  }

  function hostReserve() {
    const { ram } = state.host;
    // Proxmox itself ~2 GB; ZFS ARC defaults to roughly 10% of RAM on new installs (capped at 16 GB).
    const zfsRam = state.host.zfs ? Math.min(ram * 0.1, 16) : 0;
    return { cpu: 1, ramMb: (2 + zfsRam) * 1024, diskGb: 32 };
  }

  function totals() {
    return state.plan.reduce(
      (t, id) => { const s = byId.get(id); t.cpu += s.cpu; t.ram += s.ram; t.disk += s.disk; return t; },
      { cpu: 0, ram: 0, disk: 0 }
    );
  }

  // warnAt/badAt are percentages. CPU can be safely overcommitted, so it uses higher thresholds.
  function setMeter(id, used, avail, label, warnAt = 80, badAt = 100) {
    const pct = avail > 0 ? (used / avail) * 100 : 100;
    const el = $("#" + id);
    const fill = $(".meter-fill", el);
    fill.style.width = Math.min((pct / badAt) * 100, 100) + "%";
    fill.className = "meter-fill" + (pct > badAt ? " bad" : pct > warnAt ? " warn" : "");
    $(".meter-val", el).textContent = `${label} (${Math.round(pct)}%)`;
    return pct;
  }

  function renderPlan() {
    const h = state.host;
    $("#cpu-out").textContent = h.cpu;
    $("#ram-out").textContent = h.ram;
    $("#disk-out").textContent = fmtDisk(h.disk);

    const r = hostReserve();
    const t = totals();
    const availCpu = h.cpu - r.cpu;
    const availRam = h.ram * 1024 - r.ramMb;
    const availDisk = h.disk - r.diskGb;

    const cpuPct = setMeter("meter-cpu", t.cpu, availCpu, `${t.cpu} / ${availCpu} vCPU`, 200, 400);
    const ramPct = setMeter("meter-ram", t.ram, availRam, `${fmtRam(t.ram)} / ${fmtRam(Math.max(0, Math.round(availRam)))}`);
    const diskPct = setMeter("meter-disk", t.disk, availDisk, `${fmtDisk(t.disk)} / ${fmtDisk(availDisk)}`);

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

    $("#selected-count").textContent = state.plan.length;
    $("#plan-empty").classList.toggle("hidden", state.plan.length > 0);
    $(".plan-table").classList.toggle("hidden", state.plan.length === 0);
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
  function initQuiz() {
    let order, idx, score, answered;
    const best = () => {
      const b = store.get("quizBest", null);
      return Number.isInteger(b) && b >= 0 && b <= QUIZ.length ? b : null;
    };
    const showBest = () => {
      const b = best();
      $("#quiz-best").textContent = b !== null ? `Your best score: ${b} / ${QUIZ.length}` : "";
    };
    const card = $("#quiz-card");
    const original = card.innerHTML;

    function start() {
      card.innerHTML = original;
      order = [...QUIZ].sort(() => Math.random() - 0.5);
      idx = 0; score = 0;
      $$(".quiz-btn", card).forEach((b) => b.addEventListener("click", () => answer(b)));
      $("#quiz-next").addEventListener("click", next);
      show();
      showBest();
    }

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

    start();
  }

  // ---------- Checklist ----------
  function initChecklist() {
    const wrap = $("#checklist-groups");
    wrap.innerHTML = CHECKLIST.map((g, gi) => `
      <details class="check-group" ${gi === 0 ? "open" : ""}>
        <summary>${esc(g.group)} <span class="count" data-count="${gi}"></span></summary>
        <ul>${g.items.map((item, ii) => {
          const key = `${gi}-${ii}`;
          return `<li><label><input type="checkbox" data-key="${key}"><span>${esc(item)}</span></label></li>`;
        }).join("")}</ul>
      </details>`).join("");

    $$("input[data-key]", wrap).forEach((cb) => (cb.checked = !!state.checks[cb.dataset.key]));

    wrap.addEventListener("change", (e) => {
      const cb = e.target.closest("input[data-key]");
      if (!cb) return;
      if (cb.checked) state.checks[cb.dataset.key] = true;
      else delete state.checks[cb.dataset.key];
      store.set("checks", state.checks);
      renderChecklist();
    });

    $("#reset-checklist").addEventListener("click", () => {
      if (!confirm("Reset all checklist progress?")) return;
      state.checks = Object.create(null);
      store.set("checks", state.checks);
      $$("input[data-key]", wrap).forEach((cb) => (cb.checked = false));
      renderChecklist();
    });

    renderChecklist();
  }

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
