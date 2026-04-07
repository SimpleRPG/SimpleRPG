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

      STR_,
      VIT_,
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
      petSkills
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

    // 敵・戦闘（途中セーブまではしない設計なので currentEnemy などは保存しない）

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
    // スキル UI / 職業関連の表示更新用に必要なものは
    // player/job 側に含まれているのでここでは追加なし
    // --------------------------------

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
    marketListingIdSeq
  };
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

    if ("STR_" in p)           STR_           = p.STR_;
    if ("VIT_" in p)           VIT_           = p.VIT_;
    if ("INT_" in p)           INT_          = p.INT_;
    if ("DEX_" in p)           DEX_          = p.DEX_;
    if ("LUK_" in p)           LUK_          = p.LUK_;

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
  }

  // -------- 採取・クラフト・素材 --------
  if (data.materials)        materials        = data.materials;
  if (data.gatherSkills)     gatherSkills     = data.gatherSkills;
  if (data.craftSkills)      craftSkills      = data.craftSkills;
  if (data.intermediateMats) intermediateMats = data.intermediateMats;
  if (data.cookingMats)      cookingMats      = data.cookingMats;
  if (data.lastGatherInfo)   lastGatherInfo   = data.lastGatherInfo;

  // -------- インベントリ・装備 --------
  if (data.itemCounts)       itemCounts       = data.itemCounts;

  if (Array.isArray(data.weapons))         weapons         = data.weapons;
  if (Array.isArray(data.armors))          armors          = data.armors;
  if (Array.isArray(data.potions))         potions         = data.potions;
  if (data.weaponCounts)                  weaponCounts    = data.weaponCounts;
  if (data.armorCounts)                   armorCounts     = data.armorCounts;
  if (data.potionCounts)                  potionCounts    = data.potionCounts;
  if (Array.isArray(data.weaponInstances)) weaponInstances = data.weaponInstances;
  if (Array.isArray(data.armorInstances))  armorInstances  = data.armorInstances;

  if ("equippedWeaponId" in data)         equippedWeaponId    = data.equippedWeaponId;
  if ("equippedArmorId" in data)          equippedArmorId     = data.equippedArmorId;
  if ("equippedWeaponIndex" in data)      equippedWeaponIndex = data.equippedWeaponIndex;
  if ("equippedArmorIndex" in data)       equippedArmorIndex  = data.equippedArmorIndex;

  // 手持ちインベントリ
  if (data.carryPotions) carryPotions = data.carryPotions;
  if (data.carryFoods)   carryFoods   = data.carryFoods;
  if (data.carryDrinks)  carryDrinks  = data.carryDrinks;
  if (data.carryWeapons) carryWeapons = data.carryWeapons;
  if (data.carryArmors)  carryArmors  = data.carryArmors;
  if (data.carryTools)   carryTools   = data.carryTools;
  if (data.toolCounts)   toolCounts   = data.toolCounts;
  if (data.cookedFoods)  cookedFoods  = data.cookedFoods;
  if (data.cookedDrinks) cookedDrinks = data.cookedDrinks;
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
  if (data.gatherBases) {
    Object.keys(gatherBases).forEach(k => {
      if (data.gatherBases[k]) {
        gatherBases[k].level = data.gatherBases[k].level || 0;
        gatherBases[k].mode  = data.gatherBases[k].mode  || "normal";
      }
    });
  }
  if (typeof data.gatherBaseStockTicks === "number") {
    gatherBaseStockTicks = data.gatherBaseStockTicks;
  }

  // -------- 市場 --------
  if (Array.isArray(data.marketListings))   marketListings   = data.marketListings;
  if (Array.isArray(data.marketBuyOrders))  marketBuyOrders  = data.marketBuyOrders;
  if (Array.isArray(data.marketTradeLogs))  marketTradeLogs  = data.marketTradeLogs;
  if (typeof data.marketOrderIdSeq === "number")   marketOrderIdSeq   = data.marketOrderIdSeq;
  if (typeof data.marketListingIdSeq === "number") marketListingIdSeq = data.marketListingIdSeq;

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