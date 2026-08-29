// skill-core-2.js
// 物理スキル発動ロジック・スキルUI切り替えラッパー
// 前提: skill-core-1.js で定義された JOB_SKILLS, getCurrentAtkForSkill, runPetOrPartyTurnForCurrentJob などを参照

// =======================
// 物理スキル発動（UI セレクト版）
// =======================

function useSkillFromUI() {
  // 物理スキル使用可能職判定
  if (typeof jobCanUsePhysSkill === "function") {
    if (!jobCanUsePhysSkill()) {
      appendLog("スキルを扱える職業ではない");
      return;
    }
  } else {
    if (jobId !== 0 && jobId !== 2 && jobId !== 100 && jobId !== 102 &&
        jobId !== 200 && jobId !== 201 && jobId !== 202 && jobId !== 203 && jobId !== 204 && jobId !== 205 &&
        jobId !== 300 && jobId !== 301 && jobId !== 400 && jobId !== 401 && jobId !== 402) {
      appendLog("スキルを扱える職業ではない");
      return;
    }
  }

  const sel = document.getElementById("skillSelect");
  if (!sel) return;
  const skillId = sel.value;
  if (!skillId) {
    appendLog("使用するスキルを選んでください");
    return;
  }
  const jobSkills = JOB_SKILLS[jobId] || { phys: [] };
  const skill = jobSkills.phys.find(s => s.id === skillId);
  if (!skill) {
    appendLog("そのスキルは使用できない");
    return;
  }

  // スキル種別（攻撃系 or 防御・回復系）に応じたスキルEXP加算
  if (typeof handleSkillExpOnUse === "function") {
    handleSkillExpOnUse(skillId);
  }

  const guildId = typeof window !== "undefined" ? window.playerGuildId : null;
  // ★ ガードインパクトは戦士ギルド所属中のみ使用可能
  if (skillId === "guardImpact" && guildId !== "warrior") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }
  // ★ ビーストロアは動物使いギルド所属中のみ使用可能
  if (skillId === "beastRoar" && guildId !== "tamer") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }
  // ★ パックフレンジーは動物使いギルド所属中のみ使用可能
  if (skillId === "packFrenzy" && guildId !== "tamer") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }
  // ★ 大盾兵カウンタースタンスは戦士ギルド所属中のみ使用可能
  if (skillId === "greatshieldCounter" && guildId !== "warrior") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }

  // バフ・回復系スキルは敵がいなくても使える（自己バフ）
  if (!currentEnemy &&
      skillId !== "animalLink" &&
      skillId !== "beastRoar" &&
      skillId !== "packRally" &&
      skillId !== "packFrenzy" &&
      skillId !== "itemBoost" &&
      skillId !== "potionBoost" &&
      skillId !== "greatshieldCounter" &&
      skillId !== "greatshieldFortify" &&
      skillId !== "greatshieldGuardStance" &&
      skillId !== "wildHerbPoultice" &&
      skillId !== "interceptFormation" &&
      skillId !== "harvestBlessing" &&
      skillId !== "whetstoneSharpen" &&
      skillId !== "parryCounter" &&
      skillId !== "nourishingSoup") {
    appendLog("敵がいない");
    return;
  }

  // プレイヤー行動前の状態異常チェック
  if (typeof beforeActionPlayer === "function") {
    const pre = beforeActionPlayer();
    if (!pre || !pre.canAct) {
      if (currentEnemy) {
        enemyTurn();
        if (typeof tickStatusesTurnEndForBoth === "function") {
          tickStatusesTurnEndForBoth();
        }
        if (typeof renderPlayerStatusIcons === "function") {
          renderPlayerStatusIcons();
        }
        if (typeof updateEnemyStatusUI === "function") {
          updateEnemyStatusUI();
        }
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }
  }

  const spCost = skill.spCost || 0;
  if (sp < spCost) {
    appendLog("SP が足りない");
    return;
  }
  sp -= spCost;

  let didDamage = false;

  if (skillId === "powerSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.5);
    enemyHp = Math.max(0, enemyHp - dmg);

    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

    appendLog(`パワースラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "shieldBlow") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
    enemyHp = Math.max(0, enemyHp - dmg);
    shieldBlowGuardTurnRemain = 1;

    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

    appendLog(`シールドブロウ！ ${currentEnemy.name} に${dmg}ダメージ（次の被ダメージ軽減）`);
    didDamage = true;
  } else if (skillId === "braveCharge") {
    braveChargeTurnRemain = 2;
    appendLog("ブレイブチャージ！ しばらく攻撃力が上がった");
  } else if (skillId === "guardImpact") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.1);
    enemyHp = Math.max(0, enemyHp - dmg);
    shieldBlowGuardTurnRemain = 2;

    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

    appendLog(`ガードインパクト！ ${currentEnemy.name} に${dmg}ダメージ（しばらく被ダメージ軽減）`);
    didDamage = true;
  } else if (skillId === "beastSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
    enemyHp = Math.max(0, enemyHp - dmg);

    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

    appendLog(`ビーストスラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "animalLink") {
    if (jobId !== 2) {
      appendLog("アニマルリンクは動物使い専用だ");
    } else {
      petBuffRate = 1.4;
      petBuffTurnRemain = 2;
      appendLog(`アニマルリンク！ ${petName}の攻撃力が上がった`);
    }
  } else if (skillId === "beastRoar") {
    if (jobId !== 2) {
      appendLog("ビーストロアは動物使い専用だ");
    } else {
      petBuffRate = 1.6;
      petBuffTurnRemain = 3;
      appendLog(`ビーストロア！ ${petName}の力がみなぎった`);
    }
  } else if (skillId === "packSlash") {
    if (jobId !== 102) {
      appendLog("パックスラッシュは獣群使い専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`パックスラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
      didDamage = true;
    }
  } else if (skillId === "packRally") {
    if (jobId !== 102) {
      appendLog("群れの咆哮は獣群使い専用だ");
    } else {
      beastPartyBuffRate = 1.3;
      beastPartyBuffTurnRemain = 2;
      appendLog("群れの咆哮！ パーティ全員の攻撃力が上がった");
    }
  } else if (skillId === "packFrenzy") {
    if (jobId !== 102) {
      appendLog("パックフレンジーは獣群使い専用だ");
    } else {
      beastPartyBuffRate = 1.5;
      beastPartyBuffTurnRemain = 3;
      appendLog("パックフレンジー！ パーティ全員が興奮状態になった");
    }
  } else if (skillId === "packMend") {
    if (jobId !== 102) {
      appendLog("この魔法は獣群使い専用だ");
    } else if (typeof getActivePartyRecords !== "function") {
      appendLog("パーティ情報が取得できなかった");
    } else {
      const party = getActivePartyRecords(true);
      if (party.length === 0) {
        appendLog("回復できるペットがいない");
      } else {
        const flatBonusPerPet = Math.max(1, Math.round(5 / party.length));
        const healedNames = [];
        for (const rec of party) {
          const heal = Math.floor((rec.hpMax || 1) * 0.4) + flatBonusPerPet;
          rec.hp = Math.min((rec.hp || 0) + heal, rec.hpMax || heal);
          healedNames.push(rec.name);
        }
        appendLog(`群れの手当て！ ${healedNames.join("・")}のHPが回復した`);
      }
    }
  } else if (skillId === "potionBoost") {
    if (jobId !== 202) {
      appendLog("ポーションブーストは錬金術師専用だ");
    } else {
      potionBoostTurnRemain = 3;
      appendLog("ポーションブースト！ しばらくポーションの効果がさらに高まった");
    }
  } else if (skillId === "itemBoost") {
    if (jobId !== 203) {
      appendLog("アイテムブーストは道具使い専用だ");
    } else {
      itemBoostTurnRemain = 3;
      appendLog("アイテムブースト！ しばらく道具の効果がさらに高まった");
    }
  } else if (skillId === "armorCrush") {
    if (jobId !== 200) {
      appendLog("装甲粉砕は鍛冶職人専用だ");
    } else {
      const smithLv = getSmithCraftSkillLevel();
      const mult = 1.2 + 0.3 * Math.min(1, smithLv / 100);
      const dmg = Math.floor(getCurrentAtkForSkill() * mult);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`装甲粉砕！ 鍛冶の技術で急所を叩き割り、${currentEnemy.name} に${dmg}ダメージ！`);
      if (typeof addStatusToEnemy === "function") {
        addStatusToEnemy("def_down");
        appendLog(`${currentEnemy.name}の装甲が破壊され、防御力が低下した！（防御ダウン）`);
      }
      didDamage = true;
    }
  } else if (skillId === "whetstoneSharpen") {
    if (jobId !== 200) {
      appendLog("刃研ぎは鍛冶職人専用だ");
    } else {
      if (typeof addSkillStatusToPlayer === "function") {
        addSkillStatusToPlayer("sharpen", 3);
      }
      appendLog("刃研ぎ！ 武器の刃を極限まで研ぎ澄まし、攻撃力と会心率が大幅に上昇した！");
    }
  } else if (skillId === "parryCounter") {
    if (jobId !== 201) {
      appendLog("受け流し反撃は武具使い専用だ");
    } else {
      parryGuardTurnRemain = 1;
      if (typeof addSkillStatusToPlayer === "function") {
        addSkillStatusToPlayer("counter", 2);
      }
      appendLog("受け流し反撃！ 武具の受け流し構えを取った！（次の被ダメ70%軽減＆反撃準備）");
    }
  } else if (skillId === "consecutiveStrike") {
    if (jobId !== 201) {
      appendLog("連撃破は武具使い専用だ");
    } else {
      const atk = getCurrentAtkForSkill();
      const dmg1 = Math.max(1, Math.floor(atk * 0.9));
      enemyHp = Math.max(0, enemyHp - dmg1);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg1);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg1);
      }

      appendLog(`連撃破！ 熟練の武具捌きによる2連撃！`);
      appendLog(`1撃目：${currentEnemy.name} に${dmg1}ダメージ！`);

      if (enemyHp > 0) {
        const dmg2 = Math.max(1, Math.floor(atk * 0.9));
        enemyHp = Math.max(0, enemyHp - dmg2);
        if (typeof currentBattleMaxDamage === "number") {
          currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg2);
        }
        if (typeof currentBattleMaxPhys === "number") {
          currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg2);
        }
        appendLog(`2撃目：${currentEnemy.name} に${dmg2}ダメージ！`);
      }
      didDamage = true;
    }
  } else if (skillId === "greatshieldCounter") {
    if (jobId !== 100) {
      appendLog("カウンタースタンスは大盾兵専用だ");
    } else {
      if (typeof addSkillStatusToPlayer === "function") {
        addSkillStatusToPlayer("counter", 2);
      }
      appendLog("カウンタースタンス！ 次の被ダメージに対して反撃の構えを取った");
    }
  } else if (skillId === "greatshieldSmash") {
    if (jobId !== 100) {
      appendLog("大盾砕きは大盾兵専用だ");
    } else if (!currentEnemy) {
      appendLog("敵がいない");
    } else {
      const defBase = typeof defTotal === "number" ? defTotal : 0;
      let dmg = Math.floor(defBase * 0.8) + 10;
      dmg = Math.floor(dmg * (1 + getPhysSkillRateMultiplier()));
      if (dmg < 1) dmg = 1;

      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`大盾砕き！ ${currentEnemy.name} に${dmg}ダメージ（防御力を活かした一撃）`);
      didDamage = true;
    }
  } else if (skillId === "greatshieldFortify") {
    if (jobId !== 100) {
      appendLog("堅固の大盾は大盾兵専用だ");
    } else {
      greatshieldFortifyTurnRemain = 5;
      appendLog("堅固の大盾！ しばらく防御力が上がった");
    }
  } else if (skillId === "greatshieldGuardStance") {
    if (jobId !== 100) {
      appendLog("護の構えは大盾兵専用だ");
    } else {
      greatshieldGuardStanceTurnRemain = 3;
      appendLog("護の構え！ 大盾を構え直し、敵の攻撃をしのぐ体勢を取った");
    }
  } else if (skillId === "sandToss") {
    if (jobId !== 300) {
      appendLog("目潰し砂煙は採集士専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`目潰し砂煙！ 採取の勘で砂煙を巻き上げ、${currentEnemy.name} に${dmg}ダメージ！`);
      if (typeof addStatusToEnemy === "function") {
        addStatusToEnemy("blind");
        appendLog(`${currentEnemy.name}の視界を奪った！（暗闇付与）`);
      }
      didDamage = true;
    }
  } else if (skillId === "wildHerbPoultice") {
    if (jobId !== 300) {
      appendLog("野草の調合は採集士専用だ");
    } else {
      const healAmt = Math.floor(hpMax * 0.20) + 5;
      const beforeHp = hp;
      hp = Math.min(hpMax, hp + healAmt);
      const actualHeal = hp - beforeHp;

      const slipIds = ["poison", "burn", "bleed"];
      let curedName = null;
      if (Array.isArray(playerStatuses)) {
        const sIdx = playerStatuses.findIndex(s => slipIds.includes(s.id));
        if (sIdx >= 0) {
          const removed = playerStatuses.splice(sIdx, 1)[0];
          const def = typeof STATUS_EFFECTS !== "undefined" ? STATUS_EFFECTS[removed.id] : null;
          curedName = def ? def.name : removed.id;
        }
      }

      if (curedName) {
        appendLog(`野草の調合！ 自生する薬草ですり傷や毒素を手当てし、HPが${actualHeal}回復！【${curedName}】が治った！`);
      } else {
        appendLog(`野草の調合！ 自生する薬草を素早くすり潰して応急手当てし、HPが${actualHeal}回復！`);
      }
    }
  } else if (skillId === "overseerStrike") {
    if (jobId !== 301) {
      appendLog("監督官の号令は採取監督官専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`監督官の号令！ 拠点運営で鍛えた的確な一撃！ ${currentEnemy.name} に${dmg}ダメージ！`);
      didDamage = true;
    }
  } else if (skillId === "interceptFormation") {
    if (jobId !== 301) {
      appendLog("迎撃防衛陣は採取監督官専用だ");
    } else {
      if (typeof addSkillStatusToPlayer === "function") {
        addSkillStatusToPlayer("def_up", 3);
        addSkillStatusToPlayer("counter", 2);
      }
      appendLog("迎撃防衛陣！ 拠点の防衛陣形を展開した！（防御力UP＆反撃準備）");
    }
  } else if (skillId === "hunterSnare") {
    if (jobId !== 400) {
      appendLog("狩人の罠は狩猟師専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`狩人の罠！ 足元に罠を仕掛けて ${currentEnemy.name} に${dmg}ダメージ！`);
      if (typeof addStatusToEnemy === "function") {
        addStatusToEnemy("slow");
        appendLog(`${currentEnemy.name}は罠にかかり、行動速度が低下した！（鈍化付与）`);
      }
      didDamage = true;
    }
  } else if (skillId === "vitalStrike") {
    if (jobId !== 400) {
      appendLog("急所突きは狩猟師専用だ");
    } else {
      let dmg = Math.floor(getCurrentAtkForSkill() * 1.35);

      let critRate = 0.35;
      if (typeof getBaseCritRateFromLuk === "function") {
        critRate += getBaseCritRateFromLuk();
      }
      if (Math.random() < critRate) {
        let critMult = 1.4;
        dmg = Math.floor(dmg * critMult);
        appendLog(`急所突き！ 急所を完璧に捉えた！ 会心の一撃で ${currentEnemy.name} に${dmg}ダメージ！`);
      } else {
        appendLog(`急所突き！ ${currentEnemy.name} の急所に${dmg}ダメージ！`);
      }

      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      didDamage = true;
    }
  } else if (skillId === "harpoonThrust") {
    if (jobId !== 401) {
      appendLog("銛突きは漁師専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.25);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`銛突き！ 鋭い銛で ${currentEnemy.name} を貫き、${dmg}ダメージ！`);
      if (typeof addStatusToEnemy === "function" && Math.random() < 0.6) {
        addStatusToEnemy("bleed");
        appendLog(`${currentEnemy.name}に深い傷を負わせた！（出血付与）`);
      }
      didDamage = true;
    }
  } else if (skillId === "castNet") {
    if (jobId !== 401) {
      appendLog("投網拘束は漁師専用だ");
    } else {
      const dmg = Math.max(1, Math.floor(getCurrentAtkForSkill() * 1.0));
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`投網拘束！ 丈夫な漁網を投げつけて ${currentEnemy.name} に${dmg}ダメージ！`);

      if (typeof addStatusToEnemy === "function") {
        addStatusToEnemy("atk_down");
        appendLog(`${currentEnemy.name}は網に絡め取られ、攻撃力が低下した！（攻撃力ダウン）`);
      }
      didDamage = true;
    }
  } else if (skillId === "earthTiller") {
    if (jobId !== 402) {
      appendLog("耕作の一撃は農夫専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`耕作の一撃！ 鍬で足元の土壌を耕して足場を崩し、${currentEnemy.name} に${dmg}ダメージ！`);
      if (typeof addStatusToEnemy === "function") {
        addStatusToEnemy("def_down");
        appendLog(`${currentEnemy.name}は体勢を崩した！（防御ダウン）`);
      }
      didDamage = true;
    }
  } else if (skillId === "harvestBlessing") {
    if (jobId !== 402) {
      appendLog("豊穣の恵みは農夫専用だ");
    } else {
      const healAmt = Math.floor(hpMax * 0.18) + 6;
      const beforeHp = hp;
      hp = Math.min(hpMax, hp + healAmt);
      const actualHeal = hp - beforeHp;

      if (typeof addSkillStatusToPlayer === "function") {
        addSkillStatusToPlayer("regen", 2);
      }

      appendLog(`豊穣の恵み！ 採れたての大地の恵みを口にして HP が${actualHeal}回復！ リジェネ状態になった！`);
    }
  } else if (skillId === "spiceBlind") {
    if (jobId !== 204) {
      appendLog("スパイス目潰しは料理人専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`スパイス目潰し！ 激辛香辛料を浴びせ、${currentEnemy.name} に${dmg}ダメージ！`);
      if (typeof addStatusToEnemy === "function") {
        addStatusToEnemy("blind");
        appendLog(`${currentEnemy.name}は視界を奪われた！（暗闇付与）`);
      }
      didDamage = true;
    }
  } else if (skillId === "nourishingSoup") {
    if (jobId !== 204) {
      appendLog("滋養スープは料理人専用だ");
    } else {
      const debuffIds = ["poison", "burn", "bleed", "curse", "slow", "def_down", "atk_down", "blind", "paralyze", "sleep", "confuse", "silence"];
      let removedName = null;
      if (Array.isArray(playerStatuses)) {
        const dIdx = playerStatuses.findIndex(s => debuffIds.includes(s.id));
        if (dIdx >= 0) {
          const removed = playerStatuses.splice(dIdx, 1)[0];
          const def = typeof STATUS_EFFECTS !== "undefined" ? STATUS_EFFECTS[removed.id] : null;
          removedName = def ? def.name : removed.id;
        }
      }

      const healAmt = Math.floor(hpMax * 0.22) + 8;
      const beforeHp = hp;
      hp = Math.min(hpMax, hp + healAmt);
      const actualHeal = hp - beforeHp;

      if (typeof addSkillStatusToPlayer === "function") {
        addSkillStatusToPlayer("regen", 3);
      }

      if (removedName) {
        appendLog(`滋養スープ！ 特製スープで【${removedName}】が浄化され、HPが${actualHeal}回復！ リジェネ状態になった！`);
      } else {
        appendLog(`滋養スープ！ 身体を芯から温める特製スープで HP が${actualHeal}回復！ リジェネ状態になった！`);
      }
    }
  } else if (skillId === "hungerBurst") {
    if (jobId !== 205) {
      appendLog("満腹バーストは貪食家専用だ");
    } else {
      const currentHunger = typeof hunger === "number" ? hunger : 100;
      if (typeof hunger === "number") {
        hunger = Math.max(0, hunger - 10);
      }

      const hungerRatio = Math.max(0, Math.min(100, currentHunger)) / 100;
      const mult = 1.2 + 0.4 * hungerRatio;
      const dmg = Math.floor(getCurrentAtkForSkill() * mult);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`満腹バースト！ 満腹のエネルギーを放ち、${currentEnemy.name} に${dmg}ダメージ！（満腹度-10）`);
      didDamage = true;
    }
  } else if (skillId === "digestDrain") {
    if (jobId !== 205) {
      appendLog("丸呑み消化は貪食家専用だ");
    } else {
      const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      const drain = Math.max(1, Math.floor(dmg * 0.15));
      const beforeHp = hp;
      hp = Math.min(hpMax, hp + drain);
      const actualDrain = hp - beforeHp;

      appendLog(`丸呑み消化！ ${currentEnemy.name} に${dmg}ダメージを与え、生命力を喰らって HP を${actualDrain}回復！`);

      const debuffIds = ["poison", "burn", "bleed", "curse", "slow", "def_down", "atk_down", "blind", "paralyze", "sleep", "confuse", "silence"];
      if (Array.isArray(playerStatuses)) {
        const dIdx = playerStatuses.findIndex(s => debuffIds.includes(s.id));
        if (dIdx >= 0) {
          const removed = playerStatuses.splice(dIdx, 1)[0];
          const def = typeof STATUS_EFFECTS !== "undefined" ? STATUS_EFFECTS[removed.id] : null;
          const sName = def ? def.name : removed.id;
          sp = Math.min(spMax || 10, (sp || 0) + 2);
          appendLog(`強靭な胃袋で【${sName}】を消化！ 活力が湧き SP が2回復した！`);
        }
      }

      didDamage = true;
    }
  }

  if (skillId === "animalLink" ||
      skillId === "braveCharge" ||
      skillId === "beastRoar" ||
      skillId === "packRally" ||
      skillId === "packFrenzy" ||
      skillId === "itemBoost" ||
      skillId === "potionBoost" ||
      skillId === "greatshieldCounter" ||
      skillId === "greatshieldFortify" ||
      skillId === "greatshieldGuardStance" ||
      skillId === "wildHerbPoultice" ||
      skillId === "interceptFormation" ||
      skillId === "harvestBlessing" ||
      skillId === "whetstoneSharpen" ||
      skillId === "parryCounter" ||
      skillId === "nourishingSoup") {
    if (currentEnemy) {
      enemyTurn();
      if (typeof tickStatusesTurnEndForBoth === "function") {
        tickStatusesTurnEndForBoth();
      }
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
    }
  } else if (didDamage) {
    if (enemyHp <= 0) {
      enemyHp = 0;

      if (typeof onEnemyKilledForGuild === "function") {
        onEnemyKilledForGuild({ by: "phys", isBoss: !!isBossBattle });
      }

      winBattle(true, "phys");
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }

    runPetOrPartyTurnForCurrentJob();
    if (enemyHp > 0) {
      enemyTurn();
      if (typeof tickStatusesTurnEndForBoth === "function") {
        tickStatusesTurnEndForBoth();
      }
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
    }
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// game-ui.js から呼ばれるラッパー
// =======================

function refreshMagicSelect() {
  refreshSkillUIs();
}
function refreshSkillSelect() {
  refreshSkillUIs();
}

function castSelectedMagic() {
  castMagicFromUI();
}
function useSelectedSkill() {
  useSkillFromUI();
}

// =======================
// 職業ごとのスキル UI 表示切り替え
// =======================

function updateBattleSkillUIByJob() {
  const magicBlock = document.getElementById("magicBlock");
  const skillBlock = document.getElementById("skillBlock");
  const magicBtn   = document.getElementById("castMagicBtn");
  const skillBtn   = document.getElementById("useSkillBtn");
  if (!magicBlock || !skillBlock || !magicBtn || !skillBtn) return;

  const hasMagic = (typeof jobCanUseMagic === "function")
    ? jobCanUseMagic()
    : (jobId === 1 || jobId === 2 || jobId === 101 || jobId === 102 || jobId === 202);
  const hasPhys  = (typeof jobCanUsePhysSkill === "function")
    ? jobCanUsePhysSkill()
    : (jobId === 0 || jobId === 2 || jobId === 100 || jobId === 102 || jobId === 200 || jobId === 201 || jobId === 202 || jobId === 203 || jobId === 204 || jobId === 205 || jobId === 300 || jobId === 301 || jobId === 400 || jobId === 401 || jobId === 402);

  magicBlock.style.display = hasMagic ? "" : "none";
  magicBtn.style.display   = hasMagic ? "" : "none";
  skillBlock.style.display = hasPhys  ? "" : "none";
  skillBtn.style.display   = hasPhys  ? "" : "none";
}

function updateSkillButtonsByJob() {
  const magicBlock = document.getElementById("magicBlock");
  const skillBlock = document.getElementById("skillBlock");

  const hasMagic = (typeof jobCanUseMagic === "function")
    ? jobCanUseMagic()
    : (jobId === 1 || jobId === 2 || jobId === 101 || jobId === 102 || jobId === 202);
  const hasPhys  = (typeof jobCanUsePhysSkill === "function")
    ? jobCanUsePhysSkill()
    : (jobId === 0 || jobId === 2 || jobId === 100 || jobId === 102 || jobId === 200 || jobId === 201 || jobId === 202 || jobId === 203 || jobId === 204 || jobId === 205 || jobId === 300 || jobId === 301 || jobId === 400 || jobId === 401 || jobId === 402);

  if (magicBlock) magicBlock.style.display = hasMagic ? "" : "none";
  if (skillBlock) skillBlock.style.display = hasPhys  ? "" : "none";
}
