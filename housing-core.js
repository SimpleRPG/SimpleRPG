// housing-core.js
// 拠点 / ハウジングまわりの最小コア
// ・市民権フラグの管理
// ・ギルド側からの解放コールバック
// ・UI更新フック（game-ui-3.js の refreshHousingStatusAndTab / html.js の updateHousingWarehouseTabs と連携）
// ・土地レンタル状態の管理（ギルド寮 / 街の一室 / 郊外の土地）

// ==============================
// 初期化
// ==============================

// 既存セーブデータとの衝突を避けて初期化
if (typeof window.citizenshipUnlocked === "undefined") {
  window.citizenshipUnlocked = false;
}

// ハウジング用ステート（既存フィールドはそのまま残しつつ拡張）
if (typeof window.housingState === "undefined") {
  window.housingState = {
    hasBase: false,     // 住宅を取得済みかどうか
    baseLevel: 0,       // 住宅レベル（將来用）
    lastGuildId: null,  // 市民権をくれたギルドID（演出用）

    // 追加: 土地レンタル関連
    landId: null,       // 現在借りている土地プランID ("guildDorm_warrior" など)
    rentDueAt: null,    // 次の家賃支払期限（Unix ms）
    rentUnpaid: false,  // 期限超過で滞納中かどうか
    furnitureSlots: [], // 家具スロット情報（將来の拡張用）
    houseType: null     // 郊外に建築された住宅タイプID ("cottage_rustic", "house_standard", "mansion_warrior", "lodge_harvester", "workshop_artisan")
  };
} else {
  // 既存セーブに対して、追加フィールドだけ安全に補完
  const hs = window.housingState;
  if (typeof hs.hasBase === "undefined") hs.hasBase = false;
  if (typeof hs.baseLevel === "undefined") hs.baseLevel = 0;
  if (typeof hs.lastGuildId === "undefined") hs.lastGuildId = null;
  if (typeof hs.landId === "undefined") hs.landId = null;
  if (typeof hs.rentDueAt === "undefined") hs.rentDueAt = null;
  if (typeof hs.rentUnpaid === "undefined") hs.rentUnpaid = false;
  if (!Array.isArray(hs.furnitureSlots)) hs.furnitureSlots = [];
  if (typeof hs.houseType === "undefined") hs.houseType = null;
}

// ==============================
// 住宅の種類（郊外の土地向け・全5種）
// ==============================
window.HOUSING_HOUSES = window.HOUSING_HOUSES || {
  // 1. 素朴な小屋（安価・3×3 / T1素材・中間素材）
  "cottage_rustic": {
    id: "cottage_rustic",
    name: "素朴な小屋",
    icon: "🏡",
    category: "budget",
    tag: "安価・初期 (T1素材)",
    desc: "コストを抑えて手早く建てられる素朴な平屋。居住空間はコンパクトな3×3（9マス）。",
    width: 3,
    height: 3,
    cost: {
      gold: 500,
      materials: {
        "T1_woodPlank": 8,
        "T1_ironIngot": 4,
        "T1_wood": 10,
        "T1_ore": 10
      }
    },
    buffs: {},
    buffDesc: "バフなし（3×3 標準スペース）"
  },

  // 2. 標準的な木造住宅（通常・4×4 / T2素材・中間素材）
  "house_standard": {
    id: "house_standard",
    name: "標準的な木造住宅",
    icon: "🏠",
    category: "standard",
    tag: "通常・広大 (T2素材)",
    desc: "住み心地の良い4×4構造の木造住宅。家具をたっぷり16マス分配置できる。",
    width: 4,
    height: 4,
    cost: {
      gold: 2500,
      materials: {
        "T2_woodPlank": 15,
        "T2_ironIngot": 10,
        "T2_toughLeather": 6,
        "T2_wood": 15,
        "T2_ore": 15
      }
    },
    buffs: {},
    buffDesc: "4×4 広大スペース（16マス配置可能）"
  },

  // 3. 戦士の鍛錬屋敷（戦闘特化・4×4・バフ付 / T3素材・中間素材）
  "mansion_warrior": {
    id: "mansion_warrior",
    name: "戦士の鍛錬屋敷",
    icon: "⚔️",
    category: "combat",
    tag: "戦闘特化 (T3素材)",
    desc: "鍛錬場と武具手入れ場を備えた武門の館。戦闘時の力と集中力が高まる。",
    width: 4,
    height: 4,
    cost: {
      gold: 6000,
      materials: {
        "T3_woodPlank": 20,
        "T3_ironIngot": 15,
        "T3_toughLeather": 12,
        "T3_ore": 20,
        "T3_boneChip": 5
      }
    },
    buffs: {
      dmgRateAdd: 0.05,        // 与ダメージ +5%
      dmgReduceRate: 0.03,     // 被ダメージ 3% 軽減
      battleExpRate: 0.05      // 戦闘EXP +5%
    },
    buffDesc: "⚔️ 与ダメージ+5% / 被ダメージ-3% / 戦闘EXP+5%"
  },

  // 4. 収穫の園ロッジ（採取特化・4×4・バフ付 / T3素材・中間素材）
  "lodge_harvester": {
    id: "lodge_harvester",
    name: "収穫の園ロッジ",
    icon: "🌿",
    category: "gather",
    tag: "採取特化 (T3素材)",
    desc: "自然の恵みを取り入れた開放的なロッジ。採取活動での獲得個数とEXPが増加する。",
    width: 4,
    height: 4,
    cost: {
      gold: 6000,
      materials: {
        "T3_woodPlank": 20,
        "T3_clothBolt": 15,
        "T3_mixHerb": 12,
        "T3_wood": 20,
        "T3_resin": 5
      }
    },
    buffs: {
      gatherDropAdd: 1,        // 採取獲得個数 +1
      gatherExpRate: 0.05      // 採取EXP +5%
    },
    buffDesc: "🌿 採取獲得量+1個 / 採取EXP+5%"
  },

  // 5. 職人の工房邸（クラフト特化・4×4・バフ付 / T3素材・中間素材）
  "workshop_artisan": {
    id: "workshop_artisan",
    name: "職人の工房邸",
    icon: "🔨",
    category: "craft",
    tag: "クラフト特化 (T3素材)",
    desc: "作業机や精錬炉を完備した職人仕様の家。製作時の成功率とEXPが向上する。",
    width: 4,
    height: 4,
    cost: {
      gold: 6000,
      materials: {
        "T3_woodPlank": 20,
        "T3_ironIngot": 15,
        "T3_distilledWater": 12,
        "T3_ore": 20,
        "T3_crystal": 5
      }
    },
    buffs: {
      craftSuccessRateAdd: 0.05, // クラフト成功率 +5%
      craftExpRate: 0.05          // クラフトEXP +5%
    },
    buffDesc: "🔨 クラフト成功率+5% / クラフトEXP+5%"
  }
};

// ==============================
// 土地プラン定義
// ==============================
//
// ギルド寮 / 街の一室 / 郊外の土地 の3系統だけを想定。
// 仕様はここで完結していて、ゲームプレイ上の挙動は
// ・週ごとの家賃
// ・土地ごとの家具スロット数
// ・土地種別(kind)に応じたボーナス方向
// だけに留めている（具体ボーナスは他モジュール側で参照する）。

window.HOUSING_LANDS = window.HOUSING_LANDS || {
  // ギルド寮
  // 「自分の所属しているギルドの寮」というニュアンスを出したいが、
  // 現仕様では land 定義は固定なので、ここでは「戦士ギルド寮」を基準にしつつ
  // 所属チェックは「何かしらのギルドに所属しているか」で見る（guildId はメタ情報として残す）。
  "guildDorm_warrior": {
    id: "guildDorm_warrior",
    kind: "guildDorm",
    name: "戦士ギルド寮",   // 表示テキスト。実際の表示は getGuildDormDisplayName で差し替え。
    // weeklyRent: 200, // 元の家賃（バランス調整前）
    weeklyRent: 0,
    baseSlots: 2,
    guildId: "warrior"
  },

  // 街の一室（市民なら誰でも借りられる）
  // 家具スロットは 5 に引き上げ（將来の家具システムを見越した仕様）
  "cityRoom": {
    id: "cityRoom",
    kind: "cityRoom",
    name: "街の一室",
    // weeklyRent: 800, // 元の家賃（バランス調整前）
    weeklyRent: 0,
    baseSlots: 5
  },

  // 郊外の土地（高めの維持費・スロット多め）
  // 「5〜」の「〜」部分は、家の種類や増築で上乗せする前提なので、
  // コア定義としては 5 をベース値にしておく。
  "suburbLand": {
    id: "suburbLand",
    kind: "suburbLand",
    name: "郊外の土地",
    // weeklyRent: 2000, // 元の家賃（バランス調整前）
    weeklyRent: 0,
    baseSlots: 5
  }
};

/**
 * ギルド寮の表示名を、現在の所属ギルドに応じて返すヘルパー。
 * ・既存 land 定義（id / guildId / weeklyRent など）は一切変更しない
 * ・UI 側で「表示に使う name だけ」これを通して動的に差し替える想定
 */
window.getGuildDormDisplayName = function(baseName) {
  const defaultName = baseName || "ギルド寮";

  // 現在所属しているギルドID
  const gid = (typeof window.playerGuildId !== "undefined") ? window.playerGuildId : null;
  if (!gid) return defaultName;

  // ギルド名が取れるなら、「〇〇ギルド寮」風の名前にする
  if (typeof getGuildNameById === "function") {
    try {
      const gname = getGuildNameById(gid);
      if (gname) {
        // 例: 「食材ギルド」の場合 → 「食材ギルド寮」
        return `${gname}寮`;
      }
    } catch (e) {
      // 失敗しても既定名のまま
    }
  }

  return defaultName;
};

// ==============================
// 市民権解放コールバック（既存仕様）
// ==============================

/**
 * ギルド側から「市民権を解放した」ときに呼んでもらうエントリポイント。
 * 例: guild.js 内で、特別依頼クリア時に:
 *   if (typeof onCitizenshipUnlockedFromGuild === "function") {
 *     onCitizenshipUnlockedFromGuild(guildId);
 *   }
 */
window.onCitizenshipUnlockedFromGuild = function(guildId) {
  // すでに取得済みなら何もしない（多重ログ防止）
  if (window.citizenshipUnlocked) {
    return;
  }

  window.citizenshipUnlocked = true;
  if (window.housingState) {
    window.housingState.lastGuildId = guildId || null;
  }

  // ギルド名を出せるなら出す（なければ「とあるギルド」）
  let guildName = "とあるギルド";
  try {
    if (typeof getGuildNameById === "function" && guildId != null) {
      const name = getGuildNameById(guildId);
      if (name) guildName = name;
    }
  } catch (e) {
    // 失敗しても落とさない
  }

  if (typeof appendLog === "function") {
    appendLog(`${guildName}の推薦により、市民権を得た。拠点メニューが解放された。`);
  }

  // ステータス画面やタブの表示を更新
  if (typeof refreshHousingStatusAndTab === "function") {
    try { refreshHousingStatusAndTab(); } catch (e) {}
  }

  // 倉庫タブ / 拠点タブの表示を即反映（html.js 側のヘルパ）
  if (typeof updateHousingWarehouseTabs === "function") {
    try { updateHousingWarehouseTabs(); } catch (e) {}
  }

  // セーブシステムがあればここで即セーブしてもよい（任意）
  if (typeof saveToLocal === "function") {
    try {
      saveToLocal();
    } catch (e) {
      // セーブ失敗してもゲーム続行
    }
  }
};

// ==============================
// 土地レンタル関連ヘルパ
// ==============================

function getHousingStateSafe() {
  window.housingState = window.housingState || {};
  const hs = window.housingState;
  if (typeof hs.landId === "undefined") hs.landId = null;
  if (typeof hs.rentDueAt === "undefined") hs.rentDueAt = null;
  if (typeof hs.rentUnpaid === "undefined") hs.rentUnpaid = false;
  if (!Array.isArray(hs.furnitureSlots)) hs.furnitureSlots = [];
  if (typeof hs.hasBase === "undefined") hs.hasBase = false;
  if (typeof hs.baseLevel === "undefined") hs.baseLevel = 0;
  if (typeof hs.lastGuildId === "undefined") hs.lastGuildId = null;
  return hs;
}

/**
 * UI側から使いやすいフラグヘルパ
 * 仕様は既存の isHousingActive と同じ前提で、「UIでどう見せるか」を分けるためだけに追加。
 */

// 拠点UIをフルに利用できるかどうか（＝土地があり、滞納していない）
window.canUseHousingUIFully = function() {
  const hs = getHousingStateSafe();
  if (!hs.landId) return false;
  if (hs.rentUnpaid) return false;
  return true;
};

// 土地はあるが、家賃滞納中でロック状態かどうか
window.isHousingRentOverdue = function() {
  const hs = getHousingStateSafe();
  return !!(hs.landId && hs.rentUnpaid);
};

/**
 * 現在の土地プランを取得（なければ null）。
 */
window.getCurrentHousingLand = function() {
  const hs = getHousingStateSafe();
  if (!hs.landId) return null;
  const lands = window.HOUSING_LANDS || {};
  return lands[hs.landId] || null;
};

/**
 * 土地を借りられるかどうかのチェックだけ行う。
 * 仕様:
 *  - landId が存在しない場合はNG
 *  - ギルド寮(kind: "guildDorm") の場合、何かしらギルドに所属している必要がある
 *  - 市民権が必要であれば citizenshipUnlocked を参照
 *  - 家賃分の money が無ければNG
 */
window.canRentLand = function(landId) {
  const lands = window.HOUSING_LANDS || {};
  const land = lands[landId];
  if (!land) {
    return { ok: false, reason: "存在しない土地" };
  }

  const hs = getHousingStateSafe();
  if (hs.landId && hs.landId === landId) {
    return { ok: false, reason: "すでに借りている" };
  }

  // ギルド寮の場合は「何かしらのギルドに所属していれば借りられる」
  if (land.kind === "guildDorm") {
    const pgid = (typeof window.playerGuildId !== "undefined") ? window.playerGuildId : null;
    if (!pgid) {
      return { ok: false, reason: "対応するギルドに所属していない" };
    }
    // land.guildId は判定には使わず、メタ情報として保持したままにする
  }

  // 市民権必須にしたい土地があればここで判定（例: cityRoom, suburbLand）
  if ((land.kind === "cityRoom" || land.kind === "suburbLand") && !window.citizenshipUnlocked) {
    return { ok: false, reason: "市民権が必要だ" };
  }

  if (typeof money === "number" && money < land.weeklyRent) {
    return { ok: false, reason: "お金が足りない" };
  }

  return { ok: true };
};

/**
 * 土地を借りる本処理。
 * money から家賃を即時支払い、rentDueAt を1週間後に設定。
 */
window.rentLand = function(landId) {
  const lands = window.HOUSING_LANDS || {};
  const land = lands[landId];
  if (!land) {
    if (typeof appendLog === "function") {
      appendLog("[拠点] その土地は存在しない。");
    }
    return;
  }

  const check = window.canRentLand(landId);
  if (!check.ok) {
    if (typeof appendLog === "function") {
      appendLog("[拠点] " + check.reason);
    }
    return;
  }

  const hs = getHousingStateSafe();

  const rent = land.weeklyRent || 0;
  if (typeof money === "number") {
    money -= rent;
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  hs.landId = land.id;
  hs.rentDueAt = now + weekMs;
  hs.rentUnpaid = false;

  // 表示名だけ、必要なら動的なギルド寮名に差し替える
  let landNameForLog = land.name;
  if (land.kind === "guildDorm" && typeof window.getGuildDormDisplayName === "function") {
    landNameForLog = window.getGuildDormDisplayName(land.name);
  }

  if (typeof appendLog === "function") {
    appendLog(`[拠点] ${landNameForLog} を1週間レンタルした（家賃 ${rent}G）`);
  }

  if (typeof refreshHousingFromState === "function") {
    try { refreshHousingFromState(); } catch (e) {}
  }
  if (typeof updateDisplay === "function") {
    try { updateDisplay(); } catch (e) {}
  }
};

/**
 * 家賃の期限をチェックし、期限超過なら rentUnpaid を true にする。
 * 起動時や日次処理のタイミングで呼ぶ想定。
 */
window.checkHousingRent = function() {
  const hs = getHousingStateSafe();
  if (!hs.landId || !hs.rentDueAt) return;

  const now = Date.now();
  if (now > hs.rentDueAt && !hs.rentUnpaid) {
    hs.rentUnpaid = true;
    if (typeof appendLog === "function") {
      appendLog("[拠点] 家賃の支払期限を過ぎてしまった。拠点効果が停止している。");
    }
    if (typeof refreshHousingFromState === "function") {
      try { refreshHousingFromState(); } catch (e) {}
    }
  }
};

/**
 * 家賃支払い。
 * 支払いに成功すると rentDueAt を1週間後に延長し、rentUnpaid を false に戻す。
 */
window.payHousingRent = function() {
  const hs = getHousingStateSafe();
  if (!hs.landId) {
    if (typeof appendLog === "function") {
      appendLog("[拠点] 借りている土地がない。");
    }
    return;
  }
  const lands = window.HOUSING_LANDS || {};
  const land = lands[hs.landId];
  if (!land) {
    if (typeof appendLog === "function") {
      appendLog("[拠点] 土地情報が見つからない。");
    }
    return;
  }

  const rent = land.weeklyRent || 0;
  if (typeof money === "number" && money < rent) {
    if (typeof appendLog === "function") {
      appendLog("[拠点] 家賃を払うお金が足りない。");
    }
    return;
  }

  if (typeof money === "number") {
    money -= rent;
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  hs.rentDueAt = Date.now() + weekMs;
  hs.rentUnpaid = false;

  if (typeof appendLog === "function") {
    appendLog(`[拠点] 家賃 ${rent}G を支払った。1週間の契約を更新した。`);
  }

  if (typeof refreshHousingFromState === "function") {
    try { refreshHousingFromState(); } catch (e) {}
  }
  if (typeof updateDisplay === "function") {
    try { updateDisplay(); } catch (e) {}
  }
};

/**
 * 現在の拠点効果が有効かどうか。
 * - landId が設定されている
 * - rentUnpaid が false
 * のとき true。
 */
window.isHousingActive = function() {
  const hs = getHousingStateSafe();
  if (!hs.landId) return false;
  if (hs.rentUnpaid) return false;
  return true;
};

// ==============================
// 住宅バフ取得・建築ヘルパー
// ==============================

/**
 * 現在の拠点で有効な住宅バフを取得
 */
window.getHousingHouseBuffs = function() {
  if (typeof window.isHousingActive === "function" && !window.isHousingActive()) {
    return {};
  }
  const hs = (typeof getHousingStateSafe === "function") ? getHousingStateSafe() : (window.housingState || {});
  if (!hs || hs.landId !== "suburbLand") {
    return {};
  }
  const houseType = hs.houseType || "cottage_rustic";
  const def = (window.HOUSING_HOUSES && window.HOUSING_HOUSES[houseType]);
  return (def && def.buffs) ? def.buffs : {};
};

/**
 * 住宅を建築できるかチェック
 */
window.canBuildHouse = function(houseId) {
  const hs = (typeof getHousingStateSafe === "function") ? getHousingStateSafe() : (window.housingState || {});
  if (!hs.landId) return { ok: false, reason: "土地を借りていない" };
  if (hs.landId !== "suburbLand") return { ok: false, reason: "郊外の土地でのみ建築可能" };
  if (hs.rentUnpaid) return { ok: false, reason: "家賃が滞納中" };

  const house = window.HOUSING_HOUSES && window.HOUSING_HOUSES[houseId];
  if (!house) return { ok: false, reason: "存在しない住宅プラン" };

  if (hs.houseType === houseId) {
    return { ok: false, reason: "すでに建築済み" };
  }

  // お金チェック
  const goldCost = (house.cost && house.cost.gold) || 0;
  if (typeof money === "number" && money < goldCost) {
    return { ok: false, reason: `所持金不足（必要: ${goldCost}G）` };
  }

  // 素材チェック
  const mats = (house.cost && house.cost.materials) || {};
  for (const matId of Object.keys(mats)) {
    const need = mats[matId] | 0;
    const have = (typeof getItemCountByMeta === "function") ? (getItemCountByMeta(matId) || 0) : 0;
    if (have < need) {
      let matName = matId;
      if (typeof getItemName === "function") {
        matName = getItemName(matId) || matId;
      }
      return { ok: false, reason: `${matName}不足（所持: ${have}/${need}）` };
    }
  }

  return { ok: true };
};

/**
 * 住宅を建築・改築する処理
 */
window.buildHouse = function(houseId) {
  const check = window.canBuildHouse(houseId);
  if (!check.ok) {
    if (typeof appendLog === "function") {
      appendLog(`[建築] ${check.reason}`);
    }
    return false;
  }

  const hs = (typeof getHousingStateSafe === "function") ? getHousingStateSafe() : (window.housingState || {});
  const house = window.HOUSING_HOUSES[houseId];

  // お金消費
  const goldCost = (house.cost && house.cost.gold) || 0;
  if (typeof money === "number") {
    money -= goldCost;
  }

  // 素材消費
  const mats = (house.cost && house.cost.materials) || {};
  for (const matId of Object.keys(mats)) {
    const need = mats[matId] | 0;
    if (need > 0 && typeof removeItemByMeta === "function") {
      removeItemByMeta(matId, need);
    }
  }

  const isRemodel = !!hs.houseType;
  hs.houseType = houseId;
  hs.hasBase = true;

  // グリッド配列の動的リサイズ（既存の家具を保持したままリサイズ）
  if (typeof syncHousingGridToHouseSize === "function") {
    syncHousingGridToHouseSize("suburbLand", house.width, house.height);
  }

  if (typeof appendLog === "function") {
    const actionName = isRemodel ? "改築" : "建築";
    appendLog(`[建築] 「${house.name}」を${actionName}した！（費用 ${goldCost}G と素材を消費）`);
  }

  if (typeof refreshHousingFromState === "function") {
    try { refreshHousingFromState(); } catch (e) {}
  }
  if (typeof updateDisplay === "function") {
    try { updateDisplay(); } catch (e) {}
  }
  return true;
};

/**
 * 將来、ゲーム起動／ロード時に呼ばれて、
 * 市民権フラグに応じてUI側を更新するためのヘルパ。
 * （現状は initJobPetRebirthUI の最後で refreshHousingStatusAndTab を直接叩いているので、
 *  必須ではないが、保存データ読み込み直後に呼びたい場合などに使える）
 */
window.refreshHousingFromState = function() {
  if (typeof refreshHousingStatusAndTab === "function") {
    try { refreshHousingStatusAndTab(); } catch (e) {}
  }
  // タブの表示状態もフラグから再反映しておく
  if (typeof updateHousingWarehouseTabs === "function") {
    try { updateHousingWarehouseTabs(); } catch (e) {}
  }

  // 拠点UI側で土地・家賃ステータスを描画したい場合があるので、
  // ここで必要に応じて game-ui 側のレンダリング関数も呼べるようにしておく想定。
  if (typeof renderHousingLandStatus === "function") {
    try { renderHousingLandStatus(); } catch (e) {}
  }
};