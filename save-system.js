// save-system.js 
// セーブデータ関係
// オンラインブラウザゲーム化前段階：テストプレイヤーがデバッグ状態を引き継げるようにする

const SAVE_VERSION = 1;
const SAVE_KEY = "myGatherGameSave_v1";

// ==============================
// ゲーム状態 → プレーンオブジェクトへ
// ==============================
function makeSaveData() {
  let player, pet, companionTypeId, companionTraitId;
  let petListSafe, activePetIdSafe;
  let materialsSafe, gatherSkillsSafe, craftSkillsSafe, intermediateMatsSafe, cookingMatsSafe, lastGatherInfoSafe, gatherStatsSafe;
  let itemCountsSafe, weaponsSafe, armorsSafe, potionsSafe;
  let weaponCountsSafe, armorCountsSafe, potionCountsSafe;
  let weaponInstancesSafe, armorInstancesSafe;
  let carryPotionsSafe, carryFoodsSafe, carryDrinksSafe, carryWeaponsSafe, carryArmorsSafe, carryToolsSafe;
  let toolCountsSafe, cookedFoodsSafe, cookedDrinksSafe, lastBattleItemCategorySafe, lastBattleItemIdSafe;
  let isExploringSafe, exploringAreaSafe, areaBossClearedSafe, areaBossAvailableSafe;
  let shieldBlowGuardTurnRemainSafe, playerStatusesSafe;
  let hungerSafe, thirstSafe, wellFedUntilSafe, hungerActionCountSafe, thirstActionCountSafe;
  let escapeFailBonusSafe;
  let gatherBasesSafe, gatherBaseStockTicksSafe;
  let farmSafe, fishDexSafe;
  let marketListingsSafe, marketBuyOrdersSafe, marketTradeLogsSafe, marketOrderIdSeqSafe, marketListingIdSeqSafe;
  let playerGuildIdSafe, guildFameSafe, guildQuestProgressSafe, combatGuildTreeUnlockedSafe, combatGuildSkillPointsSafe;
  let citizenshipUnlockedSafe, housingStateSafe;

  try {
    player = {
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
      money,
      // ★追加: 職業初期ステ適用フラグもセーブ
      initialJobStatsApplied: (typeof initialJobStatsApplied !== "undefined") ? initialJobStatsApplied : false
    };
  } catch (e) {
    throw e;
  }

  try {
    pet = {
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
      petName: (typeof petName !== "undefined") ? petName : ""
    };
  } catch (e) {
    throw e;
  }

  try {
    companionTypeId  = (typeof window !== "undefined") ? (window.companionTypeId  || null) : null;
    companionTraitId = (typeof window !== "undefined") ? (window.companionTraitId || null) : null;
  } catch (e) {
    throw e;
  }

  // ★追加: 複数ペット基盤のセーブ（petList / activePetId）
  try {
    if (typeof window !== "undefined" && Array.isArray(window.petList)) {
      petListSafe = window.petList;
    } else {
      petListSafe = [];
    }
    activePetIdSafe = (typeof window !== "undefined") ? (window.activePetId || null) : null;
  } catch (e) {
    throw e;
  }

  try {
    materialsSafe        = materials;
    gatherSkillsSafe     = gatherSkills;
    craftSkillsSafe      = craftSkills;
    intermediateMatsSafe = intermediateMats;
    cookingMatsSafe      = cookingMats;
    lastGatherInfoSafe   = lastGatherInfo;
    gatherStatsSafe      = (typeof window !== "undefined" && window.gatherStats) ? window.gatherStats : {};
  } catch (e) {
    throw e;
  }

  try {
    itemCountsSafe  = itemCounts;
    weaponsSafe     = weapons;
    armorsSafe      = armors;
    potionsSafe     = potions;
    weaponCountsSafe = weaponCounts;
    armorCountsSafe  = armorCounts;
    potionCountsSafe = potionCounts;
    weaponInstancesSafe = weaponInstances;
    armorInstancesSafe  = armorInstances;
    carryPotionsSafe = carryPotions;
    carryFoodsSafe   = carryFoods;
    carryDrinksSafe  = carryDrinks;
    carryWeaponsSafe = carryWeapons;
    carryArmorsSafe  = carryArmors;
    carryToolsSafe   = carryTools;
    toolCountsSafe   = toolCounts;
    cookedFoodsSafe  = cookedFoods;
    cookedDrinksSafe = cookedDrinks;
    lastBattleItemCategorySafe = lastBattleItemCategory;
    lastBattleItemIdSafe       = lastBattleItemId;
  } catch (e) {
    throw e;
  }

  try {
    isExploringSafe   = (typeof window !== "undefined") ? window.isExploring   : false;
    exploringAreaSafe = (typeof window !== "undefined") ? window.exploringArea : null;

    areaBossClearedSafe   = areaBossCleared;
    areaBossAvailableSafe = areaBossAvailable;

    shieldBlowGuardTurnRemainSafe = shieldBlowGuardTurnRemain;
    playerStatusesSafe = playerStatuses;

    hungerSafe           = hunger;
    thirstSafe           = thirst;
    wellFedUntilSafe     = wellFedUntil;
    hungerActionCountSafe = hungerActionCount;
    thirstActionCountSafe = thirstActionCount;

    escapeFailBonusSafe = escapeFailBonus;
  } catch (e) {
    throw e;
  }

  try {
    gatherBasesSafe       = gatherBases;
    gatherBaseStockTicksSafe = gatherBaseStockTicks;
  } catch (e) {
    throw e;
  }

  try {
    farmSafe = (typeof getFarmSaveData === "function") ? getFarmSaveData() : null;
  } catch (e) {
    throw e;
  }

  try {
    fishDexSafe = (typeof window !== "undefined" && window.fishDex) ? window.fishDex : {};
  } catch (e) {
    throw e;
  }

  try {
    marketListingsSafe   = marketListings;
    marketBuyOrdersSafe  = marketBuyOrders;
    marketTradeLogsSafe  = marketTradeLogs;
    marketOrderIdSeqSafe = marketOrderIdSeq;
    marketListingIdSeqSafe = marketListingIdSeq;
  } catch (e) {
    throw e;
  }

  try {
    playerGuildIdSafe        = (typeof window !== "undefined") ? window.playerGuildId : null;
    guildFameSafe            = (typeof window !== "undefined") ? (window.guildFame || {}) : {};
    guildQuestProgressSafe   = (typeof window !== "undefined") ? (window.guildQuestProgress || {}) : {};
    combatGuildTreeUnlockedSafe = (typeof window !== "undefined") ? (window.combatGuildTreeUnlocked || {}) : {};
    combatGuildSkillPointsSafe  = (typeof window !== "undefined") ? (window.combatGuildSkillPoints || 0) : 0;
  } catch (e) {
    throw e;
  }

  try {
    citizenshipUnlockedSafe = (typeof window !== "undefined") ? !!window.citizenshipUnlocked : false;
    housingStateSafe = (typeof window !== "undefined" && window.housingState)
      ? window.housingState
      : { hasBase: false, baseLevel: 0, lastGuildId: null };
  } catch (e) {
    throw e;
  }

  return {
    version: SAVE_VERSION,

    // --------------------------------
    // 基本プレイヤー情報（game-core-1 / 2）
    // --------------------------------
    player,

    // ペット関連（従来の単一ペット用）
    pet,

    // ペット種・特性
    companionTypeId,
    companionTraitId,

    // ★追加: 複数ペット用のリストとアクティブID
    petList: petListSafe,
    activePetId: activePetIdSafe,

    // --------------------------------
    // 採取・クラフト・素材
    // --------------------------------
    materials:    materialsSafe,
    gatherSkills: gatherSkillsSafe,
    craftSkills:  craftSkillsSafe,
    intermediateMats: intermediateMatsSafe,
    cookingMats:  cookingMatsSafe,
    lastGatherInfo: lastGatherInfoSafe,
    gatherStats: gatherStatsSafe,

    // --------------------------------
    // インベントリ・装備
    // --------------------------------
    itemCounts: itemCountsSafe,

    weapons: weaponsSafe,
    armors:  armorsSafe,
    potions: potionsSafe,

    weaponCounts: weaponCountsSafe,
    armorCounts:  armorCountsSafe,
    potionCounts: potionCountsSafe,

    weaponInstances: weaponInstancesSafe,
    armorInstances:  armorInstancesSafe,

    equippedWeaponId,
    equippedArmorId,
    equippedWeaponIndex,
    equippedArmorIndex,

    carryPotions: carryPotionsSafe,
    carryFoods:   carryFoodsSafe,
    carryDrinks:  carryDrinksSafe,
    carryWeapons: carryWeaponsSafe,
    carryArmors:  carryArmorsSafe,
    carryTools:   carryToolsSafe,
    toolCounts:   toolCountsSafe,
    cookedFoods:  cookedFoodsSafe,
    cookedDrinks: cookedDrinksSafe,
    lastBattleItemCategory: lastBattleItemCategorySafe,
    lastBattleItemId:       lastBattleItemIdSafe,

    // --------------------------------
    // 探索・戦闘系
    // --------------------------------
    isExploring:   isExploringSafe,
    exploringArea: exploringAreaSafe,

    areaBossCleared:   areaBossClearedSafe,
    areaBossAvailable: areaBossAvailableSafe,

    shieldBlowGuardTurnRemain: shieldBlowGuardTurnRemainSafe,
    playerStatuses:            playerStatusesSafe,

    hunger:            hungerSafe,
    thirst:            thirstSafe,
    wellFedUntil:      wellFedUntilSafe,
    hungerActionCount: hungerActionCountSafe,
    thirstActionCount: thirstActionCountSafe,

    escapeFailBonus: escapeFailBonusSafe,

    // --------------------------------
    // 採取拠点・自動採取
    // --------------------------------
    gatherBases:          gatherBasesSafe,
    gatherBaseStockTicks: gatherBaseStockTicksSafe,

    // --------------------------------
    // 農園
    // --------------------------------
    farm: farmSafe,

    // --------------------------------
    // 釣り図鑑
    // --------------------------------
    fishDex: fishDexSafe,

    // --------------------------------
    // 市場
    // --------------------------------
    marketListings:   marketListingsSafe,
    marketBuyOrders:  marketBuyOrdersSafe,
    marketTradeLogs:  marketTradeLogsSafe,
    marketOrderIdSeq: marketOrderIdSeqSafe,
    marketListingIdSeq: marketListingIdSeqSafe,

    // --------------------------------
    // ギルド関連
    // --------------------------------
    playerGuildId:          playerGuildIdSafe,
    guildFame:              guildFameSafe,
    guildQuestProgress:     guildQuestProgressSafe,
    combatGuildTreeUnlocked: combatGuildTreeUnlockedSafe,
    combatGuildSkillPoints:  combatGuildSkillPointsSafe,

    // --------------------------------
    // 市民権・ハウジング
    // --------------------------------
    citizenshipUnlocked: citizenshipUnlockedSafe,
    housingState:        housingStateSafe
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
  // -------- プレイヤー --------
  try {
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

      // ★追加: 職業初期ステ適用フラグをロード
      if ("initialJobStatsApplied" in p) {
        if (typeof initialJobStatsApplied !== "undefined") {
          initialJobStatsApplied = !!p.initialJobStatsApplied;
        }
        if (typeof window !== "undefined") {
          window.initialJobStatsApplied = !!p.initialJobStatsApplied;
        }
      }
    }
  } catch (e) {
    throw e;
  }

  // -------- ペット（従来の単一ペット） --------
  try {
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
      if ("petName" in pet)         petName         = pet.petName;
    }
  } catch (e) {
    throw e;
  }

  // ペット種／特性
  try {
    if (typeof window !== "undefined") {
      if ("companionTypeId" in data) {
        window.companionTypeId = data.companionTypeId;
        if (typeof companionTypeId !== "undefined") {
          companionTypeId = data.companionTypeId;
        }
      }
      if ("companionTraitId" in data) {
        window.companionTraitId = data.companionTraitId;
        if (typeof companionTraitId !== "undefined") {
          companionTraitId = data.companionTraitId;
        }
      }
    }
  } catch (e) {
    throw e;
  }

  // ★追加: 複数ペット用 petList / activePetId のロード
  try {
    if (typeof window !== "undefined") {
      if (Array.isArray(data.petList)) {
        window.petList = data.petList;
      } else {
        window.petList = Array.isArray(window.petList) ? window.petList : [];
      }
      if ("activePetId" in data) {
        window.activePetId = data.activePetId || null;
      } else if (!window.activePetId) {
        window.activePetId = null;
      }

      // 旧セーブ互換: petList が空で companionTypeId があるなら 1 匹だけ移行
      if (typeof window.ensurePetListFromLegacy === "function") {
        window.ensurePetListFromLegacy();
      }

      // activePetId があり、同期ヘルパーがあれば単一ペット変数へ反映
      if (typeof window.loadActivePetToGlobals === "function" && window.activePetId) {
        window.loadActivePetToGlobals();
      }
    }
  } catch (e) {
    throw e;
  }

  // -------- 採取・クラフト・素材 --------
  try {
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

    if (data.gatherStats && typeof window !== "undefined") {
      window.gatherStats = window.gatherStats || {};
      Object.keys(window.gatherStats).forEach(k => delete window.gatherStats[k]);
      Object.keys(data.gatherStats).forEach(k => {
        window.gatherStats[k] = data.gatherStats[k];
      });
    }
  } catch (e) {
    throw e;
  }

  // -------- インベントリ・装備 --------
  try {
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
  } catch (e) {
    throw e;
  }

  // -------- 探索・戦闘系 --------
  try {
    if (typeof data.isExploring === "boolean") {
      window.isExploring = data.isExploring;
    }
    if (typeof data.exploringArea === "string") {
      window.exploringArea = data.exploringArea;
    }

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

    if (typeof data.shieldBlowGuardTurnRemain === "number") {
      shieldBlowGuardTurnRemain = data.shieldBlowGuardTurnRemain;
    }
    if (Array.isArray(data.playerStatuses)) {
      playerStatuses = data.playerStatuses;
    }

    if (typeof data.hunger === "number") hunger = data.hunger;
    if (typeof data.thirst === "number") thirst = data.thirst;
    if (typeof data.wellFedUntil === "number") wellFedUntil = data.wellFedUntil;
    if (typeof data.hungerActionCount === "number") hungerActionCount = data.hungerActionCount;
    if (typeof data.thirstActionCount === "number") thirstActionCount = data.thirstActionCount;

    if (typeof data.escapeFailBonus === "number") escapeFailBonus = data.escapeFailBonus;
  } catch (e) {
    throw e;
  }

  // -------- 採取拠点・自動採取 --------
  try {
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
  } catch (e) {
    throw e;
  }

  // -------- 農園 --------
  try {
    if (data.farm && typeof applyFarmSaveData === "function") {
      applyFarmSaveData(data.farm);
    } else if (typeof initFarmSystem === "function") {
      initFarmSystem();
    }
  } catch (e) {
    throw e;
  }

  // -------- 釣り図鑑 --------
  try {
    if (data.fishDex && typeof window !== "undefined") {
      window.fishDex = window.fishDex || {};
      Object.keys(window.fishDex).forEach(k => delete window.fishDex[k]);
      Object.keys(data.fishDex).forEach(k => {
        window.fishDex[k] = data.fishDex[k];
      });
    }
  } catch (e) {
    throw e;
  }

  // -------- 市場 --------
  try {
    if (typeof marketListings !== "undefined" && Array.isArray(data.marketListings)) {
      marketListings = data.marketListings;
      if (typeof window !== "undefined") {
        window.marketListings = marketListings;
      }
    }
    if (typeof marketBuyOrders !== "undefined" && Array.isArray(data.marketBuyOrders)) {
      marketBuyOrders = data.marketBuyOrders;
      if (typeof window !== "undefined") {
        window.marketBuyOrders = marketBuyOrders;
      }
    }
    if (typeof marketTradeLogs !== "undefined" && Array.isArray(data.marketTradeLogs)) {
      marketTradeLogs = data.marketTradeLogs;
      if (typeof window !== "undefined") {
        window.marketTradeLogs = marketTradeLogs;
      }
    }
    if (typeof marketOrderIdSeq !== "undefined" && typeof data.marketOrderIdSeq === "number") {
      marketOrderIdSeq = data.marketOrderIdSeq;
    }
    if (typeof marketListingIdSeq !== "undefined" && typeof data.marketListingIdSeq === "number") {
      marketListingIdSeq = data.marketListingIdSeq;
    }
  } catch (e) {
    throw e;
  }

  // -------- ギルド関連 --------
  try {
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

      if (data.combatGuildTreeUnlocked) {
        window.combatGuildTreeUnlocked = window.combatGuildTreeUnlocked || {};
        Object.keys(window.combatGuildTreeUnlocked).forEach(k => delete window.combatGuildTreeUnlocked[k]);
        Object.keys(data.combatGuildTreeUnlocked).forEach(k => {
          window.combatGuildTreeUnlocked[k] = data.combatGuildTreeUnlocked[k];
        });
      }
      if (typeof data.combatGuildSkillPoints === "number") {
        window.combatGuildSkillPoints = data.combatGuildSkillPoints;
      }

      if (typeof data.citizenshipUnlocked === "boolean") {
        window.citizenshipUnlocked = data.citizenshipUnlocked;
      }

      if (data.housingState) {
        window.housingState = window.housingState || {};
        window.housingState.hasBase = !!data.housingState.hasBase;
        window.housingState.baseLevel = data.housingState.baseLevel || 0;
        window.housingState.lastGuildId =
          (typeof data.housingState.lastGuildId !== "undefined")
            ? data.housingState.lastGuildId
            : null;
      }
    }
  } catch (e) {
    throw e;
  }

  // -------- インスタンス整形・装備補正・カウント再同期 --------
  try {
    normalizeInstanceLocations();
    fixEquippedAfterLoad();
    if (typeof syncEquipmentCountsFromInstances === "function") {
      syncEquipmentCountsFromInstances();
    }
  } catch (e) {
    throw e;
  }

  // -------- 復元後の再計算・UI --------
  try {
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
    if (typeof renderGuildUI === "function") {
      renderGuildUI();
    }
    if (typeof refreshHousingFromState === "function") {
      refreshHousingFromState();
    }

    // ★追加: セーブ反映後に採取統計UIも最新状態にする
    if (typeof refreshGatherStatsUI === "function") {
      refreshGatherStatsUI();
    }
  } catch (e) {
    throw e;
  }
}

// ==============================
// ローカルストレージにセーブ
// ==============================
function saveToLocal() {
  // 戦闘中セーブ禁止（探索中は可）
  if (typeof window !== "undefined" && window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("戦闘中はセーブできない！");
    }
    return;
  }

  try {
    const data = makeSaveData();

    let json;
    try {
      json = JSON.stringify(data);
    } catch (e2) {
      throw e2;
    }

    try {
      localStorage.setItem(SAVE_KEY, json);
    } catch (e3) {
      throw e3;
    }

    if (typeof appendLog === "function") {
      appendLog("ゲームデータをローカルに保存しました");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("ローカル保存に失敗しました: " + e.message);
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

    let data;
    try {
      data = JSON.parse(json);
    } catch (e2) {
      throw e2;
    }

    applySaveData(data);

    // ★ セーブロード後に採取統計UIを再描画
    if (typeof refreshGatherStatsUI === "function") {
      refreshGatherStatsUI();
    }

    if (typeof appendLog === "function") {
      appendLog("ローカルのセーブデータを読み込みました");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("ローカルのセーブデータ読み込みに失敗しました: " + e.message);
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
      appendLog("エクスポートに失敗しました: " + e.message);
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

    let data;
    try {
      data = JSON.parse(json);
    } catch (e2) {
      throw e2;
    }

    applySaveData(data);
    try {
      localStorage.setItem(SAVE_KEY, json);
    } catch (e3) {
      throw e3;
    }

    // ★ インポート直後も統計UIを最新にしておく
    if (typeof refreshGatherStatsUI === "function") {
      refreshGatherStatsUI();
    }

    if (typeof appendLog === "function") {
      appendLog("インポートしたセーブデータを読み込みました");
    }
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("インポートに失敗しました（テキストが壊れている可能性があります）: " + e.message);
    }
  }
}