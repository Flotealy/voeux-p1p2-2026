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
const tgtSlot = () => Object.fromEntries(S.targets.map(t => [t.f, t.slot]));
const lastName = n => n.split(" ").slice(-1)[0];
const ROLE = { resp: "responsable", "équipe": "équipe" };
const CHARGE = ["", "légère", "moyenne", "lourde"];

function goto(k) { // ouvrir la fiche dans Classement
  S.pinned = k;
  document.querySelector('.tabs [data-view="classement"]').click();
  render();
}
const modLink = k => `<button class="linkbtn mono" data-goto="${k}" title="Ouvrir la fiche dans Classement">${esc(M[k].code)}</button>`;
document.addEventListener("click", e => { const b = e.target.closest("[data-goto]"); if (b) goto(b.dataset.goto); });

/* ---------- Matrice générique (Profs, Parcours) ---------- */
function matrix(el, { cell, colHead, rowExtra = () => "", footer = null, sel = {} }) {
  const slot = tgtSlot();
  let h = `<div class="hd"></div><div class="hd left">Module</div>` + D.filieres.map(f =>
    `<button class="hd col ${slot[f] ? "tgt" : ""} ${sel.f === f && !sel.k ? "sel" : ""}" data-f="${f}" style="${slot[f] ? `--tc:${color(slot[f])}` : ""}">${f}${colHead ? `<span class="faint">${colHead(f)}</span>` : ""}</button>`).join("");
  let prev = null;
  for (const k of ROWS) {
    const m = M[k], camp = campLabel(k), first = camp !== prev; prev = camp;
    h += `<div class="cp ${first ? "first" : ""}">${first ? camp : ""}</div>
      <button class="rl ${first ? "first" : ""} ${sel.k === k && !sel.f ? "sel" : ""}" data-k="${k}" title="${esc(m.titre)}"><span class="mono">${esc(m.code)}</span><span class="t">${esc(m.titre)}</span>${rowExtra(k)}</button>`;
    for (const f of D.filieres) {
      const c = cell(k, f);
      h += `<button class="c ${first ? "first" : ""} ${slot[f] ? "tcol" : ""} ${sel.k === k && sel.f === f ? "sel" : ""} ${c.cls || ""}" data-k="${k}" data-f="${f}" style="${c.style || ""}" title="${esc(c.title || "")}">${c.html || ""}</button>`;
    }
  }
  if (footer) {
    h += `<div class="cp first"></div><div class="rl first foot">${footer.label}</div>` +
      D.filieres.map(f => `<div class="c first foot">${footer.cell(f)}</div>`).join("");
  }
  el.innerHTML = h;
  fitMatrix(el, ROWS.length + 1 + (footer ? 1 : 0));
}
function fitMatrix(el, n) {
  const hgt = el.clientHeight; if (!hgt) return;
  // en-tête 32 px + 5 px avant chaque groupe de campagne (5 groupes) + 1 px d'écart par ligne
  el.style.setProperty("--row-h", `${Math.max(15, Math.min(26, Math.floor((hgt - 32 - 25 - n) / (n - 1))))}px`);
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
      return lvl ? { html: lvl === 2 ? "●" : "○", cls: "mark", title: [...new Set(hits.map(p => `${p.nom} (${p.vap_role} ${p.vap})`))].join(" · ") } : {};
    },
    footer: { label: "modules liés", cell: f => { const n = ROWS.filter(k => shared(k, f).lvl).length; return n ? `<b>${n}</b>` : `<span class="faint">0</span>`; } },
  });
  $("#profs-side").innerHTML = profsSide();
}
function vapBlock(f) {
  return D.vap[f].map(v => `<div class="vapmod"><a href="${esc(v.fiche)}" target="_blank" rel="noopener" class="mono">${v.code}</a> ${esc(v.titre)}
    <div class="small"><b>${esc(v.responsables.join(", "))}</b>${v.equipe.length ? ` <span class="faint">· équipe : ${esc(v.equipe.join(", "))}</span>` : ""}</div></div>`).join("");
}
function profsSide() {
  const { k, f } = PS, slot = tgtSlot();
  const sw = f => (slot[f] ? `<span class="sw" style="background:${color(slot[f])}"></span>` : "");
  if (k && f) {
    const { hits } = shared(k, f), m = M[k];
    const people = [...new Set(hits.map(p => p.nom))];
    return `<div class="d-head"><div class="d-code">${modLink(k)} × ${sw(f)}<b>${f}</b></div><h3>${esc(m.titre)}</h3></div>
      <div class="d-block"><h4>Profs en commun</h4>${people.length ? people.map(n => {
        const h = hits.filter(p => p.nom === n);
        return `<div class="prof"><b>${esc(n)}</b><div class="small muted">ici : ${ROLE[h[0].role]} · VAP : ${h.map(p => `${ROLE[p.vap_role]} ${p.vap}`).join(", ")}</div></div>`;
      }).join("") : `<p class="faint small">Aucun.</p>`}</div>
      <div class="d-block"><h4>VAP ${f}</h4>${vapBlock(f)}</div>`;
  }
  if (f) {
    const linked = ROWS.map(k => ({ k, ...shared(k, f) })).filter(x => x.lvl).sort((a, b) => b.lvl - a.lvl);
    return `<div class="d-head"><div class="d-code">${sw(f)}Filière</div><h3>${f}</h3></div>
      <div class="d-block"><h4>Modules de la VAP</h4>${vapBlock(f)}</div>
      <div class="d-block"><h4>Modules P1/P2 avec un prof de cette VAP <span class="faint">${linked.length}</span></h4>
      ${linked.length ? linked.map(x => `<div class="prof">${x.lvl === 2 ? "●" : "○"} ${modLink(x.k)} <span class="faint">${esc(M[x.k].campagne)}</span> — ${esc([...new Set(x.hits.map(p => lastName(p.nom)))].join(", "))}</div>`).join("")
        : `<p class="small">Aucun : les profs de cette VAP n'enseignent pas en P1/P2. Pour savoir ce qui prépare le mieux, écris directement aux responsables ci-dessus.</p>`}</div>`;
  }
  if (k) {
    const m = M[k], links = D.filieres.map(f => ({ f, ...shared(k, f) })).filter(x => x.lvl);
    return `<div class="d-head"><div class="d-code">${modLink(k)}<span class="badge">${esc(m.campagne)}</span></div><h3>${esc(m.titre)}</h3></div>
      <div class="d-block"><h4>Équipe du module</h4><div class="prof"><b>${esc((m.responsables || []).join(", ") || "—")}</b> <span class="faint">responsable</span></div>
      ${m.equipe?.length ? `<div class="prof small muted">${esc(m.equipe.join(", "))}</div>` : ""}</div>
      <div class="d-block"><h4>Filières où on les retrouve en VAP</h4>${links.length ? links.map(x => `<div class="prof">${x.lvl === 2 ? "●" : "○"} ${sw(x.f)}<b>${x.f}</b> <span class="faint">${esc([...new Set(x.hits.map(p => `${lastName(p.nom)} (${p.vap})`))].join(", "))}</span></div>`).join("") : `<p class="faint small">Aucune.</p>`}</div>`;
  }
  // Vue d'ensemble : tes filières visées
  return `<div class="d-head"><h3>Tes filières visées</h3><div class="meta">Clique une case, un module ou une filière pour le détail.</div></div>` +
    (S.targets.length ? S.targets.map(t => {
      const linked = ROWS.filter(k => shared(k, t.f).lvl);
      return `<div class="d-block"><h4><span>${sw(t.f)}${t.f}</span><span class="faint">${linked.length} module${linked.length > 1 ? "s" : ""} lié${linked.length > 1 ? "s" : ""}</span></h4>
        ${linked.length ? `<div class="prof">${linked.map(k => modLink(k)).join(" · ")}</div>` : `<div class="prof small">Aucun prof commun.</div>`}
        <div class="prof small muted">VAP tenue par ${esc([...new Set(D.vap[t.f].flatMap(v => v.responsables))].join(", "))}</div></div>`;
    }).join("") : `<p class="faint">Choisis des filières visées dans Classement.</p>`);
}
$("#profs-mx").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const n = { k: b.dataset.k, f: b.dataset.f };
  PS = PS.k === n.k && PS.f === n.f ? {} : n; renderProfs();
});

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
    ? "% par colonne · ex. 75 % des MAIA avaient pris NET4201 · promo 2025-26 (affectations, pas vœux)"
    : "% par ligne · ex. 78 % de ceux qui ont pris MAT4251 sont allés en MSA · promo 2025-26";
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
  const { k, f } = PC, slot = tgtSlot();
  const sw = f => (slot[f] ? `<span class="sw" style="background:${color(slot[f])}"></span>` : "");
  const profile = f => CAMPS.map(c => {
    const top = ROWS.filter(k => M[k].campagne === c && taken(M[k], f) > 0).sort((a, b) => taken(M[b], f) - taken(M[a], f)).slice(0, 3);
    return `<div class="prow"><span class="badge">${c}</span>${top.length ? top.map(k => `${modLink(k)} <b>${Math.round(taken(M[k], f) * 100)} %</b>${M[k].code === "MAT4101" ? "*" : ""}`).join(" · ") : `<span class="faint">rien de marquant</span>`}</div>`;
  }).join("") + `<p class="small faint">* MAT4101 était au DA4101 en 2025-26 (pris par 74 % de la promo) : chiffre peu comparable.</p>`;
  if (k && f) {
    const m = M[k], st = m.stats;
    if (!st || !st.n) return `<div class="d-head"><div class="d-code">${modLink(k)} × ${f}</div><h3>${esc(m.titre)}</h3></div><p class="faint">Module nouveau : aucune donnée 2025-26.</p>`;
    const { lvl } = shared(k, f);
    return `<div class="d-head"><div class="d-code">${modLink(k)} × ${sw(f)}<b>${f}</b></div><h3>${esc(m.titre)}</h3><div class="meta">${esc(st.source)}</div></div>
      <div class="d-block big">
        <p><b>${st.vers[f]} sur ${st.base[f]}</b> étudiants ${f} l'avaient pris <span class="faint">(${pct(st.base[f] ? st.vers[f] / st.base[f] : 0)})</span></p>
        <p><b>${st.vers[f]} sur ${st.n}</b> de ceux qui l'ont pris sont allés en ${f} <span class="faint">(${pct(st.vers[f] / st.n)})</span></p>
        <p class="small muted">${lvl ? `${lvl === 2 ? "●" : "○"} Un prof du module enseigne aussi dans la VAP ${f}.` : `Aucun prof commun avec la VAP ${f}.`}</p>
      </div>
      <div class="d-block"><h4>Parcours type ${f}</h4>${profile(f)}</div>`;
  }
  if (f) {
    return `<div class="d-head"><div class="d-code">${sw(f)}Filière · ${D.modules.NET4201.stats.base[f]} étudiants passés par P1/P2 en 2025-26</div><h3>Parcours type ${f}</h3></div>
      <div class="d-block"><h4>Les 3 modules les plus pris par campagne</h4>${profile(f)}</div>
      <div class="d-block"><button class="ghost" data-preset="${f}">Charger ce parcours dans Classement</button>
      <p class="small faint">Une tendance sur une promo, pas une règle : corrélation ≠ cause.</p></div>`;
  }
  if (k) {
    const m = M[k], st = m.stats;
    if (!st || !st.n) return `<div class="d-head"><div class="d-code">${modLink(k)}</div><h3>${esc(m.titre)}</h3></div><p class="faint">Module nouveau : aucune donnée 2025-26.</p>`;
    const top = D.filieres.filter(f => st.vers[f]).sort((a, b) => st.vers[b] - st.vers[a]);
    return `<div class="d-head"><div class="d-code">${modLink(k)} <span class="badge">${esc(m.campagne)}</span></div><h3>${esc(m.titre)}</h3><div class="meta">${esc(st.source)} · n = ${st.n}</div></div>
      <div class="d-block"><h4>Leur filière ensuite</h4><div class="hbars">${top.map(f => `<span class="f ${slot[f] ? "tgt" : ""}">${sw(f)}${f}</span><span><span class="bar" style="width:${Math.max(1, st.vers[f] / st.n * 100)}%;${slot[f] ? `background:${color(slot[f])}` : ""}"></span></span><span class="v">${st.vers[f]} · ${pct(st.vers[f] / st.n)}</span>`).join("")}</div></div>`;
  }
  return `<div class="d-head"><h3>Comment lire</h3></div>
    <div class="d-block small">
      <p><b>« Ce qu'ils avaient pris »</b> : chaque colonne est une filière de fin d'année. La case dit quelle part de ses étudiants avait pris le module. C'est le « parcours type » de la filière.</p>
      <p><b>« Où sont allés »</b> : chaque ligne est un module. La case dit où sont partis ceux qui l'avaient pris.</p>
      <p>Clique une <b>filière</b> pour son parcours type, une <b>case</b> pour le détail.</p>
      <p class="faint">Promo 2025-26 seulement, petits effectifs (MAIA 12, HTI 20) : une tendance, pas une règle. MAT4101 : chiffres du DA4101 2025-26.</p>
    </div>
    ${S.targets.map(t => `<div class="d-block"><h4><span>${sw(t.f)}Parcours type ${t.f}</span></h4>${profile(t.f)}</div>`).join("")}`;
}
$("#pc-mx").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const n = { k: b.dataset.k, f: b.dataset.f };
  if (PC.k === n.k && PC.f === n.f) { PC.k = PC.f = undefined; } else { PC.k = n.k; PC.f = n.f; }
  renderParcours();
});
$("#pc-mode").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (b) { PC.mode = b.dataset.mode; renderParcours(); } });
$("#pc-side").addEventListener("click", e => {
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
    return `<button class="chip" data-k="${k}" aria-pressed="${on}" ${!on && CMP.keys.length >= 4 ? "disabled" : ""}>${esc(codeOf(k))}${M[k].impose_par ? " (imposé)" : ""}</button>`;
  }).join("");
  const keys = CMP.keys, grid = $("#cmp-grid");
  grid.style.setProperty("--n", Math.max(1, keys.length));
  if (!keys.length) { grid.innerHTML = `<div class="lab"></div><div class="faint">Choisis jusqu'à 4 modules ci-dessus.</div>`; return; }
  const { st } = analyze(), slot = tgtSlot();
  const rank = k => { if (M[k].impose_par) return `imposé si tu obtiens ${M[k].impose_par}`; const r = rankIn(M[k].campagne, codeOf(k)); return r ? `ton vœu n° ${r}` : "sous JOKER (non voulu)"; };
  const rows = [
    ["", k => `<div class="cmp-h">${modLink(k)} <span class="faint small">${esc(rank(k))}</span><div class="cmp-t">${esc(M[k].titre)}</div></div>`, "hdr"],
    ["Règle", k => esc(ruleText(M[k]) || "—") + (st[k] ? `<div class="rule ${st[k].lvl}">${st[k].lvl === "bad" ? "✕" : "!"} ${esc(st[k].msg)}</div>` : "")],
    ["Places", k => { const m = M[k]; return `${m.places}${m.stats && m.stats.n >= m.places && m.code !== "MAT4101" ? ` <span class="tag full">plein en 25-26 (${m.stats.n})</span>` : ""}`; }],
    ["Responsable", k => esc((M[k].responsables || []).join(", ") || "—")],
    ["Tes filières", k => S.targets.map(t => { const v = taken(M[k], t.f); return `<div><span class="sw" style="background:${color(t.slot)}"></span>${t.f} <b>${v === null ? "–" : pct(v)}</b> <span class="faint">des ${t.f} l'avaient pris</span></div>`; }).join("") || "—"],
    ["Ils sont allés en", k => { const s = M[k].stats; if (!s || !s.n) return `<span class="faint">aucune donnée</span>`; return D.filieres.filter(f => s.vers[f]).sort((a, b) => s.vers[b] - s.vers[a]).slice(0, 3).map(f => `${slot[f] ? `<b>${f}</b>` : f} ${pct(s.vers[f] / s.n)}`).join(" · ") + ` <span class="faint">(n=${s.n})</span>`; }],
    ["Profs de tes VAP", k => S.targets.map(t => { const n = [...new Set(shared(k, t.f).hits.map(p => lastName(p.nom)))]; return `<div><span class="sw" style="background:${color(t.slot)}"></span>${n.length ? `✓ ${esc(n.join(", "))}` : `<span class="faint">—</span>`}</div>`; }).join("") || "—"],
    ["Charge", k => (M[k].avis.charge ? `${dots(M[k].avis.charge)} ${CHARGE[M[k].avis.charge]}` : `<span class="faint">inconnue</span>`)],
    ["Avis", k => { const a = M[k].avis; return `<span class="badge ${a.fraicheur}">${{ ok: "à jour", partiel: "en partie dépassé", obsolete: "plus valable", aucun: "aucun avis" }[a.fraicheur]}</span> ${esc(a.resume)}${a.alerte ? `<div class="avis-alert">! ${esc(a.alerte)}</div>` : ""}`; }],
    ["Volume", k => { const m = M[k]; if (m.code === "DIV4201") return "pas de cours"; if (m.seances_estimees) return `<span class="faint">pas encore planifié</span>`; const s = m.seances.filter(x => !x.eval); return `${s.length} séances · ${Math.round(s.reduce((t, x) => t + mins(x.fin) - mins(x.debut), 0) / 60)} h · ${fmtDM(s[0].date)} → ${fmtDM(s[s.length - 1].date)}`; }],
    ["Évaluations", k => { const m = M[k], ev = m.seances.filter(x => x.eval); if (ev.length) return ev.map(x => `<b>${fmtD(x.date)}</b> <span class="faint">${esc(x.label)}</span>`).join("<br>"); return m.evals_2526.length ? `<span class="faint">en 2025-26 : ${m.evals_2526.map(e => fmtDM(e.date)).join(", ")}</span>` : `<span class="faint">aucune dans l'agenda</span>`; }],
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
$("#targets").addEventListener("click", () => { const v = visible(); if (v) PAGES[v](); });
for (const id of ["#profs-mx", "#pc-mx"]) new ResizeObserver(() => { const v = visible(); if (v === "profs" || v === "parcours") PAGES[v](); }).observe($(id));
