// guild.js
// ギルドシステム：データ定義＋状態＋ロジック

console.log("guild.js start (core)");

// =======================
// プレイヤー側のギルド状態
// =======================

// 所属ギルドID（1つだけ）：null / "warrior" / "mage" / ...
window.playerGuildId = window.playerGuildId || null;

// ギルドごとの名声
// 例: { warrior: 10, mage: 0, ... }
window.guildFame = window.guildFame || {};

// ギルド依頼進行（戦闘コア側でも使う）
// 例:
//  warrior_kill_30_phys: { count: 12, done: false, rewardTaken: false, accepted: false }
//  battle_boss_1:        { count: 1,  done: true,  rewardTaken: true,  accepted: true  }
window.guildQuestProgress = window.guildQuestProgress || {};

// 市民権フラグ（どこか1ギルドの特別依頼をクリアしたら true）
window.citizenshipUnlocked = window.citizenshipUnlocked || false;

// =======================
// 名声・ランク定義
// =======================

// ギルドごとの名声ランク定義
// 名声がこの値以上でランク到達、の境界
const GUILD_RANK_THRESHOLDS = [
  { id: 0, name: "無名",   fame: 0 },
  { id: 1, name: "新人",   fame: 50 },
  { id: 2, name: "一人前", fame: 100 },
  { id: 3, name: "熟練",   fame: 200 },
  { id: 4, name: "看板",   fame: 350 },
  { id: 5, name: "英雄",   fame: 500 }
];

// 特別依頼ID一覧（市民権チェック用）
const GUILD_SPECIAL_QUEST_IDS = [
  "warrior_special_citizen",
  "mage_special_citizen",
  "tamer_special_citizen",
  "smith_special_citizen",
  "alch_special_citizen",
  "cooking_special_citizen",
  "gather_special_citizen",
  "food_special_citizen"
];

// =======================
// ギルドマスタ
// =======================

const GUILDS = {
  warrior: {
    id: "warrior",
    name: "戦士ギルド",
    type: "battle",
    desc: "前衛戦士たちが所属するギルド。物理攻撃や耐久面の支援に長けている。",
    detail: "近接戦闘の依頼や、ボス討伐の推薦状を主に扱う。",
    // ランクボーナスのみを表示
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "所属中、ランク×2%分だけ物理スキルダメージが増加する（最大+10%）。"
      }
    ]
  },
  mage: {
    id: "mage",
    name: "魔法ギルド",
    type: "battle",
    desc: "魔法使い達が集うギルド。新しい魔法やMP関連の支援を行う。",
    detail: "魔法研究と危険な魔力調査を担当する。",
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "所属中、ランク×2%分だけ魔法スキルダメージが増加する（最大+10%）。"
      }
    ]
  },
  tamer: {
    id: "tamer",
    name: "動物使いギルド",
    type: "battle",
    desc: "ペットと共に戦う者たちのギルド。ペット育成と支援が中心。",
    detail: "希少な魔獣の調査や保護依頼も多い。",
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "所属中、ランク×2%分だけペットの与ダメージが増加する（最大+10%）。"
      }
    ]
  },
  smith: {
    id: "smith",
    name: "鍛冶ギルド",
    type: "craft",
    desc: "武器や防具の制作・強化を担うギルド。装備の性能を引き出すプロ集団。",
    detail: "高品質装備や強化技術の研究が盛ん。",
    // 鍛冶ギルドは現状ランクボーナス実装なし → 説明だけ残す
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "将来的に、鍛冶関連のランクボーナスや専用依頼が追加される予定。"
      }
    ]
  },
  alchemist: {
    id: "alchemist",
    name: "錬金ギルド",
    type: "craft",
    desc: "ポーションや爆弾などの道具を扱う錬金術師たちのギルド。",
    detail: "薬品調合から危険な実験まで、少し物騒な仕事が多い。",
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "将来的に、錬金関連のランクボーナスや専用依頼が追加される予定。"
      }
    ]
  },
  cooking: {
    id: "cooking",
    name: "料理ギルド",
    type: "craft",
    desc: "料理人たちが所属するギルド。強力な料理バフを生み出す。",
    detail: "パーティ用の大皿料理から珍味まで幅広く扱う。",
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "将来的に、料理関連のランクボーナスや専用依頼が追加される予定。"
      }
    ]
  },
  gather: {
    id: "gather",
    name: "採取ギルド",
    type: "gather",
    desc: "木・鉱石・布・皮・水など、基本素材の採取に特化したギルド。",
    detail: "採取拠点の管理や、素材の品質管理も担当。",
    // ランク×2% の +1個抽選ボーナスのみ
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "所属中、通常素材採取時の+1個ボーナス抽選がランク×2%分だけ増加する（最大+10%）。"
      }
    ]
  },
  food: {
    id: "food",
    name: "食材ギルド",
    type: "gather",
    desc: "草・畑・釣り・狩猟など、料理素材に特化した採取ギルド。",
    detail: "季節限定食材や希少な香辛料の確保も任務のひとつ。",
    perks: [
      {
        rank: 1,
        fame: 10,
        summary: "所属中、料理素材採取時の+1個ボーナス抽選がランク×2%分だけ増加する（最大+10%）。"
      }
    ]
  }
};

// 表示順
const GUILD_ORDER = [
  "warrior",
  "mage",
  "tamer",
  "smith",
  "alchemist",
  "cooking",
  "gather",
  "food"
];

// =======================
// 食材ギルド用クエスト設定（仕様は変えず、IDと目標値だけテーブル化）
// =======================

const FOOD_QUEST_CONFIG = {
  total: [
    { id: "food_mat",     target: 70 },
    { id: "food_mat_150", target: 150 },
    // 特別依頼: 料理素材300個（定義上の desc/ヒントはそのまま）
    { id: "food_special_citizen", target: 300 }
  ],
  byMode: {
    hunt: [
      { id: "food_hunt_t1_30", target: 30 },
      { id: "food_hunt_t1_50", target: 50 }
    ],
    fish: [
      { id: "food_fish_t1_30", target: 30 },
      { id: "food_fish_t1_50", target: 50 }
    ],
    farm: [
      { id: "food_farm_t1_30", target: 30 },
      { id: "food_farm_t1_50", target: 50 }
    ]
  },
  rare: [
    { id: "food_rare", target: 1 }
  ]
};

function applyQuestConfig(configList, increment) {
  if (!Array.isArray(configList) || increment <= 0) return;
  configList.forEach(q => {
    updateQuestProgress(q.id, increment, q.target);
  });
}

// =======================
// 名声・ランク計算
// =======================

function getGuildFame(guildId) {
  return window.guildFame[guildId] || 0;
}

function getGuildRankInfo(fame) {
  let current = GUILD_RANK_THRESHOLDS[0];
  for (const r of GUILD_RANK_THRESHOLDS) {
    if (fame >= r.fame) current = r;
  }
  return current;
}

function getNextRankInfo(fame) {
  for (const r of GUILD_RANK_THRESHOLDS) {
    if (fame < r.fame) return r;
  }
  return null;
}

// 名声加算（今は内部用・クエスト達成時に使う）
function addGuildFame(guildId, amount) {
  if (!GUILDS[guildId]) return;
  const prev = getGuildFame(guildId);
  const next = Math.max(0, prev + amount);
  window.guildFame[guildId] = next;

  const prevRank = getGuildRankInfo(prev).id;
  const newRank  = getGuildRankInfo(next).id;
  if (newRank > prevRank && typeof appendLog === "function") {
    appendLog(`${GUILDS[guildId].name} での名声が上がり、「${getGuildRankInfo(next).name}」になった！`);
  }

  if (typeof renderGuildHeader === "function") {
    renderGuildHeader();
  }
  if (typeof renderGuildRewards === "function") {
    renderGuildRewards();
  }
}

// =======================
// ギルドパーク用ボーナス取得ヘルパー
// =======================

// 戦士: 物理攻撃力 +2%×ランク
// 魔法: 魔法攻撃力 +2%×ランク
// 動物使い: ペット攻撃力 +2%×ランク
function getGuildBattleBonus() {
  const result = { phys: 0, magic: 0, pet: 0 };
  const guildId = window.playerGuildId;
  if (!guildId) return result;

  const fame = getGuildFame(guildId);
  const rankInfo = getGuildRankInfo(fame);
  const rank = rankInfo ? rankInfo.id : 0;
  if (rank <= 0) return result;

  const perRank = 0.02; // 2%

  if (guildId === "warrior") {
    result.phys = rank * perRank;
  } else if (guildId === "mage") {
    result.magic = rank * perRank;
  } else if (guildId === "tamer") {
    result.pet = rank * perRank;
  }

  return result;
}

// 採取/食材ギルド: 既存の「＋1個抽選」とは別枠で、ランク毎に+2%の＋1抽選
function getGuildGatherExtraBonusChance() {
  const guildId = window.playerGuildId;
  if (!guildId) return 0;

  if (guildId !== "gather" && guildId !== "food") return 0;

  const fame = getGuildFame(guildId);
  const rankInfo = getGuildRankInfo(fame);
  const rank = rankInfo ? rankInfo.id : 0;
  if (rank <= 0) return 0;

  const perRank = 0.02; // 2%
  return rank * perRank;
}

// =======================
// 共通ヘルパー
// =======================

function updateQuestProgress(id, increment, target) {
  if (!id || !increment) return;
  const raw = window.guildQuestProgress[id] || {};

  // 受注制: accepted が true の依頼のみ進行させる
  if (!raw.accepted) {
    return;
  }

  const count = (raw.count || 0) + increment;
  const done = count >= target;
  window.guildQuestProgress[id] = {
    ...raw,
    count,
    done: done || raw.done,
    rewardTaken: !!raw.rewardTaken,
    accepted: true
  };
}

// ★修正: 市民権フラグはここでは立てず、特別依頼の報酬受取時（guild2.js）にのみ立てる
function checkCitizenshipUnlocked() {
  // 以前はここで window.citizenshipUnlocked = true を立てていたが、
  // 条件達成時点では市民権は未獲得なので、フラグ更新は行わない。
  // ただし将来のデバッグ用途などのために、達成済みかどうかの判定自体は残しておく。
  for (const qid of GUILD_SPECIAL_QUEST_IDS) {
    const q = window.guildQuestProgress[qid];
    if (q && q.done) {
      // ここでは何もしない（報酬受取時に onCitizenshipUnlockedFromGuild 経由でフラグ更新）
      break;
    }
  }
}

function refreshGuildQuestUIIfNeeded() {
  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// 任意の依頼を「受注状態」にするヘルパー（UIから呼ぶ）
function acceptGuildQuest(questId) {
  if (!questId) return;
  const raw = window.guildQuestProgress[questId] || {};
  window.guildQuestProgress[questId] = {
    ...raw,
    accepted: true,
    count: raw.count || 0,
    done: !!raw.done,
    rewardTaken: !!raw.rewardTaken
  };

  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// =======================
// ギルド用進捗ヘルパー（戦闘・クラフト・採取から呼ばれる）
// =======================

// 戦闘用：物理／魔法／ペット撃破＋ボス撃破＋エリア別討伐
// params 例: { by: "phys" | "magic" | "pet" | "other", isBoss: bool, bossId?: string, tier?: number, area?: string }
function onEnemyKilledForGuild(params) {
  if (!params) return;
  const by = params.by;
  const isBoss = !!params.isBoss;
  const bossId = params.bossId || null;
  const area = params.area || null; // "field" | "forest" など
  const tier = params.tier || 1;    // 洞窟T3判定など

  const currentGuildId = window.playerGuildId;
  const fame = currentGuildId ? getGuildFame(currentGuildId) : 0;
  const rankInfo = getGuildRankInfo(fame);
  const rank = rankInfo ? rankInfo.id : 0;
  const canDoForest = rank >= 1;

  // 戦闘ギルド共通：草原100体（手段不問）
  if (area === "field") {
    updateQuestProgress("field_kill_100_any", 1, 100);
  }

  // 戦闘ギルド共通：森100体（ランク1以上で進行）
  if (area === "forest" && canDoForest) {
    updateQuestProgress("forest_kill_100_any", 1, 100);
  }

  // 各ギルド30体撃破＋森50体系（ランク1以上）
  if (by === "phys") {
    updateQuestProgress("warrior_kill_30_phys", 1, 30);
    if (area === "forest" && canDoForest) {
      updateQuestProgress("forest_kill_50_phys", 1, 50);
    }
    // 戦士ギルド特別依頼：洞窟T3を物理で撃破
    if (tier === 3) {
      updateQuestProgress("warrior_special_citizen", 1, 40);
    }
  }

  if (by === "magic") {
    updateQuestProgress("mage_kill_30_magic", 1, 30);
    if (area === "forest" && canDoForest) {
      updateQuestProgress("forest_kill_50_magic", 1, 50);
    }
    // 魔法ギルド特別依頼：洞窟T3を魔法で撃破
    if (tier === 3) {
      updateQuestProgress("mage_special_citizen", 1, 40);
    }
  }

  if (by === "pet") {
    updateQuestProgress("tamer_kill_30_pet", 1, 30);
    if (area === "forest" && canDoForest) {
      updateQuestProgress("forest_kill_50_pet", 1, 50);
    }
    // 動物使いギルド特別依頼：洞窟T3をペットで撃破
    if (tier === 3) {
      updateQuestProgress("tamer_special_citizen", 1, 40);
    }
  }

  // 草原ボス：スライムキングのみカウント
  if (isBoss && bossId === "slime_king") {
    updateQuestProgress("battle_boss_1", 1, 1);
  }

  // 森ボス（ランク1以上で進行）
  if (isBoss && bossId === "forest_boss" && canDoForest) {
    updateQuestProgress("forest_boss_1", 1, 1);
  }

  // 特別依頼の達成状況チェック（フラグはここでは立てない）
  checkCitizenshipUnlocked();

  // ギルドタブ開いていたら更新
  refreshGuildQuestUIIfNeeded();
}

// ★ 転生時に呼ばれる想定のヘルパー
// params: { jobId: number }
function onRebirthForGuild(params) {
  if (!params) return;
  const jobId = params.jobId;

  let questId = null;
  if (jobId === 0) {
    questId = "warrior_rebirth_1";
  } else if (jobId === 1) {
    questId = "mage_rebirth_1";
  } else if (jobId === 2) {
    questId = "tamer_rebirth_1";
  }

  if (!questId) return;

  updateQuestProgress(questId, 1, 1);

  checkCitizenshipUnlocked();

  refreshGuildQuestUIIfNeeded();
}

// バフ料理依頼用：バフ付き料理／飲み物を食べたときに呼ぶ
function onBuffFoodEatenForGuild() {
  updateQuestProgress("cooking_buff", 1, 2);
  updateQuestProgress("cooking_use_food_or_drink", 1, 5);

  checkCitizenshipUnlocked();

  refreshGuildQuestUIIfNeeded();
}

// 錬金ギルド用：ポーション／道具を使用したときに呼ぶ
// params: { kind: "potion" | "tool" }
function onAlchConsumableUsedForGuild(params) {
  // T1〜帯共通使用
  updateQuestProgress("alch_use_potion_or_tool", 1, 5);

  // T2専用使用（T2ポーション／T2道具使用時のみ別フックから呼ぶ想定なら、
  // そのフック側でこのIDを叩く形でもOK。ここでは仕様を変えないので既存のまま。）
  // ※ 仕様は変えたくないので、今は追加ロジックをここには入れていない。

  checkCitizenshipUnlocked();

  refreshGuildQuestUIIfNeeded();
}

// 装備強化用：鍛冶ギルド「smith_enhance」
function onEquipEnhancedForGuild(params) {
  // 既存T1〜帯（2回強化）
  updateQuestProgress("smith_enhance", 1, 2);

  // T2専用の強化回数を別で数えたい場合は、
  // T2装備強化時だけ別フラグから `updateQuestProgress("smith_enhance_t2", 1, 3)` を呼ぶ想定。

  checkCitizenshipUnlocked();

  refreshGuildQuestUIIfNeeded();
}

// クラフト用：鍛冶／錬金／料理ギルドの依頼進行
// params: { category, recipeId, tier }
function onCraftCompletedForGuild(params) {
  if (!params) return;
  const category = params.category;
  const tier = params.tier || 1; // T1/T2/T3 判定用

  // 鍛冶ギルド: T1武器/防具
  if (tier === 1) {
    if (category === "weapon") {
      updateQuestProgress("smith_craft_weapon_t1", 1, 5);
      updateQuestProgress("smith_craft_t1_gear_20", 1, 20);
    } else if (category === "armor") {
      updateQuestProgress("smith_craft_armor_t1", 1, 5);
      updateQuestProgress("smith_craft_t1_gear_20", 1, 20);
    }
  }

  // 鍛冶ギルド: T2装備（個別2個＋合計10個）
  if ((category === "weapon" || category === "armor") && tier === 2) {
    if (category === "weapon") {
      updateQuestProgress("smith_craft_weapon_t2", 1, 2);
    } else if (category === "armor") {
      updateQuestProgress("smith_craft_armor_t2", 1, 2);
    }
    updateQuestProgress("smith_craft_t2_gear_10", 1, 10);
  }

  // 鍛冶ギルド特別依頼：T3武器・防具クラフト
  if ((category === "weapon" || category === "armor") && tier === 3) {
    updateQuestProgress("smith_special_citizen", 1, 12);
  }

  // 錬金ギルド: T1ポーション/爆弾/合計
  if (tier === 1) {
    if (category === "potion") {
      updateQuestProgress("alch_craft_potion_t1", 1, 5);
      updateQuestProgress("alch_craft_mix", 1, 10);
    } else if (category === "tool") {
      updateQuestProgress("alch_craft_bomb_t1", 1, 3);
      updateQuestProgress("alch_craft_mix", 1, 10);
    }
  } else if (tier === 2) {
    // 錬金ギルド: T2ポーション/道具/合計10個
    if (category === "potion") {
      updateQuestProgress("alch_craft_t2_potion", 1, 3);
      updateQuestProgress("alch_mass_t2_supply", 1, 10);
    } else if (category === "tool") {
      updateQuestProgress("alch_craft_t2_tool", 1, 3);
      updateQuestProgress("alch_mass_t2_supply", 1, 10);
    }
  }

  // 錬金特別依頼：T3ポーション／爆弾合計15個
  if ((category === "potion" || category === "tool") && tier === 3) {
    updateQuestProgress("alch_special_citizen", 1, 15);
  }

  // 料理ギルド: T1料理/飲み物
  if (tier === 1) {
    if (category === "food") {
      updateQuestProgress("cooking_basic_food_t1", 1, 3);
      updateQuestProgress("cooking_variety", 1, 5);
    } else if (category === "drink") {
      updateQuestProgress("cooking_basic_drink_t1", 1, 3);
      updateQuestProgress("cooking_variety", 1, 5);
    }
  } else if (tier === 2) {
    // 料理ギルド: T2料理/飲み物個別＋合計10
    if (category === "food") {
      updateQuestProgress("cooking_t2_food", 1, 3);
      updateQuestProgress("cooking_t2_any", 1, 10);
    } else if (category === "drink") {
      updateQuestProgress("cooking_t2_drink", 1, 3);
      updateQuestProgress("cooking_t2_any", 1, 10);
    }
  }

  // T1/T2 問わず、異なる料理/飲み物5回（回数ベース）
  if (category === "food" || category === "drink") {
    // 既に T1 部分で cooking_variety を増やしているが、
    // 仕様変更なし優先でそのまま維持（T2時はここでは追加カウントしていない）。
  }

  // 料理特別依頼：T3料理/飲み物15品
  if ((category === "food" || category === "drink") && tier === 3) {
    updateQuestProgress("cooking_special_citizen", 1, 15);
  }

  checkCitizenshipUnlocked();

  refreshGuildQuestUIIfNeeded();
}

// 採取用：採取ギルド＆食材ギルドの依頼進行
// params: { kind: "gather" | "food", total?: number, t1?: number, t2?: number, t3?: number, rare?: boolean, target?: string, mode?: string }
function onGatherCompletedForGuild(params) {
  if (!params) return;
  const kind = params.kind;

  // 採取ギルド
  if (kind === "gather") {
    const t1 = params.t1 || 0;
    const t2 = params.t2 || 0;
    const t3 = params.t3 || 0;
    const total = params.total || (t1 + t2 + t3);
    const target = params.target || null; // "wood" / "ore" / "herb" / "cloth" / "leather" / "water"

    // --- 任意T1素材系 ---
    if (t1 > 0) {
      updateQuestProgress("gather_t1_any_30", t1, 30);
    }

    // --- T2既存＋任意T2大量 ---
    if (t2 > 0) {
      updateQuestProgress("gather_basic", t2, 50);
      updateQuestProgress("gather_t2_any_100", t2, 100);
    }

    // --- T3素材系（通常＋市民権） ---
    if (t3 > 0) {
      updateQuestProgress("gather_t3", t3, 5);
      updateQuestProgress("gather_special_citizen", t3, 60);
    }

    // --- 種類別（T1/T2問わず） ---
    if (target && (t1 > 0 || t2 > 0)) {
      if (target === "wood") {
        updateQuestProgress("gather_t1_wood_30", t1, 30);
        updateQuestProgress("gather_t2_wood_30", t2, 30);
      } else if (target === "ore") {
        updateQuestProgress("gather_t1_ore_30", t1, 30);
        updateQuestProgress("gather_t2_ore_30", t2, 30);
      } else if (target === "herb") {
        updateQuestProgress("gather_t1_herb_30", t1, 30);
        updateQuestProgress("gather_t2_herb_30", t2, 30);
      } else if (target === "cloth") {
        updateQuestProgress("gather_t1_cloth_30", t1, 30);
        updateQuestProgress("gather_t2_cloth_30", t2, 30);
      } else if (target === "leather") {
        updateQuestProgress("gather_t1_leather_30", t1, 30);
        updateQuestProgress("gather_t2_leather_30", t2, 30);
      } else if (target === "water") {
        updateQuestProgress("gather_t1_water_30", t1, 30);
        updateQuestProgress("gather_t2_water_30", t2, 30);
      }

      // 仕様上は使っていないが、total を任意素材系に流用するならここで扱う余地あり
      // （現状は T1/T2 を個別に見ているので total は参照しない）
    }
  }

  // 食材ギルド: total / rare / モード別
  if (kind === "food") {
    const total = params.total || 0;
    const isRare = !!params.rare;
    const mode = params.mode || null; // "hunt" / "fish" / "farm"

    if (total > 0) {
      // 合計食材系（70 / 150 / 300）
      applyQuestConfig(FOOD_QUEST_CONFIG.total, total);

      // 狩猟／釣り／農園モード別
      if (mode && FOOD_QUEST_CONFIG.byMode[mode]) {
        applyQuestConfig(FOOD_QUEST_CONFIG.byMode[mode], total);
      }
    }

    if (isRare) {
      applyQuestConfig(FOOD_QUEST_CONFIG.rare, 1);
    }
  }

  checkCitizenshipUnlocked();

  refreshGuildQuestUIIfNeeded();
}

// ギルド加入処理
function joinGuild(guildId) {
  const g = GUILDS[guildId];
  if (!g) return;

  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中はギルドの手続きができない！");
    }
    return;
  }

  if (window.playerGuildId && window.playerGuildId !== guildId) {
    if (typeof appendLog === "function") {
      appendLog(`${GUILDS[window.playerGuildId].name} から ${g.name} へ所属を変更した。`);
    }
  } else if (!window.playerGuildId) {
    if (typeof appendLog === "function") {
      appendLog(`${g.name} に所属した！`);
    }
  }

  window.playerGuildId = guildId;
  if (!window.guildFame[guildId]) {
    window.guildFame[guildId] = 0;
  }

  if (typeof renderGuildUI === "function") {
    renderGuildUI();
  }
}

// =======================
// ギルド名取得ヘルパー（正式版）
// =======================

if (typeof window.getGuildNameById === "undefined") {
  window.getGuildNameById = function (gid) {
    if (!gid) return null;
    if (!GUILDS || !GUILDS[gid]) return null;
    const g = GUILDS[gid];
    return g.name || null;
  };
}