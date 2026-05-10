// equip-enhance.js
// =======================
// 強化ターゲットセレクトと強化ロジック
// =======================

// =======================
// 強化用確認モーダルユーティリティ
// =======================

let enhanceConfirmOkHandler = null;
let enhanceConfirmInitialized = false;

function initEnhanceConfirmModal() {
  if (enhanceConfirmInitialized) return;
  enhanceConfirmInitialized = true;

  const modal   = document.getElementById("enhanceConfirmModal");
  const msgEl   = document.getElementById("enhanceConfirmMessage");
  const okBtn   = document.getElementById("enhanceConfirmOkBtn");
  const cancelBtn = document.getElementById("enhanceConfirmCancelBtn");

  if (!modal || !msgEl || !okBtn || !cancelBtn) {
    console.warn("enhance-confirm modal elements not found");
    return;
  }

  okBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    const handler = enhanceConfirmOkHandler;
    enhanceConfirmOkHandler = null;
    if (typeof handler === "function") {
      handler();
    }
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    enhanceConfirmOkHandler = null;
  });

  // 背景クリックで閉じる（お好みで無効化可）
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      enhanceConfirmOkHandler = null;
    }
  });
}

/**
 * 強化用の確認モーダルを開く。
 * @param {string} message - 表示するメッセージ
 * @param {Function} onOk - 「使う」ボタン押下時に実行する処理
 */
function openEnhanceConfirm(message, onOk) {
  initEnhanceConfirmModal();

  const modal = document.getElementById("enhanceConfirmModal");
  const msgEl = document.getElementById("enhanceConfirmMessage");
  const okBtn = document.getElementById("enhanceConfirmOkBtn");
  const cancelBtn = document.getElementById("enhanceConfirmCancelBtn");

  if (!modal || !msgEl || !okBtn || !cancelBtn) {
    // モーダルがない場合は従来どおり即実行しておく（フェイルセーフ）
    if (typeof onOk === "function") {
      onOk();
    }
    return;
  }

  msgEl.textContent = message || "本当に素材にしますか？";
  enhanceConfirmOkHandler = typeof onOk === "function" ? onOk : null;
  modal.classList.remove("hidden");
}

// =======================
// 強化ターゲットセレクトとスコアリング
// =======================

function makeWeaponInstanceKey(index, inst) {
  return `W:${index}`;
}

function makeArmorInstanceKey(index, inst) {
  return `A:${index}`;
}

function parseEnhanceTargetKey(key) {
  if (!key || typeof key !== "string") return null;
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const type = parts[0];
  const idx  = parseInt(parts[1], 10);
  if (!Number.isInteger(idx) || idx < 0) return null;
  return { type, index: idx };
}

function refreshEnhanceTargetSelects(prevWeaponKey, prevArmorKey) {
  const wSel = document.getElementById("enhanceWeaponTargetSelect");
  const aSel = document.getElementById("enhanceArmorTargetSelect");

  if (wSel) {
    wSel.innerHTML = "";
    if (!Array.isArray(weaponInstances) || weaponInstances.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "強化できる武器がない";
      wSel.appendChild(opt);
    } else {
      weaponInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const key = makeWeaponInstanceKey(i, inst);

        // 共通ラベルヘルパーを利用（品質・接頭語・耐久・desc まで）
        const label = typeof buildWeaponLabelFromInstance === "function"
          ? buildWeaponLabelFromInstance(inst)
          : inst.id;

        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        wSel.appendChild(opt);
      });

      if (prevWeaponKey &&
          Array.from(wSel.options).some(o => o.value === prevWeaponKey)) {
        wSel.value = prevWeaponKey;
      } else if (!wSel.value && wSel.options.length > 0) {
        wSel.selectedIndex = 0;
      }
    }
  }

  if (aSel) {
    aSel.innerHTML = "";
    if (!Array.isArray(armorInstances) || armorInstances.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "強化できる防具がない";
      aSel.appendChild(opt);
    } else {
      armorInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const key = makeArmorInstanceKey(i, inst);

        const label = typeof buildArmorLabelFromInstance === "function"
          ? buildArmorLabelFromInstance(inst)
          : inst.id;

        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        aSel.appendChild(opt);
      });

      if (prevArmorKey &&
          Array.from(aSel.options).some(o => o.value === prevArmorKey)) {
        aSel.value = prevArmorKey;
      } else if (!aSel.value && aSel.options.length > 0) {
        aSel.selectedIndex = 0;
      }
    }
  }
}

// ★ 強化候補スコアリング（良品質・高強化・高Tierを優先）
function scoreEnhanceCandidateForWeapon(inst) {
  if (!inst || !inst.id) return -9999;
  const base = weapons.find(w => w.id === inst.id);
  if (!base) return -9999;
  const q   = inst.quality || 0;
  const enh = inst.enhance || 0;

  let tierScore = 0;
  const m = String(inst.id).match(/_T(\d)/);
  if (m) {
    const t = parseInt(m[1], 10);
    if (!isNaN(t)) tierScore = t * 5;
  }

  return tierScore + q * 10 + enh * 8;
}

function scoreEnhanceCandidateForArmor(inst) {
  if (!inst || !inst.id) return -9999;
  const base = armors.find(a => a.id === inst.id);
  if (!base) return -9999;
  const q   = inst.quality || 0;
  const enh = inst.enhance || 0;

  let tierScore = 0;
  const m = String(inst.id).match(/_T(\d)/);
  if (m) {
    const t = parseInt(m[1], 10);
    if (!isNaN(t)) tierScore = t * 5;
  }

  return tierScore + q * 10 + enh * 8;
}

// ★ 強化対象の自動選択（ユーザーが明示選択していない場合のみ）
function autoSelectBestEnhanceTargets() {
  const wSel = document.getElementById("enhanceWeaponTargetSelect");
  const aSel = document.getElementById("enhanceArmorTargetSelect");

  // 武器
  if (wSel && Array.isArray(weaponInstances) && weaponInstances.length > 0) {
    const hasUserSelection = wSel.value && wSel.value !== "";
    if (!hasUserSelection) {
      let bestIndex = -1;
      let bestScore = -99999;
      weaponInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const loc = inst.location || "warehouse";
        if (loc !== "warehouse" && loc !== "equipped" && loc !== "carry") return;
        const s = scoreEnhanceCandidateForWeapon(inst);
        if (s > bestScore) {
          bestScore = s;
          bestIndex = i;
        }
      });
      if (bestIndex >= 0) {
        const key = makeWeaponInstanceKey(bestIndex, weaponInstances[bestIndex]);
        if (Array.from(wSel.options).some(o => o.value === key)) {
          wSel.value = key;
        }
      }
    }
  }

  // 防具
  if (aSel && Array.isArray(armorInstances) && armorInstances.length > 0) {
    const hasUserSelection = aSel.value && aSel.value !== "";
    if (!hasUserSelection) {
      let bestIndex = -1;
      let bestScore = -99999;
      armorInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const loc = inst.location || "warehouse";
        if (loc !== "warehouse" && loc !== "equipped" && loc !== "carry") return;
        const s = scoreEnhanceCandidateForArmor(inst);
        if (s > bestScore) {
          bestScore = s;
          bestIndex = i;
        }
      });
      if (bestIndex >= 0) {
        const key = makeArmorInstanceKey(bestIndex, armorInstances[bestIndex]);
        if (Array.from(aSel.options).some(o => o.value === key)) {
          aSel.value = key;
        }
      }
    }
  }
}

function consumeOneWeaponInstanceAsMaterial(weaponId){
  let usedQuality = 0;
  let usedEnh = 0;
  for (let i = 0; i < weaponInstances.length; i++) {
    const inst = weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;

    const loc = inst.location || "warehouse";
    if (loc !== "warehouse") continue;
    if (typeof equippedWeaponIndex === "number" &&
        equippedWeaponIndex === i) continue;

    usedQuality = inst.quality || 0;
    usedEnh     = inst.enhance || 0;

    // インスタンス削除
    weaponInstances.splice(i, 1);
    // 装備中インデックスが後ろにある場合は1つ前に詰める
    if (typeof window.equippedWeaponIndex === "number" &&
        window.equippedWeaponIndex > i) {
      window.equippedWeaponIndex--;
    }

    weaponCounts[weaponId] =
      Math.max(0, (weaponCounts[weaponId] || 0) - 1);

    if (usedQuality > 0 || usedEnh > 0) {
      appendLog("※良品/傑作/強化済みの武器を素材として消費した");
    }
    return true;
  }
  return false;
}

function consumeOneArmorInstanceAsMaterial(armorId){
  let usedQuality = 0;
  let usedEnh = 0;
  for (let i = 0; i < armorInstances.length; i++) {
    const inst = armorInstances[i];
    if (!inst || inst.id !== armorId) continue;

    const loc = inst.location || "warehouse";
    if (loc !== "warehouse") continue;
    if (typeof equippedArmorIndex === "number" &&
        equippedArmorIndex === i) continue;

    usedQuality = inst.quality || 0;
    usedEnh     = inst.enhance || 0;

    // インスタンス削除
    armorInstances.splice(i, 1);
    // 装備中インデックスが後ろにある場合は1つ前に詰める
    if (typeof window.equippedArmorIndex === "number" &&
        window.equippedArmorIndex > i) {
      window.equippedArmorIndex--;
    }

    armorCounts[armorId] =
      Math.max(0, (armorCounts[armorId] || 0) - 1);

    if (usedQuality > 0 || usedEnh > 0) {
      appendLog("※良品/傑作/強化済みの防具を素材として消費した");
    }
    return true;
  }
  return false;
}

function getWeaponInstanceByKey(key) {
  const parsed = parseEnhanceTargetKey(key);
  if (!parsed || parsed.type !== "W") return null;
  if (!Array.isArray(weaponInstances)) return null;
  const inst = weaponInstances[parsed.index];
  if (!inst) return null;
  return { inst, index: parsed.index };
}

function getArmorInstanceByKey(key) {
  const parsed = parseEnhanceTargetKey(key);
  if (!parsed || parsed.type !== "A") return null;
  if (!Array.isArray(armorInstances)) return null;
  const inst = armorInstances[parsed.index];
  if (!inst) return null;
  return { inst, index: parsed.index };
}

// =======================
// 星屑（強化用）ヘルパー（ITEM_META 版）
// =======================

function getStarShardCount() {
  // 星屑の結晶は ITEM_META で RARE_GATHER_ITEM_ID として登録されている前提
  if (typeof getItemCountByMeta !== "function") return 0;
  return getItemCountByMeta(RARE_GATHER_ITEM_ID) || 0;
}

function consumeStarShard(num) {
  num = num || STAR_SHARD_NEED_NUM;
  if (num <= 0) return true;
  if (typeof consumeItemByMeta !== "function") return false;
  return consumeItemByMeta(RARE_GATHER_ITEM_ID, num);
}

// =======================
// 内部ヘルパー: 危険素材の事前チェック
// =======================

// 武器用: materialInst が指定されていればそれをチェック、なければ倉庫からの自動候補に良品/強化済みがあるか
function findDangerousWeaponMaterialInst(weaponId, materialInst) {
  if (!Array.isArray(weaponInstances)) return null;

  if (materialInst) {
    const q = materialInst.quality || 0;
    const e = materialInst.enhance || 0;
    if (q > 0 || e > 0) return materialInst;
    return null;
  }

  for (let i = 0; i < weaponInstances.length; i++) {
    const inst = weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;
    const loc = inst.location || "warehouse";
    if (loc !== "warehouse") continue;
    if (typeof equippedWeaponIndex === "number" &&
        equippedWeaponIndex === i) continue;
    const q = inst.quality || 0;
    const e = inst.enhance || 0;
    if (q > 0 || e > 0) {
      return inst;
    }
  }
  return null;
}

function findDangerousArmorMaterialInst(armorId, materialInst) {
  if (!Array.isArray(armorInstances)) return null;

  if (materialInst) {
    const q = materialInst.quality || 0;
    const e = materialInst.enhance || 0;
    if (q > 0 || e > 0) return materialInst;
    return null;
  }

  for (let i = 0; i < armorInstances.length; i++) {
    const inst = armorInstances[i];
    if (!inst || inst.id !== armorId) continue;
    const loc = inst.location || "warehouse";
    if (loc !== "warehouse") continue;
    if (typeof equippedArmorIndex === "number" &&
        equippedArmorIndex === i) continue;
    const q = inst.quality || 0;
    const e = inst.enhance || 0;
    if (q > 0 || e > 0) {
      return inst;
    }
  }
  return null;
}

// =======================
// 強化ロジック
// =======================

// ★指定インデックスの武器インスタンスを素材として消費する（ターゲットと同一なら拒否）
function consumeWeaponInstanceAtIndexForMaterial(index, targetIndex, weaponId) {
  if (!Array.isArray(weaponInstances)) return false;
  if (index < 0 || index >= weaponInstances.length) return false;
  if (typeof targetIndex === "number" && index === targetIndex) {
    appendLog("強化対象と同じ武器を素材にはできません");
    return false;
  }

  const inst = weaponInstances[index];
  if (!inst || inst.id !== weaponId) return false;
  const loc = inst.location || "warehouse";
  if (loc !== "warehouse") return false;

  const usedQuality = inst.quality || 0;
  const usedEnh     = inst.enhance || 0;

  weaponInstances.splice(index, 1);
  if (typeof window.equippedWeaponIndex === "number" &&
      window.equippedWeaponIndex > index) {
    window.equippedWeaponIndex--;
  }

  weaponCounts[weaponId] =
    Math.max(0, (weaponCounts[weaponId] || 0) - 1);

  if (usedQuality > 0 || usedEnh > 0) {
    appendLog("※良品/傑作/強化済みの武器を素材として消費した");
  }
  return true;
}

// ★指定インデックスの防具インスタンスを素材として消費する
function consumeArmorInstanceAtIndexForMaterial(index, targetIndex, armorId) {
  if (!Array.isArray(armorInstances)) return false;
  if (index < 0 || index >= armorInstances.length) return false;
  if (typeof targetIndex === "number" && index === targetIndex) {
    appendLog("強化対象と同じ防具を素材にはできません");
    return false;
  }

  const inst = armorInstances[index];
  if (!inst || inst.id !== armorId) return false;
  const loc = inst.location || "warehouse";
  if (loc !== "warehouse") return false;

  const usedQuality = inst.quality || 0;
  const usedEnh     = inst.enhance || 0;

  armorInstances.splice(index, 1);
  if (typeof window.equippedArmorIndex === "number" &&
      window.equippedArmorIndex > index) {
    window.equippedArmorIndex--;
  }

  armorCounts[armorId] =
    Math.max(0, (armorCounts[armorId] || 0) - 1);

  if (usedQuality > 0 || usedEnh > 0) {
    appendLog("※良品/傑作/強化済みの防具を素材として消費した");
  }
  return true;
}

// -----------------------
// 武器強化
// -----------------------

function enhanceWeapon(){
  const targetSel = document.getElementById("enhanceWeaponTargetSelect");
  if (!targetSel || !targetSel.value) {
    appendLog("強化する武器を選択してください");
    return;
  }

  const target = getWeaponInstanceByKey(targetSel.value);
  if (!target) {
    appendLog("強化対象の武器インスタンスが見つからない");
    return;
  }

  const inst = target.inst;
  const base = weapons.find(x => x.id === inst.id);
  if (!base) {
    appendLog("武器マスタが見つからないため強化できない");
    return;
  }

  inst.enhance = inst.enhance || 0;
  if (inst.enhance >= MAX_ENHANCE_LEVEL) {
    appendLog("これ以上強化できない");
    return;
  }

  const useStarShard = inst.enhance >= STAR_SHARD_NEED_LV;
  if (useStarShard) {
    const haveShard = getStarShardCount();
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
  }

  const matSel = document.getElementById("enhanceWeaponMaterialSelect");
  const matKey = matSel ? matSel.value : "";
  let matInst  = null;
  let matIndex = null;

  if (matKey) {
    const mat = getWeaponInstanceByKey(matKey);
    if (!mat) {
      appendLog("素材に指定された武器インスタンスが見つからない");
      return;
    }
    matInst  = mat.inst;
    matIndex = mat.index;
  }

  const dangerousInst = findDangerousWeaponMaterialInst(inst.id, matInst);
  if (dangerousInst) {
    const message = "良品または強化済みの武器を素材にしようとしています。本当に素材にしますか？";
    openEnhanceConfirm(message, () => {
      doEnhanceWeapon(target, inst, base, useStarShard, matKey, matIndex);
    });
  } else {
    doEnhanceWeapon(target, inst, base, useStarShard, matKey, matIndex);
  }
}

function doEnhanceWeapon(target, inst, base, useStarShard, matKey, matIndex) {
  // ★素材セレクトが指定されていれば、それを優先的に消費する
  const targetIndex = target.index;
  if (matKey && matIndex != null) {
    const ok = consumeWeaponInstanceAtIndexForMaterial(
      matIndex,
      targetIndex,
      inst.id
    );
    if (!ok) {
      appendLog("素材に指定した武器を消費できませんでした（IDが一致しないか倉庫にない）");
      return;
    }
  } else {
    // 従来どおり「同じIDの別インスタンスを1本消費」
    if (!consumeOneWeaponInstanceAsMaterial(inst.id)) {
      appendLog("同じ武器がもう1本必要です");
      return;
    }
  }

  const cost = ENHANCE_COST_MONEY[inst.enhance];
  if (money < cost) {
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  // ★ 強化成功率 + 星屑スキルツリーボーナス
  let rate = ENHANCE_SUCCESS_RATES[inst.enhance];
  let starBonus = 0;
  if (useStarShard && typeof getGlobalSkillTreeBonus === "function") {
    try {
      const b = getGlobalSkillTreeBonus() || {};
      starBonus = b.craftStarBonusRate || 0; // 例: 0.10 で +10%
      if (starBonus > 0) {
        rate *= (1 + starBonus);
      }
    } catch (e) {
      console.warn("enhanceWeapon: skilltree bonus error", e);
    }
  }
  if (rate > 0.98) rate = 0.98;

  const roll = Math.random();
  const success = roll < rate;

  if (useStarShard) {
    if (!consumeStarShard(STAR_SHARD_NEED_NUM)) {
      appendLog("星屑の結晶の消費に失敗しました（在庫不足？）");
    }
  }

  const beforeEnh = inst.enhance;

  if (success) {
    inst.enhance++;

    // 共通ラベルヘルパーで名前を生成（接頭語・品質込み）
    const label = typeof buildWeaponLabelFromInstance === "function"
      ? buildWeaponLabelFromInstance(inst)
      : `${base.name}+${inst.enhance}`;

    appendLog(`武器強化成功！ ${label}になった（同名武器1本消費${inst.enhance - 1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  } else {
    appendLog(`武器強化失敗…（同名武器は消費された${inst.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }

  // ★ 強化ログ（仕様は変えず記録のみ）
  if (typeof debugRecordEnhance === "function") {
    try {
      debugRecordEnhance({
        type: "weapon",
        itemId: inst.id,
        baseName: base.name,
        beforeEnhance: beforeEnh,
        afterEnhance: inst.enhance,
        success,
        useStarShard,
        moneyCost: cost,
        successRate: rate,
        starBonusRate: starBonus,
        roll
      });
    } catch (e) {}
  }

  // ★ smithデイリー: 武器/防具を一回強化
  if (typeof onSmithEnhanceCompletedForGuild === "function") {
    onSmithEnhanceCompletedForGuild(inst.id);
  }

  refreshEquipSelects();
  updateDisplay();
}

// -----------------------
// 防具強化
// -----------------------

function enhanceArmor(){
  const targetSel = document.getElementById("enhanceArmorTargetSelect");
  if (!targetSel || !targetSel.value) {
    appendLog("強化する防具を選択してください");
    return;
  }

  const target = getArmorInstanceByKey(targetSel.value);
  if (!target) {
    appendLog("強化対象の防具インスタンスが見つからない");
    return;
  }

  const inst = target.inst;
  const base = armors.find(x => x.id === inst.id);
  if (!base) {
    appendLog("防具マスタが見つからないため強化できない");
    return;
  }

  inst.enhance = inst.enhance || 0;
  if (inst.enhance >= MAX_ENHANCE_LEVEL) {
    appendLog("これ以上強化できない");
    return;
  }

  const useStarShard = inst.enhance >= STAR_SHARD_NEED_LV;
  if (useStarShard) {
    const haveShard = getStarShardCount();
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
  }

  const matSel = document.getElementById("enhanceArmorMaterialSelect");
  const matKey = matSel ? matSel.value : "";
  let matInst  = null;
  let matIndex = null;

  if (matKey) {
    const mat = getArmorInstanceByKey(matKey);
    if (!mat) {
      appendLog("素材に指定された防具インスタンスが見つからない");
      return;
    }
    matInst  = mat.inst;
    matIndex = mat.index;
  }

  const dangerousInst = findDangerousArmorMaterialInst(inst.id, matInst);
  if (dangerousInst) {
    const message = "良品または強化済みの防具を素材にしようとしています。本当に素材にしますか？";
    openEnhanceConfirm(message, () => {
      doEnhanceArmor(target, inst, base, useStarShard, matKey, matIndex);
    });
  } else {
    doEnhanceArmor(target, inst, base, useStarShard, matKey, matIndex);
  }
}

function doEnhanceArmor(target, inst, base, useStarShard, matKey, matIndex) {
  const targetIndex = target.index;

  if (matKey && matIndex != null) {
    const ok = consumeArmorInstanceAtIndexForMaterial(
      matIndex,
      targetIndex,
      inst.id
    );
    if (!ok) {
      appendLog("素材に指定した防具を消費できませんでした（IDが一致しないか倉庫にない）");
      return;
    }
  } else {
    if (!consumeOneArmorInstanceAsMaterial(inst.id)) {
      appendLog("同じ防具がもう1つ必要です");
      return;
    }
  }

  const cost = ENHANCE_COST_MONEY[inst.enhance];
  if (money < cost) {
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  // ★ 強化成功率 + 星屑スキルツリーボーナス
  let rate = ENHANCE_SUCCESS_RATES[inst.enhance];
  let starBonus = 0;
  if (useStarShard && typeof getGlobalSkillTreeBonus === "function") {
    try {
      const b = getGlobalSkillTreeBonus() || {};
      starBonus = b.craftStarBonusRate || 0;
      if (starBonus > 0) {
        rate *= (1 + starBonus);
      }
    } catch (e) {
      console.warn("enhanceArmor: skilltree bonus error", e);
    }
  }
  if (rate > 0.98) rate = 0.98;

  const roll = Math.random();
  const success = roll < rate;

  if (useStarShard) {
    if (!consumeStarShard(STAR_SHARD_NEED_NUM)) {
      appendLog("星屑の結晶の消費に失敗しました（在庫不足？）");
    }
  }

  const beforeEnh = inst.enhance;

  if (success) {
    inst.enhance++;

    const label = typeof buildArmorLabelFromInstance === "function"
      ? buildArmorLabelFromInstance(inst)
      : `${base.name}+${inst.enhance}`;

    appendLog(`防具強化成功！ ${label}になった（同名防具1つ消費${inst.enhance - 1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  } else {
    appendLog(`防具強化失敗…（同名防具は消費された${inst.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }

  if (typeof debugRecordEnhance === "function") {
    try {
      debugRecordEnhance({
        type: "armor",
        itemId: inst.id,
        baseName: base.name,
        beforeEnhance: beforeEnh,
        afterEnhance: inst.enhance,
        success,
        useStarShard,
        moneyCost: cost,
        successRate: rate,
        starBonusRate: starBonus,
        roll
      });
    } catch (e) {}
  }

  // ★ smithデイリー: 武器/防具を一回強化
  if (typeof onSmithEnhanceCompletedForGuild === "function") {
    onSmithEnhanceCompletedForGuild(inst.id);
  }

  refreshEquipSelects();
  updateDisplay();
}