"use strict";
/* Pages Comparer, Profs et Parcours 2025-26. S'appuie sur les globales de app.js (D, M, S, $, esc, …). */

// Lignes des matrices : un module choisissable par ligne (parties 2 imposées = mêmes étudiants que la partie 1, omises).
const ROWS = [];
for (const c of CAMPS) for (const k of D.campagnes[c].ordre) {
  const m = M[k];
  if (m.code === "JOKER" || (m.code === "DIV4201" && c !== "P1-1")) continue;
  ROWS.push(k);
}
const campLabel = k => (M[k].code === "DIV4201" ? "tous" : M[k].campagne);
const lastName = n => n.split(" ").slice(-1)[0];
const ROLE = { resp: "responsable", "équipe": "équipe" };
const FRESH = { ok: "à jour", partiel: "en partie dépassé", obsolete: "plus valable", aucun: "aucun avis" };

function goto(k) { // ouvrir la fiche dans Classement
  S.pinned = k;
  document.querySelector('.tabs [data-view="classement"]').click();
  render();
}
const modLink = k => `<button class="linkbtn mod" data-goto="${k}" style="${dcol(k)}" title="Ouvrir la fiche dans Classement"><i></i>${esc(M[k].code)}</button>`;
document.addEventListener("click", e => { const b = e.target.closest("[data-goto]"); if (b) goto(b.dataset.goto); });
const head = (top, title, meta = "", k = null) => `<div class="d-head" ${k ? `style="${dcol(k)}"` : ""}><div class="d-top">${top}</div><h3>${title}</h3>${meta ? `<div class="meta">${meta}</div>` : ""}</div>`;
const sec = (title, body, right = "") => `<section class="sec"><h4>${title}${right ? `<span class="r">${right}</span>` : ""}</h4>${body}</section>`;

/* ---------- Matrice générique (Profs, Parcours) ---------- */
function matrix(el, { cell, colHead, rowExtra = () => "", footer = null, sel = {} }) {
  let h = `<div class="hd"></div><div class="hd left">Module</div>` + D.filieres.map(f =>
    `<button class="hd col ${sel.f === f && !sel.k ? "sel" : ""}" data-f="${f}">${f}${colHead ? `<span class="faint">${colHead(f)}</span>` : ""}</button>`).join("");
  let prev = null, groups = 0;
  const tpl = ["34px"], GAP = `<div class="gap"></div>`;
  for (const k of ROWS) {
    const m = M[k], camp = campLabel(k), first = camp !== prev; prev = camp;
    if (first) { h += GAP; tpl.push("6px"); groups++; }
    tpl.push("var(--row-h)");
    h += `<div class="cp ${first ? "first" : ""}">${first ? camp : ""}</div>
      <button class="rl ${first ? "first" : ""} ${sel.k === k && !sel.f ? "sel" : ""}" data-k="${k}" style="${dcol(k)}" title="${esc(m.titre)}"><span class="mono">${esc(m.code)}</span><span class="t">${esc(m.titre)}</span>${rowExtra(k)}</button>`;
    for (const f of D.filieres) {
      const c = cell(k, f);
      h += `<button class="c ${first ? "first" : ""} ${sel.k === k && sel.f === f ? "sel" : ""} ${c.cls || ""}" data-k="${k}" data-f="${f}" style="${c.style || ""}" title="${esc(c.title || "")}">${c.html || ""}</button>`;
    }
  }
  if (footer) {
    h += GAP; tpl.push("6px", "var(--row-h)"); groups++;
    h += `<div class="cp first"></div><div class="rl first foot">${footer.label}</div>` +
      D.filieres.map(f => `<div class="c first foot">${footer.cell(f)}</div>`).join("");
  }
  el.innerHTML = h;
  el.style.gridTemplateRows = tpl.join(" ");
  const n = tpl.length - 1 - groups, hgt = el.clientHeight; // lignes de données ; 6 px par séparateur
  if (!hgt) return;
  const rh = Math.max(12, Math.min(26, Math.floor((hgt - 34 - groups * 6 - 2) / n)));
  el.style.setProperty("--row-h", `${rh}px`);
  el.classList.toggle("dense", rh < 15);
}
// Survol d'une case : on surligne son module et sa filière (lecture en croix)
for (const id of ["#profs-mx", "#pc-mx"]) {
  const el = $(id);
  el.addEventListener("mouseover", e => {
    const c = e.target.closest(".c[data-k]");
    for (const x of el.querySelectorAll(".hl")) x.classList.remove("hl");
    if (!c) return;
    el.querySelector(`.rl[data-k="${CSS.escape(c.dataset.k)}"]`)?.classList.add("hl");
    el.querySelector(`.hd[data-f="${CSS.escape(c.dataset.f)}"]`)?.classList.add("hl");
  });
  el.addEventListener("mouseleave", () => { for (const x of el.querySelectorAll(".hl")) x.classList.remove("hl"); });
}

/* ---------- Page Profs ---------- */
let PS = {};
function shared(k, f) {
  const hits = (M[k].profs_vap || []).filter(p => p.filiere === f);
  return { hits, lvl: hits.some(p => p.vap_role === "resp") ? 2 : hits.length ? 1 : 0 };
}
function renderProfs() {
  matrix($("#profs-mx"), {
    sel: PS,
    cell: (k, f) => {
      const { hits, lvl } = shared(k, f);
      return lvl ? { html: lvl === 2 ? "●" : "○", cls: `mark m${lvl}`, title: [...new Set(hits.map(p => `${p.nom} (${p.vap_role} ${p.vap})`))].join(" · ") } : {};
    },
    footer: { label: "modules liés", cell: f => { const n = ROWS.filter(k => shared(k, f).lvl).length; return n ? `<b>${n}</b>` : `<span class="faint">0</span>`; } },
  });
  $("#profs-side").innerHTML = profsSide();
}
function vapBlock(f) {
  return D.vap[f].map(v => `<div class="vapmod"><a href="${esc(v.fiche)}" target="_blank" rel="noopener" class="mono">${v.code} ↗</a> ${esc(v.titre)}
    <div class="small"><b>${esc(v.responsables.join(", "))}</b>${v.equipe.length ? ` <span class="faint">· équipe : ${esc(v.equipe.join(", "))}</span>` : ""}</div></div>`).join("");
}
const linkedTo = f => ROWS.map(k => ({ k, ...shared(k, f) })).filter(x => x.lvl).sort((a, b) => b.lvl - a.lvl);
function profsSide() {
  const { k, f } = PS;
  if (k && f) {
    const { hits } = shared(k, f), m = M[k];
    const people = [...new Set(hits.map(p => p.nom))];
    return head(`${modLink(k)}<span>×</span><b>${f}</b>`, esc(m.titre), "", k) + `<div class="d-body">` +
      sec("Profs en commun", people.length ? people.map(n => {
        const h = hits.filter(p => p.nom === n);
        return `<div class="person"><b>${esc(n)}</b><span class="small muted">dans ce module : ${ROLE[h[0].role]} · dans la VAP : ${h.map(p => `${ROLE[p.vap_role]} de ${p.vap}`).join(", ")}</span></div>`;
      }).join("") : `<p class="faint small">Aucun.</p>`) +
      sec(`Modules de la VAP ${f}`, vapBlock(f)) + `</div>`;
  }
  if (f) {
    const linked = linkedTo(f);
    return head("Filière", f, `${linked.length} module${linked.length > 1 ? "s" : ""} P1/P2 avec un prof de cette VAP`) + `<div class="d-body">` +
      sec("Modules P1/P2 liés", linked.length ? `<div class="kv">${linked.map(x => `<span class="k">${x.lvl === 2 ? "●" : "○"} ${modLink(x.k)}</span><span>${esc([...new Set(x.hits.map(p => lastName(p.nom)))].join(", "))} <span class="faint">${esc(M[x.k].campagne)}</span></span>`).join("")}</div>`
        : `<p class="small">Aucun : les profs de cette VAP n'enseignent pas en P1/P2. Pour savoir ce qui prépare le mieux, écris directement aux responsables ci-dessous.</p>`) +
      sec("Modules de la VAP", vapBlock(f)) + `</div>`;
  }
  if (k) {
    const m = M[k], links = D.filieres.map(f => ({ f, ...shared(k, f) })).filter(x => x.lvl);
    return head(`${modLink(k)}<span>${esc(m.campagne)}</span>`, esc(m.titre), "", k) + `<div class="d-body">` +
      sec("Équipe du module", `<div class="person"><b>${esc((m.responsables || []).join(", ") || "—")}</b><span class="small muted">responsable${m.equipe?.length ? ` · avec ${esc(m.equipe.join(", "))}` : ""}</span></div>`) +
      sec("On les retrouve dans les VAP", links.length ? `<div class="kv">${links.map(x => `<span class="k">${x.lvl === 2 ? "●" : "○"} ${x.f}</span><span>${esc([...new Set(x.hits.map(p => `${lastName(p.nom)} (${p.vap})`))].join(", "))}</span>`).join("")}</div>` : `<p class="faint small">Aucune VAP.</p>`) + `</div>`;
  }
  // Vue d'ensemble : les 12 filières, de la plus liée à la moins liée
  const all = D.filieres.map(f => ({ f, l: linkedTo(f) })).sort((a, b) => b.l.length - a.l.length);
  return head("Vue d'ensemble", "Profs communs P1/P2 ↔ VAP", "Un prof que tu as en P1/P2 et qu'on retrouve dans la VAP : utile pour un premier contact.") +
    `<div class="d-body">${sec("Par filière", `<div class="frows">${all.map(({ f, l }) => `<button class="frow" data-f="${f}"><b>${f}</b><span class="n">${l.length}</span><span class="codes">${l.length ? l.map(x => esc(M[x.k].code)).join(" · ") : `<span class="faint">aucun prof commun</span>`}</span></button>`).join("")}</div>`)}</div>`;
}
$("#profs-mx").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const n = { k: b.dataset.k, f: b.dataset.f };
  PS = PS.k === n.k && PS.f === n.f ? {} : n; renderProfs();
});
$("#profs-side").addEventListener("click", e => { const b = e.target.closest(".frow"); if (b) { PS = { f: b.dataset.f }; renderProfs(); } });

/* ---------- Page Parcours 2025-26 ---------- */
let PC = { mode: "pris" };
const heatVal = (k, f) => {
  const m = M[k]; if (!m.stats) return null;
  return PC.mode === "pris" ? taken(m, f) : (m.stats.n ? m.stats.vers[f] / m.stats.n : null);
};
function heatStyle(v) { // séquentiel marine (couleur secondaire), clair → foncé
  if (!v) return "";
  const a = Math.round(6 + Math.min(1, v / 0.8) * 74);
  return `background:color-mix(in srgb, var(--heat) ${a}%, var(--surface));${a > 45 ? "color:var(--surface);" : ""}`;
}
function renderParcours() {
  for (const b of $("#pc-mode").children) b.setAttribute("aria-pressed", b.dataset.mode === PC.mode);
  $("#pc-title").textContent = PC.mode === "pris" ? "Ce qu'avaient pris les étudiants de chaque filière" : "Où sont allés ceux qui avaient pris chaque module";
  $("#pc-hint").textContent = PC.mode === "pris"
    ? "lire par colonne · ex. 75 % des MAIA avaient pris NET4201 · promo 2025-26"
    : "lire par ligne · ex. 78 % de ceux qui ont pris MAT4251 sont allés en MSA · promo 2025-26";
  matrix($("#pc-mx"), {
    sel: PC,
    colHead: f => { const b = D.modules.NET4201.stats.base[f]; return PC.mode === "pris" ? ` ${b} étud.${b < 5 ? " ⚠" : ""}` : ""; },
    rowExtra: k => (M[k].code === "MAT4101" ? `<span class="n faint" title="Chiffres du DA4101 2025-26">DA*</span>` : "") + (PC.mode === "vers" && M[k].stats ? `<span class="n faint">${M[k].stats.n}</span>` : ""),
    cell: (k, f) => {
      const v = heatVal(k, f), m = M[k];
      if (v === null) return { html: "–", cls: "na", title: "pas de donnée" };
      const num = PC.mode === "pris" ? `${m.stats.vers[f]}/${m.stats.base[f]} des ${f}` : `${m.stats.vers[f]}/${m.stats.n} de ceux qui l'ont pris`;
      const low = PC.mode === "pris" && m.stats.base[f] < 5;
      return { html: v >= 0.005 ? Math.round(v * 100) : "", style: heatStyle(v), cls: low ? "low" : "", title: (low ? "Effectif trop faible pour conclure · " : "") + `${m.code} × ${f} : ${num} (${pct(v)})${m.code === "MAT4101" ? " · d'après le DA4101 2025-26" : ""}` };
    },
  });
  $("#pc-side").innerHTML = parcoursSide();
}
function parcoursSide() {
  const { k, f } = PC;
  const profile = f => `<div class="kv">${CAMPS.map(c => {
    const top = ROWS.filter(k => M[k].campagne === c && taken(M[k], f) > 0).sort((a, b) => taken(M[b], f) - taken(M[a], f)).slice(0, 3);
    return `<span class="k">${c}</span><span>${top.length ? top.map(k => `${modLink(k)} <b>${Math.round(taken(M[k], f) * 100)} %</b>${M[k].code === "MAT4101" ? "*" : ""}`).join("<br>") : `<span class="faint">rien de marquant</span>`}</span>`;
  }).join("")}</div><p class="small faint">* MAT4101 était au DA4101 en 2025-26 (pris par 74 % de la promo) : chiffre peu comparable.</p>`;
  if (k && f) {
    const m = M[k], st = m.stats;
    if (!st || !st.n) return head(`${modLink(k)}<span>×</span><b>${f}</b>`, esc(m.titre), "", k) + `<div class="d-body"><p class="faint">Module nouveau : aucune donnée 2025-26.</p></div>`;
    const { lvl } = shared(k, f);
    return head(`${modLink(k)}<span>×</span><b>${f}</b>`, esc(m.titre), esc(st.source), k) + `<div class="d-body">
      <div class="facts two">
        ${fact(`${f} qui l'avaient pris`, `${st.vers[f]} / ${st.base[f]}`, pct(st.base[f] ? st.vers[f] / st.base[f] : 0))}
        ${fact(`Qui l'ont pris → ${f}`, `${st.vers[f]} / ${st.n}`, pct(st.vers[f] / st.n))}
      </div>
      <p class="small muted">${lvl ? `${lvl === 2 ? "●" : "○"} Un prof du module enseigne aussi dans la VAP ${f}.` : `Aucun prof commun avec la VAP ${f}.`}</p>
      ${sec(`Parcours type ${f}`, profile(f))}</div>`;
  }
  if (f) {
    return head(`Filière · ${D.modules.NET4201.stats.base[f]} étudiants passés par P1/P2 en 2025-26`, `Parcours type ${f}`) + `<div class="d-body">` +
      sec("Les 3 modules les plus pris par campagne", profile(f)) +
      `<button class="primary" data-preset="${f}">Charger ce parcours dans Classement</button>
      <p class="small faint">Une tendance sur une promo, pas une règle : corrélation ≠ cause.</p></div>`;
  }
  if (k) {
    const m = M[k], st = m.stats;
    if (!st || !st.n) return head(modLink(k), esc(m.titre), "", k) + `<div class="d-body"><p class="faint">Module nouveau : aucune donnée 2025-26.</p></div>`;
    const top = D.filieres.filter(f => st.vers[f]).sort((a, b) => st.vers[b] - st.vers[a]);
    return head(`${modLink(k)}<span>${esc(m.campagne)}</span>`, esc(m.titre), `${esc(st.source)} · ${st.n} étudiants`, k) + `<div class="d-body">` +
      sec("Ceux qui l'ont pris sont allés en", `<div class="hbars">${top.map(f => `<span class="f">${f}</span><span class="track"><span class="bar" style="width:${Math.max(2, st.vers[f] / st.n * 100)}%"></span></span><span class="v">${pct(st.vers[f] / st.n)}</span>`).join("")}</div>`) + `</div>`;
  }
  return head("Mode d'emploi", "Comment lire ce tableau") + `<div class="d-body">
    <div class="howto">
      <p><b>« Ce qu'ils avaient pris »</b> : chaque colonne est une filière de fin d'année. La case dit quelle part de ses étudiants avait pris le module.</p>
      <p><b>« Où sont allés »</b> : chaque ligne est un module. La case dit où sont partis ceux qui l'avaient pris.</p>
      <p>Plus la case est foncée, plus le chiffre est grand.</p>
      <p class="faint">Promo 2025-26 seulement, petits effectifs (MAIA 12, HTI 20) : une tendance, pas une règle. MAT4101 : chiffres du DA4101 2025-26.</p>
    </div>` +
    sec("Voir le parcours type d'une filière", `<div class="fgrid">${D.filieres.map(f => `<button class="chip" data-pf="${f}">${f}</button>`).join("")}</div>`) + `</div>`;
}
$("#pc-mx").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const n = { k: b.dataset.k, f: b.dataset.f };
  if (PC.k === n.k && PC.f === n.f) { PC.k = PC.f = undefined; } else { PC.k = n.k; PC.f = n.f; }
  renderParcours();
});
$("#pc-mode").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (b) { PC.mode = b.dataset.mode; renderParcours(); } });
$("#pc-side").addEventListener("click", e => {
  const pf = e.target.closest("[data-pf]");
  if (pf) { PC.k = undefined; PC.f = pf.dataset.pf; renderParcours(); return; }
  const b = e.target.closest("[data-preset]"); if (!b) return;
  const sel = $("#preset"); sel.value = b.dataset.preset; sel.dispatchEvent(new Event("change"));
  document.querySelector('.tabs [data-view="classement"]').click();
});

/* ---------- Page Comparer ---------- */
let CMP = null;
function cmpDefault(c) {
  return { camp: c, keys: wanted(c).filter(k => codeOf(k) !== "DIV4201").slice(0, 3) };
}
const cmpPool = c => {
  const keys = D.campagnes[c].ordre.filter(k => codeOf(k) !== "JOKER");
  return c === "P1-2" ? [...Object.values(IMPOSE), ...keys] : keys;
};
function renderComparer() {
  CMP ||= cmpDefault("P1-1");
  $("#cmp-camps").innerHTML = CAMPS.map(c => `<button data-camp="${c}" aria-pressed="${CMP.camp === c}">${c}</button>`).join("");
  $("#cmp-chips").innerHTML = cmpPool(CMP.camp).map(k => {
    const on = CMP.keys.includes(k);
    return `<button class="chip" data-k="${k}" aria-pressed="${on}" style="${dcol(k)}" ${!on && CMP.keys.length >= 4 ? "disabled" : ""}><i></i>${esc(codeOf(k))}${M[k].impose_par ? " (imposé)" : ""}</button>`;
  }).join("");
  const keys = CMP.keys, grid = $("#cmp-grid");
  grid.style.setProperty("--n", Math.max(1, keys.length));
  if (!keys.length) { grid.innerHTML = `<div class="lab"></div><div class="faint">Choisis jusqu'à 4 modules ci-dessus.</div>`; return; }
  const { st } = analyze();
  const rank = k => { if (M[k].impose_par) return `imposé si tu obtiens ${M[k].impose_par}`; const r = rankIn(M[k].campagne, codeOf(k)); return r ? `ton vœu n° ${r}` : "sous JOKER (non voulu)"; };
  const rows = [
    ["", k => `<div class="cmp-h" style="${dcol(k)}"><div class="d-top"><span class="d-dom"><i></i>${DOM[domOf(k)]}</span><span>${esc(rank(k))}</span></div>${modLink(k)}<div class="cmp-t">${esc(M[k].titre)}</div></div>`, "hdr"],
    ["Difficulté", k => (M[k].avis.charge ? diffHTML(M[k].avis.charge) : `<span class="faint">inconnue</span>`)],
    ["Règle", k => (st[k] ? `<div class="rule ${st[k].lvl}"><span class="state-ic ${st[k].lvl}">${st[k].lvl === "bad" ? "✕" : "!"}</span>${esc(st[k].msg)}</div>` : "") + (ruleText(M[k]) ? esc(ruleText(M[k])) : st[k] ? "" : `<span class="faint">aucune</span>`)],
    ["Places", k => { const m = M[k]; return `<b>${m.places}</b>${full(m) ? ` <span class="muted">· complet en 25-26 (${m.stats.n} pris)</span>` : m.stats && m.stats.n ? ` <span class="faint">· ${m.stats.n} pris en 25-26</span>` : ""}`; }],
    ["Volume", k => { const m = M[k]; if (m.code === "DIV4201") return "pas de cours"; if (m.seances_estimees) return `<span class="faint">pas encore planifié</span>`; const s = sessions(m); return `<b>${s.length} séances</b> · ${Math.round(hoursOf(m))} h <span class="faint">· ${fmtDM(s[0].date)} → ${fmtDM(s[s.length - 1].date)}</span>`; }],
    ["Évaluations", k => { const m = M[k], ev = m.seances.filter(x => x.eval); if (ev.length) return ev.map(x => `<b>${fmtD(x.date)}</b> <span class="faint">${esc(x.label)}</span>`).join("<br>"); return m.evals_2526.length ? `<span class="faint">en 2025-26 : ${m.evals_2526.map(e => fmtDM(e.date)).join(", ")}</span>` : `<span class="faint">aucune dans l'agenda</span>`; }],
    ["Avis", k => { const a = M[k].avis; return `<span class="badge ${a.fraicheur}">${FRESH[a.fraicheur]}</span> ${esc(a.resume)}${a.alerte ? `<div class="rule risk"><span class="state-ic risk">!</span>${esc(a.alerte)}</div>` : ""}`; }],
    ["Ils sont allés en", k => { const s = M[k].stats; if (!s || !s.n) return `<span class="faint">aucune donnée</span>`; return `<div class="hbars mini">${D.filieres.filter(f => s.vers[f]).sort((a, b) => s.vers[b] - s.vers[a]).slice(0, 3).map(f => `<span class="f">${f}</span><span class="track"><span class="bar" style="width:${s.vers[f] / s.n * 100}%"></span></span><span class="v">${pct(s.vers[f] / s.n)}</span>`).join("")}</div><span class="faint small">${s.n} étudiants en 25-26</span>`; }],
    ["Profs en VAP", k => { const fs = D.filieres.filter(f => shared(k, f).lvl); return fs.length ? fs.map(f => `<b>${f}</b> <span class="muted">${esc([...new Set(shared(k, f).hits.map(p => lastName(p.nom)))].join(", "))}</span>`).join("<br>") : `<span class="faint">aucun</span>`; }],
    ["Responsable", k => esc((M[k].responsables || []).join(", ") || "—")],
  ];
  grid.innerHTML = rows.map(([lab, fn, cls]) => `<div class="lab ${cls || ""}">${lab}</div>` + keys.map(k => `<div class="${cls || ""}">${fn(k)}</div>`).join("")).join("");
}
$("#cmp-camps").addEventListener("click", e => { const b = e.target.closest("[data-camp]"); if (b) { CMP = cmpDefault(b.dataset.camp); renderComparer(); } });
$("#cmp-chips").addEventListener("click", e => {
  const b = e.target.closest("[data-k]"); if (!b) return;
  const k = b.dataset.k;
  CMP.keys = CMP.keys.includes(k) ? CMP.keys.filter(x => x !== k) : [...CMP.keys, k].slice(0, 4);
  renderComparer();
});

/* ---------- Branchements ---------- */
const PAGES = { comparer: renderComparer, profs: renderProfs, parcours: renderParcours };
const visible = () => Object.keys(PAGES).find(v => !$(`#view-${v}`).hidden);
document.addEventListener("viewshown", e => PAGES[e.detail]?.());
for (const id of ["#profs-mx", "#pc-mx"]) new ResizeObserver(() => { const v = visible(); if (v === "profs" || v === "parcours") PAGES[v](); }).observe($(id));
