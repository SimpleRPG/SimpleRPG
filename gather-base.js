// gather-base.js
// 採取拠点・自動採取システム

// =======================
// 採取拠点・自動採取
// =======================

const GATHER_BASE_MATERIAL_KEYS = ["wood","ore","herb","cloth","leather","water"];

const GATHER_SKILL_LABEL_JA = {
  wood:   "木",
  ore:    "鉱石",
  herb:   "草",
  cloth:  "布",
  leather:"皮",
  water:  "水"
};
function getGatherSkillLabel(matKey) {
  return GATHER_SKILL_LABEL_JA[matKey] || matKey;
}

const gatherBases = {};
GATHER_BASE_MATERIAL_KEYS.forEach(k => {
  gatherBases[k] = { level: 0, mode: "normal" };
});

const GATHER_BASE_LEVEL_TABLE = {
  1: {
    failRate: 0.5,
    t1Min: 0,
    t1Max: 1,
    t2Chance: 0.0,
    t2Amount: 0
  },
  2: {
    failRate: 0.2,
    t1Min: 1,
    t1Max: 2,
    t2Chance: 0.0,
    t2Amount: 0
  },
  3: {
    failRate: 0.1,
    t1Min: 1,
    t1Max: 3,
    t2Chance: 0.1,
    t2Amount: 1
  }
};

function getGatherBaseLevel(matKey) {
  const base = gatherBases[matKey];
  return base ? (base.level || 0) : 0;
}

function setGatherBaseLevel(matKey, level) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) return;
  const lv = Math.max(0, Math.min(3, level | 0));
  gatherBases[matKey] = gatherBases[matKey] || {};
  gatherBases[matKey].level = lv;
  if (!gatherBases[matKey].mode) {
    gatherBases[matKey].mode = "normal";
  }
}

function getGatherBaseMode(matKey) {
  const base = gatherBases[matKey];
  return base && base.mode ? base.mode : "normal";
}

function setGatherBaseMode(matKey, mode) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) return;
  if (mode !== "normal" && mode !== "quantity" && mode !== "quality") return;
  gatherBases[matKey] = gatherBases[matKey] || { level: 0 };
  gatherBases[matKey].mode = mode;
  const label = getGatherSkillLabel(matKey);
  if (mode === "normal") {
    appendLog(`採取拠点(${label})の方針をノーマルに戻した。`);
  } else if (mode === "quantity") {
    appendLog(`採取拠点(${label})の方針を量特化に変更した。`);
  } else if (mode === "quality") {
    appendLog(`採取拠点(${label})の方針を質特化に変更した。`);
  }
}

function logGatherBaseRequiredMats(matKey, currentLv, nextLv, needInter, needStar) {
  let lines = [];
  const label = getGatherSkillLabel(matKey);
  lines.push(`採取拠点(${label}) Lv${currentLv} → Lv${nextLv} に必要な中間素材:`);
  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    const have = intermediateMats[iid] || 0;
    lines.push(`- ${iid}: 必要 ${need} 個 / 所持 ${have} 個`);
  }
  if (needStar > 0) {
    const haveStar = getStarShardCountForGather();
    lines.push(`- ${RARE_GATHER_ITEM_ID}: 必要 ${needStar} 個 / 所持 ${haveStar} 個`);
  }
  appendLog(lines.join("\n"));
}

// =======================
// 星屑（採取拠点強化用）ヘルパー（ITEM_META 版）
// =======================

function getStarShardCountForGather() {
  if (typeof getItemCountByMeta !== "function") return 0;
  return getItemCountByMeta(RARE_GATHER_ITEM_ID) || 0;
}

function consumeStarShardForGather(num) {
  num = num || 0;
  if (num <= 0) return true;
  if (typeof consumeItemByMeta !== "function") return false;
  return consumeItemByMeta(RARE_GATHER_ITEM_ID, num);
}

const GATHER_BASE_UPGRADE_DATA = {
  wood: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { woodPlank_T1: 10, clothBolt_T1: 5, toughLeather_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { woodPlank_T2: 15, clothBolt_T2: 8, toughLeather_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { woodPlank_T3: 20, clothBolt_T3: 10, toughLeather_T3: 10 },
        starShard: 1
      }
    }
  },
  ore: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { ironIngot_T1: 10, woodPlank_T1: 5, clothBolt_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { ironIngot_T2: 15, woodPlank_T2: 8, clothBolt_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { ironIngot_T3: 20, woodPlank_T3: 10, clothBolt_T3: 10 },
        starShard: 1
      }
    }
  },
  herb: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { clothBolt_T1: 8, woodPlank_T1: 4, toughLeather_T1: 4 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { clothBolt_T2: 12, woodPlank_T2: 6, toughLeather_T2: 6 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { clothBolt_T3: 16, woodPlank_T3: 8, toughLeather_T3: 8 },
        starShard: 1
      }
    }
  },
  cloth: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { clothBolt_T1: 10, toughLeather_T1: 5, woodPlank_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { clothBolt_T2: 15, toughLeather_T2: 8, woodPlank_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { clothBolt_T3: 20, toughLeather_T3: 10, woodPlank_T3: 10 },
        starShard: 1
      }
    }
  },
  leather: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { toughLeather_T1: 10, clothBolt_T1: 5, ironIngot_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { toughLeather_T2: 15, clothBolt_T2: 8, ironIngot_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { toughLeather_T3: 20, clothBolt_T3: 10, ironIngot_T3: 10 },
        starShard: 1
      }
    }
  },
  water: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { ironIngot_T1: 6, clothBolt_T1: 4, toughLeather_T1: 4 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { ironIngot_T2: 10, clothBolt_T2: 6, toughLeather_T2: 6 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { ironIngot_T3: 14, clothBolt_T3: 8, toughLeather_T3: 8 },
        starShard: 1
      }
    }
  }
};

function tryUpgradeGatherBase(matKey) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) {
    appendLog("この素材には採取拠点はない。");
    return;
  }
  const currentLv = getGatherBaseLevel(matKey);
  if (currentLv >= 3) {
    appendLog("これ以上この拠点は強化できない。");
    return;
  }

  const nextLv = currentLv + 1;
  const defAll = GATHER_BASE_UPGRADE_DATA[matKey];
  if (!defAll) {
    appendLog("この拠点の強化データが存在しない。");
    return;
  }
  const def = defAll[nextLv];
  if (!def) {
    appendLog("このレベルの強化データが存在しない。");
    return;
  }

  if (!gatherSkills || !gatherSkills[matKey]) {
    appendLog("採取スキルデータが見つからない。");
    return;
  }
  const skLv = gatherSkills[matKey].lv || 0;
  if (skLv < def.reqGatherLv) {
    const labelNeed = getGatherSkillLabel(matKey);
    appendLog(`この拠点をLv${nextLv}にするには、採取スキル(${labelNeed}) Lv${def.reqGatherLv}が必要だ。`);
    return;
  }

  const baseNeedInter = def.costs.intermediate || {};
  const needStar      = def.costs.starShard || 0;

  if (!intermediateMats) {
    appendLog("中間素材の所持データが見つからない。");
    return;
  }

  let costReduceRate = 0;
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    costReduceRate = b.gatherBaseUpgradeCostReduceRate || 0;
  }

  const needInter = {};
  for (const iid in baseNeedInter) {
    const baseNeed = baseNeedInter[iid] || 0;
    if (baseNeed <= 0) continue;
    if (costReduceRate > 0) {
      const reduced = Math.ceil(baseNeed * (1 - costReduceRate));
      needInter[iid] = Math.max(1, reduced);
    } else {
      needInter[iid] = baseNeed;
    }
  }

  logGatherBaseRequiredMats(matKey, currentLv, nextLv, needInter, needStar);

  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    const have = intermediateMats[iid] || 0;
    if (have < need) {
      appendLog(`中間素材が足りない：${iid} があと ${need - have} 個必要だ。`);
      return;
    }
  }

  if (needStar > 0) {
    const haveStar = getStarShardCountForGather();
    if (haveStar < needStar) {
      appendLog(`星屑の結晶が足りない（必要: ${needStar} 個）。`);
      return;
    }
  }

  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    intermediateMats[iid] = (intermediateMats[iid] || 0) - need;
    if (intermediateMats[iid] < 0) intermediateMats[iid] = 0;
  }

  if (needStar > 0) {
    if (!consumeStarShardForGather(needStar)) {
      appendLog("星屑の結晶の消費に失敗した（在庫不足？）");
      return;
    }
  }

  setGatherBaseLevel(matKey, nextLv);
  const label = getGatherSkillLabel(matKey);
  appendLog(`採取拠点(${label})がLv${nextLv}になった！`);

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 自動採取ストック（6時間=72tick 上限）
// =======================

let gatherBaseStockMaxBonusTicks = 0;

function refreshGatherBaseStockBonus() {
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    gatherBaseStockMaxBonusTicks = b.gatherBaseStockMaxTicksAdd || 0;
  } else {
    gatherBaseStockMaxBonusTicks = 0;
  }
}

const GATHER_BASE_STOCK_BASE_TICKS = 72;
function getGatherBaseStockMaxTicks() {
  const extra = gatherBaseStockMaxBonusTicks || 0;
  return Math.max(GATHER_BASE_STOCK_BASE_TICKS, GATHER_BASE_STOCK_BASE_TICKS + extra);
}

let gatherBaseStockTicks = 0;

function consumeGatherBaseStockTick() {
  if (gatherBaseStockTicks <= 0) return;
  gatherBaseStockTicks--;
  tickGatherBasesOnce();
}

function tickGatherBasesOnceStocked() {
  refreshGatherBaseStockBonus();

  const maxTicks = getGatherBaseStockMaxTicks();
  if (gatherBaseStockTicks < maxTicks) {
    gatherBaseStockTicks++;
  }
  consumeGatherBaseStockTick();
}

function tickGatherBasesOnce() {
  if (!materials) return;

  GATHER_BASE_MATERIAL_KEYS.forEach(matKey => {
    const lv = getGatherBaseLevel(matKey);
    if (lv <= 0) return;

    const conf = GATHER_BASE_LEVEL_TABLE[lv];
    if (!conf) return;

    const baseFail    = conf.failRate;
    let t1Min         = conf.t1Min;
    let t1Max         = conf.t1Max;
    let t2Chance      = conf.t2Chance;
    const t2Amount    = conf.t2Amount;

    const base = gatherBases[matKey] || {};
    const mode = base.mode || "normal";

    if (mode === "quantity") {
      t1Min = Math.max(0, t1Min + 1);
      t1Max = t1Max + 1;
      t2Chance = Math.max(0, t2Chance - 0.03);
    } else if (mode === "quality") {
      t1Min = Math.max(0, t1Min - 1);
      t1Max = Math.max(t1Min, t1Max - 1);
      t2Chance = Math.min(1, t2Chance + 0.05);
    }

    if (Math.random() < baseFail) {
      return;
    }

    const t1Amount = t1Min + Math.floor(Math.random() * (t1Max - t1Min + 1));
    if (t1Amount > 0) {
      if (typeof addMatTierCount === "function") {
        addMatTierCount(matKey, 1, t1Amount);
      } else if (typeof materials[matKey] !== "undefined") {
        const arr = materials[matKey];
        if (Array.isArray(arr)) {
          arr[0] = (arr[0] || 0) + t1Amount;
        } else {
          materials[matKey].t1 = (materials[matKey].t1 || 0) + t1Amount;
        }
      }
    }

    if (t2Chance > 0 && Math.random() < t2Chance && t2Amount > 0) {
      if (typeof addMatTierCount === "function") {
        addMatTierCount(matKey, 2, t2Amount);
      } else if (typeof materials[matKey] !== "undefined") {
        const arr = materials[matKey];
        if (Array.isArray(arr)) {
          arr[1] = (arr[1] || 0) + t2Amount;
        } else {
          materials[matKey].t2 = (materials[matKey].t2 || 0) + t2Amount;
        }
      }
    }
  });

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

let _gatherBaseTimerStarted = false;
function startGatherBaseTimerIfNeeded() {
  if (_gatherBaseTimerStarted) return;
  _gatherBaseTimerStarted = true;

  const FIVE_MIN_MS = 5 * 60 * 1000;

  setInterval(() => {
    tickGatherBasesOnceStocked();
  }, FIVE_MIN_MS);
}

startGatherBaseTimerIfNeeded();