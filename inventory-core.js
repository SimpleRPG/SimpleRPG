// save-system.js 
// セーブデータ関係

const SAVE_VERSION = 1;
const SAVE_KEY = "myGatherGameSave_v1";

// ==============================
// ゲーム状態 → プレーンオブジェクトへ
// ==============================
function makeSaveData() {
  return {
    version: SAVE_VERSION,

    // 基本プレイヤー情報
    player: {
      name,
      level,
      exp,
      expToNext,   // レベル必要経験値
      hp,
      hpMax,
      mp,
      mpMax,
      sp,
      spMax,
      jobId,
      STR_,
      VIT_,
      INT_,
      DEX_,
      LUK_,
      money,
      rebirthCount,
      growthType
    },

    // 採取・クラフト関連
    materials,        // wood/ore/herb/cloth/leather/water の T1〜T3
    gatherSkills,     // 採取スキル
    craftSkills,      // クラフトスキル（存在する前提）
    intermediateMats, // 中間素材
    cookingMats,      // 料理素材

    // 汎用アイテム所持（個数カウンタ系）
    itemCounts,       // 素材・アイテム共通カウンタ
    potionCounts,     // 倉庫側ポーション本数
    weaponCounts,     // 倉庫側武器本数
    armorCounts,      // 倉庫側防具枚数
    toolCounts,       // 倉庫側道具数（爆弾など）
    cookedFoods,      // 倉庫側料理（食べ物）
    cookedDrinks,     // 倉庫側料理（飲み物）

    // 手持ちインベントリ（inventory-core.js）
    carryPotions,
    carryFoods,
    carryDrinks,
    carryWeapons,
    carryArmors,
    carryTools,

    // 装備インスタンス・装備中
    weaponInstances,
    armorInstances,
    currentWeapon,
    currentArmor,

    // 戦闘アイテム選択の記憶
    lastBattleItemCategory,
    lastBattleItemId,

    // ペット関連（存在する前提で保存）
    petLevel,
    petExp,
    petExpToNext,
    petRebirthCount,
    petGrowthType,
    petHp,
    petHpMax
  };
}

// ==============================
// セーブデータ → ゲーム状態へ反映
// ==============================
function applySaveData(data) {
  // 将来バージョン違いを考えるならここで version を見てマイグレーション
  // const v = data.version || 1;

  // プレイヤー
  if (data.player) {
    if ("name" in data.player)       name       = data.player.name;
    if ("level" in data.player)      level      = data.player.level;
    if ("exp" in data.player)        exp        = data.player.exp;
    if ("expToNext" in data.player)  expToNext  = data.player.expToNext;
    if ("hp" in data.player)         hp         = data.player.hp;
    if ("hpMax" in data.player)      hpMax      = data.player.hpMax;
    if ("mp" in data.player)         mp         = data.player.mp;
    if ("mpMax" in data.player)      mpMax      = data.player.mpMax;
    if ("sp" in data.player)         sp         = data.player.sp;
    if ("spMax" in data.player)      spMax      = data.player.spMax;
    if ("jobId" in data.player)      jobId      = data.player.jobId;
    if ("STR_" in data.player)       STR_       = data.player.STR_;
    if ("VIT_" in data.player)       VIT_       = data.player.VIT_;
    if ("INT_" in data.player)       INT_       = data.player.INT_;
    if ("DEX_" in data.player)       DEX_       = data.player.DEX_;
    if ("LUK_" in data.player)       LUK_       = data.player.LUK_;
    if ("money" in data.player)      money      = data.player.money;
    if ("rebirthCount" in data.player) rebirthCount = data.player.rebirthCount;
    if ("growthType" in data.player)   growthType   = data.player.growthType;
  }

  // 採取・クラフト
  if (data.materials)        materials        = data.materials;
  if (data.gatherSkills)     gatherSkills     = data.gatherSkills;
  if (data.craftSkills)      craftSkills      = data.craftSkills;
  if (data.intermediateMats) intermediateMats = data.intermediateMats;
  if (data.cookingMats)      cookingMats      = data.cookingMats;

  // 倉庫側カウンタ
  if (data.itemCounts)   itemCounts   = data.itemCounts;
  if (data.potionCounts) potionCounts = data.potionCounts;
  if (data.weaponCounts) weaponCounts = data.weaponCounts;
  if (data.armorCounts)  armorCounts  = data.armorCounts;
  if (data.toolCounts)   toolCounts   = data.toolCounts;
  if (data.cookedFoods)  cookedFoods  = data.cookedFoods;
  if (data.cookedDrinks) cookedDrinks = data.cookedDrinks;

  // 手持ちインベントリ
  if (data.carryPotions) carryPotions = data.carryPotions;
  if (data.carryFoods)   carryFoods   = data.carryFoods;
  if (data.carryDrinks)  carryDrinks  = data.carryDrinks;
  if (data.carryWeapons) carryWeapons = data.carryWeapons;
  if (data.carryArmors)  carryArmors  = data.carryArmors;
  if (data.carryTools)   carryTools   = data.carryTools;

  // 装備インスタンス・装備中
  if (data.weaponInstances) weaponInstances = data.weaponInstances;
  if (data.armorInstances)  armorInstances  = data.armorInstances;
  if ("currentWeapon" in data) currentWeapon = data.currentWeapon;
  if ("currentArmor" in data)  currentArmor  = data.currentArmor;

  // 戦闘アイテム選択
  if ("lastBattleItemCategory" in data) {
    window.lastBattleItemCategory = data.lastBattleItemCategory;
  }
  if ("lastBattleItemId" in data) {
    window.lastBattleItemId = data.lastBattleItemId;
  }

  // ペット
  if ("petLevel" in data)        petLevel        = data.petLevel;
  if ("petExp" in data)          petExp          = data.petExp;
  if ("petExpToNext" in data)    petExpToNext    = data.petExpToNext;
  if ("petRebirthCount" in data) petRebirthCount = data.petRebirthCount;
  if ("petGrowthType" in data)   petGrowthType   = data.petGrowthType;
  if ("petHp" in data)           petHp           = data.petHp;
  if ("petHpMax" in data)        petHpMax        = data.petHpMax;
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
    if (typeof updateDisplay === "function") updateDisplay();
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
    if (typeof updateDisplay === "function") updateDisplay();
  } catch (e) {
    console.error(e);
    if (typeof appendLog === "function") {
      appendLog("インポートに失敗しました（テキストが壊れている可能性があります）");
    }
  }
}