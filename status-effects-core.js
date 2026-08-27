// status-effects-core.js
// 状態異常・バフデバフの定義とロジック（UI や戦闘フローは別ファイル）

// =======================
// バフソース種別定数
// =======================
//
// いずれ料理バフ・スキルバフ・ポーションバフなどを
// 別カテゴリで管理できるようにするための種別。

const BUFF_SOURCE_FOOD   = "food";
const BUFF_SOURCE_DRINK  = "drink";
const BUFF_SOURCE_SKILL  = "skill";
const BUFF_SOURCE_POTION = "potion";
const BUFF_SOURCE_OTHER  = "other";

// =======================
// 状態配列
// =======================
//
// プレイヤー: playerStatuses
// 敵: enemyStatuses
//
// ターン管理は「プレイヤー行動＋敵行動」で1ターン進む前提。
// 毎ターン終了時に tickStatusesTurnEndForBoth を呼ぶ。

let playerStatuses = [];
let enemyStatuses  = [];

// ★錬金術師用: 状態異常ダメージボーナス
// ★修正: ハードコードされていた ×1.5 を、jobs.js の dotDamageRate 経由に変更
function applyAlchemistDotBonus(dmg) {
  if (typeof getAlcDotDamageRate === "function") {
    return Math.max(1, Math.floor(dmg * getAlcDotDamageRate()));
  }
  return dmg;
}

// ★カウンター用: 「防御前の生ダメージ」を一時保存しておく場所
//   ・敵がプレイヤーに攻撃するとき、ダメージ計算の最初で
//     setLastRawEnemyDamage(raw) を呼ぶ想定。
//   ・防御バフや被ダメ軽減をかける前の値を入れておく。
let lastRawEnemyDamage = 0;
function setLastRawEnemyDamage(raw) {
  if (typeof raw === "number" && raw > 0) {
    lastRawEnemyDamage = raw;
  } else {
    lastRawEnemyDamage = 0;
  }
}
function getLastRawEnemyDamage() {
  return lastRawEnemyDamage;
}

// ★修正: counter ステータス（大盾兵のカウンタースタンス）から呼ばれる想定だったが
//   未定義だったため、ログにダメージ数値は出るのに enemyHp が一切減らないバグが
//   あった。ここで実際に enemyHp を減算し、戦闘統計・UI も更新する。
//   ※敵の撃破判定（HP0になった後の勝利処理）は、この関数の呼び出し元である
//     enemyTurn() 側（game-core-3.js）で、ログ出力や player 側の生死判定が
//     終わったあとに行う（currentEnemy を早期に null にすると直後の
//     appendLog が壊れるため）。
function onCounterDamageToEnemy(dmg) {
  if (typeof dmg !== "number" || dmg <= 0) return;
  if (typeof enemyHp !== "number") return;

  enemyHp = Math.max(0, enemyHp - dmg);

  if (typeof currentBattleMaxDamage === "number") {
    currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
  }
  if (typeof currentBattleMaxPhys === "number") {
    currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
  }
}

// =======================
// 状態定義テーブル
// =======================

const STATUS_EFFECTS = {
  poison: {
    id: "poison",
    name: "毒",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      let dmg = Math.max(1, Math.floor(hpMax * 0.04));

      // ★錬金術師なら状態異常ダメージ+50%
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}は毒で${dmg}ダメージを受けた！`);
    }
  },
  burn: {
    id: "burn",
    name: "やけど",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      let dmg = Math.max(1, Math.floor(hpMax * 0.03));

      // ★錬金術師なら状態異常ダメージ+50%
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}はやけどで${dmg}ダメージを受けた！`);
    },
    modifyAttack(mult) {
      return mult * 0.9;
    }
  },
  bleed: {
    id: "bleed",
    name: "出血",
    baseDuration: 2,
    onTurnEnd(targetCtx) {
      const hpNow = targetCtx.hp();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      let dmg = Math.max(1, Math.floor(hpNow * 0.06));

      // ★錬金術師なら状態異常ダメージ+50%
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}は出血で${dmg}ダメージを受けた！`);
    }
  },
  curseWither: {
    id: "curseWither",
    name: "呪い",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;

      // ★呪術師スキル「衰弱の呪詛」用のDOT。HP割合＋術者のINTで伸びる継続ダメージ。
      const baseInt = (typeof getEffectiveIntForMagic === "function") ? getEffectiveIntForMagic() : 0;
      let dmg = Math.max(1, Math.floor(hpMax * 0.03) + Math.floor(baseInt * 0.4));

      // ★錬金術師なら状態異常ダメージ+50%（他のDOTと同じ経路。呪術師自身には無関係）
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}は呪いに蝕まれ${dmg}ダメージを受けた！`);
    }
  },
  regen: {
    id: "regen",
    name: "リジェネ",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.04));
      applyHp(heal);
      appendLog(`${name}はリジェネで${heal}回復した！`);
    }
  },
  atk_up: {
    id: "atk_up",
    name: "攻撃アップ",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.25;
    }
  },
  atk_down: {
    id: "atk_down",
    name: "攻撃ダウン",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 0.8;
    }
  },
  def_up: {
    id: "def_up",
    name: "防御アップ",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 0.75;
    }
  },
  slow: {
    id: "slow",
    name: "鈍化",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 0.75;
    }
  },
  def_down: {
    id: "def_down",
    name: "防御ダウン",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 1.25;
    }
  },
  blind: {
    id: "blind",
    name: "暗闇",
    baseDuration: 3,
    modifyAccuracy(acc) {
      return acc - 0.3;
    }
  },
  gather_focus: {
    id: "gather_focus",
    name: "集中（採取の勘）",
    baseDuration: 3,
    modifyAccuracy(acc) {
      return acc + 0.15;
    },
    modifyCritRate(rate) {
      return rate + 0.08;
    }
  },
  paralyze: {
    id: "paralyze",
    name: "麻痺",
    baseDuration: 2,
    beforeAction(targetCtx) {
      if (Math.random() < 0.5) {
        appendLog(`${targetCtx.name}は麻痺して動けない！`);
        return false;
      }
      return true;
    }
  },
  sleep: {
    id: "sleep",
    name: "睡眠",
    baseDuration: 3,
    beforeAction(targetCtx, inst) {
      appendLog(`${targetCtx.name}は眠っていて動けない！`);
      return false;
    },
    onDamaged(targetCtx, inst) {
      inst.remain = 0;
      appendLog(`${targetCtx.name}は目を覚ました！`);
    }
  },
  confuse: {
    id: "confuse",
    name: "混乱",
    baseDuration: 2,
    beforeAction(targetCtx, inst, actionCtx) {
      if (Math.random() < 0.5) {
        actionCtx.forceTarget = "selfOrAlly";
        appendLog(`${targetCtx.name}は混乱している！`);
      }
      return true;
    }
  },
  silence: {
    id: "silence",
    name: "沈黙",
    baseDuration: 3,
    canUseMagic() {
      return false;
    }
  },
  crit_up: {
    id: "crit_up",
    name: "クリティカルアップ",
    baseDuration: 3,
    modifyCritRate(rate) {
      return rate + 0.2;
    }
  },

  // ★クリティカルポーション用バフ（副産物ポーション）
  // 料理・飲み物と同様に、T1〜T3 で効果量だけ変える。
  // Tier が上がるほどクリティカル率上昇量を増やすが、
  // modifyCritRateForPlayer 側で 70% 上限にクランプする仕様は維持する。
  potion_crit_up_T1: {
    id: "potion_crit_up_T1",
    name: "ポーション:クリティカルアップ T1",
    baseDuration: 3,
    modifyCritRate(rate) {
      // ベース crit_up( +0.20 ) より控えめな +0.10
      return rate + 0.10;
    }
  },
  potion_crit_up_T2: {
    id: "potion_crit_up_T2",
    name: "ポーション:クリティカルアップ T2",
    baseDuration: 3,
    modifyCritRate(rate) {
      // T2 は +0.15
      return rate + 0.15;
    }
  },
  potion_crit_up_T3: {
    id: "potion_crit_up_T3",
    name: "ポーション:クリティカルアップ T3",
    baseDuration: 3,
    modifyCritRate(rate) {
      // T3 は +0.20（既存 crit_up と同程度）
      return rate + 0.20;
    }
  },
  potion_crit_up_T4: {
    id: "potion_crit_up_T4",
    name: "ポーション:クリティカルアップ T4",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.175; }
  },
  potion_crit_up_T5: {
    id: "potion_crit_up_T5",
    name: "ポーション:クリティカルアップ T5",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.2; }
  },
  potion_crit_up_T6: {
    id: "potion_crit_up_T6",
    name: "ポーション:クリティカルアップ T6",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.225; }
  },
  potion_crit_up_T7: {
    id: "potion_crit_up_T7",
    name: "ポーション:クリティカルアップ T7",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.25; }
  },
  potion_crit_up_T8: {
    id: "potion_crit_up_T8",
    name: "ポーション:クリティカルアップ T8",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.275; }
  },
  potion_crit_up_T9: {
    id: "potion_crit_up_T9",
    name: "ポーション:クリティカルアップ T9",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.3; }
  },
  potion_crit_up_T10: {
    id: "potion_crit_up_T10",
    name: "ポーション:クリティカルアップ T10",
    baseDuration: 3,
    modifyCritRate(rate) { return rate + 0.325; }
  },

  // ★大盾兵用: カウンターステータス（1 回だけ発動）
  //   ・付与されている間、敵からダメージを受けたときにカウンターを返す
  //   ・反撃ダメージ = 「防御前の生ダメージ」×「職業ごとの倍率」
  //   ・倍率は getCounterDamageRateForJob(jobId) に委譲（大盾兵のみ 1.5 倍）[jobs.js 由来の jobId=100 に対して調整想定]
  //   ・1 回発動したら即座に state を解除（remain = 0）
  counter: {
    id: "counter",
    name: "カウンター",
    baseDuration: 1, // ターン経過での解除より「1回発動で消える」のが主目的
    onDamaged(targetCtx, inst) {
      // 防御などをかける前に、攻撃側で setLastRawEnemyDamage が呼ばれている前提
      const raw = getLastRawEnemyDamage();
      if (!raw || raw <= 0) {
        // 生ダメージが分からない場合は何もしない（ステートは残す）
        return;
      }

      // 職業ごとのカウンター倍率（大盾兵なら 1.5、他は 1.0 想定）
      let rate = 1.0;
      if (typeof getCounterDamageRateForJob === "function" && typeof jobId === "number") {
        const r = getCounterDamageRateForJob(jobId);
        if (typeof r === "number" && r > 0) {
          rate = r;
        }
      }

      const dmg = Math.max(1, Math.floor(raw * rate));

      if (typeof onCounterDamageToEnemy === "function") {
        onCounterDamageToEnemy(dmg);
      }

      appendLog(`${targetCtx.name}のカウンター！${dmg}ダメージを与えた！`);

      // 1 回発動したら解除
      inst.remain = 0;
    }
  },

  // =======================
  // ポーションバフ（料理とは別 ID）
  // =======================

  potion_atk_up_T1: {
    id: "potion_atk_up_T1",
    name: "ポーション:攻撃アップ T1",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.12; // 料理 T1(1.10) より +0.02
    }
  },
  potion_atk_up_T2: {
    id: "potion_atk_up_T2",
    name: "ポーション:攻撃アップ T2",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.20; // 料理 T2(1.18) より +0.02
    }
  },
  potion_atk_up_T3: {
    id: "potion_atk_up_T3",
    name: "ポーション:攻撃アップ T3",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.32; // 料理 T3 系 (1.25〜1.30) より +0.02 程度
    }
  },
  potion_atk_up_T4: {
    id: "potion_atk_up_T4",
    name: "ポーション:攻撃アップ T4",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.36; }
  },
  potion_atk_up_T5: {
    id: "potion_atk_up_T5",
    name: "ポーション:攻撃アップ T5",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.44; }
  },
  potion_atk_up_T6: {
    id: "potion_atk_up_T6",
    name: "ポーション:攻撃アップ T6",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.52; }
  },
  potion_atk_up_T7: {
    id: "potion_atk_up_T7",
    name: "ポーション:攻撃アップ T7",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.6; }
  },
  potion_atk_up_T8: {
    id: "potion_atk_up_T8",
    name: "ポーション:攻撃アップ T8",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.68; }
  },
  potion_atk_up_T9: {
    id: "potion_atk_up_T9",
    name: "ポーション:攻撃アップ T9",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.76; }
  },
  potion_atk_up_T10: {
    id: "potion_atk_up_T10",
    name: "ポーション:攻撃アップ T10",
    baseDuration: 3,
    modifyAttack(mult) { return mult * 1.84; }
  },

  // 守護ポーション（防御アップポーション）
  potion_def_up_T1: {
    id: "potion_def_up_T1",
    name: "ポーション:防御アップ T1",
    baseDuration: 3,
    modifyDefense(mult) {
      // 被ダメージ×0.70（30% カット）
      return mult * 0.70;
    }
  },
  potion_def_up_T2: {
    id: "potion_def_up_T2",
    name: "ポーション:防御アップ T2",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 0.60; // 料理 T2(0.82) より -0.02
    }
  },
  potion_def_up_T3: {
    id: "potion_def_up_T3",
    name: "ポーション:防御アップ T3",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 0.50; // 料理 T3 系 (0.70〜0.75) より -0.02 程度
    }
  },
  potion_def_up_T4: {
    id: "potion_def_up_T4",
    name: "ポーション:防御アップ T4",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.58; }
  },
  potion_def_up_T5: {
    id: "potion_def_up_T5",
    name: "ポーション:防御アップ T5",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.54; }
  },
  potion_def_up_T6: {
    id: "potion_def_up_T6",
    name: "ポーション:防御アップ T6",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.5; }
  },
  potion_def_up_T7: {
    id: "potion_def_up_T7",
    name: "ポーション:防御アップ T7",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.46; }
  },
  potion_def_up_T8: {
    id: "potion_def_up_T8",
    name: "ポーション:防御アップ T8",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.42; }
  },
  potion_def_up_T9: {
    id: "potion_def_up_T9",
    name: "ポーション:防御アップ T9",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.38; }
  },
  potion_def_up_T10: {
    id: "potion_def_up_T10",
    name: "ポーション:防御アップ T10",
    baseDuration: 3,
    modifyDefense(mult) { return mult * 0.34; }
  },

  // コンディションポーション用リジェネ
  potion_regen_T1: {
    id: "potion_regen_T1",
    name: "ポーション:リジェネ T1",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.05)); // 通常リジェネ (0.04) より +1%
      applyHp(heal);
      appendLog(`${name}はポーションの効果で${heal}回復した！`);
    }
  },
  potion_regen_T2: {
    id: "potion_regen_T2",
    name: "ポーション:リジェネ T2",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.06));
      applyHp(heal);
      appendLog(`${name}はポーションの効果で${heal}回復した！`);
    }
  },
  potion_regen_T3: {
    id: "potion_regen_T3",
    name: "ポーション:リジェネ T3",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.07));
      applyHp(heal);
      appendLog(`${name}はポーションの効果で${heal}回復した！`);
    }
  },
  potion_regen_T4: {
    id: "potion_regen_T4",
    name: "ポーション:リジェネ T4",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.08)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },
  potion_regen_T5: {
    id: "potion_regen_T5",
    name: "ポーション:リジェネ T5",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.09)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },
  potion_regen_T6: {
    id: "potion_regen_T6",
    name: "ポーション:リジェネ T6",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.1)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },
  potion_regen_T7: {
    id: "potion_regen_T7",
    name: "ポーション:リジェネ T7",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.11)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },
  potion_regen_T8: {
    id: "potion_regen_T8",
    name: "ポーション:リジェネ T8",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.12)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },
  potion_regen_T9: {
    id: "potion_regen_T9",
    name: "ポーション:リジェネ T9",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.13)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },
  potion_regen_T10: {
    id: "potion_regen_T10",
    name: "ポーション:リジェネ T10",
    baseDuration: 3,
    onTurnEnd(targetCtx) { const heal = Math.max(1, Math.floor(targetCtx.hpMax() * 0.14)); targetCtx.applyHp(heal); appendLog(`${targetCtx.name}はポーションの効果で${heal}回復した！`); }
  },

  // =======================
  // 魔力薬バフ（essence副産物ポーション）
  // 料理魔法ATKバフ(T1:1.10/T2:1.18/T3:1.25)より弱い3ターン版
  // =======================

  potion_magic_up_T1: {
    id: "potion_magic_up_T1",
    name: "ポーション:魔法攻撃アップ T1",
    baseDuration: 3,
    modifyMagicAttack(mult) {
      return mult * 1.08; // 料理T1(1.10)より -0.02
    }
  },
  potion_magic_up_T2: {
    id: "potion_magic_up_T2",
    name: "ポーション:魔法攻撃アップ T2",
    baseDuration: 3,
    modifyMagicAttack(mult) {
      return mult * 1.15; // 料理T2(1.18)より -0.03
    }
  },
  potion_magic_up_T3: {
    id: "potion_magic_up_T3",
    name: "ポーション:魔法攻撃アップ T3",
    baseDuration: 3,
    modifyMagicAttack(mult) {
      return mult * 1.22; // 料理T3(1.25)より -0.03
    }
  },
  potion_magic_up_T4: {
    id: "potion_magic_up_T4",
    name: "ポーション:魔法攻撃アップ T4",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.29; }
  },
  potion_magic_up_T5: {
    id: "potion_magic_up_T5",
    name: "ポーション:魔法攻撃アップ T5",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.36; }
  },
  potion_magic_up_T6: {
    id: "potion_magic_up_T6",
    name: "ポーション:魔法攻撃アップ T6",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.43; }
  },
  potion_magic_up_T7: {
    id: "potion_magic_up_T7",
    name: "ポーション:魔法攻撃アップ T7",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.5; }
  },
  potion_magic_up_T8: {
    id: "potion_magic_up_T8",
    name: "ポーション:魔法攻撃アップ T8",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.57; }
  },
  potion_magic_up_T9: {
    id: "potion_magic_up_T9",
    name: "ポーション:魔法攻撃アップ T9",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.64; }
  },
  potion_magic_up_T10: {
    id: "potion_magic_up_T10",
    name: "ポーション:魔法攻撃アップ T10",
    baseDuration: 3,
    modifyMagicAttack(mult) { return mult * 1.71; }
  },

  // =======================
  // 料理バフ（肉＝物理・魚＝魔法）
  // =======================

  // 肉系：物理攻撃アップ（STR/物理与ダメ）
  food_meat_atk_T1: {
    id: "food_meat_atk_T1",
    name: "料理:物理攻撃アップ T1",
    baseDuration: 30,
    modifyAttack(mult) {
      return mult * 1.10;
    }
  },
  food_meat_atk_T2: {
    id: "food_meat_atk_T2",
    name: "料理:物理攻撃アップ T2",
    baseDuration: 45,
    modifyAttack(mult) {
      return mult * 1.18;
    }
  },
  food_meat_atk_T3: {
    id: "food_meat_atk_T3",
    name: "料理:物理攻撃アップ T3",
    baseDuration: 60,
    modifyAttack(mult) {
      return mult * 1.25;
    }
  },
  food_meat_atk_steak_T2: {
    id: "food_meat_atk_steak_T2",
    name: "料理:物理攻撃アップ (ステーキ T2)",
    baseDuration: 45,
    modifyAttack(mult) {
      return mult * 1.22;
    }
  },
  food_meat_atk_steak_T3: {
    id: "food_meat_atk_steak_T3",
    name: "料理:物理攻撃アップ (ステーキ T3)",
    baseDuration: 60,
    modifyAttack(mult) {
      return mult * 1.30;
    }
  },
  food_meat_atk_roast_T3: {
    id: "food_meat_atk_roast_T3",
    name: "料理:物理攻撃アップ (ロースト T3)",
    baseDuration: 60,
    modifyAttack(mult) {
      return mult * 1.28;
    }
  },

  // 野菜スープ系：防御アップ
  food_veg_def_T1: {
    id: "food_veg_def_T1",
    name: "料理:防御アップ T1",
    baseDuration: 30,
    modifyDefense(mult) {
      return mult * 0.90;
    }
  },
  food_veg_def_T2: {
    id: "food_veg_def_T2",
    name: "料理:防御アップ T2",
    baseDuration: 45,
    modifyDefense(mult) {
      return mult * 0.82;
    }
  },
  food_veg_def_T3: {
    id: "food_veg_def_T3",
    name: "料理:防御アップ T3",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.75;
    }
  },
  food_veg_def_stew_T2: {
    id: "food_veg_def_stew_T2",
    name: "料理:防御アップ (シチュー T2)",
    baseDuration: 45,
    modifyDefense(mult) {
      return mult * 0.78;
    }
  },
  food_veg_def_stew_T3: {
    id: "food_veg_def_stew_T3",
    name: "料理:防御アップ (シチュー T3)",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.70;
    }
  },
  food_veg_def_potage_T3: {
    id: "food_veg_def_potage_T3",
    name: "料理:防御アップ (ポタージュ T3)",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.72;
    }
  },
  food_veg_t2: {
    id: "food_veg_t2",
    name: "料理:防御アップ (汎用 T2)",
    baseDuration: 45,
    modifyDefense(mult) {
      return mult * 0.80;
    }
  },
  food_veg_t3: {
    id: "food_veg_t3",
    name: "料理:防御アップ (汎用 T3)",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.72;
    }
  },

  // 魚スープ系：魔法攻撃アップ（INT/魔法与ダメ）
  food_fish_int_T1: {
    id: "food_fish_int_T1",
    name: "料理:魔法攻撃アップ T1",
    baseDuration: 30,
    modifyMagicAttack(mult) {
      return mult * 1.10;
    }
  },
  food_fish_int_T2: {
    id: "food_fish_int_T2",
    name: "料理:魔法攻撃アップ T2",
    baseDuration: 45,
    modifyMagicAttack(mult) {
      return mult * 1.18;
    }
  },
  food_fish_int_T3: {
    id: "food_fish_int_T3",
    name: "料理:魔法攻撃アップ T3",
    baseDuration: 60,
    modifyMagicAttack(mult) {
      return mult * 1.25;
    }
  },

  // 飲み物バフ
  drink_mp_regen_T1: {
    id: "drink_mp_regen_T1",
    name: "飲み物:回復 T1",
    baseDuration: 30,
    onTurnEnd(targetCtx) {
      const mpMax = targetCtx.mpMax();
      const applyMp = targetCtx.applyMp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(mpMax * 0.04)); // 4%
      applyMp(heal);
      appendLog(`${name}はハーブティーの効果で MP が${heal}回復した…`);
    }
  },
  drink_mp_regen_T2: {
    id: "drink_mp_regen_T2",
    name: "飲み物:回復 T2",
    baseDuration: 45,
    onTurnEnd(targetCtx) {
      const mpMax = targetCtx.mpMax();
      const applyMp = targetCtx.applyMp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(mpMax * 0.06)); // 6%
      applyMp(heal);
      appendLog(`${name}は濃縮ハーブティーの効果で MP が${heal}回復している…`);
    }
  },
  drink_mp_regen_T3: {
    id: "drink_mp_regen_T3",
    name: "飲み物:回復 T3",
    baseDuration: 60,
    onTurnEnd(targetCtx) {
      const mpMax = targetCtx.mpMax();
      const applyMp = targetCtx.applyMp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(mpMax * 0.08)); // 8%
      applyMp(heal);
      appendLog(`${name}は祝福のハーブティーの効果で MP が${heal}回復している…`);
    }
  },
  drink_sp_buff_T1: {
    id: "drink_sp_buff_T1",
    name: "飲み物:活力 T1",
    baseDuration: 30,
    modifyAccuracy(acc) {
      return acc + 0.05;
    },
    modifyCritRate(rate) {
      return rate + 0.03;
    }
  },
  drink_sp_buff_T2: {
    id: "drink_sp_buff_T2",
    name: "飲み物:活力 T2",
    baseDuration: 45,
    modifyAccuracy(acc) {
      return acc + 0.08;
    },
    modifyCritRate(rate) {
      return rate + 0.05;
    }
  },
  drink_sp_buff_T3: {
    id: "drink_sp_buff_T3",
    name: "飲み物:活力 T3",
    baseDuration: 60,
    modifyAccuracy(acc) {
      return acc + 0.10;
    },
    modifyCritRate(rate) {
      return rate + 0.07;
    }
  }
};

// =======================
// 対象コンテキストヘルパ
// =======================
//
// hp / hpMax / enemyHp / enemyHpMax / currentEnemy は
// 他ファイルで定義されている前提。

function makePlayerCtx() {
  return {
    name: "あなた",
    hp: () => hp,
    hpMax: () => hpMax,
    applyHp: delta => {
      hp = Math.max(0, Math.min(hpMax, hp + delta));
    },
    // ★ MP 系（飲み物 MP リジェネ用）
    mp: () => (typeof mp === "number" ? mp : 0),
    mpMax: () => (typeof mpMax === "number" ? mpMax : 0),
    applyMp: delta => {
      if (typeof mp === "number" && typeof mpMax === "number") {
        mp = Math.max(0, Math.min(mpMax, mp + delta));
      }
    }
  };
}

function makeEnemyCtx() {
  return {
    name: currentEnemy ? currentEnemy.name : "敵",
    hp: () => enemyHp,
    hpMax: () => enemyHpMax,
    applyHp: delta => {
      enemyHp = Math.max(0, Math.min(enemyHpMax, enemyHp + delta));
    }
  };
}

// =======================
// 状態の付与
// =======================

function addStatusToPlayer(id) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const ex = playerStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, def.baseDuration);
  } else {
    playerStatuses.push({ id, remain: def.baseDuration, source: BUFF_SOURCE_OTHER });
  }
}

function addStatusToEnemy(id, opts) {
  const def = STATUS_EFFECTS[id];
  if (!def || !currentEnemy) return;

  const fromCurseSkill = !!(opts && opts.fromCurseSkill);

  let baseDur = def.baseDuration || 0;

  // ★修正: ハードコードされていた ×1.25 を、jobs.js の statusDurationRate 経由に変更
  if (typeof getAlcStatusDurationRate === "function") {
    baseDur = Math.max(1, Math.floor(baseDur * getAlcStatusDurationRate()));
  }

  // ★呪術師: 自分がかけた状態異常の効果ターン+1（加算式。錬金術師の倍率とは別軸で足す）
  //   ★修正: 以前はここで職業判定のみ行っていたため、呪術師がアイテム
  //   （battle-items-use.js 側の毒瓶・爆弾など）で敵に状態異常を付与した
  //   場合にも+1ターンが乗ってしまっていた。仕様上は「呪術師スキルで
  //   自分がかけたもの」限定のボーナスなので、呼び出し元が明示的に
  //   fromCurseSkill: true を渡した場合だけ加算するようにする。
  if (fromCurseSkill && typeof getCurseDebuffDurationAdd === "function") {
    baseDur = baseDur + getCurseDebuffDurationAdd();
  }

  const ex = enemyStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    enemyStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_OTHER });
  }
}

// 料理バフ専用
function addFoodStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_FOOD);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_FOOD });
  }
}

// 飲み物バフ専用
function addDrinkStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_DRINK);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_DRINK });
  }
}

// ポーションバフ専用
function addPotionStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_POTION);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_POTION });
  }
}

// スキルバフ専用
function addSkillStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_SKILL);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_SKILL });
  }
}

// =======================
// 行動前チェック（麻痺・睡眠・混乱など）
// =======================

function beforeActionPlayer() {
  const ctx = makePlayerCtx();
  const actionCtx = {};
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.beforeAction) {
      const ok = def.beforeAction(ctx, inst, actionCtx);
      if (!ok) return { canAct: false };
    }
  }
  return { canAct: true, actionCtx };
}

function beforeActionEnemy() {
  if (!currentEnemy) return { canAct: false };
  const ctx = makeEnemyCtx();
  const actionCtx = {};
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.beforeAction) {
      const ok = def.beforeAction(ctx, inst, actionCtx);
      if (!ok) return { canAct: false };
    }
  }
  return { canAct: true, actionCtx };
}

// =======================
// 攻防・命中補正
// =======================

// 物理攻撃補正
function applyAttackBuffsForPlayer(base) {
  let mult = 1.0;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAttack) {
      mult = def.modifyAttack(mult);
    }
  }
  return Math.max(1, Math.floor(base * mult));
}

function applyAttackBuffsForEnemy(base) {
  let mult = 1.0;
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAttack) {
      mult = def.modifyAttack(mult);
    }
  }
  return Math.max(1, Math.floor(base * mult));
}

// 防御補正
function applyDefenseBuffsForPlayer(damage) {
  let mult = 1.0;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyDefense) {
      mult = def.modifyDefense(mult);
    }
  }
  return Math.max(1, Math.floor(damage * mult));
}

function applyDefenseBuffsForEnemy(damage) {
  let mult = 1.0;
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyDefense) {
      mult = def.modifyDefense(mult);
    }
  }
  return Math.max(1, Math.floor(damage * mult));
}

// 魔法攻撃補正（プレイヤー）
function applyMagicAttackBuffsForPlayer(base) {
  let mult = 1.0;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyMagicAttack) {
      mult = def.modifyMagicAttack(mult);
    }
  }
  return Math.max(1, Math.floor(base * mult));
}

// 命中補正
function modifyAccuracyForPlayer(acc) {
  let a = acc;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAccuracy) {
      a = def.modifyAccuracy(a);
    }
  }
  return a;
}

function modifyAccuracyForEnemy(acc) {
  let a = acc;
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAccuracy) {
      a = def.modifyAccuracy(a);
    }
  }
  return a;
}

// ★クリティカル率補正（プレイヤー）
//   → バフでどれだけ積んでも最後に最大 70% で頭打ちにする
function modifyCritRateForPlayer(baseRate) {
  let r = baseRate;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyCritRate) {
      r = def.modifyCritRate(r);
    }
  }
  // ソフトキャップ／ハード上限として 70% にクランプ
  r = Math.min(r, 0.7);
  return r;
}

// ★クリティカルダメージ倍率補正（プレイヤー）
//   現状はフックだけ用意し、実際の倍率計算は game-core 側で行う想定。
function modifyCritMultForPlayer(baseMult) {
  let m = baseMult;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyCritMult) {
      m = def.modifyCritMult(m);
    }
  }
  return m;
}

// =======================
// 被ダメージ時フック
// =======================

function onPlayerDamagedByEnemy() {
  const ctx = makePlayerCtx();
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.onDamaged) {
      def.onDamaged(ctx, inst);
    }
  }
  playerStatuses = playerStatuses.filter(s => s.remain > 0);
}

function onEnemyDamagedByPlayer() {
  const ctx = makeEnemyCtx();
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.onDamaged) {
      def.onDamaged(ctx, inst);
    }
  }
  enemyStatuses = enemyStatuses.filter(s => s.remain > 0);
}

// =======================
// ターン終了時処理
// =======================

function tickStatusesTurnEndForBoth() {
  {
    const ctx = makePlayerCtx();
    for (const inst of playerStatuses) {
      const def = STATUS_EFFECTS[inst.id];
      if (def && def.onTurnEnd) {
        def.onTurnEnd(ctx, inst);
      }
      inst.remain -= 1;
    }
    playerStatuses = playerStatuses.filter(s => s.remain > 0);
  }

  if (currentEnemy) {
    const ctx = makeEnemyCtx();
    for (const inst of enemyStatuses) {
      const def = STATUS_EFFECTS[inst.id];
      if (def && def.onTurnEnd) {
        def.onTurnEnd(ctx, inst);
      }
      inst.remain -= 1;
    }
    enemyStatuses = enemyStatuses.filter(s => s.remain > 0);
  }
}