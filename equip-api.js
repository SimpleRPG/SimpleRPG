// equip-api.js
// =======================
// 装備 API（倉庫・手持ちからの装備/付け替え）
// =======================

// 共通後処理ヘルパー: ステ更新・在庫同期・UI更新
function afterEquipChange() {
  if (typeof recalcStats === "function") {
    recalcStats();
  }
  if (typeof syncEquipmentCountsFromInstances === "function" &&
      (Array.isArray(window.weaponInstances) || Array.isArray(window.armorInstances))) {
    syncEquipmentCountsFromInstances();
  }
  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }
}

// 装備許可証＆ギルドランクとTierの整合性チェック
function checkGuildRankForTier(itemId, inst) {
  let tier = 1;
  if (inst && typeof inst.tier === "number") {
    tier = inst.tier;
  } else if (typeof parseTieredId === "function") {
    const p = parseTieredId(itemId);
    if (p && p.tier) tier = p.tier;
  } else {
    const match = String(itemId || "").match(/(?:^T(\d+)_|_t(\d+)$)/i);
    if (match) tier = parseInt(match[1] || match[2], 10);
  }

  if (tier <= 1) return true;

  // 1. 装備許可証（ライセンス）チェック
  if (typeof hasEquipLicense === "function") {
    let wType = (typeof getWeaponTypeFromItemId === "function") ? getWeaponTypeFromItemId(itemId) : null;
    let aType = (typeof getArmorTypeFromItemId === "function") ? getArmorTypeFromItemId(itemId) : null;

    if (wType) {
      if (!hasEquipLicense("weapon", wType, tier)) {
        const wNames = { dagger: "短剣", sword: "片手剣", greatSword: "大剣", staff: "杖", runeSword: "魔剣", shield: "盾" };
        const typeName = wNames[wType] || "武器";
        const reqLv = (tier - 1) * 10;
        const curLv = (window.weaponSkills && window.weaponSkills[wType]) ? window.weaponSkills[wType].lv : 0;
        const cost = (typeof getEquipLicenseCost === "function") ? getEquipLicenseCost(tier) : 25;
        if (typeof appendLog === "function") {
          appendLog(`🔒【装備許可証が必要】Tier ${tier} の${typeName}を装備するには、ギルド交換所で「Tier ${tier} ${typeName}装備許可証」（🪙 ${cost}枚 / 必要: ${typeName}スキル Lv${reqLv}以上、現在: Lv${curLv}）を購入・習得してください。`);
        }
        return false;
      }
    } else if (aType) {
      if (!hasEquipLicense("armor", aType, tier)) {
        const aNames = { light: "軽装", medium: "中装", heavy: "重装" };
        const typeName = aNames[aType] || "防具";
        const reqLv = (tier - 1) * 10;
        const curLv = (window.armorSkills && window.armorSkills[aType]) ? window.armorSkills[aType].lv : 0;
        const cost = (typeof getEquipLicenseCost === "function") ? getEquipLicenseCost(tier) : 25;
        if (typeof appendLog === "function") {
          appendLog(`🔒【装備許可証が必要】Tier ${tier} の${typeName}を装備するには、ギルド交換所で「Tier ${tier} ${typeName}装備許可証」（🪙 ${cost}枚 / 必要: ${typeName}スキル Lv${reqLv}以上、現在: Lv${curLv}）を購入・習得してください。`);
        }
        return false;
      }
    }
  }

  return true;
}
window.checkGuildRankForTier = checkGuildRankForTier;

// 倉庫からの直接装備ヘルパー
function equipWeaponFromWarehouse(weaponId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!weaponId) return;

  const hasInstances = Array.isArray(window.weaponInstances);

  if (!hasInstances) {
    if (!checkGuildRankForTier(weaponId)) return;
    // インスタンス未使用フォールバック
    if (!weaponCounts[weaponId] || weaponCounts[weaponId] <= 0) {
      if (typeof appendLog === "function") {
        appendLog("倉庫に装備可能な武器がない");
      }
      return;
    }
    // 旧装備品を倉庫に戻す
    if (window.equippedWeaponId) {
      if (typeof weaponCounts === "object") {
        weaponCounts[window.equippedWeaponId] =
          (weaponCounts[window.equippedWeaponId] || 0) + 1;
      }
      window.equippedWeaponId = null;
    }
    weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);
    window.equippedWeaponId = weaponId;
    if (typeof appendLog === "function") {
      appendLog("武器を装備した。");
    }
    afterEquipChange();
    return;
  }

  // 倉庫(location: warehouse)にあるインスタンスから1本だけ装備にする
  let idx = -1;
  for (let i = 0; i < window.weaponInstances.length; i++) {
    const inst = window.weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "warehouse") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    if (typeof appendLog === "function") {
      appendLog("倉庫に装備可能な武器インスタンスが見つからない");
    }
    return;
  }

  const targetInst = window.weaponInstances[idx];
  if (!checkGuildRankForTier(weaponId, targetInst)) return;

  // 旧装備品を倉庫に戻す
  if (window.equippedWeaponIndex != null) {
    const oldInst = window.weaponInstances[window.equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      if (typeof weaponCounts === "object") {
        weaponCounts[oldInst.id] = (weaponCounts[oldInst.id] || 0) + 1;
      }
    }
    window.equippedWeaponIndex = null;
    window.equippedWeaponId    = null;
  }

  targetInst.location = "equipped";
  window.equippedWeaponIndex = idx;
  window.equippedWeaponId    = weaponId;

  if (typeof weaponCounts === "object") {
    weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);
  }

  if (typeof appendLog === "function") {
    appendLog("武器を装備した。");
  }
  afterEquipChange();
}

function equipArmorFromWarehouse(armorId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!armorId) return;

  const hasInstances = Array.isArray(window.armorInstances);

  if (!hasInstances) {
    if (!checkGuildRankForTier(armorId)) return;
    // インスタンス未使用フォールバック
    if (!armorCounts[armorId] || armorCounts[armorId] <= 0) {
      if (typeof appendLog === "function") {
        appendLog("倉庫に装備可能な防具がない");
      }
      return;
    }
    if (window.equippedArmorId) {
      if (typeof armorCounts === "object") {
        armorCounts[window.equippedArmorId] =
          (armorCounts[window.equippedArmorId] || 0) + 1;
      }
      window.equippedArmorId = null;
    }
    armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);
    window.equippedArmorId = armorId;
    if (typeof appendLog === "function") {
      appendLog("防具を装備した。");
    }
    afterEquipChange();
    return;
  }

  let idx = -1;
  for (let i = 0; i < window.armorInstances.length; i++) {
    const inst = window.armorInstances[i];
    if (!inst || inst.id !== armorId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "warehouse") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    if (typeof appendLog === "function") {
      appendLog("倉庫に装備可能な防具インスタンスが見つからない");
    }
    return;
  }

  const targetInst = window.armorInstances[idx];
  if (!checkGuildRankForTier(armorId, targetInst)) return;

  // 旧装備品を倉庫に戻す
  if (window.equippedArmorIndex != null) {
    const oldInst = window.armorInstances[window.equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      if (typeof armorCounts === "object") {
        armorCounts[oldInst.id] = (armorCounts[oldInst.id] || 0) + 1;
      }
    }
    window.equippedArmorIndex = null;
    window.equippedArmorId    = null;
  }

  targetInst.location = "equipped";
  window.equippedArmorIndex = idx;
  window.equippedArmorId    = armorId;

  if (typeof armorCounts === "object") {
    armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);
  }

  if (typeof appendLog === "function") {
    appendLog("防具を装備した。");
  }
  afterEquipChange();
}

// 手持ちからの装備ヘルパー
function equipWeaponFromCarry(weaponId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!weaponId) return;

  const hasInstances = Array.isArray(window.weaponInstances);

  if (!hasInstances) {
    if (!checkGuildRankForTier(weaponId)) return;
    if (!window.carryWeapons || !(window.carryWeapons[weaponId] > 0)) {
      if (typeof appendLog === "function") {
        appendLog("手持ちに装備可能な武器がない");
      }
      return;
    }
    // 旧装備を手持ちに戻す
    if (window.equippedWeaponId) {
      const oldId = window.equippedWeaponId;
      if (typeof window.carryWeapons === "object") {
        window.carryWeapons[oldId] = (window.carryWeapons[oldId] || 0) + 1;
      }
      window.equippedWeaponId = null;
    }
    window.carryWeapons[weaponId] =
      Math.max(0, (window.carryWeapons[weaponId] || 0) - 1);
    if (window.carryWeapons[weaponId] <= 0) {
      delete window.carryWeapons[weaponId];
    }
    window.equippedWeaponId = weaponId;
    if (typeof appendLog === "function") {
      appendLog("武器を装備した。");
    }
    afterEquipChange();
    return;
  }

  // インスタンスあり: carry から指定IDのインスタンスを1本探して装備
  let idx = -1;
  for (let i = 0; i < window.weaponInstances.length; i++) {
    const inst = window.weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "carry") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    if (typeof appendLog === "function") {
      appendLog("手持ちに装備可能な武器がない");
    }
    return;
  }

  const targetInst = window.weaponInstances[idx];
  if (!checkGuildRankForTier(weaponId, targetInst)) return;

  // 旧装備を手持ちに戻す
  if (window.equippedWeaponIndex != null) {
    const oldInst = window.weaponInstances[window.equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "carry";
    }
    window.equippedWeaponIndex = null;
    window.equippedWeaponId    = null;
  }

  targetInst.location = "equipped";
  window.equippedWeaponIndex = idx;
  window.equippedWeaponId    = weaponId;

  if (typeof appendLog === "function") {
    appendLog("武器を装備した。");
  }
  afterEquipChange();
}

function equipArmorFromCarry(armorId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!armorId) return;

  const hasInstances = Array.isArray(window.armorInstances);

  if (!hasInstances) {
    if (!checkGuildRankForTier(armorId)) return;
    if (!window.carryArmors || !(window.carryArmors[armorId] > 0)) {
      if (typeof appendLog === "function") {
        appendLog("手持ちに装備可能な防具がない");
      }
      return;
    }
    if (window.equippedArmorId) {
      const oldId = window.equippedArmorId;
      if (typeof window.carryArmors === "object") {
        window.carryArmors[oldId] = (window.carryArmors[oldId] || 0) + 1;
      }
      window.equippedArmorId = null;
    }
    window.carryArmors[armorId] =
      Math.max(0, (window.carryArmors[armorId] || 0) - 1);
    if (window.carryArmors[armorId] <= 0) {
      delete window.carryArmors[armorId];
    }
    window.equippedArmorId = armorId;
    if (typeof appendLog === "function") {
      appendLog("防具を装備した。");
    }
    afterEquipChange();
    return;
  }

  let idx = -1;
  for (let i = 0; i < window.armorInstances.length; i++) {
    const inst = window.armorInstances[i];
    if (!inst || inst.id !== armorId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "carry") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    if (typeof appendLog === "function") {
      appendLog("手持ちに装備可能な防具がない");
    }
    return;
  }

  const targetInst = window.armorInstances[idx];
  if (!checkGuildRankForTier(armorId, targetInst)) return;

  // 旧装備を手持ちに戻す
  if (window.equippedArmorIndex != null) {
    const oldInst = window.armorInstances[window.equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "carry";
    }
    window.equippedArmorIndex = null;
    window.equippedArmorId    = null;
  }

  targetInst.location = "equipped";
  window.equippedArmorIndex = idx;
  window.equippedArmorId    = armorId;

  if (typeof appendLog === "function") {
    appendLog("防具を装備した。");
  }
  afterEquipChange();
}