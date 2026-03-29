  // skill-core.js
  // 職業スキル定義 ＋ スキルUI ＋ 実行ロジック ＋ ペット攻撃
  // 前提: game-core-*.js のグローバル（jobId, atkTotal, INT_, hp, mp, sp, currentEnemy, enemyHp, enemyHpMax,
  //        petHp, petHpMax, petAtkBase, petLevel など）が存在
  
  // =======================
  // スキル定義
  // =======================
  
  const SKILL_TYPE_MAGIC = "magic";
  const SKILL_TYPE_PHYS  = "phys";
  const SKILL_TYPE_BUFF  = "buff";
  const SKILL_TYPE_PET   = "pet";
  
  // jobId: 0=戦士, 1=魔法使い, 2=動物使い
  const JOB_SKILLS = {
    0: { // 戦士
      phys: [
        {
          id: "powerSlash",
          name: "パワースラッシュ",
          type: SKILL_TYPE_PHYS,
          spCost: 3
        },
        {
          id: "shieldBlow",
          name: "シールドブロウ",
          type: SKILL_TYPE_PHYS,
          spCost: 4
        },
        {
          id: "braveCharge",
          name: "ブレイブチャージ",
          type: SKILL_TYPE_BUFF,
          spCost: 5
        }
      ],
      magic: [] // 戦士は魔法なし
    },
    1: { // 魔法使い
      phys: [],
      magic: [
        {
          id: "fireBolt",
          name: "ファイアボルト",
          type: SKILL_TYPE_MAGIC,
          mpCost: 5
        },
        {
          id: "iceLance",
          name: "アイスランス",
          type: SKILL_TYPE_MAGIC,
          mpCost: 6
        },
        {
          id: "chainLightning",
          name: "チェインライトニング",
          type: SKILL_TYPE_MAGIC,
          mpCost: 8
        }
      ]
    },
    2: { // 動物使い
      phys: [
        {
          id: "beastSlash",
          name: "ビーストスラッシュ",
          type: SKILL_TYPE_PHYS,
          spCost: 3
        },
        {
          id: "animalLink",
          name: "アニマルリンク",
          type: SKILL_TYPE_PET,
          spCost: 4
        }
      ],
      magic: [
        {
          id: "beastHeal",
          name: "ビーストヒール",
          type: SKILL_TYPE_PET,
          mpCost: 5
        }
      ]
    }
  };
  
  // =======================
  // 共通: スキルUI更新
  // =======================
  
  function refreshSkillUIs() {
    const magicSel = document.getElementById("magicSelect");
    const skillSel = document.getElementById("skillSelect");
    if (!magicSel || !skillSel) return;
  
    magicSel.innerHTML = "";
    skillSel.innerHTML = "";
  
    const jobSkills = JOB_SKILLS[jobId] || { phys: [], magic: [] };
  
    // 魔法セレクト
    {
      const optNone = document.createElement("option");
      optNone.value = "";
      optNone.textContent = "魔法なし";
      magicSel.appendChild(optNone);
  
      jobSkills.magic.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        magicSel.appendChild(opt);
      });
    }
  
    // 物理スキルセレクト
    {
      const optNone = document.createElement("option");
      optNone.value = "";
      optNone.textContent = "スキルなし";
      skillSel.appendChild(optNone);
  
      jobSkills.phys.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        skillSel.appendChild(opt);
      });
    }
  }
  
  // =======================
  // バフ・ガード・ペット用フラグ
  // =======================
  
  let braveChargeTurnRemain      = 0;
  let braveChargeRate            = 0.3;  // 攻撃+30%
  let shieldBlowGuardTurnRemain  = 0;    // 次の被ダメ軽減フラグ
  
  // ペット火力バフ（アニマルリンク用）
  let petBuffTurnRemain = 0;
  // petBuffRate は game-core 側で宣言済み（ここでは宣言しないで使う）
  
  // game-core 側のダメージ計算に組み込む用ヘルパ
  function getCurrentAtkForSkill() {
    let base = atkTotal;
    if (braveChargeTurnRemain > 0) {
      base = Math.floor(base * (1 + braveChargeRate));
    }
    return base;
  }
  
  // ターン終了時に呼ぶ想定（enemyTurn の最後など）
  function tickSkillBuffTurns() {
    if (braveChargeTurnRemain > 0) {
      braveChargeTurnRemain--;
    }
    if (shieldBlowGuardTurnRemain > 0) {
      // シールドブロウは「次の被ダメ1回」なので、実際の軽減処理側（calcEnemyDamage）で0にする
    }
    if (petBuffTurnRemain > 0) {
      petBuffTurnRemain--;
      if (petBuffTurnRemain <= 0) {
        petBuffRate = 1.0;
      }
    }
  }
  
  // =======================
  // ペット攻撃ロジック
  // =======================
  
  // ペットの基礎攻撃力を算出（レベル＆基礎ATKから）
  function getPetBaseAtk() {
    // ベース＋レベルに応じて少し伸びる
    const levelBonus = Math.floor(petLevel * 0.5);
    return Math.max(1, petAtkBase + levelBonus);
  }
  
  // ペットの1ヒットダメージ（揺らぎ込み）
  function calcPetDamage() {
    const base = getPetBaseAtk() * petBuffRate;
    const variance = Math.floor(base * 0.2); // ±20%
    const roll = base + (Math.floor(Math.random() * (variance * 2 + 1)) - variance);
    return Math.max(1, Math.floor(roll));
  }
  
  // ペットターン：毎ターン自動で1回攻撃（敵がいれば）
  // ・期待ダメージがプレイヤー通常攻撃の 3〜4倍程度になるよう、petAtkBase 側でバランスを取る想定
  // ・たまに「ペットの一撃！」的なクリティカル演出を入れて手触りを上げる
  // ペットターン：毎ターン自動で行動（動物使い時のみ）
  // ・基本は通常攻撃
  // ・30%でスキル（powerBite / taunt / selfHeal）をランダム発動
  // ・プレイヤー総ダメージの3〜4倍くらいになる想定
  function doPetTurn() {
    if (jobId !== 2) return;        // 動物使い以外は何もしない
    if (!currentEnemy) return;      // 敵がいなければ何もしない
    if (petHp <= 0) return;         // ペットが倒れている場合は行動不能
  
    // --- スキル発動判定 ---
    // petSkills と PET_SKILL_TRY_RATE は game-core 側で定義済み
    let usedSkill = false;
    if (petSkills && Math.random() < PET_SKILL_TRY_RATE) {
      const s = petSkills[Math.floor(Math.random() * petSkills.length)];
      if (s && s.id === "powerBite") {
        // 高倍率の噛みつき
        let base = calcPetDamage();
        let dmg = Math.floor(base * (s.powerRate || 1.6));
        enemyHp = Math.max(0, enemyHp - dmg);
        appendLog(`ペットの${s.name}！ ${currentEnemy.name}に${dmg}ダメージ！`);
        usedSkill = true;
      } else if (s && s.id === "taunt") {
        // 次のターンはほぼ確実にペットに攻撃を集める（簡易タゲ取り）
        appendLog(`ペットの${s.name}！ 敵の注意を引きつけた！`);
        // 次の enemyTurn で 100% ペットを狙うフラグ
        petBuffTurnRemain = Math.max(petBuffTurnRemain, 1); // 流用 or 専用フラグを別途用意してもOK
        usedSkill = true;
      } else if (s && s.id === "selfHeal") {
        const heal = Math.floor(petHpMax * (s.healRate || 0.3)) + 3;
        petHp = Math.min(petHp + heal, petHpMax);
        appendLog(`ペットの${s.name}！ HPが${heal}回復した！`);
        usedSkill = true;
      }
    }
  
    if (!usedSkill) {
      // --- 通常攻撃 ---
      let dmg = calcPetDamage();
  
      // 20% でクリティカル気味の一撃
      if (Math.random() < 0.2) {
        const critBonus = 1.5;
        dmg = Math.floor(dmg * critBonus);
        enemyHp = Math.max(0, enemyHp - dmg);
        appendLog(`ペットの渾身の一撃！ ${currentEnemy.name} に${dmg}ダメージ！`);
      } else {
        enemyHp = Math.max(0, enemyHp - dmg);
        appendLog(`ペットの攻撃！ ${currentEnemy.name} に${dmg}ダメージ`);
      }
    }
  
    // 勝敗判定のみ。敵ターンはプレイヤー行動側で呼ぶ。
    if (enemyHp <= 0) {
      winBattle();
    } else {
      updateDisplay();
    }
  }
  
  // =======================
  // 魔法発動（UIセレクト版）
  // =======================
  
  function castMagicFromUI() {
    if (jobId !== 1 && jobId !== 2) {
      setLog("魔法を扱える職業ではない");
      return;
    }
    const sel = document.getElementById("magicSelect");
    if (!sel) return;
    const skillId = sel.value;
    if (!skillId) {
      setLog("使用する魔法を選んでください");
      return;
    }
    const jobSkills = JOB_SKILLS[jobId] || { magic: [] };
    const skill = jobSkills.magic.find(s => s.id === skillId);
    if (!skill) {
      setLog("その魔法は使用できない");
      return;
    }
  
    if (!currentEnemy && skillId !== "beastHeal") {
      setLog("敵がいない");
      return;
    }
  
    const mpCost = skill.mpCost || 0;
    if (mp < mpCost) {
      setLog("MPが足りない");
      return;
    }
    mp -= mpCost;
  
    if (skillId === "fireBolt") {
      const dmg = 10 + INT_ * 2;
      enemyHp = Math.max(0, enemyHp - dmg);
      setLog(`ファイアボルト！ ${currentEnemy.name} に${dmg}ダメージ`);
    } else if (skillId === "iceLance") {
      const dmg = 8 + Math.floor(INT_ * 1.8);
      enemyHp = Math.max(0, enemyHp - dmg);
      setLog(`アイスランス！ ${currentEnemy.name} に${dmg}ダメージ（防御が下がった気がする）`);
    } else if (skillId === "chainLightning") {
      const hits = 2 + Math.floor(Math.random() * 2); // 2〜3Hit
      let total = 0;
      for (let i = 0; i < hits; i++) {
        const one = 6 + Math.floor(INT_ * 1.3);
        total += one;
      }
      enemyHp = Math.max(0, enemyHp - total);
      setLog(`チェインライトニング！ ${currentEnemy.name} に${hits}ヒット合計${total}ダメージ`);
    } else if (skillId === "beastHeal") {
      if (jobId !== 2) {
        setLog("この魔法は動物使い専用だ");
      } else {
        const heal = Math.floor(petHpMax * 0.4) + 5;
        petHp = Math.min(petHp + heal, petHpMax);
        setLog(`ビーストヒール！ ペットのHPが${heal}回復した`);
      }
    }
  
    // ダメージ系魔法のときだけペットターン＋敵ターン
    if (skillId !== "beastHeal") {
      // 先にペット行動（倒しきれば敵ターンは来ない）
      doPetTurn();
      if (enemyHp > 0) {
        enemyTurn();
      }
    }
  
    updateDisplay();
  }
  
  // =======================
  // 物理スキル発動（UIセレクト版）
  // =======================
  
  function useSkillFromUI() {
    if (jobId !== 0 && jobId !== 2) {
      setLog("スキルを扱える職業ではない");
      return;
    }
    const sel = document.getElementById("skillSelect");
    if (!sel) return;
    const skillId = sel.value;
    if (!skillId) {
      setLog("使用するスキルを選んでください");
      return;
    }
    const jobSkills = JOB_SKILLS[jobId] || { phys: [] };
    const skill = jobSkills.phys.find(s => s.id === skillId);
    if (!skill) {
      setLog("そのスキルは使用できない");
      return;
    }
  
    if (!currentEnemy && skillId !== "animalLink") {
      setLog("敵がいない");
      return;
    }
  
    const spCost = skill.spCost || 0;
    if (sp < spCost) {
      setLog("SPが足りない");
      return;
    }
    sp -= spCost;
  
    if (skillId === "powerSlash") {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.5);
      enemyHp = Math.max(0, enemyHp - dmg);
      setLog(`パワースラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    } else if (skillId === "shieldBlow") {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
      enemyHp = Math.max(0, enemyHp - dmg);
      shieldBlowGuardTurnRemain = 1;
      setLog(`シールドブロウ！ ${currentEnemy.name} に${dmg}ダメージ（次の被ダメージ軽減）`);
    } else if (skillId === "braveCharge") {
      braveChargeTurnRemain = 2;
      setLog("ブレイブチャージ！ しばらく攻撃力が上がった");
    } else if (skillId === "beastSlash") {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
      enemyHp = Math.max(0, enemyHp - dmg);
      setLog(`ビーストスラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    } else if (skillId === "animalLink") {
      if (jobId !== 2) {
        setLog("アニマルリンクは動物使い専用だ");
      } else {
        petBuffRate = 1.4;
        petBuffTurnRemain = 2;
        setLog("アニマルリンク！ ペットの攻撃力が上がった");
      }
    }
  
    // アニマルリンク（純バフ）のときは敵ターンだけ、他はペット→敵ターン
    if (skillId === "animalLink") {
      enemyTurn();
    } else {
      if (enemyHp <= 0) {
        winBattle();
      } else {
        // 先にペット行動（倒せば敵ターンなし）
        doPetTurn();
        if (enemyHp > 0) {
          enemyTurn();
        }
      }
    }
  
    updateDisplay();
  }
  
  // =======================
  // game-ui.js から呼ばれるラッパー
  // =======================
  
  // セレクトの中身更新
  function refreshMagicSelect() {
    refreshSkillUIs();
  }
  function refreshSkillSelect() {
    refreshSkillUIs();
  }
  
  // 実行
  function castSelectedMagic() {
    castMagicFromUI();
  }
  function useSelectedSkill() {
    useSkillFromUI();
  }
  
  // =======================
  // 職業ごとのスキルUI表示切り替え
  // =======================
  
  function updateBattleSkillUIByJob() {
    const magicBlock = document.getElementById("magicBlock");
    const skillBlock = document.getElementById("skillBlock");
    const magicBtn   = document.getElementById("castMagicBtn");
    const skillBtn   = document.getElementById("useSkillBtn");
    if (!magicBlock || !skillBlock || !magicBtn || !skillBtn) return;
  
    if (jobId === 0) {
      // 戦士: 武技だけ
      magicBlock.style.display = "none";
      magicBtn.style.display   = "none";
      skillBlock.style.display = "";
      skillBtn.style.display   = "";
    } else if (jobId === 1) {
      // 魔法使い: 魔法だけ
      magicBlock.style.display = "";
      magicBtn.style.display   = "";
      skillBlock.style.display = "none";
      skillBtn.style.display   = "none";
    } else if (jobId === 2) {
      // 動物使い: 両方表示
      magicBlock.style.display = "";
      magicBtn.style.display   = "";
      skillBlock.style.display = "";
      skillBtn.style.display   = "";
    } else {
      magicBlock.style.display = "";
      magicBtn.style.display   = "";
      skillBlock.style.display = "";
      skillBtn.style.display   = "";
    }
  }