// jobs.js
// 職業定義・職業ヘルパーまとめ＋ギルド職転職モーダル対応
//
// - 既存の jobId=0〜2（戦士・魔法使い・動物使い）と
//   新職業（大盾兵・呪術師・獣群使い・製作系ギルド職・採取ギルド職）をここで一括管理。
// - game-core-1.js / game-core-2.js 側は jobId のみ持ち、名称はここから参照する前提。
// - 職業ボーナスは「定義だけ」持ち、実際の適用は今後の実装で使う想定。
//
// - 追加実装：
//   - window.jobCandidateIds で「転職モーダルから選べる候補リスト」を管理
//   - addCandidateJobsByGuildId(guildId) でギルド職を候補に追加
//   - setupJobSelectUI() は候補リストに含まれる jobId だけをボタン化
//   - 転職自体は game-core-2.js の applyJobChange() 経由のみ（仕様変更なし）

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
 * initialStats: レベル 1 時点の初期ステータス（STR/VIT/INT_/DEX_/LUK_）
 * canUseMagic:     魔法スキルを使えるかどうか（現 magicJobs と同じ仕様）
 * canUsePhysSkill: 物理スキルを使えるかどうか（現 physJobs と同じ仕様）
 * hasPetTurn:      ペットターンを持つかどうか（現 petJobs と同じ仕様）
 *
 * 初期職業（guildId: null, type: "basic"）
 *   0: 戦士
 *   1: 魔法使い
 *   2: 動物使い
 *
 * 戦闘系ギルド職（type: "combat"）
 *   100: 大盾兵     (warrior 系タンク職)
 *   101: 呪術師     (mage 系デバフ職)
 *   102: 獣群使い   (tamer 系ペット特化職)
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
 *
 * ※職業はすべて横並びで強さは同等。
 *   ギルドやタイプごとに「得意分野（役割・個性）」が異なるだけ。
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
    initialStats: { STR: 2, VIT: 3, INT_: 1, DEX_: 1, LUK_: 1 },
    canUseMagic: false,
    canUsePhysSkill: true,  // 旧 physJobs に含まれていた
    hasPetTurn: false,
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
    initialStats: { STR: 1, VIT: 1, INT_: 3, DEX_: 2, LUK_: 1 },
    canUseMagic: true,       // 旧 magicJobs に含まれていた
    canUsePhysSkill: false,
    hasPetTurn: false,
    bonuses: {
      mpMaxRate: 0.05,
      magicSkillRate: 0.05  // ★修正: 死んでいた magicAtkRate から、実際に魔法スキルへ効く magicSkillRate に差し替え
    }
  },
  {
    id: 2,
    key: "beast_tamer",
    name: "動物使い",
    type: "basic",
    guildId: null,
    desc: "ペットを戦力にする基本職業。ペットの性能が少し向上する。",
    initialStats: { STR: 1, VIT: 1, INT_: 1, DEX_: 3, LUK_: 2 },
    canUseMagic: true,       // 旧 magicJobs
    canUsePhysSkill: true,   // 旧 physJobs
    hasPetTurn: true,        // 旧 petJobs
    bonuses: {
      // ★獣群使い（複数ペット運用職）とのバランス調整：
      //   1人と一体で大暴れする動物使いの持ち味を活かすため、単体ペットへの倍率ボーナスを引き上げ
      petAtkRate: 0.5,
      petHpMaxRate: 0.5,
      // ★追加: petDefRate新設。ATK/HPと同水準の+50%で、単体特化の生存力もここで担保する
      petDefRate: 0.5
    }
  },

  // ========== 戦闘系ギルド職（type: "combat"） ==========
  {
    id: 100,
    key: "greatshield",
    name: "大盾兵",
    type: "combat",
    guildId: "warrior",
    desc: "大盾を構えたタンク職。被ダメージを減らし味方を守る、防御寄りの戦闘スタイルを持つ。",
    initialStats: { STR: 1, VIT: 2, INT_: 1, DEX_: 2, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: true,   // 旧 physJobs
    hasPetTurn: false,
    bonuses: {
      defRate: 0.12,
      guardRate: 0.15,
      hpMaxRate: 0.10,
      greatshieldGuardRateAdd: 0.05,
      greatshieldGuardDamageReduceRate: 0.10
    }
  },
  {
    id: 101,
    key: "curse_mage",
    name: "呪術師",
    type: "combat",
    guildId: "mage",
    desc: "呪い・デバフに特化した魔法職。敵の能力を低下させることに長けた、支援寄りの戦闘スタイル。",
    initialStats: { STR: 1, VIT: 1, INT_: 3, DEX_: 2, LUK_: 2 },
    canUseMagic: true,       // 旧 magicJobs
    canUsePhysSkill: false,
    hasPetTurn: false,
    bonuses: {
      magicSkillRate: 0.08,        // ★修正: atkRate は魔法スキルのダメージ式（baseInt直参照）に一切効かないため magicSkillRate に変更
      statusApplyRateAdd: 0.15,    // 状態異常成功率 +15%（自分のスキル発動時のみ）
      mpMaxRate: 0.15,             // デバフ連打前提でMP+15%
      curseDebuffDurationAdd: 1    // 自分がかけた状態異常の効果ターン+1
    }
  },
  {
    id: 102,
    key: "beast_master",
    name: "獣群使い",
    type: "combat",
    guildId: "tamer",
    desc: "複数のペットを同時に扱うペット特化職。ペット群で攻める戦闘スタイル。",
    initialStats: { STR: 1, VIT: 1, INT_: 1, DEX_: 3, LUK_: 2 },
    canUseMagic: true,       // 旧 magicJobs
    canUsePhysSkill: true,   // 旧 physJobs
    hasPetTurn: true,        // 旧 petJobs
    bonuses: {
      // ★獣群使い最大の特徴：ペットを同時に3体まで編成し、
      //   全員が毎ターン同時に行動する（doBeastPartyTurn 側で参照）。
      maxActivePets: 3,
      // ★追加: petDefRate新設。動物使い(+50%)より控えめな+25%。
      //   敵の攻撃対象が3体に分散する分、個体あたりの被弾頻度は動物使いより低いという
      //   構造的な差を踏まえた値（1体特化の動物使いと同率にすると3体合計の実質耐久が過剰になるため）。
      petDefRate: 0.25,
      // ★追加: petHpMaxRate新設。ノーミス（通常のガード漏れ程度の1発）なら
      //   終盤エリア（地獄）でも1体も即死しない水準を実測シミュレーションして逆算した値。
      //   DEFは getPetRecordDef() 側で頭数分割の対象外にした上での数値なので、
      //   もし将来DEF側の分割方針を戻す場合はこの値も再計算が必要。
      petHpMaxRate: 1.2
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
    desc: "武器・防具作りに特化した職。高品質な装備を作りやすく、クラフト成功率・品質が向上する製作特化の役割を持つ。",
    initialStats: { STR: 1, VIT: 2, INT_: 2, DEX_: 2, LUK_: 1 },
    canUseMagic: false,
    canUsePhysSkill: true,  // ★修正: 専用スキル「入魂の一撃」「応急鍛冶」使用のため有効化
    hasPetTurn: false,
    bonuses: {
      craftBonus: 0.08,
      craftCostReduceRate: 0.05
    }
  },
  {
    id: 201,
    key: "bukatsu_user",
    name: "武具使い",
    type: "craft",
    guildId: "smith",
    desc: "武器・防具の性能を最大限に活かす職。装備の攻撃力・防御力が少し向上し、強化効果が増幅されるほか、常時わずかに被ダメージを軽減する装備運用特化の職業。",
    initialStats: { STR: 2, VIT: 2, INT_: 1, DEX_: 2, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: true,  // ★修正: 専用スキル「渾身の一撃」「完全装備」使用のため有効化
    hasPetTurn: false,
    bonuses: {
      atkRate: 0.02,
      defRate: 0.02,
      // ★強化1段階あたりの効果量を+15%増幅（例: 通常+5%/段階 → +5.75%/段階）
      enhanceBonusRate: 0.15,
      // ★常時、被ダメージ-5%（大盾兵のガードとは別枠の常時軽減）
      guardReductionRate: 0.05
    }
  },

  // alchemist（錬金ギルド）
  {
    id: 202,
    key: "alchemist_pro",
    name: "錬金術師",
    type: "craft",
    guildId: "alchemist",
    desc: "ポーション・薬系に特化した錬金職。調合成績と薬品効果が向上し、クラフト効率も上がるサポート寄りの役割を持つ。",
    initialStats: { STR: 1, VIT: 1, INT_: 2, DEX_: 2, LUK_: 2 },
    canUseMagic: true,       // 旧 magicJobs
    canUsePhysSkill: true,   // 旧 physJobs
    hasPetTurn: false,
    bonuses: {
      craftBonus: 0.09,          // ★微増 0.08→0.09
      craftCostReduceRate: 0.06, // ★微増 0.05→0.06
      potionEffectRate: 1.35,    // ★微増 1.3→1.35
      dotDamageRate: 1.6,        // ★微増 1.5→1.6
      statusDurationRate: 1.3    // ★微増 1.25→1.3
      // ★2024: 道具（爆弾等）関連ボーナスは道具使い(203)に移管。
      //   toolDamageRate / toolItemBoostRate / statusApplyRateAdd はここでは持たない。
    }
  },
  {
    id: 203,
    key: "tool_user",
    name: "道具使い",
    type: "craft",
    guildId: "alchemist",
    desc: "爆弾・ツール系に特化した錬金職。道具の威力・効果範囲が向上し、戦闘での活用法が広がる、道具運用特化の職業。",
    initialStats: { STR: 1, VIT: 1, INT_: 2, DEX_: 2, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: true,  // ★修正: 専用スキル「アイテムブースト」使用のため有効化
    hasPetTurn: false,
    bonuses: {
      craftBonus: 0.09,           // ★微増 0.08→0.09
      craftCostReduceRate: 0.06,  // ★微増 0.05→0.06
      // ★2024: 錬金術師(202)が持っていた「道具」関連ボーナスをこちらへ移管。
      toolDamageRate: 2.2,        // ★微増 2.0→2.2
      toolItemBoostRate: 1.6,     // ★微増 1.5→1.6
      statusApplyRateAdd: 0.35    // ★微増 0.3→0.35
    }
  },

  // cooking（料理ギルド）
  {
    id: 204,
    key: "chef",
    name: "料理人",
    type: "craft",
    guildId: "cooking",
    desc: "料理・飲み物クラフトに特化した職。高品質な食事を作りやすく、クラフト成功率・品質が向上する支援寄りの役割を持つ。",
    initialStats: { STR: 1, VIT: 1, INT_: 2, DEX_: 2, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
    bonuses: {
      craftBonus: 0.08,
      craftCostReduceRate: 0.05
      // TODO: 設計段階。cookingVarietyBonus は getJobBonuses() に
      // キーを追加してから正式実装する。
    }
  },
  {
    id: 205,
    key: "glutton",
    name: "貪食家",
    type: "craft",
    guildId: "cooking",
    desc: "食事・飲み物の効果を利用する特化職。バフ効果量・持続時間が向上し、食べることで強くなる、自己強化重視の職業。",
    initialStats: { STR: 1, VIT: 2, INT_: 1, DEX_: 2, LUK_: 3 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
    bonuses: {
      foodBuffEffectRate: 0.10,
      foodBuffDurationRate: 0.20
      // TODO: 設計段階。hpRecoverRateAdd は getJobBonuses() に
      // キーを追加してから正式実装する。
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
    desc: "木・鉱石・草・布・皮・水など、あらゆる基礎素材を満遍なく集める職。通常採取での採取量と +1 個ボーナスがわずかに増える、汎用型の採取職。",
    initialStats: { STR: 1, VIT: 1, INT_: 2, DEX_: 3, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
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
    desc: "各地の採取拠点の運営に優れた職。拠点から自動的に集まる素材量がわずかに増える、基盤運用特化の採取職。",
    initialStats: { STR: 1, VIT: 2, INT_: 2, DEX_: 2, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
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
    desc: "狩猟で得られる肉・皮などの食材調達に特化した職。狩猟食材の入手量がわずかと増え、レア食材もやや見つかりやすくなる狩猟特化の採取職。",
    initialStats: { STR: 2, VIT: 2, INT_: 1, DEX_: 3, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
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
    desc: "釣りで得られる魚系食材の調達に特化した職。釣り食材の入手量がわずかに増え、ハズレを引きにくくなる漁業特化の採取職。",
    initialStats: { STR: 1, VIT: 2, INT_: 1, DEX_: 3, LUK_: 3 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
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
    desc: "農園で得られる穀物・野菜などの食材調達に特化した職。農園の収穫量がわずかに増え、育成サイクルもわずかに短くなる農業特化の採取職。",
    initialStats: { STR: 1, VIT: 2, INT_: 2, DEX_: 2, LUK_: 2 },
    canUseMagic: false,
    canUsePhysSkill: false,
    hasPetTurn: false,
    bonuses: {
      foodFarmAmountBonusRate: 0.10,
      foodFarmCycleReduceRate: 0.05
    }
  }
];

// ========== 候補リスト（転職モーダルから選べる職業） ==========

/**
 * 候補リスト管理（初期値）
 *
 * window.jobCandidateIds:
 *   - 転職モーダルから選べる jobId のリスト
 *   - 初期は基本職 [0,1,2] のみ
 *   - ギルド UI から addCandidateJobsByGuildId(guildId) で追加
 */
if (typeof window.jobCandidateIds === "undefined") {
  window.jobCandidateIds = [0, 1, 2];
}

/**
 * ギルド ID に属する職業を候補リストに追加
 *
 * - 既存の候補と重複しない jobId のみを追加
 * - 転職モーダル経由でのみ変更（仕様変更なし）
 */
function addCandidateJobsByGuildId(guildId) {
  if (!guildId) return;
  const jobs = getJobsByGuildId(guildId);
  if (!jobs || jobs.length === 0) return;

  const candidateIds = window.jobCandidateIds || [0, 1, 2];

  jobs.forEach(function (job) {
    const jobId = job.id;
    // 重複チェック
    let exists = false;
    for (let i = 0; i < candidateIds.length; i++) {
      if (candidateIds[i] === jobId) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      candidateIds.push(jobId);
    }
  });

  window.jobCandidateIds = candidateIds;
}

/**
 * 候補リストを基本職 [0,1,2] に戻す（初期状態）
 */
function resetCandidateJobsToBasic() {
  window.jobCandidateIds = [0, 1, 2];
}

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
      atkRate: 0, defRate: 0, guardRate: 0,
      hpMaxRate: 0, mpMaxRate: 0,
      craftBonus: 0, craftCostReduceRate: 0,
      potionEffectRate: 0, toolDamageRate: 0,
      toolItemBoostRate: 0, statusApplyRateAdd: 0,
      foodBuffEffectRate: 0, foodBuffDurationRate: 0,
      gatherAmountBonusRate: 0, gatherExtraChanceAdd: 0,
      gatherBaseT1BonusRate: 0, gatherBaseT2BonusRate: 0,
      foodHuntAmountBonusRate: 0, foodHuntRareChanceAdd: 0,
      foodFishAmountBonusRate: 0, foodFishJunkReduceRate: 0,
      foodFarmAmountBonusRate: 0, foodFarmCycleReduceRate: 0,
      greatshieldGuardRateAdd: 0,
      greatshieldGuardDamageReduceRate: 0,
      curseDebuffDurationAdd: 0,
      magicSkillRate: 0,
      physSkillRate: 0,
      petAtkRate: 0,
      petHpMaxRate: 0,
      petDefRate: 0,
      dotDamageRate: 0,
      statusDurationRate: 0,
      maxActivePets: 0,
      enhanceBonusRate: 0,
      guardReductionRate: 0
    };
  }
  const b = def.bonuses || {};
  return {
    atkRate: b.atkRate || 0,
    defRate: b.defRate || 0,
    guardRate: b.guardRate || 0,
    hpMaxRate: b.hpMaxRate || 0,
    mpMaxRate: b.mpMaxRate || 0,
    craftBonus: b.craftBonus || 0,
    craftCostReduceRate: b.craftCostReduceRate || 0,
    potionEffectRate: b.potionEffectRate || 0,
    toolDamageRate: b.toolDamageRate || 0,
    toolItemBoostRate: b.toolItemBoostRate || 0,
    statusApplyRateAdd: b.statusApplyRateAdd || 0,
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
    foodFarmCycleReduceRate: b.foodFarmCycleReduceRate || 0,
    greatshieldGuardRateAdd: b.greatshieldGuardRateAdd || 0,
    greatshieldGuardDamageReduceRate: b.greatshieldGuardDamageReduceRate || 0,
    curseDebuffDurationAdd: b.curseDebuffDurationAdd || 0,
    magicSkillRate: b.magicSkillRate || 0,
    physSkillRate: b.physSkillRate || 0,
    petAtkRate: b.petAtkRate || 0,
    petHpMaxRate: b.petHpMaxRate || 0,
    petDefRate: b.petDefRate || 0,
    dotDamageRate: b.dotDamageRate || 0,
    statusDurationRate: b.statusDurationRate || 0,
    // ★同時に戦闘へ連れて行けるペット数（未指定/1以下なら通常の単体運用）
    maxActivePets: b.maxActivePets || 0,
    // ★武具使い: 強化効果増幅／常時被ダメ軽減
    enhanceBonusRate: b.enhanceBonusRate || 0,
    guardReductionRate: b.guardReductionRate || 0
  };
}

/**
 * 現在のジョブで同時に戦闘へ出せるペットの最大数を返す。
 * - 通常の動物使い（jobId=2）など未指定の職業は 1（従来どおり単体運用）。
 * - 獣群使いのように bonuses.maxActivePets が指定されていればその数。
 */
function getMaxActivePetSlots() {
  const jid = window.player?.jobId ?? window.jobId;
  if (jid == null) return 1;
  const b = getJobBonuses(jid);
  return (b && b.maxActivePets > 0) ? b.maxActivePets : 1;
}
if (typeof window.getMaxActivePetSlots === "undefined") {
  window.getMaxActivePetSlots = getMaxActivePetSlots;
}

// ★修正 throw を削除してエラーログ出力＋デフォルト値を返す
function getJobInitialStats(jobId) {
  const def = getJobDefById(jobId);
  if (!def || !def.initialStats) {
    console.warn("initialStats not defined for jobId=", jobId);
    if (typeof appendLog === "function") {
      appendLog(`[エラー] 職業 jobId=${jobId} の初期ステータスが定義されていません。戦士のステータスで代用します。`);
    }
    // 戦士の初期ステータスをデフォルトで返す
    return { STR: 2, VIT: 3, INT_: 1, DEX_: 1, LUK_: 1 };
  }
  return def.initialStats;
}

// =======================
// 職判定ヘルパー（jobs.js 側に集約）
// =======================

// ★修正：window.jobId か window.player.jobId から取る
function isAlchemist() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (!jobId && jobId !== 0) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return def.id === 202 || def.key === "alchemist_pro";
}

// ★修正：window.jobId か window.player.jobId から取る
function isBeastTamer() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (!jobId && jobId !== 0) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return def.id === 2 || def.key === "beast_tamer";
}

// 呪術師専用スキルのデバフ成功率／持続ターン加算を判定するためのヘルパー。
// アイテム側の rollStatusApply()（isAlchemist() 判定）とは完全に別経路にする。
function isCurseMage() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (!jobId && jobId !== 0) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return def.id === 101 || def.key === "curse_mage";
}

// =======================
// ボーナス取得ヘルパー（汎用＋錬金術師）
// =======================

// ★修正：window.jobId か window.player.jobId から取る
function getJobBonus(key, fallback) {
  const jobId = window.player?.jobId ?? window.jobId;
  if (jobId == null) return fallback;
  const def = getJobDefById(jobId);
  if (!def || !def.bonuses) {
    return fallback;
  }
  const val = def.bonuses[key];
  return (typeof val === "number") ? val : fallback;
}

function getAlchemistBonus(key, fallback) {
  if (!isAlchemist()) {
    return fallback;
  }
  return getJobBonus(key, fallback);
}

// ★新規: 道具使い(203)専用の判定関数。isAlchemist()とは完全に別軸。
function isToolUser() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (!jobId && jobId !== 0) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return def.id === 203 || def.key === "tool_user";
}

function getToolUserBonus(key, fallback) {
  if (!isToolUser()) {
    return fallback;
  }
  return getJobBonus(key, fallback);
}

// =======================
// 錬金術師用ボーナスヘルパー（動的計算版）
// =======================

function getAlcPotionRate() {
  // 非錬金職は 1.0 倍（=ボーナスなし）
  return getAlchemistBonus("potionEffectRate", 1.0);
}

// ★修正: status-effects-core.js にハードコードされていた錬金術師専用倍率を
//   ジョブボーナス経由に統一。非錬金職は 1.0（=ボーナスなし）。
function getAlcDotDamageRate() {
  return getAlchemistBonus("dotDamageRate", 1.0);
}

function getAlcStatusDurationRate() {
  return getAlchemistBonus("statusDurationRate", 1.0);
}

// =======================
// 道具使い用ボーナスヘルパー（動的計算版）
// ★2024: 元は錬金術師側にあった道具（爆弾等）関連ボーナス。道具使いへ移管。
// =======================

function getToolDamageRate() {
  return getToolUserBonus("toolDamageRate", 1.0);
}

function getToolBoostRate() {
  return getToolUserBonus("toolItemBoostRate", 1.0);
}

function getToolStatusAdd() {
  return getToolUserBonus("statusApplyRateAdd", 0.0);
}

// =======================
// 呪術師用ボーナスヘルパー（動的計算版）
// ※アイテム側の getAlchemistBonus 経由ロジックとは完全に別経路にする。
// =======================

function getCurseMageBonus(key, fallback) {
  if (!isCurseMage()) {
    return fallback;
  }
  return getJobBonus(key, fallback);
}

// 呪術師スキルの状態異常成功率加算（加算式。錬金術師の getAlcStatusAdd とは別軸）
function getCurseStatusApplyRateAdd() {
  return getCurseMageBonus("statusApplyRateAdd", 0.0);
}

// 呪術師が自分でかけた状態異常の効果ターン加算（加算式。錬金術師の statusDurationRate は倍率式なので別軸）
function getCurseDebuffDurationAdd() {
  return getCurseMageBonus("curseDebuffDurationAdd", 0);
}

// ★新規: ペット最大HPへのジョブボーナス倍率（スキルツリー側に同種の項目はまだ無いので job のみ合算）
function getPetHpMaxRateMultiplier() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (typeof getJobBonuses !== "function" || (!jobId && jobId !== 0)) return 0;
  const b = getJobBonuses(jobId);
  return (b && typeof b.petHpMaxRate === "number") ? b.petHpMaxRate : 0;
}

// ★新規: ペット防御力へのジョブボーナス倍率（petHpMaxRateと同じくjob層のみで合算）
function getPetDefRateMultiplier() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (typeof getJobBonuses !== "function" || (!jobId && jobId !== 0)) return 0;
  const b = getJobBonuses(jobId);
  return (b && typeof b.petDefRate === "number") ? b.petDefRate : 0;
}
if (typeof window.getPetDefRateMultiplier === "undefined") {
  window.getPetDefRateMultiplier = getPetDefRateMultiplier;
}

// =======================
// ジョブ能力クエリ層（スキル・ペット周り）
// =======================

// ★修正：window.jobId か window.player.jobId から取る
function jobCanUseMagic() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (jobId == null) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return !!def.canUseMagic;
}

// ★修正：window.jobId か window.player.jobId から取る
function jobCanUsePhysSkill() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (jobId == null) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return !!def.canUsePhysSkill;
}

// ★修正：window.jobId か window.player.jobId から取る
function jobHasPetTurn() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (jobId == null) return false;
  const def = getJobDefById(jobId);
  if (!def) return false;
  return !!def.hasPetTurn;
}

// ペット UI を表示する職（現状はペットターン職と同一）
function jobShowsPetUI() {
  return jobHasPetTurn();
}

// 現在職のボーナスをまとめて返すショートハンド
function jobBonuses() {
  const jobId = window.player?.jobId ?? window.jobId;
  if (jobId == null) {
    return getJobBonuses(-1);
  }
  return getJobBonuses(jobId);
}

// =======================
// ★2 関数に分割：
//  1) 今何を装備してるか見る関数
//  2) 大盾兵で大盾の時にボーナスを返す関数
// =======================

/**
 * 1) 今プレイヤーが装備している武器の ID を返す関数
 *
 * - 装備してない場合は null を返す
 * - weaponInstances / equippedWeaponIndex が前提
 */
function getCurrentEquippedWeaponId() {
  if (typeof equippedWeaponIndex !== "number" ||
      !Array.isArray(window.weaponInstances)) {
    return null;
  }

  const inst = window.weaponInstances[equippedWeaponIndex];
  if (!inst || typeof inst.id !== "string") {
    return null;
  }

  return inst.id;
}

/**
 * 2) 大盾兵で大盾装備の時にだけガードボーナスを返す関数
 *
 * - 現在職が大盾兵（id:100 / key:"greatshield"）且つ装備が T*_greatShield の時だけボーナス
 * - 護の構え中なら、その分をジョブボーナスに加算
 * - 他はすべて 0 を返す
 */
function getGuardBonusForGreatshieldJob() {
  const jobId = window.player?.jobId ?? window.jobId;
  const def = (jobId != null) ? getJobDefById(jobId) : null;

  const zero = {
    guardRate: 0,
    greatshieldGuardRateAdd: 0,
    greatshieldGuardDamageReduceRate: 0
  };

  if (!def) return zero;

  // 大盾兵以外は 0
  if (def.id !== 100 && def.key !== "greatshield") {
    return zero;
  }

  // 今装備してる武器 ID を見る
  const weaponId = getCurrentEquippedWeaponId();
  if (!weaponId) {
    return zero;
  }

  // T*_greatShield なら大盾装備とみなす
  const isGreatShieldEquipped = /^T\d+_greatShield$/.test(weaponId);
  if (!isGreatShieldEquipped) {
    return zero;
  }

  const b = def.bonuses || {};

  // ベースはジョブ定義のボーナス
  let guardRate = b.guardRate || 0;
  let rateAdd   = b.greatshieldGuardRateAdd || 0;
  let reduceAdd = b.greatshieldGuardDamageReduceRate || 0;

  // ★追加：護の構え中なら一時ボーナスを加算
  if (typeof greatshieldGuardStanceTurnRemain === "number" &&
      greatshieldGuardStanceTurnRemain > 0) {
    const stanceRate = (typeof greatshieldGuardStanceGuardRate === "number")
      ? greatshieldGuardStanceGuardRate
      : 0;
    const stanceReduce = (typeof greatshieldGuardStanceReduceRate === "number")
      ? greatshieldGuardStanceReduceRate
      : 0;

    if (stanceRate > 0) {
      rateAdd += stanceRate;
    }
    if (stanceReduce > 0) {
      reduceAdd += stanceReduce;
    }
  }

  return {
    guardRate: guardRate,
    greatshieldGuardRateAdd: rateAdd,
    greatshieldGuardDamageReduceRate: reduceAdd
  };
}

// =======================
// 古い 1 関数形（互換用）：
//   getGuardBonusForCurrentJob() は getGuardBonusForGreatshieldJob() を使う
// =======================

function getGuardBonusForCurrentJob() {
  return getGuardBonusForGreatshieldJob();
}

// ★修正: status-effects-core.js の counter ステータスから参照される想定だったが
//   未定義だったため、カウンタースタンスの職業別倍率が常に 1.0 扱いになっていたバグを修正。
//   大盾兵（jobId: 100）のみ 1.5 倍、それ以外は 1.0 倍。
function getCounterDamageRateForJob(jobId) {
  if (jobId === 100) return 1.5;
  return 1.0;
}

// ========== 初期職選択 UI（jobModal 用） ==========

function getBasicJobs() {
  return JOB_DEFS.filter(function(job) {
    return job.type === "basic";
  });
}

/**
 * 候補リストに含まれる jobId を取得
 *
 * - window.jobCandidateIds を使う
 * - 未定義なら基本職 [0,1,2] を返す
 */
function getCandidateJobIds() {
  const candidateIds = window.jobCandidateIds;
  if (!candidateIds || candidateIds.length === 0) {
    return [0, 1, 2];
  }
  return candidateIds.slice();
}

/**
 * 転職モーダル UI: 候補リストを含めた職業ボタンを生成
 *
 * - 基本職ボタンは従来と同じ（0,1,2）
 * - ギルド職も同じボタン枠に追加表示
 * - 転職自体は applyJobChange() 経由のみ（仕様変更なし）
 *
 * 修正点:
 * - initDone フラグを廃止し、毎回ボタンとリスナーを作り直す
 * - confirmBtn は cloneNode(true) で差し替え、過去のリスナーをすべて除去
 * - モーダルを閉じるのは applyJobChange 側に任せ、この関数からは閉じない
 */
function setupJobSelectUI() {
  const jobModal   = document.getElementById("jobModal");
  const btnBox     = document.getElementById("jobButtons");
  const descArea   = document.getElementById("jobDescArea");
  let   confirmBtn = document.getElementById("jobConfirmBtn");

  if (!jobModal || !btnBox || !confirmBtn) return;

  const confirmParent = confirmBtn.parentNode;
  if (confirmParent) {
    const newConfirm = confirmBtn.cloneNode(true);
    confirmParent.replaceChild(newConfirm, confirmBtn);
    confirmBtn = newConfirm;
  }

  const candidateJobIds = getCandidateJobIds();
  const candidateJobs = candidateJobIds
    .map(function (jobId) { return getJobDefById(jobId); })
    .filter(function (def) { return def != null; });

  btnBox.innerHTML = "";

  candidateJobs.forEach(function (def) {
    const btn = document.createElement("button");
    btn.className = "job-select-btn";
    btn.dataset.job = String(def.id);
    btn.textContent = def.name;
    btnBox.appendChild(btn);
  });

  const buttons = btnBox.querySelectorAll(".job-select-btn");

  buttons.forEach(function (btn) {
    const jobIdVal = parseInt(btn.dataset.job, 10);
    const def = getJobDefById(jobIdVal);
    if (!def) return;

    btn.addEventListener("click", function () {
      btnBox.dataset.selectedJobId = String(jobIdVal);

      buttons.forEach(function (b) { b.classList.remove("selected"); });
      btn.classList.add("selected");

      if (descArea) {
        descArea.textContent = def.desc || "";
      }

      confirmBtn.disabled = false;
    });
  });

  confirmBtn.addEventListener("click", function () {
    const selId = btnBox.dataset.selectedJobId
      ? parseInt(btnBox.dataset.selectedJobId, 10)
      : null;
    if (selId == null) return;

    const wasJobChangedOnce = !!window.jobChangedOnce;

    if (typeof applyJobChange === "function") {
      applyJobChange(selId);
    } else {
      window.jobId = selId;
      if (typeof recalcStats   === "function") recalcStats();
      if (typeof updateDisplay === "function") updateDisplay();
      const stJobName = document.getElementById("stJobName");
      if (stJobName) stJobName.textContent = getJobNameFromId(selId);
      jobModal.classList.add("hidden");
    }

    if (!wasJobChangedOnce && typeof window.showHelpPage === "function") {
      setTimeout(() => {
        window.showHelpPage();
      }, 0);
    }
  });

  delete btnBox.dataset.selectedJobId;
  buttons.forEach(function (b) { b.classList.remove("selected"); });
  confirmBtn.disabled = true;

  if (descArea && candidateJobs.length > 0) {
    descArea.textContent = candidateJobs[0].desc || "";
  }
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

  const groups = [
    { label: "基本職",       type: "basic" },
    { label: "戦闘ギルド職", type: "combat" },
    { label: "製作ギルド職", type: "craft" },
    { label: "採取ギルド職", type: "gather" }
  ];

  const buttons = btnBox.querySelectorAll(".job-select-btn");

  groups.forEach(group => {
    const header = document.createElement("div");
    header.textContent = `[${group.label}]`;
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
          const stJobName = document.getElementById("stJobName");
          if (stJobName) {
            stJobName.textContent = job.name;
          }
          if (confirmBtn) {
            confirmBtn.disabled = false;
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
if (typeof window.getJobInitialStats === "undefined") {
  window.getJobInitialStats = getJobInitialStats;
}
if (typeof window.isAlchemist === "undefined") {
  window.isAlchemist = isAlchemist;
}
if (typeof window.isToolUser === "undefined") {
  window.isToolUser = isToolUser;
}
if (typeof window.isBeastTamer === "undefined") {
  window.isBeastTamer = isBeastTamer;
}
if (typeof window.getJobBonus === "undefined") {
  window.getJobBonus = getJobBonus;
}
if (typeof window.getAlchemistBonus === "undefined") {
  window.getAlchemistBonus = getAlchemistBonus;
}
if (typeof window.getToolUserBonus === "undefined") {
  window.getToolUserBonus = getToolUserBonus;
}
if (typeof window.getAlcPotionRate === "undefined") {
  window.getAlcPotionRate = getAlcPotionRate;
}
if (typeof window.getToolDamageRate === "undefined") {
  window.getToolDamageRate = getToolDamageRate;
}
if (typeof window.getToolBoostRate === "undefined") {
  window.getToolBoostRate = getToolBoostRate;
}
if (typeof window.getToolStatusAdd === "undefined") {
  window.getToolStatusAdd = getToolStatusAdd;
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
if (typeof window.jobCanUseMagic === "undefined") {
  window.jobCanUseMagic = jobCanUseMagic;
}
if (typeof window.jobCanUsePhysSkill === "undefined") {
  window.jobCanUsePhysSkill = jobCanUsePhysSkill;
}
if (typeof window.jobHasPetTurn === "undefined") {
  window.jobHasPetTurn = jobHasPetTurn;
}
if (typeof window.jobShowsPetUI === "undefined") {
  window.jobShowsPetUI = jobShowsPetUI;
}
if (typeof window.jobBonuses === "undefined") {
  window.jobBonuses = jobBonuses;
}

// ★2 関数形をグローバル公開
if (typeof window.getCurrentEquippedWeaponId === "undefined") {
  window.getCurrentEquippedWeaponId = getCurrentEquippedWeaponId;
}
if (typeof window.getGuardBonusForGreatshieldJob === "undefined") {
  window.getGuardBonusForGreatshieldJob = getGuardBonusForGreatshieldJob;
}

// 古い 1 関数名も一応残す（互換用）
if (typeof window.getGuardBonusForCurrentJob === "undefined") {
  window.getGuardBonusForCurrentJob = getGuardBonusForCurrentJob;
}

// ========== 候補リスト管理（グローバル公開） ==========

if (typeof window.addCandidateJobsByGuildId === "undefined") {
  window.addCandidateJobsByGuildId = addCandidateJobsByGuildId;
}
if (typeof window.resetCandidateJobsToBasic === "undefined") {
  window.resetCandidateJobsToBasic = resetCandidateJobsToBasic;
}
if (typeof window.getCandidateJobIds === "undefined") {
  window.getCandidateJobIds = getCandidateJobIds;
}