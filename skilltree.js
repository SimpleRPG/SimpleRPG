// skilltree.js
// 共通スキルツリー（戦闘 + 採取 + クラフト + 経済/拠点） SVG描画版（ボタン間隔調整・グリッド拡張）

console.log("skilltree.js loaded");

window.globalSkillTreeUnlocked = window.globalSkillTreeUnlocked || {};
window.selectedSkillNodeId = window.selectedSkillNodeId || null;
window.skillTreeFilterType = window.skillTreeFilterType || "all"; // "all" / "combat" / "gather" / "craft" / "econ"

// デバッグ用フラグ（必要なときだけ true にすると線の座標をログ出し）
window.__SKILLTREE_DEBUG_LINES = window.__SKILLTREE_DEBUG_LINES || false;

let SKILL_TREE_EDGES = [];

// =======================
// ノード定義
// =======================
// type: "combat" | "gather" | "craft" | "econ"
const SKILL_TREE_NODES = [
  // 中心: 共通基礎
  {
    id: "core_center_training",
    type: "combat", // 共通でもOK
    x: 0, y: 0,
    name: "旅の始まり",
    desc: "あの日小さな一歩を踏み出したその旅路に星の加護があらんことを",
    costMoney: 0,
    costIntermediates: {},
    effect: {
      hpMaxRate: 0.03
    }
  },

  // =======================
  // 上：戦闘系
  // =======================

  {
    id: "combat_hp_1",
    type: "combat",
    x: 0, y: 1,
    name: "鉄の肉体 I",
    desc: "鍛え上げた筋肉と覚悟が、致命傷をかすり傷へと変えてくれる。（最大HPが少し上昇）",
    costMoney: 3000,
    costIntermediates: {},
    effect: { hpMaxRate: 0.05 }
  },
  {
    id: "combat_guard_1",
    type: "combat",
    x: -1, y: 1,
    name: "防衛姿勢 I",
    desc: "攻撃を受けるその瞬間、身体が自然と最小限の被害で済む位置を選ぶようになる。（受けるダメージが少し軽減）",
    costMoney: 4000,
    costIntermediates: {},
    effect: { combatGuardReductionRate: 0.03 }
  },
  {
    id: "combat_phys_1",
    type: "combat",
    x: 1, y: 1,
    name: "実戦訓練・物理",
    desc: "何度も素振りを重ねた結果、攻撃が“当たるべき場所”に自然と吸い寄せられていく。（物理スキルの威力が少し上昇）",
    costMoney: 4000,
    costIntermediates: {},
    effect: { physSkillRate: 0.03 }
  },
  {
    id: "combat_magic_1",
    type: "combat",
    x: 1, y: 2,
    name: "実戦訓練・魔法",
    desc: "魔力の流れを戦場で扱う術を学び、無駄のない詠唱へと近づいていく。（魔法スキルの威力が少し上昇）",
    costMoney: 7000,
    costIntermediates: {},
    effect: { magicSkillRate: 0.03 }
  },
  {
    id: "combat_pet_1",
    type: "combat",
    x: -1, y: 2,
    name: "共闘訓練 I",
    desc: "合図ひとつで動き出す相棒との連携は、単純な足し算以上の力を生み出す。（ペットの与ダメージが少し上昇）",
    costMoney: 7000,
    costIntermediates: {},
    effect: { petAtkRate: 0.04 }
  },
  {
    id: "combat_post_heal_1",
    type: "combat",
    x: 0, y: 2,
    name: "小休止の達人",
    desc: "戦いの合間に呼吸と姿勢を整える術を身につけ、短い休憩でも驚くほど回復できるようになった。（戦闘勝利後に追加でHP回復）",
    costMoney: 5000,
    costIntermediates: {},
    effect: { combatPostBattleHpRate: 0.05 }
  },
  {
    id: "combat_money_1",
    type: "combat",
    x: 0, y: 3,
    name: "戦利品の目利き",
    desc: "戦場の遺品から価値あるものを見抜く勘が磨かれ、同じ勝利でも財布の重さが変わってくる。（戦闘で得られるお金が増加）",
    costMoney: 9000,
    costIntermediates: {},
    effect: { moneyGainRateBattle: 0.10 }
  },

  // =======================
  // 左：採取系
  // =======================

  {
    id: "gather_basic_1",
    type: "gather",
    x: -1, y: 0,
    name: "採取の基礎 I",
    desc: "道具の扱い方から手の運びまで、基本を押さえた動きは無駄が少ない。（通常採取で得られる素材量が少し増える）",
    costMoney: 3000,
    costIntermediates: {},
    effect: { gatherAmountBonusRate: 0.10 }
  },
  {
    id: "gather_extra_1",
    type: "gather",
    x: -2, y: 0,
    name: "手際の良さ I",
    desc: "目配りと段取りが身につき、気づけば予定より多くの素材を抱えて帰ることが増えてきた。（たまに多めに取れることがある）",
    costMoney: 5000,
    costIntermediates: {},
    effect: { extraGatherBonusRateAdd: 0.03 }
  },
  {
    id: "gather_fail_1",
    type: "gather",
    x: -1, y: -1,
    name: "根気",
    desc: "空腹や喉の渇きに顔をしかめながらも、もうひと掘り、もうひと刈りと手を止めない。（体調不良による採取失敗が起きにくくなる）",
    costMoney: 6000,
    costIntermediates: {},
    effect: { gatherFailPenaltyRate: 0.7 }
  },
  {
    id: "gather_equip_1",
    type: "gather",
    x: -2, y: 1,
    name: "専門工具の扱い",
    desc: "道具ごとの“おいしい使いどころ”を理解し、装備の真価を引き出せるようになった。（採取用装備ボーナスが発生しやすくなる）",
    costMoney: 8000,
    costIntermediates: {},
    effect: { gatherEquipBonusChanceAdd: 0.10 }
  },

  // =======================
  // 右：クラフト系
  // =======================

  {
    id: "craft_cost_1",
    type: "craft",
    x: 1, y: 0,
    name: "素材節約術 I",
    desc: "無駄な切り落としを減らし、必要なぶんだけを的確に使う。倉庫の減りも、少しだけ穏やかになる。（クラフト時の素材消費が軽減）",
    costMoney: 3000,
    costIntermediates: {},
    effect: { craftCostReduceRate: 0.05 }
  },
  {
    id: "craft_quality_1",
    type: "craft",
    x: 2, y: 0,
    name: "良品選別術",
    desc: "わずかな傷や歪みも見逃さない眼が、手元の仕上がりに反映されるようになった。（装備クラフトで良品・傑作が生まれやすくなる）",
    costMoney: 6000,
    costIntermediates: {},
    effect: { craftQualityBonusRate: 0.10 }
  },
  {
    id: "craft_inter_extra_1",
    type: "craft",
    x: 2, y: -1,
    name: "副産物管理",
    desc: "作業中に生まれる余りを、ただの失敗で終わらせず“もうひとつの成果”へと変えていく。（中間素材クラフトでおまけが出やすくなる）",
    costMoney: 8000,
    costIntermediates: {},
    effect: { craftIntermediateExtraChance: 0.10 }
  },
  {
    id: "craft_star_1",
    type: "craft",
    x: 3, y: 0,
    name: "星屑の取り扱い",
    desc: "星屑のきらめきに潜む癖を理解し、その力を装備へと注ぎ込む勘が研ぎ澄まされてきた。（星屑の結晶を使うクラフトが成功しやすくなる）",
    costMoney: 9000,
    costIntermediates: {},
    effect: { craftStarBonusRate: 0.10 }
  },

  // =======================
  // 下：経済 / 拠点 / 横断
  // =======================

  {
    id: "econ_sell_1",
    type: "econ",
    x: 0, y: -1,
    name: "商才 I",
    desc: "品物の見せ方ひとつで、買い取り額が意外と変わることを学んだ。交渉前から勝負は始まっている。（店への売却価格が少し上がる）",
    costMoney: 4000,
    costIntermediates: {},
    effect: { sellPriceRate: 0.05 }
  },
  {
    id: "econ_buy_1",
    type: "econ",
    x: 1, y: -1,
    name: "値切り術 I",
    desc: "「それ、本当にこの値段ですか？」のひと言で、店主の表情から限界ラインを読み取れるようになった。（ショップ購入価格が少し下がる）",
    costMoney: 5000,
    costIntermediates: {},
    effect: { buyPriceReduceRate: 0.05 }
  },
  {
    id: "hub_gatherbase_1",
    type: "econ",
    x: -1, y: -2,
    name: "拠点管理術 I",
    desc: "取れる場所・取れない場所を見直し、強化に必要な素材の使いどころを最適化する。（採取拠点の強化に必要な中間素材が軽減）",
    costMoney: 7000,
    costIntermediates: {},
    effect: { gatherBaseUpgradeCostReduceRate: 0.05 }
  },
  {
    id: "hub_autogather_1",
    type: "econ",
    x: 0, y: -2,
    name: "自動採取効率化",
    desc: "拠点の管理表を見直し、溢れていた作業を無理なくため込める仕組みに作り替えた。（自動採取のストック上限が増加）",
    costMoney: 7000,
    costIntermediates: {},
    effect: { gatherBaseStockMaxTicksAdd: 12 }
  }
];

// =======================
// ボーナス集計
// =======================
function getGlobalSkillTreeBonus() {
  const result = {
    // 戦闘
    hpMaxRate: 0,
    atkRate: 0,
    defRate: 0,
    combatGuardReductionRate: 0,
    physSkillRate: 0,
    magicSkillRate: 0,
    petAtkRate: 0,
    combatPostBattleHpRate: 0,
    moneyGainRateBattle: 0,
    // 採取
    gatherAmountBonusRate: 0,
    extraGatherBonusRateAdd: 0,
    gatherFailPenaltyRate: 1.0,
    gatherEquipBonusChanceAdd: 0,
    // クラフト
    craftCostReduceRate: 0,
    craftQualityBonusRate: 0,
    craftIntermediateExtraChance: 0,
    craftStarBonusRate: 0,
    // 経済・拠点
    sellPriceRate: 0,
    buyPriceReduceRate: 0,
    gatherBaseUpgradeCostReduceRate: 0,
    gatherBaseStockMaxTicksAdd: 0
  };

  for (const node of SKILL_TREE_NODES) {
    if (!window.globalSkillTreeUnlocked[node.id]) continue;
    const e = node.effect || {};

    if (e.hpMaxRate)                    result.hpMaxRate                   += e.hpMaxRate;
    if (e.atkRate)                      result.atkRate                     += e.atkRate;
    if (e.defRate)                      result.defRate                     += e.defRate;
    if (e.combatGuardReductionRate)     result.combatGuardReductionRate    += e.combatGuardReductionRate;
    if (e.physSkillRate)                result.physSkillRate               += e.physSkillRate;
    if (e.magicSkillRate)               result.magicSkillRate              += e.magicSkillRate;
    if (e.petAtkRate)                   result.petAtkRate                  += e.petAtkRate;
    if (e.combatPostBattleHpRate)       result.combatPostBattleHpRate      += e.combatPostBattleHpRate;
    if (e.moneyGainRateBattle)          result.moneyGainRateBattle         += e.moneyGainRateBattle;

    if (e.gatherAmountBonusRate)        result.gatherAmountBonusRate       += e.gatherAmountBonusRate;
    if (e.extraGatherBonusRateAdd)      result.extraGatherBonusRateAdd     += e.extraGatherBonusRateAdd;
    if (e.gatherEquipBonusChanceAdd)    result.gatherEquipBonusChanceAdd   += e.gatherEquipBonusChanceAdd;
    if (typeof e.gatherFailPenaltyRate === "number") {
      result.gatherFailPenaltyRate *= e.gatherFailPenaltyRate;
    }

    if (e.craftCostReduceRate)          result.craftCostReduceRate         += e.craftCostReduceRate;
    if (e.craftQualityBonusRate)        result.craftQualityBonusRate       += e.craftQualityBonusRate;
    if (e.craftIntermediateExtraChance) result.craftIntermediateExtraChance += e.craftIntermediateExtraChance;
    if (e.craftStarBonusRate)           result.craftStarBonusRate          += e.craftStarBonusRate;

    if (e.sellPriceRate)                result.sellPriceRate               += e.sellPriceRate;
    if (e.buyPriceReduceRate)           result.buyPriceReduceRate          += e.buyPriceReduceRate;
    if (e.gatherBaseUpgradeCostReduceRate) result.gatherBaseUpgradeCostReduceRate += e.gatherBaseUpgradeCostReduceRate;
    if (e.gatherBaseStockMaxTicksAdd)   result.gatherBaseStockMaxTicksAdd  += e.gatherBaseStockMaxTicksAdd;
  }

  // 軽いキャップ
  result.hpMaxRate                    = Math.min(result.hpMaxRate, 0.15);
  result.atkRate                      = Math.min(result.atkRate, 0.15);
  result.defRate                      = Math.min(result.defRate, 0.15);
  result.combatGuardReductionRate     = Math.min(result.combatGuardReductionRate, 0.10);
  result.physSkillRate                = Math.min(result.physSkillRate, 0.10);
  result.magicSkillRate               = Math.min(result.magicSkillRate, 0.10);
  result.petAtkRate                   = Math.min(result.petAtkRate, 0.10);
  result.combatPostBattleHpRate       = Math.min(result.combatPostBattleHpRate, 0.20);
  result.moneyGainRateBattle          = Math.min(result.moneyGainRateBattle, 0.30);

  result.gatherAmountBonusRate        = Math.min(result.gatherAmountBonusRate, 0.30);
  result.extraGatherBonusRateAdd      = Math.min(result.extraGatherBonusRateAdd, 0.10);
  result.gatherEquipBonusChanceAdd    = Math.min(result.gatherEquipBonusChanceAdd, 0.30);
  result.gatherFailPenaltyRate        = Math.max(0.3, result.gatherFailPenaltyRate);

  result.craftCostReduceRate          = Math.min(result.craftCostReduceRate, 0.30);
  result.craftIntermediateExtraChance = Math.min(result.craftIntermediateExtraChance, 0.30);
  result.craftStarBonusRate           = Math.min(result.craftStarBonusRate, 0.30);

  result.sellPriceRate                = Math.min(result.sellPriceRate, 0.30);
  result.buyPriceReduceRate           = Math.min(result.buyPriceReduceRate, 0.30);
  result.gatherBaseUpgradeCostReduceRate = Math.min(result.gatherBaseUpgradeCostReduceRate, 0.30);
  result.gatherBaseStockMaxTicksAdd   = Math.min(result.gatherBaseStockMaxTicksAdd, 72);

  return result;
}

// =======================
// 解放条件・取得処理
// =======================
function getSkillNodeById(id) {
  return SKILL_TREE_NODES.find(n => n.id === id) || null;
}

function getSkillNodeUnlockError(node) {
  if (!node) return "ノードが存在しない。";
  if (window.globalSkillTreeUnlocked[node.id]) return "すでに習得済み。";

  const anyUnlocked = Object.keys(window.globalSkillTreeUnlocked)
    .some(id => window.globalSkillTreeUnlocked[id]);
  if (!anyUnlocked && node.id !== "core_center_training") {
    return "最初は中心のスキルから習得する必要がある。";
  }

  if (anyUnlocked) {
    const neighbors = SKILL_TREE_NODES.filter(n =>
      n.id !== node.id &&
      Math.abs(n.x - node.x) + Math.abs(n.y - n.y) === 1 &&
      window.globalSkillTreeUnlocked[n.id]
    );
    if (!neighbors.length) {
      return "隣接するスキルが習得されていない。";
    }
  }

  const moneyNeed = node.costMoney || 0;
  if (typeof money !== "number" || money < moneyNeed) {
    return `お金が足りない（${money} / ${moneyNeed}G）。`;
  }

  const inter = node.costIntermediates || {};
  if (inter && typeof intermediateMats === "object") {
    for (const iid in inter) {
      const need = inter[iid] || 0;
      const have = intermediateMats[iid] || 0;
      if (have < need) {
        return `中間素材が足りない（${iid}: ${have} / ${need}）。`;
      }
    }
  }

  return null; // OK
}

function isSkillNodeUnlockable(node) {
  return getSkillNodeUnlockError(node) === null;
}

function getSkillNodeState(node) {
  if (!node) return "locked";
  if (window.globalSkillTreeUnlocked[node.id]) return "unlocked";
  if (isSkillNodeUnlockable(node)) return "unlockable";
  return "locked";
}

function learnSkillNode(nodeId) {
  const node = getSkillNodeById(nodeId);
  if (!node) return;

  const err = getSkillNodeUnlockError(node);
  if (err) {
    appendLog(err);
    return;
  }

  const moneyNeed = node.costMoney || 0;
  if (moneyNeed > 0) {
    money -= moneyNeed;
    if (money < 0) money = 0;
  }

  const inter = node.costIntermediates || {};
  if (inter && typeof intermediateMats === "object") {
    for (const iid in inter) {
      const need = inter[iid] || 0;
      intermediateMats[iid] = (intermediateMats[iid] || 0) - need;
      if (intermediateMats[iid] < 0) intermediateMats[iid] = 0;
    }
  }

  window.globalSkillTreeUnlocked[nodeId] = true;

  appendLog(`スキル「${node.name}」を習得した！`);
  const e = node.effect || {};
  if (e.hpMaxRate) appendLog("最大HPが少し上がった気がする。");
  if (e.gatherAmountBonusRate) appendLog("採取で手に入る素材が少し増えそうだ。");
  if (e.craftCostReduceRate) appendLog("クラフトの素材消費が少し軽くなった。");
  if (e.sellPriceRate || e.buyPriceReduceRate) appendLog("商売の勘が冴えてきた。");

  if (typeof recalcStats === "function") recalcStats();
  if (typeof updateDisplay === "function") updateDisplay();
  renderSkillTree();          // 再描画
  renderSkillTreeSummary();   // サマリ更新
}

// =======================
// フィルタ
// =======================
function setSkillTreeFilter(type) {
  window.skillTreeFilterType = type || "all";
  applySkillTreeFilter();
}

function applySkillTreeFilter() {
  const svg = document.getElementById("skillTreeSvg");
  if (!svg) return;

  const filter = window.skillTreeFilterType || "all";

  // ノード側：foreignObject と 内部ボタン両方に dimmed を付け外し
  SKILL_TREE_NODES.forEach(node => {
    const fo = svg.querySelector(`foreignObject[data-node-id="${node.id}"]`);
    if (!fo) return;

    const btn = fo.querySelector(".skill-node-btn");
    const inFilter = (filter === "all" || node.type === filter);

    if (inFilter) {
      fo.classList.remove("dimmed");
      if (btn) btn.classList.remove("dimmed");
    } else {
      fo.classList.add("dimmed");
      if (btn) btn.classList.add("dimmed");
    }
  });

  const linesLayer = document.getElementById("skillTreeLinesLayer");
  if (linesLayer) {
    SKILL_TREE_EDGES.forEach(edge => {
      const lineEl = linesLayer.querySelector(`line[data-edge-id="${edge.aId}__${edge.bId}"]`);
      if (!lineEl) return;

      const a = getSkillNodeById(edge.aId);
      const b = getSkillNodeById(edge.bId);
      const aOk = (filter === "all" || (a && a.type === filter));
      const bOk = (filter === "all" || (b && b.type === filter));

      if (aOk || bOk) {
        lineEl.classList.remove("dimmed");
      } else {
        lineEl.classList.add("dimmed");
      }
    });
  }
}

// =======================
// マスク再構築（今は「全部見える」マスク）
// =======================
function rebuildSkillTreeLinesMask(svg, nodeCenterMap) {
  const defs = svg.querySelector("defs") || svg.insertBefore(
    document.createElementNS("http://www.w3.org/2000/svg", "defs"),
    svg.firstChild
  );

  let mask = defs.querySelector("#skillTreeLinesMask");
  if (!mask) {
    mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
    mask.setAttribute("id", "skillTreeLinesMask");
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("maskContentUnits", "userSpaceOnUse");
    defs.appendChild(mask);
  }

  mask.innerHTML = "";

  const base = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  base.setAttribute("x", "-2000");
  base.setAttribute("y", "-2000");
  base.setAttribute("width", "4000");
  base.setAttribute("height", "4000");
  base.setAttribute("fill", "white");
  mask.appendChild(base);
}

// =======================
// 線の構築
// =======================
function buildSkillTreeEdges() {
  SKILL_TREE_EDGES = [];
  for (let i = 0; i < SKILL_TREE_NODES.length; i++) {
    const a = SKILL_TREE_NODES[i];
    for (let j = i + 1; j < SKILL_TREE_NODES.length; j++) {
      const b = SKILL_TREE_NODES[j];
      const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (d === 1) {
        SKILL_TREE_EDGES.push({ aId: a.id, bId: b.id });
      }
    }
  }
}

// =======================
// 描画（SVG）
// =======================

const SKILL_TREE_UNIT_X = 120;
const SKILL_TREE_UNIT_Y = 80;

function renderSkillTree(containerId) {
  const panelId = containerId || "skillTreePanel";
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const svg = panel.querySelector("#skillTreeSvg");
  if (!svg) return;

  const linesLayer = svg.querySelector("#skillTreeLinesLayer");
  const nodesLayer = svg.querySelector("#skillTreeNodesLayer");
  if (!linesLayer || !nodesLayer) return;

  linesLayer.innerHTML = "";
  nodesLayer.innerHTML = "";

  buildSkillTreeEdges();

  const nodeCenterMap = {}; // id -> {x,y} （SVG座標）

  // ノードの描画（foreignObject + button）
  SKILL_TREE_NODES.forEach(node => {
    const cx = node.x * SKILL_TREE_UNIT_X;
    const cy = -node.y * SKILL_TREE_UNIT_Y; // yは上が正なので符号反転
    nodeCenterMap[node.id] = { x: cx, y: cy };

    const foWidth = 100;
    const foHeight = 40;

    const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("x", (cx - foWidth / 2).toString());
    fo.setAttribute("y", (cy - foHeight / 2).toString());
    fo.setAttribute("width", foWidth.toString());
    fo.setAttribute("height", foHeight.toString());
    fo.setAttribute("data-node-id", node.id);

    const state = getSkillNodeState(node);

    const div = document.createElement("div");
    div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";

    const btn = document.createElement("button");
    btn.textContent = node.name;
    btn.className = "skill-node-btn " + state;
    btn.dataset.nodeId = node.id;
    btn.setAttribute("data-type", node.type);
    btn.style.width = "100%";
    btn.style.height = "100%";

    btn.addEventListener("click", () => {
      selectSkillNode(node.id);
    });

    div.appendChild(btn);
    fo.appendChild(div);
    nodesLayer.appendChild(fo);
  });

  // viewBox をノードに合わせて自動調整
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  Object.values(nodeCenterMap).forEach(pos => {
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;
  });

  const marginX = 80;
  const marginY = 60;

  const vbX = (minX === Infinity ? -240 : minX - marginX);
  const vbY = (minY === Infinity ? -240 : minY - marginY);
  const vbWidth = (maxX === -Infinity ? 480 : (maxX - minX) + marginX * 2 || 400);
  const vbHeight = (maxY === -Infinity ? 480 : (maxY - minY) + marginY * 2 || 300);

  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);

  rebuildSkillTreeLinesMask(svg, nodeCenterMap);

  const NODE_HALF_WIDTH  = 50;
  const NODE_HALF_HEIGHT = 22;
  const GAP = 6;

  function getEdgePoint(center, target) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const len = Math.hypot(dx, dy);
    if (!len) return { x: center.x, y: center.y };

    const ux = dx / len;
    const uy = dy / len;

    let tx = Infinity;
    let ty = Infinity;

    if (Math.abs(ux) > 1e-6) {
      tx = (ux > 0 ? NODE_HALF_WIDTH + GAP : -NODE_HALF_WIDTH - GAP) / ux;
    }
    if (Math.abs(uy) > 1e-6) {
      ty = (uy > 0 ? NODE_HALF_HEIGHT + GAP : -NODE_HALF_HEIGHT - GAP) / uy;
    }

    let t;
    if (!isFinite(tx)) t = ty;
    else if (!isFinite(ty)) t = tx;
    else t = Math.min(Math.abs(tx), Math.abs(ty));

    return {
      x: center.x + ux * t,
      y: center.y + uy * t
    };
  }

  // 線の描画：ボタン端とボタン端を直線で接続
  SKILL_TREE_EDGES.forEach(edge => {
    const aPos = nodeCenterMap[edge.aId];
    const bPos = nodeCenterMap[edge.bId];
    if (!aPos || !bPos) return;

    const start = getEdgePoint(aPos, bPos);
    const end   = getEdgePoint(bPos, aPos);

    if (window.__SKILLTREE_DEBUG_LINES) {
      console.log("EDGE", edge.aId, "->", edge.bId, "start", start, "end", end);
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x.toString());
    line.setAttribute("y1", start.y.toString());
    line.setAttribute("x2", end.x.toString());
    line.setAttribute("y2", end.y.toString());
    line.setAttribute("data-edge-id", `${edge.aId}__${edge.bId}`);
    // line.setAttribute("mask", "url(#skillTreeLinesMask)"); // 今は未使用
    line.classList.add("skill-tree-edge");

    const aState = getSkillNodeState(getSkillNodeById(edge.aId));
    const bState = getSkillNodeState(getSkillNodeById(edge.bId));
    if (aState === "unlocked" && bState === "unlocked") {
      line.classList.add("edge-unlocked");
    } else if (aState === "unlockable" || bState === "unlockable") {
      line.classList.add("edge-unlockable");
    } else {
      line.classList.add("edge-locked");
    }

    const linesLayer2 = svg.querySelector("#skillTreeLinesLayer");
    if (linesLayer2) linesLayer2.appendChild(line);
  });

  if (!window.selectedSkillNodeId) {
    window.selectedSkillNodeId = "core_center_training";
  }
  const initFO = svg.querySelector(`foreignObject[data-node-id="${window.selectedSkillNodeId}"]`);
  if (initFO) initFO.classList.add("selected");
  updateSkillDetail();
  highlightNeighbors(window.selectedSkillNodeId);
  applySkillTreeFilter();
  renderSkillTreeSummary();
  enableSkillTreePan(); // ← 有効化
}

function selectSkillNode(nodeId) {
  window.selectedSkillNodeId = nodeId;

  const svg = document.getElementById("skillTreeSvg");
  if (svg) {
    svg.querySelectorAll("foreignObject").forEach(fo => fo.classList.remove("selected"));
    const targetFO = svg.querySelector(`foreignObject[data-node-id="${nodeId}"]`);
    if (targetFO) targetFO.classList.add("selected");
  }

  updateSkillDetail();
  highlightNeighbors(nodeId);
}

// 隣接ハイライト
function highlightNeighbors(centerId) {
  const center = getSkillNodeById(centerId);
  if (!center) return;

  const svg = document.getElementById("skillTreeSvg");
  if (!svg) return;

  const nodesLayer = document.getElementById("skillTreeNodesLayer");
  const linesLayer = document.getElementById("skillTreeLinesLayer");
  if (!nodesLayer || !linesLayer) return;

  const allFO = nodesLayer.querySelectorAll("foreignObject");
  allFO.forEach(fo => fo.classList.remove("neighbor"));

  SKILL_TREE_NODES.forEach(node => {
    if (node.id === center.id) return;
    const d = Math.abs(node.x - center.x) + Math.abs(node.y - center.y);
    if (d === 1) {
      const fo = nodesLayer.querySelector(`foreignObject[data-node-id="${node.id}"]`);
      if (fo) fo.classList.add("neighbor");
    }
  });

  const allLines = linesLayer.querySelectorAll("line");
  allLines.forEach(line => line.classList.remove("neighbor"));

  SKILL_TREE_EDGES.forEach(edge => {
    const isNeighborEdge = (edge.aId === center.id || edge.bId === center.id);
    if (!isNeighborEdge) return;
    const lineEl = linesLayer.querySelector(`line[data-edge-id="${edge.aId}__${edge.bId}"]`);
    if (lineEl) lineEl.classList.add("neighbor");
  });
}

// 詳細パネル
function updateSkillDetail() {
  const node = getSkillNodeById(window.selectedSkillNodeId);
  const nameEl  = document.getElementById("skillDetailName");
  const descEl  = document.getElementById("skillDetailDesc");
  const effEl   = document.getElementById("skillDetailEffect");
  const costEl  = document.getElementById("skillDetailCost");
  const errEl   = document.getElementById("skillDetailError");
  const btn     = document.getElementById("skillLearnButton");

  if (!node || !nameEl || !descEl || !effEl || !costEl || !btn) return;

  nameEl.textContent = node.name || "";
  descEl.textContent = node.desc || "";

  const e = node.effect || {};
  const effLines = [];
  if (e.hpMaxRate)                    effLines.push(`最大HP +${Math.round(e.hpMaxRate * 100)}%`);
  if (e.combatGuardReductionRate)     effLines.push(`被ダメージ -${Math.round(e.combatGuardReductionRate * 100)}%`);
  if (e.physSkillRate)                effLines.push(`物理スキルダメージ +${Math.round(e.physSkillRate * 100)}%`);
  if (e.magicSkillRate)               effLines.push(`魔法スキルダメージ +${Math.round(e.magicSkillRate * 100)}%`);
  if (e.petAtkRate)                   effLines.push(`ペット与ダメージ +${Math.round(e.petAtkRate * 100)}%`);
  if (e.combatPostBattleHpRate)       effLines.push(`戦闘勝利後に最大HPの${Math.round(e.combatPostBattleHpRate * 100)}%を追加回復`);
  if (e.moneyGainRateBattle)          effLines.push(`戦闘で得られるお金 +${Math.round(e.moneyGainRateBattle * 100)}%`);

  if (e.gatherAmountBonusRate)        effLines.push(`通常採取で得られる素材数 +${Math.round(e.gatherAmountBonusRate * 100)}%`);
  if (e.extraGatherBonusRateAdd)      effLines.push(`「たまに多めに取れる」発生率 +${Math.round(e.extraGatherBonusRateAdd * 100)}%`);
  if (e.gatherEquipBonusChanceAdd)    effLines.push(`採取装備ボーナス発生率 +${Math.round(e.gatherEquipBonusChanceAdd * 100)}%`);
  if (typeof e.gatherFailPenaltyRate === "number") {
    effLines.push(`採取失敗率補正 ×${e.gatherFailPenaltyRate.toFixed(2)}`);
  }

  if (e.craftCostReduceRate)          effLines.push(`クラフト時の中間素材消費量 -${Math.round(e.craftCostReduceRate * 100)}%`);
  if (e.craftIntermediateExtraChance) effLines.push(`中間素材クラフト時、+1個される確率 +${Math.round(e.craftIntermediateExtraChance * 100)}%`);
  if (e.craftQualityBonusRate)        effLines.push(`装備クラフト品質ロールにボーナス（+${Math.round(e.craftQualityBonusRate * 100)}%相当）`);

  if (e.sellPriceRate)                effLines.push(`売却価格 +${Math.round(e.sellPriceRate * 100)}%`);
  if (e.buyPriceReduceRate)           effLines.push(`購入価格 -${Math.round(e.buyPriceReduceRate * 100)}%`);
  if (e.gatherBaseUpgradeCostReduceRate) effLines.push(`採取拠点の強化コスト -${Math.round(e.gatherBaseUpgradeCostReduceRate * 100)}%`);
  if (e.gatherBaseStockMaxTicksAdd)   effLines.push(`自動採取ストック上限 +${e.gatherBaseStockMaxTicksAdd} tick`);

  effEl.textContent = effLines.length ? effLines.join(" / ") : "効果なし";

  const moneyNeed = node.costMoney || 0;
  const inter = node.costIntermediates || {};
  const costParts = [];
  if (moneyNeed > 0) costParts.push(`お金: ${moneyNeed}G`);
  if (inter && typeof intermediateMats === "object") {
    for (const iid in inter) {
      const need = inter[iid] || 0;
      const have = intermediateMats[iid] || 0;
      costParts.push(`${iid}: ${have} / ${need}`);
    }
  }
  costEl.textContent = costParts.length ? `必要コスト: ${costParts.join(" / ")}` : "コストなし";

  const unlocked = !!window.globalSkillTreeUnlocked[node.id];
  const err = getSkillNodeUnlockError(node);

  if (unlocked) {
    btn.textContent = "習得済み";
    btn.disabled = true;
    btn.onclick = null;
  } else if (!err) {
    btn.textContent = "習得する";
    btn.disabled = false;
    btn.onclick = () => learnSkillNode(node.id);
  } else {
    btn.textContent = "条件未達";
    btn.disabled = true;
    btn.onclick = null;
  }

  if (errEl) {
    errEl.textContent = unlocked ? "" : (err || "");
  }
}

// サマリ
function renderSkillTreeSummary() {
  const el = document.getElementById("skillTreeSummary");
  if (!el) return;
  const b = getGlobalSkillTreeBonus();
  const lines = [];

  if (b.hpMaxRate)              lines.push(`最大HP +${Math.round(b.hpMaxRate * 100)}%`);
  if (b.combatGuardReductionRate) lines.push(`被ダメ -${Math.round(b.combatGuardReductionRate * 100)}%`);
  if (b.physSkillRate || b.magicSkillRate) {
    lines.push(`スキル火力 物理+${Math.round(b.physSkillRate * 100)}% / 魔法+${Math.round(b.magicSkillRate * 100)}%`);
  }
  if (b.petAtkRate)             lines.push(`ペット火力 +${Math.round(b.petAtkRate * 100)}%`);
  if (b.combatPostBattleHpRate) lines.push(`戦闘後HP回復 ${Math.round(b.combatPostBattleHpRate * 100)}%`);

  if (b.gatherAmountBonusRate)  lines.push(`採取量 +${Math.round(b.gatherAmountBonusRate * 100)}%`);
  if (b.extraGatherBonusRateAdd) lines.push(`採取EXTRA率 +${Math.round(b.extraGatherBonusRateAdd * 100)}%`);
  if (b.gatherFailPenaltyRate !== 1.0) {
    lines.push(`採取失敗率 ×${b.gatherFailPenaltyRate.toFixed(2)}`);
  }

  if (b.craftCostReduceRate)    lines.push(`クラフト素材消費 -${Math.round(b.craftCostReduceRate * 100)}%`);
  if (b.craftIntermediateExtraChance) lines.push(`中間素材EXTRA +${Math.round(b.craftIntermediateExtraChance * 100)}%`);

  if (b.sellPriceRate)          lines.push(`売値 +${Math.round(b.sellPriceRate * 100)}%`);
  if (b.buyPriceReduceRate)     lines.push(`買値 -${Math.round(b.buyPriceReduceRate * 100)}%`);

  el.textContent = lines.length ? `スキルツリー効果: ${lines.join(" / ")}` : "スキルツリー効果: なし";
}

// =======================
// スキルツリーのドラッグパン＋ピンチズーム
// =======================
function enableSkillTreePan() {
  const svg = document.getElementById("skillTreeSvg");
  if (!svg) return;

  if (svg.__skillTreePanEnabled) return;
  svg.__skillTreePanEnabled = true;

  let isPanning = false;
  let startPoint = { x: 0, y: 0 };
  let startViewBox = null;

  // ピンチ用
  let isPinching = false;
  let pinchStartDist = 0;
  let pinchStartViewBox = null;

  function getViewBox() {
    const vb = svg.viewBox.baseVal;
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  }

  function setViewBox(vb) {
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }

  function getSvgPointFromEvent(event) {
    const pt = svg.createSVGPoint();
    if (event.touches && event.touches[0]) {
      pt.x = event.touches[0].clientX;
      pt.y = event.touches[0].clientY;
    } else {
      pt.x = event.clientX;
      pt.y = event.clientY;
    }
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    const svgP = pt.matrixTransform(inv);
    return { x: svgP.x, y: svgP.y };
  }

  function distanceTouches(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }

  function onPointerDown(e) {
    if (e.touches && e.touches.length === 2) {
      // ピンチ開始
      isPinching = true;
      isPanning = false;

      pinchStartDist = distanceTouches(e.touches[0], e.touches[1]);
      pinchStartViewBox = getViewBox();
      e.preventDefault();
      return;
    }

    if (e.touches && e.touches.length === 1) {
      // 1本指ドラッグでパン
      isPanning = true;
      isPinching = false;
      startPoint = getSvgPointFromEvent(e);
      startViewBox = getViewBox();
      e.preventDefault();
      return;
    }

    // マウス
    isPanning = true;
    isPinching = false;
    startPoint = getSvgPointFromEvent(e);
    startViewBox = getViewBox();
    e.preventDefault();
  }

  function onPointerMove(e) {
    // ピンチ中
    if (isPinching && e.touches && e.touches.length === 2 && pinchStartViewBox) {
      const newDist = distanceTouches(e.touches[0], e.touches[1]);
      if (!pinchStartDist) return;

      let scale = pinchStartDist / newDist; // 指が広がると newDist > start → scale < 1 → ズームイン
      // ズーム範囲の簡易制限
      scale = Math.max(0.4, Math.min(scale, 3.0));

      const vb = {
        x: pinchStartViewBox.x + (pinchStartViewBox.width  * (1 - scale)) / 2,
        y: pinchStartViewBox.y + (pinchStartViewBox.height * (1 - scale)) / 2,
        width:  pinchStartViewBox.width  * scale,
        height: pinchStartViewBox.height * scale
      };
      setViewBox(vb);
      e.preventDefault(); // ページ全体のズームを防ぐ
      return;
    }

    // パン中
    if (isPanning && startViewBox) {
      const p = getSvgPointFromEvent(e);
      const dx = p.x - startPoint.x;
      const dy = p.y - startPoint.y;

      const newVb = {
        x: startViewBox.x - dx,
        y: startViewBox.y - dy,
        width: startViewBox.width,
        height: startViewBox.height
      };
      setViewBox(newVb);
      e.preventDefault();
    }
  }

  function onPointerUp(e) {
    isPanning = false;

    if (e.touches && e.touches.length > 0) {
      // まだ指が残っている場合は、その本数に応じて状態を更新
      if (e.touches.length === 1) {
        isPinching = false;
        isPanning = true;
        startPoint = getSvgPointFromEvent(e);
        startViewBox = getViewBox();
      } else if (e.touches.length >= 2) {
        isPinching = true;
        pinchStartDist = distanceTouches(e.touches[0], e.touches[1]);
        pinchStartViewBox = getViewBox();
      }
    } else {
      isPinching = false;
    }
  }

  svg.addEventListener("mousedown", onPointerDown);
  svg.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);

  svg.addEventListener("touchstart", onPointerDown, { passive: false });
  svg.addEventListener("touchmove", onPointerMove, { passive: false });
  svg.addEventListener("touchend", onPointerUp);
  svg.addEventListener("touchcancel", onPointerUp);
}

// 初期化は呼び出し側で renderSkillTree("skillTreePanel") する想定