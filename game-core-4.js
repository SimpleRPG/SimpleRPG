// game-core-4.js
// 採取・クラフト・中間素材・装備・強化

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

    // target が null（＝まだ何も選んでない）かつ cook 以外のときだけ、
    // field1〜3 を全部出す
    if (!currentTarget && f.id !== "cook") {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name;
      sel.appendChild(opt);
      unlocked.push(f.id);
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

// =======================
// クラフト共通
// =======================

// クラフト品質関連（0:普通, 1:良品, 2:傑作）
const QUALITY_NAMES = ["", "【良品】", "【傑作】"];

// 必要なら性能補正用レート（今は未使用、後でダメージ計算側で使う想定）
const QUALITY_RATE = [1.0, 1.05, 1.12];

// クラフトスキルLvヘルパー
function getCraftSkill(category){
  return craftSkills[category];
}

function getCraftSkillLevel(category){
  const s = getCraftSkill(category);
  return s ? s.lv : 0;
}

function addCraftSkillExp(category){
  const s = getCraftSkill(category);
  if(!s) return;
  s.exp += 1;
  while(s.exp >= s.expToNext && s.lv < CRAFT_SKILL_MAX_LV){
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = Math.floor(s.expToNext * 1.3) + 1;
    appendLog(`${category} クラフトスキルがLv${s.lv}になった！`);
  }
}

// 必要素材表示（「必要/所持」を出す）
// 武器・防具・ポーション・道具 + 中間素材（material）に対応
function updateCraftCostInfo(category, recipeId){
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  let list = [];
  let recipe = null;

  if (category === "weapon") {
    recipe = CRAFT_RECIPES.weapon.find(r => r.id === recipeId);
  } else if (category === "armor") {
    recipe = CRAFT_RECIPES.armor.find(r => r.id === recipeId);
  } else if (category === "potion") {
    recipe = CRAFT_RECIPES.potion.find(r => r.id === recipeId);
  } else if (category === "tool") {
    recipe = CRAFT_RECIPES.tool.find(r => r.id === recipeId);
  } else if (category === "material") {
    // 中間素材の定義から必要素材を表示する
    if (!Array.isArray(INTERMEDIATE_MATERIALS)) {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const def = INTERMEDIATE_MATERIALS.find(m => m.id === recipeId);
    if (!def || !def.from) {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const baseNames = {
      wood:   "木",
      ore:    "鉱石",
      herb:   "草",
      cloth:  "布",
      leather:"皮",
      water:  "水"
    };

    const parts = [];
    Object.keys(def.from).forEach(baseKey => {
      const tierInfo = def.from[baseKey];
      const m = materials[baseKey];
      Object.keys(tierInfo).forEach(tierKey => {
        const need = tierInfo[tierKey];
        const have = m ? (m[tierKey] || 0) : 0;
        const tierLabel = tierKey.toUpperCase();
        const name = baseNames[baseKey] || baseKey;
        parts.push(`${tierLabel}${name} ${have}/${need}`);
      });
    });
    infoEl.textContent = "必要素材：" + (parts.length ? parts.join("、") : "-");
    return;
  }

  if (!recipe || !recipe.cost) {
    infoEl.textContent = "必要素材：-";
    return;
  }

  // 基本素材の日本語名
  const baseNames = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  // 中間素材の日本語名
  const interNames = {
    woodPlank_T1:    "T1板材",
    woodPlank_T2:    "T2板材",
    woodPlank_T3:    "T3板材",
    ironIngot_T1:    "T1鉄インゴット",
    ironIngot_T2:    "T2鉄インゴット",
    ironIngot_T3:    "T3鉄インゴット",
    clothBolt_T1:    "T1布束",
    clothBolt_T2:    "T2布束",
    clothBolt_T3:    "T3布束",
    toughLeather_T1: "T1強化皮",
    toughLeather_T2: "T2強化皮",
    toughLeather_T3: "T3強化皮"
  };

  // ティア付き基本素材の日本語名
  const tierMatNames = {
    herb_T1:   "T1草",
    herb_T2:   "T2草",
    herb_T3:   "T3草",
    water_T1:  "T1水",
    water_T2:  "T2水",
    water_T3:  "T3水",
    wood_T1:   "T1木",
    wood_T2:   "T2木",
    wood_T3:   "T3木",
    ore_T1:    "T1鉱石",
    ore_T2:    "T2鉱石",
    ore_T3:    "T3鉱石",
    cloth_T1:  "T1布",
    cloth_T2:  "T2布",
    cloth_T3:  "T3布",
    leather_T1:"T1皮",
    leather_T2:"T2皮",
    leather_T3:"T3皮"
  };

  Object.keys(recipe.cost).forEach(k => {
    const need = recipe.cost[k];
    let have = 0;
    let label;

    // 1. ティア付き基本素材（herb_T1 など）
    if (k in tierMatNames) {
      const [base, tier] = k.split("_"); // 例: "ore", "T1"
      const m = materials[base];
      if (m) {
        const tierKey = tier.toLowerCase(); // "t1"
        have = m[tierKey] || 0;
      }
      label = tierMatNames[k];

    // 2. 中間素材（woodPlank_T1 など）
    } else if (k in interNames) {
      if (typeof intermediateMats === "object") {
        have = intermediateMats[k] || 0;
      } else {
        have = 0;
      }
      label = interNames[k];

    // 3. 基本素材（wood / ore など、ティア混在で合計）
    } else if (k in materials) {
      have = getMatTotal(k);
      label = baseNames[k] || k;

    // 4. それ以外（将来の拡張用）
    } else {
      label = k;
      have = 0;
    }

    list.push(`${label} ${have}/${need}`);
  });

  infoEl.textContent = "必要素材：" + (list.length ? list.join("、") : "-");
}

// 素材チェック
function hasMaterials(cost){
  if(cost.wood && getMatTotal("wood")<cost.wood) return false;
  if(cost.ore && getMatTotal("ore")<cost.ore) return false;
  if(cost.herb && getMatTotal("herb")<cost.herb) return false;
  if(cost.cloth && getMatTotal("cloth")<cost.cloth) return false;
  if(cost.leather && getMatTotal("leather")<cost.leather) return false;
  if(cost.water && getMatTotal("water")<cost.water) return false;

  const checkTier = (base, tierKey, amount) => {
    if (!amount) return true;
    const m = materials[base];
    if (!m) return false;
    return (m[tierKey] || 0) >= amount;
  };

  // 草・水
  if (!checkTier("herb",  "t1", cost.herb_T1)) return false;
  if (!checkTier("herb",  "t2", cost.herb_T2)) return false;
  if (!checkTier("herb",  "t3", cost.herb_T3)) return false;
  if (!checkTier("water", "t1", cost.water_T1)) return false;
  if (!checkTier("water", "t2", cost.water_T2)) return false;
  if (!checkTier("water", "t3", cost.water_T3)) return false;

  // 木・鉱石・布・皮のティア素材
  if (!checkTier("wood",   "t1", cost.wood_T1))   return false;
  if (!checkTier("wood",   "t2", cost.wood_T2))   return false;
  if (!checkTier("wood",   "t3", cost.wood_T3))   return false;
  if (!checkTier("ore",    "t1", cost.ore_T1))    return false;
  if (!checkTier("ore",    "t2", cost.ore_T2))    return false;
  if (!checkTier("ore",    "t3", cost.ore_T3))    return false;
  if (!checkTier("cloth",  "t1", cost.cloth_T1))  return false;
  if (!checkTier("cloth",  "t2", cost.cloth_T2))  return false;
  if (!checkTier("cloth",  "t3", cost.cloth_T3))  return false;
  if (!checkTier("leather","t1", cost.leather_T1))return false;
  if (!checkTier("leather","t2", cost.leather_T2))return false;
  if (!checkTier("leather","t3", cost.leather_T3))return false;

  // 中間素材
  if (typeof intermediateMats === "object") {
    if (cost.woodPlank_T1 && (intermediateMats.woodPlank_T1 || 0) < cost.woodPlank_T1) return false;
    if (cost.woodPlank_T2 && (intermediateMats.woodPlank_T2 || 0) < cost.woodPlank_T2) return false;
    if (cost.woodPlank_T3 && (intermediateMats.woodPlank_T3 || 0) < cost.woodPlank_T3) return false;
    if (cost.ironIngot_T1 && (intermediateMats.ironIngot_T1 || 0) < cost.ironIngot_T1) return false;
    if (cost.ironIngot_T2 && (intermediateMats.ironIngot_T2 || 0) < cost.ironIngot_T2) return false;
    if (cost.ironIngot_T3 && (intermediateMats.ironIngot_T3 || 0) < cost.ironIngot_T3) return false;
    if (cost.clothBolt_T1 && (intermediateMats.clothBolt_T1 || 0) < cost.clothBolt_T1) return false;
    if (cost.clothBolt_T2 && (intermediateMats.clothBolt_T2 || 0) < cost.clothBolt_T2) return false;
    if (cost.clothBolt_T3 && (intermediateMats.clothBolt_T3 || 0) < cost.clothBolt_T3) return false;
    if (cost.toughLeather_T1 && (intermediateMats.toughLeather_T1 || 0) < cost.toughLeather_T1) return false;
    if (cost.toughLeather_T2 && (intermediateMats.toughLeather_T2 || 0) < cost.toughLeather_T2) return false;
    if (cost.toughLeather_T3 && (intermediateMats.toughLeather_T3 || 0) < cost.toughLeather_T3) return false;
  }
  return true;
}

function consumeOneMatTier(key, need){
  let remain = need;
  const m = materials[key];
  if (!m) return;
  const tiers = ["t1","t2","t3"];
  for (const ti of tiers) {
    if (remain <= 0) break;
    const have = m[ti] || 0;
    const use = Math.min(have, remain);
    m[ti] = have - use;
    remain -= use;
  }
}

function consumeMaterials(cost){
  if(cost.wood)   consumeOneMatTier("wood",   cost.wood);
  if(cost.ore)    consumeOneMatTier("ore",    cost.ore);
  if(cost.herb)   consumeOneMatTier("herb",   cost.herb);
  if(cost.cloth)  consumeOneMatTier("cloth",  cost.cloth);
  if(cost.leather)consumeOneMatTier("leather",cost.leather);
  if(cost.water)  consumeOneMatTier("water",  cost.water);

  const decTier = (base, tierKey, amount) => {
    if (!amount) return;
    const m = materials[base];
    if (!m) return;
    m[tierKey] = Math.max(0, (m[tierKey] || 0) - amount);
  };

  // 草・水
  decTier("herb",  "t1", cost.herb_T1);
  decTier("herb",  "t2", cost.herb_T2);
  decTier("herb",  "t3", cost.herb_T3);
  decTier("water", "t1", cost.water_T1);
  decTier("water", "t2", cost.water_T2);
  decTier("water", "t3", cost.water_T3);

  // 木・鉱石・布・皮
  decTier("wood",   "t1", cost.wood_T1);
  decTier("wood",   "t2", cost.wood_T2);
  decTier("wood",   "t3", cost.wood_T3);
  decTier("ore",    "t1", cost.ore_T1);
  decTier("ore",    "t2", cost.ore_T2);
  decTier("ore",    "t3", cost.ore_T3);
  decTier("cloth",  "t1", cost.cloth_T1);
  decTier("cloth",  "t2", cost.cloth_T2);
  decTier("cloth",  "t3", cost.cloth_T3);
  decTier("leather","t1", cost.leather_T1);
  decTier("leather","t2", cost.leather_T2);
  decTier("leather","t3", cost.leather_T3);

  if (typeof intermediateMats === "object") {
    const dec = (k, n) => {
      if (!n) return;
      intermediateMats[k] = (intermediateMats[k] || 0) - n;
      if (intermediateMats[k] < 0) intermediateMats[k] = 0;
    };
    dec("woodPlank_T1", cost.woodPlank_T1);
    dec("woodPlank_T2", cost.woodPlank_T2);
    dec("woodPlank_T3", cost.woodPlank_T3);
    dec("ironIngot_T1", cost.ironIngot_T1);
    dec("ironIngot_T2", cost.ironIngot_T2);
    dec("ironIngot_T3", cost.ironIngot_T3);
    dec("clothBolt_T1", cost.clothBolt_T1);
    dec("clothBolt_T2", cost.clothBolt_T2);
    dec("clothBolt_T3", cost.clothBolt_T3);
    dec("toughLeather_T1", cost.toughLeather_T1);
    dec("toughLeather_T2", cost.toughLeather_T2);
    dec("toughLeather_T3", cost.toughLeather_T3);
  }
}

// =======================
// 各種クラフト
// =======================

function craftWeapon(){
  const sel = document.getElementById("weaponSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.weapon.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その武器レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("weapon");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // 失敗判定
  if (Math.random() >= successRate) {
    consumeMaterials(recipe.cost);
    addCraftSkillExp("weapon");
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    return;
  }

  // 成功：素材消費＋品質ロール
  consumeMaterials(recipe.cost);
  addCraftSkillExp("weapon");

  const q = rollQualityBySkillLv(skillLv); // 0:普通 1:良品 2:傑作
  const qName = QUALITY_NAMES[q];

  weaponCounts[recipe.id] = (weaponCounts[recipe.id] || 0) + 1;
  appendLog(`${qName}${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();

  const selAfter = document.getElementById("weaponSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("weapon", prevRecipeId);
  }
}

function craftArmor(){
  const sel = document.getElementById("armorSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.armor.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その防具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("armor");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  if (Math.random() >= successRate) {
    consumeMaterials(recipe.cost);
    addCraftSkillExp("armor");
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    return;
  }

  consumeMaterials(recipe.cost);
  addCraftSkillExp("armor");

  const q = rollQualityBySkillLv(skillLv);
  const qName = QUALITY_NAMES[q];

  armorCounts[recipe.id] = (armorCounts[recipe.id] || 0) + 1;
  appendLog(`${qName}${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();

  const selAfter = document.getElementById("armorSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("armor", prevRecipeId);
  }
}

function craftPotion(){
  const sel = document.getElementById("potionSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.potion.find(r => r.id === sel.value);
  if(!recipe){ appendLog("そのポーションレシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("potion");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  if (Math.random() >= successRate) {
    consumeMaterials(recipe.cost);
    addCraftSkillExp("potion");
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("potionSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("potion", prevRecipeId);
    }
    return;
  }

  consumeMaterials(recipe.cost);
  addCraftSkillExp("potion");
  potionCounts[recipe.id] = (potionCounts[recipe.id] || 0) + 1;

  // ポーションは品質差なし（必要なら QUALITY_NAMES を使ってもよい）
  appendLog(`${recipe.name} をクラフトした`);

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("potionSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("potion", prevRecipeId);
  }
}

// 道具クラフト（爆弾T1〜T3など将来用）
// ※現時点では個数管理は未実装。戦闘アイテムは potionCounts で管理。
function craftTool(){
  const sel = document.getElementById("toolSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.tool.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その道具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("tool");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  if (Math.random() >= successRate) {
    consumeMaterials(recipe.cost);
    addCraftSkillExp("tool");
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("toolSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("tool", prevRecipeId);
    }
    return;
  }

  consumeMaterials(recipe.cost);
  addCraftSkillExp("tool");

  // 道具も今は品質差なし（必要なら QUALITY_NAMES を使う）
  appendLog(`${recipe.name} をクラフトした`);

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("toolSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("tool", prevRecipeId);
  }
}

// 中間素材クラフト
function craftIntermediate(interId){
  if (!Array.isArray(INTERMEDIATE_MATERIALS)) return;
  const def = INTERMEDIATE_MATERIALS.find(m => m.id === interId);
  if (!def || !def.from) {
    appendLog("その中間素材は作れない");
    return;
  }

  const can = Object.keys(def.from).every(key => {
    const tierInfo = def.from[key];
    const m = materials[key];
    if (!m) return false;
    let haveSum = 0;
    Object.keys(tierInfo).forEach(ti => {
      haveSum += (m[ti] || 0);
    });
    const needSum = Object.values(tierInfo).reduce((a,b)=>a+b,0);
    return haveSum >= needSum;
  });
  if (!can) {
    appendLog("素材が足りない（中間素材）");
    return;
  }

  Object.keys(def.from).forEach(key => {
    const tierInfo = def.from[key];
    const m = materials[key];
    Object.keys(tierInfo).forEach(ti => {
      let need = tierInfo[ti];
      const have = m[ti] || 0;
      const use = Math.min(have, need);
      m[ti] = have - use;
      need -= use;
    });
  });

  if (typeof intermediateMats === "object") {
    intermediateMats[interId] = (intermediateMats[interId] || 0) + 1;
  }

  appendLog(`${def.name} を作成した`);
  updateDisplay();
}

// =======================
// 装備・強化
// =======================

function refreshEquipSelects(){
  if (typeof weapons === "undefined" || typeof armors === "undefined") {
    console.warn("game-core-4: weapons/armors が未初期化のため、refreshEquipSelects をスキップ");
    return;
  }

  const wSel      = document.getElementById("weaponEquipSelect");
  const aSel      = document.getElementById("armorEquipSelect");
  const wCraftSel = document.getElementById("weaponSelect");
  const aCraftSel = document.getElementById("armorSelect");
  const pCraftSel = document.getElementById("potionSelect");
  const tCraftSel = document.getElementById("toolSelect");
  const interSel  = document.getElementById("intermediateSelect");
  const tierSel   = document.getElementById("craftTierSelect");
  const tierFilter= tierSel ? tierSel.value : "all";

  // 所持装備セレクト
  if(wSel){
    wSel.innerHTML="";
    weapons.forEach(w=>{
      if(weaponCounts[w.id]>0){
        const opt=document.createElement("option");
        const enh=w.enhance||0;
        const name=enh>0?`${w.name}+${enh}`:w.name;
        opt.value=w.id;
        opt.textContent=`${name}（所持${weaponCounts[w.id]}）`;
        wSel.appendChild(opt);
      }
    });
  }
  if(aSel){
    aSel.innerHTML="";
    armors.forEach(a=>{
      if(armorCounts[a.id]>0){
        const opt=document.createElement("option");
        const enh=a.enhance||0;
        const name=enh>0?`${a.name}+${enh}`:a.name;
        opt.value=a.id;
        opt.textContent=`${name}（所持${armorCounts[a.id]}）`;
        aSel.appendChild(opt);
      }
    });
  }

  // クラフト用セレクト（武器）
  if(wCraftSel){
    wCraftSel.innerHTML="";
    CRAFT_RECIPES.weapon.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes("_" + tierFilter)) return;   // 例: dagger_T1
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      const owned = weaponCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";
      opt.textContent = tierLabel ? `${tierLabel}${baseName}${ownedText}` : `${r.name}${ownedText}`;
      wCraftSel.appendChild(opt);
    });
  }

  // クラフト用セレクト（防具）
  if(aCraftSel){
    aCraftSel.innerHTML="";
    CRAFT_RECIPES.armor.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes("_" + tierFilter)) return;
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      const owned = armorCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";
      opt.textContent = tierLabel ? `${tierLabel}${baseName}${ownedText}` : `${r.name}${ownedText}`;
      aCraftSel.appendChild(opt);
    });
  }

  // クラフト用セレクト（ポーション）
  if(pCraftSel){
    pCraftSel.innerHTML="";
    CRAFT_RECIPES.potion.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes(tierFilter)) return;  // potionT1 など
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/T(\d)$/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      const owned = potionCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";
      opt.textContent = tierLabel ? `${tierLabel}${baseName}${ownedText}` : `${r.name}${ownedText}`;
      pCraftSel.appendChild(opt);
    });
  }

  // クラフト用セレクト（道具）
  if(tCraftSel){
    tCraftSel.innerHTML="";
    CRAFT_RECIPES.tool.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes("_" + tierFilter)) return;  // bomb_T1 など
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      // 道具は今のところ個数管理なし（将来用）
      opt.textContent = tierLabel ? `${tierLabel}${baseName}` : r.name;
      tCraftSel.appendChild(opt);
    });
  }

  // クラフト用セレクト（中間素材）
  if (interSel) {
    const prevInterId = interSel.value; // ★ 直前の選択を退避
    interSel.innerHTML = "";
    if (Array.isArray(INTERMEDIATE_MATERIALS)) {
      INTERMEDIATE_MATERIALS.forEach(def => {
        // id に _T1 / _T2 / _T3 などが入っている前提でフィルタ
        if (tierFilter !== "all") {
          if (!def.id.includes("_" + tierFilter)) return;
        }
        const opt = document.createElement("option");
        opt.value = def.id;
        opt.textContent = def.name || def.id;
        interSel.appendChild(opt);
      });
    }
    // ★ 可能なら直前のIDに戻す
    if (prevInterId &&
        Array.from(interSel.options).some(o => o.value === prevInterId)) {
      interSel.value = prevInterId;
    }
  }

  // 必要素材表示の初期値決定
  const infoEl = document.getElementById("craftCostInfo");

  if (wCraftSel && wCraftSel.value) {
    updateCraftCostInfo("weapon", wCraftSel.value);
  } else if (aCraftSel && aCraftSel.value) {
    updateCraftCostInfo("armor", aCraftSel.value);
  } else if (pCraftSel && pCraftSel.value) {
    updateCraftCostInfo("potion", pCraftSel.value);
  } else if (tCraftSel && tCraftSel.value) {
    updateCraftCostInfo("tool", tCraftSel.value);
  } else if (interSel && interSel.value) {
    updateCraftCostInfo("material", interSel.value);
  } else if (infoEl) {
    infoEl.textContent = "必要素材：-";
  }
}

function equipWeapon(){
  const sel=document.getElementById("weaponEquipSelect");
  if(!sel||!sel.value){ appendLog("装備する武器がない"); return; }
  if(weaponCounts[sel.value]<=0){ appendLog("その武器を所持していない"); return; }
  equippedWeaponId=sel.value;
  appendLog("武器を装備した");
  updateDisplay();
}

function equipArmor(){
  const sel=document.getElementById("armorEquipSelect");
  if(!sel||!sel.value){ appendLog("装備する防具がない"); return; }
  if(armorCounts[sel.value]<=0){ appendLog("その防具を所持していない"); return; }
  equippedArmorId=sel.value;
  appendLog("防具を装備した");
  updateDisplay();
}

function consumeOneSameWeaponAsMaterial(weaponId){
  const owned = weaponCounts[weaponId] || 0;
  if(owned <= 1) return false;
  weaponCounts[weaponId] = owned - 1;
  return true;
}

function consumeOneSameArmorAsMaterial(armorId){
  const owned = armorCounts[armorId] || 0;
  if(owned <= 1) return false;
  armorCounts[armorId] = owned - 1;
  return true;
}

function enhanceWeapon(){
  if(!equippedWeaponId){
    appendLog("強化する武器が装備されていない");
    return;
  }
  const w = weapons.find(x=>x.id===equippedWeaponId);
  if(!w) return;
  w.enhance = w.enhance || 0;
  if(w.enhance >= MAX_ENHANCE_LEVEL){
    appendLog("これ以上強化できない");
    return;
  }

  // ★ 星屑チェック（指定レベル以上のときだけ要求）
  if (w.enhance >= STAR_SHARD_NEED_LV) {
    if (typeof itemCounts !== "object") {
      appendLog("星屑の結晶の所持情報が取得できない");
      return;
    }
    const haveShard = itemCounts[STAR_SHARD_ITEM_ID] || 0;
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
  }

  if(!consumeOneSameWeaponAsMaterial(w.id)){
    appendLog("同じ武器がもう1本必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[w.enhance];
  if(money < cost){
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  const rate = ENHANCE_SUCCESS_RATES[w.enhance];
  const success = Math.random()<rate;

  // ★ 星屑消費（成功・失敗に関わらず消費）
  if (w.enhance >= STAR_SHARD_NEED_LV && typeof itemCounts === "object") {
    itemCounts[STAR_SHARD_ITEM_ID] =
      Math.max(0, (itemCounts[STAR_SHARD_ITEM_ID] || 0) - STAR_SHARD_NEED_NUM);
  }

  if(success){
    w.enhance++;
    appendLog(`武器強化成功！ ${w.name}+${w.enhance}になった（同名武器1本消費${w.enhance-1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  }else{
    appendLog(`武器強化失敗…（同名武器は消費された${w.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }
  refreshEquipSelects();
  updateDisplay();
}

function enhanceArmor(){
  if(!equippedArmorId){
    appendLog("強化する防具が装備されていない");
    return;
  }
  const a = armors.find(x=>x.id===equippedArmorId);
  if(!a) return;
  a.enhance = a.enhance || 0;
  if(a.enhance >= MAX_ENHANCE_LEVEL){
    appendLog("これ以上強化できない");
    return;
  }

  // ★ 星屑チェック（指定レベル以上のときだけ要求）
  if (a.enhance >= STAR_SHARD_NEED_LV) {
    if (typeof itemCounts !== "object") {
      appendLog("星屑の結晶の所持情報が取得できない");
      return;
    }
    const haveShard = itemCounts[STAR_SHARD_ITEM_ID] || 0;
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
  }

  if(!consumeOneSameArmorAsMaterial(a.id)){
    appendLog("同じ防具がもう1つ必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[a.enhance];
  if(money < cost){
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  const rate = ENHANCE_SUCCESS_RATES[a.enhance];
  const success = Math.random()<rate;

  // ★ 星屑消費（成功・失敗に関わらず消費）
  if (a.enhance >= STAR_SHARD_NEED_LV && typeof itemCounts === "object") {
    itemCounts[STAR_SHARD_ITEM_ID] =
      Math.max(0, (itemCounts[STAR_SHARD_ITEM_ID] || 0) - STAR_SHARD_NEED_NUM);
  }

  if(success){
    a.enhance++;
    appendLog(`防具強化成功！ ${a.name}+${a.enhance}になった（同名防具1つ消費${a.enhance-1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  }else{
    appendLog(`防具強化失敗…（同名防具は消費された${a.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }
  refreshEquipSelects();
  updateDisplay();
}