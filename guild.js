// guild.js
// ギルドシステム：データ定義＋状態＋UI描画

console.log("guild.js start");

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
//  warrior_kill_30_phys: { count: 12, done: false, rewardTaken: false }
//  battle_boss_1:        { count: 1,  done: true,  rewardTaken: true  }
window.guildQuestProgress = window.guildQuestProgress || {};

// ギルドごとの名声ランク定義
// 名声がこの値以上でランク到達、の境界
const GUILD_RANK_THRESHOLDS = [
  { id: 0, name: "無名",   fame: 0 },
  { id: 1, name: "新人",   fame: 10 },
  { id: 2, name: "一人前", fame: 30 },
  { id: 3, name: "熟練",   fame: 70 },
  { id: 4, name: "看板",   fame: 150 },
  { id: 5, name: "英雄",   fame: 300 }
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

  renderGuildHeader();
  renderGuildRewards();
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
// ギルド用進捗ヘルパー（戦闘・クラフト・採取から呼ばれる）
// =======================

// 戦闘用：物理／魔法／ペット撃破＋ボス撃破
function onEnemyKilledForGuild(params) {
  if (!params) return;
  const by = params.by;
  const isBoss = !!params.isBoss;

  // A依頼: 各ギルド30体撃破
  if (by === "phys") {
    const id = "warrior_kill_30_phys";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 30;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }
  if (by === "magic") {
    const id = "mage_kill_30_magic";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 30;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }
  if (by === "pet") {
    const id = "tamer_kill_30_pet";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 30;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }

  // B依頼: ボス撃破（手段問わず）
  if (isBoss) {
    const id = "battle_boss_1";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 1;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }

  // ギルドタブ開いていたら更新
  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// バフ料理B依頼用：バフ付き料理／飲み物を食べたときに呼ぶ（game-core-5.js 側から）
function onBuffFoodEatenForGuild() {
  const id = "cooking_buff";
  const raw = window.guildQuestProgress[id] || {};
  const count = (raw.count || 0) + 1;
  const done = count >= 2;
  window.guildQuestProgress[id] = {
    ...raw,
    count,
    done: done || raw.done,
    rewardTaken: !!raw.rewardTaken
  };

  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// 装備強化用：鍛冶ギルド「smith_enhance」
// game-core-7.js の enhanceWeapon / enhanceArmor 成功・失敗後から呼ばれる想定
function onEquipEnhancedForGuild(params) {
  const id = "smith_enhance";
  const raw = window.guildQuestProgress[id] || {};
  const count = (raw.count || 0) + 1;
  const done = count >= 2;
  window.guildQuestProgress[id] = {
    ...raw,
    count,
    done: done || raw.done,
    rewardTaken: !!raw.rewardTaken
  };

  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// クラフト用：鍛冶／錬金／料理ギルドの依頼進行
function onCraftCompletedForGuild(params) {
  if (!params) return;
  const category = params.category;
  const recipeId = params.recipeId;

  // 鍛冶ギルド: 武器3本クラフト（武器・防具クラフトどちらも対象）
  if (category === "weapon" || category === "armor") {
    const id = "smith_craft_weapon";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 3;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }

  // 錬金ギルド: ポーション5回クラフト / 爆弾3個クラフト
  if (category === "potion") {
    const id = "alch_craft_potion";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 5;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }
  if (category === "tool") {
    const id = "alch_craft_bomb";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 3;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }

  // 料理ギルド: 料理を3回作る（食べ物も飲み物もまとめてカウント）
  if (category === "food" || category === "drink") {
    const id = "cooking_basic";
    const raw = window.guildQuestProgress[id] || {};
    const count = (raw.count || 0) + 1;
    const done = count >= 3;
    window.guildQuestProgress[id] = {
      ...raw,
      count,
      done: done || raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }

  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// 採取用：採取ギルド＆食材ギルドの依頼進行
// game-core-4.js の gather 内から呼ばれる想定
// params: { kind: "gather" | "food", total: number, t3?: number, rare?: boolean }
function onGatherCompletedForGuild(params) {
  if (!params) return;
  const kind = params.kind;

  // 採取ギルド: 素材集めの手伝い（gather_basic）＝通常素材 total 個
  //              高品質素材の納品（gather_t3）＝ T3 素材 t3 個
  if (kind === "gather") {
    const total = params.total || 0;
    const t3    = params.t3 || 0;

    if (total > 0) {
      const id = "gather_basic";
      const raw = window.guildQuestProgress[id] || {};
      const count = (raw.count || 0) + total;
      const done = count >= 50;
      window.guildQuestProgress[id] = {
        ...raw,
        count,
        done: done || raw.done,
        rewardTaken: !!raw.rewardTaken
      };
    }

    if (t3 > 0) {
      const id = "gather_t3";
      const raw = window.guildQuestProgress[id] || {};
      const count = (raw.count || 0) + t3;
      const done = count >= 5;
      window.guildQuestProgress[id] = {
        ...raw,
        count,
        done: done || raw.done,
        rewardTaken: !!raw.rewardTaken
      };
    }
  }

  // 食材ギルド: food_mat（料理素材 total 個）／food_rare（レア食材1個）
  if (kind === "food") {
    const total = params.total || 0;
    const isRare = !!params.rare;

    if (total > 0) {
      const id = "food_mat";
      const raw = window.guildQuestProgress[id] || {};
      const count = (raw.count || 0) + total;
      const done = count >= 30;
      window.guildQuestProgress[id] = {
        ...raw,
        count,
        done: done || raw.done,
        rewardTaken: !!raw.rewardTaken
      };
    }

    // レア食材は1回入手すればOK、複数回入手しても count を増やすだけで done は1個で到達
    if (isRare) {
      const id = "food_rare";
      const raw = window.guildQuestProgress[id] || {};
      const count = (raw.count || 0) + 1;
      const done = count >= 1;
      window.guildQuestProgress[id] = {
        ...raw,
        count,
        done: done || raw.done,
        rewardTaken: !!raw.rewardTaken
      };
    }
  }

  if (typeof renderGuildQuests === "function") {
    renderGuildQuests();
  }
}

// =======================
// UI: ヘッダ
// =======================

function renderGuildHeader() {
  const nameEl  = document.getElementById("guildCurrentName");
  const fameEl  = document.getElementById("guildCurrentFame");
  const rankEl  = document.getElementById("guildCurrentRank");

  if (!nameEl || !fameEl || !rankEl) return;

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    nameEl.textContent = "未所属";
    fameEl.textContent = "0";
    rankEl.textContent = "-";
    return;
  }

  const g    = GUILDS[window.playerGuildId];
  const fame = getGuildFame(g.id);
  const r    = getGuildRankInfo(fame);

  nameEl.textContent = g.name;
  fameEl.textContent = String(fame);
  rankEl.textContent = r.name;
}

// =======================
// UI: ギルド一覧
// =======================

function renderGuildList() {
  const container = document.getElementById("guildListContainer");
  if (!container) return;
  container.innerHTML = "";

  GUILD_ORDER.forEach(id => {
    const g = GUILDS[id];
    if (!g) return;

    const fame = getGuildFame(id);
    const rank = getGuildRankInfo(fame);

    const box = document.createElement("div");
    box.className = "guild-list-item";
    box.style.border = "1px solid #444";
    box.style.padding = "4px";
    box.style.marginBottom = "4px";
    box.style.background = "#181818";

    const title = document.createElement("div");
    title.style.display = "flex";
    title.style.justifyContent = "space-between";
    title.style.alignItems = "center";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${g.name}`;
    nameSpan.style.fontWeight = "bold";

    const typeSpan = document.createElement("span");
    typeSpan.style.fontSize = "11px";
    typeSpan.style.color = "#ccc";
    if (g.type === "battle") typeSpan.textContent = "[戦闘系]";
    else if (g.type === "craft") typeSpan.textContent = "[クラフト系]";
    else if (g.type === "gather") typeSpan.textContent = "[採取系]";
    else typeSpan.textContent = "[その他]";

    title.appendChild(nameSpan);
    title.appendChild(typeSpan);
    box.appendChild(title);

    const desc = document.createElement("div");
    desc.textContent = g.desc;
    desc.style.fontSize = "12px";
    desc.style.marginTop = "2px";
    box.appendChild(desc);

    if (g.detail) {
      const detail = document.createElement("div");
      detail.textContent = g.detail;
      detail.style.fontSize = "11px";
      detail.style.color = "#ccc";
      box.appendChild(detail);
    }

    const statusRow = document.createElement("div");
    statusRow.style.display = "flex";
    statusRow.style.alignItems = "center";
    statusRow.style.justifyContent = "space-between";
    statusRow.style.marginTop = "4px";

    const fameSpan = document.createElement("span");
    fameSpan.style.fontSize = "11px";
    fameSpan.textContent = `名声: ${fame}（ランク: ${rank.name}）`;
    statusRow.appendChild(fameSpan);

    const btnArea = document.createElement("div");

    if (window.playerGuildId === id) {
      const joinedLabel = document.createElement("span");
      joinedLabel.textContent = "所属中";
      joinedLabel.style.fontSize = "11px";
      joinedLabel.style.color = "#8cf";
      btnArea.appendChild(joinedLabel);
    } else if (!window.playerGuildId) {
      const joinBtn = document.createElement("button");
      joinBtn.textContent = "このギルドに入る";
      joinBtn.style.fontSize = "11px";
      joinBtn.addEventListener("click", () => {
        joinGuild(id);
      });
      btnArea.appendChild(joinBtn);
    } else {
      const otherLabel = document.createElement("span");
      otherLabel.textContent = "別ギルド所属中";
      otherLabel.style.fontSize = "11px";
      otherLabel.style.color = "#aaa";
      btnArea.appendChild(otherLabel);
    }

    statusRow.appendChild(btnArea);
    box.appendChild(statusRow);

    const perksBox = document.createElement("div");
    perksBox.style.marginTop = "4px";
    perksBox.style.fontSize = "11px";
    perksBox.style.color = "#ccc";

    const perkTitle = document.createElement("div");
    perkTitle.textContent = "主な名声報酬（ランクボーナス）";
    perksBox.appendChild(perkTitle);

    g.perks.forEach(p => {
      const li = document.createElement("div");
      li.textContent = `・${p.summary}`;
      perksBox.appendChild(li);
    });

    box.appendChild(perksBox);

    container.appendChild(box);
  });
}

// =======================
// UI: 依頼タブ
// =======================

// ひとまずギルドごとに簡易依頼を定義
const GUILD_QUESTS = {
  warrior: [
    {
      id: "warrior_kill_30_phys",
      name: "A依頼: 物理撃破訓練",
      desc: "物理攻撃で敵を30体倒す。",
      fameReward: 10,
      hint: "通常攻撃や物理スキルでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "B依頼: ボス討伐試験",
      desc: "いずれかのエリアボスを1体倒す。",
      fameReward: 15,
      hint: "草原・森・洞窟など、どのボスでも1体倒せば達成。"
    }
  ],
  mage: [
    {
      id: "mage_kill_30_magic",
      name: "A依頼: 魔法撃破訓練",
      desc: "魔法で敵を30体倒す。",
      fameReward: 10,
      hint: "ファイアボルトやアイスランスなどでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "B依頼: ボス討伐試験",
      desc: "いずれかのエリアボスを1体倒す。",
      fameReward: 15,
      hint: "草原・森・洞窟など、どのボスでも1体倒せば達成。"
    }
  ],
  tamer: [
    {
      id: "tamer_kill_30_pet",
      name: "A依頼: ペット撃破訓練",
      desc: "ペットで敵を30体倒す。",
      fameReward: 10,
      hint: "ペットの攻撃やスキルでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "B依頼: ボス討伐試験",
      desc: "いずれかのエリアボスを1体倒す。",
      fameReward: 15,
      hint: "草原・森・洞窟など、どのボスでも1体倒せば達成。"
    }
  ],
  // 以下のクラフト／採取ギルドはプレースホルダから、今回で一部実装済みに
  smith: [
    {
      id: "smith_craft_weapon",
      name: "武器制作の依頼",
      desc: "武器を3本クラフトする。",
      fameReward: 8,
      hint: "クラフト導線。"
    },
    {
      id: "smith_enhance",
      name: "装備強化の試験",
      desc: "武器か防具を2回強化する。",
      fameReward: 10,
      hint: "強化システムへの誘導。"
    }
  ],
  alchemist: [
    {
      id: "alch_craft_potion",
      name: "ポーション調合の依頼",
      desc: "ポーションを5回クラフトする。",
      fameReward: 8,
      hint: "クラフト画面でポーションを作るだけで進む想定。"
    },
    {
      id: "alch_craft_bomb",
      name: "危険な実験",
      desc: "爆弾系の道具を3個クラフトする。",
      fameReward: 12,
      hint: "戦闘用道具クラフトの導線。"
    }
  ],
  cooking: [
    {
      id: "cooking_basic",
      name: "基本料理の習得",
      desc: "料理を3回作る。",
      fameReward: 8,
      hint: "料理クラフト導線。"
    },
    {
      id: "cooking_buff",
      name: "バフ料理の試食会",
      desc: "バフ付き料理を2回食べる。",
      fameReward: 10,
      hint: "フィールドでの料理活用を促す。"
    }
  ],
  gather: [
    {
      id: "gather_basic",
      name: "素材集めの手伝い",
      desc: "採取で素材を50個集める。",
      fameReward: 8,
      hint: "採取の基本。"
    },
    {
      id: "gather_t3",
      name: "高品質素材の納品",
      desc: "T3素材を5個集める。",
      fameReward: 12,
      hint: "高ティア狙いの動機付け。"
    }
  ],
  food: [
    {
      id: "food_mat",
      name: "食材の確保",
      desc: "料理用素材を30個集める。",
      fameReward: 8,
      hint: "草・釣り・狩猟などの利用を促す。"
    },
    {
      id: "food_rare",
      name: "珍味の発見",
      desc: "レア食材を1つ入手する。",
      fameReward: 15,
      hint: "将来のレア食材テーブルと連動。"
    }
  ]
};

// 進捗オブジェクトの形をそろえる
function getGuildQuestProg(id) {
  const raw = window.guildQuestProgress[id] || {};

  // カウント型依頼
  if (
    id === "warrior_kill_30_phys" ||
    id === "mage_kill_30_magic"   ||
    id === "tamer_kill_30_pet"    ||
    id === "battle_boss_1"        ||
    id === "smith_craft_weapon"   ||
    id === "smith_enhance"        || // ★ 鍛冶ギルド 強化依頼
    id === "alch_craft_potion"    ||
    id === "alch_craft_bomb"      ||
    id === "cooking_basic"        ||
    id === "cooking_buff"         || // ★ バフ料理依頼
    id === "gather_basic"         || // ★ 採取ギルド 素材50個
    id === "gather_t3"            || // ★ 採取ギルド T3素材5個
    id === "food_mat"             || // ★ 食材ギルド 素材30個
    id === "food_rare"            // ★ 食材ギルド レア食材1個
  ) {
    return {
      count: raw.count || 0,
      done: !!raw.done,
      rewardTaken: !!raw.rewardTaken
    };
  }

  // それ以外は従来どおり
  return {
    done: !!raw.done,
    note: raw.note || "",
    rewardTaken: !!raw.rewardTaken
  };
}

// 名声報酬受取処理（依頼タブから呼ぶ）
function claimGuildQuestReward(guildId, questDef) {
  if (!guildId || !questDef) return;
  const id = questDef.id;
  const prog = getGuildQuestProg(id);

  if (!prog.done) {
    if (typeof appendLog === "function") {
      appendLog("まだ依頼の条件を満たしていない。");
    }
    return;
  }
  if (prog.rewardTaken) {
    if (typeof appendLog === "function") {
      appendLog("この依頼の報酬はすでに受け取っている。");
    }
    return;
  }

  // 名声付与
  addGuildFame(guildId, questDef.fameReward);

  // フラグ更新
  const stored = window.guildQuestProgress[id] || {};
  stored.rewardTaken = true;
  window.guildQuestProgress[id] = stored;

  if (typeof appendLog === "function") {
    appendLog(`${GUILDS[guildId].name} の依頼「${questDef.name}」を達成し、名声を${questDef.fameReward}獲得した！`);
  }

  renderGuildQuests();
}

// この段階では A/B 以外は「内容一覧＋簡易報酬ボタン」に留める

function renderGuildQuests() {
  const listEl = document.getElementById("guildQuestList");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    const p = document.createElement("p");
    p.textContent = "ギルドに所属すると、専用の依頼を受けられます。";
    listEl.appendChild(p);
    return;
  }

  const guildId = window.playerGuildId;
  const quests = GUILD_QUESTS[guildId] || [];

  if (!quests.length) {
    const p = document.createElement("p");
    p.textContent = "このギルドにはまだ依頼が用意されていません。";
    listEl.appendChild(p);
    return;
  }

  quests.forEach(q => {
    const box = document.createElement("div");
    box.style.border = "1px solid #444";
    box.style.padding = "4px";
    box.style.marginBottom = "4px";
    box.style.background = "#151515";

    const title = document.createElement("div");
    title.textContent = q.name;
    title.style.fontWeight = "bold";
    box.appendChild(title);

    const desc = document.createElement("div");
    desc.textContent = q.desc;
    desc.style.fontSize = "11px";
    box.appendChild(desc);

    const fame = document.createElement("div");
    fame.textContent = `報酬: 名声 +${q.fameReward}`;
    fame.style.fontSize = "11px";
    fame.style.color = "#ccc";
    box.appendChild(fame);

    if (q.hint) {
      const hint = document.createElement("div");
      hint.textContent = `ヒント: ${q.hint}`;
      hint.style.fontSize = "11px";
      hint.style.color = "#888";
      box.appendChild(hint);
    }

    const prog = getGuildQuestProg(q.id);

    const status = document.createElement("div");
    status.style.fontSize = "11px";
    status.style.marginTop = "2px";

    // A/B 依頼＋クラフト系＋採取系の count / done を表示
    if (q.id === "warrior_kill_30_phys") {
      status.textContent = prog.done
        ? `状態: 完了（物理撃破 ${prog.count}/30）`
        : `状態: 進行中（物理撃破 ${prog.count}/30）`;
    } else if (q.id === "mage_kill_30_magic") {
      status.textContent = prog.done
        ? `状態: 完了（魔法撃破 ${prog.count}/30）`
        : `状態: 進行中（魔法撃破 ${prog.count}/30）`;
    } else if (q.id === "tamer_kill_30_pet") {
      status.textContent = prog.done
        ? `状態: 完了（ペット撃破 ${prog.count}/30）`
        : `状態: 進行中（ペット撃破 ${prog.count}/30）`;
    } else if (q.id === "battle_boss_1") {
      status.textContent = prog.done
        ? `状態: 完了（ボス討伐 ${prog.count}/1）`
        : `状態: 進行中（ボス討伐 ${prog.count}/1）`;
    } else if (q.id === "smith_craft_weapon") {
      status.textContent = prog.done
        ? `状態: 完了（クラフト ${prog.count}/3）`
        : `状態: 進行中（クラフト ${prog.count}/3）`;
    } else if (q.id === "smith_enhance") {
      status.textContent = prog.done
        ? `状態: 完了（強化 ${prog.count}/2）`
        : `状態: 進行中（強化 ${prog.count}/2）`;
    } else if (q.id === "alch_craft_potion") {
      status.textContent = prog.done
        ? `状態: 完了（ポーションクラフト ${prog.count}/5）`
        : `状態: 進行中（ポーションクラフト ${prog.count}/5）`;
    } else if (q.id === "alch_craft_bomb") {
      status.textContent = prog.done
        ? `状態: 完了（爆弾クラフト ${prog.count}/3）`
        : `状態: 進行中（爆弾クラフト ${prog.count}/3）`;
    } else if (q.id === "cooking_basic") {
      status.textContent = prog.done
        ? `状態: 完了（料理作成 ${prog.count}/3）`
        : `状態: 進行中（料理作成 ${prog.count}/3）`;
    } else if (q.id === "cooking_buff") { // バフ料理依頼の表示
      status.textContent = prog.done
        ? `状態: 完了（バフ料理 ${prog.count}/2）`
        : `状態: 進行中（バフ料理 ${prog.count}/2）`;
    } else if (q.id === "gather_basic") {
      status.textContent = prog.done
        ? `状態: 完了（採取素材 ${prog.count}/50）`
        : `状態: 進行中（採取素材 ${prog.count}/50）`;
    } else if (q.id === "gather_t3") {
      status.textContent = prog.done
        ? `状態: 完了（T3素材 ${prog.count}/5）`
        : `状態: 進行中（T3素材 ${prog.count}/5）`;
    } else if (q.id === "food_mat") {
      status.textContent = prog.done
        ? `状態: 完了（料理素材 ${prog.count}/30）`
        : `状態: 進行中（料理素材 ${prog.count}/30）`;
    } else if (q.id === "food_rare") {
      status.textContent = prog.done
        ? `状態: 完了（レア食材 ${prog.count}/1）`
        : `状態: 進行中（レア食材 ${prog.count}/1）`;
    } else {
      status.textContent = prog.done
        ? "状態: 完了"
        : "状態: 進行中（システム実装予定）";
    }
    box.appendChild(status);

    // 報酬ボタン
    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "4px";

    const rewardBtn = document.createElement("button");
    rewardBtn.style.fontSize = "11px";

    if (prog.rewardTaken) {
      rewardBtn.textContent = "報酬受取済み";
      rewardBtn.disabled = true;
    } else if (!prog.done) {
      rewardBtn.textContent = "未達成";
      rewardBtn.disabled = true;
    } else {
      rewardBtn.textContent = "報酬を受け取る";
      rewardBtn.disabled = false;
      rewardBtn.addEventListener("click", () => {
        claimGuildQuestReward(guildId, q);
      });
    }

    btnRow.appendChild(rewardBtn);
    box.appendChild(btnRow);

    listEl.appendChild(box);
  });
}

// =======================
// UI: 報酬・称号タブ
// =======================

function renderGuildRewards() {
  const listEl = document.getElementById("guildRewardList");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    const p = document.createElement("p");
    p.textContent = "ギルドに所属すると、名声に応じてランクボーナスが強化されます。";
    listEl.appendChild(p);
    return;
  }

  const guildId = window.playerGuildId;
  const g = GUILDS[guildId];
  const fame = getGuildFame(guildId);
  const currentRank = getGuildRankInfo(fame);

  const header = document.createElement("div");
  header.style.marginBottom = "4px";
  header.style.fontSize = "12px";
  header.textContent = `${g.name} の現在の名声: ${fame}（ランク: ${currentRank.name}）`;
  listEl.appendChild(header);

  const nextRank = getNextRankInfo(fame);
  if (nextRank) {
    const next = document.createElement("div");
    next.style.fontSize = "11px";
    next.style.color = "#ccc";
    next.textContent = `次のランク「${nextRank.name}」まで、あと ${nextRank.fame - fame} 名声。`;
    listEl.appendChild(next);
  } else {
    const max = document.createElement("div");
    max.style.fontSize = "11px";
    max.style.color = "#ccc";
    max.textContent = "すでに最高ランクに到達しています。";
    listEl.appendChild(max);
  }

  const table = document.createElement("table");
  table.className = "mat-table";
  table.style.marginTop = "4px";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["ランク", "必要名声", "効果要約", "状態"].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  g.perks.forEach(p => {
    const tr = document.createElement("tr");

    const rankTd = document.createElement("td");
    rankTd.textContent = `第${p.rank}段階`;
    tr.appendChild(rankTd);

    const fameTd = document.createElement("td");
    fameTd.textContent = `${p.fame}以上`;
    tr.appendChild(fameTd);

    const sumTd = document.createElement("td");
    sumTd.textContent = p.summary;
    tr.appendChild(sumTd);

    const stateTd = document.createElement("td");
    if (fame >= p.fame) {
      stateTd.textContent = "解放済み（ランクに応じて自動で強化）";
      stateTd.style.color = "#8f8";
    } else {
      stateTd.textContent = "未解放";
      stateTd.style.color = "#ccc";
    }
    tr.appendChild(stateTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  listEl.appendChild(table);
}

// =======================
// ギルド加入処理
// =======================

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
    // 今の仕様では所属は1つ固定、変更はOKにしておく
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

  renderGuildUI();
}

// =======================
// メイン：ギルドタブ全体再描画
// =======================

function renderGuildUI() {
  renderGuildHeader();
  renderGuildList();
  renderGuildQuests();
  renderGuildRewards();
}

// =======================
// 初期化（ギルドタブに入ったタイミングで呼ばれる想定）
// =======================

document.addEventListener("DOMContentLoaded", () => {
  // 起動時に一度だけ軽く初期化しておく
  // （実際には game-ui.js の showTabByPageId("pageGuild") で renderGuildUI が呼ばれる想定）
  renderGuildHeader();
});