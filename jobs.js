// jobs.js
// 職業定義・職業ヘルパーまとめ
//
// - 既存の jobId=0〜3（戦士・魔法使い・動物使い・錬金術師）と
//   新職業（大盾兵・呪術師・獣群使い・製作系ギルド職）をここで一括管理。
// - game-core-1.js / game-core-2.js 側は jobId のみ持ち、名称はここから参照する前提。
// - 職業ボーナスは「定義だけ」持ち、実際の適用は今後の実装で使う想定。

/**
 * 職業定義テーブル
 *
 * id:        jobId（数値）
 * key:       内部識別子（英字）
 * name:      表示名（日本語）
 * type:      "basic" / "combat" / "craft" / "gather"
 * guildId:   ギルド ID（"smith" / "alchemist" / "cooking" / "gather" / "food" / "warrior" / "mage" / "tamer"）
 *            初期職業・基本職業は null。
 * desc:      職業の説明
 * bonuses:   職業ボーナス（枠だけ用意。数値は後でチューニング）
 *
 * 初期職業（guildId: null, type: "basic"）
 *   0: 戦士
 *   1: 魔法使い
 *   2: 動物使い
 *
 * 戦闘ギルド上位職（type: "combat"）
 *   100: 大盾兵     (warrior)
 *   101: 呪術師     (mage)
 *   102: 獣群使い   (tamer)
 *
 * 製作系ギルド職（type: "craft", guildId: smith/alchemist/cooking）
 *   200: 鍛冶職人   (smith)
 *   201: 武具使い   (smith)
 *   202: 錬金術師   (alchemist)
 *   203: 道具使い   (alchemist)
 *   204: 料理人     (cooking)
 *   205: 貪食家     (cooking)
 *
 * 採取ギルド職（type: "gather", guildId: gather/food）
 *   300: 採集士     (gather)
 *   301: 採取監督官 (gather)
 *   400: 狩猟師     (food)
 *   401: 漁師       (food)
 *   402: 農夫       (food)
 */

const JOB_DEFS = [
  // ========== 基本職業（type: "basic"） ==========
  {
    id: 0,
    key: "warrior",
    name: "戦士",
    type: "basic",
    guildId: null,
    desc: "前衛を担う基本職業。物理攻撃と耐久に優れる。",
    bonuses: {
      atkRate: 0.0,
      defRate: 0.0,
      hpMaxRate: 0.0
    }
  },
  {
    id: 1,
    key: "mage",
    name: "魔法使い",
    type: "basic",
    guildId: null,
    desc: "魔法攻撃を専門にする基本職業。MP と魔法攻撃力が高い。",
    bonuses: {
      mpMaxRate: 0.05,
      magicAtkRate: 0.0
    }
  },
  {
    id: 2,
    key: "beast_tamer",
    name: "動物使い",
    type: "basic",
    guildId: null,
    desc: "ペットを戦力にする基本職業。ペットの性能が少し向上する。",
    bonuses: {
      petAtkRate: 0.0,
      petHpMaxRate: 0.0
    }
  },

  // ========== 戦闘ギルド上位職（type: "combat"） ==========
  {
    id: 100,
    key: "greatshield",
    name: "大盾兵",
    type: "combat",
    guildId: "warrior",
    desc: "大盾を構えたタンク職。被ダメージを減らし、味方を守る。",
    bonuses: {
      defRate: 0.0,
      guardRate: 0.0,
      hpMaxRate: 0.0
    }
  },
  {
    id: 101,
    key: "curse_mage",
    name: "呪術師",
    type: "combat",
    guildId: "mage",
    desc: "呪い・デバフに特化した魔法職。敵の能力を低下させる。",
    bonuses: {
      magicAtkRate: 0.0,
      debuffSuccessRate: 0.0
    }
  },
  {
    id: 102,
    key: "beast_master",
    name: "獣群使い",
    type: "combat",
    guildId: "tamer",
    desc: "複数のペットを同時に扱える上級職。ペット群で攻める。",
    bonuses: {
      petAtkRate: 0.0,
      petHpMaxRate: 0.0,
      petCountBonus: 0.0
    }
  },

  // ========== 製作系ギルド職（type: "craft", guildId: smith/alchemist/cooking） ==========

  // smith（鍛冶ギルド）
  {
    id: 200,
    key: "smith_crafter",
    name: "鍛冶職人",
    type: "craft",
    guildId: "smith",
    desc:
      "武器・防具作りに特化した職。高品質な装備を作りやすく、クラフト成功率・品質が向上する。",
    bonuses: {
      craftBonus: 0.08,
      craftCostReduceRate: 0.05,
      enhanceSuccessRateAdd: 0.05
    }
  },
  {
    id: 201,
    key: "bukatsu_user",
    name: "武具使い",
    type: "craft",
    guildId: "smith",
    desc:
      "武器・防具の性能を最大限に活かす戦闘職。装備の攻撃力・防御力が少し向上し、強化効果も増幅される。",
    bonuses: {
      atkRate: 0.02,
      defRate: 0.02,
      enhanceBonusRate: 0.05,
      guardReductionRate: 0.02
    }
  },

  // alchemist（錬金ギルド）
  {
    id: 202,
    key: "alchemist_pro",
    name: "錬金術師",
    type: "craft",
    guildId: "alchemist",
    desc:
      "ポーション・薬系に特化した錬金職。調合成績と薬品効果が向上し、クラフト効率も上がる。",
    bonuses: {
      craftBonus: 0.08,
      craftCostReduceRate: 0.05,
      potionEffectRate: 0.10
    }
  },
  {
    id: 203,
    key: "tool_user",
    name: "道具使い",
    type: "craft",
    guildId: "alchemist",
    desc:
      "爆弾・ツール系に特化した錬金職。道具の威力・効果範囲が向上し、戦闘での活用法が広がる。",
    bonuses: {
      craftBonus: 0.08,
      craftCostReduceRate: 0.05,
      toolDamageRate: 0.10
    }
  },

  // cooking（料理ギルド）
  {
    id: 204,
    key: "chef",
    name: "料理人",
    type: "craft",
    guildId: "cooking",
    desc:
      "料理・飲み物クラフトに特化した職。高品質な食事を作りやすく、クラフト成功率・品質が向上する。",
    bonuses: {
      craftBonus: 0.08,
      craftCostReduceRate: 0.05,
      cookingVarietyBonus: 0.05
    }
  },
  {
    id: 205,
    key: "glutton",
    name: "貪食家",
    type: "craft",
    guildId: "cooking",
    desc:
      "食事・飲み物の効果を利用する特化職。バフ効果量・持続時間が向上し、食べることで強くなる。",
    bonuses: {
      foodBuffEffectRate: 0.10,
      foodBuffDurationRate: 0.20,
      hpRecoverRateAdd: 0.05
    }
  },

  // ========== 採取ギルド職（type: "gather", guildId: gather/food） ==========

  // gather（採取ギルド）
  {
    id: 300,
    key: "gather_generalist",
    name: "採集士",
    type: "gather",
    guildId: "gather",
    desc:
      "木・鉱石・草・布・皮・水など、あらゆる基礎素材を満遍なく集める職。通常採取での採取量と+1 個ボーナスがわずかに増える。",
    bonuses: {
      gatherAmountBonusRate: 0.05,
      gatherExtraChanceAdd:  0.02
    }
  },
  {
    id: 301,
    key: "gather_base_supervisor",
    name: "採取監督官",
    type: "gather",
    guildId: "gather",
    desc:
      "各地の採取拠点の運営に優れた職。拠点から自動的に集まる素材量がわずかに増える。",
    bonuses: {
      gatherBaseT1BonusRate: 0.10,
      gatherBaseT2BonusRate: 0.05
    }
  },

  // food（食材ギルド）
  {
    id: 400,
    key: "food_hunter",
    name: "狩猟師",
    type: "gather",
    guildId: "food",
    desc:
      "狩猟で得られる肉・皮などの食材調達に特化した職。狩猟食材の入手量がわずかに増え、レア食材もやや見つかりやすくなる。",
    bonuses: {
      foodHuntAmountBonusRate: 0.10,
      foodHuntRareChanceAdd:   0.03
    }
  },
  {
    id: 401,
    key: "food_fisher",
    name: "漁師",
    type: "gather",
    guildId: "food",
    desc:
      "釣りで得られる魚系食材の調達に特化した職。釣り食材の入手量がわずかに増え、ハズレを引きにくくなる。",
    bonuses: {
      foodFishAmountBonusRate: 0.10,
      foodFishJunkReduceRate:  0.05
    }
  },
  {
    id: 402,
    key: "food_farmer",
    name: "農夫",
    type: "gather",
    guildId: "food",
    desc:
      "農園で得られる穀物・野菜などの食材調達に特化した職。農園の収穫量がわずかに増え、育成サイクルもわずかに短くなる。",
    bonuses: {
      foodFarmAmountBonusRate: 0.10,
      foodFarmCycleReduceRate: 0.05
    }
  }
];

// ========== ヘルパー関数 ==========

function getJobDefById(jobId) {
  if (typeof JOB_DEFS === "undefined") return null;
  for (let i = 0; i < JOB_DEFS.length; i++) {
    if (JOB_DEFS[i].id === jobId) {
      return JOB_DEFS[i];
    }
  }
  return null;
}

function getJobNameFromId(jobId) {
  const def = getJobDefById(jobId);
  if (!def) return "未知の職業";
  return def.name || "未知の職業";
}

function getJobsByGuildId(guildId) {
  if (typeof JOB_DEFS === "undefined") return [];
  if (!guildId) return [];
  return JOB_DEFS.filter(function (job) {
    return job.guildId === guildId;
  });
}

function getJobBonuses(jobId) {
  const def = getJobDefById(jobId);
  if (!def) {
    return {
      atkRate: 0, defRate: 0, hpMaxRate: 0, mpMaxRate: 0,
      craftBonus: 0, craftCostReduceRate: 0, potionEffectRate: 0, toolDamageRate: 0,
      foodBuffEffectRate: 0, foodBuffDurationRate: 0,
      gatherAmountBonusRate: 0, gatherExtraChanceAdd: 0,
      gatherBaseT1BonusRate: 0, gatherBaseT2BonusRate: 0,
      foodHuntAmountBonusRate: 0, foodHuntRareChanceAdd: 0,
      foodFishAmountBonusRate: 0, foodFishJunkReduceRate: 0,
      foodFarmAmountBonusRate: 0, foodFarmCycleReduceRate: 0
    };
  }
  const b = def.bonuses || {};
  return {
    atkRate: b.atkRate || 0,
    defRate: b.defRate || 0,
    hpMaxRate: b.hpMaxRate || 0,
    mpMaxRate: b.mpMaxRate || 0,
    craftBonus: b.craftBonus || 0,
    craftCostReduceRate: b.craftCostReduceRate || 0,
    potionEffectRate: b.potionEffectRate || 0,
    toolDamageRate: b.toolDamageRate || 0,
    foodBuffEffectRate: b.foodBuffEffectRate || 0,
    foodBuffDurationRate: b.foodBuffDurationRate || 0,
    gatherAmountBonusRate: b.gatherAmountBonusRate || 0,
    gatherExtraChanceAdd: b.gatherExtraChanceAdd || 0,
    gatherBaseT1BonusRate: b.gatherBaseT1BonusRate || 0,
    gatherBaseT2BonusRate: b.gatherBaseT2BonusRate || 0,
    foodHuntAmountBonusRate: b.foodHuntAmountBonusRate || 0,
    foodHuntRareChanceAdd: b.foodHuntRareChanceAdd || 0,
    foodFishAmountBonusRate: b.foodFishAmountBonusRate || 0,
    foodFishJunkReduceRate: b.foodFishJunkReduceRate || 0,
    foodFarmAmountBonusRate: b.foodFarmAmountBonusRate || 0,
    foodFarmCycleReduceRate: b.foodFarmCycleReduceRate || 0
  };
}

// ========== 初期職選択 UI（jobModal 用） ==========

function getBasicJobs() {
  return JOB_DEFS.filter(function(job) {
    return job.type === "basic";
  });
}

function setupJobSelectUI() {
  const jobModal    = document.getElementById("jobModal");
  const btnBox      = document.getElementById("jobButtons");
  const descArea    = document.getElementById("jobDescArea");
  const confirmBtn  = document.getElementById("jobConfirmBtn");

  if (!jobModal || !btnBox || !confirmBtn) return;

  if (btnBox.dataset.initDone === "1") {
    return;
  }
  btnBox.dataset.initDone = "1";

  const basicJobs = getBasicJobs();
  const buttons = btnBox.querySelectorAll(".job-select-btn");

  btnBox._jobButtons = buttons;

  let selectedJobIdTemp = null;

  buttons.forEach(btn => {
    const jobIdStr = btn.dataset.job;
    const jobId = parseInt(jobIdStr, 10);
    const def = getJobDefById(jobId);
    if (!def) return;

    btn.addEventListener("click", () => {
      selectedJobIdTemp = jobId;
      btnBox.dataset.selectedJobId = String(jobId);

      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      if (descArea) {
        descArea.textContent = def.desc || "";
      }

      confirmBtn.disabled = false;
    });
  });

  if (descArea && basicJobs.length > 0) {
    descArea.textContent = basicJobs[0].desc || "";
  }

  confirmBtn.addEventListener("click", () => {
    if (selectedJobIdTemp == null && btnBox.dataset.selectedJobId) {
      selectedJobIdTemp = parseInt(btnBox.dataset.selectedJobId, 10);
    }
    if (selectedJobIdTemp == null) return;

    if (typeof applyJobChange === "function") {
      applyJobChange(selectedJobIdTemp);
    } else {
      window.jobId = selectedJobIdTemp;

      if (typeof recalcStats === "function") {
        recalcStats();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }

      const stJobName = document.getElementById("stJobName");
      if (stJobName) {
        stJobName.textContent = getJobNameFromId(selectedJobIdTemp);
      }

      jobModal.classList.add("hidden");
    }

    jobModal.classList.add("hidden");
  });

  confirmBtn.disabled = true;
}

// ========== デバッグ用職業一覧 UI（openJobDebugModal） ==========

function openJobDebugModal() {
  const jobModal = document.getElementById("jobModal");
  if (!jobModal) return;

  if (typeof setupJobSelectUI === "function") {
    setupJobSelectUI();
  }

  const btnBox     = document.getElementById("jobButtons");
  const descArea   = document.getElementById("jobDescArea");
  const confirmBtn = document.getElementById("jobConfirmBtn");

  if (!btnBox || !confirmBtn) return;

  let dbgBox = document.getElementById("jobDebugPane");
  if (!dbgBox) {
    const inner = document.getElementById("jobModalInner");
    if (!inner) return;

    dbgBox = document.createElement("div");
    dbgBox.id = "jobDebugPane";
    dbgBox.style.marginTop = "12px";
    dbgBox.style.borderTop = "1px solid #444";
    dbgBox.style.paddingTop = "6px";
    dbgBox.style.fontSize = "11px";

    const title = document.createElement("div");
    title.textContent = "GM デバッグ：職業候補を選択（確定は世界に降り立つ）";
    title.style.marginBottom = "4px";
    title.style.color = "#c0bedf";
    dbgBox.appendChild(title);

    const info = document.createElement("div");
    info.textContent = "任意の職業を選ぶと、その職業が候補として選択されます。「世界に降り立つ」で確定します。";
    info.style.marginBottom = "4px";
    dbgBox.appendChild(info);

    const listContainer = document.createElement("div");
    listContainer.id = "jobDebugList";
    listContainer.style.maxHeight = "160px";
    listContainer.style.overflowY = "auto";
    listContainer.style.border = "1px solid #333";
    listContainer.style.padding = "4px";
    listContainer.style.fontSize = "11px";
    dbgBox.appendChild(listContainer);

    inner.appendChild(dbgBox);
  }

  const listContainer = document.getElementById("jobDebugList");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  // ★ job.type を 4 値（basic / combat / craft / gather）にする
  const groups = [
    { label: "基本職",     type: "basic" },
    { label: "戦闘ギルド", type: "combat" },
    { label: "製作ギルド", type: "craft" },
    { label: "採取ギルド", type: "gather" }
  ];

  const buttons = btnBox.querySelectorAll(".job-select-btn");

  groups.forEach(group => {
    const header = document.createElement("div");
    header.textContent = `【${group.label}】`;
    header.style.marginTop = "4px";
    header.style.marginBottom = "2px";
    header.style.color = "#c0bedf";
    listContainer.appendChild(header);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexWrap = "wrap";
    row.style.gap = "4px";
    listContainer.appendChild(row);

    JOB_DEFS.forEach(job => {
      if (job.type !== group.type) return;

      const btn = document.createElement("button");
      btn.textContent = `${job.name} (id:${job.id})`;
      btn.style.fontSize = "11px";
      btn.style.padding = "2px 6px";

      btn.addEventListener("click", () => {
        if (job.type === "basic") {
          let targetBtn = null;
          buttons.forEach(b => {
            const jobIdStr = b.dataset.job;
            const jobId = parseInt(jobIdStr, 10);
            if (jobId === job.id) {
              targetBtn = b;
            }
          });
          if (targetBtn) {
            targetBtn.click();
          }
        } else {
          btnBox.dataset.selectedJobId = String(job.id);

          if (descArea) {
            descArea.textContent = job.desc || "";
          }
          confirmBtn.disabled = false;

          const stJobName = document.getElementById("stJobName");
          if (stJobName) {
            stJobName.textContent = job.name;
          }
        }

        if (typeof appendLog === "function") {
          appendLog(`[GM] 職業候補として「${job.name}」(id:${job.id}) を選択しました。`);
        }
      });

      row.appendChild(btn);
    });
  });

  jobModal.classList.remove("hidden");
}

// ========== グローバル公開 ==========

if (typeof window.JOB_DEFS === "undefined") {
  window.JOB_DEFS = JOB_DEFS;
}
if (typeof window.getJobNameFromId === "undefined") {
  window.getJobNameFromId = getJobNameFromId;
}
if (typeof window.getJobDefById === "undefined") {
  window.getJobDefById = getJobDefById;
}
if (typeof window.getJobsByGuildId === "undefined") {
  window.getJobsByGuildId = getJobsByGuildId;
}
if (typeof window.getJobBonuses === "undefined") {
  window.getJobBonuses = getJobBonuses;
}
if (typeof window.setupJobSelectUI === "undefined") {
  window.setupJobSelectUI = setupJobSelectUI;
}
if (typeof window.openJobDebugModal === "undefined") {
  window.openJobDebugModal = openJobDebugModal;
}
if (typeof window.getBasicJobs === "undefined") {
  window.getBasicJobs = getBasicJobs;
}