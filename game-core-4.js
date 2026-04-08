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
  { id: "cook",   name: "食材調達" } // 料理用フィールド
];

// 採取スキルレベルによるフィールド解放条件
// フィールド × 資源(target) ごとに必要Lvを持つ
// wood / ore / herb / cloth / leather / water
const GATHER_FIELD_REQUIRE_LV = {
  field1: { wood: 0,  ore: 0,  herb: 0,  cloth: 0,  leather: 0,  water: 0 },
  field2: { wood: 20, ore: 20, herb: 20, cloth: 20, leather: 20, water: 20 },
  field3: { wood: 40, ore: 40, herb: 40, cloth: 40, leather: 40, water: 40 }
  // cook は制限なし（通常素材ターゲットはそもそも使わない）
};

// 「星屑の結晶」強化用定数（他ファイルで上書きしてもOK）
const STAR_SHARD_ITEM_ID  = "starShard"; // itemCounts で使うキー名
const STAR_SHARD_NEED_LV  = 5;           // この強化段階（現在値）以上から星屑要求
const STAR_SHARD_NEED_NUM = 1;           // 1回の強化で必要な個数

// =======================
// 1時間ごとの採取ボーナスカテゴリ
// =======================

// 対象カテゴリ一覧（通常6＋料理4＝10）
const HOURLY_GATHER_BONUS_CATEGORIES = [
  "wood", "ore", "herb", "cloth", "leather", "water",
  "hunt", "fish", "farm", "garden"
];

// 現在の時間から、今のボーナスカテゴリを決定する。
// 「1時間ごとに全員同じ」になるよう、時刻→インデックスへの簡単な決定関数。
function getHourlyGatherBonusCategory() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  const d = now.getDate();
  const h = now.getHours();     // 0-23

  const seed = y * 10000 + m * 100 + d;
  const value = seed + h * 37;
  const idx = Math.abs(value) % HOURLY_GATHER_BONUS_CATEGORIES.length;

  return HOURLY_GATHER_BONUS_CATEGORIES[idx];
}

// 「たまにちょっと多めに取れる」確率（通常／料理共通）
const EXTRA_GATHER_BONUS_RATE = 0.05; // 5%

// =======================
// 採取統計（素材ごと）
// =======================

// gatherStats[materialId] = { total: 累計個数, times: 採取回数, maxOnce: 一度の最大数 }
window.gatherStats = window.gatherStats || {};

function addGatherStat(materialId, gainedCount) {
  if (!materialId || gainedCount <= 0) return;
  const stats = window.gatherStats[materialId] || { total: 0, times: 0, maxOnce: 0 };
  stats.total += gainedCount;
  stats.times += 1;
  if (gainedCount > stats.maxOnce) {
    stats.maxOnce = gainedCount;
  }
  window.gatherStats[materialId] = stats;
}

// 統計タブ用：素材ごとの統計一覧を返すヘルパー
// 戻り値: [{ id, name, total, times, maxOnce, kind: "normal" | "cook" }, ...]
function getGatherStatsList() {
  const list = [];

  // 通常素材名テーブル
  const NORMAL_MAT_NAMES = {
    wood: "木",
    ore: "鉱石",
    herb: "草",
    cloth: "布",
    leather: "皮",
    water: "水"
  };

  const normalOrder = ["wood", "ore", "herb", "cloth", "leather", "water"];

  // 通常素材
  normalOrder.forEach(id => {
    const stats = window.gatherStats[id];
    if (!stats) return;
    list.push({
      id,
      name: NORMAL_MAT_NAMES[id] || id,
      total: stats.total,
      times: stats.times,
      maxOnce: stats.maxOnce,
      kind: "normal"
    });
  });

  // 料理素材（COOKING_MAT_NAMES のキー順）
  Object.keys(COOKING_MAT_NAMES).forEach(id => {
    const stats = window.gatherStats[id];
    if (!stats) return;
    list.push({
      id,
      name: COOKING_MAT_NAMES[id] || id,
      total: stats.total,
      times: stats.times,
      maxOnce: stats.maxOnce,
      kind: "cook"
    });
  });

  return list;
}

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
  // 料理素材の採取地（食材調達）
  // =======================
  if (field === "cook") {
    // 狩猟 / 釣り / 畑 / 菜園 の4モード
    const modes = [
      { id: "hunt",   name: "狩猟" },
      { id: "fish",   name: "釣り" },
      { id: "farm",   name: "畑" },
      { id: "garden", name: "菜園" }
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

    const table = GATHER_FIELD_REQUIRE_LV[field] || {};
    const needLv = table[t.id] ?? 0;

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

// 採取場所セレクトを更新
function refreshGatherFieldSelect() {
  const sel = document.getElementById("gatherField");
  if (!sel) return;

  const currentTarget = getCurrentGatherTarget(); // cook のときは null

  const prev = sel.value;
  sel.innerHTML = "";

  const unlocked = [];

  // 全採取スキルが Lv0 かどうかチェック
  // ※料理用は hunt / fish / fieldFarm / garden の4種
  const allGatherLv0 =
    gatherSkills.wood.lv      === 0 &&
    gatherSkills.ore.lv       === 0 &&
    gatherSkills.herb.lv      === 0 &&
    gatherSkills.cloth.lv     === 0 &&
    gatherSkills.leather.lv   === 0 &&
    gatherSkills.water.lv     === 0 &&
    gatherSkills.hunt.lv      === 0 &&
    gatherSkills.fish.lv      === 0 &&
    gatherSkills.fieldFarm.lv === 0 &&
    gatherSkills.garden.lv    === 0;

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

    // target が null（＝まだ何も選んでない）ときは field1 だけ出す
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
  refreshGatherFieldSelect();

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

// 直近の通常素材採取情報
window.lastGatherInfo = null;

// =======================
// 採取装備ボーナス判定
// =======================

// 現在装備中の採取用武器/防具が target に対応しているかを判定して
// 「+1個ボーナス抽選」の確率を返す。
// セット時: T1=20% / T2=40% / T3=60%
// 片方だけ: T1=5% / T2=15% / T3=25%
function getGatherBonusChance(target) {
  // 装備情報が無ければボーナス無し
  const weapon = window.currentWeapon || null;
  const armor  = window.currentArmor || null;
  const weaponId = weapon && weapon.id ? weapon.id : (weapon && weapon.itemId ? weapon.itemId : null);
  const armorId  = armor  && armor.id  ? armor.id  : (armor  && armor.itemId  ? armor.itemId  : null);

  // 対応する採取武器IDの prefix
  const weaponPrefixMap = {
    wood:    "gatherAxe",
    ore:     "gatherPick",
    herb:    "gatherKnife",
    cloth:   "gatherShears",
    leather: "gatherDagger",
    water:   "gatherFlask"
  };

  // 対応する採取防具IDの prefix
  const armorPrefixMap = {
    wood:    "gatherArmorWood",
    ore:     "gatherArmorOre",
    herb:    "gatherArmorHerb",
    cloth:   "gatherArmorCloth",
    leather: "gatherArmorLeather",
    water:   "gatherArmorWater"
  };

  const wPrefix = weaponPrefixMap[target];
  const aPrefix = armorPrefixMap[target];
  if (!wPrefix && !aPrefix) return 0;

  const hasWeapon = weaponId && weaponId.startsWith(wPrefix);
  const hasArmor  = armorId  && armorId.startsWith(aPrefix);
  if (!hasWeapon && !hasArmor) return 0;

  // ティア判定（ID末尾の _T1/_T2/_T3）
  const getTier = (id) => {
    if (!id) return null;
    if (id.endsWith("_T3")) return "T3";
    if (id.endsWith("_T2")) return "T2";
    if (id.endsWith("_T1")) return "T1";
    return null;
  };

  const wTier = hasWeapon ? getTier(weaponId) : null;
  const aTier = hasArmor  ? getTier(armorId)  : null;

  // 両方装備している場合は「低い方のティア」をセットティアとして採用
  const pairTier = (wTier && aTier)
    ? (wTier === "T1" || aTier === "T1" ? "T1"
      : (wTier === "T2" || aTier === "T2" ? "T2" : "T3"))
    : null;

  let chance = 0;

  if (hasWeapon && hasArmor && pairTier) {
    // セット装備時
    if (pairTier === "T1") chance = 0.20;
    else if (pairTier === "T2") chance = 0.40;
    else if (pairTier === "T3") chance = 0.60;
  } else {
    // 片方だけ装備時（弱め）
    const singleTier = wTier || aTier;
    if (singleTier === "T1") chance = 0.05;
    else if (singleTier === "T2") chance = 0.15;
    else if (singleTier === "T3") chance = 0.25;
  }

  return chance;
}

function gather(){
  const targetSel = document.getElementById("gatherTarget");
  if (!targetSel) return;
  const target = targetSel.value; // wood / ore / herb / cloth / leather / water or "hunt/fish/farm/garden"

  const fieldSel = document.getElementById("gatherField");
  const field = fieldSel ? fieldSel.value : "field1";

  // =======================
  // 料理採取モード（食材調達）
  // =======================
  if (field === "cook") {
    const cookModeSel = document.getElementById("gatherTarget");
    if (!cookModeSel) {
      appendLog("料理採取モードの設定が見つかりません");
      return;
    }
    const mode = cookModeSel.value; // "hunt" / "fish" / "farm" / "garden"

    // 対応する採取スキルで量を計算
    let skillKey;
    if (mode === "hunt" || mode === "fish") {
      skillKey = mode;
    } else if (mode === "farm") {
      skillKey = "fieldFarm";
    } else {
      skillKey = "garden";
    }
    let added = calcGatherAmount(skillKey);

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
    const GATHER_COOK_FARM_FIELD = [
      "veg_root_rough",
      "veg_leaf_crisp",
      "veg_premium",
      "veg_mushroom_aroma",
      "veg_mountain",
      "grain_mochi",
      "grain_coarse",
      "grain_refined",
      "grain_ancient"
    ];
    const GATHER_COOK_GARDEN_FIELD = [
      "veg_herb_aroma",
      "veg_spice",
      "veg_dried",
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
    } else if (mode === "farm") {
      pool = GATHER_COOK_FARM_FIELD;
    } else {
      pool = GATHER_COOK_GARDEN_FIELD;
    }

    if (!pool.length) {
      appendLog("今は料理素材を採取できない");
      return;
    }

    if (typeof cookingMats !== "object") {
      appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
      return;
    }

    // 1時間ボーナス（料理カテゴリ）
    let bonusChanceCook = 0;
    const hourlyBonus = getHourlyGatherBonusCategory();
    if (hourlyBonus === mode) {
      bonusChanceCook += 0.20;
    }

    // 「たまに多めに取れる」イベント（料理）
    if (Math.random() < EXTRA_GATHER_BONUS_RATE) {
      const extra = 1 + Math.floor(Math.random() * 3); // 1〜3
      added += extra;
      appendLog(`手際が良く、いつもより多く料理素材を集められた！（+${extra}）`);
    }

    // 料理の＋1抽選（いまは1時間ボーナスのみ）
    if (bonusChanceCook > 0) {
      const guaranteed = Math.floor(bonusChanceCook);
      const fraction   = bonusChanceCook - guaranteed;
      if (guaranteed > 0) {
        added += guaranteed;
      }
      if (fraction > 0 && Math.random() < fraction) {
        added += 1;
      }
    }

    let gained = {};
    for (let i = 0; i < added; i++) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      cookingMats[id] = (cookingMats[id] || 0) + 1;
      gained[id] = (gained[id] || 0) + 1;
    }

    // 料理素材ごとの統計更新
    Object.keys(gained).forEach(id => {
      addGatherStat(id, gained[id]);
    });

    addGatherSkillExp(skillKey);

    const modeLabel =
      (mode === "hunt")   ? "狩猟" :
      (mode === "fish")   ? "釣り" :
      (mode === "farm")   ? "畑"   :
                            "菜園";

    const parts = Object.keys(gained).map(id => {
      const name = COOKING_MAT_NAMES[id] || id;
      return `${name}×${gained[id]}`;
    });
    const gainedText = parts.length ? parts.join("、") : `料理素材×${added}`;

    appendLog(`【${modeLabel}】で ${gainedText} を採取した`);

    lastGatherInfo = {
      kind: "cooking",
      gained: gained
    };

    // ★ 食材ギルド用：料理素材採取依頼を進行
    if (typeof onGatherCompletedForGuild === "function") {
      let totalCount = 0;
      Object.keys(gained).forEach(id => {
        totalCount += gained[id];
      });
      onGatherCompletedForGuild({
        kind: "food",
        total: totalCount
      });
    }

    if (typeof RARE_GATHER_DROP_RATE === "number" &&
        typeof RARE_GATHER_ITEM_ID === "string") {
      if (Math.random() < RARE_GATHER_DROP_RATE) {
        if (typeof itemCounts === "object") {
          itemCounts[RARE_GATHER_ITEM_ID] = (itemCounts[RARE_GATHER_ITEM_ID] || 0) + 1;
        }
        appendLog("✨ 星屑の結晶を手に入れた！（料理採取）");
      }
    }

    if (typeof handleHungerThirstOnAction === "function") {
      handleHungerThirstOnAction("gather");
    }

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

  // 「たまに多めに取れる」イベント（通常）
  if (Math.random() < EXTRA_GATHER_BONUS_RATE) {
    const extra = 1 + Math.floor(Math.random() * 3); // 1〜3
    added += extra;
    appendLog(`手際が良く、いつもより多く採取できた！（+${extra}）`);
  }

  // 採取装備ボーナス（+1個抽選）＋ 空腹・水分＋1時間カテゴリボーナスによる加算補正（上限なし）
  let bonusChance = getGatherBonusChance(target);

  // 空腹・水分補正
  if (typeof currentHunger === "number" && typeof currentThirst === "number") {
    // バフ: 両方80%以上 → +0.20
    if (currentHunger >= 80 && currentThirst >= 80) {
      bonusChance += 0.20;
    }
    // デバフ: どちらか25%以下 → -0.20
    else if (currentHunger <= 25 || currentThirst <= 25) {
      bonusChance -= 0.20;
    }
  }

  // 1時間ごとのカテゴリボーナス
  const hourlyBonusCategory = getHourlyGatherBonusCategory();
  if (hourlyBonusCategory === target) {
    bonusChance += 0.20;
  }

  if (bonusChance > 0) {
    const guaranteed = Math.floor(bonusChance);       // 1.2 → 1
    const fraction   = bonusChance - guaranteed;      // 1.2 → 0.2

    if (guaranteed > 0) {
      added += guaranteed;
    }
    if (fraction > 0 && Math.random() < fraction) {
      added += 1;
    }
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

  // 通常素材ごとの統計更新（target単位で合計）
  const gainedTotal = t1 + t2 + t3;
  addGatherStat(target, gainedTotal);

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

  // ★ 採取ギルド用：通常素材採取依頼を進行
  if (typeof onGatherCompletedForGuild === "function") {
    onGatherCompletedForGuild({
      kind: "gather",
      total: gainedTotal,
      t3: t3
    });
  }

  if (typeof RARE_GATHER_DROP_RATE === "number" &&
      typeof RARE_GATHER_ITEM_ID === "string") {
    if (Math.random() < RARE_GATHER_DROP_RATE) {
      if (typeof itemCounts === "object") {
        itemCounts[RARE_GATHER_ITEM_ID] = (itemCounts[RARE_GATHER_ITEM_ID] || 0) + 1;
      }
      appendLog("✨ 星屑の結晶を手に入れた！");
    }
  }

  lastGatherInfo = {
    baseKey: target,
    field: field,
    tiers: { t1, t2, t3 }
  };

  if (typeof handleHungerThirstOnAction === "function") {
    handleHungerThirstOnAction("gather");
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}