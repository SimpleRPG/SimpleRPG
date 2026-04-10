// game-ui-3.js
// 職業・ペット・転生まわりのUI初期化


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
        <!-- game-ui 側で getGatherStatsList() を使ってテーブルを描画する想定 -->
      </div>
    </div>
  `;

  // サブタブ切り替え
  const tabMain   = document.getElementById("statusTabMain");
  const tabGather = document.getElementById("statusTabGather");
  const pageMain  = document.getElementById("statusPageMain");
  const pageGather= document.getElementById("statusPageGatherStats");

  function setStatusSubPage(kind) {
    if (!tabMain || !tabGather || !pageMain || !pageGather) return;

    const isMain = (kind === "main");
    tabMain.classList.toggle("active", isMain);
    tabGather.classList.toggle("active", !isMain);
    pageMain.classList.toggle("active", isMain);
    pageGather.classList.toggle("active", !isMain);
    pageMain.style.display   = isMain ? "" : "none";
    pageGather.style.display = isMain ? "none" : "";
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

  // ▼ 通常素材（従来仕様のまま、ただし所持数を見る）
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

// 買い注文用セレクトの初期化
function initMarketOrderItemSelect() {
  const sel = document.getElementById("marketOrderItem");
  if (!sel) return;

  sel.innerHTML = "";

  const addOpt = (value, label) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    sel.appendChild(opt);
  };

  // 武器
  if (Array.isArray(window.weapons)) {
    weapons.forEach(w => {
      addOpt(`weapon:${w.id}`, `武器: ${w.name}`);
    });
  }

  // 防具
  if (Array.isArray(window.armors)) {
    armors.forEach(a => {
      addOpt(`armor:${a.id}`, `防具: ${a.name}`);
    });
  }

  // ポーション
  if (Array.isArray(window.potions)) {
    potions.forEach(p => {
      addOpt(`potion:${p.id}`, `ポーション: ${p.name}`);
    });
  }

  // 基本素材
  const baseNames = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };
  Object.keys(baseNames).forEach(id => {
    addOpt(`material:${id}`, `素材: ${baseNames[id]}`);
  });
  if (typeof RARE_GATHER_ITEM_ID !== "undefined" && typeof RARE_GATHER_ITEM_NAME !== "undefined") {
    addOpt(`material:${RARE_GATHER_ITEM_ID}`, `素材: ${RARE_GATHER_ITEM_NAME}`);
  }

  // 中間素材
  if (Array.isArray(window.INTERMEDIATE_MATERIALS)) {
    INTERMEDIATE_MATERIALS.forEach(m => {
      addOpt(`material:${m.id}`, `中間素材: ${m.name}`);
    });
  }

  // 料理
  if (typeof COOKING_RECIPES !== "undefined") {
    COOKING_RECIPES.food.forEach(r => {
      addOpt(`material:${r.id}`, `料理: ${r.name}`);
    });
    COOKING_RECIPES.drink.forEach(r => {
      addOpt(`material:${r.id}`, `飲み物: ${r.name}`);
    });
  }
}


function initJobPetRebirthUI() {
  // まずステータスページを構築
  buildStatusPage();

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

  const jobWarriorBtn = document.getElementById("jobWarriorBtn");
  if (jobWarriorBtn && typeof applyJobChange === "function") {
    jobWarriorBtn.addEventListener("click", () => applyJobChange(0));
  }

  const jobMageBtn = document.getElementById("jobMageBtn");
  if (jobMageBtn && typeof applyJobChange === "function") {
    jobMageBtn.addEventListener("click", () => applyJobChange(1));
  }

  const jobTamerBtn = document.getElementById("jobTamerBtn");
  if (jobTamerBtn && typeof applyJobChange === "function") {
    jobTamerBtn.addEventListener("click", () => applyJobChange(2));
  }

  // ★追加: 錬金術師ボタン（HTML側に #jobAlchemistBtn がある前提）
  const jobAlchemistBtn = document.getElementById("jobAlchemistBtn");
  if (jobAlchemistBtn && typeof applyJobChange === "function") {
    jobAlchemistBtn.addEventListener("click", () => applyJobChange(3));
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
}