// enemy-data.js
// 敵マスタ＋エリア別テーブル＋ボスID定義

const ENEMIES = {
  // 草原系（初心者向けザコ）: Lv1全職でも勝てるよう大幅に弱める
  slime: {
    id: "slime",
    name: "スライム",
    hp: 158,  // 【調整】討伐1.8T目安に変更
    atk: 4,   // HP30に対して8発前後
    def: 0,
    dex: 0,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 3,
    isBoss: false
  },
  wolf: {
    id: "wolf",
    name: "オオカミ",
    hp: 157,  // 【調整】討伐1.8T目安に変更
    atk: 6,   // ちょっとだけ痛い
    def: 1,
    dex: 0,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 5,
    isBoss: false
  },

  // 森系（10転生目安）
  forestWolf: {
    id: "forestWolf",
    name: "森のオオカミ",
    hp: 1030,    // 【調整】討伐1.8T目安に変更
    atk: 55,     // 10転生VIT96前後に対してそこそこ痛い
    def: 27,
    dex: 9,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 12,
    isBoss: false
  },
  goblin: {
    id: "goblin",
    name: "ゴブリン",
    hp: 1020,   // 【調整】討伐1.8T目安に変更
    atk: 60,
    def: 30,
    dex: 10,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 14,
    isBoss: false
  },

  // 洞窟系（20転生目安）
  caveGoblin: {
    id: "caveGoblin",
    name: "洞窟ゴブリン",
    hp: 2170,   // 【調整】討伐1.8T目安に変更
    atk: 85,
    def: 46,
    dex: 15,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 24,
    isBoss: false
  },
  goblinMage: {
    id: "goblinMage",
    name: "ゴブリンマジシャン",
    hp: 2170,   // 【調整】討伐1.8T目安に変更
    atk: 95,
    def: 48,
    dex: 16,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 30,
    isBoss: false
  },
  goblinTamer: {
    id: "goblinTamer",
    name: "ゴブリンテイマー",
    hp: 2160,   // 【調整】討伐1.8T目安に変更
    atk: 105,
    def: 52,
    dex: 17,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 36,
    isBoss: false
  },
  ogre: {
    id: "ogre",
    name: "オーガ",
    hp: 2150,   // 【調整】討伐1.8T目安に変更
    atk: 120,
    def: 60,
    dex: 20,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 60,
    isBoss: false
  },

  // 廃鉱山系ザコ（40転生目安）
  ogreBrute: {
    id: "ogreBrute",
    name: "オーガブルート",
    hp: 5010,   // 【調整】討伐1.8T目安に変更
    atk: 155,
    def: 85,
    dex: 28,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 70,
    isBoss: false
  },
  ogreGuard: {
    id: "ogreGuard",
    name: "オーガガード",
    hp: 5000,   // 【調整】討伐1.8T目安に変更
    atk: 165,
    def: 94,
    dex: 31,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 82,
    isBoss: false
  },
  ogreShaman: {
    id: "ogreShaman",
    name: "オーガシャーマン",
    hp: 5030,   // 【調整】討伐1.8T目安に変更
    atk: 175,
    def: 74,
    dex: 25,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 90,
    isBoss: false
  },

  // ===== T5〜T10 用の雑魚 =====
  // 【調整】実測プレイヤー成長カーブ（転生ボーナス込みシミュレーション）に基づき再計算。
  // 転生ペース目安: desert=60 / swamp=90 / ruin=130 / sky=180 / ice=240 / hell=310（+20,+30,+40,+50,+60,+70の緩加速）
  // ザコは「一つ前のエリア到達時点のプレイヤー実力」に対して1撃で沈められる程度、
  // かつ被弾7発前後で瀕死になる強さに調整（旧仮データは伸びが線形すぎて手前と繋がっていなかった）

  // 灼熱の砂漠（T5・転生60目安）
  desertScorpion: {
    id: "desertScorpion",
    name: "砂漠サソリ",
    hp: 4810,   // 【調整】討伐1.8T目安に変更
    atk: 597,
    def: 210,
    dex: 70,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 110,
    isBoss: false
  },
  desertBandit: {
    id: "desertBandit",
    name: "砂漠の盗賊",
    hp: 4790,   // 【調整】討伐1.8T目安に変更
    atk: 642,
    def: 225,
    dex: 75,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 120,
    isBoss: false
  },
  desertWorm: {
    id: "desertWorm",
    name: "サンドワーム",
    hp: 4760,   // 【調整】討伐1.8T目安に変更
    atk: 693,
    def: 243,
    dex: 81,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 130,
    isBoss: false
  },

  // 毒沼（T6・転生90目安）
  swampSlime: {
    id: "swampSlime",
    name: "毒沼スライム",
    hp: 7850,   // 【調整】討伐1.8T目安に変更
    atk: 887,
    def: 339,
    dex: 113,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 150,
    isBoss: false
  },
  poisonFrog: {
    id: "poisonFrog",
    name: "ポイズンフロッグ",
    hp: 7810,   // 【調整】討伐1.8T目安に変更
    atk: 954,
    def: 364,
    dex: 121,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 160,
    isBoss: false
  },
  swampSpecter: {
    id: "swampSpecter",
    name: "沼の亡霊",
    hp: 7770,   // 【調整】討伐1.8T目安に変更
    atk: 1030,
    def: 393,
    dex: 131,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 170,
    isBoss: false
  },

  // 古代遺跡（T7・転生130目安）
  ruinGuardian: {
    id: "ruinGuardian",
    name: "遺跡ガーディアン",
    hp: 12810,   // 【調整】討伐1.8T目安に変更
    atk: 1338,
    def: 536,
    dex: 179,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 190,
    isBoss: false
  },
  ruinMummy: {
    id: "ruinMummy",
    name: "ミイラ戦士",
    hp: 12750,   // 【調整】討伐1.8T目安に変更
    atk: 1439,
    def: 576,
    dex: 192,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 200,
    isBoss: false
  },
  ruinMagus: {
    id: "ruinMagus",
    name: "古代魔導師",
    hp: 12680,   // 【調整】討伐1.8T目安に変更
    atk: 1554,
    def: 622,
    dex: 207,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 210,
    isBoss: false
  },

  // 浮遊島（T8・転生180目安）
  skyHarpy: {
    id: "skyHarpy",
    name: "ハーピー",
    hp: 19920,   // 【調整】討伐1.8T目安に変更
    atk: 2015,
    def: 794,
    dex: 265,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 230,
    isBoss: false
  },
  skyKnight: {
    id: "skyKnight",
    name: "空の騎士",
    hp: 19820,   // 【調整】討伐1.8T目安に変更
    atk: 2167,
    def: 854,
    dex: 285,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 245,
    isBoss: false
  },
  skyElemental: {
    id: "skyElemental",
    name: "風のエレメンタル",
    hp: 19720,   // 【調整】討伐1.8T目安に変更
    atk: 2340,
    def: 922,
    dex: 307,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 260,
    isBoss: false
  },

  // 氷の塔（T9・転生240目安）
  iceWolf: {
    id: "iceWolf",
    name: "アイスウルフ",
    hp: 29910,   // 【調整】討伐1.8T目安に変更
    atk: 2889,
    def: 1134,
    dex: 378,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 290,
    isBoss: false
  },
  iceGolem: {
    id: "iceGolem",
    name: "アイスゴーレム",
    hp: 29780,   // 【調整】討伐1.8T目安に変更
    atk: 3106,
    def: 1219,
    dex: 406,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 310,
    isBoss: false
  },
  frostMage: {
    id: "frostMage",
    name: "フロストメイジ",
    hp: 29620,   // 【調整】討伐1.8T目安に変更
    atk: 3355,
    def: 1317,
    dex: 439,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 320,
    isBoss: false
  },

  // 地獄の門（T10・転生310目安）
  hellHound: {
    id: "hellHound",
    name: "ヘルハウンド",
    hp: 43000,   // 【調整】討伐1.8T目安に変更
    atk: 4033,
    def: 1559,
    dex: 520,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 360,
    isBoss: false
  },
  darkKnight: {
    id: "darkKnight",
    name: "ダークナイト",
    hp: 42810,   // 【調整】討伐1.8T目安に変更
    atk: 4337,
    def: 1676,
    dex: 559,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 380,
    isBoss: false
  },
  abyssDemon: {
    id: "abyssDemon",
    name: "アビスデーモン",
    hp: 42600,   // 【調整】討伐1.8T目安に変更
    atk: 4684,
    def: 1810,
    dex: 603,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 400,
    isBoss: false
  },

  // ===== ボス =====
  // 草原ボス：0転生レベル100＋料理前提
  kingSlime: {
    id: "kingSlime",
    name: "キングスライム？",
    hp: 450,   // HP228＋装備込ATK/DEF想定で10T前後
    atk: 150,   // 【調整】実測プレイヤーDEFで被弾2〜3発耐える水準に修正
    def: 73,
    dex: 24,  // ★命中/回避用DEX（def/3目安、要調整）
    
    money: 200,
    isBoss: true
  },
  // 森ボス：10転生＋料理前提
  hundredWolfKing: {
    id: "hundredWolfKing",
    name: "百狼の王",
    hp: 5000,   // 10転生想定、与ダメも被ダメも10T前後
    atk: 384,   // 【調整】旧1900は実測プレイヤーDEFに対し被弾1発で即死級だったため是正
    def: 877,
    dex: 292,  // ★命中/回避用DEX（def/3目安、要調整）
    
    money: 450,
    isBoss: true
  },
  // 洞窟ボス：20転生前後＋装備＋料理前提
  goblinKing: {
    id: "goblinKing",
    name: "ゴブリンキング",
    hp: 9000,
    atk: 622,   // 【調整】旧3900は被弾1発で即死級だったため是正（2〜3発耐え目標）
    def: 1345,
    dex: 448,  // ★命中/回避用DEX（def/3目安、要調整）
    
    money: 800,
    isBoss: true
  },
  // 廃鉱山ボス：40転生前後＋フルバフ前提
  berserkOgre: {
    id: "berserkOgre",
    name: "バーサークオーガー",
    hp: 21000,  // 40転生STR/スキル/料理フルで10T前後を想定
    atk: 1142,  // 【調整】旧9000は実測プレイヤーHPの8倍超で即死一発だったため是正（2〜3発耐え目標）
    def: 1800,   // 1転生T1装備ではまともに通らない程度
    dex: 600,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 1400,
    isBoss: true
  },

  // 砂漠ボス（T5・転生60目安）
  // 【調整】旧数値はT4までの伸び率と断絶した単純延長だったため、
  // 実測ステ成長カーブから討伐10T前後・被弾2〜3発で瀕死になるよう再計算
  desertLord: {
    id: "desertLord",
    name: "砂漠の覇王",
    hp: 33400,
    atk: 1690,
    def: 1871,
    dex: 624,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 1800,
    isBoss: true
  },
  // 毒沼ボス（T6・転生90目安）
  swampQueen: {
    id: "swampQueen",
    name: "毒沼の女王",
    hp: 54400,
    atk: 2553,
    def: 3047,
    dex: 1016,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 2200,
    isBoss: true
  },
  // 古代遺跡ボス（T7・転生130目安）
  ruinOverlord: {
    id: "ruinOverlord",
    name: "遺跡の支配者",
    hp: 84400,
    atk: 3777,
    def: 4724,
    dex: 1575,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 2600,
    isBoss: true
  },
  // 浮遊島ボス（T8・転生180目安）
  skyDragon: {
    id: "skyDragon",
    name: "天空竜",
    hp: 126300,
    atk: 5436,
    def: 7074,
    dex: 2358,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 3100,
    isBoss: true
  },
  // 氷の塔ボス（T9・転生240目安）
  iceEmperor: {
    id: "iceEmperor",
    name: "氷帝",
    hp: 181100,
    atk: 7595,
    def: 10143,
    dex: 3381,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 3600,
    isBoss: true
  },
  // 地獄の門ボス（T10・転生310目安）
  hellLord: {
    id: "hellLord",
    name: "地獄の王",
    hp: 249400,
    atk: 10210,
    def: 13964,
    dex: 4655,  // ★命中/回避用DEX（def/3目安、要調整）
    money: 4200,
    isBoss: true
  }
};

// ===== エリア別出現テーブル =====

const AREA_ENEMY_TABLE = {
  // 草原：スライム多め、たまにオオカミ
  field: [
    "slime","slime","slime","slime",
    "wolf"
  ],

  forest: [
    "forestWolf","forestWolf","forestWolf",
    "goblin"
  ],
  cave: [
    "caveGoblin","caveGoblin",
    "goblinMage",
    "goblinTamer",
    "ogre"
  ],
  mine: [
    "ogreBrute",
    "ogreGuard",
    "ogreShaman"
  ],

  // 灼熱の砂漠（T5）
  desert: [
    "desertScorpion","desertScorpion",
    "desertBandit",
    "desertWorm"
  ],

  // 毒沼（T6）
  swamp: [
    "swampSlime","swampSlime",
    "poisonFrog",
    "swampSpecter"
  ],

  // 古代遺跡（T7）
  ruin: [
    "ruinGuardian",
    "ruinMummy",
    "ruinMagus"
  ],

  // 浮遊島（T8）
  sky: [
    "skyHarpy",
    "skyKnight",
    "skyElemental"
  ],

  // 氷の塔（T9）
  ice: [
    "iceWolf",
    "iceGolem",
    "frostMage"
  ],

  // 地獄の門（T10）
  hell: [
    "hellHound",
    "darkKnight",
    "abyssDemon"
  ]
};

const AREA_BOSS_ID = {
  field:  "kingSlime",
  forest: "hundredWolfKing",
  cave:   "goblinKing",
  mine:   "berserkOgre",

  desert: "desertLord",
  swamp:  "swampQueen",
  ruin:   "ruinOverlord",
  sky:    "skyDragon",
  ice:    "iceEmperor",
  hell:   "hellLord"
};