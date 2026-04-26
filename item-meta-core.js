// item-meta-core.js
// ========================================
// アイテム共通メタ定義・レジストリ・ヘルパー
// ========================================

(function initItemMetaCore(global) {
  "use strict";

  // -------------------------
  // 本体レジストリ
  // -------------------------

  const ITEM_META = global.ITEM_META || (global.ITEM_META = {});

  // 内部: 登録時のデフォルト値
  const DEFAULT_META = {
    name: null,          // 表示名
    category: null,      // weapon/armor/potion/tool/food/drink/material/other...
    craftCategory: null, // クラフトカテゴリ（省略時は category を流用）
    storageKind: null,   // inventory/materials/intermediate/cooking/none...
    storageTab: null,    // UIでのタブ: materials/farm/garden/cooking/tools/equip/other...
    tier: null,          // 1/2/3 or "T1"/"T2"/"T3"
    tags: null,          // ["atkUp","hpRegen","farmOnly",...]
    flags: null,         // { quest: true, noSell: true, ... }

    // ★ 追加: クラフト用メタ（レシピ一元化用）
    // 仕様:
    // craft: {
    //   enabled: boolean,
    //   category: string,          // "weapon" | "armor" | "potion" | "tool" | "material" | "food" | "drink" など
    //   tier?: number,             // 1/2/3
    //   kind?: string,             // "normal" / "gather" など拡張用
    //   baseRate: number,          // 0〜1
    //   cost: { [itemId: string]: number }  // 中間素材含めて itemId で指定
    // }
    craft: null
  };

  // category ごとのデフォルト
  const CATEGORY_DEFAULTS = {
    weapon: {
      craftCategory: "weapon",
      storageKind: "inventory",
      storageTab: "equip"
    },
    armor: {
      craftCategory: "armor",
      storageKind: "inventory",
      storageTab: "equip"
    },
    potion: {
      craftCategory: "potion",
      storageKind: "inventory",
      storageTab: "potion"
    },
    tool: {
      craftCategory: "tool",
      storageKind: "inventory",
      storageTab: "tool"
    },
    food: {
      craftCategory: "food",
      storageKind: "inventory",
      storageTab: "cooking"
    },
    drink: {
      craftCategory: "drink",
      storageKind: "inventory",
      storageTab: "cooking"
    },
    material: {
      craftCategory: "material",
      storageKind: "materials",
      storageTab: "materials"
    },
    cookingMat: {
      craftCategory: "material",
      storageKind: "cooking",
      storageTab: "cookingMat"
    }
  };

  // storageKind ごとの get/set 実装を後で紐づけるためのテーブル
  const STORAGE_IMPL = {
    // key: storageKind
    // 例:
    // inventory: { getCount(id), add(id,n), remove(id,n) }
  };

  // -------------------------
  // ユーティリティ
  // -------------------------

  function clone(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.slice();
    return Object.assign({}, obj);
  }

  function toArray(x) {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }

  function normalizeTier(tier, id) {
    if (tier === null || tier === undefined) {
      // ID 末尾から推定: _T1/_T2/_T3 or T1/T2/T3
      if (id) {
        let m = id.match(/_T([0-9]+)$/);
        if (!m) m = id.match(/T([0-9]+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) return n;
        }
      }
      return null;
    }
    if (typeof tier === "number") return tier;
    if (typeof tier === "string") {
      if (/^T[0-9]+$/.test(tier)) {
        const n = parseInt(tier.slice(1), 10);
        if (!isNaN(n)) return n;
      }
      const n = parseInt(tier, 10);
      if (!isNaN(n)) return n;
    }
    return null;
  }

  function normalizeTags(tags) {
    const arr = toArray(tags);
    const out = [];
    arr.forEach(t => {
      if (!t) return;
      if (typeof t !== "string") return;
      const s = t.trim();
      if (!s) return;
      if (!out.includes(s)) out.push(s);
    });
    return out.length ? out : null;
  }

  function normalizeFlags(flags) {
    if (!flags || typeof flags !== "object") return null;
    const out = {};
    Object.keys(flags).forEach(k => {
      out[k] = !!flags[k];
    });
    return Object.keys(out).length ? out : null;
  }

  function mergeMeta(base, extra) {
    const result = clone(base);
    Object.keys(extra || {}).forEach(k => {
      const v = extra[k];
      if (v === undefined) return;
      if (k === "tags") {
        const merged = normalizeTags([].concat(base.tags || [], v));
        result.tags = merged;
      } else if (k === "flags") {
        result.flags = Object.assign({}, base.flags || {}, v || {});
      } else {
        result[k] = v;
      }
    });
    return result;
  }

  // shallow equality（既存メタと新メタの比較用）
  function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      const k = ka[i];
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  // -------------------------
  // 登録: registerItemDefs
  // -------------------------

  /**
   * defs: {
   *   "id1": { name, category, craftCategory, storageKind, storageTab, tier, tags, flags, craft, ... },
   *   "id2": { ... },
   * }
   */
  function registerItemDefs(defs) {
    if (!defs || typeof defs !== "object") return;

    Object.keys(defs).forEach(id => {
      const raw = defs[id] || {};
      if (!id || typeof id !== "string") return;

      const existing = ITEM_META[id];

      // ベース: 既存メタ or デフォルト
      let meta = existing ? clone(existing) : clone(DEFAULT_META);

      // カテゴリデフォルト適用
      const cat = raw.category || meta.category;
      if (cat && CATEGORY_DEFAULTS[cat]) {
        meta = mergeMeta(meta, CATEGORY_DEFAULTS[cat]);
        meta.category = cat;
      }

      // 生データ反映
      meta = mergeMeta(meta, raw);

      // tier 正規化
      meta.tier = normalizeTier(meta.tier, id);

      // tags / flags 正規化
      meta.tags  = normalizeTags(meta.tags);
      meta.flags = normalizeFlags(meta.flags);

      // craftCategory / storageKind / storageTab の最終埋め
      if (!meta.craftCategory && meta.category) {
        meta.craftCategory =
          (CATEGORY_DEFAULTS[meta.category] && CATEGORY_DEFAULTS[meta.category].craftCategory) ||
          meta.category;
      }
      if (!meta.storageKind && meta.category) {
        meta.storageKind =
          (CATEGORY_DEFAULTS[meta.category] && CATEGORY_DEFAULTS[meta.category].storageKind) ||
          "inventory";
      }
      if (!meta.storageTab && meta.category) {
        meta.storageTab =
          (CATEGORY_DEFAULTS[meta.category] && CATEGORY_DEFAULTS[meta.category].storageTab) ||
          "other";
      }

      if (existing) {
        // 既存と同一なら「同じ定義の再登録」として warn
        if (shallowEqual(existing, meta)) {
          console.warn("ITEM_META duplicate id (same):", id);
        } else {
          // 中身が異なる場合は本物の衝突として error
          console.error("ITEM_META CONFLICT id:", id, { old: existing, new: meta });
        }
      }

      ITEM_META[id] = meta;
    });
  }

  // -------------------------
  // 基本ゲッター
  // -------------------------

  function getItemMeta(id) {
    return ITEM_META[id] || null;
  }

  function getItemName(id) {
    const m = getItemMeta(id);
    return (m && m.name) || id;
  }

  function getItemCategory(id) {
    const m = getItemMeta(id);
    return (m && m.category) || null;
  }

  function getItemCraftCategory(id) {
    const m = getItemMeta(id);
    if (!m) return null;
    return m.craftCategory || m.category || null;
  }

  function getItemStorageKind(id) {
    const m = getItemMeta(id);
    if (!m) return null;
    return m.storageKind || "inventory";
  }

  function getItemStorageTab(id) {
    const m = getItemMeta(id);
    if (!m) return "other";
    return m.storageTab || "other";
  }

  function getItemTier(id) {
    const m = getItemMeta(id);
    if (!m) return null;
    return normalizeTier(m.tier, id);
  }

  function getItemTags(id) {
    const m = getItemMeta(id);
    return m && m.tags ? m.tags.slice() : [];
  }

  function hasItemTag(id, tag) {
    if (!tag) return false;
    const tags = getItemTags(id);
    return tags.includes(tag);
  }

  function getItemFlag(id, key) {
    if (!key) return false;
    const m = getItemMeta(id);
    if (!m || !m.flags) return false;
    return !!m.flags[key];
  }

  // -------------------------
  // 一覧・検索ヘルパー
  // -------------------------

  function getAllItemIds() {
    return Object.keys(ITEM_META);
  }

  function getAllItemMeta() {
    return Object.keys(ITEM_META).map(id => ITEM_META[id]);
  }

  function getItemIdsByCategory(category) {
    const out = [];
    Object.keys(ITEM_META).forEach(id => {
      if (ITEM_META[id].category === category) out.push(id);
    });
    return out;
  }

  function getItemIdsByCraftCategory(craftCategory) {
    const out = [];
    Object.keys(ITEM_META).forEach(id => {
      if (getItemCraftCategory(id) === craftCategory) out.push(id);
    });
    return out;
  }

  function getItemIdsByStorageTab(tab) {
    const out = [];
    Object.keys(ITEM_META).forEach(id => {
      if (getItemStorageTab(id) === tab) out.push(id);
    });
    return out;
  }

  function getItemIdsByTag(tag) {
    const out = [];
    Object.keys(ITEM_META).forEach(id => {
      if (hasItemTag(id, tag)) out.push(id);
    });
    return out;
  }

  function getItemIdsByFlags(flagKey) {
    const out = [];
    Object.keys(ITEM_META).forEach(id => {
      if (getItemFlag(id, flagKey)) out.push(id);
    });
    return out;
  }

  // -------------------------
  // ソート / 表示用ユーティリティ
  // -------------------------

  function getItemSortKey(id) {
    const m = getItemMeta(id) || {};
    const tier = getItemTier(id) || 0;
    const cat  = getItemCategory(id) || "";
    const name = getItemName(id) || "";
    // 例: tier昇順 → category → name
    return `${String(tier).padStart(2, "0")}#${cat}#${name}#${id}`;
  }

  function sortItemIds(ids) {
    return ids.slice().sort((a, b) => {
      const ka = getItemSortKey(a);
      const kb = getItemSortKey(b);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0;
    });
  }

  const CATEGORY_LABEL_JP = {
    weapon:   "武器",
    armor:    "防具",
    potion:   "ポーション",
    tool:     "道具",
    material: "中間素材",
    food:     "料理（食べ物）",
    drink:    "料理（飲み物）",
    cookingMat: "料理素材",
    other:    "その他"
  };

  function getItemCategoryLabel(id) {
    const cat = getItemCategory(id) || "other";
    return CATEGORY_LABEL_JP[cat] || cat;
  }

  function getCraftCategoryLabel(cat) {
    return CATEGORY_LABEL_JP[cat] || cat;
  }

  // -------------------------
  // ストレージ実装登録
  // -------------------------

  /**
   * storageKind ごとにストレージ操作実装を登録する。
   * impl: {
   *   getCount(id) => number,
   *   add(id, amount) => void,
   *   remove(id, amount) => void
   * }
   */
  function registerStorageImpl(storageKind, impl) {
    if (!storageKind || typeof storageKind !== "string") return;
    if (!impl || typeof impl !== "object") return;

    const safeImpl = {
      getCount: typeof impl.getCount === "function" ? impl.getCount : function () { return 0; },
      add:      typeof impl.add      === "function" ? impl.add      : function () {},
      remove:   typeof impl.remove   === "function" ? impl.remove   : function () {}
    };

    STORAGE_IMPL[storageKind] = safeImpl;
  }

  function getStorageImplForItem(id) {
    const kind = getItemStorageKind(id);
    if (!kind) return null;
    return STORAGE_IMPL[kind] || null;
  }

  // -------------------------
  // 共通ストレージヘルパー
  // -------------------------

  function getItemCountByMeta(id) {
    const impl = getStorageImplForItem(id);
    if (!impl || !impl.getCount) return 0;
    return impl.getCount(id) || 0;
  }

  function addItemByMeta(id, amount) {
    amount = amount || 1;
    if (amount === 0) return;
    const impl = getStorageImplForItem(id);
    if (!impl || !impl.add) return;
    impl.add(id, amount);
  }

  function removeItemByMeta(id, amount) {
    amount = amount || 1;
    if (amount === 0) return;
    const impl = getStorageImplForItem(id);
    if (!impl || !impl.remove) return;
    impl.remove(id, amount);
  }

  // -------------------------
  // 外部公開
  // -------------------------

  global.registerItemDefs           = registerItemDefs;
  global.getItemMeta               = getItemMeta;
  global.getItemName               = getItemName;
  global.getItemCategory           = getItemCategory;
  global.getItemCraftCategory      = getItemCraftCategory;
  global.getItemStorageKind        = getItemStorageKind;
  global.getItemStorageTab         = getItemStorageTab;
  global.getItemTier               = getItemTier;
  global.getItemTags               = getItemTags;
  global.hasItemTag                = hasItemTag;
  global.getItemFlag               = getItemFlag;
  global.getAllItemIds             = getAllItemIds;
  global.getAllItemMeta            = getAllItemMeta;
  global.getItemIdsByCategory      = getItemIdsByCategory;
  global.getItemIdsByCraftCategory = getItemIdsByCraftCategory;
  global.getItemIdsByStorageTab    = getItemIdsByStorageTab;
  global.getItemIdsByTag           = getItemIdsByTag;
  global.getItemIdsByFlags         = getItemIdsByFlags;
  global.getItemSortKey            = getItemSortKey;
  global.sortItemIds               = sortItemIds;
  global.getItemCategoryLabel      = getItemCategoryLabel;
  global.getCraftCategoryLabel     = getCraftCategoryLabel;
  global.registerStorageImpl       = registerStorageImpl;
  global.getItemCountByMeta        = getItemCountByMeta;
  global.addItemByMeta             = addItemByMeta;
  global.removeItemByMeta          = removeItemByMeta;

})(window);