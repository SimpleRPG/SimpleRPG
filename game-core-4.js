// game-core-4.js
// 採取専用（フィールド定義・採取ロジック・料理採取・星屑ドロップ）

// =======================
// 採取フィールド定義
// =======================

const MAX_MAT_TIER = 10;

const GATHER_FIELDS = [
  { id: "field1",  name: "近郊の原っぱ",  maxTier: 1 },
  { id: "field2",  name: "星降りの丘",    maxTier: 2 },
  { id: "field3",  name: "翠風の谷",      maxTier: 3 },
  { id: "field4",  name: "碧露の森",      maxTier: 4 },
  { id: "field5",  name: "深紺の鉱山",    maxTier: 5 },
  { id: "field6",  name: "霧雨の湿原",    maxTier: 6 },
  { id: "field7",  name: "紅葉の峡谷",    maxTier: 7 },
  { id: "field8",  name: "白銀の雪原",    maxTier: 8 },
  { id: "field9",  name: "黎明の樹海",    maxTier: 9 },
  { id: "field10", name: "黒曜の断崖",    maxTier: 10 }
  // 食材調達はフィールドではなく、採取タブ内の専用タブ＋ボタンで扱う
];

// 採取スキルレベルによるフィールド解放条件
// ※元の field1〜3 の仕様はそのまま、field4〜10 は素直に 10刻みで拡張
const GATHER_FIELD_REQUIRE_LV = {
  field1:  { wood: 0,  ore: 0,  herb: 0,  cloth: 0,  leather: 0,  water: 0 },
  field2:  { wood: 10, ore: 10, herb: 10, cloth: 10, leather: 10, water: 10 },
  field3:  { wood: 20, ore: 20, herb: 20, cloth: 20, leather: 20, water: 20 },
  field4:  { wood: 30, ore: 30, herb: 30, cloth: 30, leather: 30, water: 30 },
  field5:  { wood: 40, ore: 40, herb: 40, cloth: 40, leather: 40, water: 40 },
  field6:  { wood: 50, ore: 50, herb: 50, cloth: 50, leather: 50, water: 50 },
  field7:  { wood: 60, ore: 60, herb: 60, cloth: 60, leather: 60, water: 60 },
  field8:  { wood: 70, ore: 70, herb: 70, cloth: 70, leather: 70, water: 70 },
  field9:  { wood: 80, ore: 80, herb: 80, cloth: 80, leather: 80, water: 80 },
  field10: { wood: 90, ore: 90, herb: 90, cloth: 90, leather: 90, water: 90 }
};

// 「星屑の結晶」強化用定数
const STAR_SHARD_ITEM_ID  = "starShard";
const STAR_SHARD_NEED_LV  = 5;
const STAR_SHARD_NEED_NUM = 1;

// =======================
// 採取用スキルツリーボーナスキャッシュ
// =======================

let gatherSkillTreeBonus = {
  gatherAmountBonusRate: 0,
  extraGatherBonusRateAdd: 0,
  gatherFailPenaltyRate: 1,
  gatherEquipBonusChanceAdd: 0
};

function refreshGatherSkillTreeBonus() {
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    gatherSkillTreeBonus.gatherAmountBonusRate    = b.gatherAmountBonusRate    || 0;
    gatherSkillTreeBonus.extraGatherBonusRateAdd  = b.extraGatherBonusRateAdd  || 0;
    gatherSkillTreeBonus.gatherEquipBonusChanceAdd= b.gatherEquipBonusChanceAdd|| 0;

    const failRateReduce = b.gatherFailPenaltyRate || 0;
    gatherSkillTreeBonus.gatherFailPenaltyRate = Math.max(0, 1 - failRateReduce);
  } else {
    gatherSkillTreeBonus.gatherAmountBonusRate     = 0;
    gatherSkillTreeBonus.extraGatherBonusRateAdd   = 0;
    gatherSkillTreeBonus.gatherFailPenaltyRate     = 1;
    gatherSkillTreeBonus.gatherEquipBonusChanceAdd = 0;
  }
}

// =======================
// 1時間ごとの採取ボーナスカテゴリ
// =======================

const HOURLY_GATHER_BONUS_CATEGORIES = [
  "wood", "ore", "herb", "cloth", "leather", "water",
  "hunt", "fish", "farm", "garden"
];

function getHourlyGatherBonusCategory() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const h = now.getHours();

  const seed = y * 10000 + m * 100 + d;
  const value = seed + h * 37;
  const idx = Math.abs(value) % HOURLY_GATHER_BONUS_CATEGORIES.length;

  return HOURLY_GATHER_BONUS_CATEGORIES[idx];
}

const EXTRA_GATHER_BONUS_RATE = 0.05;

// =======================
// 採取統計（素材ごと）
// =======================

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

function getGatherStatsList() {
  const list = [];

  const NORMAL_MAT_NAMES = {
    wood: "木",
    ore: "鉱石",
    herb: "草",
    cloth: "布",
    leather: "皮",
    water: "水"
  };

  const normalOrder = ["wood", "ore", "herb", "cloth", "leather", "water"];

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

  // 料理素材統計: gatherStats 側にある ID を見て、名前は ITEM_META 優先で取得
  Object.keys(window.gatherStats).forEach(id => {
    if (normalOrder.includes(id)) return; // 通常素材は上で処理済み

    const stats = window.gatherStats[id];
    if (!stats) return;

    let name = id;
    if (typeof getItemName === "function") {
      name = getItemName(id);
    } else if (COOKING_MAT_NAMES && COOKING_MAT_NAMES[id]) {
      name = COOKING_MAT_NAMES[id];
    }

    list.push({
      id,
      name,
      total: stats.total,
      times: stats.times,
      maxOnce: stats.maxOnce,
      kind: "cooking"
    });
  });

  return list;
}

// =======================
// ペット特性: 兎の別枠+10%ボーナス
// =======================

function tryCompanionExtraGatherOnce(onExtra) {
  if (typeof onExtra !== "function") return;

  // ★追加: 動物使いのときだけペット採取ボーナスを発動させる
  // jobId は game-core-1.js 側のグローバル（0:戦士,1:魔法使い,2:動物使い,3:錬金術師）
  if (typeof window.jobId === "number" && window.jobId !== 2) return;

  if (typeof hasCompanion !== "function" ||
      typeof getCurrentCompanionTrait !== "function") return;
  if (!hasCompanion()) return;

  const trait = getCurrentCompanionTrait();
  if (!trait || !trait.extraGatherRate) return;

  if (Math.random() < trait.extraGatherRate) {
    onExtra();
  }
}

// =======================
// セレクト系ヘルパー
// =======================

function checkGatherAreaUnlockBySkill(resourceKey) {}

function getCurrentGatherTarget() {
  const targetSel = document.getElementById("gatherTarget");
  if (!targetSel) return null;
  return targetSel.value || null;
}

function refreshGatherTargetSelect() {
  const targetSel = document.getElementById("gatherTarget");
  const fieldSel  = document.getElementById("gatherField");
  if (!targetSel || !fieldSel) return;

  const field = fieldSel.value;
  const prev  = targetSel.value;

  targetSel.innerHTML = "";

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

function canEnterGatherFieldForTarget(fieldId, target) {
  if (!target) return false;

  const s = gatherSkills[target];
  const lv = s ? s.lv : 0;

  const table = GATHER_FIELD_REQUIRE_LV[fieldId] || {};
  const needLv = table[target] ?? 0;

  return lv >= needLv;
}

function refreshGatherFieldSelect() {
  const sel = document.getElementById("gatherField");
  if (!sel) return;

  const currentTarget = getCurrentGatherTarget();

  const prev = sel.value;
  sel.innerHTML = "";

  const unlocked = [];

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
    if (allGatherLv0 && f.id !== "field1") {
      return;
    }

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
// 食材調達（狩猟 / 釣り）
// =======================

function gatherCooking(mode) {
  const startTime = Date.now(); // ★デバッグ用: 所要時間計測用

  refreshGatherSkillTreeBonus();

  if (mode === "farm") {
    appendLog("農園の管理・収穫は農園メニューで行ってください。");
    return;
  }

  let skillKey;
  if (mode === "hunt" || mode === "fish") {
    skillKey = mode;
  } else {
    appendLog("この採取モードは現在使用できません");
    return;
  }

  let added = calcGatherAmount(skillKey);

  if (gatherSkillTreeBonus.gatherAmountBonusRate > 0) {
    const rate = gatherSkillTreeBonus.gatherAmountBonusRate;
    added = Math.max(1, Math.floor(added * (1 + rate)));
  }

  if (typeof getDailyGatherBonus === "function") {
    const daily = getDailyGatherBonus(mode);
    if (daily && typeof daily.amountRate === "number" && daily.amountRate !== 1) {
      added = Math.max(1, Math.floor(added * daily.amountRate));
    }
  }

  if (mode === "fish" && window.currentFishingBait === "strong") {
    if (Math.random() < 0.5) {
      added -= 1;
    }
  }

  const GATHER_COOK_HUNT = [
    "meat_hard",
    "meat_soft",
    "meat_fatty",
    "meat_premium",
    "meat_magic"
  ];

  let pool = [];
  if (mode === "hunt") {
    pool = GATHER_COOK_HUNT;
  }

  if (!pool.length && mode === "hunt") {
    appendLog("今は料理素材を採取できない");
    return;
  }

  if (typeof cookingMats !== "object") {
    appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
    return;
  }

  let bonusChanceCook = 0;
  const hourlyBonus = getHourlyGatherBonusCategory();
  if (hourlyBonus === mode) {
    bonusChanceCook += 0.20;
  }

  if (typeof getGuildGatherExtraBonusChance === "function") {
    const guildExtra = getGuildGatherExtraBonusChance();
    if (guildExtra > 0) {
      bonusChanceCook += guildExtra;
    }
  }

  let extraRateCook = EXTRA_GATHER_BONUS_RATE;

  if (gatherSkillTreeBonus.extraGatherBonusRateAdd > 0) {
    extraRateCook += gatherSkillTreeBonus.extraGatherBonusRateAdd;
  }

  if (extraRateCook < 0) extraRateCook = 0;
  if (extraRateCook > 1) extraRateCook = 1;

  if (Math.random() < extraRateCook) {
    const extra = 1 + Math.floor(Math.random() * 3);
    added += extra;
    appendLog(`手際が良く、いつもより多く料理素材を集められた！（+${extra}）`);
  }

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
  let hasRareFish = false;

  if (mode === "hunt") {
    for (let i = 0; i < added; i++) {
      const id = pool[Math.floor(Math.random() * pool.length)];

      const q = (typeof rollCookingMatQuality === "function")
        ? rollCookingMatQuality()
        : 0;

      // 品質テーブル更新（従来仕様）
      if (typeof addCookingMatWithQuality === "function") {
        addCookingMatWithQuality(id, q);
      }

      // 在庫カウントは ITEM_META 経由を優先（cooking ストレージ）
      if (typeof addItemByMeta === "function") {
        addItemByMeta(id, 1);
      } else {
        cookingMats[id] = (cookingMats[id] || 0) + 1;
      }

      gained[id] = (gained[id] || 0) + 1;
    }
  } else if (mode === "fish") {
    const area = window.currentFishingArea || "river";
    const bait = window.currentFishingBait || "default";

    for (let i = 0; i < added; i++) {
      let fishId;

      if (typeof rollFishKind === "function") {
        fishId = rollFishKind(area, bait);
      } else {
        fishId = "fish_small";
      }

      if (!fishId) {
        fishId = "fish_small";
      }

      let finalFishId = fishId;

      let legendRate = 0.0004;
      if (bait === "strong") {
        legendRate *= 2;
      }
      if (Math.random() < legendRate) {
        finalFishId = "fish_legend";
      }

      const q = (typeof rollCookingMatQuality === "function")
        ? rollCookingMatQuality()
        : 0;

      if (typeof addCookingMatWithQuality === "function") {
        addCookingMatWithQuality(finalFishId, q);
      }

      if (typeof addItemByMeta === "function") {
        addItemByMeta(finalFishId, 1);
      } else {
        cookingMats[finalFishId] = (cookingMats[finalFishId] || 0) + 1;
      }

      gained[finalFishId] = (gained[finalFishId] || 0) + 1;

      let size = null;
      if (typeof rollFishSize === "function") {
        size = rollFishSize(finalFishId);
      }
      if (typeof updateFishDex === "function") {
        updateFishDex(finalFishId, {
          area,
          bait,
          size,
          date: new Date()
        });
      }

      if (finalFishId === "fish_big" || finalFishId === "fish_deep" || finalFishId === "fish_legend") {
        hasRareFish = true;
      }

      if (finalFishId === "fish_legend") {
        appendLog("🌟 伝説の魚を釣り上げた！");
      }
    }
  }

  tryCompanionExtraGatherOnce(() => {
    const ids = Object.keys(gained);
    if (ids.length > 0) {
      const pickId = ids[Math.floor(Math.random() * ids.length)];

      const q = (typeof rollCookingMatQuality === "function")
        ? rollCookingMatQuality()
        : 0;

      if (typeof addCookingMatWithQuality === "function") {
        addCookingMatWithQuality(pickId, q);
      }

      if (typeof addItemByMeta === "function") {
        addItemByMeta(pickId, 1);
      } else {
        cookingMats[pickId] = (cookingMats[pickId] || 0) + 1;
      }

      gained[pickId]      = (gained[pickId]      || 0) + 1;
      appendLog("ペットが追加で料理素材を見つけてきた！");
    }
  });

  Object.keys(gained).forEach(id => {
    addGatherStat(id, gained[id]);
  });

  addGatherSkillExp(skillKey);

  const modeLabel =
    (mode === "hunt") ? "狩猟" :
    (mode === "fish") ? "釣り" :
    mode;

  const parts = Object.keys(gained).map(id => {
    let name = id;
    if (typeof getItemName === "function") {
      name = getItemName(id);
    } else if (COOKING_MAT_NAMES && COOKING_MAT_NAMES[id]) {
      name = COOKING_MAT_NAMES[id];
    }
    return `${name}×${gained[id]}`;
  });

  if (mode === "fish" && parts.length === 0) {
    appendLog("【釣り】何も釣れなかった…");
  } else {
    const gainedText = parts.length ? parts.join("、") : `料理素材×${added}`;
    appendLog(`【${modeLabel}】で ${gainedText} を採取した`);
  }

  lastGatherInfo = {
    kind: "cooking",
    gained: gained
  };

  if (typeof onGatherCompletedForGuild === "function") {
    let totalCount = 0;
    Object.keys(gained).forEach(id => {
      totalCount += gained[id];
    });
    onGatherCompletedForGuild({
      kind: "food",
      total: totalCount,
      rare: hasRareFish,
      mode: mode
    });
  }

  if (typeof RARE_GATHER_DROP_RATE === "number" &&
      typeof RARE_GATHER_ITEM_ID === "string") {
    if (Math.random() < RARE_GATHER_DROP_RATE) {
      if (typeof addItemByMeta === "function") {
        addItemByMeta(RARE_GATHER_ITEM_ID, 1);
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

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  // ★デバッグ用: 料理採取ログ（簡易）
  if (typeof debugRecordGather === "function") {
    try {
      let total = 0;
      Object.keys(gained).forEach(id => { total += gained[id]; });
      const timeSec = (Date.now() - startTime) / 1000;
      debugRecordGather(mode, null, total, timeSec, {
        skillLv: (gatherSkills[skillKey] && gatherSkills[skillKey].lv) || null
      });
    } catch (e) {}
  }
}

// =======================
// 通常採取
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

  if (gatherSkillTreeBonus.gatherAmountBonusRate > 0) {
    const rate = gatherSkillTreeBonus.gatherAmountBonusRate;
    total = Math.max(1, Math.floor(total * (1 + rate)));
  }

  return Math.max(1, total);
}

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
  fish_legend: "伝説の魚",
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

window.lastGatherInfo = window.lastGatherInfo || null;

// =======================
// 採取装備ボーナス判定
// =======================

function getGatherBonusChance(target) {
  const weapon = window.currentWeapon || null;
  const armor  = window.currentArmor || null;
  const weaponId = weapon && weapon.id ? weapon.id : (weapon && weapon.itemId ? weapon.itemId : null);
  const armorId  = armor  && armor.id  ? armor.id  : (armor  && armor.itemId  ? armor.itemId  : null);

  const weaponPrefixMap = {
    wood:    "gatherAxe",
    ore:     "gatherPick",
    herb:    "gatherKnife",
    cloth:   "gatherShears",
    leather: "gatherDagger",
    water:   "gatherFlask"
  };

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

  const getTier = (id) => {
    if (!id) return null;
    if (id.endsWith("_T3")) return "T3";
    if (id.endsWith("_T2")) return "T2";
    if (id.endsWith("_T1")) return "T1";
    return null;
  };

  const wTier = hasWeapon ? getTier(weaponId) : null;
  const aTier = hasArmor  ? getTier(armorId)  : null;

  const pairTier = (wTier && aTier)
    ? (wTier === "T1" || aTier === "T1" ? "T1"
      : (wTier === "T2" || aTier === "T2" ? "T2" : "T3"))
    : null;

  let chance = 0;

  if (hasWeapon && hasArmor && pairTier) {
    if (pairTier === "T1") chance = 0.20;
    else if (pairTier === "T2") chance = 0.40;
    else if (pairTier === "T3") chance = 0.60;
  } else {
    const singleTier = wTier || aTier;
    if (singleTier === "T1") chance = 0.05;
    else if (singleTier === "T2") chance = 0.15;
    else if (singleTier === "T3") chance = 0.25;
  }

  if (gatherSkillTreeBonus.gatherEquipBonusChanceAdd) {
    chance += gatherSkillTreeBonus.gatherEquipBonusChanceAdd;
  }

  if (chance < 0) chance = 0;
  if (chance > 1) chance = 1;

  return chance;
}

// =======================
// フィールドごとのティア分布（%）
// 既存 field1〜3 は元の仕様と完全一致になるように設定
// field4〜10 は「高ティアほど出にくい」方向で拡張
// 配列は [T1, T2, ..., TN] で合計100になるように調整
// =======================

const FIELD_TIER_DIST = {
  field1:  [100],                    // T1のみ
  field2:  [80, 20],                 // T1:80, T2:20
  field3:  [60, 30, 10],             // T1:60, T2:30, T3:10 （元コードの挙動と一致する比率）
  field4:  [45, 30, 15, 10],
  field5:  [35, 28, 18, 11, 8],
  field6:  [28, 25, 20, 12, 9, 6],
  field7:  [23, 23, 20, 13, 9, 7, 5],
  field8:  [19, 22, 20, 14, 10, 7, 5, 3],
  field9:  [16, 21, 20, 15, 10, 7, 5, 4, 2],
  field10: [14, 20, 20, 15, 10, 7, 5, 4, 3, 2]
};

function getFieldMaxTier(fieldId) {
  const f = GATHER_FIELDS.find(f => f.id === fieldId);
  if (!f || !f.maxTier) return 1;
  return Math.min(f.maxTier, MAX_MAT_TIER);
}

function rollGatherTierForField(fieldId) {
  const dist = FIELD_TIER_DIST[fieldId];
  if (!dist || !dist.length) {
    // 定義がなければ安全側で T1 のみ
    return 1;
  }
  let r = Math.random() * 100;
  for (let i = 0; i < dist.length; i++) {
    r -= dist[i];
    if (r <= 0) {
      return i + 1; // tier = 1〜dist.length
    }
  }
  return dist.length;
}

function gather(){
  const startTime = Date.now(); // ★デバッグ用: 所要時間計測用

  const targetSel = document.getElementById("gatherTarget");
  if (!targetSel) return;
  const target = targetSel.value;

  const fieldSel = document.getElementById("gatherField");
  const field = fieldSel ? fieldSel.value : "field1";

  refreshGatherSkillTreeBonus();

  const s = gatherSkills[target];
  const lv = s ? s.lv : 0;

  checkGatherAreaUnlockBySkill(target);

  const table = GATHER_FIELD_REQUIRE_LV[field] || {};
  const needLv = table[target] ?? 0;
  if (lv < needLv) {
    appendLog(`このエリアで採取するには「${target}」採取スキルLv${needLv}が必要です（現在Lv${lv}）`);
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
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

  if (typeof getDailyGatherBonus === "function") {
    const daily = getDailyGatherBonus(target);
    if (daily && typeof daily.amountRate === "number" && daily.amountRate !== 1) {
      added = Math.max(0, Math.floor(added * daily.amountRate));
    }
  }

  if (typeof currentHunger === "number" && typeof currentThirst === "number") {
    let failChance = 0;
    if (currentHunger < 25 || currentThirst < 25) {
      failChance = 0.20;
    }
    if (currentHunger < 10 || currentThirst < 10) {
      failChance = 0.50;
    }

    if (failChance > 0 && gatherSkillTreeBonus.gatherFailPenaltyRate >= 0) {
      failChance *= gatherSkillTreeBonus.gatherFailPenaltyRate;
    }

    if (failChance > 0 && Math.random() < failChance) {
      added = 0;
      appendLog("体力がもたず、採取に失敗してしまった…");
    }
  }

  if (added === 0) {
    appendLog("何も採取できなかった…");
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }

    // ★デバッグ用: 失敗もログに残したい場合
    if (typeof debugRecordGather === "function") {
      try {
        const timeSec = (Date.now() - startTime) / 1000;
        debugRecordGather(target, null, 0, timeSec, {
          skillLv: (gatherSkills[target] && gatherSkills[target].lv) || null
        });
      } catch (e) {}
    }

    return;
  }

  let extraRate = EXTRA_GATHER_BONUS_RATE;

  if (gatherSkillTreeBonus.extraGatherBonusRateAdd > 0) {
    extraRate += gatherSkillTreeBonus.extraGatherBonusRateAdd;
  }

  if (extraRate < 0) extraRate = 0;
  if (extraRate > 1) extraRate = 1;

  if (Math.random() < extraRate) {
    const extra = 1 + Math.floor(Math.random() * 3);
    added += extra;
    appendLog(`手際が良く、いつもより多く採取できた！（+${extra}）`);
  }

  let bonusChance = getGatherBonusChance(target);

  if (typeof currentHunger === "number" && typeof currentThirst === "number") {
    if (currentHunger >= 80 && currentThirst >= 80) {
      bonusChance += 0.20;
    } else if (currentHunger <= 25 || currentThirst <= 25) {
      bonusChance -= 0.20;
    }
  }

  const hourlyBonusCategory = getHourlyGatherBonusCategory();
  if (hourlyBonusCategory === target) {
    bonusChance += 0.20;
  }

  if (typeof getGuildGatherExtraBonusChance === "function") {
    const guildExtra = getGuildGatherExtraBonusChance();
    if (guildExtra > 0) {
      bonusChance += guildExtra;
    }
  }

  if (bonusChance > 0) {
    const guaranteed = Math.floor(bonusChance);
    const fraction   = bonusChance - guaranteed;

    if (guaranteed > 0) {
      added += guaranteed;
    }
    if (fraction > 0 && Math.random() < fraction) {
      added += 1;
    }
  }

  // ティアごとのカウント（T1〜T10）
  const tierCounts = new Array(MAX_MAT_TIER).fill(0);

  for (let i = 0; i < added; i++) {
    const tier = rollGatherTierForField(field);
    const idx = Math.max(1, Math.min(tier, MAX_MAT_TIER)) - 1;
    tierCounts[idx] += 1;
  }

  // 旧ロジック互換用（T1〜T3）
  let t1 = tierCounts[0] || 0;
  let t2 = tierCounts[1] || 0;
  let t3 = tierCounts[2] || 0;

  // 一次素材を materials-core 経由 or メタ経由で追加
  if (typeof window.addMatTierCount === "function") {
    for (let tier = 1; tier <= MAX_MAT_TIER; tier++) {
      const cnt = tierCounts[tier - 1] || 0;
      if (cnt > 0) {
        window.addMatTierCount(target, tier, cnt);
      }
    }
  } else if (typeof addItemByMeta === "function") {
    for (let tier = 1; tier <= MAX_MAT_TIER; tier++) {
      const cnt = tierCounts[tier - 1] || 0;
      if (cnt > 0) {
        addItemByMeta(`${target}_T${tier}`, cnt);
      }
    }
  }

  tryCompanionExtraGatherOnce(() => {
    // ペット分は「そのフィールドで最も出やすい下位ティア」を1つ追加する扱いにする
    // 元仕様では field3 ならT3, field2ならT2, それ以外T1だったので、
    // それに近い挙動として「field3までは専用分岐、それ以降は maxTier を優先」
    let addTier = 1;
    if (field === "field3") {
      addTier = 3;
    } else if (field === "field2") {
      addTier = 2;
    } else {
      const maxTier = getFieldMaxTier(field);
      addTier = Math.min(1, maxTier);
    }

    const idx = Math.max(1, Math.min(addTier, MAX_MAT_TIER)) - 1;
    tierCounts[idx] += 1;

    if (typeof window.addMatTierCount === "function") {
      window.addMatTierCount(target, addTier, 1);
    } else if (typeof addItemByMeta === "function") {
      addItemByMeta(`${target}_T${addTier}`, 1);
    }

    // 旧互換カウント更新
    if (addTier === 1) t1 += 1;
    else if (addTier === 2) t2 += 1;
    else if (addTier === 3) t3 += 1;

    appendLog("ペットが追加で素材を見つけてきた！");
  });

  const gainedTotal = tierCounts.reduce((a, b) => a + b, 0);
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

  // T4以上もログ出したければここに追加で appendLog を書ける

  if (typeof onGatherCompletedForGuild === "function") {
    onGatherCompletedForGuild({
      kind: "gather",
      total: gainedTotal,
      t1: t1,
      t2: t2,
      t3: t3,
      target: target
    });
  }

  if (typeof RARE_GATHER_DROP_RATE === "number" &&
      typeof RARE_GATHER_ITEM_ID === "string") {
    if (Math.random() < RARE_GATHER_DROP_RATE) {
      if (typeof addItemByMeta === "function") {
        addItemByMeta(RARE_GATHER_ITEM_ID, 1);
      }
      appendLog("✨ 星屑の結晶を手に入れた！");
    }
  }

  lastGatherInfo = {
    baseKey: target,
    field: field,
    tiers: {
      t1,
      t2,
      t3
      // 必要なら tierCounts 全体もここに載せられる
    }
  };

  if (typeof handleHungerThirstOnAction === "function") {
    handleHungerThirstOnAction("gather");
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  // ★デバッグ用: 通常採取ログ
  if (typeof debugRecordGather === "function") {
    try {
      const timeSec = (Date.now() - startTime) / 1000;
      debugRecordGather(target, null, gainedTotal, timeSec, {
        skillLv: (gatherSkills[target] && gatherSkills[target].lv) || null
      });
    } catch (e) {}
  }
}

// =======================
// 採取拠点の自動採取（tick）
// =======================

function tickGatherBasesOnce() {
  if (typeof getGatherBaseStatus !== "function") return;

  const bases = getGatherBaseStatus();
  if (!bases) return;

  Object.keys(bases).forEach(key => {
    const base = bases[key];
    if (!base || base.level <= 0) return;

    if (typeof calcGatherBaseTickAmount !== "function") return;

    const result = calcGatherBaseTickAmount(key, base);
    const t1Amount = result.t1 || 0;
    const t2Amount = result.t2 || 0;

    if (typeof window.addMatTierCount === "function") {
      if (t1Amount > 0) window.addMatTierCount(key, 1, t1Amount);
      if (t2Amount > 0) window.addMatTierCount(key, 2, t2Amount);
    } else if (typeof addItemByMeta === "function") {
      if (t1Amount > 0) addItemByMeta(`${key}_T1`, t1Amount);
      if (t2Amount > 0) addItemByMeta(`${key}_T2`, t2Amount);
    }

    if (typeof addGatherStat === "function") {
      const gained = (t1Amount || 0) + (t2Amount || 0);
      if (gained > 0) addGatherStat(key, gained);
    }
  });
}