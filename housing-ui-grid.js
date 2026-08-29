// housing-ui-grid.js
// 拠点内の家具置き場グリッドUI専用モジュール
// ・屋内／野外（庭園）エリア切り替え
// ・T3特化住宅による野外増築解放判定
// ・スプリンクラー燃料補給（中間素材水＋所持数最大食材の自動選択）
// ・シードメーカーによる種抽出
// ・家具配置条件（屋内・野外・所属ギルド・スキルLv）の判定

window.housingActiveArea = window.housingActiveArea || "indoor";

// ==============================
// 土地ごとのグリッドレイアウト定義
// ==============================
window.HOUSING_LAYOUTS = window.HOUSING_LAYOUTS || {
  "guildDorm_warrior": { width: 2, height: 2 },
  "cityRoom":          { width: 3, height: 2 },
  "suburbLand":        { width: 3, height: 3 }
};

/**
 * 土地と住宅タイプに応じた幅・高さを取得
 */
function getLandLayoutDimensions(land) {
  if (!land || !land.id) return { width: 2, height: 2 };
  if (land.id === "suburbLand") {
    const hs = (typeof getHousingStateSafe === "function") ? getHousingStateSafe() : (window.housingState || {});
    const houseType = hs && hs.houseType ? hs.houseType : "cottage_rustic";
    const houseDef = window.HOUSING_HOUSES && window.HOUSING_HOUSES[houseType];
    if (houseDef && houseDef.width && houseDef.height) {
      return { width: houseDef.width, height: houseDef.height };
    }
    return { width: 3, height: 3 };
  }
  const layouts = window.HOUSING_LAYOUTS || {};
  return layouts[land.id] || { width: 2, height: 2 };
}

/**
 * 住宅サイズ変更時に家具グリッド配列を拡張・同期する
 */
window.syncHousingGridToHouseSize = function(landId, newWidth, newHeight) {
  const root = getHousingGridStateRoot();
  let state = root[landId];
  if (!state) {
    const slots = [];
    const outdoorSlots = [];
    for (let y = 0; y < newHeight; y++) {
      const row = [];
      const outRow = [];
      for (let x = 0; x < newWidth; x++) {
        row.push(null);
        outRow.push(null);
      }
      slots.push(row);
      outdoorSlots.push(outRow);
    }
    root[landId] = { width: newWidth, height: newHeight, slots, outdoorSlots };
    return;
  }

  const oldSlots = state.slots || [];
  const oldOutdoor = state.outdoorSlots || [];
  const newSlots = [];
  const newOutdoor = [];

  for (let y = 0; y < newHeight; y++) {
    const row = [];
    const outRow = [];
    for (let x = 0; x < newWidth; x++) {
      row.push((oldSlots[y] && oldSlots[y][x]) ? oldSlots[y][x] : null);
      outRow.push((oldOutdoor[y] && oldOutdoor[y][x]) ? oldOutdoor[y][x] : null);
    }
    newSlots.push(row);
    newOutdoor.push(outRow);
  }

  state.width = newWidth;
  state.height = newHeight;
  state.slots = newSlots;
  state.outdoorSlots = newOutdoor;
};

// ==============================
// セーブ用: 家具グリッド状態管理
// ==============================
function getHousingGridStateRoot() {
  let hs;
  if (typeof getHousingStateSafe === "function") {
    hs = getHousingStateSafe();
  } else {
    window.housingState = window.housingState || {};
    hs = window.housingState;
  }

  if (!hs.furnitureGrid) {
    hs.furnitureGrid = {};
  }
  return hs.furnitureGrid;
}

/**
 * 現在の土地用のグリッド状態を取得する（なければ初期生成）。
 */
function getOrInitGridStateForLand(land) {
  if (!land || !land.id) return null;

  const dims = getLandLayoutDimensions(land);
  if (!dims || !dims.width || !dims.height) return null;

  const root = getHousingGridStateRoot();
  let state = root[land.id];

  if (!state) {
    const w = dims.width;
    const h = dims.height;
    const slots = [];
    const outdoorSlots = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      const outRow = [];
      for (let x = 0; x < w; x++) {
        row.push(null);
        outRow.push(null);
      }
      slots.push(row);
      outdoorSlots.push(outRow);
    }
    state = { width: w, height: h, slots, outdoorSlots };
    root[land.id] = state;
  } else {
    if (!Array.isArray(state.outdoorSlots)) {
      state.outdoorSlots = [];
      for (let y = 0; y < state.height; y++) {
        const outRow = [];
        for (let x = 0; x < state.width; x++) {
          outRow.push(null);
        }
        state.outdoorSlots.push(outRow);
      }
    }
    if (state.width !== dims.width || state.height !== dims.height) {
      window.syncHousingGridToHouseSize(land.id, dims.width, dims.height);
      state = root[land.id];
    }
  }

  return state;
}

// 家具アイコン判定
function getFurnitureIcon(fId) {
  if (!fId) return "";
  if (fId.includes("sprinkler")) return "💧";
  if (fId.includes("seed_maker")) return "🌱";
  if (fId.includes("fruit_tree")) return "🌳";
  if (fId.includes("scarecrow")) return "🌾";
  if (fId.includes("training_dummy")) return "🥋";
  if (fId.includes("chest")) return "📦";
  if (fId.includes("worktable")) return "🔨";
  if (fId.includes("bed")) return "🛏️";
  return "🪑";
}

function getFurnitureName(fId) {
  if (!fId) return "";
  if (typeof getItemName === "function") {
    const name = getItemName(fId);
    if (name) return name;
  }
  const meta = (typeof getItemMeta === "function") ? getItemMeta(fId) : null;
  if (meta && meta.name) return meta.name;
  return fId;
}

// 利用可能な所持家具リスト取得
function getAvailableFurnitureList() {
  const list = [];
  const knownFurnitureIds = [
    "item_g_chest_guild",
    "item_g_worktable",
    "item_g_fruit_tree_apple",
    "item_g_scarecrow",
    "item_g_training_dummy"
  ];
  for (let t = 1; t <= 10; t++) {
    knownFurnitureIds.push(`T${t}_bed`);
    knownFurnitureIds.push(`T${t}_sprinkler`);
    knownFurnitureIds.push(`T${t}_seed_maker`);
  }

  knownFurnitureIds.forEach(fId => {
    const count = (typeof getItemCountByMeta === "function") ? getItemCountByMeta(fId) : 0;
    if (count > 0) {
      const meta = (typeof getItemMeta === "function") ? getItemMeta(fId) : null;
      list.push({
        id: fId,
        name: getFurnitureName(fId),
        count: count,
        icon: getFurnitureIcon(fId),
        meta: meta
      });
    }
  });

  return list;
}

// ==============================
// グリッドUI描画
// ==============================
window.renderHousingFurnitureGrid = function(containerEl) {
  if (!containerEl) return;

  if (!window.citizenshipUnlocked) {
    containerEl.innerHTML = "";
    return;
  }

  const currentLand = (typeof getCurrentHousingLand === "function")
    ? getCurrentHousingLand()
    : null;

  containerEl.innerHTML = "";

  if (!currentLand) {
    const msg = document.createElement("div");
    msg.textContent = "拠点を借りると、家具置き場が解放されます。";
    msg.style.fontSize = "11px";
    msg.style.color = "#ccc";
    containerEl.appendChild(msg);
    return;
  }

  const hs = (typeof getHousingStateSafe === "function")
    ? getHousingStateSafe()
    : (window.housingState || null);
  if (hs && hs.rentUnpaid) {
    const msg = document.createElement("div");
    msg.textContent = "家賃滞納中のため、家具置き場は使用できません。";
    msg.style.fontSize = "11px";
    msg.style.color = "#f88";
    containerEl.appendChild(msg);
    return;
  }

  const gridState = getOrInitGridStateForLand(currentLand);
  if (!gridState) {
    const msg = document.createElement("div");
    msg.textContent = "この拠点には、いまのところ家具置き場はありません。";
    msg.style.fontSize = "11px";
    msg.style.color = "#ccc";
    containerEl.appendChild(msg);
    return;
  }

  const isOutdoorUnlocked = (typeof window.isHousingOutdoorUnlocked === "function")
    ? window.isHousingOutdoorUnlocked()
    : false;

  // ===== エリア切り替えタブ =====
  const tabRow = document.createElement("div");
  tabRow.style.display = "flex";
  tabRow.style.gap = "8px";
  tabRow.style.marginBottom = "8px";

  const indoorBtn = document.createElement("button");
  indoorBtn.textContent = "🏠 屋内フロア";
  indoorBtn.className = "tab-btn";
  indoorBtn.style.padding = "4px 12px";
  indoorBtn.style.fontSize = "12px";
  indoorBtn.style.fontWeight = "bold";
  indoorBtn.style.cursor = "pointer";
  indoorBtn.style.borderRadius = "4px";
  indoorBtn.style.border = (window.housingActiveArea === "indoor") ? "2px solid #ecc94b" : "1px solid #4a5568";
  indoorBtn.style.background = (window.housingActiveArea === "indoor") ? "#2d3748" : "#1a202c";
  indoorBtn.style.color = (window.housingActiveArea === "indoor") ? "#ecc94b" : "#a0aec0";
  indoorBtn.addEventListener("click", () => {
    window.housingActiveArea = "indoor";
    window.renderHousingFurnitureGrid(containerEl);
  });
  tabRow.appendChild(indoorBtn);

  const outdoorBtn = document.createElement("button");
  outdoorBtn.textContent = isOutdoorUnlocked ? "🌳 野外（庭園フロア）" : "🔒 野外（増築必要）";
  outdoorBtn.className = "tab-btn";
  outdoorBtn.style.padding = "4px 12px";
  outdoorBtn.style.fontSize = "12px";
  outdoorBtn.style.fontWeight = "bold";
  outdoorBtn.style.cursor = "pointer";
  outdoorBtn.style.borderRadius = "4px";
  outdoorBtn.style.border = (window.housingActiveArea === "outdoor") ? "2px solid #48bb78" : "1px solid #4a5568";
  outdoorBtn.style.background = (window.housingActiveArea === "outdoor") ? "#1c4532" : "#1a202c";
  outdoorBtn.style.color = (window.housingActiveArea === "outdoor") ? "#68d391" : "#a0aec0";
  outdoorBtn.addEventListener("click", () => {
    window.housingActiveArea = "outdoor";
    window.renderHousingFurnitureGrid(containerEl);
  });
  tabRow.appendChild(outdoorBtn);

  containerEl.appendChild(tabRow);

  const currentArea = window.housingActiveArea;

  // ===== 野外が未解放の場合の表示 =====
  if (currentArea === "outdoor" && !isOutdoorUnlocked) {
    const lockBox = document.createElement("div");
    lockBox.style.padding = "12px";
    lockBox.style.background = "#1a1622";
    lockBox.style.border = "1px dashed #9f7aea";
    lockBox.style.borderRadius = "6px";
    lockBox.style.color = "#d6bcfa";
    lockBox.style.fontSize = "12px";
    lockBox.style.lineHeight = "1.6";

    const curHs = (typeof getHousingStateSafe === "function") ? getHousingStateSafe() : (window.housingState || {});
    const t3SpecializedHouses = ["mansion_warrior", "lodge_harvester", "workshop_artisan"];
    const hasSpecialized = t3SpecializedHouses.includes(curHs.houseType);

    lockBox.innerHTML = `
      <div style="font-weight:bold; font-size:13px; color:#faf089; margin-bottom:4px;">🔒【野外（庭園フロア）未増築】</div>
      <div>野外スペースは、<strong>郊外の土地</strong>で<strong>T3素材による特化住宅</strong>（戦士の鍛錬屋敷 / 収穫の園ロッジ / 職人の工房邸）を建築した後に、<strong>野外（庭園）増築</strong>を行うことで解放されます。</div>
      <div style="font-size:11px; color:#a0aec0; margin-top:6px;">
        現在の進行状況: ${hasSpecialized ? '<span style="color:#68d391; font-weight:bold;">✓ 特化住宅建築済み（住宅建築メニューから「野外増築」を実行してください）</span>' : '<span style="color:#fc8181;">× 先に特化住宅を建築してください</span>'}
      </div>
      <div style="font-size:11px; color:#a0aec0; margin-top:4px;">※解放されると、スプリンクラーや果樹苗木、かかしなどの野外専用設備を配置して農園を自動化・強化できます。</div>
    `;
    containerEl.appendChild(lockBox);
    return;
  }

  // ===== タイトル =====
  const title = document.createElement("div");
  title.textContent = (currentArea === "outdoor")
    ? "🌳 野外（庭園フロア） - スプリンクラー・果樹・案山子などを配置して農場と連携"
    : "🏠 屋内フロア - ベッド・収納チェスト・作業台などを配置";
  title.style.fontSize = "11px";
  title.style.marginBottom = "6px";
  title.style.color = (currentArea === "outdoor") ? "#9ae6b4" : "#c0bedf";
  containerEl.appendChild(title);

  // ===== グリッド本体 =====
  const activeSlots = (currentArea === "outdoor") ? gridState.outdoorSlots : gridState.slots;

  const gridWrapper = document.createElement("div");
  gridWrapper.className = "housing-grid-wrapper";
  gridWrapper.style.display = "inline-block";
  gridWrapper.style.padding = "6px";
  gridWrapper.style.border = (currentArea === "outdoor") ? "1px solid #2f855a" : "1px solid #555";
  gridWrapper.style.borderRadius = "6px";
  gridWrapper.style.background = (currentArea === "outdoor") ? "#0c1a12" : "#10101a";

  const grid = document.createElement("div");
  grid.className = "housing-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${gridState.width}, 40px)`;
  grid.style.gridTemplateRows = `repeat(${gridState.height}, 40px)`;
  grid.style.gap = "4px";

  for (let y = 0; y < gridState.height; y++) {
    for (let x = 0; x < gridState.width; x++) {
      const cell = document.createElement("div");
      cell.className = "housing-grid-cell";
      cell.style.width = "40px";
      cell.style.height = "40px";
      cell.style.border = (currentArea === "outdoor") ? "1px solid #22543d" : "1px solid #333348";
      cell.style.borderRadius = "4px";
      cell.style.background = (currentArea === "outdoor") ? "#13271d" : "#181824";
      cell.style.boxSizing = "border-box";
      cell.style.display = "flex";
      cell.style.flexDirection = "column";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.fontSize = "16px";
      cell.style.cursor = "pointer";
      cell.style.userSelect = "none";
      cell.style.transition = "border-color 0.15s, background-color 0.15s";
      cell.style.position = "relative";

      const rawCellVal = activeSlots[y][x];
      const slotId = (typeof rawCellVal === "string") ? rawCellVal : (rawCellVal ? rawCellVal.id : null);
      const fuelVal = (rawCellVal && typeof rawCellVal === "object" && typeof rawCellVal.fuel === "number") ? rawCellVal.fuel : 0;

      if (!slotId) {
        cell.textContent = "＋";
        cell.style.fontSize = "13px";
        cell.style.color = (currentArea === "outdoor") ? "#2f855a" : "#444455";
        cell.title = `(${x + 1}, ${y + 1}) 空きマス（クリックして家具設置）`;
      } else {
        cell.textContent = getFurnitureIcon(slotId);
        cell.style.background = (currentArea === "outdoor") ? "#1c4532" : "#222238";
        cell.style.borderColor = (currentArea === "outdoor") ? "#48bb78" : "#6655aa";
        cell.title = `(${x + 1}, ${y + 1}) ${getFurnitureName(slotId)}（クリックで詳細/操作/撤去）`;

        // スプリンクラーの場合は燃料残量バッジを表示
        if (slotId.includes("sprinkler")) {
          const badge = document.createElement("span");
          badge.style.position = "absolute";
          badge.style.bottom = "1px";
          badge.style.right = "2px";
          badge.style.fontSize = "9px";
          badge.style.fontWeight = "bold";
          badge.style.color = fuelVal > 0 ? "#63b3ed" : "#fc8181";
          badge.textContent = `${fuelVal}`;
          cell.appendChild(badge);
        }
      }

      cell.addEventListener("mouseenter", () => {
        cell.style.borderColor = "#9988ff";
      });
      cell.addEventListener("mouseleave", () => {
        cell.style.borderColor = slotId ? ((currentArea === "outdoor") ? "#48bb78" : "#6655aa") : ((currentArea === "outdoor") ? "#22543d" : "#333348");
      });

      cell.addEventListener("click", () => {
        const detailContainer = document.getElementById("housing-furniture-cell-detail");
        if (!detailContainer) return;
        detailContainer.innerHTML = "";

        const currentCell = activeSlots[y][x];
        const curId = (typeof currentCell === "string") ? currentCell : (currentCell ? currentCell.id : null);
        const curFuel = (currentCell && typeof currentCell === "object" && typeof currentCell.fuel === "number") ? currentCell.fuel : 0;

        const panel = document.createElement("div");
        panel.style.marginTop = "8px";
        panel.style.padding = "10px 14px";
        panel.style.background = "#161622";
        panel.style.border = "1px solid #443366";
        panel.style.borderRadius = "6px";
        panel.style.fontSize = "12px";

        if (curId != null) {
          const fName = getFurnitureName(curId);
          const fIcon = getFurnitureIcon(curId);
          const meta = (typeof getItemMeta === "function") ? getItemMeta(curId) : null;
          const desc = (meta && meta.desc) ? meta.desc : "拠点に設置された設備・家具です。";

          const header = document.createElement("div");
          header.style.display = "flex";
          header.style.justifyContent = "space-between";
          header.style.alignItems = "center";
          header.style.marginBottom = "6px";
          header.innerHTML = `
            <div style="font-weight:bold; color:#ffda6a; font-size:13px;">${fIcon} ${fName}（位置: ${x + 1}, ${y + 1}）</div>
            <div style="font-size:11px; color:#a0aec0;">${currentArea === "outdoor" ? "🌳 野外フロア" : "🏠 屋内フロア"}</div>
          `;
          panel.appendChild(header);

          const descBox = document.createElement("div");
          descBox.style.color = "#bbb";
          descBox.style.fontSize = "11px";
          descBox.style.marginBottom = "10px";
          descBox.style.lineHeight = "1.5";
          descBox.textContent = desc;
          panel.appendChild(descBox);

          // ==============================
          // スプリンクラー専用操作：燃料補給
          // ==============================
          if (curId.includes("sprinkler")) {
            const spkMeta = meta && meta.sprinkler;
            const maxFuel = (spkMeta && spkMeta.maxFuel) ? spkMeta.maxFuel : 25;

            const fuelSection = document.createElement("div");
            fuelSection.style.background = "#0f1d2a";
            fuelSection.style.border = "1px solid #2b6cb0";
            fuelSection.style.borderRadius = "6px";
            fuelSection.style.padding = "8px 10px";
            fuelSection.style.marginBottom = "10px";

            fuelSection.innerHTML = `
              <div style="font-weight:bold; color:#63b3ed; margin-bottom:4px;">💧 自動散水燃料システム</div>
              <div style="font-size:11px; color:#cbd5e0; margin-bottom:6px;">
                現在の燃料残量: <strong>${curFuel}</strong> / ${maxFuel} 回分
                ${curFuel <= 0 ? '<span style="color:#fc8181; font-weight:bold;">（燃料切れ: 自動散水停止中）</span>' : '<span style="color:#68d391;">（自動散水稼働中）</span>'}
              </div>
            `;

            // 燃料補給用フォーム
            const refuelForm = document.createElement("div");
            refuelForm.style.display = "flex";
            refuelForm.style.flexDirection = "column";
            refuelForm.style.gap = "6px";
            refuelForm.style.marginTop = "6px";

            // 水の選択肢（中間素材）
            const waterRow = document.createElement("div");
            waterRow.style.display = "flex";
            waterRow.style.alignItems = "center";
            waterRow.style.gap = "6px";
            waterRow.innerHTML = `<span style="font-size:11px; color:#90cdf4; min-width:60px;">水素材:</span>`;

            const waterSel = document.createElement("select");
            waterSel.style.background = "#1a202c";
            waterSel.style.color = "#edf2f7";
            waterSel.style.border = "1px solid #4a5568";
            waterSel.style.borderRadius = "4px";
            waterSel.style.padding = "2px 6px";
            waterSel.style.fontSize = "11px";

            let hasAnyWater = false;
            for (let t = 1; t <= 10; t++) {
              const wId = `T${t}_distilledWater`;
              const count = (typeof getItemCountByMeta === "function") ? getItemCountByMeta(wId) : 0;
              if (count > 0) {
                const opt = document.createElement("option");
                opt.value = wId;
                opt.textContent = `${getFurnitureName(wId)}（所持: ${count}）`;
                waterSel.appendChild(opt);
                hasAnyWater = true;
              }
            }
            if (!hasAnyWater) {
              const opt = document.createElement("option");
              opt.value = "";
              opt.textContent = "中間素材の水（T1〜T10精製水など）がありません";
              waterSel.appendChild(opt);
            }
            waterRow.appendChild(waterSel);
            refuelForm.appendChild(waterRow);

            // 食材の選択肢（最も持っている食材をデフォルト選択）
            const foodRow = document.createElement("div");
            foodRow.style.display = "flex";
            foodRow.style.alignItems = "center";
            foodRow.style.gap = "6px";
            foodRow.innerHTML = `<span style="font-size:11px; color:#90cdf4; min-width:60px;">燃料食材:</span>`;

            const foodSel = document.createElement("select");
            foodSel.style.background = "#1a202c";
            foodSel.style.color = "#edf2f7";
            foodSel.style.border = "1px solid #4a5568";
            foodSel.style.borderRadius = "4px";
            foodSel.style.padding = "2px 6px";
            foodSel.style.fontSize = "11px";

            let topFoodId = null;
            let topFoodCount = -1;
            let hasAnyFood = false;

            if (typeof cookingMats === "object") {
              const foodEntries = [];
              Object.keys(cookingMats).forEach(cId => {
                const entry = cookingMats[cId];
                const count = (entry && typeof entry === "object" && typeof entry.total === "number")
                  ? entry.total
                  : (typeof entry === "number" ? entry : 0);
                if (count > 0) {
                  foodEntries.push({ id: cId, count: count, name: getFurnitureName(cId) });
                  if (count > topFoodCount) {
                    topFoodCount = count;
                    topFoodId = cId;
                  }
                }
              });

              // 所持数が多い順にソート
              foodEntries.sort((a, b) => b.count - a.count);

              foodEntries.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item.id;
                opt.textContent = `${item.name}（所持: ${item.count}）`;
                foodSel.appendChild(opt);
                hasAnyFood = true;
              });
            }

            if (!hasAnyFood) {
              const opt = document.createElement("option");
              opt.value = "";
              opt.textContent = "食材を持っていません";
              foodSel.appendChild(opt);
            } else if (topFoodId) {
              foodSel.value = topFoodId; // 最も持っている食材を初期選択
            }
            foodRow.appendChild(foodSel);
            refuelForm.appendChild(foodRow);

            // 補給ボタン
            const refuelBtn = document.createElement("button");
            refuelBtn.className = "smallBtn";
            refuelBtn.style.padding = "4px 10px";
            refuelBtn.style.marginTop = "4px";
            refuelBtn.style.background = (hasAnyWater && hasAnyFood) ? "#2b6cb0" : "#4a5568";
            refuelBtn.style.color = "#bee3f8";
            refuelBtn.style.borderColor = "#3182ce";
            refuelBtn.style.fontWeight = "bold";
            refuelBtn.textContent = `💧 水1個＋食材1個で燃料補給（+20回分）`;
            refuelBtn.disabled = (!hasAnyWater || !hasAnyFood);

            refuelBtn.addEventListener("click", () => {
              const selectedWater = waterSel.value;
              const selectedFood = foodSel.value;
              if (!selectedWater || !selectedFood) return;

              // 消費処理
              if (typeof consumeItemByMeta === "function") {
                consumeItemByMeta(selectedWater, 1);
                consumeItemByMeta(selectedFood, 1);
              }

              const newFuel = Math.min(maxFuel, curFuel + 20);
              activeSlots[y][x] = { id: curId, fuel: newFuel };

              const waterName = getFurnitureName(selectedWater);
              const foodName = getFurnitureName(selectedFood);
              if (typeof appendLog === "function") {
                appendLog(`💧【スプリンクラー給水】${waterName}と${foodName}を装填し、散水燃料を補給しました！（残量: ${newFuel}/${maxFuel}）`);
              }

              window.renderHousingFurnitureGrid(containerEl);
            });

            refuelForm.appendChild(refuelBtn);
            fuelSection.appendChild(refuelForm);
            panel.appendChild(fuelSection);
          }

          // ==============================
          // シードメーカー専用操作：種抽出
          // ==============================
          if (curId.includes("seed_maker")) {
            const smSection = document.createElement("div");
            smSection.style.background = "#142517";
            smSection.style.border = "1px solid #276749";
            smSection.style.borderRadius = "6px";
            smSection.style.padding = "8px 10px";
            smSection.style.marginBottom = "10px";

            smSection.innerHTML = `
              <div style="font-weight:bold; color:#68d391; margin-bottom:4px;">🌱 種抽出（シードメーカー）</div>
              <div style="font-size:11px; color:#cbd5e0; margin-bottom:6px;">
                作物を1つ投入して種を抽出し、2〜3個に増殖します。
              </div>
            `;

            const smRow = document.createElement("div");
            smRow.style.display = "flex";
            smRow.style.alignItems = "center";
            smRow.style.gap = "6px";

            const cropSel = document.createElement("select");
            cropSel.style.background = "#1a202c";
            cropSel.style.color = "#edf2f7";
            cropSel.style.border = "1px solid #4a5568";
            cropSel.style.borderRadius = "4px";
            cropSel.style.padding = "2px 6px";
            cropSel.style.fontSize = "11px";

            let hasCrops = false;
            if (typeof cookingMats === "object" && typeof getAllItemMeta === "function") {
              const growableIds = getAllItemMeta()
                .filter(m => m && m.category === "cookingMat" && m.farmGrowable)
                .map(m => m.id);

              growableIds.forEach(cId => {
                const entry = cookingMats[cId];
                const count = (entry && typeof entry === "object" && typeof entry.total === "number")
                  ? entry.total
                  : (typeof entry === "number" ? entry : 0);
                if (count > 0) {
                  const opt = document.createElement("option");
                  opt.value = cId;
                  opt.textContent = `${getFurnitureName(cId)}（所持: ${count}）`;
                  cropSel.appendChild(opt);
                  hasCrops = true;
                }
              });
            }

            if (!hasCrops) {
              const opt = document.createElement("option");
              opt.value = "";
              opt.textContent = "畑で育てられる作物の在庫がありません";
              cropSel.appendChild(opt);
            }
            smRow.appendChild(cropSel);

            const extractBtn = document.createElement("button");
            extractBtn.className = "smallBtn";
            extractBtn.style.padding = "3px 8px";
            extractBtn.style.background = hasCrops ? "#276749" : "#4a5568";
            extractBtn.style.color = "#c6f6d5";
            extractBtn.style.borderColor = "#2f855a";
            extractBtn.style.fontWeight = "bold";
            extractBtn.textContent = "種を抽出する";
            extractBtn.disabled = !hasCrops;

            extractBtn.addEventListener("click", () => {
              const cId = cropSel.value;
              if (!cId) return;
              const tier = (meta && meta.tier) || 1;
              if (typeof window.processSeedMakerExtraction === "function") {
                window.processSeedMakerExtraction(cId, tier);
              }
              window.renderHousingFurnitureGrid(containerEl);
            });

            smRow.appendChild(extractBtn);
            smSection.appendChild(smRow);
            panel.appendChild(smSection);
          }

          // 撤去ボタン
          const removeBtn = document.createElement("button");
          removeBtn.className = "smallBtn";
          removeBtn.textContent = "この設備・家具を撤去する（インベントリに戻す）";
          removeBtn.style.padding = "4px 10px";
          removeBtn.style.background = "#4a2020";
          removeBtn.style.color = "#ffaaaa";
          removeBtn.style.borderColor = "#7a3030";
          removeBtn.addEventListener("click", () => {
            if (typeof addItemByMeta === "function") {
              addItemByMeta(curId, 1);
            }
            activeSlots[y][x] = null;
            if (typeof appendLog === "function") {
              appendLog(`🏠【家具撤去】「${fName}」を撤去し、手持ちに戻しました。`);
            }
            window.renderHousingFurnitureGrid(containerEl);
          });
          panel.appendChild(removeBtn);

        } else {
          // ==============================
          // 空きマス：所持家具リストを表示
          // ==============================
          const availList = getAvailableFurnitureList();
          panel.innerHTML = `
            <div style="font-weight:bold; color:#c0bedf; margin-bottom:6px;">
              📦 設置する家具を選択（${currentArea === "outdoor" ? "🌳 野外フロア" : "🏠 屋内フロア"} 位置: ${x + 1}, ${y + 1}）:
            </div>
          `;

          if (availList.length === 0) {
            const noMsg = document.createElement("div");
            noMsg.style.color = "#888";
            noMsg.style.fontSize = "11px";
            noMsg.textContent = "設置可能な家具を所持していません。（クラフトの家具タブやギルド交換所で入手できます）";
            panel.appendChild(noMsg);
          } else {
            const selectRow = document.createElement("div");
            selectRow.style.display = "flex";
            selectRow.style.flexDirection = "column";
            selectRow.style.gap = "4px";

            availList.forEach(item => {
              // 配置制限チェック
              const check = (typeof window.canPlaceFurnitureInArea === "function")
                ? window.canPlaceFurnitureInArea(item.id, currentArea)
                : { ok: true };

              const itemBtn = document.createElement("button");
              itemBtn.className = "smallBtn";
              itemBtn.style.textAlign = "left";
              itemBtn.style.padding = "4px 8px";
              itemBtn.style.borderRadius = "4px";

              if (check.ok) {
                itemBtn.style.background = "#202030";
                itemBtn.style.color = "#ffd700";
                itemBtn.style.borderColor = "#443366";
                itemBtn.textContent = `${item.icon} ${item.name}（所持: ${item.count}個）を設置`;
                itemBtn.addEventListener("click", () => {
                  if (typeof consumeItemByMeta === "function") {
                    consumeItemByMeta(item.id, 1);
                  }
                  // スプリンクラーなら初期燃料20セット
                  if (item.id.includes("sprinkler")) {
                    activeSlots[y][x] = { id: item.id, fuel: 20 };
                  } else {
                    activeSlots[y][x] = item.id;
                  }
                  if (typeof appendLog === "function") {
                    appendLog(`🏠【家具設置】「${item.name}」を設置しました！`);
                  }
                  window.renderHousingFurnitureGrid(containerEl);
                });
              } else {
                itemBtn.style.background = "#1a1a24";
                itemBtn.style.color = "#718096";
                itemBtn.style.borderColor = "#2d3748";
                itemBtn.style.cursor = "not-allowed";
                itemBtn.disabled = true;
                itemBtn.textContent = `${item.icon} ${item.name} [設置不可: ${check.reason}]`;
              }

              selectRow.appendChild(itemBtn);
            });
            panel.appendChild(selectRow);
          }
        }

        detailContainer.appendChild(panel);
      });

      grid.appendChild(cell);
    }
  }

  gridWrapper.appendChild(grid);
  containerEl.appendChild(gridWrapper);

  const detailArea = document.createElement("div");
  detailArea.id = "housing-furniture-cell-detail";
  containerEl.appendChild(detailArea);
};
