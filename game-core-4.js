// game-core-4.js
// 採取専用（フィールド定義・採取ロジック・料理採取・星屑ドロップ）

// =======================
// 採取フィールド定義
// =======================
// materials を必ず window 配下にそろえる

const GATHER_FIELDS = [
  { id: "field1", name: "近郊の原っぱ" },
  { id: "field2", name: "星降りの丘" },
  { id: "field3", name: "翠風の谷" },
  { id: "cook",   name: "食材調達" }
];

// 採取スキルレベルによるフィールド解放条件
// フィールド × 資源(target) ごとに必要Lvを持つ
// wood / ore / herb / cloth / leather / water
const GATHER_FIELD_REQUIRE_LV = {
  field1: { wood: 0,  ore: 0,  herb: 0,  cloth: 0,  leather: 0,  water: 0 },
  field2: { wood: 20, ore: 20, herb: 20, cloth: 20, leather: 20, water: 20 },
  field3: { wood: 40, ore: 40, herb: 40, cloth: 40, leather: 40, water: 40 }
  // cook は制限なし
};

// 「星屑の結晶」強化用定数（他ファイルで上書きしてもOK）
// 自己参照すると「Cannot access 'STAR_SHARD_ITEM_ID' before initialization」になるため素直な定義にする
const STAR_SHARD_ITEM_ID = "starShard";   // itemCounts で使うキー名
const STAR_SHARD_NEED_LV = 5;             // この強化段階（現在値）以上から星屑要求
const STAR_SHARD_NEED_NUM = 1;            // 1回の強化で必要な個数

// 採取スキルでフィールド解放をチェックするフック
function checkGatherAreaUnlockBySkill(resourceKey) {
  // いまは何もしないダミーでOK（将来「新しい採取場所に行けそうだ」ログを出す用）
}

// 現在選択中の target（木／鉱石…）を取得するヘルパ
function getCurrentGatherTarget() {
  const targetSel = document.getElementById("gatherTarget");
  if (!targetSel) return null;
  const fieldSel = document.getElementById("gatherField");
  const field = fieldSel ? fieldSel.value : null;

  // 料理フィールドのときは通常資源ターゲットは意味を持たない
  if (field === "cook") return null;

  return targetSel.value || null; // wood / ore / herb / cloth / leather / water
}

// フィールドに応じて採取ターゲットセレクトの中身を切り替える
function refreshGatherTargetSelect() {
  const targetSel = document.getElementById("gatherTarget");
  const fieldSel  = document.getElementById("gatherField");
  if (!targetSel || !fieldSel) return;

  const field = fieldSel.value;
  const prev  = targetSel.value;

  targetSel.innerHTML = "";

  // =======================
  // 料理素材の採取地
  // =======================
  if (field === "cook") {
    // 料理採取時は「狩猟 / 釣り / 畑」をターゲットとして出す
    const modes = [
      { id: "hunt", name: "狩猟" },
      { id: "fish", name: "釣り" },
      { id: "farm", name: "畑・菜園" }
    ];
    modes.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      targetSel.appendChild(opt);
    });

    if (prev && modes.some(m => m.id === prev)) {
      targetSel.value = prev;
    } else {
      targetSel.value = "hunt";
    }
    return;
  }

  // =======================
  // 通常フィールド: 木/鉱石/草/布/皮/水
  // =======================
  const targets = [
    { id: "wood",    name: "木" },
    { id: "ore",     name: "鉱石" },
    { id: "herb",    name: "草" },
    { id: "cloth",   name: "布" },
    { id: "leather", name: "皮" },
    { id: "water",   name: "水" }
  ];

  targets.forEach(t => {
    const s  = gatherSkills[t.id];
    const lv = s ? s.lv : 0;

    // フィールド × target ごとの必要Lv
    const table = GATHER_FIELD_REQUIRE_LV[field] || {};
    const needLv = table[t.id] ?? 0;

    // 今のスキルLvでこのフィールドで採れる素材だけ出す
    if (lv < needLv) return;

    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    targetSel.appendChild(opt);
  });

  if (prev && Array.from(targetSel.options).some(o => o.value === prev)) {
    targetSel.value = prev;
  } else if (targetSel.options.length) {
    targetSel.value = targetSel.options[0].value;
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "採取できる対象がありません";
    targetSel.appendChild(opt);
  }
}

// このフィールドに「今の target で」入れるか判定
function canEnterGatherFieldForTarget(fieldId, target) {
  if (!target) return false;
  if (fieldId === "cook") return true; // 料理は常にOK

  const s = gatherSkills[target];
  const lv = s ? s.lv : 0;

  const table = GATHER_FIELD_REQUIRE_LV[fieldId] || {};
  const needLv = table[target] ?? 0;

  return lv >= needLv;
}

// 採取場所セレクトを更新（game-ui.js からも呼ばれる）
// 「今選んでいる target で行けるエリアだけ」を表示する
function refreshGatherFieldSelect() {
  const sel = document.getElementById("gatherField");
  if (!sel) return;

  const currentTarget = getCurrentGatherTarget(); // cook のときは null

  const prev = sel.value;
  sel.innerHTML = "";

  const unlocked = [];

  // ★ 全採取スキルが Lv0 かどうかチェック
  const allGatherLv0 =
    gatherSkills.wood.lv    === 0 &&
    gatherSkills.ore.lv     === 0 &&
    gatherSkills.herb.lv    === 0 &&
    gatherSkills.cloth.lv   === 0 &&
    gatherSkills.leather.lv === 0 &&
    gatherSkills.water.lv   === 0 &&
    gatherSkills.hunt.lv    === 0 &&
    gatherSkills.fish.lv    === 0 &&
    gatherSkills.farm.lv    === 0;

  GATHER_FIELDS.forEach(f => {
    if (f.id === "cook") {
      // 料理採取地は常に表示
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name;
      sel.appendChild(opt);
      unlocked.push(f.id);
      return;
    }

    // 全採取スキルLv0なら field1 だけ表示（field2/3 は隠す）
    if (allGatherLv0 && f.id !== "field1") {
      return;
    }

    // ★ target が null（＝まだ何も選んでない）ときは field1 だけ出す
    if (!currentTarget) {
      if (f.id === "field1") {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.name;
        sel.appendChild(opt);
        unlocked.push(f.id);
      }
      return;
    }

    // target が決まっている場合だけスキルチェック
    if (!canEnterGatherFieldForTarget(f.id, currentTarget)) return;

    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    sel.appendChild(opt);
    unlocked.push(f.id);
  });

  const exists = unlocked.includes(prev);
  if (exists) {
    sel.value = prev;
  } else if (unlocked.length > 0) {
    sel.value = unlocked[0];
  } else {
    sel.value = "";
  }

  // フィールド変更に合わせてターゲットも更新
  refreshGatherTargetSelect();
}

// =======================
// 採取
// =======================

function addGatherSkillExp(resourceKey){
  const s = gatherSkills[resourceKey];
  if(!s) return;
  s.exp += 1;
  while(s.exp >= s.expToNext && s.lv < GATHER_SKILL_MAX_LV){
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = Math.floor(s.expToNext * 1.3) + 1;
    appendLog(`${resourceKey} 採取スキルがLv${s.lv}になった！`);
  }
  // 採取スキルLvが上がったら、行けるフィールド一覧を更新
  refreshGatherFieldSelect();

  // ステータス画面の採取スキル欄も更新
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

function calcGatherAmount(resourceKey){
  const s = gatherSkills[resourceKey];
  const lv = s ? s.lv : 0;
  const p = GATHER_AMOUNT_PARAMS;
  const base = (Math.random() < p.baseOneProb) ? 1 : 0;
  const guaranteed = Math.floor(p.guaranteedCoeff * (lv / 100));
  let total = Math.max(base, guaranteed);
  const extraChance = p.extraChanceCoeff * (lv / 100);
  if(Math.random() < extraChance){
    total += 1;
  }
  // 最低1個は欲しければここで保証（通常素材・料理素材で共通）
  return Math.max(1, total);
}

// 料理素材名テーブル（ログ表示用）
const COOKING_MAT_NAMES = {
  meat_hard: "固い肉",
  meat_soft: "やわらかい肉",
  meat_fatty: "脂身の多い肉",
  meat_premium: "高級肉",
  meat_magic: "不思議な肉",
  fish_small: "小魚",
  fish_river: "川魚",
  fish_sea: "海魚",
  fish_big: "大きな魚",
  fish_deep: "深海魚",
  veg_root_rough: "ゴロゴロ根菜",
  veg_leaf_crisp: "シャキシャキ葉菜",
  veg_mushroom_aroma: "香るキノコ",
  veg_spice: "香辛料",
  veg_herb_aroma: "香草",
  veg_premium: "高級野菜",
  veg_mountain: "山菜",
  veg_dried: "乾物",
  grain_coarse: "粗挽き穀物",
  grain_refined: "精製穀物",
  grain_mochi: "もちもち穀物",
  grain_ancient: "古代穀物",
  spice_salt_rock: "岩塩",
  spice_pepper: "胡椒",
  spice_premium: "高級スパイス",
  spice_secret: "秘伝スパイス"
};

// ★ 直近の通常素材採取のティア内訳を記録する（game-core-1 から参照用）
window.lastGatherInfo = null;
// 形式: { baseKey: "wood", field: "field1", tiers: { t1: 数, t2: 数, t3: 数 } }

function gather(){
  // 採取対象セレクト
  const targetSel = document.getElementById("gatherTarget");
  if (!targetSel) return;
  const target = targetSel.value; // wood / ore / herb / cloth / leather / water or "hunt/fish/farm"

  // フィールドセレクト
  const fieldSel = document.getElementById("gatherField");
  const field = fieldSel ? fieldSel.value : "field1";

  // =======================
  // 料理採取モード
  // =======================
  if (field === "cook") {
    const cookModeSel = document.getElementById("gatherTarget");
    if (!cookModeSel) {
      appendLog("料理採取モードの設定が見つかりません");
      return;
    }
    const mode = cookModeSel.value; // "hunt" / "fish" / "farm"

    // 対応する採取スキルで量を計算
    const added = calcGatherAmount(mode);

    // 料理素材プール（カテゴリ均一）
    const GATHER_COOK_HUNT = [
      "meat_hard",
      "meat_soft",
      "meat_fatty",
      "meat_premium",
      "meat_magic"
    ];
    const GATHER_COOK_FISH = [
      "fish_small",
      "fish_river",
      "fish_sea",
      "fish_big",
      "fish_deep"
    ];
    const GATHER_COOK_FARM = [
      "veg_root_rough",
      "veg_leaf_crisp",
      "veg_mushroom_aroma",
      "veg_spice",
      "veg_herb_aroma",
      "veg_premium",
      "veg_mountain",
      "veg_dried",
      "grain_coarse",
      "grain_refined",
      "grain_mochi",
      "grain_ancient",
      "spice_salt_rock",
      "spice_pepper",
      "spice_premium",
      "spice_secret"
    ];

    let pool = [];
    if (mode === "hunt") {
      pool = GATHER_COOK_HUNT;
    } else if (mode === "fish") {
      pool = GATHER_COOK_FISH;
    } else {
      pool = GATHER_COOK_FARM;
    }

    if (!pool.length) {
      appendLog("今は料理素材を採取できない");
      return;
    }

    if (typeof cookingMats !== "object") {
      appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
      return;
    }

    // 何を何個拾ったか集計
    let gained = {};
    for (let i = 0; i < added; i++) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      cookingMats[id] = (cookingMats[id] || 0) + 1;
      gained[id] = (gained[id] || 0) + 1;
    }

    addGatherSkillExp(mode);

    const modeLabel =
      (mode === "hunt") ? "狩猟" :
      (mode === "fish") ? "釣り" :
      "畑";

    const parts = Object.keys(gained).map(id => {
      const name = COOKING_MAT_NAMES[id] || id;
      return `${name}×${gained[id]}`;
    });
    const gainedText = parts.length ? parts.join("、") : `料理素材×${added}`;

    appendLog(`【${modeLabel}】で ${gainedText} を採取した`);

    // ★ 直近の料理素材採取情報を記録（UI表示用）
    lastGatherInfo = {
      kind: "cooking",
      gained: gained   // { id: 個数, ... }
    };

    // ★ 料理採取でもレア素材（星屑の結晶）の超低確率ドロップ
    if (typeof RARE_GATHER_DROP_RATE === "number" &&
        typeof RARE_GATHER_ITEM_ID === "string") {
      if (Math.random() < RARE_GATHER_DROP_RATE) {
        if (typeof itemCounts === "object") {
          itemCounts[RARE_GATHER_ITEM_ID] = (itemCounts[RARE_GATHER_ITEM_ID] || 0) + 1;
        }
        appendLog("✨ 星屑の結晶を手に入れた！（料理採取）");
      }
    }

    // 採取も行動として空腹・水分を進行させる
    if (typeof handleHungerThirstOnAction === "function") {
      handleHungerThirstOnAction("gather");
    }

    // ★ 料理クラフト画面の必要素材表示を更新
    if (typeof COOKING_RECIPES !== "undefined" &&
        typeof updateCookingCostInfo === "function") {
      const foodSelect  = document.getElementById("foodSelect");
      const drinkSelect = document.getElementById("drinkSelect");
      const idFood  = foodSelect  ? foodSelect.value  : null;
      const idDrink = drinkSelect ? drinkSelect.value : null;
      const recipe =
        (idFood  && COOKING_RECIPES.food.find(r => r.id === idFood)) ||
        (idDrink && COOKING_RECIPES.drink.find(r => r.id === idDrink)) ||
        null;
      updateCookingCostInfo(recipe);
    }

    updateDisplay();
    return;
  }

  // =======================
  // 通常素材採取（木/鉱石/草/布/皮/水）
  // =======================

  const s = gatherSkills[target];
  const lv = s ? s.lv : 0;

  checkGatherAreaUnlockBySkill(target);

  // フィールド × target ごとの必要Lvを参照
  const table = GATHER_FIELD_REQUIRE_LV[field] || {};
  const needLv = table[target] ?? 0;
  if (lv < needLv) {
    appendLog(`このエリアで採取するには「${target}」採取スキルLv${needLv}が必要です（現在Lv${lv}）`);
    updateDisplay();
    return;
  }

  addGatherSkillExp(target);
  let added = calcGatherAmount(target);

  let jobBonus = 0;
  if (jobId === 0 && (target === "ore" || target === "leather")) {
    jobBonus = Math.random() < 0.2 ? 1 : 0;
  } else if (jobId === 1 && (target === "herb" || target === "water")) {
    jobBonus = Math.random() < 0.2 ? 1 : 0;
  } else if (jobId === 2 && (target === "cloth" || target === "leather")) {
    jobBonus = Math.random() < 0.2 ? 1 : 0;
  }

  const lukBonus = (Math.random() < LUK_ * 0.01) ? 1 : 0;
  added += jobBonus + lukBonus;
  if (added < 0) added = 0;

  if (!materials || !materials[target]) {
    appendLog("採取素材の定義が見つかりません");
    return;
  }

  if (added === 0) {
    appendLog("何も採取できなかった…");
    updateDisplay();
    return;
  }

  let t1 = 0, t2 = 0, t3 = 0;

  if (field === "field1") {
    t1 = added;
  } else if (field === "field2") {
    t2 = Math.floor(added * 0.2);
    t1 = added - t2;
  } else if (field === "field3") {
    t3 = Math.floor(added * 0.1);
    let rest = added - t3;
    t2 = Math.floor(rest * 0.3);
    t1 = rest - t2;
  } else {
    t1 = added;
  }

  materials[target].t1 += t1;
  materials[target].t2 += t2;
  materials[target].t3 += t3;

  const names = {
    wood: "木",
    ore: "鉱石",
    herb: "草",
    cloth: "布",
    leather: "皮",
    water: "水"
  };
  if (t1 > 0) appendLog(`T1${names[target]}を${t1}つ採取した！`);
  if (t2 > 0) appendLog(`T2${names[target]}を${t2}つ採取した！`);
  if (t3 > 0) appendLog(`T3${names[target]}を${t3}つ採取した！`);

  // ★ レア素材（星屑の結晶）の超低確率ドロップ
  if (typeof RARE_GATHER_DROP_RATE === "number" &&
      typeof RARE_GATHER_ITEM_ID === "string") {
    if (Math.random() < RARE_GATHER_DROP_RATE) {
      // インベントリに追加（itemCounts か inventory 周りの実装に合わせて処理）
      if (typeof itemCounts === "object") {
        itemCounts[RARE_GATHER_ITEM_ID] = (itemCounts[RARE_GATHER_ITEM_ID] || 0) + 1;
      }
      appendLog("✨ 星屑の結晶を手に入れた！");
    }
  }

  // ★ 直近の通常素材採取情報を記録（game-core-1 側の表示用）
  lastGatherInfo = {
    baseKey: target,   // "wood" など
    field: field,      // "field1" など
    tiers: {
      t1: t1,
      t2: t2,
      t3: t3
    }
  };

  // 採取も行動として空腹・水分を進行させる
  if (typeof handleHungerThirstOnAction === "function") {
    handleHungerThirstOnAction("gather");
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}