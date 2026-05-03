// materials-core.js
// 素材（木材・鉱石…）と中間素材の在庫・名称ヘルパー＋ITEM_META連携

// =======================
// 素材キーとティア上限
// =======================

// 通常採取で扱う素材のキー
// game-core-4.js の target と一致させる前提: wood / ore / herb / cloth / leather / water
window.MATERIAL_KEYS = window.MATERIAL_KEYS || [
  "wood",
  "ore",
  "herb",
  "cloth",
  "leather",
  "water"
];

// 将来的に T10 まで拡張する前提だが、
// いまは既存仕様に合わせて T3 までにしておく。
// T を増やすときは、ここを 10 に変更して、
// T3 まで固定で回しているループを「MATERIAL_MAX_T まで」に変えればOK。
window.MATERIAL_MAX_T = window.MATERIAL_MAX_T || 10;

const MATERIAL_KEYS   = window.MATERIAL_KEYS;
const MATERIAL_MAX_T  = window.MATERIAL_MAX_T;

// =======================
// 在庫本体（一次素材）
// =======================
//
// materials[key] = [T1個数, T2個数, T3個数, ...] という配列で管理。
// index 0 → T1, index 1 → T2, ... index (tier-1) が T◯ に対応する。

// 既に window.materials がオブジェクト形式で存在する場合（旧セーブ互換）
//   { wood:{t1,t2,t3}, ... } から配列形式に移行する。
// 何も無い場合は 0 で初期化。
(function initMaterials() {
  const prev = window.materials;

  const newMaterials = {};

  MATERIAL_KEYS.forEach(key => {
    const arr = new Array(MATERIAL_MAX_T).fill(0);

    // 旧形式があれば可能な範囲でマイグレーション
    if (prev && prev[key]) {
      const src = prev[key];
      // 旧仕様の t1/t2/t3 を見る（T3 以降は旧データには存在しない想定）
      if (typeof src.t1 === "number" && MATERIAL_MAX_T >= 1) arr[0] = src.t1;
      if (typeof src.t2 === "number" && MATERIAL_MAX_T >= 2) arr[1] = src.t2;
      if (typeof src.t3 === "number" && MATERIAL_MAX_T >= 3) arr[2] = src.t3;
    }

    newMaterials[key] = arr;
  });

  // window.materials を新形式に置き換え
  window.materials = newMaterials;
})();

// ★修正ポイント: ここでブロックスコープの const を定義すると、
// 同じファイルが二重ロードされたときに
// "Identifier 'materials' has already been declared" になる。
// 仕様はそのままに、直接 window から参照する形に変更する。
function getMaterialsRoot() {
  return window.materials;
}

// =======================
// 在庫操作ヘルパー（一次素材）
// =======================

// tier: 1〜MATERIAL_MAX_T
function getMatTierCount(key, tier) {
  const materials = getMaterialsRoot();
  const m = materials && materials[key];
  if (!m) return 0;
  const idx = tier - 1;
  if (idx < 0 || idx >= MATERIAL_MAX_T) return 0;
  return m[idx] || 0;
}

// amount（±）を加算
function addMatTierCount(key, tier, amount) {
  amount = amount | 0;
  if (!amount) return;

  const materials = getMaterialsRoot();
  const m = materials && materials[key];
  if (!m) return;

  const idx = tier - 1;
  if (idx < 0 || idx >= MATERIAL_MAX_T) return;

  const next = (m[idx] || 0) + amount;
  m[idx] = Math.max(0, next);
}

// 素材キーごとの合計（全ティアの合計）を返す
function getMatTotal(key) {
  const materials = getMaterialsRoot();
  const m = materials && materials[key];
  if (!m) return 0;
  return m.reduce((sum, v) => sum + (v || 0), 0);
}

// =======================
// 表記・名前ヘルパー（一次素材）
// =======================

// ベース名（ティア抜きの名前）
const MATERIAL_BASE_NAMES = {
  wood:    "木材",
  ore:     "鉱石",
  herb:    "薬草",
  cloth:   "布",
  leather: "皮",
  water:   "水"
};

// 「T1木材」などの表記を作るヘルパー
function formatMaterialName(key, tier) {
  const base = MATERIAL_BASE_NAMES[key] || key;
  return `T${tier}${base}`;
}

// 「木材」など、ティア抜きの名前が欲しい場合用
function getMaterialBaseName(key) {
  return MATERIAL_BASE_NAMES[key] || key;
}

// =======================
// 旧コード互換用の薄いラッパ（一次素材）
// =======================
//
// 既存の game-core-1.js には getMatTotal(key) が既にあるが、
// そちらを削ってこちらの実装を使う形に揃える想定。
// 他ファイルで t1/t2/t3 に直接アクセスしている箇所は、
// 順次 addMatTierCount / getMatTierCount に差し替えていく。

// 一応グローバルに露出しておく
window.getMatTierCount     = window.getMatTierCount     || getMatTierCount;
window.addMatTierCount     = window.addMatTierCount     || addMatTierCount;
window.getMatTotal         = window.getMatTotal         || getMatTotal;
window.formatMaterialName  = window.formatMaterialName  || formatMaterialName;
window.getMaterialBaseName = window.getMaterialBaseName || getMaterialBaseName;

// =======================
// Tier付きIDユーティリティ（一次素材・中間素材共通）
// =======================

// "T1_wood" / "T2_woodPlank" など → { baseId, tier }
function parseTieredId(id) {
  if (typeof id !== "string") return null;
  const match = id.match(/^T(\d+)_(.+)$/);
  if (!match) return null;
  const tier = parseInt(match[1], 10) || 0;
  if (!tier) return null;
  return {
    baseId: match[2],
    tier: tier
  };
}

// 旧の parseMaterialId 互換（一次素材用）
// IDパーサー: 'T1_wood' → { key: 'wood', tier: 1 }
function parseMaterialId(id) {
  const parsed = parseTieredId(id);
  if (!parsed) return null;
  return { key: parsed.baseId, tier: parsed.tier };
}

// グローバル露出
window.parseTieredId   = window.parseTieredId   || parseTieredId;
window.parseMaterialId = window.parseMaterialId || parseMaterialId;

// =======================
// ITEM_META連携ストレージ（一次素材）
// =======================
//
// storageKind: "materials" 向けに、IDベースの薄いラッパを追加する。
// 仕様:
//   ID 形式: "T1_wood" のように、T<ティア>_<素材キー> を前提とする。
//   既存の materials 構造・セーブデータ形式には一切手を入れない。

if (typeof window.registerStorageImpl === "function") {
  window.registerStorageImpl("materials", {
    // ITEM_META 経由での在庫取得: getItemCountByMeta(id) などから呼ばれる想定
    getCount(id) {
      const parsed = parseMaterialId(id);
      if (!parsed || !parsed.key || !parsed.tier) return 0;
      return getMatTierCount(parsed.key, parsed.tier);
    },

    // 在庫増加: addItemByMeta(id, amount)
    add(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      const parsed = parseMaterialId(id);
      if (!parsed || !parsed.key || !parsed.tier) return;
      addMatTierCount(parsed.key, parsed.tier, amount);
    },

    // 在庫減少: removeItemByMeta(id, amount)
    remove(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      const parsed = parseMaterialId(id);
      if (!parsed || !parsed.key || !parsed.tier) return;
      // マイナス加算で対応（0未満にはならないのは addMatTierCount 側の仕様どおり）
      addMatTierCount(parsed.key, parsed.tier, -amount);
    }
  });
}

// =======================
// 中間素材ヘルパー（intermediateMats ベース）
// =======================
//
// 在庫構造自体は従来どおり intermediateMats[id] を利用し、
// Tier 付きID（T1_woodPlank など）から操作する薄いラッパを提供する。

function getIntermediateTierCountById(id) {
  if (!window.intermediateMats) return 0;
  return window.intermediateMats[id] || 0;
}

function addIntermediateTierCountById(id, amount) {
  amount = amount | 0;
  if (!amount) return;
  if (!window.intermediateMats) window.intermediateMats = {};
  const cur = window.intermediateMats[id] || 0;
  window.intermediateMats[id] = Math.max(0, cur + amount);
}

// baseId + tier で扱いたい場合用（例: "woodPlank", 1）
function getIntermediateTierCount(baseId, tier) {
  const id = `T${tier}_${baseId}`;
  return getIntermediateTierCountById(id);
}

function addIntermediateTierCount(baseId, tier, amount) {
  const id = `T${tier}_${baseId}`;
  addIntermediateTierCountById(id, amount);
}

// グローバル露出
window.getIntermediateTierCount     = window.getIntermediateTierCount     || getIntermediateTierCount;
window.addIntermediateTierCount     = window.addIntermediateTierCount     || addIntermediateTierCount;
window.getIntermediateTierCountById = window.getIntermediateTierCountById || getIntermediateTierCountById;
window.addIntermediateTierCountById = window.addIntermediateTierCountById || addIntermediateTierCountById;

// =======================
// ITEM_META連携ストレージ（中間素材）
// =======================
//
// storageKind: "intermediate" 向けに、intermediateMats を操作する実装。

if (typeof window.registerStorageImpl === "function") {
  window.registerStorageImpl("intermediate", {
    getCount(id) {
      return getIntermediateTierCountById(id);
    },
    add(id, amount) {
      addIntermediateTierCountById(id, amount);
    },
    remove(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      addIntermediateTierCountById(id, -amount);
    }
  });
}

// =======================
// ITEM_META連携ストレージ（料理素材）
// =======================
//
// storageKind: "cooking" 向けに、cookingMats を操作する実装。
// cook-data.js 側で window.cookingMats を初期化している前提。

if (typeof window.registerStorageImpl === "function") {
  window.registerStorageImpl("cooking", {
    getCount(id) {
      if (!window.cookingMats) return 0;
      return window.cookingMats[id] || 0;
    },
    add(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      if (!window.cookingMats) window.cookingMats = {};
      const cur = window.cookingMats[id] || 0;
      window.cookingMats[id] = Math.max(0, cur + amount);
    },
    remove(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      if (!window.cookingMats) window.cookingMats = {};
      const cur = window.cookingMats[id] || 0;
      window.cookingMats[id] = Math.max(0, cur - amount);
    }
  });
}

// =======================
// 素材・中間素材の ITEM_META 登録
// =======================

(function () {
  const defs = {};

  // 通常素材の T1〜T◯（MATERIAL_MAX_T まで）
  const baseKeys = ["wood", "ore", "herb", "cloth", "leather", "water"];

  baseKeys.forEach(key => {
    for (let tier = 1; tier <= MATERIAL_MAX_T; tier++) {
      const id = `T${tier}_${key}`;
      defs[id] = {
        name: formatMaterialName(key, tier), // 例: T1木材
        category: "material",
        storageKind: "materials",
        tier: tier
      };
    }
  });

  // 中間素材（craft-item-data.js 側で定義されている想定）
  // 例: { id: "T1_woodPlank", name: "T1板材", ... }
  if (Array.isArray(window.INTERMEDIATE_MATERIALS)) {
    window.INTERMEDIATE_MATERIALS.forEach(m => {
      const id = m.id;
      if (!id) return;
      const parsed = parseTieredId(id);
      const tier = parsed ? parsed.tier : null;

      defs[id] = {
        name: m.name || id,
        category: "material",
        storageKind: "intermediate",
        tier: tier
      };
    });
  }

  // 星屑の結晶などレア素材（定数名は実装に合わせて）
  if (typeof RARE_GATHER_ITEM_ID === "string") {
    defs[RARE_GATHER_ITEM_ID] = {
      name: "星屑の結晶",
      category: "material",
      // 一次素材扱いにしたいなら "materials"、中間扱いなら "intermediate" に変える
      storageKind: "materials"
    };
  }

  // ITEM_META に登録
  if (typeof registerItemDefs === "function") {
    registerItemDefs(defs);
  }
})();