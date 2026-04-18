// game-ui-4.js
// ステータス画面（基本情報 / 採取統計 / スキルツリー）＋ハウジング表示

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
    row.style.fontSize = "11px";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${def.label} Lv${level}`;
    row.appendChild(labelSpan);

    const modeLabel = document.createElement("span");
    let modeText = "ノーマル";
    if (mode === "quantity") modeText = "量特化";
    else if (mode === "quality") modeText = "質特化";
    modeLabel.textContent = `（${modeText}）`;
    modeLabel.style.color = "#c0bedf";
    row.appendChild(modeLabel);

    const upBtn = document.createElement("button");
    upBtn.textContent = "Lv+1";
    upBtn.style.fontSize = "10px";
    upBtn.style.padding = "2px 6px";
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
        b.style.padding = "2px 6px";
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
    stockInfo.style.fontSize = "11px";
    stockInfo.style.color = "#c0bedf";
    stockInfo.textContent = `自動採取ストック: ${window.gatherBaseStockTicks} tick`;
    container.appendChild(stockInfo);
  }
}

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

  if (!unlocked) return;

  const lands = window.HOUSING_LANDS || {};
  const current = (typeof getCurrentHousingLand === "function")
    ? getCurrentHousingLand()
    : null;
  const hs = (typeof window.housingState !== "undefined") ? window.housingState : null;

  const currentBox = document.createElement("div");
  currentBox.className = "status-block";
  currentBox.style.marginBottom = "8px";

  if (current && hs) {
    const title = document.createElement("div");
    title.textContent = `現在借りている拠点: ${current.name}`;
    currentBox.appendChild(title);

    const info = document.createElement("div");
    info.style.fontSize = "11px";

    let rentText = "";
    if (hs.rentDueAt) {
      const now = Date.now();
      const remainMs = hs.rentDueAt - now;
      if (hs.rentUnpaid) {
        rentText = "家賃: 滞納中（効果停止中）";
      } else if (remainMs <= 0) {
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
    nameRow.textContent = land.name;
    nameRow.style.fontWeight = "600";
    card.appendChild(nameRow);

    const infoRow = document.createElement("div");
    const kindText =
      land.kind === "guildDorm" ? "（ギルド寮）" :
      land.kind === "cityRoom" ? "（街の一室）" :
      land.kind === "suburbLand" ? "（郊外の土地）" :
      "";
    infoRow.textContent =
      `${kindText} 週家賃: ${land.weeklyRent}G / 家具スロット: ${land.baseSlots}`;
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

// ★ステータスタブHTMLを組み立てる
function buildStatusPage() {
  const page = document.getElementById("pageStatus");
  if (!page) return;

  page.innerHTML = `
    <h2>ステータス</h2>

    <div id="statusSubTabs" style="margin-bottom:8px;">
      <button id="statusTabMain"    class="status-sub-tab active" data-page="status-main">基本情報</button>
      <button id="statusTabGather"  class="status-sub-tab"         data-page="status-gather-stats">採取統計</button>
      <button id="statusTabSkill"   class="status-sub-tab"         data-page="status-skill">スキルツリー</button>
    </div>

    <!-- 基本情報 -->
    <div id="statusPageMain" class="status-sub-page active">
      <div class="status-block">
        レベル: <span id="stLevel">1</span><br>
        経験値: <span id="stExp">0</span> / <span id="stExpToNext">100</span><br>
        転生回数: <span id="stRebirthCount">0</span><br>
        成長タイプ: <span id="stGrowthType">バランス型</span><br>
        職業:
        <span id="stJobName">未設定</span>
        <button id="changeJobBtn" style="margin-left:4px; font-size:11px; padding:1px 6px;">職業を変更</button>
      </div>

      <div class="status-block" id="statusCitizenRow">
        市民権: 未取得（いずれかのギルドの特別依頼で解放）
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
      <p id="noPetMsg" style="display:none;">ペットがいない…</p>
      <div class="status-block pet-only">
        <div id="petNameRow" style="display:inline-flex; align-items:center; gap:4px;">
          ペット名: <span id="stPetName">ペット</span>
          <button id="renamePetBtn" style="font-size:11px; padding:1px 6px;">ペット名を変更</button>
        </div><br>
        種類: <span id="stPetType">未選択</span><br>
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

      <h3>セーブ / ロード</h3>
      <div class="status-block">
        <button onclick="saveToLocal()">ローカルにセーブ</button>
        <button onclick="loadFromLocal()">ローカルからロード</button>
        <p style="font-size:11px; color:#ccc;">※バージョンあげる時はインポートのがいいかも</p>

        <h4 style="margin-top:8px;">エクスポート（バックアップ用）</h4>
        <button onclick="exportSaveData()">セーブデータをテキストに出力</button><br>
        <textarea id="exportSaveText" rows="4" cols="60" placeholder="ここにセーブデータが出力されます（コピーしてメモ帳などに保存してください）"></textarea>

        <h4 style="margin-top:8px;">インポート（復元）</h4>
        <textarea id="importSaveText" rows="4" cols="60" placeholder="保存しておいたセーブデータをここに貼り付けてください"></textarea><br>
        <button onclick="importSaveData()">貼り付けたデータを読み込む</button>
      </div>
    </div>

    <!-- 採取統計 -->
    <div id="statusPageGatherStats" class="status-sub-page" style="display:none;">
      <h3>採取統計</h3>

      <!-- 採取統計タブ内サブタブ -->
      <div id="statusGatherSubTabs" style="margin-bottom:6px;">
        <button id="statusGatherTabStats" class="status-gather-sub-tab active" data-page="gather-stats">統計一覧</button>
        <button id="statusGatherTabFish"  class="status-gather-sub-tab"         data-page="gather-fishdex">魚図鑑</button>
      </div>

      <!-- 統計一覧ページ -->
      <div id="statusGatherPageStats" class="status-gather-page" style="display:block;">
        <div id="gatherStatsContainer" class="status-block" style="max-height:300px; overflow:auto; font-size:12px;"></div>

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

      <!-- 魚図鑑ページ -->
      <div id="statusGatherPageFish" class="status-gather-page" style="display:none;">
        <h4>魚図鑑</h4>
        <div id="gatherFishDexSummary" style="font-size:12px; color:#c0bedf; margin-bottom:4px;">図鑑: -</div>
        <div id="gatherFishDexList" class="status-block" style="max-height:260px; overflow:auto; font-size:12px;"></div>
      </div>
    </div>

    <!-- スキルツリー -->
    <div id="statusPageSkill" class="status-sub-page" style="display:none;">
      <h3>スキルツリー</h3>

      <div id="statusSkillSubTabs" style="margin-bottom:6px;">
        <button id="statusSkillTabTree"  class="status-skill-sub-tab active" data-page="skill-tree">スキルツリー</button>
        <button id="statusSkillTabBonus" class="status-skill-sub-tab"         data-page="skill-bonus">効果一覧</button>
      </div>

      <div id="statusSkillTreePage" class="status-skill-page" style="display:block;">
        <div id="skillTreeLayout" style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">
          <!-- 上: ツリーパネル（SVG版） -->
          <div style="position:relative; width:100%;">

            <div id="skillTreeFilterRow" style="margin-bottom:4px; font-size:11px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
              <span style="color:#c0bedf; min-width:64px;">表示フィルタ:</span>
              <div style="display:flex; flex-wrap:wrap; gap:4px;">
                <button class="skill-filter-btn" data-filter="all">全部</button>
                <button class="skill-filter-btn" data-filter="combat">戦闘</button>
                <button class="skill-filter-btn" data-filter="gather">採取</button>
                <button class="skill-filter-btn" data-filter="craft">クラフト</button>
                <button class="skill-filter-btn" data-filter="econ">経済・拠点</button>
              </div>
            </div>

            <!-- SVG版 -->
            <div id="skillTreePanel" style="position:relative; width:100%; height:340px; border-radius:10px; overflow:hidden;">
              <svg id="skillTreeSvg"
                   xmlns="http://www.w3.org/2000/svg"
                   viewBox="-240 -240 480 480"
                   preserveAspectRatio="xMidYMid meet"
                   style="width:100%; height:100%; display:block;">
                <g id="skillTreeRoot">
                  <g id="skillTreeLinesLayer"></g>
                  <g id="skillTreeNodesLayer"></g>
                </g>
              </svg>
            </div>
          </div>

          <!-- 下: サマリ + 詳細（習得ボタン含む） -->
          <div style="font-size:12px;">
            <div id="skillTreeSummary" style="margin-bottom:6px; min-height:2em; color:#c0bedf;">
              スキルツリー効果: なし
            </div>

            <div class="status-block" style="margin-bottom:6px;">
              <div id="skillDetailName" style="font-weight:bold; margin-bottom:4px;">スキル名</div>
              <div id="skillDetailDesc" style="margin-bottom:4px;">説明</div>
              <div id="skillDetailEffect" style="margin-bottom:4px; color:#ccc;">効果: -</div>
              <div id="skillDetailCost" style="margin-bottom:4px; color:#ccc;">必要コスト: -</div>
              <div id="skillDetailError" style="margin-bottom:4px; color:#f66; min-height:1.2em;"></div>
              <button id="skillLearnButton" style="width:100%;">習得する</button>
            </div>
          </div>
        </div>
      </div>

      <div id="statusSkillBonusPage" class="status-skill-page" style="display:none;">
        <div class="status-block" id="skillTreeBonusList" style="font-size:12px;"></div>
      </div>
    </div>
  `;

  // ===== サブタブ切り替え =====
  const tabMain    = document.getElementById("statusTabMain");
  const tabGather  = document.getElementById("statusTabGather");
  const tabSkill   = document.getElementById("statusTabSkill");
  const pageMain   = document.getElementById("statusPageMain");
  const pageGather = document.getElementById("statusPageGatherStats");
  const pageSkill  = document.getElementById("statusPageSkill");

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
    const gatherMatListBox = document.getElementById("gatherMaterialsList");
    if (gatherMatListBox && typeof window.materials !== "undefined") {
      gatherMatListBox.innerHTML = "";
      const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
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
          tierKey = "t1"; baseName = m.name.replace(/^T1/, "").trim();
        } else if (m.name.startsWith("T2")) {
          tierKey = "t2"; baseName = m.name.replace(/^T2/, "").trim();
        } else if (m.name.startsWith("T3")) {
          tierKey = "t3"; baseName = m.name.replace(/^T3/, "").trim();
        }
        const baseId = baseName;
        if (!groups[baseId]) {
          groups[baseId] = { name: baseName, t1:0, t2:0, t3:0 };
        }
        const need = mats[m.id] || 0;
        groups[baseId][tierKey] = need;
      });

      const table = document.createElement("table");
      table.className = "mat-table";
      const thead = document.createElement("thead");
      const htr = document.createElement("tr");
      const thTier = document.createElement("th");
      thTier.textContent = "";
      htr.appendChild(thTier);

      const baseOrder = ["板材","鉄インゴット","調合用薬草","布束","強化皮","蒸留水"];
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
      ["t1","t2","t3"].forEach((tierKey, idx) => {
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

    if (typeof getGatherBaseLevel === "function" &&
        typeof tryUpgradeGatherBase === "function") {
      const container = document.getElementById("gatherBaseStatus");
      if (container) renderGatherBaseStatusInto(container);
    }
  }

  // 魚図鑑（採取統計タブ内）描画
  function renderFishDexInGatherTab() {
    const summaryBox = document.getElementById("gatherFishDexSummary");
    const listBox    = document.getElementById("gatherFishDexList");
    if (!summaryBox || !listBox) return;

    listBox.innerHTML = "";

    if (typeof getFishDexList !== "function") {
      summaryBox.textContent = "図鑑: データがありません。";
      return;
    }

    const list = getFishDexList();
    if (!list || !list.length) {
      summaryBox.textContent = "図鑑: まだ魚を釣っていない…";
      return;
    }

    const discovered = list.filter(f => f.discovered);
    const total      = list.length;
    const rareCount  = discovered.filter(f => f.rarity === "legend" || f.rarity === "rare").length;

    summaryBox.textContent = `図鑑: ${discovered.length}/${total} 種（レア魚 ${rareCount}種）`;

    const table = document.createElement("table");
    table.className = "mat-table";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    ["名前", "レア度", "累計匹数", "最大サイズ"].forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    list.forEach(f => {
      const tr = document.createElement("tr");
      if (!f.discovered) {
        tr.style.opacity = "0.6";
      }

      const tdName = document.createElement("td");
      tdName.textContent = f.discovered ? f.name : "？？？";

      const tdRare = document.createElement("td");
      let rareText = "-";
      if (f.rarity === "legend")      rareText = "伝説";
      else if (f.rarity === "rare")   rareText = "レア";
      else if (f.rarity === "uncommon") rareText = "アンコモン";
      else rareText = "ノーマル";
      tdRare.textContent = rareText;

      const tdCount = document.createElement("td");
      tdCount.textContent = f.discovered ? (f.count || 0) : 0;

      const tdSize = document.createElement("td");
      tdSize.textContent = f.discovered ? ((f.maxSize || 0) + "cm") : "-";

      tr.appendChild(tdName);
      tr.appendChild(tdRare);
      tr.appendChild(tdCount);
      tr.appendChild(tdSize);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    listBox.appendChild(table);
  }

  // 採取統計タブ内サブタブ切り替え
  const gatherTabStats  = document.getElementById("statusGatherTabStats");
  const gatherTabFish   = document.getElementById("statusGatherTabFish");
  const gatherPageStats = document.getElementById("statusGatherPageStats");
  const gatherPageFish  = document.getElementById("statusGatherPageFish");

  function setStatusGatherSubPage(kind) {
    if (!gatherTabStats || !gatherTabFish || !gatherPageStats || !gatherPageFish) return;

    const isStats = kind === "stats";
    const isFish  = kind === "fish";

    gatherTabStats.classList.toggle("active", isStats);
    gatherTabFish.classList.toggle("active", isFish);

    gatherPageStats.style.display = isStats ? "" : "none";
    gatherPageFish.style.display  = isFish  ? "" : "none";

    if (isStats) {
      renderGatherStatsTable();
      renderGatherMaterialTables();
    }
    if (isFish) {
      renderFishDexInGatherTab();
    }
  }

  if (gatherTabStats && gatherTabFish) {
    gatherTabStats.addEventListener("click", () => setStatusGatherSubPage("stats"));
    gatherTabFish.addEventListener("click",  () => setStatusGatherSubPage("fish"));
    setStatusGatherSubPage("stats");
  }

  function setStatusSubPage(kind) {
    if (!tabMain || !tabGather || !tabSkill ||
        !pageMain || !pageGather || !pageSkill) return;

    const isMain   = (kind === "main");
    const isGather = (kind === "gather");
    const isSkill  = (kind === "skill");

    tabMain.classList.toggle("active",   isMain);
    tabGather.classList.toggle("active", isGather);
    tabSkill.classList.toggle("active",  isSkill);

    pageMain.style.display   = isMain   ? "" : "none";
    pageGather.style.display = isGather ? "" : "none";
    pageSkill.style.display  = isSkill  ? "" : "none";

    if (isGather) {
      // 採取統計タブに入ったら、統計サブタブを初期表示
      setStatusGatherSubPage("stats");
    }
    if (isSkill) {
      renderSkillTreeBonusList();
      if (typeof renderSkillTree === "function") {
        renderSkillTree("skillTreePanel");
        fitSkillTreeScale();
      }
    }
  }

  if (tabMain && tabGather && tabSkill) {
    tabMain.addEventListener("click",   () => setStatusSubPage("main"));
    tabGather.addEventListener("click", () => setStatusSubPage("gather"));
    tabSkill.addEventListener("click",  () => setStatusSubPage("skill"));
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

  // ★追加: スキルツリーフィルターボタンにクリックイベントを登録
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
  if (magicGatherBox) {
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

// 採取タブ用の素材詳細・クラフト素材詳細（元の関数をそのまま移植）
function updateGatherMatDetailText() {
  const label = document.getElementById("gatherMaterials");
  const area  = document.getElementById("gatherMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
  const keys = ["wood","ore","herb","cloth","leather","water"];

  const lines = keys.map(k => {
    const m  = window.materials[k] || {};
    const t1 = m.t1 || 0;
    const t2 = m.t2 || 0;
    const t3 = m.t3 || 0;
    return `${names[k]}: ${t1}/${t2}/${t3}`;
  });
  area.textContent = lines.join("\\n");

  let labelText = "所持素材：-";

  const info = window.lastGatherInfo;

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
}

function updateCraftMatDetailText() {
  const label = document.getElementById("craftMaterials");
  const area  = document.getElementById("craftMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
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
  area.textContent = lines.join("\\n");

  if (typeof window.intermediateMats !== "undefined" &&
      Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {

    const mats = window.intermediateMats || {};
    const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;

    const interLines = src.map(m => {
      const have = mats[m.id] || 0;
      return `${m.name}: ${have}`;
    });

    if (interLines.length > 0) {
      area.textContent += "\\n--- 中間素材 ---\\n" + interLines.join("\\n");
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
    if (picked) labelText = `所持素材：${picked}`;
  }

  label.textContent = labelText;
}