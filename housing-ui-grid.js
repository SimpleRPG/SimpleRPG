// housing-ui-grid.js
// 拠点内の家具置き場グリッドUI専用モジュール
// ・土地ごとのグリッドサイズ定義（2x2 / 2x3 / 3x3）
// ・housingState へのセーブ用スロット配列の管理
// ・game-ui-4.js から呼ばれる描画関数 renderHousingFurnitureGrid(containerEl)

// ==============================
// 土地ごとのグリッドレイアウト定義
// ==============================
//
// 1マス = 家具1つ分 のシンプルな前提。
// 将来、郊外の土地は建物種類や増築で width/height を増やすことを想定。

window.HOUSING_LAYOUTS = window.HOUSING_LAYOUTS || {
  // ギルド寮（仮: guildDorm_warrior のみ想定）
  "guildDorm_warrior": {
    width:  2,
    height: 2
  },

  // 街の一室
  "cityRoom": {
    width:  3,
    height: 2
  },

  // 郊外の土地（3x3 からスタート、將来拡張予定）
  "suburbLand": {
    width:  3,
    height: 3
  }
};

// ==============================
// セーブ用: 家具グリッド状態管理
// ==============================
//
// housingState に furnitureGrid をぶら下げて、
// landId ごとに { width, height, slots } を保存する。
// まだ家具は未実装なので slots[y][x] は null のまま。

function getHousingGridStateRoot() {
  // housing-core.js 側のセーフヘルパーがあればそれを使う
  let hs;
  if (typeof getHousingStateSafe === "function") {
    hs = getHousingStateSafe();
  } else {
    window.housingState = window.housingState || {};
    hs = window.housingState;
  }

  if (!hs.furnitureGrid) {
    hs.furnitureGrid = {}; // landId -> { width,height, slots: [][] }
  }
  return hs.furnitureGrid;
}

/**
 * 現在の土地用のグリッド状態を取得する（なければ初期生成）。
 * @param {object} land 現在借りている土地（getCurrentHousingLand の戻り値想定）
 * @returns {object|null} { width,height,slots } or null
 */
function getOrInitGridStateForLand(land) {
  if (!land || !land.id) return null;

  const layouts = window.HOUSING_LAYOUTS || {};
  const layout = layouts[land.id];
  if (!layout || !layout.width || !layout.height) return null;

  const root = getHousingGridStateRoot();
  let state = root[land.id];

  // まだ状態がなければ初期化
  if (!state) {
    const w = layout.width;
    const h = layout.height;
    const slots = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        row.push(null); // いまは何も置かれていない
      }
      slots.push(row);
    }
    state = { width: w, height: h, slots };
    root[land.id] = state;
  }

  return state;
}

// ==============================
// グリッドUI描画
// ==============================
//
// 拠点UI側（game-ui-4.js）から、containerEl を渡して呼んでもらう。
// 例: const area = document.getElementById("housingFurnitureArea");
//     renderHousingFurnitureGrid(area);

window.renderHousingFurnitureGrid = function(containerEl) {
  if (!containerEl) return;

  // 市民権がない / 拠点タブがロック中のときは何も出さない（念のため）
  if (!window.citizenshipUnlocked) {
    containerEl.innerHTML = "";
    return;
  }

  // 現在の土地を取得
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

  // 滞納中はグリッドも触らせない（UIロック仕様に合わせる）
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

  // ===== タイトル =====
  const title = document.createElement("div");
  title.textContent = "家具置き場（マスをクリックして設置・撤去）";
  title.style.fontSize = "11px";
  title.style.marginBottom = "4px";
  title.style.color = "#c0bedf";
  containerEl.appendChild(title);

  // ===== グリッド本体（外枠ラッパー＋内側グリッド） =====
  const gridWrapper = document.createElement("div");
  gridWrapper.className = "housing-grid-wrapper";
  gridWrapper.style.display = "inline-block";
  gridWrapper.style.padding = "4px";
  gridWrapper.style.border = "1px solid #555";
  gridWrapper.style.borderRadius = "4px";
  gridWrapper.style.background = "#10101a";

  const grid = document.createElement("div");
  grid.className = "housing-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${gridState.width}, 36px)`;
  grid.style.gridTemplateRows = `repeat(${gridState.height}, 36px)`;
  grid.style.gap = "4px";

  // 家具アイコン判定
  function getFurnitureIcon(fId) {
    if (!fId) return "";
    if (fId.includes("chest")) return "📦";
    if (fId.includes("worktable")) return "🔨";
    if (fId.includes("bed")) return "🛏️";
    return "🪑";
  }

  function getFurnitureName(fId) {
    if (!fId) return "";
    if (typeof getItemName === "function") {
      return getItemName(fId);
    }
    if (fId === "item_g_chest_guild") return "ギルド特製収納チェスト";
    if (fId === "item_g_worktable") return "ギルド特製職人作業台";
    return fId;
  }

  // 利用可能な所持家具リスト取得
  function getAvailableFurnitureList() {
    const list = [];
    const knownFurnitureIds = [
      "item_g_chest_guild",
      "item_g_worktable"
    ];
    for (let t = 1; t <= 10; t++) {
      knownFurnitureIds.push(`T${t}_bed`);
    }

    knownFurnitureIds.forEach(fId => {
      const count = (typeof getItemCountByMeta === "function") ? getItemCountByMeta(fId) : 0;
      if (count > 0) {
        list.push({ id: fId, name: getFurnitureName(fId), count: count, icon: getFurnitureIcon(fId) });
      }
    });

    return list;
  }

  for (let y = 0; y < gridState.height; y++) {
    for (let x = 0; x < gridState.width; x++) {
      const cell = document.createElement("div");
      cell.className = "housing-grid-cell";
      cell.style.width = "36px";
      cell.style.height = "36px";
      cell.style.border = "1px solid #333348";
      cell.style.borderRadius = "3px";
      cell.style.background = "#181824";
      cell.style.boxSizing = "border-box";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.fontSize = "16px";
      cell.style.cursor = "pointer";
      cell.style.userSelect = "none";
      cell.style.transition = "border-color 0.15s, background-color 0.15s";

      const slotVal = gridState.slots[y][x];

      if (slotVal == null) {
        cell.textContent = "＋";
        cell.style.fontSize = "13px";
        cell.style.color = "#444455";
        cell.title = `(${x + 1}, ${y + 1}) 空きマス（クリックして家具設置）`;
      } else {
        cell.textContent = getFurnitureIcon(slotVal);
        cell.style.background = "#222238";
        cell.style.borderColor = "#6655aa";
        cell.title = `(${x + 1}, ${y + 1}) ${getFurnitureName(slotVal)}（クリックで詳細/撤去）`;
      }

      cell.addEventListener("mouseenter", () => {
        cell.style.borderColor = "#9988ff";
      });
      cell.addEventListener("mouseleave", () => {
        cell.style.borderColor = slotVal ? "#6655aa" : "#333348";
      });

      cell.addEventListener("click", () => {
        const detailContainer = document.getElementById("housing-furniture-cell-detail");
        if (!detailContainer) return;
        detailContainer.innerHTML = "";

        const currentVal = gridState.slots[y][x];
        const panel = document.createElement("div");
        panel.style.marginTop = "8px";
        panel.style.padding = "8px 12px";
        panel.style.background = "#161622";
        panel.style.border = "1px solid #443366";
        panel.style.borderRadius = "4px";
        panel.style.fontSize = "12px";

        if (currentVal != null) {
          const fName = getFurnitureName(currentVal);
          const fIcon = getFurnitureIcon(currentVal);
          let effectDesc = "自宅に設置された家具です。";
          if (currentVal === "item_g_chest_guild") {
            effectDesc = "【ギルド特製収納チェスト】頑丈な収納箱。自宅に設置して素材や装備を整理・保管できます。";
          } else if (currentVal === "item_g_worktable") {
            effectDesc = "【ギルド特製職人作業台】高品質な作業台。クラフト時の成功率が+5%上昇します。";
          } else if (currentVal.includes("bed")) {
            effectDesc = "【ベッド】休憩時にHP・MPを全快し、生活バフを付与します。";
          }

          panel.innerHTML = `
            <div style="font-weight:bold; color:#ffda6a; margin-bottom:4px;">${fIcon} ${fName}（位置: ${x + 1}, ${y + 1}）</div>
            <div style="color:#bbb; font-size:11px; margin-bottom:8px;">${effectDesc}</div>
          `;

          const removeBtn = document.createElement("button");
          removeBtn.className = "smallBtn";
          removeBtn.textContent = "この家具を撤去する（インベントリに戻す）";
          removeBtn.style.padding = "4px 10px";
          removeBtn.style.background = "#4a2020";
          removeBtn.style.color = "#ffaaaa";
          removeBtn.style.borderColor = "#7a3030";
          removeBtn.addEventListener("click", () => {
            if (typeof addItemByMeta === "function") {
              addItemByMeta(currentVal, 1);
            }
            gridState.slots[y][x] = null;
            if (typeof appendLog === "function") {
              appendLog(`🏠【家具撤去】「${fName}」を撤去し、手持ちに戻しました。`);
            }
            renderHousingFurnitureGrid(containerEl);
          });
          panel.appendChild(removeBtn);
        } else {
          // 空きマス：所持家具リストを表示
          const availList = getAvailableFurnitureList();
          panel.innerHTML = `<div style="font-weight:bold; color:#c0bedf; margin-bottom:6px;">📦 設置する家具を選択（位置: ${x + 1}, ${y + 1}）:</div>`;

          if (availList.length === 0) {
            const noMsg = document.createElement("div");
            noMsg.style.color = "#888";
            noMsg.style.fontSize = "11px";
            noMsg.textContent = "設置可能な家具を所持していません。（ギルド交換所などで家具を入手できます）";
            panel.appendChild(noMsg);
          } else {
            const selectRow = document.createElement("div");
            selectRow.style.display = "flex";
            selectRow.style.flexDirection = "column";
            selectRow.style.gap = "4px";

            availList.forEach(item => {
              const itemBtn = document.createElement("button");
              itemBtn.className = "smallBtn";
              itemBtn.style.textAlign = "left";
              itemBtn.style.padding = "4px 8px";
              itemBtn.style.background = "#202030";
              itemBtn.style.color = "#ffd700";
              itemBtn.style.borderColor = "#443366";
              itemBtn.textContent = `${item.icon} ${item.name}（所持: ${item.count}個）を設置`;
              itemBtn.addEventListener("click", () => {
                if (typeof consumeItemByMeta === "function") {
                  consumeItemByMeta(item.id, 1);
                }
                gridState.slots[y][x] = item.id;
                if (typeof appendLog === "function") {
                  appendLog(`🏠【家具設置】「${item.name}」を設置しました！`);
                }
                renderHousingFurnitureGrid(containerEl);
              });
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