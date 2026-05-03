// ui-craft-and-farm.js
// クラフト関連・生活クラフト・肥料・農園UI

console.log("ui-craft-and-farm.js start");

// ---------------------------------------
// 任意ボタンを「押している間だけ連打」させるヘルパー
// ---------------------------------------
function setupAutoRepeatButton(btn, action, intervalMs = 100) {
  if (!btn || typeof action !== "function") return;

  let timer = null;

  function start() {
    if (timer) return;
    action(); // 押した瞬間に1回
    timer = setInterval(action, intervalMs);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  // PC（マウス）
  btn.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    start();
  });
  btn.addEventListener("mouseup", stop);
  btn.addEventListener("mouseleave", stop);

  // スマホ（タッチ）
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    start();
  }, { passive: false });
  btn.addEventListener("touchend", stop);
  btn.addEventListener("touchcancel", stop);
}

// ---------------------------------------
// クラフトコスト再計算ヘルパー
// ---------------------------------------
function refreshCurrentCraftCost() {
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  const activeCatBtn = document.querySelector(".craft-cat-tab.active");
  const cat = activeCatBtn ? activeCatBtn.dataset.cat : "weapon";

  console.log("[refreshCurrentCraftCost] activeCat =", cat);

  if (cat === "weapon") {
    window.activeCraftCategory = "weapon";
    const sel = document.getElementById("weaponSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("weapon", sel.value);
      return;
    }
  } else if (cat === "armor") {
    window.activeCraftCategory = "armor";
    const sel = document.getElementById("armorSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("armor", sel.value);
      return;
    }
  } else if (cat === "potion") {
    window.activeCraftCategory = "potion";
    const sel = document.getElementById("potionSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("potion", sel.value);
      return;
    }
  } else if (cat === "tool") {
    window.activeCraftCategory = "tool";
    const sel = document.getElementById("toolSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("tool", sel.value);
      return;
    }
  } else if (cat === "material") {
    window.activeCraftCategory = "material";
    const sel = document.getElementById("intermediateSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("material", sel.value);
      return;
    }
  } else if (cat === "cooking") {
    const activeSubTab = document.querySelector(".cook-sub-tab.active");
    const sub = activeSubTab ? activeSubTab.dataset.sub : "food";
    const foodSel  = document.getElementById("foodSelect");
    const drinkSel = document.getElementById("drinkSelect");

    console.log("[refreshCurrentCraftCost] cooking sub =", sub);

    if (sub === "drink") {
      window.activeCraftCategory = "cookingDrink";
      if (drinkSel && drinkSel.value) {
        updateCraftCostInfo("cookingDrink", drinkSel.value);
        return;
      }
    } else {
      window.activeCraftCategory = "cookingFood";
      if (foodSel && foodSel.value) {
        updateCraftCostInfo("cookingFood", foodSel.value);
        return;
      }
    }
  } else if (cat === "life") {
    const activeLifeSubTab = document.querySelector(".life-sub-tab.active");
    const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
    console.log("[refreshCurrentCraftCost] life sub =", sub);

    if (sub === "farm") {
      window.activeCraftCategory = "fertilizer";
      const fertSel = document.getElementById("fertilizerSelect");
      console.log("[refreshCurrentCraftCost] fertSel =", fertSel, "value =", fertSel && fertSel.value);
      if (fertSel && fertSel.value) {
        updateCraftCostInfo("fertilizer", fertSel.value);
        return;
      }
    } else if (sub === "furniture") {
      window.activeCraftCategory = "furniture";
      const furnitureSel = document.getElementById("furnitureSelect");
      if (furnitureSel && furnitureSel.value) {
        updateCraftCostInfo("furniture", furnitureSel.value);
        return;
      }
    }
  }

  infoEl.textContent = "必要素材：-";
}

// ---------------------------------------
// 肥料セレクト初期化
// ---------------------------------------
function initFertilizerSelect() {
  console.log("=== initFertilizerSelect ENTER ===");
  const fertSelect = document.getElementById("fertilizerSelect");
  console.log("[initFertilizerSelect] fertSelect =", fertSelect);

  if (!fertSelect) {
    console.warn("[initFertilizerSelect] fertilizerSelect element not found (return)");
    console.warn("[initFertilizerSelect] appRoot =", document.getElementById("appRoot"));
    console.warn("[initFertilizerSelect] magicPageCraft =", document.getElementById("magicPageCraft"));
    return;
  }

  const defs = window.FERTILIZERS || {};
  const keys = Object.keys(defs);
  console.log("[initFertilizerSelect] window.FERTILIZERS keys =", keys);

  const ids = keys.sort((a, b) => {
    const ta = defs[a] && typeof defs[a].tier === "number" ? defs[a].tier : 0;
    const tb = defs[b] && typeof defs[b].tier === "number" ? defs[b].tier : 0;
    return ta - tb;
  });
  console.log("[initFertilizerSelect] sorted ids =", ids);

  console.log("[initFertilizerSelect] before clear, options length =", fertSelect.options.length);
  fertSelect.innerHTML = "";

  ids.forEach(id => {
    const f = defs[id];
    if (!f) return;
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    fertSelect.appendChild(opt);
  });

  console.log("[initFertilizerSelect] after append, options length =", fertSelect.options.length);
  console.log("[initFertilizerSelect] current value =", fertSelect.value);

  if (fertSelect.value && typeof updateCraftCostInfo === "function") {
    console.log("[initFertilizerSelect] call updateCraftCostInfo('fertilizer',", fertSelect.value, ")");
    // life/farm なので activeCraftCategory も合わせておく
    window.activeCraftCategory = "fertilizer";
    updateCraftCostInfo("fertilizer", fertSelect.value);
  } else {
    console.log("[initFertilizerSelect] skip updateCraftCostInfo, value or function missing");
  }

  console.log("=== initFertilizerSelect LEAVE ===");
}

// ---------------------------------------
// DOMContentLoaded 後の初期化（クラフト/農園）
// ---------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("[DOMContentLoaded craft] start");

  // --------------------
  // クラフトカテゴリタブ
  // --------------------
  const craftCatTabs = document.querySelectorAll(".craft-cat-tab");
  const craftPanels = {
    weapon:   document.getElementById("craftPanelWeapon"),
    armor:    document.getElementById("craftPanelArmor"),
    potion:   document.getElementById("craftPanelPotion"),
    tool:     document.getElementById("craftPanelTool"),
    material: document.getElementById("craftPanelMaterial"),
    cooking:  document.getElementById("craftPanelCooking"),
    life:     document.getElementById("craftPanelLife")
  };

  function setCraftCategory(cat) {
    console.log("[setCraftCategory] cat =", cat);

    craftCatTabs.forEach(btn => {
      if (btn.dataset.cat === cat) btn.classList.add("active");
      else                         btn.classList.remove("active");
    });

    Object.keys(craftPanels).forEach(k => {
      if (!craftPanels[k]) return;
      craftPanels[k].style.display = (k === cat) ? "" : "none";
    });

    const infoEl = document.getElementById("craftCostInfo");

    if (cat === "weapon") {
      window.activeCraftCategory = "weapon";
      const sel = document.getElementById("weaponSelect");
      if (sel && sel.value) { updateCraftCostInfo("weapon", sel.value); return; }
    } else if (cat === "armor") {
      window.activeCraftCategory = "armor";
      const sel = document.getElementById("armorSelect");
      if (sel && sel.value) { updateCraftCostInfo("armor", sel.value); return; }
    } else if (cat === "potion") {
      window.activeCraftCategory = "potion";
      const sel = document.getElementById("potionSelect");
      if (sel && sel.value) { updateCraftCostInfo("potion", sel.value); return; }
    } else if (cat === "tool") {
      window.activeCraftCategory = "tool";
      const sel = document.getElementById("toolSelect");
      if (sel && sel.value) { updateCraftCostInfo("tool", sel.value); return; }
    } else if (cat === "material") {
      window.activeCraftCategory = "material";
      const sel = document.getElementById("intermediateSelect");
      if (sel && sel.value) { updateCraftCostInfo("material", sel.value); return; }
    } else if (cat === "cooking") {
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");
      let activeSubTab = document.querySelector(".cook-sub-tab.active");
      
      if (!activeSubTab) {
        const firstSubTab = document.querySelector(".cook-sub-tab");
        if (firstSubTab) {
          firstSubTab.click();
          activeSubTab = firstSubTab;
        }
      }
      
      const sub = activeSubTab ? activeSubTab.dataset.sub : "food";

      console.log("[setCraftCategory] cooking sub =", sub);

      if (sub === "drink") {
        window.activeCraftCategory = "cookingDrink";
        if (drinkSel && drinkSel.value) {
          updateCraftCostInfo("cookingDrink", drinkSel.value);
          return;
        }
      } else {
        window.activeCraftCategory = "cookingFood";
        if (foodSel && foodSel.value) {
          updateCraftCostInfo("cookingFood", foodSel.value);
          return;
        }
      }
    } else if (cat === "life") {
      let activeLifeSubTab = document.querySelector(".life-sub-tab.active");
      
      if (!activeLifeSubTab) {
        const firstLifeSubTab = document.querySelector(".life-sub-tab");
        if (firstLifeSubTab) {
          firstLifeSubTab.click();
          activeLifeSubTab = firstLifeSubTab;
        }
      }
      
      const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
      const fertSel = document.getElementById("fertilizerSelect");

      console.log("[setCraftCategory] life sub =", sub, "fertSel =", fertSel, "options length =", fertSel ? fertSel.options.length : "N/A", "value =", fertSel && fertSel.value);

      if (sub === "farm") {
        window.activeCraftCategory = "fertilizer";
        if (fertSel && fertSel.value) {
          updateCraftCostInfo("fertilizer", fertSel.value);
          return;
        }
      } else if (sub === "furniture") {
        window.activeCraftCategory = "furniture";
        const furnitureSel = document.getElementById("furnitureSelect");
        if (furnitureSel && furnitureSel.value) {
          updateCraftCostInfo("furniture", furnitureSel.value);
          return;
        }
      }
    }

    if (infoEl) infoEl.textContent = "必要素材：-";
  }

  window.setCraftCategory = setCraftCategory;

  craftCatTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat || "weapon";
      setCraftCategory(cat);
    });
  });

  setCraftCategory("weapon");

  // --------------------
  // 料理サブタブ
  // --------------------
  function initCookingSubTabs() {
    const subTabs = document.querySelectorAll(".cook-sub-tab");
    const panelFood  = document.getElementById("cookPanelFood");
    const panelDrink = document.getElementById("cookPanelDrink");

    if (!subTabs.length || !panelFood || !panelDrink) return;

    subTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        subTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const sub = tab.dataset.sub;
        const infoEl = document.getElementById("craftCostInfo");
        const foodSel  = document.getElementById("foodSelect");
        const drinkSel = document.getElementById("drinkSelect");

        console.log("[cook-sub-tab] click sub =", sub);

        if (sub === "food") {
          window.activeCraftCategory = "cookingFood";
          panelFood.style.display  = "";
          panelDrink.style.display = "none";

          if (foodSel && foodSel.value) {
            updateCraftCostInfo("cookingFood", foodSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          window.activeCraftCategory = "cookingDrink";
          panelFood.style.display  = "none";
          panelDrink.style.display = "";

          if (drinkSel && drinkSel.value) {
            updateCraftCostInfo("cookingDrink", drinkSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        }
      });
    });

    const first = subTabs[0];
    console.log("[initCookingSubTabs] first subTab =", first);
    if (first) first.click();
  }

  initCookingSubTabs();

  // --------------------
  // 生活サブタブ（農園 / 家具）
  // --------------------
  function initLifeSubTabs() {
    const subTabs      = document.querySelectorAll(".life-sub-tab");
    const panelFarm    = document.getElementById("lifePanelFarm");
    const panelHousing = document.getElementById("lifePanelHousing");

    console.log("[initLifeSubTabs] subTabs length =", subTabs.length, "panelFarm =", panelFarm, "panelHousing =", panelHousing);

    if (!subTabs.length || !panelFarm) return;

    subTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        subTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const sub = tab.dataset.sub;
        const infoEl = document.getElementById("craftCostInfo");
        const fertSel = document.getElementById("fertilizerSelect");

        console.log("[life-sub-tab] click: sub =", sub, "fertSel =", fertSel, "options length =", fertSel ? fertSel.options.length : "N/A", "value =", fertSel && fertSel.value);

        if (sub === "farm") {
          window.activeCraftCategory = "fertilizer";
          if (panelFarm)    panelFarm.style.display = "";
          if (panelHousing) panelHousing.style.display = "none";

          if (fertSel && fertSel.value) {
            updateCraftCostInfo("fertilizer", fertSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          window.activeCraftCategory = "furniture";
          if (panelFarm)    panelFarm.style.display = "none";
          if (panelHousing) panelHousing.style.display = "";

          const furnSel = document.getElementById("furnitureSelect");
          if (furnSel && furnSel.value) {
            updateCraftCostInfo("furniture", furnSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        }
      });
    });

    const first = subTabs[0];
    console.log("[initLifeSubTabs] first subTab =", first);
    if (first) first.click();
  }

  initLifeSubTabs();

  // --------------------
  // クラフトボタン・セレクト
  // --------------------
  const weaponCraftBtn = document.getElementById("craftWeaponBtn");
  if (weaponCraftBtn && typeof craftWeapon === "function") {
    weaponCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftWeapon();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const armorCraftBtn = document.getElementById("craftArmorBtn");
  if (armorCraftBtn && typeof craftArmor === "function") {
    armorCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftArmor();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const potionCraftBtn = document.getElementById("craftPotionBtn");
  if (potionCraftBtn && typeof craftPotion === "function") {
    potionCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftPotion();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const toolCraftBtn = document.getElementById("craftToolBtn");
  if (toolCraftBtn && typeof craftTool === "function") {
    toolCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftTool();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  // 肥料クラフト（自動）ボタン
  const fertAutoBtn = document.getElementById("craftFertilizerAutoBtn");
  console.log("[fertAutoBtn] element =", fertAutoBtn, "typeof craftFertilizerAuto =", typeof craftFertilizerAuto);
  if (fertAutoBtn && typeof craftFertilizerAuto === "function") {
    fertAutoBtn.addEventListener("click", () => {
      console.log("[fertAutoBtn] click, isExploring =", window.isExploring, "currentEnemy =", window.currentEnemy);
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      const fertSel = document.getElementById("fertilizerSelect");
      const fertId  = fertSel ? fertSel.value : "";
      console.log("[fertAutoBtn] selected fertId =", fertId, "fertSel =", fertSel);
      if (!fertId) {
        appendLog("作る肥料を選んでいない。");
        return;
      }
      craftFertilizerAuto(fertId);
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  // 手動クラフトボタン（UIは保留）
  const fertManualBtn = document.getElementById("craftFertilizerManualBtn");
  if (fertManualBtn && typeof craftFertilizerManual === "function") {
    fertManualBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      const fertSel = document.getElementById("fertilizerSelect");
      const fertId  = fertSel ? fertSel.value : "";
      if (!fertId) {
        appendLog("作る肥料を選んでいない。");
        return;
      }
      const materials = window.selectedFertilizerMaterials || [];
      if (!materials.length) {
        appendLog("手動クラフト用の素材が選択されていない。");
        return;
      }
      craftFertilizerManual(fertId, materials);
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const craftKindSelect = document.getElementById("craftKindSelect");
  if (craftKindSelect && typeof refreshEquipSelects === "function") {
    craftKindSelect.addEventListener("change", () => {
      refreshEquipSelects();
      refreshCurrentCraftCost();
    });
  }

  const craftTierSelect = document.getElementById("craftTierSelect");
  if (craftTierSelect && typeof refreshEquipSelects === "function") {
    craftTierSelect.addEventListener("change", () => {
      refreshEquipSelects();
      refreshCurrentCraftCost();
    });
  }

  const weaponSelect = document.getElementById("weaponSelect");
  if (weaponSelect) {
    weaponSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("weapon", id);
    });
  }

  const armorSelect = document.getElementById("armorSelect");
  if (armorSelect) {
    armorSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("armor", id);
    });
  }

  const potionSelect = document.getElementById("potionSelect");
  if (potionSelect) {
    potionSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("potion", id);
    });
  }

  const toolSelect = document.getElementById("toolSelect");
  if (toolSelect) {
    toolSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("tool", id);
    });
  }

  const foodSelect = document.getElementById("foodSelect");
  if (foodSelect) {
    foodSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("cookingFood", id);
    });
  }

  const drinkSelect = document.getElementById("drinkSelect");
  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("cookingDrink", id);
    });
  }

  const fertSelect = document.getElementById("fertilizerSelect");
  console.log("[fertSelect change-bind] fertSelect =", fertSelect);
  if (fertSelect) {
    fertSelect.addEventListener("change", e => {
      const id = e.target.value;
      console.log("[fertSelect change] id =", id);
      window.activeCraftCategory = "fertilizer";
      if (id) updateCraftCostInfo("fertilizer", id);
    });
  }

  // --------------------
  // 農園お世話（連打対応）
  // --------------------
  const careFarmAllBtn = document.getElementById("careFarmAllBtn");
  if (careFarmAllBtn && typeof careFarmAll === "function") {
    const careOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は農園の世話ができない！");
        return;
      }
      careFarmAll();
    };

    careFarmAllBtn.addEventListener("click", () => {
      careOnce();
    });

    setupAutoRepeatButton(careFarmAllBtn, () => {
      careOnce();
    }, 100);
  }

  // ★肥料セレクト初期化
  console.log("[DOMContentLoaded craft] before initFertilizerSelect, fertSelect =", document.getElementById("fertilizerSelect"));
  initFertilizerSelect();
  console.log("[DOMContentLoaded craft] after initFertilizerSelect, fertSelect =", document.getElementById("fertilizerSelect"),
              "options length =", (document.getElementById("fertilizerSelect") || {}).options?.length);

  if (typeof openJobModal === "function" && typeof jobId !== "undefined" && jobId === null) {
    openJobModal();
  }

  console.log("[DOMContentLoaded craft] end");
});