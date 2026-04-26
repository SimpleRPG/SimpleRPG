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
  title.textContent = "家具置き場";
  title.style.fontSize = "11px";
  title.style.marginBottom = "4px";
  title.style.color = "#c0bedf";
  containerEl.appendChild(title);

  // ===== グリッド本体（外枠ラッパー＋内側グリッド） =====
  const gridWrapper = document.createElement("div");
  gridWrapper.className = "housing-grid-wrapper";
  gridWrapper.style.display = "inline-block";
  gridWrapper.style.padding = "2px";
  gridWrapper.style.border = "1px solid #555";
  gridWrapper.style.borderRadius = "2px";
  gridWrapper.style.background = "#10101a";

  const grid = document.createElement("div");
  grid.className = "housing-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${gridState.width}, 32px)`;
  grid.style.gridTemplateRows = `repeat(${gridState.height}, 32px)`;
  grid.style.gap = "2px";

  for (let y = 0; y < gridState.height; y++) {
    for (let x = 0; x < gridState.width; x++) {
      const cell = document.createElement("div");
      cell.className = "housing-grid-cell";
      cell.style.width = "32px";
      cell.style.height = "32px";
      // セルは外枠だけに見せたいので枠線は付けない
      cell.style.border = "none";
      cell.style.background = "#181824";
      cell.style.boxSizing = "border-box";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.fontSize = "10px";
      cell.style.color = "#888";

      const slotVal = gridState.slots[y][x];

      if (slotVal == null) {
        // いまは空きマスだけ。見た目は空白のまま
        cell.textContent = "";
        cell.title = `(${x}, ${y}) 家具置き場（未使用）`;
      } else {
        // 将来: 家具IDなどを入れる想定（デバッグ表示）
        cell.textContent = "?";
        cell.title = `(${x}, ${y}) 家具: ${String(slotVal)}`;
      }

      // 将来ここで「家具を選ぶダイアログ」を出すことを想定。
      // cell.addEventListener("click", () => { ... });

      grid.appendChild(cell);
    }
  }

  gridWrapper.appendChild(grid);
  containerEl.appendChild(gridWrapper);

  // 将来、簡単な説明を下部に追加してもよい
  const hint = document.createElement("div");
  hint.textContent = "※ 将来アップデートで、ここに家具を設置できるようになります。";
  hint.style.fontSize = "10px";
  hint.style.marginTop = "2px";
  hint.style.color = "#666";
  containerEl.appendChild(hint);
};