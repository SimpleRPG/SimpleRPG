// guildskill.js
// ギルド用スキルツリー（戦闘ギルド共通）定義＋ロジック＋UI（縦方向ツリー）

console.log("guildskill.js start");

// =======================
// 戦闘ギルド共通スキルツリー定義
// =======================
//
// 効果カテゴリ:
//  - hpMaxRate: 最大HP%アップ
//  - physSkillRate: 物理スキルダメージ%アップ
//  - magicSkillRate: 魔法スキルダメージ%アップ
//  - petAtkRate: ペット与ダメ%アップ
//  - guardReductionRate: 被ダメ軽減%アップ
//  - magicCostRate: 魔法スキル消費MP%変化（マイナスで軽減）
//  - petGuardSynergyRate: ペット共闘時の被ダメ軽減%
//
// 各カテゴリ合計でだいたい +10% 前後に収まるように調整

const COMBAT_GUILD_TREE = [
  // 共通コア（Tier0）
  {
    id: "core_training_1",
    name: "基礎訓練",
    desc: "最大HP +2%。",
    branch: "core",
    cost: 1,
    require: {
      fameTotal: 10
    },
    effect: { hpMaxRate: 0.02 }
  },

  // 戦士系ブランチ
  {
    id: "core_tactics_1",
    name: "戦術理解 I",
    desc: "被ダメージ -3%。",
    branch: "warrior",
    cost: 1,
    require: {
      fameWarrior: 10,
      questsDone: ["warrior_kill_30_phys"]
    },
    parent: "core_training_1",
    effect: { guardReductionRate: 0.03 }
  },
  {
    id: "warrior_guard_1",
    name: "盾術 I",
    desc: "ガード時の被ダメ軽減が少し上昇する（被ダメ -2%）。",
    branch: "warrior",
    cost: 1,
    require: {
      fameWarrior: 20,
      questsDone: ["battle_boss_1"]
    },
    parent: "core_tactics_1",
    effect: { guardReductionRate: 0.02 }
  },
  {
    id: "warrior_sword_1",
    name: "剣術 I",
    desc: "物理スキルダメージ +3%。",
    branch: "warrior",
    cost: 1,
    require: {
      fameWarrior: 10
    },
    parent: "core_tactics_1",
    effect: { physSkillRate: 0.03 }
  },

  // 魔法系ブランチ
  {
    id: "mage_focus_1",
    name: "基礎魔力制御",
    desc: "魔法スキルダメージ +3%。",
    branch: "mage",
    cost: 1,
    require: {
      fameMage: 10,
      questsDone: ["mage_kill_30_magic"]
    },
    parent: "core_training_1",
    effect: { magicSkillRate: 0.03 }
  },
  {
    id: "mage_efficiency_1",
    name: "魔力効率 I",
    desc: "魔法スキルの消費MPが少し軽くなる（-5%相当）。",
    branch: "mage",
    cost: 1,
    require: {
      fameMage: 20,
      questsDone: ["mage_rebirth_1"]
    },
    parent: "mage_focus_1",
    effect: {
      magicCostRate: -0.05
    }
  },

  // ペット系ブランチ
  {
    id: "tamer_training_1",
    name: "調教術 I",
    desc: "ペットの与ダメージ +3%。",
    branch: "tamer",
    cost: 1,
    require: {
      fameTamer: 10,
      questsDone: ["tamer_kill_30_pet"]
    },
    parent: "core_training_1",
    effect: { petAtkRate: 0.03 }
  },
  {
    id: "tamer_synergy_1",
    name: "共闘訓練",
    desc: "ペットが攻撃したターン、プレイヤーの被ダメージ -3%。",
    branch: "tamer",
    cost: 1,
    require: {
      fameTamer: 20,
      questsDone: ["tamer_rebirth_1"]
    },
    parent: "tamer_training_1",
    effect: { petGuardSynergyRate: 0.03 }
  }
];

// 解放済みノード（セーブ対象）
window.combatGuildTreeUnlocked = window.combatGuildTreeUnlocked || {};

// 戦闘ギルドスキルポイント（セーブ対象）
window.combatGuildSkillPoints = window.combatGuildSkillPoints || 0;

// =======================
// 戦闘ギルドツリーの解放判定
// =======================
//
// 「下の段」＝parent が解放されていること

function isCombatTreeNodeUnlockable(node) {
  const fameWarrior = typeof getGuildFame === "function" ? getGuildFame("warrior") : 0;
  const fameMage    = typeof getGuildFame === "function" ? getGuildFame("mage")    : 0;
  const fameTamer   = typeof getGuildFame === "function" ? getGuildFame("tamer")   : 0;
  const fameTotal   = fameWarrior + fameMage + fameTamer;

  const r = node.require || {};

  if (r.fameTotal != null && fameTotal < r.fameTotal) return false;
  if (r.fameWarrior != null && fameWarrior < r.fameWarrior) return false;
  if (r.fameMage != null && fameMage < r.fameMage) return false;
  if (r.fameTamer != null && fameTamer < r.fameTamer) return false;

  if (r.questsDone && r.questsDone.length && typeof getGuildQuestProg === "function") {
    for (const qid of r.questsDone) {
      const prog = getGuildQuestProg(qid);
      if (!prog.done) return false;
    }
  }

  if (node.parent) {
    if (!window.combatGuildTreeUnlocked[node.parent]) return false;
  }

  return true;
}

// =======================
// 手動習得処理（ポイント消費）
// =======================

function learnCombatGuildNode(nodeId) {
  const node = COMBAT_GUILD_TREE.find(n => n.id === nodeId);
  if (!node) return;

  if (window.combatGuildTreeUnlocked[nodeId]) {
    if (typeof appendLog === "function") {
      appendLog("すでに解放済みの技術だ。");
    }
    return;
  }

  if (!isCombatTreeNodeUnlockable(node)) {
    if (typeof appendLog === "function") {
      appendLog("まだこの技術を習得する条件を満たしていない。");
    }
    return;
  }

  const pt = window.combatGuildSkillPoints || 0;
  const cost = node.cost || 1;

  if (pt < cost) {
    if (typeof appendLog === "function") {
      appendLog("スキルポイントが足りない。");
    }
    return;
  }

  window.combatGuildSkillPoints = pt - cost;
  window.combatGuildTreeUnlocked[nodeId] = true;

  if (typeof appendLog === "function") {
    appendLog(`戦闘ギルド技術「${node.name}」を習得した！（残りポイント: ${window.combatGuildSkillPoints}）`);
  }

  if (typeof renderGuildRewards === "function") {
    renderGuildRewards();
  }
}

// =======================
// 戦闘ギルドツリー由来のボーナスを集計
// =======================

function getCombatGuildTreeBonus() {
  const result = {
    hpMaxRate: 0,
    physSkillRate: 0,
    magicSkillRate: 0,
    petAtkRate: 0,
    guardReductionRate: 0,
    magicCostRate: 0,
    petGuardSynergyRate: 0
  };

  for (const node of COMBAT_GUILD_TREE) {
    if (!window.combatGuildTreeUnlocked[node.id]) continue;
    const e = node.effect || {};
    if (e.hpMaxRate)           result.hpMaxRate           += e.hpMaxRate;
    if (e.physSkillRate)       result.physSkillRate       += e.physSkillRate;
    if (e.magicSkillRate)      result.magicSkillRate      += e.magicSkillRate;
    if (e.petAtkRate)          result.petAtkRate          += e.petAtkRate;
    if (e.guardReductionRate)  result.guardReductionRate  += e.guardReductionRate;
    if (e.magicCostRate)       result.magicCostRate       += e.magicCostRate;
    if (e.petGuardSynergyRate) result.petGuardSynergyRate += e.petGuardSynergyRate;
  }

  result.hpMaxRate           = Math.min(result.hpMaxRate,          0.10);
  result.physSkillRate       = Math.min(result.physSkillRate,      0.10);
  result.magicSkillRate      = Math.min(result.magicSkillRate,     0.10);
  result.petAtkRate          = Math.min(result.petAtkRate,         0.10);
  result.guardReductionRate  = Math.min(result.guardReductionRate, 0.10);
  result.magicCostRate       = Math.max(result.magicCostRate,     -0.15);
  result.petGuardSynergyRate = Math.min(result.petGuardSynergyRate,0.10);

  return result;
}

// =======================
// UI: 報酬・称号タブにセクション追加（縦ツリー版）
// =======================

function renderCombatGuildTreeSection(rootEl) {
  if (!rootEl) return;

  const title = document.createElement("h4");
  title.textContent = "戦闘ギルド共通技術ツリー";
  title.style.marginTop = "8px";
  rootEl.appendChild(title);

  const note = document.createElement("div");
  note.style.fontSize = "11px";
  note.style.color = "#ccc";
  note.textContent =
    "戦士ギルド・魔法ギルド・動物使いギルドで名声を高め、依頼をこなすことで得たポイントを消費して習得できる恒久パッシブです。";
  rootEl.appendChild(note);

  const ptInfo = document.createElement("div");
  ptInfo.style.fontSize = "11px";
  ptInfo.style.color = "#8cf";
  ptInfo.textContent = `戦闘ギルドスキルポイント: ${window.combatGuildSkillPoints || 0}`;
  rootEl.appendChild(ptInfo);

  const treeBonus = getCombatGuildTreeBonus();

  const bonusInfo = document.createElement("div");
  bonusInfo.style.fontSize = "11px";
  bonusInfo.style.color = "#8cf";

  const lines = [];
  if (treeBonus.hpMaxRate)             lines.push(`最大HP +${Math.round(treeBonus.hpMaxRate * 100)}%`);
  if (treeBonus.physSkillRate)         lines.push(`物理スキルダメージ +${Math.round(treeBonus.physSkillRate * 100)}%`);
  if (treeBonus.magicSkillRate)        lines.push(`魔法スキルダメージ +${Math.round(treeBonus.magicSkillRate * 100)}%`);
  if (treeBonus.petAtkRate)            lines.push(`ペット与ダメージ +${Math.round(treeBonus.petAtkRate * 100)}%`);
  if (treeBonus.guardReductionRate)    lines.push(`被ダメージ -${Math.round(treeBonus.guardReductionRate * 100)}%`);
  if (treeBonus.magicCostRate)         lines.push(`魔法スキル消費MP ${Math.round(treeBonus.magicCostRate * 100)}%`);
  if (treeBonus.petGuardSynergyRate)   lines.push(`ペット共闘時の被ダメージ -${Math.round(treeBonus.petGuardSynergyRate * 100)}%`);

  bonusInfo.textContent = lines.length
    ? `現在の戦闘技術ボーナス: ${lines.join(" / ")}`
    : "現在の戦闘技術ボーナス: まだ解放されていません。";
  rootEl.appendChild(bonusInfo);

  // ===== 縦ツリー UI 部分 =====

  const container = document.createElement("div");
  container.style.marginTop = "8px";
  container.style.position = "relative";
  container.style.padding = "8px 0 4px 16px";
  container.style.borderLeft = "1px solid #444";
  rootEl.appendChild(container);

  // tier を計算（親からの距離）
  const tierMap = {};
  function getTier(id) {
    if (tierMap[id] != null) return tierMap[id];
    const node = COMBAT_GUILD_TREE.find(n => n.id === id);
    if (!node) {
      tierMap[id] = 0;
      return 0;
    }
    if (!node.parent) {
      tierMap[id] = 0;
      return 0;
    }
    const t = getTier(node.parent) + 1;
    tierMap[id] = t;
    return t;
  }
  COMBAT_GUILD_TREE.forEach(n => getTier(n.id));

  // tier ごと、branch ごとにまとめる
  const tiers = {};
  COMBAT_GUILD_TREE.forEach(node => {
    const t = tierMap[node.id] || 0;
    if (!tiers[t]) tiers[t] = [];
    tiers[t].push(node);
  });

  const branchOrder = ["warrior", "mage", "tamer"];

  Object.keys(tiers).sort((a,b) => a - b).forEach(tier => {
    const nodes = tiers[tier];

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.margin = "8px 0";
    row.style.position = "relative";

    const line = document.createElement("div");
    line.style.position = "absolute";
    line.style.left = "-8px";
    line.style.top = "0";
    line.style.bottom = "0";
    line.style.width = "1px";
    line.style.background = "#444";
    row.appendChild(line);

    const tierLabel = document.createElement("div");
    tierLabel.textContent = `Tier ${tier}`;
    tierLabel.style.fontSize = "10px";
    tierLabel.style.color = "#888";
    tierLabel.style.width = "52px";
    tierLabel.style.textAlign = "right";
    row.appendChild(tierLabel);

    if (Number(tier) === 0) {
      // Tier0: 基礎訓練を中央に配置
      const node = nodes.find(n => n.id === "core_training_1") || nodes[0];
      const centerWrap = document.createElement("div");
      centerWrap.style.flex = "1";
      centerWrap.style.display = "flex";
      centerWrap.style.justifyContent = "center";
      const btn = createSkillButton(node);
      centerWrap.appendChild(btn);
      row.appendChild(centerWrap);
      container.appendChild(row);
      return;
    }

    const branchToNode = {};
    nodes.forEach(node => {
      branchToNode[node.branch] = branchToNode[node.branch] || [];
      branchToNode[node.branch].push(node);
    });

    branchOrder.forEach(branch => {
      const list = branchToNode[branch] || [];
      const col = document.createElement("div");
      col.style.flex = "1";
      col.style.display = "flex";
      col.style.flexDirection = "column";
      col.style.alignItems = "center";
      col.style.gap = "4px";

      list.forEach(node => {
        const btn = createSkillButton(node);
        col.appendChild(btn);
      });

      row.appendChild(col);
    });

    container.appendChild(row);
  });
}

// スキルボタン生成ヘルパー
function createSkillButton(node) {
  const btn = document.createElement("button");
  btn.textContent = node.name;
  btn.title = node.desc;
  btn.style.fontSize = "10px";
  btn.style.padding = "2px 6px";
  btn.style.margin = "0 4px";
  btn.style.borderRadius = "12px";
  btn.style.border = "1px solid #555";
  btn.style.cursor = "pointer";
  btn.style.minWidth = "80px";
  btn.style.maxWidth = "120px";
  btn.style.whiteSpace = "nowrap";

  const unlocked = !!window.combatGuildTreeUnlocked[node.id];
  const cost = node.cost || 1;
  const pt = window.combatGuildSkillPoints || 0;

  if (unlocked) {
    btn.style.backgroundColor = "#283";
    btn.style.color = "#efe";
    btn.disabled = true;
  } else if (!isCombatTreeNodeUnlockable(node)) {
    btn.style.backgroundColor = "#333";
    btn.style.color = "#777";
    btn.disabled = true;
  } else if (pt >= cost) {
    btn.style.backgroundColor = "#245";
    btn.style.color = "#cdf";
    btn.addEventListener("click", () => {
      learnCombatGuildNode(node.id);
    });
  } else {
    btn.style.backgroundColor = "#222";
    btn.style.color = "#999";
    btn.disabled = true;
  }

  return btn;
}

// =======================
// ★追加: テト用に COMBAT_GUILD_TREE をグローバル公開
// =======================
//
// 仕様は変えず、ローカル定義の配列をそのまま window にエクスポートするだけ。
// これにより、teto-ai4.js から window.COMBAT_GUILD_TREE を参照できる。
if (typeof window !== "undefined" && typeof window.COMBAT_GUILD_TREE === "undefined") {
  window.COMBAT_GUILD_TREE = COMBAT_GUILD_TREE;
}