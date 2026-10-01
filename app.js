const ADMIN_PASSWORD_HASH = "3859a8c83fa4032599b6ef223dbe190dc7c31fce8b7200c78a8746d37f17e359";
const AUTH_SESSION_KEY = "presence-admin-unlocked-v1";
const STORAGE_KEY = "gestion-presences-web-v1";

const SEED_PEOPLE = [
  ["ZAYA", "BAGGEN"], ["Jean", "Collot"], ["Loïs", "Pierrard"], ["Vital", "Pierrard"],
  ["noah", "Poncelet"], ["Eva", "Urbaing"], ["Cyrille", "Vindevogel"], ["Edouard", "Arnould"],
  ["Serena", "BAR"], ["Eulalie", "BELCHE"], ["Jason", "Bernet"], ["Nello", "Cacciapaglia"],
  ["Hanaé", "CAMBRON"], ["Alexandre", "CHAUVEAU"], ["Tristan", "CHAUVEAU"], ["Martin", "CHRISTIAENS"],
  ["Jules", "Cornet"], ["Esteban", "COSTA"], ["Lacinné", "DEJARDIN DEBUCQUOIS"], ["Margaux", "Deom"],
  ["Ninon", "DEOM"], ["Jules", "Déome"], ["Manon", "DESSAUCY"], ["Emile", "Devrin"],
  ["Marius", "Devrin"], ["Adèle", "DOMBRET"], ["Heloïse", "Dombret"], ["clarisse", "gatelier"],
  ["Clotilde", "GATELIER"], ["Antonin", "GEORGES"], ["Elodie", "GOETHALS"], ["Louis", "GRAFF"],
  ["Charlotte", "GRUSELIN"], ["Aymar", "Habarugira"], ["Loeva", "HABARUGIRA"], ["Alice", "HENRY"],
  ["Hugo", "HENRY"], ["Timéo", "HENRY"], ["Lilian", "Hoolans"], ["Romain", "Hottois"],
  ["Léa", "Pierret"], ["Lucie", "Lefevre"], ["Marion", "Legrand"], ["Lilian", "Mernier"],
  ["Baptiste", "PERRON"], ["Margot", "Piette"], ["Maël", "PIROT"], ["Noam", "Pirot"],
  ["Sam", "Raty"], ["Maxence", "Rekinger"], ["Adèle", "Rosillon"], ["Eline", "Rowie"],
  ["Baptiste", "Sabre"], ["Lorenzo", "Salvaggio"], ["Paolo", "Salvaggio"], ["Adèle", "Servais"],
  ["Léo", "TASIAUX"], ["Maelys", "Techer"], ["Zoa", "THENY"], ["Soazig", "Trinval"],
  ["Zélie", "Trinval"], ["Lise", "Urbaing"], ["Léon", "Van Den Abbeel"], ["Diego", "Weidner"]
];

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

let database = loadDatabase();
let currentView = "attendance";
let selectedDate = localIsoDate(new Date());
let selectedAcademicYear = academicYearStart(selectedDate);
let failedLoginAttempts = 0;
let loginLockedUntil = 0;
let toastTimer;

function defaultDatabase() {
  return {
    version: 1,
    members: SEED_PEOPLE.map(([firstName, lastName], index) => ({
      id: `member-${index + 1}`,
      firstName,
      lastName,
      group: "",
      active: true,
      createdAt: "2026-09-23T00:00:00.000Z"
    })),
    attendance: {}
  };
}

function loadDatabase() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidDatabase(parsed)) return parsed;
  } catch {}
  const initial = defaultDatabase();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function isValidDatabase(value) {
  return Boolean(
    value &&
    Array.isArray(value.members) &&
    value.members.every((member) => member && typeof member.id === "string" && typeof member.firstName === "string" && typeof member.lastName === "string") &&
    value.attendance &&
    typeof value.attendance === "object" &&
    !Array.isArray(value.attendance)
  );
}

function saveDatabase(message = "Modifications enregistrées") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  showToast(message);
}

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${dateString}T12:00:00`));
}

function academicYearStart(dateString) {
  const [year, month] = dateString.split("-").map(Number);
  return month >= 8 ? year : year - 1;
}

function academicYearLabel(startYear) {
  return `${startYear}–${startYear + 1}`;
}

function belongsToAcademicYear(dateString, startYear) {
  const start = `${startYear}-08-01`;
  const end = `${startYear + 1}-08-01`;
  return dateString >= start && dateString < end;
}

function sortMembers(members) {
  return [...members].sort((a, b) => {
    const lastName = a.lastName.localeCompare(b.lastName, "fr", { sensitivity: "base" });
    return lastName || a.firstName.localeCompare(b.firstName, "fr", { sensitivity: "base" });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function showApplication() {
  $("#login-view").hidden = true;
  $("#app").hidden = false;
  $("#meeting-date").value = selectedDate;
  setView(location.hash === "#suivi-annuel" ? "annual" : location.hash === "#membres" ? "members" : "attendance");
}

function showLogin() {
  $("#app").hidden = true;
  $("#login-view").hidden = false;
  $("#admin-password").value = "";
  $("#admin-password").focus();
}

function setView(view) {
  currentView = view;
  $$(".view").forEach((element) => {
    const active = element.id === `${view}-view`;
    element.hidden = !active;
    element.classList.toggle("active", active);
  });
  $$('[data-view]').forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const hash = view === "annual" ? "#suivi-annuel" : view === "members" ? "#membres" : "#presences";
  history.replaceState(null, "", hash);
  if (view === "attendance") renderAttendance();
  if (view === "annual") renderAnnual();
  if (view === "members") renderMembers();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function recordsForDate(date = selectedDate) {
  return database.attendance[date] || {};
}

function membersForDate(date = selectedDate) {
  const recorded = new Set(Object.keys(recordsForDate(date)));
  return sortMembers(database.members.filter((member) => member.active || recorded.has(member.id)));
}

function setAttendance(memberId, status) {
  const day = { ...recordsForDate(selectedDate) };
  if (status) day[memberId] = status;
  else delete day[memberId];

  if (Object.keys(day).length) database.attendance[selectedDate] = day;
  else delete database.attendance[selectedDate];

  saveDatabase();
  renderAttendance();
}

function setBulkAttendance(memberIds, status) {
  const day = { ...recordsForDate(selectedDate) };
  memberIds.forEach((memberId) => {
    if (status) day[memberId] = status;
    else delete day[memberId];
  });
  if (Object.keys(day).length) database.attendance[selectedDate] = day;
  else delete database.attendance[selectedDate];
  saveDatabase();
  renderAttendance();
}

function renderAttendance() {
  const allMembers = membersForDate();
  const query = $("#attendance-search").value.trim().toLocaleLowerCase("fr");
  const visibleMembers = allMembers.filter((member) => `${member.firstName} ${member.lastName} ${member.group}`.toLocaleLowerCase("fr").includes(query));
  const day = recordsForDate();
  const present = allMembers.filter((member) => day[member.id] === "present").length;
  const absent = allMembers.filter((member) => day[member.id] === "absent").length;
  const unknown = allMembers.length - present - absent;

  $("#attendance-summary").innerHTML = `
    <div class="summary-card present"><span>Présents</span><strong>${present}</strong></div>
    <div class="summary-card absent"><span>Absents</span><strong>${absent}</strong></div>
    <div class="summary-card unknown"><span>À saisir</span><strong>${unknown}</strong></div>`;
  $("#attendance-member-count").textContent = `${visibleMembers.length} affiché${visibleMembers.length > 1 ? "s" : ""}`;
  $("#clear-meeting-button").disabled = present + absent === 0;

  $("#attendance-list").innerHTML = visibleMembers.length
    ? visibleMembers.map((member) => {
      const status = day[member.id] || "unknown";
      const subtitle = member.active ? (member.group || "Sans groupe") : "Archivé";
      return `<div class="attendance-row">
        <div class="member-identity"><strong>${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}</strong><span>${escapeHtml(subtitle)}</span></div>
        <div class="status-buttons" role="group" aria-label="Présence de ${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}">
          <button class="status-button present ${status === "present" ? "selected" : ""}" type="button" data-member-id="${member.id}" data-status="present" aria-label="Présent" aria-pressed="${status === "present"}">✓</button>
          <button class="status-button absent ${status === "absent" ? "selected" : ""}" type="button" data-member-id="${member.id}" data-status="absent" aria-label="Absent" aria-pressed="${status === "absent"}">×</button>
          <button class="status-button unknown ${status === "unknown" ? "selected" : ""}" type="button" data-member-id="${member.id}" data-status="unknown" aria-label="Non renseigné" aria-pressed="${status === "unknown"}">?</button>
        </div>
      </div>`;
    }).join("")
    : `<div class="empty-state"><div><strong>Aucun membre trouvé</strong><p>Modifiez la recherche pour afficher les membres.</p></div></div>`;
}

function academicYearOptions() {
  const years = new Set(Object.keys(database.attendance).map(academicYearStart));
  years.add(academicYearStart(localIsoDate(new Date())));
  return [...years].sort((a, b) => b - a);
}

function statisticsForYear(startYear) {
  const dates = Object.keys(database.attendance)
    .filter((date) => belongsToAcademicYear(date, startYear) && Object.keys(database.attendance[date] || {}).length)
    .sort()
    .reverse();
  const rows = database.members.map((member) => {
    let present = 0;
    let absent = 0;
    dates.forEach((date) => {
      if (database.attendance[date]?.[member.id] === "present") present += 1;
      if (database.attendance[date]?.[member.id] === "absent") absent += 1;
    });
    return { member, present, absent, unknown: Math.max(0, dates.length - present - absent), total: dates.length, rate: dates.length ? present / dates.length : 0 };
  });
  return { dates, rows };
}

function renderAnnual() {
  const years = academicYearOptions();
  if (!years.includes(Number(selectedAcademicYear))) selectedAcademicYear = years[0];
  $("#academic-year").innerHTML = years.map((year) => `<option value="${year}" ${Number(selectedAcademicYear) === year ? "selected" : ""}>${academicYearLabel(year)}</option>`).join("");

  const { dates, rows } = statisticsForYear(Number(selectedAcademicYear));
  if (!dates.length) {
    $("#annual-content").innerHTML = `<div class="empty-state"><div><strong>Aucune séance pour cette année</strong><p>Les statistiques apparaîtront après la première prise de présence.</p></div></div>`;
    return;
  }

  const activeRows = rows.filter((row) => row.member.active);
  const average = activeRows.length ? activeRows.reduce((sum, row) => sum + row.rate, 0) / activeRows.length : 0;
  const participants = dates.length ? activeRows.reduce((sum, row) => sum + row.present, 0) / dates.length : 0;

  $("#annual-content").innerHTML = `<div class="annual-layout">
    <div class="summary-grid">
      <div class="summary-card"><span>Séances</span><strong>${dates.length}</strong></div>
      <div class="summary-card"><span>Présence moyenne</span><strong>${Math.round(average * 100)} %</strong></div>
      <div class="summary-card"><span>Participants / séance</span><strong>${participants.toFixed(1).replace(".", ",")}</strong></div>
    </div>
    <section class="annual-table">
      <div class="panel-heading"><div><h2>Détail des membres</h2><span>${activeRows.length} actifs</span></div><label class="search-field"><span class="sr-only">Rechercher</span><input id="annual-search" type="search" placeholder="Rechercher un membre" /></label></div>
      <div class="table-scroll"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Présences</th><th>Absences</th><th>Non saisis</th><th>Taux</th></tr></thead><tbody id="annual-table-body"></tbody></table></div>
    </section>
  </div>`;

  const updateRows = () => {
    const query = $("#annual-search").value.trim().toLocaleLowerCase("fr");
    const filtered = sortMembers(rows.map((row) => row.member))
      .map((member) => rows.find((row) => row.member.id === member.id))
      .filter((row) => `${row.member.firstName} ${row.member.lastName}`.toLocaleLowerCase("fr").includes(query));
    $("#annual-table-body").innerHTML = filtered.map((row) => `<tr>
      <td><strong>${escapeHtml(row.member.lastName)}</strong>${row.member.active ? "" : " <small>Archivé</small>"}</td>
      <td>${escapeHtml(row.member.firstName)}</td><td>${row.present}</td><td>${row.absent}</td><td>${row.unknown}</td>
      <td><strong class="${row.rate < 0.6 ? "rate-low" : "rate-good"}">${Math.round(row.rate * 100)} %</strong></td>
    </tr>`).join("");
  };
  $("#annual-search").addEventListener("input", updateRows);
  updateRows();
}

function memberHasHistory(memberId) {
  return Object.values(database.attendance).some((day) => Object.hasOwn(day, memberId));
}

function initials(member) {
  return `${member.firstName[0] || ""}${member.lastName[0] || ""}`.toLocaleUpperCase("fr");
}

function memberAdminRow(member) {
  const history = memberHasHistory(member.id);
  const primaryAction = member.active
    ? `<button class="row-action archive" type="button" data-member-action="archive" data-member-id="${member.id}">Archiver</button>`
    : `<button class="row-action restore" type="button" data-member-action="restore" data-member-id="${member.id}">Réactiver</button>`;
  const deleteAction = history ? "" : `<button class="row-action delete" type="button" data-member-action="delete" data-member-id="${member.id}">Supprimer</button>`;
  return `<div class="member-admin-row ${member.active ? "" : "archived"}">
    <div class="avatar">${escapeHtml(initials(member))}</div>
    <div class="member-identity"><strong>${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}</strong><span>${escapeHtml(member.group || "Sans groupe")}</span></div>
    <div class="row-actions"><button class="row-action" type="button" data-member-action="edit" data-member-id="${member.id}">Modifier</button>${primaryAction}${deleteAction}</div>
  </div>`;
}

function renderMembers() {
  const query = $("#members-search").value.trim().toLocaleLowerCase("fr");
  const filtered = sortMembers(database.members).filter((member) => `${member.firstName} ${member.lastName} ${member.group}`.toLocaleLowerCase("fr").includes(query));
  const active = filtered.filter((member) => member.active);
  const archived = filtered.filter((member) => !member.active);
  $("#members-content").innerHTML = `
    <section class="members-card members-section"><div class="members-section-heading"><h2>Membres actifs</h2><span>${active.length}</span></div>${active.length ? active.map(memberAdminRow).join("") : `<div class="empty-state"><div><strong>Aucun membre actif</strong></div></div>`}</section>
    ${archived.length ? `<section class="members-card members-section"><div class="members-section-heading"><h2>Membres archivés</h2><span>${archived.length}</span></div>${archived.map(memberAdminRow).join("")}</section>` : ""}`;
}

function openMemberDialog(member = null) {
  $("#member-dialog-title").textContent = member ? "Modifier le membre" : "Ajouter un membre";
  $("#member-id").value = member?.id || "";
  $("#member-first-name").value = member?.firstName || "";
  $("#member-last-name").value = member?.lastName || "";
  $("#member-group").value = member?.group || "";
  $("#member-dialog").showModal();
  $("#member-first-name").focus();
}

function exportBackup() {
  const payload = { exportedAt: new Date().toISOString(), application: "Gestion des présences", database };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `presences-sauvegarde-${localIsoDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Sauvegarde téléchargée");
}

async function importBackup(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const imported = parsed.database || parsed;
    if (!isValidDatabase(imported)) throw new Error("format");
    if (!confirm("Remplacer les données actuelles par cette sauvegarde ?")) return;
    database = imported;
    saveDatabase("Sauvegarde importée");
    renderMembers();
  } catch {
    alert("Ce fichier n’est pas une sauvegarde valide de l’application.");
  } finally {
    $("#import-input").value = "";
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const now = Date.now();
  if (now < loginLockedUntil) {
    $("#login-error").textContent = `Trop de tentatives. Réessayez dans ${Math.ceil((loginLockedUntil - now) / 1000)} secondes.`;
    return;
  }

  const password = $("#admin-password").value;
  const valid = (await sha256(password)) === ADMIN_PASSWORD_HASH;
  $("#admin-password").value = "";
  if (!valid) {
    failedLoginAttempts += 1;
    if (failedLoginAttempts >= 5) {
      failedLoginAttempts = 0;
      loginLockedUntil = Date.now() + 30_000;
      $("#login-error").textContent = "Trop de tentatives. Accès bloqué pendant 30 secondes.";
    } else {
      $("#login-error").textContent = "Mot de passe incorrect.";
    }
    return;
  }

  failedLoginAttempts = 0;
  $("#login-error").textContent = "";
  sessionStorage.setItem(AUTH_SESSION_KEY, "1");
  showApplication();
});

$("#toggle-password").addEventListener("click", () => {
  const input = $("#admin-password");
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  $("#toggle-password").textContent = visible ? "Afficher" : "Masquer";
  $("#toggle-password").setAttribute("aria-label", visible ? "Afficher le mot de passe" : "Masquer le mot de passe");
});

$("#logout-button").addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  showLogin();
});

$$('[data-view]').forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$$('[data-view-link]').forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); setView(link.dataset.viewLink); }));

$("#meeting-date").addEventListener("change", (event) => {
  selectedDate = event.target.value || localIsoDate(new Date());
  renderAttendance();
});
$("#attendance-search").addEventListener("input", renderAttendance);
$("#attendance-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-member-id][data-status]");
  if (!button) return;
  setAttendance(button.dataset.memberId, button.dataset.status === "unknown" ? null : button.dataset.status);
});
$("#all-present-button").addEventListener("click", () => setBulkAttendance(membersForDate().map((member) => member.id), "present"));
$("#unknown-absent-button").addEventListener("click", () => {
  const day = recordsForDate();
  setBulkAttendance(membersForDate().filter((member) => !day[member.id]).map((member) => member.id), "absent");
});
$("#clear-meeting-button").addEventListener("click", () => {
  if (!confirm(`Effacer toutes les présences du ${formatDate(selectedDate)} ?`)) return;
  delete database.attendance[selectedDate];
  saveDatabase("Séance réinitialisée");
  renderAttendance();
});

$("#academic-year").addEventListener("change", (event) => {
  selectedAcademicYear = Number(event.target.value);
  renderAnnual();
});

$("#members-search").addEventListener("input", renderMembers);
$("#add-member-button").addEventListener("click", () => openMemberDialog());
$("#members-content").addEventListener("click", (event) => {
  const button = event.target.closest("[data-member-action]");
  if (!button) return;
  const member = database.members.find((item) => item.id === button.dataset.memberId);
  if (!member) return;
  if (button.dataset.memberAction === "edit") openMemberDialog(member);
  if (button.dataset.memberAction === "archive") { member.active = false; saveDatabase("Membre archivé"); renderMembers(); }
  if (button.dataset.memberAction === "restore") { member.active = true; saveDatabase("Membre réactivé"); renderMembers(); }
  if (button.dataset.memberAction === "delete" && confirm(`Supprimer définitivement ${member.firstName} ${member.lastName} ?`)) {
    database.members = database.members.filter((item) => item.id !== member.id);
    saveDatabase("Membre supprimé");
    renderMembers();
  }
});

$("#member-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#member-id").value;
  const firstName = $("#member-first-name").value.trim();
  const lastName = $("#member-last-name").value.trim();
  const group = $("#member-group").value.trim();
  if (!firstName || !lastName) return;
  if (id) {
    const member = database.members.find((item) => item.id === id);
    if (member) Object.assign(member, { firstName, lastName, group });
  } else {
    database.members.push({ id: `member-${crypto.randomUUID()}`, firstName, lastName, group, active: true, createdAt: new Date().toISOString() });
  }
  saveDatabase(id ? "Membre modifié" : "Membre ajouté");
  $("#member-dialog").close();
  renderMembers();
});
$("#close-member-dialog").addEventListener("click", () => $("#member-dialog").close());
$("#cancel-member-button").addEventListener("click", () => $("#member-dialog").close());

$("#export-button").addEventListener("click", exportBackup);
$("#members-export-button").addEventListener("click", exportBackup);
$("#import-button").addEventListener("click", () => $("#import-input").click());
$("#import-input").addEventListener("change", (event) => event.target.files[0] && importBackup(event.target.files[0]));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

if (sessionStorage.getItem(AUTH_SESSION_KEY) === "1") showApplication();
else showLogin();
