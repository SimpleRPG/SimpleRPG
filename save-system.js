// save-system.js 
// セーブデータ関係
// オンラインブラウザゲーム化前段階：テストプレイヤーがデバッグ状態を引き継げるようにする

const SAVE_VERSION = 1;
const SAVE_KEY = "myGatherGameSave_v1";

// ==============================
// ゲーム状態 → プレーンオブジェクトへ
// ==============================
function makeSaveData() {
  return {
    version: SAVE_VERSION,

    // --------------------------------
    // 基本プレイヤー情報（game-core-1 / 2）
    // --------------------------------
    player: {
      level,
      exp,
      expToNext,
      rebirthCount,
      growthType,

      STR,
      VIT,
      INT_,
      DEX_,
      LUK_,

      hp,
      hpMax,
      mp,
      mpMax,
      sp,
      spMax,

      hpMaxBase,
      mpMaxBase,
      spMaxBase,

      jobId,
      jobChangedOnce,
      everBeastTamer,

      money
    },

    // ペット関連
    pet: {
      petLevel,
      petExp,
      petExpToNext,
      petRebirthCount,
      petHpBase,
      petAtkBase,
      petHpMax,
      petHp,
      petBuffRate,
      petGrowthType,
      petSkills,
      // ★ 追加: ペット名
      petName: (typeof petName !== "undefined") ? petName : ""
    },

    // --------------------------------
    // 採取・クラフト・素材（core-1 / 4 / 5）
    // --------------------------------
    materials,           // wood/ore/herb/cloth/leather/water の T1〜T3
    gatherSkills,        // 採取スキル
    craftSkills,         // クラフトスキル
    intermediateMats,    // 中間素材
    cookingMats,         // 料理素材
    lastGatherInfo,      // 直近の採取結果（なくても良いがデバッグ用に保存）

    // --------------------------------
    // インベントリ・装備（倉庫・手持ち・装備インスタンス）
    // --------------------------------
    itemCounts,          // 星屑など汎用アイテム

    weapons,
    armors,
    potions,

    weaponCounts,
    armorCounts,
    potionCounts,

    weaponInstances,
    armorInstances,

    equippedWeaponId,
    equippedArmorId,
    equippedWeaponIndex,
    equippedArmorIndex,

    // 手持ちインベントリ（inventory-core.js 想定）
    carryPotions,
    carryFoods,
    carryDrinks,
    carryWeapons,
    carryArmors,
    carryTools,
    toolCounts,
    cookedFoods,
    cookedDrinks,
    lastBattleItemCategory,
    lastBattleItemId,

    // --------------------------------
    // 探索・戦闘系（core-1 / 2 / 3 / 5）
    // --------------------------------

    // 探索状態
    isExploring:   window.isExploring,
    exploringArea: window.exploringArea,

    // ボス関連フラグ
    areaBossCleared,
    areaBossAvailable,

    // 戦闘バフ・状態異常（プレイヤーのみ継続）
    shieldBlowGuardTurnRemain,
    playerStatuses,
    // enemyStatuses は戦闘中一時状態なので保存しない

    // 空腹・水分・EXPボーナス
    hunger,
    thirst,
    wellFedUntil,
    hungerActionCount,
    thirstActionCount,

    // 逃走補正
    escapeFailBonus,

    // --------------------------------
    // 採取拠点・自動採取（core-5）
    // --------------------------------
    gatherBases,
    gatherBaseStockTicks,

    // --------------------------------
    // 市場（market-core.js 側にある想定）
    // --------------------------------
    marketListings,
    marketBuyOrders,
    marketTradeLogs,
    marketOrderIdSeq,
    marketListingIdSeq,

    // --------------------------------
    // ギルド関連（guild.js）
    // --------------------------------
    playerGuildId: (typeof window !== "undefined") ? window.playerGuildId : null,
    guildFame: (typeof window !== "undefined") ? (window.guildFame || {}) : {},
    guildQuestProgress: (typeof window !== "undefined") ? (window.guildQuestProgress || {}) : {}
  };
}

// ==============================
// インスタンス整形・装備補正ヘルパ
// ==============================

function normalizeInstanceLocations() {
  if (Array.isArray(weaponInstances)) {
    weaponInstances.forEach(inst => {
      if (!inst) return;
      if (!inst.location) inst.location = "warehouse";
    });
  }
  if (Array.isArray(armorInstances)) {
    armorInstances.forEach(inst => {
      if (!inst) return;
      if (!inst.location) inst.location = "warehouse";
    });
  }
}

function fixEquippedAfterLoad() {
  // 武器
  if (Array.isArray(weaponInstances)) {
    let ok = false;
    if (typeof equippedWeaponIndex === "number") {
      const inst = weaponInstances[equippedWeaponIndex];
      if (inst && inst.id === equippedWeaponId) {
        inst.location = "equipped";
        ok = true;
      }
    }
    if (!ok && equippedWeaponId) {
      let found = -1;
      weaponInstances.forEach((w, i) => {
        if (found !== -1) return;
        if (w && w.id === equippedWeaponId) found = i;
      });
      if (found === -1) {
        equippedWeaponIndex = null;
        equippedWeaponId = null;
      } else {
        equippedWeaponIndex = found;
        weaponInstances[found].location = "equipped";
      }
    }
  }

  // 防具
  if (Array.isArray(armorInstances)) {
    let ok = false;
    if (typeof equippedArmorIndex === "number") {
      const inst = armorInstances[equippedArmorIndex];
      if (inst && inst.id === equippedArmorId) {
        inst.location = "equipped";
        ok = true;
      }
    }
    if (!ok && equippedArmorId) {
      let found = -1;
      armorInstances.forEach((a, i) => {
        if (found !== -1) return;
        if (a && a.id === equippedArmorId) found = i;
      });
      if (found === -1) {
        equippedArmorIndex = null;
        equippedArmorId = null;
      } else {
        equippedArmorIndex = found;
        armorInstances[found].location = "equipped";
      }
    }
  }
}

// ==============================
// セーブデータ → ゲーム状態へ反映
// ==============================
function applySaveData(data) {
  // 将来バージョン違いを考えるならここで version を見てマイグレーション
  // const v = data.version || 1;

  // -------- プレイヤー --------
  if (data.player) {
    const p = data.player;
    if ("level" in p)          level          = p.level;
    if ("exp" in p)            exp            = p.exp;
    if ("expToNext" in p)      expToNext      = p.expToNext;
    if ("rebirthCount" in p)   rebirthCount   = p.rebirthCount;
    if ("growthType" in p)     growthType     = p.growthType;

    if ("STR" in p)            STR            = p.STR;
    if ("VIT" in p)            VIT            = p.VIT;
    if ("INT_" in p)           INT_           = p.INT_;
    if ("DEX_" in p)           DEX_           = p.DEX_;
    if ("LUK_" in p)           LUK_           = p.LUK_;

    if ("hp" in p)             hp             = p.hp;
    if ("hpMax" in p)          hpMax          = p.hpMax;
    if ("mp" in p)             mp             = p.mp;
    if ("mpMax" in p)          mpMax          = p.mpMax;
    if ("sp" in p)             sp             = p.sp;
    if ("spMax" in p)          spMax          = p.spMax;

    if ("hpMaxBase" in p)      hpMaxBase      = p.hpMaxBase;
    if ("mpMaxBase" in p)      mpMaxBase      = p.mpMaxBase;
    if ("spMaxBase" in p)      spMaxBase      = p.spMaxBase;

    if ("jobId" in p)          jobId          = p.jobId;
    if ("jobChangedOnce" in p) jobChangedOnce = p.jobChangedOnce;
    if ("everBeastTamer" in p) everBeastTamer = p.everBeastTamer;

    if ("money" in p)          money          = p.money;
  }

  // -------- ペット --------
  if (data.pet) {
    const pet = data.pet;
    if ("petLevel" in pet)        petLevel        = pet.petLevel;
    if ("petExp" in pet)          petExp          = pet.petExp;
    if ("petExpToNext" in pet)    petExpToNext    = pet.petExpToNext;
    if ("petRebirthCount" in pet) petRebirthCount = pet.petRebirthCount;
    if ("petHpBase" in pet)       petHpBase       = pet.petHpBase;
    if ("petAtkBase" in pet)      petAtkBase      = pet.petAtkBase;
    if ("petHpMax" in pet)        petHpMax        = pet.petHpMax;
    if ("petHp" in pet)           petHp           = pet.petHp;
    if ("petBuffRate" in pet)     petBuffRate     = pet.petBuffRate;
    if ("petGrowthType" in pet)   petGrowthType   = pet.petGrowthType;
    if (Array.isArray(pet.petSkills)) petSkills   = pet.petSkills;
    // ★ ペット名
    if ("petName" in pet)         petName         = pet.petName;
  }

  // -------- 採取・クラフト・素材 --------

  // window 共有オブジェクトは「すげ替え」ではなく中身をコピーする
  if (data.materials && typeof materials === "object") {
    Object.keys(materials).forEach(k => delete materials[k]);
    Object.keys(data.materials).forEach(k => {
      materials[k] = data.materials[k];
    });
    if (typeof window !== "undefined") {
      window.materials = materials;
    }
  }

  if (data.gatherSkills) {
    gatherSkills = data.gatherSkills;
  }

  if (data.craftSkills) {
    craftSkills = data.craftSkills;
  }

  if (data.intermediateMats && typeof intermediateMats === "object") {
    Object.keys(intermediateMats).forEach(k => delete intermediateMats[k]);
    Object.keys(data.intermediateMats).forEach(k => {
      intermediateMats[k] = data.intermediateMats[k];
    });
    if (typeof window !== "undefined") {
      window.intermediateMats = intermediateMats;
    }
  }

  if (data.cookingMats && typeof cookingMats === "object") {
    Object.keys(cookingMats).forEach(k => delete cookingMats[k]);
    Object.keys(data.cookingMats).forEach(k => {
      cookingMats[k] = data.cookingMats[k];
    });
  }

  if (data.lastGatherInfo) {
    lastGatherInfo = data.lastGatherInfo;
  }

  // -------- インベントリ・装備 --------
  if (data.itemCounts && typeof itemCounts === "object") {
    Object.keys(itemCounts).forEach(k => delete itemCounts[k]);
    Object.keys(data.itemCounts).forEach(k => {
      itemCounts[k] = data.itemCounts[k];
    });
  }

  if (Array.isArray(data.weapons))         weapons         = data.weapons;
  if (Array.isArray(data.armors))          armors          = data.armors;
  if (Array.isArray(data.potions))         potions         = data.potions;
  if (data.weaponCounts)                   weaponCounts    = data.weaponCounts;
  if (data.armorCounts)                    armorCounts     = data.armorCounts;
  if (data.potionCounts)                   potionCounts    = data.potionCounts;

  if (Array.isArray(data.weaponInstances)) {
    weaponInstances.length = 0;
    data.weaponInstances.forEach(i => weaponInstances.push(i));
  }
  if (Array.isArray(data.armorInstances)) {
    armorInstances.length = 0;
    data.armorInstances.forEach(i => armorInstances.push(i));
  }

  if ("equippedWeaponId" in data)         equippedWeaponId    = data.equippedWeaponId;
  if ("equippedArmorId" in data)          equippedArmorId     = data.equippedArmorId;
  if ("equippedWeaponIndex" in data)      equippedWeaponIndex = data.equippedWeaponIndex;
  if ("equippedArmorIndex" in data)       equippedArmorIndex  = data.equippedArmorIndex;

  // 手持ちインベントリ（const の可能性があるので中身コピー方式）
  if (data.carryPotions && typeof carryPotions === "object") {
    Object.keys(carryPotions).forEach(k => delete carryPotions[k]);
    Object.keys(data.carryPotions).forEach(k => {
      carryPotions[k] = data.carryPotions[k];
    });
  }
  if (data.carryFoods && typeof carryFoods === "object") {
    Object.keys(carryFoods).forEach(k => delete carryFoods[k]);
    Object.keys(data.carryFoods).forEach(k => {
      carryFoods[k] = data.carryFoods[k];
    });
  }
  if (data.carryDrinks && typeof carryDrinks === "object") {
    Object.keys(carryDrinks).forEach(k => delete carryDrinks[k]);
    Object.keys(data.carryDrinks).forEach(k => {
      carryDrinks[k] = data.carryDrinks[k];
    });
  }
  if (data.carryWeapons && typeof carryWeapons === "object") {
    Object.keys(carryWeapons).forEach(k => delete carryWeapons[k]);
    Object.keys(data.carryWeapons).forEach(k => {
      carryWeapons[k] = data.carryWeapons[k];
    });
  }
  if (data.carryArmors && typeof carryArmors === "object") {
    Object.keys(carryArmors).forEach(k => delete carryArmors[k]);
    Object.keys(data.carryArmors).forEach(k => {
      carryArmors[k] = data.carryArmors[k];
    });
  }
  if (data.carryTools && typeof carryTools === "object") {
    Object.keys(carryTools).forEach(k => delete carryTools[k]);
    Object.keys(data.carryTools).forEach(k => {
      carryTools[k] = data.carryTools[k];
    });
  }
  if (data.toolCounts && typeof toolCounts === "object") {
    Object.keys(toolCounts).forEach(k => delete toolCounts[k]);
    Object.keys(data.toolCounts).forEach(k => {
      toolCounts[k] = data.toolCounts[k];
    });
  }
  if (data.cookedFoods && typeof cookedFoods === "object") {
    Object.keys(cookedFoods).forEach(k => delete cookedFoods[k]);
    Object.keys(data.cookedFoods).forEach(k => {
      cookedFoods[k] = data.cookedFoods[k];
    });
  }
  if (data.cookedDrinks && typeof cookedDrinks === "object") {
    Object.keys(cookedDrinks).forEach(k => delete cookedDrinks[k]);
    Object.keys(data.cookedDrinks).forEach(k => {
      cookedDrinks[k] = data.cookedDrinks[k];
    });
  }
  if ("lastBattleItemCategory" in data) lastBattleItemCategory = data.lastBattleItemCategory;
  if ("lastBattleItemId" in data)       lastBattleItemId       = data.lastBattleItemId;

  // -------- 探索・戦闘系 --------

  // 探索状態
  if (typeof data.isExploring === "boolean") {
    window.isExploring = data.isExploring;
  }
  if (typeof data.exploringArea === "string") {
    window.exploringArea = data.exploringArea;
  }

  // ボスフラグ
  if (data.areaBossCleared) {
    areaBossCleared = data.areaBossCleared;
  }
  if (data.areaBossAvailable) {
    Object.keys(areaBossAvailable).forEach(k => {
      if (k in data.areaBossAvailable) {
        areaBossAvailable[k] = !!data.areaBossAvailable[k];
      }
    });
  }

  // 状態異常・バフ
  if (typeof data.shieldBlowGuardTurnRemain === "number") {
    shieldBlowGuardTurnRemain = data.shieldBlowGuardTurnRemain;
  }
  if (Array.isArray(data.playerStatuses)) {
    playerStatuses = data.playerStatuses;
  }

  // 空腹・水分
  if (typeof data.hunger === "number") hunger = data.hunger;
  if (typeof data.thirst === "number") thirst = data.thirst;
  if (typeof data.wellFedUntil === "number") wellFedUntil = data.wellFedUntil;
  if (typeof data.hungerActionCount === "number") hungerActionCount = data.hungerActionCount;
  if (typeof data.thirstActionCount === "number") thirstActionCount = data.thirstActionCount;

  // 逃走補正
  if (typeof data.escapeFailBonus === "number") escapeFailBonus = data.escapeFailBonus;

  // -------- 採取拠点・自動採取 --------
  if (data.gatherBases && typeof gatherBases === "object") {
    Object.keys(gatherBases).forEach(k => delete gatherBases[k]);
    Object.keys(data.gatherBases).forEach(k => {
      const src = data.gatherBases[k] || {};
      gatherBases[k] = {
        level: src.level || 0,
        mode:  src.mode  || "normal"
      };
    });
  }
  if (typeof data.gatherBaseStockTicks === "number") {
    gatherBaseStockTicks = data.gatherBaseStockTicks;
  }

  // -------- 市場 --------
  if (typeof marketListings !== "undefined" && Array.isArray(data.marketListings)) {
    marketListings = data.marketListings;
  }
  if (typeof marketBuyOrders !== "undefined" && Array.isArray(data.marketBuyOrders)) {
    marketBuyOrders = data.marketBuyOrders;
  }
  if (typeof marketTradeLogs !== "undefined" && Array.isArray(data.marketTradeLogs)) {
    marketTradeLogs = data.marketTradeLogs;
  }
  if (typeof marketOrderIdSeq !== "undefined" && typeof data.marketOrderIdSeq === "number") {
    marketOrderIdSeq = data.marketOrderIdSeq;
  }
  if (typeof marketListingIdSeq !== "undefined" && typeof data.marketListingIdSeq === "number") {
    marketListingIdSeq = data.marketListingIdSeq;
  }

  // -------- ギルド関連 --------
  if (typeof window !== "undefined") {
    if (typeof data.playerGuildId !== "undefined") {
      window.playerGuildId = data.playerGuildId;
    }
    if (data.guildFame) {
      window.guildFame = window.guildFame || {};
      Object.keys(window.guildFame).forEach(k => delete window.guildFame[k]);
      Object.keys(data.guildFame).forEach(k => {
        window.guildFame[k] = data.guildFame[k];
      });
    }
    if (data.guildQuestProgress) {
      window.guildQuestProgress = window.guildQuestProgress || {};
      Object.keys(window.guildQuestProgress).forEach(k => delete window.guildQuestProgress[k]);
      Object.keys(data.guildQuestProgress).forEach(k => {
        window.guildQuestProgress[k] = data.guildQuestProgress[k];
      });
    }
  }

  // -------- インスタンス整形・装備補正・カウント再同期 --------
  normalizeInstanceLocations();
  fixEquippedAfterLoad();
  if (typeof syncEquipmentCountsFromInstances === "function") {
    syncEquipmentCountsFromInstances();
  }

  // -------- 復元後の再計算・UI --------
  if (typeof recalcStats === "function") {
    recalcStats();
  } else if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  if (typeof renderPlayerStatusIcons === "function") {
    renderPlayerStatusIcons();
  }
  if (typeof renderEnemyStatusIcons === "function") {
    renderEnemyStatusIcons();
  }
  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
  }
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }
  if (typeof refreshBattleItemSelect === "function") {
    refreshBattleItemSelect();
  }
  if (typeof refreshUseItemSelect === "function") {
    refreshUseItemSelect();
  }
  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
  if (typeof updateHungerThirstEffects === "function") {
    updateHungerThirstEffects();
  }

  // ギルドUIがあれば再描画
  if (typeof renderGuildUI === "function") {
    renderGuildUI();
  }
}

// ==============================
// ローカルストレージにセーブ
// ==============================
function saveToLocal() {
  try {
    const data = makeSaveData();
    const json = JSON.stringify(data);
    localStorage.setItem(SAVE_KEY, json);
    if (typeof appendLog === "function") {
      appendLog("ゲームデータをローカルに保存しました");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("ローカル保存に失敗しました");
    }
  }
}

// ==============================
// ローカルストレージからロード
// ==============================
function loadFromLocal() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) {
      if (typeof appendLog === "function") {
        appendLog("ローカルにセーブデータがありません");
      }
      return;
    }
    const data = JSON.parse(json);
    applySaveData(data);
    if (typeof appendLog === "function") {
      appendLog("ローカルのセーブデータを読み込みました");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("ローカルのセーブデータ読み込みに失敗しました");
    }
  }
}

// ==============================
// エクスポート（プレイヤーがコピーする文字列）
// ==============================
function exportSaveData() {
  try {
    const data = makeSaveData();
    const json = JSON.stringify(data);
    const textarea = document.getElementById("exportSaveText");
    if (textarea) {
      textarea.value = json;
      textarea.select();
    }
    if (typeof appendLog === "function") {
      appendLog("セーブデータをエクスポート用テキストに出力しました（コピーして保存してください）");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("エクスポートに失敗しました");
    }
  }
}

// ==============================
// インポート（貼り付け文字列から読み込み）
// ==============================
function importSaveData() {
  try {
    const textarea = document.getElementById("importSaveText");
    if (!textarea) {
      if (typeof appendLog === "function") {
        appendLog("インポート用テキストエリアが見つかりません");
      }
      return;
    }
    const json = textarea.value.trim();
    if (!json) {
      if (typeof appendLog === "function") {
        appendLog("インポートするテキストが空です");
      }
      return;
    }
    const data = JSON.parse(json);
    applySaveData(data);
    // 読み込んだらローカルにも保存しておく
    localStorage.setItem(SAVE_KEY, json);
    if (typeof appendLog === "function") {
      appendLog("インポートしたセーブデータを読み込みました");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("インポートに失敗しました（テキストが壊れている可能性があります）");
    }
  }
}