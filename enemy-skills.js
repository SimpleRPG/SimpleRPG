// enemy-skills.js
// 敵専用スキル：マスタデータ＋敵ごとの割り当て＋選択ロジック
// - 状態異常の中身は status-effects-core.js の STATUS_EFFECTS をそのまま参照する（並行構造を作らない）
// - プレイヤーへの付与は既存の addStatusToPlayer(id) をそのまま使う
// - 通常攻撃の代わりに「重い一撃」を出す系は dmgMultiplier を enemyTurn 側の baseAtk に掛けて使う想定
// - ボスは HP 割合でフェーズが変わり、専用スキル(ULTIMATE)が解禁される

// ---------------------------------------------------------
// 1) スキル定義（役割×属性でグルーピングし、複数の敵で使い回す）
// ---------------------------------------------------------
const ENEMY_SKILLS = {
  // ===== 前衛型：重い一撃バリエーション =====
  heavySlash: {
    name: "強打",
    kind: "heavyAttack",
    dmgMultiplier: 1.6,
    chance: 0.22,
    log: (enemyName) => `${enemyName}が力を込めて強打を放った！`
  },
  bleedBite: {
    name: "牙による一撃",
    kind: "heavyAttack",
    dmgMultiplier: 1.2,
    effectId: "bleed",
    chance: 0.2,
    log: (enemyName) => `${enemyName}が鋭い牙で切り裂いた！`
  },
  crushingBlow: {
    name: "叩き潰し",
    kind: "heavyAttack",
    dmgMultiplier: 1.3,
    effectId: "def_down",
    chance: 0.18,
    log: (enemyName) => `${enemyName}の一撃で防御が崩された！`
  },

  // ===== 魔法型：状態異常付与が主体 =====
  poisonSting: {
    name: "毒針",
    kind: "debuff",
    effectId: "poison",
    chance: 0.28,
    log: (enemyName) => `${enemyName}の毒針が突き刺さった！`
  },
  darkGaze: {
    name: "暗闇の眼光",
    kind: "debuff",
    effectId: "blind",
    chance: 0.22,
    log: (enemyName) => `${enemyName}の視線で目がくらんだ！`
  },
  curseWord: {
    name: "呪詛",
    kind: "debuff",
    effectId: "curseWither",
    chance: 0.2,
    log: (enemyName) => `${enemyName}が呪いの言葉を紡いだ！`
  },
  silenceChant: {
    name: "封魔の詠唱",
    kind: "debuff",
    effectId: "silence",
    chance: 0.18,
    log: (enemyName) => `${enemyName}の詠唱でスキルが封じられた！`
  },
  frostBreath: {
    name: "冷気のブレス",
    kind: "debuff",
    effectId: "slow",
    chance: 0.24,
    log: (enemyName) => `${enemyName}の冷気で動きが鈍った！`
  },
  confuseMist: {
    name: "惑わしの霧",
    kind: "debuff",
    effectId: "confuse",
    chance: 0.18,
    log: (enemyName) => `${enemyName}の霧で頭が混乱する！`
  },

  // ===== 支援型：自己バフ =====
  warCry: {
    name: "雄叫び",
    kind: "selfBuff",
    effectId: "atk_up",
    chance: 0.18,
    log: (enemyName) => `${enemyName}が雄叫びをあげ、攻撃力が上がった！`
  },
  ironStance: {
    name: "鉄壁の構え",
    kind: "selfBuff",
    effectId: "def_up",
    chance: 0.16,
    log: (enemyName) => `${enemyName}が身構え、防御力が上がった！`
  },

  // ===== ボス専用：フェーズ2解禁のアルティメット =====
  ultimateRampage: {
    name: "大暴走",
    kind: "heavyAttack",
    dmgMultiplier: 2.1,
    effectId: "def_down",
    chance: 0.3,
    bossOnly: true,
    log: (enemyName) => `${enemyName}が力を解き放ち、大暴走した！！`
  },
  ultimateCurse: {
    name: "破滅の呪詛",
    kind: "debuff",
    effectId: "curseWither",
    secondaryEffectId: "atk_down",
    chance: 0.3,
    bossOnly: true,
    log: (enemyName) => `${enemyName}が破滅の呪詛を唱えた！！`
  },
  ultimateFreeze: {
    name: "絶対零度",
    kind: "heavyAttack",
    dmgMultiplier: 1.5,
    effectId: "slow",
    secondaryEffectId: "blind",
    chance: 0.3,
    bossOnly: true,
    log: (enemyName) => `${enemyName}が絶対零度を放った！！`
  }
};

// ---------------------------------------------------------
// 2) 敵ごとのスキル割り当て（enemy-data.js のidをそのままキーに使う）
//    ※ enemy-data.js 側は一切変更しない。対応表はこちらに閉じる。
// ---------------------------------------------------------
const ENEMY_SKILL_TABLE = {
  // --- 草原 ---
  slime:        [],
  wolf:         ["bleedBite"],

  // --- 森 ---
  forestWolf:   ["bleedBite"],
  goblin:       ["heavySlash"],
  caveGoblin:   ["heavySlash"],
  goblinMage:   ["darkGaze"],
  goblinTamer:  ["warCry"],

  // --- 洞窟 ---
  ogre:         ["heavySlash"],
  ogreBrute:    ["heavySlash", "crushingBlow"],
  ogreGuard:    ["crushingBlow"],
  ogreShaman:   ["warCry", "ironStance"],

  // --- 砂漠 ---
  desertScorpion: ["poisonSting"],
  desertBandit:   ["bleedBite"],
  desertWorm:     ["crushingBlow"],

  // --- 毒沼 ---
  swampSlime:   ["poisonSting"],
  poisonFrog:   ["poisonSting", "confuseMist"],
  swampSpecter: ["curseWord"],

  // --- 遺跡 ---
  ruinGuardian: ["crushingBlow"],
  ruinMummy:    ["curseWord", "silenceChant"],
  ruinMagus:    ["silenceChant", "confuseMist"],

  // --- 天空 ---
  skyHarpy:     ["darkGaze"],
  skyKnight:    ["heavySlash"],
  skyElemental: ["frostBreath"],

  // --- 氷 ---
  iceWolf:      ["frostBreath", "bleedBite"],
  iceGolem:     ["crushingBlow", "frostBreath"],
  frostMage:    ["frostBreath", "darkGaze"],

  // --- 地獄 ---
  hellHound:    ["bleedBite"],
  darkKnight:   ["heavySlash", "warCry"],
  abyssDemon:   ["curseWord", "silenceChant"],

  // --- ボス（通常フェーズのスキル） ---
  kingSlime:       ["poisonSting", "confuseMist"],
  hundredWolfKing: ["bleedBite", "warCry"],
  goblinKing:      ["heavySlash", "darkGaze"],
  berserkOgre:     ["crushingBlow", "warCry"],
  desertLord:      ["poisonSting", "bleedBite"],
  swampQueen:      ["poisonSting", "curseWord"],
  ruinOverlord:    ["curseWord", "silenceChant"],
  skyDragon:       ["heavySlash", "darkGaze"],
  iceEmperor:      ["frostBreath", "crushingBlow"],
  hellLord:        ["curseWord", "heavySlash"]
};

// ボスのフェーズ2（HP比率がこの値以下になったら解禁）とアルティメット技
const BOSS_PHASE_TABLE = {
  kingSlime:       { hpRatio: 0.5, ultimateId: "ultimateRampage" },
  hundredWolfKing: { hpRatio: 0.5, ultimateId: "ultimateRampage" },
  goblinKing:      { hpRatio: 0.5, ultimateId: "ultimateCurse" },
  berserkOgre:     { hpRatio: 0.4, ultimateId: "ultimateRampage" },
  desertLord:      { hpRatio: 0.4, ultimateId: "ultimateCurse" },
  swampQueen:      { hpRatio: 0.4, ultimateId: "ultimateCurse" },
  ruinOverlord:    { hpRatio: 0.4, ultimateId: "ultimateCurse" },
  skyDragon:       { hpRatio: 0.35, ultimateId: "ultimateFreeze" },
  iceEmperor:      { hpRatio: 0.35, ultimateId: "ultimateFreeze" },
  hellLord:        { hpRatio: 0.3, ultimateId: "ultimateRampage" }
};

// ---------------------------------------------------------
// 3) 選択ロジック（enemyTurn() から呼ぶ想定の入口）
// ---------------------------------------------------------

// 現在の敵IDとHP比率から「使用可能なスキルIDの配列」を返す
// （ボスはフェーズ条件を満たすとアルティメットがプールに追加される）
function getAvailableEnemySkillIds(enemyId, hpRatio) {
  const baseIds = ENEMY_SKILL_TABLE[enemyId] || [];
  const phase = BOSS_PHASE_TABLE[enemyId];
  if (phase && typeof hpRatio === "number" && hpRatio <= phase.hpRatio) {
    return baseIds.concat([phase.ultimateId]);
  }
  return baseIds;
}

// 1体力ターンぶんの「どのスキルを使うか」を決める。
// 何も発動しなければ null を返す（＝enemyTurn側は通常攻撃を行う）
function pickEnemySkill(enemyId, hpRatio) {
  const ids = getAvailableEnemySkillIds(enemyId, hpRatio);
  if (!ids.length) return null;

  // ボスのアルティメットは他スキルより優先して判定する
  const sorted = ids.slice().sort((a, b) => {
    const aBoss = ENEMY_SKILLS[a] && ENEMY_SKILLS[a].bossOnly ? 1 : 0;
    const bBoss = ENEMY_SKILLS[b] && ENEMY_SKILLS[b].bossOnly ? 1 : 0;
    return bBoss - aBoss;
  });

  for (const id of sorted) {
    const def = ENEMY_SKILLS[id];
    if (!def) continue;
    if (Math.random() < def.chance) {
      return Object.assign({ id }, def);
    }
  }
  return null;
}

// enemyTurn() 側で「スキルを実際に適用する」ための小さなヘルパー。
// dmg計算そのものはenemyTurn側の既存ロジックに任せ、
// ここではプレイヤーへの状態異常付与とログ出力だけを担当する。
function applyEnemySkillEffects(skill, enemyName) {
  if (!skill) return;

  if (typeof appendLog === "function" && typeof skill.log === "function") {
    appendLog(skill.log(enemyName));
  }

  if (skill.kind === "debuff" && skill.effectId && typeof addStatusToPlayer === "function") {
    addStatusToPlayer(skill.effectId);
    if (skill.secondaryEffectId) {
      addStatusToPlayer(skill.secondaryEffectId);
    }
  }

  if (skill.kind === "heavyAttack" && skill.effectId && typeof addStatusToPlayer === "function") {
    addStatusToPlayer(skill.effectId);
    if (skill.secondaryEffectId) {
      addStatusToPlayer(skill.secondaryEffectId);
    }
  }

  if (skill.kind === "selfBuff" && skill.effectId && typeof addStatusToEnemy === "function") {
    addStatusToEnemy(skill.effectId);
  }
}
