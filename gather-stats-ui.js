// gather-stats-ui.js
// 採取 / クラフト / 戦闘 の統計 UI 専用
// 前提:
// - game-core-4.js などで以下が定義されている:
//   - getGatherStatsList()
//   - getCraftStatsList()
//   - getBattleStats()
// - DOM 上に以下が存在する:
//   - 採取: #gatherStatsSummary, #statusGatherMaterials h4,
//           #gatherStatsMaterialsList, #cookingStatsMaterialsList
//   - クラフト: #craftStatsContainer
//   - 戦闘: #battleStatsContainer

// ==========================
// 採取統計: サマリー用ヘルパ
// ==========================

function setSummaryUnderHeading(headingSelector, summaryText, summaryId) {
  const heading = document.querySelector(headingSelector);
  if (!heading) {
    return;
  }

  let box = document.getElementById(summaryId);
  if (!box) {
    box = document.createElement("div");
    box.id = summaryId;
    box.style.fontSize = "11px";
    box.style.color = "#c0bedf";
    box.style.marginBottom = "4px";
    heading.insertAdjacentElement("afterend", box);
  }
  box.textContent = summaryText || "";
}

// 採取統計サマリー表示
function updateGatherStatsSummary() {
  const mainSummaryEl = document.getElementById("gatherStatsSummary");
  if (!mainSummaryEl) {
    return;
  }

  if (typeof getGatherStatsList !== "function") {
    mainSummaryEl.textContent = "これまでの採取の記録がここに表示されます。";
    setSummaryUnderHeading("#statusGatherMaterials h4:nth-of-type(1)", "", "gatherSummaryNormal");
    setSummaryUnderHeading("#statusGatherMaterials h4:nth-of-type(2)", "", "gatherSummaryCooking");
    return;
  }

  const list = getGatherStatsList(); // [{ id, name, total, times, maxOnce, kind }, ...]
  if (!list || list.length === 0) {
    mainSummaryEl.textContent = "まだ採取の記録はありません。";
    setSummaryUnderHeading("#statusGatherMaterials h4:nth-of-type(1)", "", "gatherSummaryNormal");
    setSummaryUnderHeading("#statusGatherMaterials h4:nth-of-type(2)", "", "gatherSummaryCooking");
    return;
  }

  const normalList  = list.filter(row => row.kind === "normal");
  const cookingList = list.filter(row => row.kind === "cooking");

  function buildSummaryText(rows, label, isTop) {
    if (!rows.length) return "";

    let totalCount = 0;
    let totalTimes = 0;
    let top = rows[0];

    rows.forEach(row => {
      const t = row.total || 0;
      const c = row.times || 0;
      totalCount += t;
      totalTimes += c;
      if (t > (top.total || 0)) {
        top = row;
      }
    });

    const kindsCount = rows.length;
    const kindsText =
      kindsCount === 1
        ? "1種類の素材"
        : `${kindsCount}種類の素材`;

    const prefix = isTop
      ? "これまでに "
      : (label ? `${label}は、` : "");

    return (
      `${prefix}${kindsText}を集め、` +
      `合計 ${totalCount} 個を ${totalTimes} 回の採取で手に入れました。` +
      `一番多く集めたのは「${top.name}」(${top.total}個) です。`
    );
  }

  const summaryAll = buildSummaryText(list, "", true);
  mainSummaryEl.textContent = summaryAll || "これまでの採取の記録がここに表示されます。";

  const summaryNormal = buildSummaryText(normalList, "基本素材", false);
  setSummaryUnderHeading(
    "#statusGatherMaterials h4:nth-of-type(1)",
    summaryNormal,
    "gatherSummaryNormal"
  );

  const summaryCooking = buildSummaryText(cookingList, "料理素材", false);
  setSummaryUnderHeading(
    "#statusGatherMaterials h4:nth-of-type(2)",
    summaryCooking,
    "gatherSummaryCooking"
  );
}

// ==========================
// 採取統計: テーブル生成・描画
// ==========================

function buildGatherStatsTable(list) {
  const table = document.createElement("table");
  table.className = "mat-table";
  table.style.marginTop = "6px";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["素材", "累計", "採取回数", "最大一度"].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  list.forEach(row => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = row.name;
    tr.appendChild(tdName);

    const tdTotal = document.createElement("td");
    tdTotal.textContent = row.total;
    tr.appendChild(tdTotal);

    const tdTimes = document.createElement("td");
    tdTimes.textContent = row.times;
    tr.appendChild(tdTimes);

    const tdMaxOnce = document.createElement("td");
    tdMaxOnce.textContent = row.maxOnce;
    tr.appendChild(tdMaxOnce);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

// 基本素材 / 料理素材の統計テーブルを描画
function renderGatherStatsTables() {
  if (typeof getGatherStatsList !== "function") {
    return;
  }

  const list = getGatherStatsList();
  if (!list || !list.length) {
    return;
  }

  // ★ 倉庫タブと ID が被らないよう、ステータス統計専用 ID を使用
  const gatherMatListBox  = document.getElementById("gatherStatsMaterialsList");
  const cookingMatListBox = document.getElementById("cookingStatsMaterialsList");

  const normalList  = list.filter(r => r.kind === "normal");
  const cookingList = list.filter(r => r.kind === "cooking");

  if (gatherMatListBox) {
    // ★ 毎回クリアしてから描画（テーブル増殖防止）
    gatherMatListBox.innerHTML = "";
    if (normalList.length > 0) {
      const statsTable = buildGatherStatsTable(normalList);
      gatherMatListBox.appendChild(statsTable);
    } else {
      gatherMatListBox.textContent = "まだ基本素材の採取記録がありません。";
    }
  }

  if (cookingMatListBox) {
    // ★ 毎回クリアしてから描画（テーブル増殖防止）
    cookingMatListBox.innerHTML = "";
    if (cookingList.length > 0) {
      const statsTable = buildGatherStatsTable(cookingList);
      cookingMatListBox.appendChild(statsTable);
    } else {
      cookingMatListBox.textContent = "まだ料理素材の採取記録がありません。";
    }
  }
}

// ==========================
// 採取統計: 初期化 / 更新エントリ
// ==========================

function initGatherStatsUI() {
  const gatherMatListBox  = document.getElementById("gatherStatsMaterialsList");
  const cookingMatListBox = document.getElementById("cookingStatsMaterialsList");
  const mainSummaryEl     = document.getElementById("gatherStatsSummary");

  if (!gatherMatListBox && !cookingMatListBox && !mainSummaryEl) {
    return;
  }

  // コンテナの初期状態クリアは game-ui-3.js 側で行っている前提なので、
  // ここではサマリーと統計テーブルの描画だけ行う。
  updateGatherStatsSummary();
  renderGatherStatsTables();
}

function refreshGatherStatsUI() {
  initGatherStatsUI();
}

// ==========================
// クラフト統計: テーブル描画
// ==========================

function buildCraftStatsTable(list) {
  const table = document.createElement("table");
  table.className = "mat-table";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["カテゴリ", "レシピ", "成功回数", "失敗回数", "総クラフト数"].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  list.forEach(row => {
    const tr = document.createElement("tr");

    const tdCat = document.createElement("td");
    tdCat.textContent = row.categoryName || "-";
    tr.appendChild(tdCat);

    const tdName = document.createElement("td");
    tdName.textContent = row.recipeName || row.id || "-";
    tr.appendChild(tdName);

    const tdSucc = document.createElement("td");
    tdSucc.textContent = row.success || 0;
    tr.appendChild(tdSucc);

    const tdFail = document.createElement("td");
    tdFail.textContent = row.fail || 0;
    tr.appendChild(tdFail);

    const tdTotal = document.createElement("td");
    tdTotal.textContent = (row.success || 0) + (row.fail || 0);
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

function renderCraftStatsTable() {
  const box = document.getElementById("craftStatsContainer");
  if (!box) {
    return;
  }
  box.innerHTML = "";

  if (typeof getCraftStatsList !== "function") {
    const p = document.createElement("p");
    p.textContent = "クラフト統計データがまだありません。";
    box.appendChild(p);
    return;
  }

  const list = getCraftStatsList(); // [{ id, recipeName, categoryName, success, fail }, ...]
  if (!list || !list.length) {
    const p = document.createElement("p");
    p.textContent = "まだクラフトの記録はありません。";
    box.appendChild(p);
    return;
  }

  const table = buildCraftStatsTable(list);
  box.appendChild(table);
}

function initStatusCraftStats() {
  renderCraftStatsTable();
}

// ==========================
// 戦闘統計: テーブル描画
// ==========================

function buildBattleStatsTable(st) {
  const table = document.createElement("table");
  table.className = "mat-table";
  const tbody = document.createElement("tbody");

  const rows = [
    ["総戦闘回数",         st.total || 0],
    ["勝利数",             st.win || 0],
    ["敗北数",             st.lose || 0],
    ["逃走回数",           st.escape || 0],
    ["最大与ダメージ",     st.maxDamage || 0],
    ["最大被ダメージ",     st.maxTaken || 0],
    ["最大コンボ数",       st.maxCombo || 0],
    ["最大物理ダメージ",   st.maxPhysDamage || 0],
    ["最大魔法ダメージ",   st.maxMagicDamage || 0],
    ["最大ペットダメージ", st.maxPetDamage || 0]
  ];

  rows.forEach(([label, val]) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");
    th.textContent = label;
    td.textContent = val;
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

function renderBattleStatsTable() {
  const box = document.getElementById("battleStatsContainer");
  if (!box) {
    return;
  }
  box.innerHTML = "";

  if (typeof getBattleStats !== "function") {
    const p = document.createElement("p");
    p.textContent = "戦闘統計データがまだありません。";
    box.appendChild(p);
    return;
  }

  const st = getBattleStats();
  if (!st) {
    const p = document.createElement("p");
    p.textContent = "まだ戦闘の記録はありません。";
    box.appendChild(p);
    return;
  }

  const table = buildBattleStatsTable(st);
  box.appendChild(table);
}

function initStatusBattleStats() {
  renderBattleStatsTable();
}