"use strict";
/* Mes vœux P1/P2 2026 — page locale. Données : data.js (généré par build_data.py). */

const D = window.DATA;
const M = D.modules;
const CAMPS = ["P1-1", "P1-2", "P2-1", "P2-2"];
const PERIODE = { "P1-1": "fin nov. → début janv.", "P1-2": "janv.", "P2-1": "nov. → janv.", "P2-2": "nov. → janv." };
const IMPOSE = {}; // P1-1 -> partie 2 imposée
for (const m of Object.values(M)) if (m.campagne === "P1-1" && m.suite_imposee) IMPOSE[m.code] = m.suite;
const STORE = "voeux-p1p2-2026";

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dateOf = iso => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtD = iso => dateOf(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtDM = iso => dateOf(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const mins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const half = t => (t < "13:30" ? "am" : "pm");
const pct = x => `${Math.round(x * 100)} %`;
const codeOf = k => M[k].code;

/* ---------------- État ---------------- */
// Ordre de la campagne, sauf DIV4201 et NET4106 (P2-2) placés sous JOKER : sinon les règles « une seule fois » s'allument d'emblée.
function campaignOrder(c) {
  const o = [...D.campagnes[c].ordre], j = o.findIndex(k => codeOf(k) === "JOKER");
  const out = k => codeOf(k) === "DIV4201" || k === "NET4106@P2-2";
  return [...o.slice(0, j).filter(k => !out(k)), o[j], ...o.slice(0, j).filter(out), ...o.slice(j + 1)];
}
function defaultState() {
  return {
    order: Object.fromEntries(CAMPS.map(c => [c, campaignOrder(c)])),
    targets: [{ f: "HTI", slot: 1 }, { f: "MSA", slot: 2 }, { f: "MAIA", slot: 3 }],
    pinned: null,
    cal: null,
  };
}
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    const ok = s && CAMPS.every(c => Array.isArray(s.order?.[c]) &&
      s.order[c].length === D.campagnes[c].ordre.length && s.order[c].every(k => M[k]));
    if (ok) return { ...defaultState(), ...s, pinned: null };
  } catch (_) { /* état corrompu : on repart de zéro */ }
  return defaultState();
}
const save = () => localStorage.setItem(STORE, JSON.stringify({ order: S.order, targets: S.targets, cal: S.cal }));
const color = () => "var(--accent)";

/* ---------------- Règles ---------------- */
const wanted = c => { const o = S.order[c]; const j = o.findIndex(k => codeOf(k) === "JOKER"); return o.slice(0, j < 0 ? o.length : j); };
const rankIn = (c, code) => { const i = wanted(c).findIndex(k => codeOf(k) === code); return i < 0 ? null : i + 1; };

function p12For(k1) {
  const x = codeOf(k1);
  if (IMPOSE[x]) return { key: IMPOSE[x], impose: true };
  for (const k of wanted("P1-2")) {
    const m = M[k];
    if (m.prerequis && m.prerequis !== x) continue;
    if (m.code === "DIV4201" && x === "DIV4201") continue;
    return { key: k, impose: false };
  }
  return { key: S.order["P1-2"].find(k => codeOf(k) === "JOKER"), impose: false };
}

function analyze() {
  const st = {}, alerts = [];
  const flag = (k, lvl, msg) => { st[k] = { lvl, msg }; alerts.push({ k, lvl, msg }); };
  for (const k of wanted("P1-2")) {
    const p = M[k].prerequis;
    if (!p) continue;
    const r = rankIn("P1-1", p);
    if (r === null) flag(k, "bad", `${codeOf(k)} exige ${p} en P1-1, absent de tes vœux P1-1`);
    else if (r > 3) flag(k, "risk", `${codeOf(k)} n'est possible que si tu obtiens ${p}, classé ${r}ᵉ en P1-1`);
  }
  const once = (code, label) => {
    const hits = CAMPS.filter(c => wanted(c).some(k => codeOf(k) === code));
    if (hits.length < 2) return;
    const msg = `${code} ${label} : garde-le seulement en ${hits[0]}, ou descends-le sous JOKER en ${hits.slice(1).join(", ")}`;
    for (const c of hits.slice(1)) st[`${code}@${c}`] = { lvl: "bad", msg };
    alerts.push({ k: `${code}@${hits[1]}`, lvl: "bad", msg });
  };
  once("DIV4201", "ne peut être choisi qu'une fois sur les 4 campagnes");
  once("NET4106", "est le même cours en P2-1 et P2-2");
  return { st, alerts };
}

/* ---------------- Indicateurs ---------------- */
function taken(m, f) { // part des <f> de 2025-26 qui avaient pris le module
  if (!m.stats) return null;
  const b = m.stats.base[f];
  return b ? m.stats.vers[f] / b : null;
}
function barsHTML(m) { // carré de couleur (identité) + chiffre écrit (lisible)
  if (!S.targets.length || !m.stats) return "";
  const vals = S.targets.map(t => ({ t, v: taken(m, t.f) }));
  const tip = vals.map(({ t, v }) => `${t.f} : ${v === null ? "—" : `${m.stats.vers[t.f]}/${m.stats.base[t.f]} (${pct(v)})`}`).join(" · ");
  return `<span class="mts" title="% des étudiants de la filière (2025-26) qui avaient pris ce module — ${esc(tip)}">${
    vals.map(({ t, v }) => `<span class="mt ${!v ? "zero" : ""}"><span class="f">${t.f}</span>${v === null ? "–" : Math.round(v * 100)}</span>`).join("")
  }</span>`;
}
const dots = c => (c ? `<span class="dots" title="Charge selon les avis : ${["", "légère", "moyenne", "lourde"][c]}">${"●".repeat(c)}<span class="off">${"●".repeat(3 - c)}</span></span>` : "");
function pills(m) {
  const p = [];
  if (m.suite_imposee) p.push(`<span class="tag" title="Partie 2 imposée en P1-2">+${esc(m.suite)}</span>`);
  else if (m.suite && m.campagne === "P1-1") p.push(`<span class="tag" title="Suite facultative en P1-2">→ ${esc(m.suite)}</span>`);
  if (m.prerequis && !m.impose_par) p.push(`<span class="tag" title="Prérequis">exige ${esc(m.prerequis)}</span>`);
  if (m.code === "DIV4201") p.push(`<span class="tag">1 seule fois</span>`);
  if (m.code === "NET4106") p.push(`<span class="tag">${m.campagne === "P2-1" ? "EN" : "FR"} · 1 fois</span>`);
  if (m.stats && m.stats.n === 0 && m.code !== "DIV4201") p.push(`<span class="tag">nouveau</span>`);
  else if (m.stats && m.stats.n >= m.places && m.code !== "MAT4101") p.push(`<span class="tag full" title="${m.stats.n} affectés en 2025-26 pour ${m.places} places en 2026 : ton 2ᵉ choix comptera">plein 25-26</span>`);
  return p.slice(0, 2).join("");
}

/* ---------------- Rendu : colonnes ---------------- */
function render() {
  const { st } = analyze();
  const cols = $("#columns");
  cols.innerHTML = CAMPS.map(c => {
    const o = S.order[c], j = o.findIndex(k => codeOf(k) === "JOKER");
    let pre = "";
    if (c === "P1-2") {
      const top = codeOf(S.order["P1-1"][0]);
      if (IMPOSE[top]) pre = `<div class="imposed" data-key="${IMPOSE[top]}" role="button" tabindex="0">Si tu obtiens <b>${esc(top)}</b> (ton 1er vœu P1-1), ton P1-2 sera <b>${esc(IMPOSE[top])}</b> : ce classement ne servira pas.</div><div class="sinon">sinon :</div>`;
    }
    return `<div class="col" data-camp="${c}">
      <div class="col-head"><h2>${c}</h2><span class="faint">${PERIODE[c]} · ${o.length} choix</span>${issues(c, st)}</div>
      ${pre}<div class="list">${o.map((k, i) => cardHTML(k, i, j, st[k])).join("")}</div></div>`;
  }).join("");

  $("#legend").innerHTML = S.targets.length
    ? `chiffres = % des étudiants 2025-26 de la filière qui avaient pris le module · <span class="dots">●●○</span> charge d'après les avis`
    : "Choisis une filière visée pour voir les chiffres.";
  renderDetail(S.pinned || hoverKey || null);
  renderCalendar();
}
function issues(c, st) { // ✕ n / ! n dans l'en-tête de colonne, détail au survol
  const list = S.order[c].map(k => st[k]).filter(Boolean);
  if (!list.length) return "";
  const bad = list.filter(x => x.lvl === "bad").length, lvl = bad ? "bad" : "risk";
  return `<span class="tag ${lvl}" title="${esc([...new Set(list.map(x => x.msg))].join("\n"))}">${bad ? `✕ ${bad}` : `! ${list.length}`} à revoir</span>`;
}
function cardHTML(k, i, j, s) {
  const m = M[k], below = j >= 0 && i > j, isJ = m.code === "JOKER";
  const cls = ["card", below && "below", isJ && "joker", s && s.lvl, S.pinned === k && "pinned"].filter(Boolean).join(" ");
  const ic = s ? `<span class="state-ic ${s.lvl}" title="${esc(s.msg)}">${s.lvl === "bad" ? "✕" : "!"}</span>` : "";
  return `<div class="${cls}" data-key="${k}" tabindex="0" ${s ? `title="${esc(s.msg)}"` : ""}>
    <div class="l1"><span class="rank">${below ? "" : i + 1}</span><span class="code">${esc(m.code)}</span><span class="ttl">${esc(isJ ? "rien en dessous ne sera attribué" : m.titre)}</span><span class="places">${isJ ? "" : m.places + " pl"}</span></div>
    ${isJ ? "" : `<div class="l2">${ic}${barsHTML(m)}${dots(m.avis.charge)}${pills(m)}</div>`}
    <div class="move"><button data-mv="-1" tabindex="-1" aria-label="Monter">▲</button><button data-mv="1" tabindex="-1" aria-label="Descendre">▼</button></div>
  </div>`;
}

/* ---------------- Rendu : fiche ---------------- */
let hoverKey = null;
function ruleText(m) {
  if (m.code === "JOKER") return "Tout ce qui est classé après JOKER ne sera jamais attribué.";
  if (m.impose_par) return `Imposé si tu obtiens ${m.impose_par} en P1-1 : il ne se classe pas.`;
  if (m.suite_imposee) return `Impose ${m.suite} en P1-2 : si tu l'obtiens, ton classement P1-2 ne sert pas.`;
  if (m.suite && m.campagne === "P1-1") return `Ouvre ${m.suite} en P1-2 (facultatif). Sinon P1-2 reste libre.`;
  if (m.prerequis) return `Exige ${m.prerequis} en P1-1.`;
  if (m.code === "DIV4201") return "Une seule fois sur les 4 campagnes.";
  if (m.code === "NET4106") return "Même cours en P2-1 (anglais) et P2-2 (français) : une seule fois.";
  if (m.code === "NET4201") return "Ne bloque pas P1-2 : le duo habituel est NET4203.";
  return "";
}
function renderDetail(k) {
  const el = $("#detail");
  if (!k || !M[k]) { el.innerHTML = `<p class="empty">Survole un module pour voir sa fiche.<br>Clic : épingler · glisser : classer<br>Maj + ↑/↓ au clavier.</p>`; return; }
  const m = M[k], s = analyze().st[k], rule = ruleText(m);
  const tset = new Set(S.targets.map(t => t.f)), slotOf = Object.fromEntries(S.targets.map(t => [t.f, t.slot]));
  let h = `<div class="d-head">
    <div class="d-code"><span class="mono">${esc(m.code)}</span><span class="badge">${esc(m.campagne)}</span>${S.pinned === k ? '<span class="badge">épinglé · Échap</span>' : ""}</div>
    <h3>${esc(m.titre)}</h3>
    <div class="meta">${m.code === "JOKER" ? "" : `${m.places} places · `}${esc((m.responsables || []).join(", ") || "")}${m.fiche ? ` · <a href="${esc(m.fiche)}" target="_blank" rel="noopener">fiche ↗</a>` : ""}</div>
    ${rule ? `<div class="rule">${esc(rule)}</div>` : ""}
    ${s ? `<div class="rule ${s.lvl}">${s.lvl === "bad" ? "✕" : "!"} ${esc(s.msg)}</div>` : ""}
  </div>`;

  if (m.stats && m.stats.n) {
    const st = m.stats, sorted = D.filieres.filter(f => st.vers[f] > 0).sort((a, b) => st.vers[b] - st.vers[a]);
    const rows = [...new Set([...sorted.slice(0, innerHeight < 780 ? 3 : 5), ...D.filieres.filter(f => tset.has(f))])].sort((a, b) => st.vers[b] - st.vers[a]);
    const autres = sorted.filter(f => !rows.includes(f)).reduce((t, f) => t + st.vers[f], 0);
    h += `<div class="d-block"><h4 title="Filière finale des étudiants qui avaient pris ce module (${esc(st.source)})">Leur filière ensuite <span class="faint">${esc(st.source)} · n=${st.n}</span></h4>
      <div class="hbars">${rows.map(f => {
        const v = st.vers[f] / st.n, t = tset.has(f);
        return `<span class="f ${t ? "tgt" : ""}">${t ? `<span class="sw" style="background:${color(slotOf[f])};margin:0"></span>` : ""}${f}</span>
          <span title="${f} : ${st.vers[f]} sur ${st.n}"><span class="bar" style="width:${Math.max(1, v * 100)}%;${t ? `background:${color(slotOf[f])}` : ""}"></span></span>
          <span class="v">${st.vers[f]} · ${pct(v)}</span>`;
      }).join("")}${autres ? `<span class="f faint">autres</span><span></span><span class="v faint">${autres} · ${pct(autres / st.n)}</span>` : ""}</div>
      ${S.targets.length ? `<div class="typ">${S.targets.map(t => {
        const b = st.base[t.f], v = st.vers[t.f];
        return `<span><span class="sw" style="background:${color(t.slot)}"></span>${b ? `<b>${v}/${b}</b> des ${t.f} de 2025-26 l'avaient pris (${pct(v / b)})` : `aucun ${t.f} dans cette population`}</span>`;
      }).join("")}</div>` : ""}</div>`;
  } else if (m.code !== "JOKER") {
    h += `<div class="d-block"><h4>Leur filière ensuite</h4><p class="faint small">Module nouveau ou absent de 2025-26 : aucune donnée.</p></div>`;
  }

  if (m.code !== "JOKER") {
    // Une ligne par filière visée : profs du module présents dans sa VAP, sinon les responsables de la VAP (à contacter).
    const last = n => n.split(" ").slice(-1)[0];
    const lines = S.targets.map(t => {
      const hits = (m.profs_vap || []).filter(p => p.filiere === t.f);
      const names = [...new Set(hits.map(p => p.nom))].map(n => {
        const resp = hits.filter(p => p.nom === n && p.vap_role === "resp").map(p => p.vap);
        return `<b>${esc(last(n))}</b>${resp.length ? ` <span class="faint">resp. ${esc(resp.join(", "))}</span>` : ""}`;
      });
      const vapResp = [...new Set(D.vap[t.f].flatMap(v => v.responsables.map(last)))].join(", ");
      return `<div class="prof"><span class="sw" style="background:${color(t.slot)}"></span>${t.f} : ${names.length ? `✓ ${names.join(", ")}`
        : `<span class="faint">personne · VAP tenue par ${esc(vapResp)}</span>`}</div>`;
    });
    const other = [...new Set((m.profs_vap || []).filter(p => !tset.has(p.filiere)).map(p => p.filiere))];
    h += `<div class="d-block"><h4>Profs de tes VAP ici${other.length ? ` <span class="faint">+ ${esc(other.join(", "))}</span>` : ""}</h4>
      ${lines.join("") || `<div class="prof faint">Choisis une filière visée.</div>`}
    </div>`;
  }

  const a = m.avis, FR = { ok: "à jour", partiel: "en partie dépassé", obsolete: "plus valable", aucun: "aucun avis" };
  h += `<div class="d-block"><h4><span>Avis</span><span><span class="badge ${a.fraicheur}">${FR[a.fraicheur]}</span>${a.annee ? ` <span class="faint">${esc(a.annee)}</span>` : ""}</span></h4>
    <p class="avis-res">${a.charge ? `<span class="muted small">${dots(a.charge)} charge ${["", "légère", "moyenne", "lourde"][a.charge]} · </span>` : ""}${esc(a.resume)}</p>
    ${a.alerte ? `<div class="avis-alert">! ${esc(a.alerte)}</div>` : ""}
    ${a.textes.length ? `<button class="linkbtn" data-avis="${k}">Lire les avis bruts (${a.textes.length})</button>` : ""}
  </div>`;

  if (m.code !== "JOKER") h += `<div class="d-block"><h4>Dates <span class="faint">${m.seances_estimees ? "pas encore planifié" : "agenda 2026-27"}</span></h4>${datesHTML(m)}</div>`;
  if (m.description) h += `<div class="d-block"><details class="desc"><summary>Description officielle</summary><p>${esc(m.description)}</p></details></div>`;
  el.innerHTML = h;
}
function datesHTML(m) {
  if (m.code === "DIV4201") return `<p class="dates-meta">Pas de cours : engagement associatif, rapport et soutenance en mai.</p>`;
  const W = 310, x0 = dateOf(D.periode.debut), x1 = dateOf("2027-02-01"), span = x1 - x0;
  const X = iso => Math.round(((dateOf(iso) - x0) / span) * (W - 8)) + 4;
  const sess = m.seances.filter(s => !s.eval), evs = m.seances.filter(s => s.eval);
  const hours = sess.reduce((t, s) => t + mins(s.fin) - mins(s.debut), 0) / 60;
  const months = [["2026-12-01", "déc."], ["2027-01-01", "janv."]];
  const svg = `<svg class="spark" viewBox="0 0 ${W} 46" role="img" aria-label="Séances du module">
    <rect class="vac" x="${X(D.periode.vacances[0])}" y="2" width="${X(D.periode.vacances[1]) - X(D.periode.vacances[0])}" height="24" rx="2"><title>Vacances</title></rect>
    ${sess.map(s => `<rect class="tick ${m.seances_estimees ? "est" : ""}" x="${X(s.date) - 1}" y="6" width="3" height="16" rx="1"><title>${fmtD(s.date)} ${s.debut}-${s.fin}</title></rect>`).join("")}
    ${evs.map(s => { const x = X(s.date); return `<path class="eval" d="M${x} 24l5 5-5 5-5-5z"><title>${esc(s.label)} · ${fmtD(s.date)}</title></path>`; }).join("")}
    ${months.map(([d, l]) => `<text x="${X(d)}" y="44">${l}</text>`).join("")}<text x="2" y="44">24 nov.</text>
  </svg>`;
  const ev = evs.map(s => `${esc(s.label)} ${fmtD(s.date)}`).join(" · ");
  const old = m.evals_2526.map(e => `${esc(e.label)} ${fmtDM(e.date)}`).join(" · ");
  return svg + `<p class="dates-meta">${m.seances_estimees
    ? `Barres grises = créneaux du flux ${m.campagne} (estimation).${old ? ` Évaluations en 2025-26 : ${old}.` : ""}`
    : `${sess.length} séances · ${Math.round(hours)} h${ev ? ` · <b>${ev}</b>` : " · aucune évaluation dans l'agenda"}`}</p>`;
}

/* ---------------- Glisser-déposer & clavier ---------------- */
let drag = null;
function move(c, k, delta) {
  const o = S.order[c], i = o.indexOf(k), j = i + delta;
  if (j < 0 || j >= o.length) return;
  o.splice(i, 1); o.splice(j, 0, k); save(); render();
  const el = document.querySelector(`.card[data-key="${CSS.escape(k)}"]`); el && el.focus();
}
function pin(k) { S.pinned = S.pinned === k ? null : k; render(); }

$("#columns").addEventListener("pointerdown", e => {
  const card = e.target.closest(".card");
  if (!card || e.button !== 0 || e.target.closest(".move")) return;
  drag = { card, key: card.dataset.key, camp: card.closest(".col").dataset.camp, y0: e.clientY, on: false };
});
document.addEventListener("pointermove", e => {
  if (!drag) return;
  if (!drag.on) {
    if (Math.abs(e.clientY - drag.y0) < 4) return;
    const r = drag.card.getBoundingClientRect();
    drag.on = true; drag.dy = e.clientY - r.top;
    drag.ph = document.createElement("div"); drag.ph.className = "placeholder"; drag.ph.style.height = r.height + "px";
    drag.card.after(drag.ph);
    Object.assign(drag.card.style, { left: r.left + "px", width: r.width + "px" });
    drag.card.classList.add("dragging");
  }
  drag.card.style.top = e.clientY - drag.dy + "px";
  const list = drag.ph.parentElement;
  const next = [...list.querySelectorAll(".card:not(.dragging)")].find(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  next ? list.insertBefore(drag.ph, next) : list.appendChild(drag.ph);
});
document.addEventListener("pointerup", () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.on) { pin(d.key); return; }
  S.order[d.camp] = [...d.ph.parentElement.children].filter(el => el !== d.card).map(el => (el === d.ph ? d.key : el.dataset.key));
  save(); render();
});
$("#columns").addEventListener("click", e => {
  const b = e.target.closest("[data-mv]");
  if (b) { const card = b.closest(".card"); move(card.closest(".col").dataset.camp, card.dataset.key, +b.dataset.mv); return; }
  const imp = e.target.closest(".imposed");
  if (imp) pin(imp.dataset.key);
});
$("#columns").addEventListener("keydown", e => {
  const card = e.target.closest(".card, .imposed");
  if (!card) return;
  if ((e.key === "Enter" || e.key === " ") && !e.target.closest("button")) { e.preventDefault(); pin(card.dataset.key); return; }
  if (!card.classList.contains("card") || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
  e.preventDefault();
  const delta = e.key === "ArrowUp" ? -1 : 1;
  if (e.shiftKey) move(card.closest(".col").dataset.camp, card.dataset.key, delta);
  else (delta < 0 ? card.previousElementSibling : card.nextElementSibling)?.focus();
});
$("#columns").addEventListener("mouseover", e => {
  const c = e.target.closest(".card, .imposed");
  if (!c || drag?.on || c.dataset.key === hoverKey) return;
  hoverKey = c.dataset.key; if (!S.pinned) renderDetail(hoverKey);
});
$("#columns").addEventListener("focusin", e => {
  const c = e.target.closest(".card, .imposed");
  if (c && !S.pinned) { hoverKey = c.dataset.key; renderDetail(hoverKey); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.pinned && !$("#avis-modal").open) { S.pinned = null; render(); } });
$("#detail").addEventListener("click", e => {
  const b = e.target.closest("[data-avis]"); if (!b) return;
  const m = M[b.dataset.avis];
  $("#avis-title").textContent = `Avis bruts · ${m.code} ${m.titre}`;
  $("#avis-body").innerHTML = `<p class="small faint">Textes d'origine (Discord, pseudos anonymisés ; guide S7). Ce sont des avis parfois anciens : la campagne 2026 fait foi.</p>` +
    m.avis.textes.map(t => `<h5>${esc(t.source)}</h5><pre>${esc(t.texte.trim())}</pre>`).join("");
  $("#avis-modal").showModal();
});

/* ---------------- En-tête : cibles, parcours, copie ---------------- */
function renderTargets() {
  const on = Object.fromEntries(S.targets.map(t => [t.f, t.slot]));
  $("#targets").innerHTML = D.filieres.map(f => `<button class="chip" data-f="${f}" aria-pressed="${!!on[f]}" ${!on[f] && S.targets.length >= 3 ? "disabled" : ""}>
    <span class="sw" style="${on[f] ? `background:${color(on[f])}` : ""}"></span>${f}</button>`).join("");
}
$("#targets").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  const f = b.dataset.f, i = S.targets.findIndex(t => t.f === f);
  if (i >= 0) S.targets.splice(i, 1);
  else if (S.targets.length < 3) { const used = S.targets.map(t => t.slot); S.targets.push({ f, slot: [1, 2, 3].find(s => !used.includes(s)) }); }
  save(); renderTargets(); render();
});

$("#preset").innerHTML += D.filieres.map(f => `<option value="${f}">${f}${D.parcours[f] ? "" : " (auto, d'après 2025-26)"}</option>`).join("");
$("#preset").addEventListener("change", e => {
  const f = e.target.value; if (!f) return;
  const tops = {};
  for (const c of CAMPS) {
    const all = [...D.campagnes[c].ordre];
    if (D.parcours[f]) tops[c] = (D.parcours[f][c] || []).map(code => all.find(k => codeOf(k) === code)).filter(Boolean);
    else tops[c] = all.filter(k => codeOf(k) !== "JOKER" && (taken(M[k], f) || 0) > 0).sort((a, b) => taken(M[b], f) - taken(M[a], f));
    if (c !== "P1-1") tops[c] = tops[c].filter(k => codeOf(k) !== "DIV4201"); // DIV4201 : une seule fois
  }
  tops["P2-2"] = tops["P2-2"].filter(k => !(k === "NET4106@P2-2" && tops["P2-1"].includes("NET4106@P2-1")));
  const p11 = new Set(tops["P1-1"].slice(0, 3).map(codeOf)); // même seuil que l'alerte « risque »
  tops["P1-2"] = tops["P1-2"].filter(k => !M[k].prerequis || p11.has(M[k].prerequis));
  for (const c of CAMPS) {
    const joker = D.campagnes[c].ordre.find(k => codeOf(k) === "JOKER");
    // sous JOKER : ce qui violerait une règle (DIV4201 / NET4106 en double, prérequis absent du haut de P1-1)
    const out = k => (codeOf(k) === "DIV4201" && !tops[c].includes(k)) || (k === "NET4106@P2-2" && !tops[c].includes(k)) ||
      (c === "P1-2" && M[k].prerequis && !p11.has(M[k].prerequis));
    const rest = S.order[c].filter(k => !tops[c].includes(k) && k !== joker);
    S.order[c] = [...tops[c], ...rest.filter(k => !out(k)), joker, ...rest.filter(out)];
  }
  for (const code of ["DIV4201", "NET4106"]) { // une seule occurrence au-dessus de JOKER : celle du parcours, sinon la 1re
    const hits = CAMPS.filter(c => wanted(c).some(k => codeOf(k) === code));
    const keep = hits.find(c => tops[c].some(k => codeOf(k) === code)) || hits[0];
    for (const c of hits.filter(c => c !== keep)) {
      const k = `${code}@${c}`, o = S.order[c].filter(x => x !== k);
      o.splice(o.findIndex(x => codeOf(x) === "JOKER") + 1, 0, k); S.order[c] = o;
    }
  }
  if (!S.targets.some(t => t.f === f) && S.targets.length < 3) { const used = S.targets.map(t => t.slot); S.targets.push({ f, slot: [1, 2, 3].find(s => !used.includes(s)) }); }
  S.cal = null; e.target.value = ""; save(); renderTargets(); render();
  toast(`Parcours ${f} chargé : ajuste-le, puis place JOKER où tu veux.${S.targets.some(t => t.f === f) ? "" : ` Ajoute ${f} aux filières visées pour voir ses barres.`}`);
});
$("#reset").addEventListener("click", () => {
  if (!confirm("Remettre les 4 classements dans l'ordre de la campagne ?")) return;
  S.order = defaultState().order; S.cal = null; save(); render(); toast("Ordre de la campagne rétabli (DIV4201 et le 2ᵉ NET4106 sous JOKER).");
});
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3200); }

function renderDeadline() {
  const end = new Date(D.date_limite), ms = end - new Date(), el = $("#deadline");
  if (ms <= 0) { el.textContent = "Campagne clôturée"; el.classList.add("soon"); return; }
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
  el.textContent = `Clôture 25 oct. 18:00 · ${d ? `${d} j ` : ""}${h} h`;
  el.classList.toggle("soon", ms < 48 * 36e5);
}

/* ---------------- Onglets ---------------- */
document.querySelector(".tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-view]"); if (!b) return;
  for (const t of document.querySelectorAll(".tabs button")) t.setAttribute("aria-selected", t === b);
  for (const v of document.querySelectorAll("main.view")) v.hidden = v.id !== `view-${b.dataset.view}`;
  document.dispatchEvent(new CustomEvent("viewshown", { detail: b.dataset.view }));
});

/* ---------------- Calendrier ---------------- */
function calPicks() {
  const k1 = wanted("P1-1")[0] || S.order["P1-1"][0];
  const def = { "P1-1": k1, "P1-2": p12For(k1).key, "P2-1": wanted("P2-1")[0] || S.order["P2-1"][0], "P2-2": wanted("P2-2")[0] || S.order["P2-2"][0] };
  return { ...def, ...(S.cal || {}) };
}
function renderCalendar() {
  const picks = calPicks();
  const opts = c => {
    const keys = c === "P1-2" ? [...new Set([...Object.values(IMPOSE), ...S.order[c]])] : S.order[c];
    return keys.map(k => `<option value="${k}" ${picks[c] === k ? "selected" : ""}>${esc(codeOf(k))}${M[k].impose_par ? " (imposé)" : ""}</option>`).join("");
  };
  $("#cal-picks").innerHTML = CAMPS.map(c => `<label>${c}<select data-camp="${c}">${opts(c)}</select></label>`).join("") +
    `<label>&nbsp;<button class="ghost" id="cal-reset" ${S.cal ? "" : "disabled"}>Mes 1ers vœux</button></label>`;
  $("#cal-legend").innerHTML = `<span><span class="k mine"></span>mes modules P1/P2</span><span><span class="k promo"></span>promo Ingénieur 2A</span><span><span class="k isev"></span>évaluation</span><span><i>italique</i> = créneau estimé</span>`;

  const chosen = CAMPS.map(c => ({ c, m: M[picks[c]] })).filter(x => x.m && x.m.code !== "JOKER");
  const cells = {}; // date|half -> {evs:[], conflict}
  const put = (date, h, ev) => ((cells[`${date}|${h}`] ||= { evs: [] }).evs.push(ev));
  for (const { c, m } of chosen) for (const s of m.seances) put(s.date, half(s.debut), { kind: "mine", code: m.code, s, est: m.seances_estimees });
  for (const p of D.promo) put(p.date, half(p.debut), { kind: "promo", code: p.n > 1 ? `${p.label} ×${p.n}` : p.label, s: p });
  let conflicts = 0;
  for (const cell of Object.values(cells)) {
    const mods = cell.evs.filter(e => e.kind !== "promo"), per = cell.evs.filter(e => e.kind === "promo");
    cell.conflict = mods.some(a => per.some(b => mins(a.s.debut) < mins(b.s.fin) && mins(b.s.debut) < mins(a.s.fin))) || mods.length > 1;
    conflicts += cell.conflict;
  }

  // semaines (lundis) ; les 2 semaines de vacances fusionnées
  const mondays = [];
  for (let d = dateOf(D.periode.debut); d <= dateOf("2027-02-01"); d.setDate(d.getDate() + 7)) mondays.push(new Date(d));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isVac = d => iso(d) >= "2026-12-21" && iso(d) <= "2026-12-28";
  const weeks = mondays.filter((d, i) => !isVac(d) || !isVac(mondays[i - 1] || new Date(0)));
  const days = ["lun", "mar", "mer", "jeu", "ven"];
  let g = `<div></div>` + weeks.map(w => `<div class="h">${isVac(w) ? "vacances" : `sem. ${fmtDM(iso(w))}`}</div>`).join("");
  for (let di = 0; di < 5; di++) for (const h of ["am", "pm"]) {
    g += `<div class="rowh ${h}">${h === "am" ? days[di] + " matin" : "après-midi"}</div>`;
    for (const w of weeks) {
      if (isVac(w)) { g += `<div class="cell vac" title="Vacances"></div>`; continue; }
      const d = new Date(w); d.setDate(d.getDate() + di);
      const key = iso(d), cell = cells[`${key}|${h}`];
      const evs = (cell?.evs || []).sort((a, b) => (a.kind === "promo") - (b.kind === "promo"));
      g += `<div class="cell ${cell?.conflict ? "conflict" : ""}" title="${fmtD(key)} ${h === "am" ? "matin" : "après-midi"}">${
        evs.map(e => `<span class="ev ${e.kind} ${e.est ? "est" : ""} ${e.s.eval ? "isev" : ""}" title="${esc(e.s.titre || e.code)} · ${e.s.debut}-${e.s.fin}${e.s.n > 1 ? ` · ${e.s.n} groupes/jurys en parallèle` : ""}${e.est ? " · créneau estimé" : ""}">${e.s.eval ? '<span class="dia">◆</span>' : ""}${esc(e.code)}</span>`).join("")
      }</div>`;
    }
  }
  const grid = $("#cal-grid");
  grid.style.gridTemplateRows = "auto repeat(10, minmax(0, 1fr))";
  grid.style.gridTemplateColumns = `86px ${weeks.map(w => (isVac(w) ? "44px" : "minmax(70px,1fr)")).join(" ")}`;
  grid.innerHTML = g;

  const evals = chosen.flatMap(({ m }) => m.seances.filter(s => s.eval).map(s => ({ m, s })));
  const est = chosen.filter(({ m }) => m.seances_estimees);
  const hours = chosen.reduce((t, { m }) => t + (m.seances_estimees ? 0 : m.seances.filter(s => !s.eval).reduce((a, s) => a + mins(s.fin) - mins(s.debut), 0)), 0) / 60;
  const byWeek = {};
  for (const { s } of evals) { const d = dateOf(s.date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); (byWeek[iso(d)] ||= []).push(s); }
  const peak = Object.entries(byWeek).sort((a, b) => b[1].length - a[1].length)[0];
  $("#cal-summary").innerHTML = [
    `<div class="stat ${conflicts ? "bad" : ""}"><b>${conflicts}</b>chevauchement${conflicts > 1 ? "s" : ""} avec l'agenda de la promo 2A</div>`,
    `<div class="stat"><b>${Math.round(hours)} h</b>de cours planifiées${est.length ? ` <span class="faint">+ ${est.map(x => x.m.code).join(", ")} non planifié${est.length > 1 ? "s" : ""}</span>` : ""}</div>`,
    `<div class="stat"><b>${evals.length}</b>évaluation${evals.length > 1 ? "s" : ""} : ${evals.sort((a, b) => a.s.date.localeCompare(b.s.date)).map(({ m, s }) => `${m.code} ${fmtDM(s.date)}`).join(" · ") || "—"}</div>`,
    peak && peak[1].length > 1 ? `<div class="stat"><b>${peak[1].length}</b>évaluations la semaine du ${fmtDM(peak[0])}</div>` : "",
    est.some(x => x.m.evals_2526.length) ? `<div class="stat faint">En 2025-26 : ${est.flatMap(x => x.m.evals_2526.map(e => `${x.m.code} ${fmtDM(e.date)}`)).join(" · ")}</div>` : "",
  ].join("");
}
$("#cal-picks").addEventListener("change", e => {
  const sel = e.target.closest("select"); if (!sel) return;
  S.cal = { ...calPicks(), [sel.dataset.camp]: sel.value }; save(); renderCalendar();
});
$("#cal-picks").addEventListener("click", e => { if (e.target.id === "cal-reset") { S.cal = null; save(); renderCalendar(); } });

/* ---------------- Tout tenir dans l'écran ---------------- */
function fit() { // jusqu'à 11 cartes par colonne : hauteur disponible répartie (34 à 46 px)
  const cols = $("#columns"); if (!cols.clientHeight) return;
  const max = Math.max(...CAMPS.map(c => S.order[c].length));
  const h = Math.floor((cols.clientHeight - 24 - (max - 1) * 3) / max);
  document.documentElement.style.setProperty("--card-h", `${Math.max(34, Math.min(46, h))}px`);
}
new ResizeObserver(fit).observe($("#columns"));

function renderTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("#theme").textContent = dark ? "☀" : "☾"; $("#theme").title = dark ? "Passer en mode clair" : "Passer en mode sombre";
}
$("#theme").addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t; localStorage.setItem("voeux-theme", t); renderTheme();
});

renderTheme(); renderTargets(); renderDeadline(); render(); fit();
setInterval(renderDeadline, 60e3);
