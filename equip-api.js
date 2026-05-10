// equip-api.js
// =======================
// 装備 API（倉庫・手持ちからの装備/付け替え）
// =======================

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

  // 旧装備品を倉庫に戻す
  if (hasInstances && window.equippedWeaponIndex != null) {
    const oldInst = window.weaponInstances[window.equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      if (typeof weaponCounts === "object") {
        weaponCounts[oldInst.id] = (weaponCounts[oldInst.id] || 0) + 1;
      }
    }
    window.equippedWeaponIndex = null;
    window.equippedWeaponId    = null;
  } else if (!hasInstances && window.equippedWeaponId) {
    weaponCounts[window.equippedWeaponId] = (weaponCounts[window.equippedWeaponId] || 0) + 1;
    window.equippedWeaponId = null;
  }

  if (!hasInstances) {
    // インスタンス未使用フォールバック
    if (!weaponCounts[weaponId] || weaponCounts[weaponId] <= 0) {
      appendLog("倉庫に装備可能な武器がない");
      return;
    }
    weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);
    window.equippedWeaponId = weaponId;
    appendLog("武器を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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
    appendLog("倉庫に装備可能な武器インスタンスが見つからない");
    return;
  }

  const inst = window.weaponInstances[idx];
  inst.location = "equipped";
  window.equippedWeaponIndex = idx;
  window.equippedWeaponId    = weaponId;

  if (typeof weaponCounts === "object") {
    weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);
  }

  appendLog("武器を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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

  // 旧装備品を倉庫に戻す
  if (hasInstances && window.equippedArmorIndex != null &&
      Array.isArray(window.armorInstances)) {
    const oldInst = window.armorInstances[window.equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      if (typeof armorCounts === "object") {
        armorCounts[oldInst.id] = (armorCounts[oldInst.id] || 0) + 1;
      }
    }
    window.equippedArmorIndex = null;
    window.equippedArmorId    = null;
  } else if (!hasInstances && window.equippedArmorId) {
    armorCounts[window.equippedArmorId] =
      (armorCounts[window.equippedArmorId] || 0) + 1;
    window.equippedArmorId = null;
  }

  if (!hasInstances) {
    // インスタンス未使用フォールバック
    if (!armorCounts[armorId] || armorCounts[armorId] <= 0) {
      appendLog("倉庫に装備可能な防具がない");
      return;
    }
    armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);
    window.equippedArmorId = armorId;
    appendLog("防具を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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
    appendLog("倉庫に装備可能な防具インスタンスが見つからない");
    return;
  }

  const inst = window.armorInstances[idx];
  inst.location = "equipped";
  window.equippedArmorIndex = idx;
  window.equippedArmorId    = armorId;

  if (typeof armorCounts === "object") {
    armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);
  }

  appendLog("防具を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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

  // 旧装備を手持ちに戻す
  if (hasInstances && window.equippedWeaponIndex != null) {
    const oldInst = window.weaponInstances[window.equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "carry";
    }
    window.equippedWeaponIndex = null;
    window.equippedWeaponId    = null;
  } else if (!hasInstances && window.equippedWeaponId) {
    const oldId = window.equippedWeaponId;
    if (typeof window.carryWeapons === "object") {
      window.carryWeapons[oldId] = (window.carryWeapons[oldId] || 0) + 1;
    }
    window.equippedWeaponId = null;
  }

  if (!hasInstances) {
    // インスタンス未使用フォールバック:
    // carryWeapons にあれば 1 本消費して装備IDにする
    if (!window.carryWeapons || !(window.carryWeapons[weaponId] > 0)) {
      appendLog("手持ちに装備可能な武器がない");
      return;
    }
    window.carryWeapons[weaponId] = Math.max(0, (window.carryWeapons[weaponId] || 0) - 1);
    if (window.carryWeapons[weaponId] <= 0) delete window.carryWeapons[weaponId];
    window.equippedWeaponId = weaponId;
    appendLog("武器を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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
    appendLog("手持ちに装備可能な武器がない");
    return;
  }

  const inst = window.weaponInstances[idx];
  inst.location = "equipped";
  window.equippedWeaponIndex = idx;
  window.equippedWeaponId    = weaponId;

  appendLog("武器を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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

  if (hasInstances && window.equippedArmorIndex != null) {
    const oldInst = window.armorInstances[window.equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "carry";
    }
    window.equippedArmorIndex = null;
    window.equippedArmorId    = null;
  } else if (!hasInstances && window.equippedArmorId) {
    const oldId = window.equippedArmorId;
    if (typeof window.carryArmors === "object") {
      window.carryArmors[oldId] = (window.carryArmors[oldId] || 0) + 1;
    }
    window.equippedArmorId = null;
  }

  if (!hasInstances) {
    if (!window.carryArmors || !(window.carryArmors[armorId] > 0)) {
      appendLog("手持ちに装備可能な防具がない");
      return;
    }
    window.carryArmors[armorId] = Math.max(0, (window.carryArmors[armorId] || 0) - 1);
    if (window.carryArmors[armorId] <= 0) delete window.carryArmors[armorId];
    window.equippedArmorId = armorId;
    appendLog("防具を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
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
    appendLog("手持ちに装備可能な防具がない");
    return;
  }

  const inst = window.armorInstances[idx];
  inst.location = "equipped";
  window.equippedArmorIndex = idx;
  window.equippedArmorId    = armorId;

  appendLog("防具を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
}