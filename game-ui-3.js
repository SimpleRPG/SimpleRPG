// game-ui-3.js
// 職業・ペット・転生 ＋ ステータスまわりのUI初期化

// 採取拠点UIを任意コンテナに描画する共通関数
function renderGatherBaseStatusInto(container) {
  if (!container) return;

  container.innerHTML = "";

  if (typeof getGatherBaseLevel !== "function" ||
      typeof tryUpgradeGatherBase !== "function") {
    return;
  }

  const materialDefs = [
    { key: "wood",    label: "木拠点" },
    { key: "ore",     label: "鉱石拠点" },
    { key: "herb",    label: "草拠点" },
    { key: "cloth",   label: "布拠点" },
    { key: "leather", label: "皮拠点" },
    { key: "water",   label: "水拠点" }
  ];

  materialDefs.forEach(def => {
    const level = getGatherBaseLevel(def.key);
    const mode  = (typeof getGatherBaseMode === "function")
      ? getGatherBaseMode(def.key)
      : "normal";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "4px";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${def.label} Lv${level}`;
    row.appendChild(labelSpan);

    const modeLabel = document.createElement("span");
    let modeText = "ノーマル";
    if (mode === "quantity") modeText = "量特化";
    else if (mode === "quality") modeText = "質特化";
    modeLabel.textContent = `（${modeText}）`;
    row.appendChild(modeLabel);

    const upBtn = document.createElement("button");
    upBtn.textContent = "Lv+1";
    upBtn.style.fontSize = "10px";
    upBtn.addEventListener("click", () => {
      tryUpgradeGatherBase(def.key);

      const s1 = document.querySelector("#statusGatherMaterials #gatherBaseStatus");
      if (s1) renderGatherBaseStatusInto(s1);

      const s2 = document.querySelector("#magicPageGather #gatherBaseStatus");
      if (s2) renderGatherBaseStatusInto(s2);
    });
    row.appendChild(upBtn);

    if (typeof setGatherBaseMode === "function") {
      const mkBtn = (txt, modeVal) => {
        const b = document.createElement("button");
        b.textContent = txt;
        b.style.fontSize = "10px";
        b.addEventListener("click", () => {
          setGatherBaseMode(def.key, modeVal);

          const s1 = document.querySelector("#statusGatherMaterials #gatherBaseStatus");
          if (s1) renderGatherBaseStatusInto(s1);

          const s2 = document.querySelector("#magicPageGather #gatherBaseStatus");
          if (s2) renderGatherBaseStatusInto(s2);
        });
        return b;
      };
      row.appendChild(mkBtn("ノーマル", "normal"));
      row.appendChild(mkBtn("量特化", "quantity"));
      row.appendChild(mkBtn("質特化", "quality"));
    }

    container.appendChild(row);
  });

  if (typeof window.gatherBaseStockTicks !== "undefined") {
    const stockInfo = document.createElement("div");
    stockInfo.style.marginTop = "4px";
    stockInfo.textContent = `自動採取ストック: ${window.gatherBaseStockTicks} tick`;
    container.appendChild(stockInfo);
  }
}

// ★ハウジング関連: ステータス内の表示＋拠点タブ連動
function refreshHousingStatusAndTab() {
  const citizenRow   = document.getElementById("statusCitizenRow");
  const housingTabBtn= document.getElementById("tabHousing");

  const unlocked = !!window.citizenshipUnlocked;

  if (citizenRow) {
    citizenRow.textContent = unlocked
      ? "市民権: 取得済み（拠点メニューが解放されています）"
      : "市民権: 未取得（いずれかのギルドの特別依頼で解放）";
  }

  if (housingTabBtn) {
    // 表示/非表示は html.js の updateHousingWarehouseTabs() が担当。
    // ここでは「押せるかどうか」のみ制御する。
    housingTabBtn.disabled = !unlocked;
    housingTabBtn.style.opacity = unlocked ? "1" : "0.5";
  }

  // 拠点ページ内の簡易状態表示（必要なら）
  const housingRoot = document.getElementById("housingRoot");
  if (housingRoot && housingRoot.childElementCount === 0) {
    const p = document.createElement("p");
    p.id = "housingStatusText";
    p.style.fontSize = "12px";
    p.style.color = "#ccc";
    p.textContent = unlocked
      ? "市民権を得たことで、拠点の手続きや住宅の管理が行えるようになります。（詳細UIは今後追加予定）"
      : "まだ市民権を得ていないため、拠点の手続きは行えません。";
    housingRoot.appendChild(p);
  } else if (housingRoot) {
    const statusText = document.getElementById("housingStatusText");
    if (statusText) {
      statusText.textContent = unlocked
        ? "市民権を得たことで、拠点の手続きや住宅の管理が行えるようになります。（詳細UIは今後追加予定）"
        : "まだ市民権を得ていないため、拠点の手続きは行えません。";
    }
  }
}

// ★ステータスタブHTMLを組み立てる
function buildStatusPage() {
  const page = document.getElementById("pageStatus");
  if (!page) return;

  page.innerHTML = `
    <h2>ステータス</h2>

    <!-- ステータス内サブタブ -->
    <div id="statusSubTabs" style="margin-bottom:8px;">
      <button id="statusTabMain"    class="status-sub-tab active" data-page="status-main">基本情報</button>
      <button id="statusTabGather"  class="status-sub-tab"         data-page="status-gather-stats">採取統計</button>
    </div>

    <!-- サブページ: 基本情報（元のステータス内容） -->
    <div id="statusPageMain" class="status-sub-page active">
      <div class="status-block">
        レベル: <span id="stLevel">1</span><br>
        経験値: <span id="stExp">0</span> / <span id="stExpToNext">100</span><br>
        転生回数: <span id="stRebirthCount">0</span><br>
        成長タイプ: <span id="stGrowthType">バランス型</span><br>
        職業:
        <span id="stJobName">未設定</span>
        <button id="changeJobBtn" style="margin-left:4px; font-size:11px; padding:1px 6px;">
          職業を変更
        </button>
      </div>

      <!-- ★追加: 市民権・拠点ステータス表示 -->
      <div class="status-block" id="statusCitizenRow">
        市民権: 未取得（いずれかのギルドの特別依頼で解放）
      </div>
      <!-- ★追加ここまで -->

      <div class="status-block">
        STR: <span id="stSTR">1</span>,
        VIT: <span id="stVIT">1</span>,
        INT: <span id="stINT">1</span>,
        DEX: <span id="stDEX">1</span>,
        LUK: <span id="stLUK">1</span><br>
        攻撃力: <span id="stAtkTotal">0</span>,
        防御力: <span id="stDefTotal">0</span><br>
        最大HP: <span id="stHpMax">30</span>,
        最大MP: <span id="stMpMax">10</span>,
        最大SP: <span id="stSpMax">10</span>
      </div>

      <h3>転生</h3>
      <div class="status-block">
        Lv100以上で転生できます。転生するとLv1に戻りますが、ステータスにボーナスが付きます。<br>
        <button id="rebirthBtn">転生する</button>
      </div>

      <h3>採取スキル</h3>
      <div id="gatherSkillBox" class="status-block">
        木: Lv<span id="skGatherWoodLv">0</span>,
        鉱石: Lv<span id="skGatherOreLv">0</span>,
        草: Lv<span id="skGatherHerbLv">0</span><br>
        布: Lv<span id="skGatherClothLv">0</span>,
        皮: Lv<span id="skGatherLeatherLv">0</span>,
        水: Lv<span id="skGatherWaterLv">0</span><br>
        狩猟: Lv<span id="skGatherHuntLv">0</span>,
        釣り: Lv<span id="skGatherFishLv">0</span>,
        畑: Lv<span id="skGatherFarmLv">0</span>
      </div>

      <h3>クラフトスキル</h3>
      <div id="craftSkillBox" class="status-block">
        武器: Lv<span id="skCraftWeaponLv">0</span>,
        防具: Lv<span id="skCraftArmorLv">0</span>,
        ポーション: Lv<span id="skCraftPotionLv">0</span>,
        道具: Lv<span id="skCraftToolLv">0</span>,
        素材: Lv<span id="skCraftMaterialLv">0</span>,
        料理: Lv<span id="skCraftCookingLv">0</span>
      </div>

      <h3 class="pet-only">ペットステータス（動物使いのみ）</h3>
      <div class="status-block pet-only">
        <div id="petNameRow" style="display:inline-flex; align-items:center; gap:4px;">
          ペット名: <span id="stPetName">ペット</span>
          <button id="renamePetBtn" style="font-size:11px; padding:1px 6px;">
            ペット名を変更
          </button>
        </div><br>
        ペットLv: <span id="stPetLevel">1</span><br>
        ペット経験値: <span id="stPetExp">0</span> / <span id="stPetExpToNext">5</span><br>
        ペット転生回数: <span id="stPetRebirthCount">0</span><br>
        成長タイプ: <span id="stPetGrowthType">バランス型</span><br>
        ペットHP: <span id="stPetHp">10</span> / <span id="stPetHpMax">10</span><br>
        ペット攻撃力(素): <span id="stPetAtkBase">4</span><br>
        ペット攻撃力(現在): <span id="stPetAtkNow">4</span><br>
        ペット防御力: <span id="stPetDef">2</span><br>
      </div>

      <div class="status-block">
        <button id="changePetGrowthBtn" class="pet-only">ペット成長タイプを変更</button>
      </div>

      <!-- セーブ/ロード + エクスポート/インポートUI -->
      <h3>セーブ / ロード</h3>
      <div class="status-block">
        <button onclick="saveToLocal()">ローカルにセーブ</button>
        <button onclick="loadFromLocal()">ローカルからロード</button>
        <p style="font-size:11px; color:#ccc;">
          ※バージョンあげる時はインポートのがいいかも
        </p>

        <h4 style="margin-top:8px;">エクスポート（バックアップ用）</h4>
        <button onclick="exportSaveData()">セーブデータをテキストに出力</button><br>
        <textarea id="exportSaveText" rows="4" cols="60" placeholder="ここにセーブデータが出力されます（コピーしてメモ帳などに保存してください）"></textarea>

        <h4 style="margin-top:8px;">インポート（復元）</h4>
        <textarea id="importSaveText" rows="4" cols="60" placeholder="保存しておいたセーブデータをここに貼り付けてください"></textarea><br>
        <button onclick="importSaveData()">貼り付けたデータを読み込む</button>
      </div>
    </div>

    <!-- サブページ: 採取統計 -->
    <div id="statusPageGatherStats" class="status-sub-page" style="display:none;">
      <h3>採取統計</h3>
      <div id="gatherStatsContainer" class="status-block" style="max-height:300px; overflow:auto; font-size:12px;">
        <!-- getGatherStatsList() を使ってテーブルを描画する -->
      </div>

      <!-- 素材タブの集計テーブル類 -->
      <div id="statusGatherMaterials">
        <h4>基本素材</h4>
        <div id="gatherMaterialsList"></div>

        <h4>中間素材</h4>
        <div id="intermediateMaterialsList"></div>

        <h4>料理素材</h4>
        <div id="cookingMaterialsList"></div>

        <h4>採取拠点</h4>
        <div id="gatherBaseStatus"></div>
      </div>
    </div>
  `;

  // サブタブ切り替え＆採取統計描画
  const tabMain   = document.getElementById("statusTabMain");
  const tabGather = document.getElementById("statusTabGather");
  const pageMain  = document.getElementById("statusPageMain");
  const pageGather= document.getElementById("statusPageGatherStats");

  function renderGatherStatsTable() {
    const container = document.getElementById("gatherStatsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (typeof getGatherStatsList !== "function") {
      const p = document.createElement("p");
      p.textContent = "採取統計データがまだありません。";
      container.appendChild(p);
      return;
    }

    const stats = getGatherStatsList();
    if (!stats || !stats.length) {
      const p = document.createElement("p");
      p.textContent = "まだ採取統計はありません。";
      container.appendChild(p);
      return;
    }

    const table = document.createElement("table");
    table.className = "mat-table";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    ["種別", "素材", "累計個数", "採取回数", "一度の最大数"].forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    stats.forEach(row => {
      const tr = document.createElement("tr");
      const kindTd = document.createElement("td");
      kindTd.textContent = row.kind === "normal" ? "採取素材" : "料理素材";
      tr.appendChild(kindTd);

      const nameTd = document.createElement("td");
      nameTd.textContent = row.name;
      tr.appendChild(nameTd);

      const totalTd = document.createElement("td");
      totalTd.textContent = row.total;
      tr.appendChild(totalTd);

      const timesTd = document.createElement("td");
      timesTd.textContent = row.times;
      tr.appendChild(timesTd);

      const maxTd = document.createElement("td");
      maxTd.textContent = row.maxOnce;
      tr.appendChild(maxTd);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  function renderGatherMaterialTables() {
    // 基本素材
    const gatherMatListBox = document.getElementById("gatherMaterialsList");
    if (gatherMatListBox && typeof window.materials !== "undefined") {
      gatherMatListBox.innerHTML = "";

      const names = {
        wood:   "木",
        ore:    "鉱石",
        herb:   "草",
        cloth:  "布",
        leather:"皮",
        water:  "水"
      };
      const keys = ["wood","ore","herb","cloth","leather","water"];

      const table = document.createElement("table");
      table.className = "mat-table";

      const thead = document.createElement("thead");
      const headTr = document.createElement("tr");

      const emptyTh = document.createElement("th");
      emptyTh.textContent = "";
      headTr.appendChild(emptyTh);

      keys.forEach(key => {
        const th = document.createElement("th");
        th.textContent = names[key];
        headTr.appendChild(th);
      });
      thead.appendChild(headTr);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      ["t1", "t2", "t3"].forEach((tierKey, idx) => {
        const tr = document.createElement("tr");
        const tierTh = document.createElement("th");
        tierTh.textContent = `T${idx + 1}`;
        tr.appendChild(tierTh);

        keys.forEach(key => {
          const mat = window.materials[key] || {};
          const td = document.createElement("td");
          const val = mat[tierKey] || 0;
          td.textContent = val;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      gatherMatListBox.appendChild(table);
    }

    // 中間素材
    const intermListBox = document.getElementById("intermediateMaterialsList");
    if (intermListBox && Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {
      const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;
      const mats = window.intermediateMats || {};
      intermListBox.innerHTML = "";

      const groups = {};

      src.forEach(m => {
        let tierKey = "t1";
        let baseName = m.name;

        if (m.name.startsWith("T1")) {
          tierKey = "t1";
          baseName = m.name.replace(/^T1/, "").trim();
        } else if (m.name.startsWith("T2")) {
          tierKey = "t2";
          baseName = m.name.replace(/^T2/, "").trim();
        } else if (m.name.startsWith("T3")) {
          tierKey = "t3";
          baseName = m.name.replace(/^T3/, "").trim();
        }

        const baseId = baseName;
        if (!groups[baseId]) {
          groups[baseId] = { name: baseName, t1: 0, t2: 0, t3: 0 };
        }

        const cnt = mats[m.id] || 0;
        groups[baseId][tierKey] = cnt;
      });

      const table = document.createElement("table");
      table.className = "mat-table";

      const thead = document.createElement("thead");
      const htr = document.createElement("tr");

      const thTier = document.createElement("th");
      thTier.textContent = "";
      htr.appendChild(thTier);

      const baseOrder = [
        "板材",
        "鉄インゴット",
        "調合用薬草",
        "布束",
        "強化皮",
        "蒸留水"
      ];

      baseOrder.forEach(baseName => {
        if (groups[baseName]) {
          const th = document.createElement("th");
          th.textContent = baseName;
          htr.appendChild(th);
        }
      });

      thead.appendChild(htr);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      ["t1", "t2", "t3"].forEach((tierKey, idx) => {
        const tr = document.createElement("tr");
        const thT = document.createElement("th");
        thT.textContent = `T${idx + 1}`;
        tr.appendChild(thT);

        baseOrder.forEach(baseName => {
          if (groups[baseName]) {
            const g = groups[baseName];
            const td = document.createElement("td");
            td.textContent = g[tierKey] || 0;
            tr.appendChild(td);
          }
        });

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      intermListBox.appendChild(table);
    }

    // 料理素材
    const cookingMatListBox = document.getElementById("cookingMaterialsList");
    if (cookingMatListBox) {
      cookingMatListBox.innerHTML = "";

      if (typeof COOKING_MAT_NAMES !== "undefined") {
        const mats = window.cookingMats || {};

        const table = document.createElement("table");
        table.className = "mat-table";

        const thead = document.createElement("thead");
        const htr = document.createElement("tr");
        const thName = document.createElement("th");
        thName.textContent = "素材";
        const thCount = document.createElement("th");
        thCount.textContent = "個数";
        htr.appendChild(thName);
        htr.appendChild(thCount);
        thead.appendChild(htr);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        Object.keys(COOKING_MAT_NAMES).forEach(id => {
          const tr = document.createElement("tr");
          const tdName = document.createElement("td");
          const tdCount = document.createElement("td");
          tdName.textContent = COOKING_MAT_NAMES[id];
          tdCount.textContent = mats[id] || 0;
          tr.appendChild(tdName);
          tr.appendChild(tdCount);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        cookingMatListBox.appendChild(table);
      }
    }

    // 採取拠点UI（ステータス画面側）
    if (typeof getGatherBaseLevel === "function" &&
        typeof tryUpgradeGatherBase === "function") {
      const container = document.getElementById("gatherBaseStatus");
      if (container) {
        renderGatherBaseStatusInto(container);
      }
    }
  }

  function setStatusSubPage(kind) {
    if (!tabMain || !tabGather || !pageMain || !pageGather) return;

    const isMain = (kind === "main");
    tabMain.classList.toggle("active", isMain);
    tabGather.classList.toggle("active", !isMain);
    pageMain.classList.toggle("active", isMain);
    pageGather.classList.toggle("active", !isMain);
    pageMain.style.display   = isMain ? "" : "none";
    pageGather.style.display = isMain ? "none" : "";

    if (!isMain) {
      // 採取統計タブに切り替えたときに描画
      renderGatherStatsTable();
      renderGatherMaterialTables();
    }
  }

  if (tabMain && tabGather) {
    tabMain.addEventListener("click", () => setStatusSubPage("main"));
    tabGather.addEventListener("click", () => setStatusSubPage("gather"));
    setStatusSubPage("main");
  }

  // ペット名変更ボタン → promptRenamePet
  const renamePetBtn = document.getElementById("renamePetBtn");
  if (renamePetBtn && typeof promptRenamePet === "function") {
    renamePetBtn.addEventListener("click", () => {
      promptRenamePet();
    });
  }

  // 魔巧区 採取拠点タブ側の描画（同じUIを使い回す）
  const magicGatherBox = document.querySelector("#magicPageGather #gatherBaseStatus");
  if (magicGatherBox) {
    renderGatherBaseStatusInto(magicGatherBox);
  }

  // ★ここで一度、市民権＆拠点タブ表示を反映
  refreshHousingStatusAndTab();
}


// ★修正: 農園UIの表示制御ヘルパ（現行レイアウト用の簡易版）
function updateFarmAreaVisibility() {
  const farmAreaCooking = document.getElementById("farmAreaCooking");
  const farmSlots       = document.getElementById("farmSlots");

  if (!farmAreaCooking || !farmSlots) {
    return;
  }
}

// farm-core.js の updateFarmUI の最後から呼ぶためのフック
window.onFarmUIUpdated = function() {
  updateFarmAreaVisibility();
};

// 素材詳細テキスト更新（採取タブ用）
function updateGatherMatDetailText() {
  const label = document.getElementById("gatherMaterials");
  const area  = document.getElementById("gatherMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  const keys = ["wood","ore","herb","cloth","leather","water"];
  const lines = keys.map(k => {
    const m  = window.materials[k] || {};
    const t1 = m.t1 || 0;
    const t2 = m.t2 || 0;
    const t3 = m.t3 || 0;
    return `${names[k]}: ${t1}/${t2}/${t3}`;
  });
  area.textContent = lines.join("\n");

  let labelText = "所持素材：-";

  const info = window.lastGatherInfo;

  // ▼ 通常素材
  if (info && info.baseKey) {
    const baseKey = info.baseKey;
    const mat = window.materials[baseKey] || {};
    const t1Have = mat.t1 || 0;
    const t2Have = mat.t2 || 0;
    const t3Have = mat.t3 || 0;
    const name   = names[baseKey] || baseKey;

    let picked = "";
    if (t3Have > 0)      picked = `T3${name} x${t3Have}`;
    else if (t2Have > 0) picked = `T2${name} x${t2Have}`;
    else if (t1Have > 0) picked = `T1${name} x${t1Have}`;

    if (picked) {
      labelText = `所持素材：${picked}`;
    }
  }

  // ▼ 料理素材
  if (info && info.kind === "cooking" && info.gained && window.cookingMats) {
    const ids = Object.keys(info.gained);
    if (ids.length > 0) {
      const lastId = ids[ids.length - 1];
      const have   = window.cookingMats[lastId] || 0;
      const name   = (typeof COOKING_MAT_NAMES !== "undefined"
        ? COOKING_MAT_NAMES[lastId]
        : lastId);
      labelText = `所持素材：${name} x${have}`;
    }
  }

  label.textContent = labelText;
}

// 素材詳細テキスト更新（クラフト表示用）
function updateCraftMatDetailText() {
  const label = document.getElementById("craftMaterials");
  const area  = document.getElementById("craftMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  function formatTierNums(matObj) {
    const m = matObj || {};
    const t1 = m.t1 || 0;
    const t2 = m.t2 || 0;
    const t3 = m.t3 || 0;
    return `${t1}/${t2}/${t3}`;
  }

  const keys = ["wood","ore","herb","cloth","leather","water"];

  const lines = keys.map(k => {
    const m = window.materials[k] || {};
    return `${names[k]}: ${formatTierNums(m)}`;
  });
  area.textContent = lines.join("\n");

  // 中間素材の在庫一覧
  if (typeof window.intermediateMats !== "undefined" &&
      Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {

    const mats = window.intermediateMats || {};
    const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;

    const interLines = src.map(m => {
      const have = mats[m.id] || 0;
      return `${m.name}: ${have}`;
    });

    if (interLines.length > 0) {
      area.textContent += "\n--- 中間素材 ---\n" + interLines.join("\n");
    }
  }

  let labelText = "所持素材：-";

  if (window.lastGatherInfo && window.lastGatherInfo.baseKey) {
    const info    = window.lastGatherInfo;
    const baseKey = info.baseKey;
    const tiers   = info.tiers || {};
    const t1 = tiers.t1 || 0;
    const t2 = tiers.t2 || 0;
    const t3 = tiers.t3 || 0;

    let picked = "";
    if (t3 > 0)      picked = `T3${names[baseKey]}`;
    else if (t2 > 0) picked = `T2${names[baseKey]}`;
    else if (t1 > 0) picked = `T1${names[baseKey]}`;

    if (picked) {
      labelText = `所持素材：${picked}`;
    }
  }

  label.textContent = labelText;
}

function initJobPetRebirthUI() {
  // まずステータスページを構築
  buildStatusPage();

  // ステータスページ構築後に買い注文セレクトを初期化（実体は market-core2.js 側）
  if (typeof initMarketOrderItemSelect === "function") {
    initMarketOrderItemSelect();
  }

  // =======================
  // 職業・ペット
  // =======================

  const changeJobBtn2 = document.getElementById("changeJobBtn");
  if (changeJobBtn2 && typeof openJobModal === "function") {
    changeJobBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は職業変更できない！");
        return;
      }
      openJobModal();
    });
  }

  // ★修正: 各職業ボタンは「選択」だけにし、確定は jobConfirmBtn 側に任せる
  const jobWarriorBtn = document.getElementById("jobWarriorBtn");
  if (jobWarriorBtn) {
    jobWarriorBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobWarriorBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[0] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 0;
      }
    });
  }

  const jobMageBtn = document.getElementById("jobMageBtn");
  if (jobMageBtn) {
    jobMageBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobMageBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[1] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 1;
      }
    });
  }

  const jobTamerBtn = document.getElementById("jobTamerBtn");
  if (jobTamerBtn) {
    jobTamerBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobTamerBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[2] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 2;
      }
    });
  }

  const jobAlchemistBtn = document.getElementById("jobAlchemistBtn");
  if (jobAlchemistBtn) {
    jobAlchemistBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobAlchemistBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[3] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 3;
      }
    });
  }

  const changePetGrowthBtn2 = document.getElementById("changePetGrowthBtn");
  if (changePetGrowthBtn2 && typeof changePetGrowthType === "function") {
    changePetGrowthBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はペット成長タイプを変更できない！");
        return;
      }
      changePetGrowthType();
    });
  }

  const petGrowthModal = document.getElementById("petGrowthModal");
  const petGrowthButtons = document.querySelectorAll("#petGrowthButtons button");
  const petGrowthCloseBtn2 = document.getElementById("petGrowthCloseBtn");
  if (petGrowthModal) {
    petGrowthButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const val = parseInt(btn.dataset.growth, 10);
        if (jobId !== 2) {
          appendLog("動物使いのみ変更できます");
          return;
        }
        window.petGrowthType = val;
        if (typeof petGrowthType !== "undefined") {
          petGrowthType = val;
        }
        appendLog("ペット成長タイプを変更した");
        if (typeof updateDisplay === "function") updateDisplay();
        petGrowthModal.style.display = "none";
      });
    });
    if (petGrowthCloseBtn2) {
      petGrowthCloseBtn2.addEventListener("click", () => {
        petGrowthModal.style.display = "none";
      });
    }
    petGrowthModal.addEventListener("click", (e) => {
      if (e.target === petGrowthModal) petGrowthModal.style.display = "none";
    });
  }

  // =======================
  // 転生
  // =======================

  const rebirthBtn2 = document.getElementById("rebirthBtn");
  if (rebirthBtn2 && typeof openRebirthModal === "function") {
    rebirthBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は転生できない！");
        return;
      }
      openRebirthModal();
    });
  }

  // =======================
  // 最終表示更新
  // =======================

  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }

  if (typeof updateGatherMatDetailText === "function") {
    updateGatherMatDetailText();
  }
  if (typeof updateCraftMatDetailText === "function") {
    updateCraftMatDetailText();
  }

  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }

  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }

  // ★市民権・拠点タブ表示を再反映（セーブデータ読み込み後など）
  refreshHousingStatusAndTab();
}

const MAX_LOG_LINES = 50;

function appendLog(msg) {
  const el = document.getElementById("log");
  if (!el) return;

  let lines = el.textContent.split("\n").filter(line => line.trim() !== "");

  lines.unshift(msg);

  if (lines.length > MAX_LOG_LINES) {
    lines = lines.slice(0, MAX_LOG_LINES);
  }

  el.textContent = lines.join("\n");

  el.scrollTop = 0;
}