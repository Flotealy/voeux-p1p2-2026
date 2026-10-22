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

/* Discipline = couleur de la carte (toujours doublée par le code écrit : CSC, NET…) */
const DOM = { CSC: "Informatique", NET: "Réseaux", IMA: "Image & 3D", MAT: "Maths", PHY: "Physique", autre: "Autres" };
const domOf = k => { const p = codeOf(k).slice(0, 3); return p in DOM ? p : codeOf(k) === "JOKER" ? "joker" : "autre"; };
const dcol = k => `--dc:var(--d-${domOf(k)})`;
const DIFF = ["", "Facile", "Moyen", "Difficile"];
const diffHTML = c => (c
  ? `<span class="diff d${c}" title="Difficulté d'après les avis des anciens (charge de travail)">${DIFF[c]}</span>`
  : `<span class="diff d0" title="Pas assez d'avis pour juger la difficulté">?</span>`);
const full = m => m.stats && m.stats.n >= m.places && m.code !== "MAT4101";
const sessions = m => m.seances.filter(s => !s.eval);
const hoursOf = m => sessions(m).reduce((t, s) => t + mins(s.fin) - mins(s.debut), 0) / 60;

/* ---------------- État ---------------- */
// Ordre de la campagne, sauf DIV4201 et NET4106 (P2-2) placés sous JOKER : sinon les règles « une seule fois » s'allument d'emblée.
function campaignOrder(c) {
  const o = [...D.campagnes[c].ordre], j = o.findIndex(k => codeOf(k) === "JOKER");
  const out = k => codeOf(k) === "DIV4201" || k === "NET4106@P2-2";
  return [...o.slice(0, j).filter(k => !out(k)), o[j], ...o.slice(0, j).filter(out), ...o.slice(j + 1)];
}
function defaultState() {
  return { order: Object.fromEntries(CAMPS.map(c => [c, campaignOrder(c)])), pinned: null, cal: null, calMode: "tout", calPromo: true };
}
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    const ok = s && CAMPS.every(c => Array.isArray(s.order?.[c]) &&
      s.order[c].length === D.campagnes[c].ordre.length && s.order[c].every(k => M[k]));
    if (ok) return { ...defaultState(), order: s.order, cal: s.cal || null, calMode: s.calMode || "tout", calPromo: s.calPromo !== false };
  } catch (_) { /* état corrompu : on repart de zéro */ }
  return defaultState();
}
const save = () => localStorage.setItem(STORE, JSON.stringify({ order: S.order, cal: S.cal, calMode: S.calMode, calPromo: S.calPromo }));

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

function analyze() { // st[clé] = { lvl: bad|risk, msg (complet), short (sur la carte) }
  const st = {};
  for (const k of wanted("P1-2")) {
    const p = M[k].prerequis;
    if (!p) continue;
    const r = rankIn("P1-1", p);
    if (r === null) st[k] = { lvl: "bad", msg: `${codeOf(k)} exige ${p} en P1-1, absent de tes vœux P1-1`, short: `impossible : ${p} absent de tes vœux P1-1` };
    else if (r > 3) st[k] = { lvl: "risk", msg: `${codeOf(k)} n'est possible que si tu obtiens ${p}, classé ${r}ᵉ en P1-1`, short: `seulement si tu obtiens ${p} (${r}ᵉ en P1-1)` };
  }
  const once = (code, label) => {
    const hits = CAMPS.filter(c => wanted(c).some(k => codeOf(k) === code));
    if (hits.length < 2) return;
    const msg = `${code} ${label} : garde-le seulement en ${hits[0]}, ou descends-le sous JOKER en ${hits.slice(1).join(", ")}`;
    for (const c of hits.slice(1)) st[`${code}@${c}`] = { lvl: "bad", msg, short: `déjà voulu en ${hits[0]} : descends-le sous JOKER` };
  };
  once("DIV4201", "ne peut être choisi qu'une fois sur les 4 campagnes");
  once("NET4106", "est le même cours en P2-1 et P2-2");
  return { st };
}

/* ---------------- Cours sur exactement les mêmes horaires ---------------- */
// Deux modules de campagnes différentes avec une séance au même jour, même début et même fin.
// « ensemble » = on peut réellement obtenir les deux (sinon la mention est seulement informative).
function together(a, b) {
  const [x, y] = [a, b].sort((p, q) => CAMPS.indexOf(M[p].campagne) - CAMPS.indexOf(M[q].campagne));
  if (M[x].campagne !== "P1-1" || M[y].campagne !== "P1-2") return true;
  if (IMPOSE[codeOf(x)]) return IMPOSE[codeOf(x)] === codeOf(y);
  return !M[y].impose_par && (!M[y].prerequis || M[y].prerequis === codeOf(x));
}
const SAME = {}; // clé -> [{ k, dates, ensemble }]
{
  const all = Object.keys(M).filter(k => codeOf(k) !== "JOKER" && !M[k].seances_estimees)
    .flatMap(k => M[k].seances.map(s => ({ k, s })));
  const hit = {};
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    if (M[a.k].campagne === M[b.k].campagne || codeOf(a.k) === codeOf(b.k)) continue;
    if (a.s.date !== b.s.date || a.s.debut !== b.s.debut || a.s.fin !== b.s.fin) continue;
    for (const [p, q] of [[a.k, b.k], [b.k, a.k]]) ((hit[p] ||= {})[q] ||= new Set()).add(a.s.date);
  }
  for (const p in hit) SAME[p] = Object.entries(hit[p]).map(([q, d]) => ({ k: q, dates: [...d].sort(), ensemble: together(p, q) }));
}
const sameNote = k => {
  const l = SAME[k]; if (!l) return "";
  const codes = l.map(x => codeOf(x.k)).join(", ");
  return l.some(x => x.ensemble) ? `⚠ mêmes horaires que ${codes}` : `mêmes horaires que ${codes} · jamais ensemble`;
};

/* ---------------- Indicateurs ---------------- */
function taken(m, f) { // part des <f> de 2025-26 qui avaient pris le module
  if (!m.stats) return null;
  const b = m.stats.base[f];
  return b ? m.stats.vers[f] / b : null;
}
function notes(m) { // 2e ligne de la carte : du texte simple, pas de pastilles
  const n = [`${m.places} places`];
  if (SAME[m.key]) n.unshift(sameNote(m.key));
  if (m.suite_imposee) n.push(`+ ${m.suite} imposé en P1-2`);
  else if (m.suite && m.campagne === "P1-1") n.push(`ouvre ${m.suite} en P1-2`);
  if (m.prerequis && !m.impose_par) n.push(`exige ${m.prerequis} en P1-1`);
  if (m.code === "DIV4201") n.push("une seule fois dans l'année");
  if (m.code === "NET4106") n.push(`${m.campagne === "P2-1" ? "en anglais" : "en français"} · une seule fois`);
  if (m.stats && m.stats.n === 0 && m.code !== "DIV4201") n.push("nouveau");
  else if (full(m)) n.push("complet en 25-26");
  return n.join(" · ");
}

/* ---------------- Rendu : colonnes ---------------- */
function render() {
  const { st } = analyze();
  $("#columns").innerHTML = CAMPS.map(c => {
    const o = S.order[c], j = o.findIndex(k => codeOf(k) === "JOKER");
    let pre = "";
    if (c === "P1-2") {
      const top = codeOf(S.order["P1-1"][0]);
      if (IMPOSE[top]) pre = `<div class="imposed" data-key="${IMPOSE[top]}" role="button" tabindex="0" style="${dcol(IMPOSE[top])}">Si tu obtiens <b>${esc(top)}</b>, ton P1-2 sera <b>${esc(IMPOSE[top])}</b> d'office. Sinon, ce classement s'applique :</div>`;
    }
    return `<div class="col" data-camp="${c}">
      <div class="col-head"><h2>${c}</h2><span class="faint">${PERIODE[c]}</span>${issues(c, st)}</div>
      ${pre}<div class="list">${o.map((k, i) => cardHTML(k, i, j, st[k])).join("")}</div></div>`;
  }).join("");
  renderDetail(S.pinned || hoverKey || null);
  renderCalendar();
}
function issues(c, st) { // ✕ n / ! n dans l'en-tête de colonne, détail au survol
  const list = S.order[c].map(k => st[k]).filter(Boolean);
  if (!list.length) return "";
  const bad = list.filter(x => x.lvl === "bad").length, lvl = bad ? "bad" : "risk";
  return `<span class="tag ${lvl}" title="${esc([...new Set(list.map(x => x.msg))].join("\n"))}">${bad ? `✕ ${bad}` : `! ${list.length}`} à revoir</span>`;
}
const MOVE = `<div class="move"><button data-mv="-1" tabindex="-1" aria-label="Monter">▲</button><button data-mv="1" tabindex="-1" aria-label="Descendre">▼</button></div>`;
function cardHTML(k, i, j, s) {
  const m = M[k], below = j >= 0 && i > j;
  if (m.code === "JOKER") {
    return `<div class="card joker ${S.pinned === k ? "pinned" : ""}" data-key="${k}" tabindex="0" title="Déplace JOKER : rien de ce qui est en dessous ne sera attribué">
      <span class="jk">JOKER</span><span class="jt">rien en dessous ne sera attribué</span>${MOVE}</div>`;
  }
  const cls = ["card", below && "below", s && s.lvl, S.pinned === k && "pinned"].filter(Boolean).join(" ");
  const ic = s ? `<span class="state-ic ${s.lvl}">${s.lvl === "bad" ? "✕" : "!"}</span>` : "";
  return `<div class="${cls}" data-key="${k}" tabindex="0" style="${dcol(k)}" ${s ? `title="${esc(s.msg)}"` : ""}>
    <div class="l1"><i class="sw"></i>${ic}<span class="code">${esc(m.code)}</span><span class="ttl">${esc(m.titre)}</span></div>
    <div class="l2"><span class="nt" ${SAME[k] && !s ? `title="${esc(sameNote(k))}"` : ""}>${s ? `<span class="st-msg">${esc(s.short)}</span>` : esc(notes(m))}</span>${diffHTML(m.avis.charge)}</div>${MOVE}
  </div>`;
}
function renderLegend() {
  $("#legend").innerHTML = Object.entries(DOM).map(([d, l]) => `<span class="lg"><i style="--dc:var(--d-${d})"></i>${l}</span>`).join("") +
    `<span class="lg-sep"></span><span class="lg">Difficulté (avis) ${diffHTML(1)}${diffHTML(2)}${diffHTML(3)}</span>` +
    `<span class="lg-sep"></span><span class="lg faint">glisse pour classer · clic = fiche</span>`;
}

/* ---------------- Rendu : fiche (panneau droit) ---------------- */
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
const fact = (label, value, sub) => `<div class="fact"><span class="fl">${label}</span><span class="fv">${value}</span><span class="fs">${sub}</span></div>`;
function factsHTML(m) {
  const a = m.avis, st = m.stats, ss = sessions(m), evs = m.seances.filter(s => s.eval);
  const diff = fact("Difficulté", a.charge ? diffHTML(a.charge) : "inconnue", a.charge ? "d'après les avis" : "pas assez d'avis");
  const places = fact("Places", m.places, full(m) ? `complet en 25-26 (${st.n} pris)` : st && st.n ? `${st.n} pris en 25-26` : "nouveau en 2026");
  const vol = m.code === "DIV4201" ? fact("Volume", "aucun cours", "rapport + soutenance en mai")
    : m.seances_estimees || !ss.length ? fact("Volume", "à planifier", `créneaux du flux ${m.campagne}`)
    : fact("Volume", `${ss.length} séances`, `${Math.round(hoursOf(m))} h · ${fmtDM(ss[0].date)} → ${fmtDM(ss[ss.length - 1].date)}`);
  const ev = evs.length
    ? fact("Évaluation", evs.length === 1 ? fmtD(evs[0].date) : `${evs.length} dates`, esc(evs.map(e => `${e.label}${evs.length > 1 ? ` ${fmtDM(e.date)}` : ""}`).join(" · ")))
    : m.evals_2526.length ? fact("Évaluation", "pas encore datée", `en 25-26 : ${m.evals_2526.map(e => fmtDM(e.date)).join(", ")}`)
    : fact("Évaluation", m.code === "DIV4201" ? "soutenance" : "aucune", m.code === "DIV4201" ? "en mai" : "dans l'agenda 2026-27");
  return `<div class="facts">${diff}${places}${vol}${ev}</div>`;
}
function renderDetail(k) {
  const el = $("#detail");
  if (!k || !M[k]) {
    el.removeAttribute("style");
    el.innerHTML = `<div class="empty"><b>Clique un module</b> pour voir sa fiche ici.<p>Glisse les cartes pour les classer.<br>Tout ce qui est sous <b>JOKER</b> ne sera jamais attribué.</p><p class="faint">Clavier : Tab pour choisir, Maj + ↑/↓ pour déplacer, Échap pour fermer.</p></div>`;
    return;
  }
  const m = M[k], s = analyze().st[k], rule = ruleText(m);
  el.setAttribute("style", dcol(k));
  const close = S.pinned === k ? `<button class="d-close" data-unpin title="Fermer (Échap)" aria-label="Fermer">✕</button>` : "";
  if (m.code === "JOKER") {
    el.innerHTML = `<div class="d-head"><div class="d-top"><span>${m.campagne}</span>${close}</div><h3>JOKER</h3></div>
      <div class="d-body"><div class="rule">${esc(rule)}</div><p class="small muted">Monte JOKER pour dire « je préfère ne rien avoir plutôt que ces modules-là ».</p></div>`;
    return;
  }
  const resp = (m.responsables || []).join(", ");
  let h = `<div class="d-head">
    <div class="d-top"><span class="d-dom"><i></i>${DOM[domOf(k)]}</span><span>${m.code === "DIV4201" ? "toutes campagnes" : esc(m.campagne)} · ${PERIODE[m.campagne]}</span>${close}</div>
    <h3><span class="mono">${esc(m.code)}</span> ${esc(m.titre)}</h3>
    <div class="meta">${resp ? `Responsable : ${esc(resp)}` : ""}${m.fiche ? `${resp ? " · " : ""}<a href="${esc(m.fiche)}" target="_blank" rel="noopener">fiche officielle ↗</a>` : ""}</div>
  </div>${factsHTML(m)}<div class="d-body">`;
  if (s) h += `<div class="rule ${s.lvl}"><span class="state-ic ${s.lvl}">${s.lvl === "bad" ? "✕" : "!"}</span>${esc(s.msg)}</div>`;
  if (rule) h += `<div class="rule">${esc(rule)}</div>`;
  for (const x of SAME[k] || []) {
    const when = x.dates.map(fmtDM).join(", ");
    h += x.ensemble
      ? `<div class="rule risk"><span class="state-ic risk">!</span><span>Mêmes horaires que <b>${esc(codeOf(x.k))}</b> (${esc(M[x.k].campagne)}) le ${when} : si tu as les deux, tu ne pourras pas suivre ces séances.</span></div>`
      : `<div class="rule"><span>Mêmes horaires que <b>${esc(codeOf(x.k))}</b> (${esc(M[x.k].campagne)}) le ${when} : sans effet, tu ne peux pas obtenir les deux.</span></div>`;
  }

  const a = m.avis, FR = { ok: "à jour", partiel: "en partie dépassé", obsolete: "plus valable", aucun: "aucun avis" };
  h += `<section class="sec"><h4>Avis des anciens <span class="badge ${a.fraicheur}">${FR[a.fraicheur]}</span>${a.annee ? `<span class="r">${esc(a.annee)}</span>` : ""}</h4>
    <p class="avis-res">${esc(a.resume)}</p>
    ${a.alerte ? `<div class="rule risk"><span class="state-ic risk">!</span>${esc(a.alerte)}</div>` : ""}
    ${a.textes.length ? `<button class="linkbtn" data-avis="${k}">Lire les avis complets (${a.textes.length}) →</button>` : ""}
  </section>`;

  const st = m.stats;
  if (st && st.n) {
    const sorted = D.filieres.filter(f => st.vers[f] > 0).sort((a, b) => st.vers[b] - st.vers[a]);
    const rows = sorted.slice(0, innerHeight < 780 ? 4 : 6), autres = sorted.slice(rows.length).reduce((t, f) => t + st.vers[f], 0);
    h += `<section class="sec"><h4>Ceux qui l'ont pris sont allés en <span class="r" title="${esc(st.source)}">${st.n} étudiants · 25-26</span></h4>
      <div class="hbars">${rows.map(f => `<span class="f">${f}</span><span class="track"><span class="bar" style="width:${Math.max(2, st.vers[f] / st.n * 100)}%"></span></span><span class="v">${pct(st.vers[f] / st.n)}</span>`).join("")}
      ${autres ? `<span class="f faint">autres</span><span></span><span class="v faint">${pct(autres / st.n)}</span>` : ""}</div></section>`;
  } else {
    h += `<section class="sec"><h4>Ceux qui l'ont pris sont allés en</h4><p class="small faint">Module nouveau ou absent en 2025-26 : pas de données.</p></section>`;
  }

  const byF = {};
  for (const p of m.profs_vap || []) (byF[p.filiere] ||= []).push(p);
  const fs = Object.keys(byF).sort((a, b) => byF[b].some(p => p.vap_role === "resp") - byF[a].some(p => p.vap_role === "resp") || a.localeCompare(b));
  const last = n => n.split(" ").slice(-1)[0];
  h += `<section class="sec"><h4>Profs qu'on retrouve en VAP</h4>${fs.length ? `<div class="kv">${fs.map(f => {
    const names = [...new Set(byF[f].map(p => p.nom))].map(n => {
      const resp = byF[f].filter(p => p.nom === n && p.vap_role === "resp").map(p => p.vap);
      return `${esc(last(n))}${resp.length ? ` <span class="faint">(resp. ${esc(resp.join(", "))})</span>` : ""}`;
    });
    return `<span class="k">${f}</span><span>${names.join(", ")}</span>`;
  }).join("")}</div>` : `<p class="small faint">Aucun prof de ce module n'enseigne dans une VAP.</p>`}</section>`;

  if (m.code !== "DIV4201") h += `<section class="sec"><h4>Calendrier <span class="r">${m.seances_estimees ? "estimé : pas encore planifié" : "agenda 2026-27"}</span></h4>${sparkHTML(m)}</section>`;
  if (m.description) h += `<section class="sec"><details class="desc"><summary>Description officielle</summary><p>${esc(m.description)}</p></details></section>`;
  el.innerHTML = h + "</div>";
}
function sparkHTML(m) {
  const W = 320, x0 = dateOf(D.periode.debut), x1 = dateOf("2027-02-01"), span = x1 - x0;
  const X = iso => Math.round(((dateOf(iso) - x0) / span) * (W - 8)) + 4;
  const ss = sessions(m), evs = m.seances.filter(s => s.eval);
  return `<svg class="spark" viewBox="0 0 ${W} 44" role="img" aria-label="Séances du module">
    <rect class="vac" x="${X(D.periode.vacances[0])}" y="2" width="${X(D.periode.vacances[1]) - X(D.periode.vacances[0])}" height="26" rx="3"><title>Vacances</title></rect>
    <line class="axis" x1="4" x2="${W - 4}" y1="28" y2="28"/>
    ${ss.map(s => `<rect class="tick ${m.seances_estimees ? "est" : ""}" x="${X(s.date) - 1.5}" y="8" width="3" height="20" rx="1.5"><title>${fmtD(s.date)} ${s.debut}-${s.fin}</title></rect>`).join("")}
    ${evs.map(s => { const x = X(s.date); return `<path class="eval" d="M${x} 1l6 6-6 6-6-6z"><title>${esc(s.label)} · ${fmtD(s.date)}</title></path>`; }).join("")}
    <text x="${X("2026-12-01")}" y="41">déc.</text><text x="${X("2027-01-01")}" y="41">janv.</text>
  </svg><div class="spark-legend"><span><i class="k-tick"></i>séance</span><span><i class="k-eval"></i>évaluation</span><span><i class="k-vac"></i>vacances</span></div>`;
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
  if (e.target.closest("[data-unpin]")) { S.pinned = null; render(); return; }
  const b = e.target.closest("[data-avis]"); if (!b) return;
  const m = M[b.dataset.avis];
  $("#avis-title").textContent = `Avis · ${m.code} ${m.titre}`;
  $("#avis-body").innerHTML = `<p class="small faint">Textes d'origine (Discord, pseudos anonymisés ; guide S7). Ce sont des avis parfois anciens : la campagne 2026 fait foi.</p>` +
    m.avis.textes.map(t => `<h5>${esc(t.source)}</h5><pre>${esc(t.texte.trim())}</pre>`).join("");
  $("#avis-modal").showModal();
});

/* ---------------- En-tête : parcours types, réinitialisation ---------------- */
// Score des parcours automatiques = part de la filière qui avait pris le module en 2025-26.
// Exception MAT4101 : ses chiffres viennent du DA4101, pris par ~74 % de toute la promo. On ne garde que l'écart
// au-dessus de cette moyenne (ramené sur 0-1) ; sinon il passerait en tête de P2-2 pour presque toutes les filières.
const DA_AVG = (() => { const s = M.MAT4101?.stats; if (!s) return 0; const b = D.filieres.reduce((t, f) => t + s.base[f], 0); return b ? D.filieres.reduce((t, f) => t + s.vers[f], 0) / b : 0; })();
function presetScore(k, f) {
  const v = taken(M[k], f) || 0;
  return codeOf(k) === "MAT4101" ? Math.max(0, v - DA_AVG) / (1 - DA_AVG) : v;
}
$("#preset").innerHTML += D.filieres.map(f => `<option value="${f}">${f}${D.parcours[f] ? "" : " (auto, d'après 2025-26)"}</option>`).join("");
$("#preset").addEventListener("change", e => {
  const f = e.target.value; if (!f) return;
  const tops = {};
  for (const c of CAMPS) {
    const all = [...D.campagnes[c].ordre];
    if (D.parcours[f]) tops[c] = (D.parcours[f][c] || []).map(code => all.find(k => codeOf(k) === code)).filter(Boolean);
    else tops[c] = all.filter(k => codeOf(k) !== "JOKER" && presetScore(k, f) > 0).sort((a, b) => presetScore(b, f) - presetScore(a, f));
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
  S.cal = null; e.target.value = ""; save(); render();
  toast(`Parcours ${f} chargé : ajuste-le, puis place JOKER où tu veux.`);
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
const CAL_MODES = { tout: "Tout", voeux: "Mes vœux", sel: "Ma sélection" };
function calKeys(mode) { // modules affichés selon le filtre
  if (mode === "sel") { const p = calPicks(); return CAMPS.map(c => p[c]).filter(k => M[k] && codeOf(k) !== "JOKER"); }
  const keys = mode === "voeux"
    ? CAMPS.flatMap(c => wanted(c)).flatMap(k => (M[k].campagne === "P1-1" && IMPOSE[codeOf(k)] ? [k, IMPOSE[codeOf(k)]] : [k]))
    : Object.keys(M);
  return [...new Set(keys)].filter(k => codeOf(k) !== "JOKER" && codeOf(k) !== "DIV4201");
}
function renderCalendar() {
  const mode = S.calMode || "tout", showPromo = S.calPromo !== false, picks = calPicks();
  const opts = c => {
    const keys = c === "P1-2" ? [...new Set([...Object.values(IMPOSE), ...S.order[c]])] : S.order[c];
    return keys.map(k => `<option value="${k}" ${picks[c] === k ? "selected" : ""}>${esc(codeOf(k))}${M[k].impose_par ? " (imposé)" : ""} · ${esc(M[k].titre.slice(0, 34))}</option>`).join("");
  };
  $("#cal-picks").innerHTML =
    `<div class="seg" role="group" aria-label="Modules affichés">${Object.entries(CAL_MODES).map(([v, l]) => `<button data-calmode="${v}" aria-pressed="${mode === v}">${l}</button>`).join("")}</div>
     <button class="chip" data-calpromo aria-pressed="${showPromo}">Promo 2A</button>` +
    (mode === "sel"
      ? CAMPS.map(c => `<label style="${dcol(picks[c])}"><span><i></i>${c}</span><select data-camp="${c}">${opts(c)}</select></label>`).join("") +
        `<button class="ghost" id="cal-reset" ${S.cal ? "" : "disabled"} title="Revenir à tes premiers vœux">Mes 1ers vœux</button>`
      : `<span class="small faint">${mode === "tout" ? "tous les modules P1/P2 déjà planifiés" : "les modules classés au-dessus de JOKER, parties 2 imposées comprises"}</span>`);
  $("#cal-legend").innerHTML = `<span><span class="k mine"></span>module (couleur de la discipline)</span><span><span class="k isev"></span>◆ évaluation</span>${showPromo ? `<span><span class="k promo"></span>promo 2A</span>` : ""}${mode === "sel" ? `<span><i>italique</i> = estimé</span>` : ""}`;

  const keys = calKeys(mode);
  // hors « Ma sélection », les créneaux estimés (modules pas encore planifiés) rempliraient toutes les cases : on les liste à part
  const chosen = keys.map(k => ({ k, m: M[k] })).filter(x => mode === "sel" || !x.m.seances_estimees);
  const unplanned = keys.filter(k => M[k].seances_estimees);
  const cells = {}; // date|half -> {evs:[], conflict}
  CAL_DAYS = {};    // date -> tous les événements du jour (pour le détail au clic)
  const put = (date, h, ev) => { (cells[`${date}|${h}`] ||= { evs: [] }).evs.push(ev); (CAL_DAYS[date] ||= []).push(ev); };
  for (const { k, m } of chosen) for (const s of m.seances) put(s.date, half(s.debut), { kind: "mine", k, code: m.code, s, est: m.seances_estimees });
  if (showPromo) for (const p of D.promo) put(p.date, half(p.debut), { kind: "promo", code: p.n > 1 ? `${p.label} ×${p.n}` : p.label, s: p });
  // Chevauchement = un de tes modules EN MÊME TEMPS qu'un autre cours (horaires qui se recouvrent), calculé sur « Ma sélection ».
  // En « Tout » / « Mes vœux », les modules d'une même campagne partagent volontairement leurs créneaux : pas d'alerte.
  const overlap = (a, b) => a.s.date === b.s.date && mins(a.s.debut) < mins(b.s.fin) && mins(b.s.debut) < mins(a.s.fin);
  let conflicts = 0;
  for (const evs of Object.values(CAL_DAYS)) for (const a of evs) a.with = [];
  if (mode === "sel") for (const evs of Object.values(CAL_DAYS)) evs.forEach((a, i) => evs.slice(i + 1).forEach(b => {
    if ((a.kind === "mine" || b.kind === "mine") && overlap(a, b)) { a.with.push(b); b.with.push(a); conflicts++; }
  }));
  for (const cell of Object.values(cells)) cell.conflict = cell.evs.some(e => e.with.length);

  // semaines (lundis) ; les 2 semaines de vacances fusionnées
  const mondays = [];
  for (let d = dateOf(D.periode.debut); d <= dateOf("2027-02-01"); d.setDate(d.getDate() + 7)) mondays.push(new Date(d));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isVac = d => iso(d) >= "2026-12-21" && iso(d) <= "2026-12-28";
  const weeks = mondays.filter((d, i) => !isVac(d) || !isVac(mondays[i - 1] || new Date(0)));
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  let g = `<div class="h corner">semaine du</div>` + weeks.map(w => `<div class="h">${isVac(w) ? "vac." : fmtDM(iso(w))}</div>`).join("");
  for (let di = 0; di < 5; di++) for (const h of ["am", "pm"]) {
    g += `<div class="rowh ${h}">${h === "am" ? `<b>${days[di]}</b> matin` : "après-midi"}</div>`;
    for (const w of weeks) {
      if (isVac(w)) { g += `<div class="cell vac ${h}" title="Vacances"></div>`; continue; }
      const d = new Date(w); d.setDate(d.getDate() + di);
      const key = iso(d), cell = cells[`${key}|${h}`];
      const evs = (cell?.evs || []).sort((a, b) => (a.kind === "promo") - (b.kind === "promo") ||
        (a.k && b.k ? CAMPS.indexOf(M[a.k].campagne) - CAMPS.indexOf(M[b.k].campagne) || a.code.localeCompare(b.code) : 0));
      g += `<div class="cell ${h} ${cell?.conflict ? "conflict" : ""} ${CAL_DAYS[key] ? "has" : ""}" data-date="${key}" role="button" tabindex="0" title="${fmtD(key)} : clic pour le détail de la journée">${
        evs.map(e => `<span class="ev ${e.kind} ${e.est ? "est" : ""} ${e.s.eval ? "isev" : ""}" ${e.k ? `style="${dcol(e.k)}"` : ""} title="${esc(e.s.titre || e.code)} · ${e.s.debut}-${e.s.fin}${e.s.n > 1 ? ` · ${e.s.n} groupes/jurys en parallèle` : ""}${e.est ? " · créneau estimé" : ""}">${e.k ? `<i class="sw"></i>` : ""}${e.s.eval ? "◆ " : ""}${esc(e.code)}</span>`).join("")
      }</div>`;
    }
  }
  const grid = $("#cal-grid");
  grid.style.gridTemplateRows = "auto repeat(10, minmax(0, 1fr))";
  grid.style.gridTemplateColumns = `118px ${weeks.map(w => (isVac(w) ? "40px" : "minmax(70px,1fr)")).join(" ")}`;
  grid.innerHTML = g;
  grid.classList.toggle("many", mode !== "sel");
  clampCells();

  const evals = chosen.flatMap(({ m }) => m.seances.filter(s => s.eval).map(s => ({ m, s })));
  const est = chosen.filter(({ m }) => m.seances_estimees);
  const hours = chosen.reduce((t, { m }) => t + (m.seances_estimees ? 0 : hoursOf(m)), 0);
  const byWeek = {};
  for (const { s } of evals) { const d = dateOf(s.date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); (byWeek[iso(d)] ||= []).push(s); }
  const peak = Object.entries(byWeek).sort((a, b) => b[1].length - a[1].length)[0];
  const stat = (v, l, sub = "", cls = "") => `<div class="stat ${cls}"><b>${v}</b><span>${l}</span>${sub ? `<span class="faint">${sub}</span>` : ""}</div>`;
  const list = ks => ks.map(codeOf).join(", ");
  $("#cal-summary").innerHTML = (mode === "sel" ? [
    stat(conflicts, `cours en même temps`, conflicts ? "voir les cases en rouge" : "le même jour à d'autres heures, c'est ok", conflicts ? "bad" : ""),
    stat(`${Math.round(hours)} h`, "de cours planifiées", est.length ? `+ ${est.map(x => x.m.code).join(", ")} pas encore planifié${est.length > 1 ? "s" : ""}` : ""),
    stat(evals.length, `évaluation${evals.length > 1 ? "s" : ""}`, evals.sort((a, b) => a.s.date.localeCompare(b.s.date)).map(({ m, s }) => `${m.code} ${fmtDM(s.date)}`).join(" · ")),
    peak && peak[1].length > 1 ? stat(peak[1].length, "évaluations la même semaine", `semaine du ${fmtDM(peak[0])}`, "risk") : "",
    est.some(x => x.m.evals_2526.length) ? stat("25-26", "dates d'éval. de l'an dernier", est.flatMap(x => x.m.evals_2526.map(e => `${x.m.code} ${fmtDM(e.date)}`)).join(" · ")) : "",
  ] : [
    stat(chosen.length, `module${chosen.length > 1 ? "s" : ""} affiché${chosen.length > 1 ? "s" : ""}`, "clic sur un jour pour le détail"),
    stat(evals.length, `évaluation${evals.length > 1 ? "s" : ""}`, evals.sort((a, b) => a.s.date.localeCompare(b.s.date)).map(({ m, s }) => `${m.code} ${fmtDM(s.date)}`).join(" · ")),
    unplanned.length ? stat(unplanned.length, `pas encore planifié${unplanned.length > 1 ? "s" : ""}`, list(unplanned)) : "",
  ]).join("");
}
$("#cal-picks").addEventListener("change", e => {
  const sel = e.target.closest("select"); if (!sel) return;
  S.cal = { ...calPicks(), [sel.dataset.camp]: sel.value }; save(); renderCalendar();
});
$("#cal-picks").addEventListener("click", e => {
  if (e.target.id === "cal-reset") { S.cal = null; save(); renderCalendar(); return; }
  const m = e.target.closest("[data-calmode]");
  if (m) { S.calMode = m.dataset.calmode; save(); renderCalendar(); return; }
  if (e.target.closest("[data-calpromo]")) { S.calPromo = S.calPromo === false; save(); renderCalendar(); }
});

/* Case trop pleine : on masque ce qui dépasse et on affiche « +n » (le détail au clic montre tout) */
function clampCells() {
  for (const cell of document.querySelectorAll("#cal-grid .cell")) {
    cell.querySelector(".more")?.remove();
    const evs = [...cell.querySelectorAll(".ev")];
    for (const e of evs) e.hidden = false;
    if (cell.scrollHeight <= cell.clientHeight + 1) continue;
    const more = document.createElement("span"); more.className = "more"; cell.append(more);
    let n = 0;
    for (let i = evs.length - 1; i >= 0 && cell.scrollHeight > cell.clientHeight + 1; i--) { evs[i].hidden = true; more.textContent = `+${++n}`; }
  }
}
new ResizeObserver(() => { if (!$("#view-calendrier").hidden) clampCells(); }).observe($("#cal-grid"));
document.addEventListener("viewshown", e => { if (e.detail === "calendrier") clampCells(); });

/* Détail d'une journée : clic sur une case du calendrier */
let CAL_DAYS = {}, popDate = null;
function openDay(date, anchor) {
  const pop = $("#cal-pop"), evs = (CAL_DAYS[date] || []).slice().sort((a, b) => a.s.debut.localeCompare(b.s.debut) || (a.kind === "promo") - (b.kind === "promo"));
  const d = dateOf(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const row = e => {
    const mine = e.kind === "mine", m = mine ? M[e.k] : null;
    const what = mine ? `${esc(m.titre)}` : esc(e.s.titre || e.s.label);
    const kind = [e.s.eval ? `◆ ${esc(e.s.label)}` : esc(e.s.type || e.s.label), e.est ? "créneau estimé" : "", e.s.n > 1 ? `${e.s.n} groupes en parallèle` : ""].filter(Boolean).join(" · ");
    const ov = e.with.length ? `<div class="ov">en même temps que ${e.with.map(o => `<b>${esc(o.code)}</b> ${o.s.debut}–${o.s.fin}`).join(", ")}</div>` : "";
    const twins = mine && !e.with.length ? evs.filter(o => o !== e && o.kind === "mine" && M[o.k].campagne !== m.campagne && o.s.debut === e.s.debut && o.s.fin === e.s.fin) : [];
    const same = twins.length ? `<div class="${twins.some(o => together(e.k, o.k)) ? "ov" : "faint"}">mêmes horaires que ${twins.map(o => `<b>${esc(o.code)}</b>`).join(", ")}${twins.some(o => together(e.k, o.k)) ? "" : " · jamais ensemble"}</div>` : "";
    return `<div class="pr ${e.kind} ${e.with.length ? "conflict" : ""} ${e.s.eval && mine ? "isev" : ""}" ${mine ? `style="${dcol(e.k)}"` : ""}>
      <span class="t">${e.s.debut}–${e.s.fin}</span>
      <span class="w">${mine ? `<i class="sw"></i>` : ""}<b>${esc(mine ? m.code : e.s.label)}</b> ${mine ? `<span class="faint">${esc(m.campagne)}</span>` : `<span class="faint">promo</span>`}<br><span class="muted">${what}</span><br><span class="faint">${kind}</span>${ov}${same}</span>
    </div>`;
  };
  pop.innerHTML = `<div class="pop-head"><b>${d.charAt(0).toUpperCase() + d.slice(1)}</b><button class="d-close" data-close aria-label="Fermer">✕</button></div>
    <div class="pop-body">${evs.length ? evs.map(row).join("") : `<p class="faint small pad">Rien de prévu ce jour-là.</p>`}</div>`;
  pop.hidden = false; popDate = date;
  const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = r.right + 6; if (x + pw > innerWidth - 8) x = r.left - pw - 6; if (x < 8) x = 8;
  let y = r.top; if (y + ph > innerHeight - 8) y = Math.max(56, innerHeight - ph - 8);
  Object.assign(pop.style, { left: `${x}px`, top: `${y}px` });
  for (const c of document.querySelectorAll("#cal-grid .cell.on")) c.classList.remove("on");
  for (const c of document.querySelectorAll(`#cal-grid .cell[data-date="${date}"]`)) c.classList.add("on");
}
function closeDay() { $("#cal-pop").hidden = true; popDate = null; for (const c of document.querySelectorAll("#cal-grid .cell.on")) c.classList.remove("on"); }
$("#cal-grid").addEventListener("click", e => {
  const c = e.target.closest(".cell[data-date]"); if (!c) return;
  popDate === c.dataset.date ? closeDay() : openDay(c.dataset.date, c);
});
$("#cal-grid").addEventListener("keydown", e => {
  const c = e.target.closest(".cell[data-date]");
  if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDay(c.dataset.date, c); }
});
document.addEventListener("click", e => { if (popDate && !e.target.closest("#cal-pop, #cal-grid .cell") || e.target.closest("[data-close]")) closeDay(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && popDate) closeDay(); });
document.addEventListener("viewshown", closeDay);

/* ---------------- Tout tenir dans l'écran ---------------- */
function fit() { // jusqu'à 11 lignes par colonne : hauteur disponible répartie (36 à 50 px)
  const cols = $("#columns"); if (!cols.clientHeight) return;
  const max = Math.max(...CAMPS.map(c => S.order[c].length));
  const h = Math.floor((cols.clientHeight - 36) / max); // en-tête de colonne 33 px + bordures ; filets compris dans la hauteur
  document.documentElement.style.setProperty("--card-h", `${Math.max(36, Math.min(50, h))}px`);
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

renderTheme(); renderLegend(); renderDeadline(); render(); fit();
setInterval(renderDeadline, 60e3);
