// Simple static HTML/JS app equivalent of the Streamlit version
// Stores settings in localStorage and uses fetch to call APIs.

// Local proxy endpoint used ONLY as a fallback for username search
// This avoids re-adding full proxy settings and keeps other calls direct.
const SEARCH_PROXY_URL = "http://127.0.0.1:8787/proxy";

const DEFAULT_SETTINGS = {
  api_url: "https://backofficewebadmin.betconstruct.com/api/tr/Client/GetClientById?id={}",
  kpi_url: "https://backofficewebadmin.betconstruct.com/api/tr/Client/GetClientKpi?id={}",
  bonus_api_url: "https://backofficewebadmin.betconstruct.com/api/tr/Report/GetClientBonusReport",
  client_bonus_url: "https://backofficewebadmin.betconstruct.com/api/tr/Client/GetClientBonuses",
  search_clients_url: "https://backofficewebadmin.betconstruct.com/api/tr/Client/GetClients",
  kpi_enabled: true,
  bonus_enabled: true,
  auth_only: true,
  auth_key: "",
  referer: "https://backoffice.betconstruct.com/",
  origin: "https://backoffice.betconstruct.com",
  authenticated: true,
};

// -------- Settings persistence --------
function loadSettings() {
  const raw = localStorage.getItem("kimreplit_settings");
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem("kimreplit_settings", JSON.stringify(settings));
}

let SETTINGS = loadSettings();

// -------- UI helpers --------
const alertsEl = document.getElementById("alerts");

function showAlert(type, message, timeout = 5000) {
  const div = document.createElement("div");
  div.className = `alert ${type}`; // success | error | info | warn
  div.textContent = message;
  alertsEl.appendChild(div);
  if (timeout) {
    setTimeout(() => div.remove(), timeout);
  }
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `tab-${tabName}`);
  });
}

function formatMoney(amount, currency = "TRY") {
  const n = Number(amount || 0);
  try {
    return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` ${currency}`;
  } catch {
    return `${n} ${currency}`;
  }
}

function formatDate(value) {
  if (!value) return "Bilinmiyor";
  try {
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return String(value);
    return dt.toLocaleString("tr-TR");
  } catch {
    return String(value);
  }
}

function getHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    // These headers will be ignored by browsers for cross-site requests.
    // When proxy is enabled, they are sent as X-* and injected server-side.
    Authentication: SETTINGS.auth_key || "",
    Referer: SETTINGS.referer || "",
    Origin: SETTINGS.origin || "",
  };
}

// -------- Tab buttons --------

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// -------- Settings form populate & actions --------
(function initSettingsForm() {
  const f = {
    api_url: document.getElementById("set-api-url"),
    kpi_url: document.getElementById("set-kpi-url"),
    bonus_api_url: document.getElementById("set-bonus-api-url"),
    client_bonus_url: document.getElementById("set-client-bonus-url"),
    search_clients_url: document.getElementById("set-search-clients-url"),
    auth_key: document.getElementById("set-auth-key"),
    referer: document.getElementById("set-referer"),
    origin: document.getElementById("set-origin"),
    kpi_enabled: document.getElementById("set-kpi-enabled"),
    bonus_enabled: document.getElementById("set-bonus-enabled"),
  };

  function fill() {
    f.api_url.value = SETTINGS.api_url || "";
    f.kpi_url.value = SETTINGS.kpi_url || "";
    f.bonus_api_url.value = SETTINGS.bonus_api_url || "";
    f.client_bonus_url.value = SETTINGS.client_bonus_url || "";
    f.search_clients_url.value = SETTINGS.search_clients_url || "";
    f.auth_key.value = SETTINGS.auth_key || "";
    f.referer.value = SETTINGS.referer || "";
    f.origin.value = SETTINGS.origin || "";
    f.kpi_enabled.checked = !!SETTINGS.kpi_enabled;
    f.bonus_enabled.checked = !!SETTINGS.bonus_enabled;
  }

  fill();

  document.getElementById("form-settings").addEventListener("submit", (e) => {
    e.preventDefault();
    SETTINGS = {
      api_url: f.api_url.value.trim(),
      kpi_url: f.kpi_url.value.trim(),
      bonus_api_url: f.bonus_api_url.value.trim(),
      client_bonus_url: f.client_bonus_url.value.trim(),
      search_clients_url: f.search_clients_url.value.trim(),
      auth_key: f.auth_key.value.trim(),
      referer: f.referer.value.trim(),
      origin: f.origin.value.trim(),
      kpi_enabled: f.kpi_enabled.checked,
      bonus_enabled: f.bonus_enabled.checked,
      auth_only: true,
      authenticated: true,
    };
    saveSettings(SETTINGS);
    showAlert("success", "Ayarlar kaydedildi.");
  });

  document.getElementById("btn-test-connection").addEventListener("click", async () => {
    const testId = "1";
    try {
      const apiUrl = SETTINGS.api_url.replace("{}", encodeURIComponent(testId));
      try {
        await fetchJSON(apiUrl, { method: "GET", headers: getHeaders() });
        showAlert("success", `API Test - Status: 200`);
      } catch (e) {
        showAlert("error", `API Test - Hata: ${e.message}`);
      }
      if (SETTINGS.kpi_enabled && SETTINGS.kpi_url) {
        const kpiUrl = SETTINGS.kpi_url.replace("{}", encodeURIComponent(testId));
        try {
          await fetchJSON(kpiUrl, { method: "GET", headers: getHeaders() });
          showAlert("success", `KPI Test - Status: 200`);
        } catch (e) {
          showAlert("error", `KPI Test - Hata: ${e.message}`);
        }
      }
    } catch (err) {
      showAlert("error", `Bağlantı hatası: ${err}`);
    }
  });

  document.getElementById("btn-reset-settings").addEventListener("click", () => {
    SETTINGS = { ...DEFAULT_SETTINGS };
    saveSettings(SETTINGS);
    fill();
    showAlert("info", "Varsayılan ayarlara dönüldü.");
  });
})();

// -------- Rendering helpers --------

function renderUser(user) {
  // Metrics
  const metrics = document.getElementById("user-metrics");
  metrics.innerHTML = "";
  const m = [
    { label: "Kullanıcı ID", value: user.Id ?? "N/A" },
    { label: "Kullanıcı Adı", value: user.Login ?? "N/A" },
    { label: "İsim", value: `${user.FirstName ?? ""} ${user.LastName ?? ""}`.trim() || "N/A" },
    { label: "Email", value: user.Email ?? "N/A" },
    { label: "Telefon", value: user.Phone ?? "N/A" },
    { label: "Para Birimi", value: user.CurrencyId ?? "N/A" },
    { label: "Bakiye", value: formatMoney(user.Balance ?? 0, user.CurrencyId ?? "TRY") },
    { label: "Partner", value: user.PartnerName ?? "N/A" },
  ];
  m.forEach((x) => {
    const card = document.createElement("div");
    card.className = "metric";
    card.innerHTML = `<div class="metric-label">${x.label}</div><div class="metric-value">${x.value}</div>`;
    metrics.appendChild(card);
  });

  // Details table
  const details = document.getElementById("user-details");
  const important = [
    ["Id", "Kullanıcı ID"],
    ["Login", "Kullanıcı Adı"],
    ["FirstName", "Ad"],
    ["LastName", "Soyad"],
    ["Email", "Email"],
    ["Phone", "Telefon"],
    ["Address", "Adres"],
    ["City", "Şehir"],
    ["RegionId", "Bölge ID"],
    ["PartnerId", "Partner ID"],
    ["PartnerName", "Partner Adı"],
    ["BirthDate", "Doğum Tarihi"],
    ["Gender", "Cinsiyet"],
    ["Language", "Dil"],
    ["CurrencyId", "Para Birimi"],
    ["Balance", "Bakiye"],
    ["CreditLimit", "Kredi Limiti"],
    ["LoyaltyPoint", "Sadakat Puanı"],
    ["BTag", "B-Tag"],
    ["LastLoginIp", "Son Giriş IP"],
    ["RegistrationIp", "Kayıt IP"],
  ];
  const rows = important
    .map(([k, t]) => {
      let v = user[k];
      if (v === undefined || v === null || v === "") return null;
      if (["BirthDate"].includes(k)) v = formatDate(v);
      if (["Balance"].includes(k)) v = formatMoney(v, user.CurrencyId || "TRY");
      return `<tr><td>${t}</td><td>${v}</td></tr>`;
    })
    .filter(Boolean)
    .join("");
  details.innerHTML = `<table><thead><tr><th>Alan</th><th>Değer</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderKPI(kpi) {
  const metrics = document.getElementById("kpi-metrics");
  metrics.innerHTML = "";
  const m = [
    ["💰 Toplam Yatırım", formatMoney(kpi.DepositAmount || 0)],
    ["📊 Yatırım Sayısı", kpi.DepositCount || 0],
    ["💸 Toplam Çekim", formatMoney(kpi.WithdrawalAmount || 0)],
    ["🔄 Çekim Sayısı", kpi.WithdrawalCount || 0],
    ["🎯 Spor Bahis Sayısı", kpi.TotalSportBets || 0],
    ["💵 Toplam Bahis Tutarı", formatMoney(kpi.TotalSportStakes || 0)],
    ["🏆 Toplam Kazanç", formatMoney(kpi.TotalSportWinnings || 0)],
    ["📉 Kar/Zarar", formatMoney(kpi.ProfitAndLose || 0)],
  ];
  m.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "metric";
    card.innerHTML = `<div class="metric-label">${label}</div><div class="metric-value">${value}</div>`;
    metrics.appendChild(card);
  });

  const details = document.getElementById("kpi-details");
  // Turkish label mapping (aligns with original Streamlit app)
  const kpiTr = {
    Id: "Kullanıcı ID",
    ClientId: "Müşteri ID",
    TotalSportBets: "Toplam Spor Bahisleri",
    TotalUnsettledBets: "Bekleyen Bahisler",
    TotalSportStakes: "Toplam Spor Bahis Tutarı",
    TotalUnsettledStakes: "Bekleyen Bahis Tutarı",
    TotalSportWinnings: "Toplam Spor Kazançları",
    TotalCasinoStakes: "Toplam Casino Bahis Tutarı",
    TotalCasinoWinnings: "Toplam Casino Kazançları",
    SportProfitness: "Spor Karlılığı",
    CasinoProfitness: "Casino Karlılığı",
    TotalDeposit: "Toplam Yatırım (Eski)",
    TotalWithdrawal: "Toplam Çekim (Eski)",
    ProfitAndLose: "Toplam Kar/Zarar",
    GamingProfitAndLose: "Oyun Kar/Zararı",
    LastSportBetTime: "Son Spor Bahis Zamanı",
    LastSportBetTimeLocal: "Son Spor Bahis (Yerel)",
    LastCasinoBetTime: "Son Casino Bahis Zamanı",
    LastCasinoBetTimeLocal: "Son Casino Bahis (Yerel)",
    DepositAmount: "Yatırım Tutarı",
    DepositCount: "Yatırım Sayısı",
    FirstDepositTime: "İlk Yatırım Zamanı",
    FirstDepositTimeLocal: "İlk Yatırım (Yerel)",
    LastDepositTime: "Son Yatırım Zamanı",
    LastDepositTimeLocal: "Son Yatırım (Yerel)",
    WithdrawalCount: "Çekim Sayısı",
    WithdrawalAmount: "Çekim Tutarı",
    LastWithdrawalTime: "Son Çekim Zamanı",
    LastWithdrawalTimeLocal: "Son Çekim (Yerel)",
    TotalSportBonusStakes: "Toplam Spor Bonus Bahisleri",
    TotalSportBonusWinings: "Toplam Spor Bonus Kazançları",
    TotalCasinoBonusStakes: "Toplam Casino Bonus Bahisleri",
    TotalCasinoBonusWinings: "Toplam Casino Bonus Kazançları",
    IsTest: "Test Hesabı",
    IsVerified: "Doğrulanmış",
    CurrencyId: "Para Birimi",
    BTag: "B-Tag",
    LastDepositAmount: "Son Yatırım Tutarı",
    LastWithdrawalAmount: "Son Çekim Tutarı",
  };

  const entries = Object.entries(kpi).map(([k, v]) => {
    let formatted = v;
    if (
      [
        "DepositAmount",
        "WithdrawalAmount",
        "TotalSportStakes",
        "TotalSportWinnings",
        "TotalCasinoStakes",
        "TotalCasinoWinnings",
        "ProfitAndLose",
        "SportProfitness",
        "CasinoProfitness",
        "LastDepositAmount",
        "LastWithdrawalAmount",
        "TotalSportBonusStakes",
        "TotalSportBonusWinings",
        "TotalCasinoBonusStakes",
        "TotalCasinoBonusWinings",
      ].includes(k)
    ) {
      formatted = formatMoney(v);
    } else if (String(k).includes("Time") || String(k).includes("Date")) {
      formatted = formatDate(v);
    }
    const label = kpiTr[k] || k;
    return `<tr><td>${label}</td><td>${formatted}</td></tr>`;
  });
  details.innerHTML = `<table><thead><tr><th>Alan</th><th>Değer</th></tr></thead><tbody>${entries.join("")}</tbody></table>`;
}

// Bonus sorting state
let BONUS_LIST = [];
let BONUS_SORT = { key: 'date', dir: 'desc' }; // keys: name | status | amount | date

function renderClientBonuses(list) {
  const wrap = document.getElementById("client-bonuses");
  if (!list || !list.length) {
    wrap.innerHTML = `<div class="empty">Bonus bulunamadı.</div>`;
    return;
  }
  // Cache list for sorting
  BONUS_LIST = Array.isArray(list) ? list.slice() : [];

  function statusText(b) {
    const rt = typeof b.ResultType === 'number' ? b.ResultType : null;
    if (rt === 0) return 'Devam Ediyor';
    if (rt === 1) return 'Tamamlandı/Kazanıldı';
    if (rt === 2) return 'İptal/Kayıp';
    return b.Status || '-';
  }

  function amountValue(b) {
    return Number(b.PaidAmount ?? b.Amount ?? b.RealMoneyAmount ?? 0) || 0;
  }

  function dateValue(b) {
    const d = b.AcceptanceDateLocal || b.CreatedLocal || b.ModifiedLocal;
    const t = Date.parse(d || '');
    return isNaN(t) ? 0 : t;
  }

  function nameValue(b) {
    const n = b.Name || b.PartnerBonusName || '';
    return String(n).toLowerCase();
  }

  function sortList() {
    const arr = BONUS_LIST.slice();
    const { key, dir } = BONUS_SORT;
    const mul = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va, vb;
      if (key === 'name') { va = nameValue(a); vb = nameValue(b); }
      else if (key === 'status') { va = statusText(a); vb = statusText(b); }
      else if (key === 'amount') { va = amountValue(a); vb = amountValue(b); }
      else { va = dateValue(a); vb = dateValue(b); }
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return arr;
  }

  function render() {
    const sorted = sortList();
    const rows = sorted
      .map((b) => {
        const name = b.Name || b.PartnerBonusName || "-";
        const status = statusText(b);
        const amount = amountValue(b);
        const date = b.AcceptanceDateLocal || b.CreatedLocal || b.ModifiedLocal;
        return `<tr>
          <td>${name}</td>
          <td>${status}</td>
          <td>${formatMoney(amount)}</td>
          <td>${formatDate(date)}</td>
        </tr>`;
      })
      .join("");

    const dirArrow = (k) => BONUS_SORT.key === k ? (BONUS_SORT.dir === 'asc' ? ' ▲' : ' ▼') : '';

    wrap.innerHTML = `<table>
      <thead>
        <tr>
          <th data-sort="name" class="sortable">Bonus${dirArrow('name')}</th>
          <th data-sort="status" class="sortable">Durum${dirArrow('status')}</th>
          <th data-sort="amount" class="sortable">Tutar${dirArrow('amount')}</th>
          <th data-sort="date" class="sortable">Tarih${dirArrow('date')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

    // Attach click handlers for sorting
    wrap.querySelectorAll('th.sortable').forEach((th) => {
      th.onclick = () => {
        const key = th.getAttribute('data-sort');
        if (BONUS_SORT.key === key) {
          BONUS_SORT.dir = BONUS_SORT.dir === 'asc' ? 'desc' : 'asc';
        } else {
          BONUS_SORT.key = key;
          BONUS_SORT.dir = key === 'name' || key === 'status' ? 'asc' : 'desc';
        }
        render();
      };
    });
  }

  render();
}

// -------- API calls --------
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${res.status} - ${text?.slice?.(0, 200)}`);
  }
  return data;
}

async function getUserById(userId) {
  const url = SETTINGS.api_url.replace("{}", encodeURIComponent(userId));
  const data = await fetchJSON(url, { method: "GET", headers: getHeaders() });
  if (data && typeof data === "object" && data.HasError) {
    throw new Error(data.AlertMessage || "API Hatası");
  }
  return data.Data || data; // expect { Data: {...} }
}

async function getKPIs(userId) {
  const url = SETTINGS.kpi_url.replace("{}", encodeURIComponent(userId));
  const data = await fetchJSON(url, { method: "GET", headers: getHeaders() });
  if (data && typeof data === "object" && data.HasError) {
    throw new Error(data.AlertMessage || "KPI Hatası");
  }
  return data.Data || data;
}

async function getClientBonuses(userId) {
  const payload = {
    StartDateLocal: null,
    EndDateLocal: null,
    BonusType: null,
    AcceptanceType: null,
    ClientBonusId: "",
    ClientId: Number(userId),
    PartnerBonusId: "",
    PartnerExternalBonusId: "",
  };
  const data = await fetchJSON(SETTINGS.client_bonus_url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (data && typeof data === "object" && data.HasError) {
    throw new Error(data.AlertMessage || "Bonus Hatası");
  }
  return data.Data || [];
}

async function getBonusReport(userId, fromDate, toDate) {
  const payload = {
    ClientId: Number(userId),
    FromDate: `${fromDate}T00:00:00`,
    ToDate: `${toDate}T23:59:59`,
  };
  const data = await fetchJSON(SETTINGS.bonus_api_url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (data && typeof data === "object" && data.HasError) {
    throw new Error(data.AlertMessage || "Bonus Rapor Hatası");
  }
  return data.Data || [];
}

async function searchUserByUsername(username) {
  const payload = {
    Id: "",
    FirstName: "",
    LastName: "",
    PersonalId: "",
    Email: "",
    Phone: "",
    ZipCode: null,
    AMLRisk: "",
    AffilateId: null,
    AffiliatePlayerType: null,
    BTag: null,
    BetShopGroupId: "",
    BirthDate: null,
    CashDeskId: null,
    CasinoProfileId: null,
    CasinoProfitnessFrom: null,
    CasinoProfitnessTo: null,
    City: "",
    ClientCategory: null,
    CurrencyId: null,
    DocumentNumber: "",
    ExternalId: "",
    Gender: null,
    IBAN: null,
    IsEmailSubscribed: null,
    IsLocked: null,
    IsOrderedDesc: true,
    IsSMSSubscribed: null,
    IsSelfExcluded: null,
    IsStartWithSearch: false,
    IsTest: null,
    IsVerified: null,
    Login: username.trim(),
    MaxBalance: null,
    MaxCreatedLocal: null,
    MaxCreatedLocalDisable: true,
    MaxFirstDepositDateLocal: null,
    MaxLastTimeLoginDateLocal: null,
    MaxLastWrongLoginDateLocal: null,
    MaxLoyaltyPointBalance: null,
    MaxRows: 20,
    MaxVerificationDateLocal: null,
    MaxWrongLoginAttempts: null,
    MiddleName: "",
    MinBalance: null,
    MinCreatedLocal: null,
    MinCreatedLocalDisable: true,
    MinFirstDepositDateLocal: null,
    MinLastTimeLoginDateLocal: null,
    MinLastWrongLoginDateLocal: null,
    MinLoyaltyPointBalance: null,
    MinVerificationDateLocal: null,
    MinWrongLoginAttempts: null,
    MobilePhone: "",
    NickName: "",
    OrderedItem: 1,
    OwnerId: null,
    PartnerClientCategoryId: null,
    RegionId: null,
    RegistrationSource: null,
    SelectedPepStatuses: "",
    SkeepRows: 0,
    SportProfitnessFrom: null,
    SportProfitnessTo: null,
    Status: null,
    Time: "",
    TimeZone: "",
  };
  // First try direct fetch (may fail due to CORS/Auth)
  try {
    const data = await fetchJSON(SETTINGS.search_clients_url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (data && typeof data === "object" && data.HasError) {
      throw new Error(data.AlertMessage || "Arama Hatası");
    }
    const users = data?.Data?.Objects || [];
    return users;
  } catch (directErr) {
    // Fallback via lightweight local proxy if available
    try {
      const res = await fetch(SEARCH_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Target-Url": SETTINGS.search_clients_url,
          "X-Auth-Key": SETTINGS.auth_key || "",
          "X-Referer": SETTINGS.referer || "",
          "X-Origin": SETTINGS.origin || "",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) throw new Error(`${res.status} - ${text?.slice?.(0,200)}`);
      if (data && typeof data === "object" && data.HasError) {
        throw new Error(data.AlertMessage || "Arama Hatası");
      }
      const users = data?.Data?.Objects || [];
      return users;
    } catch (proxyErr) {
      // Report original error for clarity
      throw directErr;
    }
  }
}

// -------- Form handlers --------

// Search by username
const formSearch = document.getElementById("form-search");
const searchResult = document.getElementById("search-result");
formSearch.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("input-username").value.trim();
  if (!username) return;
  searchResult.classList.add("hidden");
  searchResult.innerHTML = "";
  try {
    const users = await searchUserByUsername(username);
    if (!users.length) {
      showAlert("warn", `\"${username}\" kullanıcı adı bulunamadı!`);
      return;
    }
    const top = users[0];
    // Show brief info and auto-load the found user
    searchResult.classList.remove("hidden");
    const totalFound = users.length;
    searchResult.innerHTML = `
      <div class="info-line">
        <div><strong>Kullanıcı ID:</strong> ${top.Id}</div>
        <div><strong>Login:</strong> ${top.Login}</div>
        <div><strong>İsim:</strong> ${(top.FirstName || "") + " " + (top.LastName || "")}</div>
        <div><strong>Email:</strong> ${top.Email || "-"}</div>
        <div><strong>Toplam Bulunan:</strong> ${totalFound}</div>
      </div>`;

    // Auto-populate and load without extra click
    document.getElementById("input-userid").value = top.Id;
    await handleFetchUser(top.Id);
    switchTab("user");
  } catch (err) {
    showAlert("error", `Kullanıcı arama hatası: ${err.message || err}`);
  }
});

async function handleFetchUser(userId) {
  try {
    const user = await getUserById(userId);
    renderUser(user);
    showAlert("success", "Kullanıcı verileri getirildi.");

    // Auto-fetch KPI if enabled
    if (SETTINGS.kpi_enabled && SETTINGS.kpi_url) {
      try {
        const kpi = await getKPIs(userId);
        renderKPI(kpi);
      } catch (e) {
        showAlert("warn", `KPI getirilemedi: ${e.message || e}`);
      }
    }

    // Auto-fetch Client Bonuses if enabled
    if (SETTINGS.bonus_enabled && SETTINGS.client_bonus_url) {
      try {
        const list = await getClientBonuses(userId);
        renderClientBonuses(list);
      } catch (e) {
        showAlert("warn", `Kullanıcı bonusları getirilemedi: ${e.message || e}`);
      }
    }
  } catch (err) {
    showAlert("error", `API Hatası: ${err.message || err}`);
  }
}

// Fetch user by ID
const formUser = document.getElementById("form-fetch-user");
formUser.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userId = document.getElementById("input-userid").value.trim();
  if (!userId) return;
  await handleFetchUser(userId);
  switchTab("user");
});

document.getElementById("btn-fetch-kpi").addEventListener("click", async () => {
  const userId = document.getElementById("input-userid").value.trim();
  if (!userId) {
    showAlert("warn", "Önce kullanıcı ID girin.");
    return;
  }
  if (!SETTINGS.kpi_enabled || !SETTINGS.kpi_url) {
    showAlert("warn", "KPI sorgusu kapalı veya URL tanımsız.");
    return;
  }
  try {
    const kpi = await getKPIs(userId);
    renderKPI(kpi);
    switchTab("kpi");
  } catch (err) {
    showAlert("error", `KPI hatası: ${err.message || err}`);
  }
});

document.getElementById("btn-fetch-client-bonuses").addEventListener("click", async () => {
  const userId = document.getElementById("input-userid").value.trim();
  if (!userId) {
    showAlert("warn", "Önce kullanıcı ID girin.");
    return;
  }
  if (!SETTINGS.bonus_enabled || !SETTINGS.client_bonus_url) {
    showAlert("warn", "Bonus sorgusu kapalı veya URL tanımsız.");
    return;
  }
  try {
    const list = await getClientBonuses(userId);
    renderClientBonuses(list);
    switchTab("bonuses");
  } catch (err) {
    showAlert("error", `Bonus hatası: ${err.message || err}`);
  }
});

// Bonus range report
const formBonusRange = document.getElementById("form-bonus-range");
const bonusRangeResult = document.getElementById("bonus-range-result");
formBonusRange.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userId = document.getElementById("input-userid").value.trim();
  const start = document.getElementById("input-start").value;
  const end = document.getElementById("input-end").value;
  if (!userId) return showAlert("warn", "Önce kullanıcı ID girin.");
  if (!start || !end) return;
  try {
    const list = await getBonusReport(userId, start, end);
    const rows = list
      .map((b) => `<tr>
        <td>${b.PartnerBonusName || "-"}</td>
        <td>${b.Status || "-"}</td>
        <td>${formatMoney(b.RealMoneyAmount || 0)}</td>
        <td>${formatDate(b.CreatedLocal || b.ModifiedLocal)}</td>
      </tr>`)
      .join("");
    bonusRangeResult.classList.remove("hidden");
    bonusRangeResult.innerHTML = `<table><thead><tr><th>Bonus</th><th>Durum</th><th>Tutar</th><th>Tarih</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch (err) {
    showAlert("error", `Bonus raporu hatası: ${err.message || err}`);
  }
});

// Default tab
switchTab("search");
