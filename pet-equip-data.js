// pet-equip-data.js
// ペット専用装備データ（プレイヤー武器/防具とは別カテゴリだが、管理の仕方は完全に揃える）
//
// ★設計方針：
// - combat-equip-data.js の WEAPON_TEMPLATES → generateWeaponTiers → WEAPONS_INIT → registerItemDefs
//   と全く同じ流れで、PET_EQUIP_TEMPLATES → generatePetEquipTiers → PET_EQUIP_ITEMS_INIT → registerItemDefs。
//   つまりペット装備も T1_fangCharm 〜 T10_fangCharm のように「Tierごとに独立したItemID」として
//   ITEM_META に一元登録される（craft.cost / craft.baseRate 込み）。
// - スロットは武器/防具で固定せず「装備1」「装備2」の汎用2枠（category=weapon/armor/otherは
//   あくまでラベルで、どちらの枠にもどのcategoryでも装備できる）。
// - 個体の保管は weaponInstances / armorInstances と同じ形（petEquipInstances配列＋petEquipCounts）。

// =======================
// テンプレート定義
// =======================
const PET_EQUIP_TEMPLATES = [
  // ===== weapon系（攻撃寄り） =====
  {
    baseId: "fangCharm",
    baseName: "牙の飾り",
    category: "weapon",
    baseAtk: 2,
    atkPerTier: 2,
    baseDef: 0,
    defPerTier: 0,
    baseRate: 0.75,
    ratePerTier: -0.04,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_ironIngot`]: 1
    })
  },
  {
    baseId: "clawGuard",
    baseName: "爪の飾り",
    category: "weapon",
    baseAtk: 3,
    atkPerTier: 3,
    baseDef: 0,
    defPerTier: 0,
    baseRate: 0.70,
    ratePerTier: -0.04,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_ironIngot`]: 2
    })
  },

  // ===== armor系（防御寄り） =====
  {
    baseId: "leatherCollar",
    baseName: "革の首輪",
    category: "armor",
    baseAtk: 0,
    atkPerTier: 0,
    baseDef: 2,
    defPerTier: 2,
    baseRate: 0.75,
    ratePerTier: -0.04,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_leather`]: 1
    })
  },
  {
    baseId: "scaleVest",
    baseName: "鱗の胴当て",
    category: "armor",
    baseAtk: 0,
    atkPerTier: 0,
    baseDef: 3,
    defPerTier: 3,
    baseRate: 0.70,
    ratePerTier: -0.04,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_leather`]: 1,
      [`T${tier}_ironIngot`]: 1
    })
  },

  // ===== other系（攻防複合の小ボーナス。将来ここに専用効果を足す想定） =====
  {
    baseId: "luckyBell",
    baseName: "幸運の鈴",
    category: "other",
    baseAtk: 1,
    atkPerTier: 1,
    baseDef: 1,
    defPerTier: 1,
    baseRate: 0.75,
    ratePerTier: -0.04,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1
    })
  }
];

// =======================
// テンプレートから T1〜T{MAX_TIER} を生成
// =======================
// combat-equip-data.js の generateWeaponTiers と同型。
// MAX_TIER / BASE_DURABILITY は combat-equip-data.js 側のグローバル定数を流用する
// （読み込み順は index.html で combat-equip-data.js → pet-equip-data.js の想定）。
function generatePetEquipTiers(tpl) {
  const maxTier = (typeof MAX_TIER === "number") ? MAX_TIER : 10;
  const dur     = (typeof BASE_DURABILITY === "number") ? BASE_DURABILITY : 3;
  const list = [];
  for (let tier = 1; tier <= maxTier; tier++) {
    const atk  = tpl.baseAtk + tpl.atkPerTier * (tier - 1);
    const def  = tpl.baseDef + tpl.defPerTier * (tier - 1);
    const rate = tpl.baseRate + tpl.ratePerTier * (tier - 1);
    const cost = tpl.costPattern(tier);

    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      category: tpl.category, // weapon/armor/other（表示ラベル。スロット制限には使わない）
      tier,
      atk,
      def,
      cost,
      rate,
      enhance: 0,
      enhanceStep: tpl.enhanceStep,
      durability: dur
    });
  }
  return list;
}

const PET_EQUIP_ITEMS_INIT = PET_EQUIP_TEMPLATES.flatMap(generatePetEquipTiers);
window.PET_EQUIP_ITEMS_INIT = PET_EQUIP_ITEMS_INIT;

// =======================
// ITEM_META への登録
// =======================
if (typeof registerItemDefs === "function") {
  (function () {
    const defs = {};
    PET_EQUIP_ITEMS_INIT.forEach(it => {
      defs[it.id] = {
        id: it.id,
        name: it.name,
        category: "petEquip",
        tier: it.tier,

        // ペット用固定ステ（強化率だけ実行時に掛ける。プレイヤー装備のscaleStr/scaleVitに相当するものは無し）
        atk: it.atk,
        def: it.def,
        baseDurability: it.durability,
        enhanceStep: it.enhanceStep,

        craft: {
          enabled: true,
          category: "petEquip",
          tier: it.tier,
          kind: "normal",
          baseRate: it.rate,
          cost: it.cost
        }
      };
    });
    registerItemDefs(defs);
  })();
}

// =======================
// 個体インスタンス管理（weaponInstances / armorInstances と同型）
// =======================
window.petEquipInstances = Array.isArray(window.petEquipInstances) ? window.petEquipInstances : [];
window.petEquipCounts    = (window.petEquipCounts && typeof window.petEquipCounts === "object") ? window.petEquipCounts : {};

// 既存セーブ互換: location 未定義なら倉庫扱い
window.petEquipInstances.forEach(inst => {
  if (!inst.location) inst.location = "warehouse";
});

/**
 * クラフト成功時に呼ぶ。weaponInstances向けのaddWeaponInstanceと同型。
 */
function addPetEquipInstance(id, quality, enhance) {
  const inst = {
    id,
    quality: quality || 0,
    enhance: enhance || 0,
    durability: (typeof BASE_DURABILITY === "number") ? BASE_DURABILITY : 3,
    location: "warehouse"
  };
  window.petEquipInstances.push(inst);
  window.petEquipCounts[id] = (window.petEquipCounts[id] || 0) + 1;
  return inst;
}
window.addPetEquipInstance = addPetEquipInstance;

const PET_EQUIP_ENH_RATE     = 0.05; // 強化1段階につき+5%（プレイヤー武器/防具と同率）
const PET_EQUIP_QUALITY_RATE = [1.0, 1.10, 1.20]; // 通常/良品/傑作

/**
 * ペット装備インスタンス1つぶんの最終atk/defボーナスを返す（ITEM_META基礎値×強化×品質）。
 * 空スロット(null)なら {atk:0, def:0} を返す。
 */
function getPetEquipInstanceStat(inst) {
  if (!inst) return { atk: 0, def: 0 };
  const meta = (typeof getItemMeta === "function") ? getItemMeta(inst.id) : null;
  if (!meta) return { atk: 0, def: 0 };

  const enhance = inst.enhance || 0;
  const quality = inst.quality || 0;
  const enhRate = 1 + enhance * PET_EQUIP_ENH_RATE;
  const qRate   = PET_EQUIP_QUALITY_RATE[quality] != null ? PET_EQUIP_QUALITY_RATE[quality] : 1.0;

  return {
    atk: Math.floor((meta.atk || 0) * enhRate * qRate),
    def: Math.floor((meta.def || 0) * enhRate * qRate)
  };
}
window.getPetEquipInstanceStat = getPetEquipInstanceStat;

/**
 * petList レコードの2スロット(equip[0]/equip[1])を合算したatk/defボーナスを返す。
 * レコードにequipが無い（旧セーブ）場合は {atk:0, def:0}。
 */
function getPetEquipStatTotal(rec) {
  if (!rec || !Array.isArray(rec.equip)) return { atk: 0, def: 0 };
  let atk = 0, def = 0;
  for (const inst of rec.equip) {
    const s = getPetEquipInstanceStat(inst);
    atk += s.atk;
    def += s.def;
  }
  return { atk, def };
}
window.getPetEquipStatTotal = getPetEquipStatTotal;
