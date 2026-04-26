// game-ui-4.js
// ステータス画面（基本情報 / 採取統計 / スキルツリー）＋ハウジング表示

// ★ハウジング関連: 拠点UIに土地レンタル状況を描画
function renderHousingLandStatus() {
  const housingRoot = document.getElementById("housingRoot");
  if (!housingRoot) return;

  const unlocked = !!window.citizenshipUnlocked;
  housingRoot.innerHTML = "";

  const statusText = document.createElement("p");
  statusText.id = "housingStatusText";
  statusText.style.fontSize = "12px";
  statusText.style.color = "#ccc";
  statusText.style.marginBottom = "8px";
  statusText.textContent = unlocked
    ? "市民権を得たことで、拠点の手続きや住宅の管理が行えるようになりました。"
    : "まだ市民権を得ていないため、拠点の手続きは行えません。";
  housingRoot.appendChild(statusText);

  // 市民権がなければここで終了（従来どおり）
  if (!unlocked) return;

  const lands = window.HOUSING_LANDS || {};
  // 可能なら housing-core.js のセーフヘルパーを使う
  const hs = (typeof getHousingStateSafe === "function")
    ? getHousingStateSafe()
    : (typeof window.housingState !== "undefined" ? window.housingState : null);
  const current = (typeof getCurrentHousingLand === "function")
    ? getCurrentHousingLand()
    : null;

  // ============================
  // 1) 滞納中なら拠点UIロック表示だけにする
  // ============================
  // 「追い出さないが、拠点UIや効果には触れさせない」＝
  // 土地は保持したまま、ここでは家賃支払いUIのみを出して return する。
  if (current && hs && hs.rentUnpaid) {
    const overdueBox = document.createElement("div");
    overdueBox.className = "status-block";
    overdueBox.style.marginBottom = "8px";
    overdueBox.style.border = "1px solid #a33";

    // 現在の拠点名（ギルド寮なら所属ギルド名で差し替え）
    let currentNameForDisplay = current.name;
    if (current.kind === "guildDorm" && typeof window.getGuildDormDisplayName === "function") {
      currentNameForDisplay = window.getGuildDormDisplayName(current.name);
    }

    const title = document.createElement("div");
    title.textContent = `現在の拠点: ${currentNameForDisplay}`;
    overdueBox.appendChild(title);

    const info = document.createElement("div");
    info.style.fontSize = "11px";
    info.style.color = "#f88";
    info.style.marginTop = "4px";
    info.innerHTML =
      "家賃の支払期限を過ぎているため、拠点の効果と機能は停止しています。<br>" +
      "家賃を支払うと、拠点ボーナスや住宅機能を再び利用できます。";
    overdueBox.appendChild(info);

    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "6px";

    const payBtn = document.createElement("button");
    payBtn.textContent = "家賃を支払う";
    payBtn.style.fontSize = "11px";
    payBtn.style.padding = "3px 8px";
    payBtn.addEventListener("click", () => {
      if (typeof payHousingRent === "function") {
        payHousingRent();
      }
    });
    btnRow.appendChild(payBtn);

    overdueBox.appendChild(btnRow);
    housingRoot.appendChild(overdueBox);

    // 滞納中は「借りられる土地」リストなど他の拠点UIには触れさせない
    return;
  }

  // ============================
  // 2) 通常表示（従来仕様）: 現在の拠点＋借りられる土地一覧
  // ============================

  const currentBox = document.createElement("div");
  currentBox.className = "status-block";
  currentBox.style.marginBottom = "8px";

  if (current && hs) {
    const title = document.createElement("div");

    // 現在借りている拠点名（ギルド寮なら所属ギルドに応じた名前を使う）
    let currentNameForDisplay = current.name;
    if (current.kind === "guildDorm" && typeof window.getGuildDormDisplayName === "function") {
      currentNameForDisplay = window.getGuildDormDisplayName(current.name);
    }

    title.textContent = `現在借りている拠点: ${currentNameForDisplay}`;
    currentBox.appendChild(title);

    const info = document.createElement("div");
    info.style.fontSize = "11px";

    let rentText = "";
    if (hs.rentDueAt) {
      const now = Date.now();
      const remainMs = hs.rentDueAt - now;
      // rentUnpaid の場合は上で return 済みなのでここには来ない
      if (remainMs <= 0) {
        rentText = "家賃: 支払期限切れ（効果停止中）";
      } else {
        const remainDays = Math.floor(remainMs / (24 * 60 * 60 * 1000));
        const remainHours = Math.floor((remainMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        rentText = `家賃: 1週間ごと / 残り およそ ${remainDays}日 ${remainHours}時間`;
      }
    } else {
      rentText = "家賃: 未設定";
    }

    info.textContent = rentText;
    currentBox.appendChild(info);

    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "4px";

    const payBtn = document.createElement("button");
    payBtn.textContent = "家賃を支払う";
    payBtn.style.fontSize = "11px";
    payBtn.style.padding = "3px 8px";
    payBtn.addEventListener("click", () => {
      if (typeof payHousingRent === "function") {
        payHousingRent();
      }
    });
    btnRow.appendChild(payBtn);

    currentBox.appendChild(btnRow);
  } else {
    const none = document.createElement("div");
    none.textContent = "現在借りている拠点はありません。";
    currentBox.appendChild(none);
  }

  housingRoot.appendChild(currentBox);

  const listBox = document.createElement("div");
  listBox.className = "status-block";
  const listTitle = document.createElement("div");
  listTitle.textContent = "借りられる土地";
  listTitle.style.marginBottom = "4px";
  listTitle.style.fontWeight = "600";
  listBox.appendChild(listTitle);

  Object.keys(lands).forEach(id => {
    const land = lands[id];
    if (!land) return;

    const card = document.createElement("div");
    card.style.border = "1px solid #555";
    card.style.borderRadius = "4px";
    card.style.padding = "4px 6px";
    card.style.marginBottom = "4px";
    card.style.fontSize = "12px";
    card.style.background = "#10101a";

    const nameRow = document.createElement("div");

    // リスト側の表示名もギルド寮なら動的名を利用
    let landNameForDisplay = land.name;
    if (land.kind === "guildDorm" && typeof window.getGuildDormDisplayName === "function") {
      landNameForDisplay = window.getGuildDormDisplayName(land.name);
    }

    nameRow.textContent = landNameForDisplay;
    nameRow.style.fontWeight = "600";
    card.appendChild(nameRow);

    const infoRow = document.createElement("div");
    const kindText =
      land.kind === "guildDorm" ? "（ギルド寮）" :
      land.kind === "cityRoom" ? "（街の一室）" :
      land.kind === "suburbLand" ? "（郊外の土地）" :
      "";

    // 郊外の土地だけ「5〜」表記にする（baseSlots 自体はコア定義どおり 5）
    let slotText;
    if (land.kind === "suburbLand") {
      slotText = `${land.baseSlots}〜`;
    } else {
      slotText = `${land.baseSlots}`;
    }

    infoRow.textContent =
      `${kindText} 週家賃: ${land.weeklyRent}G / 家具スロット: ${slotText}`;
    infoRow.style.fontSize = "11px";
    infoRow.style.color = "#c0bedf";
    card.appendChild(infoRow);

    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "4px";
    const rentBtn = document.createElement("button");
    rentBtn.textContent = "この土地を借りる";
    rentBtn.style.fontSize = "11px";
    rentBtn.style.padding = "3px 8px";

    rentBtn.addEventListener("click", () => {
      if (typeof rentLand === "function") {
        rentLand(land.id);
      }
    });

    let reasonText = "";
    if (typeof canRentLand === "function") {
      const res = canRentLand(land.id);
      if (!res.ok) {
        rentBtn.disabled = true;
        reasonText = res.reason || "";
      }
    }

    btnRow.appendChild(rentBtn);

    if (reasonText) {
      const reasonSpan = document.createElement("span");
      reasonSpan.style.marginLeft = "4px";
      reasonSpan.style.fontSize = "11px";
      reasonSpan.style.color = "#ccc";
      reasonSpan.textContent = `（${reasonText}）`;
      btnRow.appendChild(reasonSpan);
    }

    card.appendChild(btnRow);
    listBox.appendChild(card);
  });

  housingRoot.appendChild(listBox);
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
    housingTabBtn.disabled = !unlocked;
    housingTabBtn.style.opacity = unlocked ? "1" : "0.5";
  }

  if (typeof renderHousingLandStatus === "function") {
    renderHousingLandStatus();
  }
}

// ★スキルツリーボーナス一覧を描画
function renderSkillTreeBonusList() {
  const box = document.getElementById("skillTreeBonusList");
  if (!box) return;

  box.innerHTML = "";

  if (typeof getGlobalSkillTreeBonus !== "function") {
    const p = document.createElement("p");
    p.textContent = "スキルツリーボーナス情報がありません。";
    box.appendChild(p);
    return;
  }

  const b = getGlobalSkillTreeBonus() || {};
  function pct(v) { return Math.round(v * 100); }

  const lines = [];

  if (b.hpMaxRate)              lines.push(`最大HP: +${pct(b.hpMaxRate)}%`);
  if (b.atkRate)                lines.push(`攻撃力: +${pct(b.atkRate)}%`);
  if (b.defRate)                lines.push(`防御力: +${pct(b.defRate)}%`);
  if (b.combatGuardReductionRate) lines.push(`被ダメージ: -${pct(b.combatGuardReductionRate)}%`);
  if (b.physSkillRate)          lines.push(`物理スキルダメージ: +${pct(b.physSkillRate)}%`);
  if (b.magicSkillRate)         lines.push(`魔法スキルダメージ: +${pct(b.magicSkillRate)}%`);
  if (b.petAtkRate)             lines.push(`ペット与ダメージ: +${pct(b.petAtkRate)}%`);
  if (b.combatPostBattleHpRate) lines.push(`戦闘後回復: 最大HPの${pct(b.combatPostBattleHpRate)}%`);

  if (b.gatherAmountBonusRate)   lines.push(`通常採取量: +${pct(b.gatherAmountBonusRate)}%`);
  if (b.extraGatherBonusRateAdd) lines.push(`採取EXTRA率: +${pct(b.extraGatherBonusRateAdd)}%`);
  if (b.gatherEquipBonusChanceAdd) lines.push(`採取装備ボーナス率: +${pct(b.gatherEquipBonusChanceAdd)}%`);
  if (b.gatherFailPenaltyRate !== 1.0) {
    lines.push(`採取失敗率補正: ×${b.gatherFailPenaltyRate.toFixed(2)}`);
  }

  if (b.craftCostReduceRate)          lines.push(`クラフト中間素材コスト: -${pct(b.craftCostReduceRate)}%`);
  if (b.craftIntermediateExtraChance) lines.push(`中間素材EXTRA率: +${pct(b.craftIntermediateExtraChance)}%`);
  if (b.craftQualityBonusRate)        lines.push(`装備クラフト品質ボーナス: +${pct(b.craftQualityBonusRate)}%`);
  if (b.craftStarBonusRate)           lines.push(`星屑強化成功率: +${pct(b.craftStarBonusRate)}%`);

  if (b.sellPriceRate)                lines.push(`ショップ売却価格: +${pct(b.sellPriceRate)}%`);
  if (b.buyPriceReduceRate)           lines.push(`ショップ購入価格: -${pct(b.buyPriceReduceRate)}%`);
  if (b.gatherBaseUpgradeCostReduceRate) lines.push(`採取拠点強化コスト(中間素材): -${pct(b.gatherBaseUpgradeCostReduceRate)}%`);
  if (b.gatherBaseStockMaxTicksAdd)   lines.push(`自動採取ストック上限: +${b.gatherBaseStockMaxTicksAdd} tick`);

  if (!lines.length) {
    const p = document.createElement("p");
    p.textContent = "まだスキルツリーによるボーナスはありません。";
    box.appendChild(p);
    return;
  }

  const ul = document.createElement("ul");
  ul.style.fontSize = "12px";
  ul.style.margin = "0";
  ul.style.paddingLeft = "18px";
  lines.forEach(txt => {
    const li = document.createElement("li");
    li.textContent = txt;
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

function fitSkillTreeScale() {
  const svg  = document.getElementById("skillTreeSvg");
  const root = document.getElementById("skillTreeRoot");
  if (!svg || !root) return;

  // いったん transform をリセットしてから bbox を取る
  root.removeAttribute("transform");

  let bbox;
  try {
    bbox = root.getBBox();
  } catch (e) {
    return;
  }
  if (!bbox || !bbox.width || !bbox.height) return;

  // viewBox から座標系を取得
  const viewBoxAttr = svg.getAttribute("viewBox") || "0 0 100 100";
  const vb = viewBoxAttr.split(/\s+/).map(Number);
  const vbMinX  = vb[0] || 0;
  const vbMinY  = vb[1] || 0;
  const vbWidth = vb[2] || 100;
  const vbHeight= vb[3] || 100;

  // なるべく 1.0 に近いスケールで、必要なら少しだけ縮小
  const padding = 10;
  const usableW = vbWidth  - padding * 2;
  const usableH = vbHeight - padding * 2;
  if (usableW <= 0 || usableH <= 0) return;

  const scaleX = usableW / bbox.width;
  const scaleY = usableH / bbox.height;
  const rawScale = Math.min(scaleX, scaleY);
  const scale = Math.max(0.8, Math.min(rawScale, 1.0));

  const bboxCenterX = bbox.x + bbox.width  / 2;
  const bboxCenterY = bbox.y + bbox.height / 2;
  const vbCenterX   = vbMinX + vbWidth  / 2;
  const vbCenterY   = vbMinY + vbHeight / 2;

  const tx = vbCenterX - bboxCenterX * scale;
  const ty = vbCenterY - bboxCenterY * scale;

  root.setAttribute("transform", `translate(${tx}, ${ty}) scale(${scale})`);
}

// ★ステータスタブHTMLは html2.js 側で組み立てる。
// ここではイベントバインドと描画だけを行う。
function buildStatusPage() {
  const page = document.getElementById("pageStatus");
  if (!page) return;

  // ===== サブタブ切り替え =====
  const tabMain  = document.getElementById("statusTabMain");
  const tabStats = document.getElementById("statusTabStats");   // HTML に合わせて修正済み
  const tabSkill = document.getElementById("statusTabSkill");
  const pageMain  = document.getElementById("statusPageMain");
  const pageStats = document.getElementById("statusPageStats"); // HTML に合わせて修正済み
  const pageSkill = document.getElementById("statusPageSkill");

  function setStatusSubPage(kind) {
    if (!tabMain || !tabStats || !tabSkill ||
        !pageMain || !pageStats || !pageSkill) return;

    const isMain  = (kind === "main");
    const isStats = (kind === "stats");
    const isSkill = (kind === "skill");

    tabMain.classList.toggle("active",  isMain);
    tabStats.classList.toggle("active", isStats);
    tabSkill.classList.toggle("active", isSkill);

    pageMain.style.display  = isMain  ? "" : "none";
    pageStats.style.display = isStats ? "" : "none";
    pageSkill.style.display = isSkill ? "" : "none";

    if (isStats) {
      // 統計タブに入ったら、統計サブタブ（採取/クラフト/戦闘/釣り図鑑）を初期化
      if (typeof initStatusStatsSubTabs === "function") {
        initStatusStatsSubTabs();
      }
    }
    if (isSkill) {
      renderSkillTreeBonusList();
      if (typeof renderSkillTree === "function") {
        renderSkillTree("skillTreePanel");
        fitSkillTreeScale();
      }
    }
  }

  if (tabMain && tabStats && tabSkill) {
    tabMain.addEventListener("click",  () => setStatusSubPage("main"));
    tabStats.addEventListener("click", () => setStatusSubPage("stats"));
    tabSkill.addEventListener("click", () => setStatusSubPage("skill"));
    setStatusSubPage("main");
  }

  // スキルツリータブ内サブタブ
  const skillTabTree  = document.getElementById("statusSkillTabTree");
  const skillTabBonus = document.getElementById("statusSkillTabBonus");
  const skillPageTree = document.getElementById("statusSkillTreePage");
  const skillPageBonus= document.getElementById("statusSkillBonusPage");

  function setStatusSkillSubPage(kind) {
    if (!skillTabTree || !skillTabBonus || !skillPageTree || !skillPageBonus) return;
    const isTree  = kind === "tree";
    const isBonus = kind === "bonus";

    skillTabTree.classList.toggle("active",  isTree);
    skillTabBonus.classList.toggle("active", isBonus);

    skillPageTree.style.display  = isTree  ? "" : "none";
    skillPageBonus.style.display = isBonus ? "" : "none";

    if (isBonus) {
      renderSkillTreeBonusList();
    } else {
      if (typeof renderSkillTree === "function") {
        renderSkillTree("skillTreePanel");
        fitSkillTreeScale();
      }
    }
  }

  if (skillTabTree && skillTabBonus) {
    skillTabTree.addEventListener("click",  () => setStatusSkillSubPage("tree"));
    skillTabBonus.addEventListener("click", () => setStatusSkillSubPage("bonus"));
    setStatusSkillSubPage("tree");
  }

  // ★スキルツリーフィルターボタンにクリックイベントを登録
  const filterButtons = document.querySelectorAll(".skill-filter-btn");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // activeクラスの切り替え（見た目用）
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // data-filter の値を skilltree.js 側に渡す
      const filter = btn.dataset.filter || "all";
      if (typeof setSkillTreeFilter === "function") {
        setSkillTreeFilter(filter);
      }
    });
  });

  // ペット名変更ボタン
  const renamePetBtn = document.getElementById("renamePetBtn");
  if (renamePetBtn && typeof promptRenamePet === "function") {
    renamePetBtn.addEventListener("click", () => {
      promptRenamePet();
    });
  }

  // 魔巧区 採取拠点タブ側の描画
  const magicGatherBox = document.querySelector("#magicPageGather #gatherBaseStatus");
  if (magicGatherBox && typeof renderGatherBaseStatusInto === "function") {
    renderGatherBaseStatusInto(magicGatherBox);
  }

  refreshHousingStatusAndTab();
}

// 農園UIの表示制御ヘルパ（現行レイアウト用の簡易版）
function updateFarmAreaVisibility() {
  const farmAreaCooking = document.getElementById("farmAreaCooking");
  const farmSlots       = document.getElementById("farmSlots");
  if (!farmAreaCooking || !farmSlots) return;
}

// farm-core.js の updateFarmUI の最後から呼ぶためのフック
window.onFarmUIUpdated = function() {
  updateFarmAreaVisibility();
};

// 採取タブ用の素材詳細・クラフト素材詳細（詳細は表描画）
function updateGatherMatDetailText() {
  const label = document.getElementById("gatherMaterials");
  const area  = document.getElementById("gatherMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };

  let labelText = "所持素材：-";

  const info = window.lastGatherInfo;

  if (info && info.baseKey) {
    const baseKey = info.baseKey;
    const matArr = window.materials[baseKey] || [];
    const t1Have = matArr[0] || 0;
    const t2Have = matArr[1] || 0;
    const t3Have = matArr[2] || 0;
    const name   = names[baseKey] || baseKey;

    let picked = "";
    if (t3Have > 0)      picked = `T3${name} x${t3Have}`;
    else if (t2Have > 0) picked = `T2${name} x${t2Have}`;
    else if (t1Have > 0) picked = `T1${name} x${t1Have}`;
    if (picked) labelText = `所持素材：${picked}`;
  }

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

  // 詳細エリアには基本素材テーブルを出す（定義は game-ui-3.js 側）
  if (typeof renderBasicMaterialTableInto === "function") {
    renderBasicMaterialTableInto(area);
  }
}

function updateCraftMatDetailText() {
  const label = document.getElementById("craftMaterials");
  const area  = document.getElementById("craftMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };

  // いまアクティブなクラフトカテゴリを判定（data-cat="cooking" が active なら料理タブ）
  const cookingTabBtn = document.querySelector('#craftCategoryTabs .craft-cat-tab[data-cat="cooking"]');
  const isCookingTabActive = cookingTabBtn && cookingTabBtn.classList.contains("active");

  // 料理タブがアクティブのときは、倉庫の料理素材表と同じテーブルを表示
  if (isCookingTabActive && typeof COOKING_MAT_NAMES !== "undefined") {
    area.innerHTML = "";

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
    area.appendChild(table);

    label.textContent = "所持素材：料理素材一覧";
    return;
  }

  // 通常クラフトカテゴリのとき: 基本素材テーブル＋中間素材テーブルを表示
  area.innerHTML = "";

  // 上段: 基本採取素材テーブル（定義は game-ui-3.js 側）
  const basicBox = document.createElement("div");
  if (typeof renderBasicMaterialTableInto === "function") {
    renderBasicMaterialTableInto(basicBox);
  }
  area.appendChild(basicBox);

  // 下段: 中間素材
  if (typeof window.intermediateMats !== "undefined" &&
      Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {

    const mats = window.intermediateMats || {};
    const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;

    const title = document.createElement("div");
    title.textContent = "中間素材";
    title.style.marginTop = "4px";
    title.style.fontSize = "11px";
    area.appendChild(title);

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
    src.forEach(m => {
      const tr = document.createElement("tr");
      const tdName = document.createElement("td");
      const tdCount = document.createElement("td");
      tdName.textContent = m.name;
      tdCount.textContent = mats[m.id] || 0;
      tr.appendChild(tdName);
      tr.appendChild(tdCount);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    area.appendChild(table);
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
    if (picked) labelText = `所持素材：${picked}`;
  }

  label.textContent = labelText;
}

// =======================
// 倉庫タブ：素材一覧（採取 / 中間 / 料理）描画
// =======================

// 採取素材テーブルを #gatherMaterialsList 内に描画
function renderWarehouseGatherMaterials() {
  const box = document.getElementById("gatherMaterialsList");
  if (!box || !window.materials) return;

  box.innerHTML = "";

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
  const kinds = ["wood","ore","herb","cloth","leather","water"];
  const tiers = ["t1","t2","t3"];
  const tierLabels = { t1:"T1", t2:"T2", t3:"T3" };

  const table = document.createElement("table");
  table.className = "mat-table";

  // ヘッダ行（左端は Tier、その右に種類）
  const thead = document.createElement("thead");
  const htr = document.createElement("tr");

  const thEmpty = document.createElement("th");
  thEmpty.textContent = "Tier";
  htr.appendChild(thEmpty);

  kinds.forEach(k => {
    const th = document.createElement("th");
    th.textContent = names[k] || k;
    htr.appendChild(th);
  });

  thead.appendChild(htr);
  table.appendChild(thead);

  // ボディ（行=Tier, 列=種類）
  const tbody = document.createElement("tbody");

  tiers.forEach(tKey => {
    const tr = document.createElement("tr");

    const thTier = document.createElement("th");
    thTier.textContent = tierLabels[tKey] || tKey.toUpperCase();
    tr.appendChild(thTier);

    kinds.forEach(k => {
      const td = document.createElement("td");
      let val = 0;

      // materials-core.js のAPIを優先的に使用
      if (typeof getMatTierCount === "function") {
        const tierNum =
          (tKey === "t1") ? 1 :
          (tKey === "t2") ? 2 :
          (tKey === "t3") ? 3 : 1;
        val = getMatTierCount(k, tierNum);
      } else {
        // フォールバック：配列の index から読む
        const mArr = window.materials[k] || [];
        const idx =
          (tKey === "t1") ? 0 :
          (tKey === "t2") ? 1 :
          (tKey === "t3") ? 2 : 0;
        val = mArr[idx] || 0;
      }

      td.textContent = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  box.appendChild(table);
}

// 中間素材テーブルを #intermediateMaterialsList 内に描画
function renderWarehouseIntermediateMaterials() {
  const box = document.getElementById("intermediateMaterialsList");
  if (!box) return;
  if (typeof window.intermediateMats === "undefined" ||
      !Array.isArray(window.INTERMEDIATE_MATERIALS || window.INTERMEDIATE_MATERIALS)) {
    box.textContent = "中間素材はまだありません。";
    return;
  }

  box.innerHTML = "";

  const mats = window.intermediateMats || {};
  const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;

  // 種類ごとに T1/T2/T3 をまとめたいので、id 接頭辞でグルーピング
  // 例: woodPlank_T1/T2/T3 → key = woodPlank
  const groups = {};
  src.forEach(m => {
    const id = m.id;
    if (!id) return;
    const baseKey = id.replace(/_T[123]$/, "");
    if (!groups[baseKey]) {
      groups[baseKey] = {
        name: m.name.replace(/T[123]/, "").trim(), // ざっくり: 表示名から Tn を削る
        t1: 0,
        t2: 0,
        t3: 0
      };
    }
    if (id.endsWith("_T1")) groups[baseKey].t1 += mats[id] || 0;
    else if (id.endsWith("_T2")) groups[baseKey].t2 += mats[id] || 0;
    else if (id.endsWith("_T3")) groups[baseKey].t3 += mats[id] || 0;
    else groups[baseKey].t1 += mats[id] || 0; // ティアなしはT1扱い
  });

  const table = document.createElement("table");
  table.className = "mat-table";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["素材","T1","T2","T3","合計"].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  Object.keys(groups).forEach(key => {
    const g = groups[key];
    const total = g.t1 + g.t2 + g.t3;
    if (total === 0) return;

    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    const tdT1 = document.createElement("td");
    const tdT2 = document.createElement("td");
    const tdT3 = document.createElement("td");
    const tdTotal = document.createElement("td");
    tdName.textContent = g.name || key;
    tdT1.textContent = g.t1;
    tdT2.textContent = g.t2;
    tdT3.textContent = g.t3;
    tdTotal.textContent = total;

    tr.appendChild(tdName);
    tr.appendChild(tdT1);
    tr.appendChild(tdT2);
    tr.appendChild(tdT3);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  box.appendChild(table);
}

// 料理素材テーブルを #cookingMaterialsList 内に描画
function renderWarehouseCookingMaterials() {
  const box = document.getElementById("cookingMaterialsList");
  if (!box) return;
  if (typeof COOKING_MAT_NAMES === "undefined") {
    box.textContent = "料理素材情報がありません。";
    return;
  }

  box.innerHTML = "";

  const mats  = window.cookingMats || {};
  // 将来 quality を導入する前提で、手持ちがあれば cookingMatsQuality を見る
  const quality = window.cookingMatsQuality || {}; // id -> [normal, silver, gold]

  const table = document.createElement("table");
  table.className = "mat-table";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["素材","普通","銀","金","合計"].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  Object.keys(COOKING_MAT_NAMES).forEach(id => {
    const name = COOKING_MAT_NAMES[id] || id;

    const qArr = quality[id] || [0,0,0];
    const normal = (mats[id] || 0) + (qArr[0] || 0); // 旧仕様ぶんは普通に足す
    const silver = qArr[1] || 0;
    const gold   = qArr[2] || 0;
    const total  = normal + silver + gold;
    if (total === 0) return;

    const tr = document.createElement("tr");
    const tdName   = document.createElement("td");
    const tdNormal = document.createElement("td");
    const tdSilver = document.createElement("td");
    const tdGold   = document.createElement("td");
    const tdTotal  = document.createElement("td");
    tdName.textContent   = name;
    tdNormal.textContent = normal;
    tdSilver.textContent = silver;
    tdGold.textContent   = gold;
    tdTotal.textContent  = total;

    tr.appendChild(tdName);
    tr.appendChild(tdNormal);
    tr.appendChild(tdSilver);
    tr.appendChild(tdGold);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  box.appendChild(table);
}