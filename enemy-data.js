// enemy-data.js
// 敵マスタ＋エリア別テーブル＋ボスID定義

const ENEMIES = {
  // 草原系（初心者向けザコ）: Lv1全職でも勝てるよう大幅に弱める
  slime: {
    id: "slime",
    name: "スライム",
    hp: 12,   // ほんの少しだけ増やす
    atk: 4,   // HP30に対して8発前後
    def: 0,
    money: 3,
    isBoss: false
  },
  wolf: {
    id: "wolf",
    name: "オオカミ",
    hp: 22,   // 4〜6発くらい
    atk: 6,   // ちょっとだけ痛い
    def: 1,
    money: 5,
    isBoss: false
  },

  // 森系（10転生目安）
  forestWolf: {
    id: "forestWolf",
    name: "森のオオカミ",
    hp: 140,     // 素STR/VITに対して10ターン程度想定で増やす
    atk: 55,     // 10転生VIT96前後に対してそこそこ痛い
    def: 18,
    money: 12,
    isBoss: false
  },
  goblin: {
    id: "goblin",
    name: "ゴブリン",
    hp: 170,
    atk: 60,
    def: 20,
    money: 14,
    isBoss: false
  },

  // 洞窟系（20転生目安）
  caveGoblin: {
    id: "caveGoblin",
    name: "洞窟ゴブリン",
    hp: 260,
    atk: 85,
    def: 30,
    money: 24,
    isBoss: false
  },
  goblinMage: {
    id: "goblinMage",
    name: "ゴブリンマジシャン",
    hp: 300,
    atk: 95,
    def: 32,
    money: 30,
    isBoss: false
  },
  goblinTamer: {
    id: "goblinTamer",
    name: "ゴブリンテイマー",
    hp: 340,
    atk: 105,
    def: 35,
    money: 36,
    isBoss: false
  },
  ogre: {
    id: "ogre",
    name: "オーガ",
    hp: 420,
    atk: 120,
    def: 40,
    money: 60,
    isBoss: false
  },

  // 廃鉱山系ザコ（40転生目安）
  ogreBrute: {
    id: "ogreBrute",
    name: "オーガブルート",
    hp: 650,
    atk: 155,
    def: 55,
    money: 70,
    isBoss: false
  },
  ogreGuard: {
    id: "ogreGuard",
    name: "オーガガード",
    hp: 720,
    atk: 165,
    def: 60,
    money: 82,
    isBoss: false
  },
  ogreShaman: {
    id: "ogreShaman",
    name: "オーガシャーマン",
    hp: 680,
    atk: 175,
    def: 52,
    money: 90,
    isBoss: false
  },

  // ===== ここから T5〜T10 用の雑魚（仮データ） =====
  // 既存の伸びを参考に、だいたい1〜2段階ずつ強くしているだけ

  // 灼熱の砂漠（T5想定）
  desertScorpion: {
    id: "desertScorpion",
    name: "砂漠サソリ",
    hp: 780,
    atk: 190,
    def: 70,
    money: 110,
    isBoss: false
  },
  desertBandit: {
    id: "desertBandit",
    name: "砂漠の盗賊",
    hp: 820,
    atk: 200,
    def: 72,
    money: 120,
    isBoss: false
  },
  desertWorm: {
    id: "desertWorm",
    name: "サンドワーム",
    hp: 880,
    atk: 210,
    def: 75,
    money: 130,
    isBoss: false
  },

  // 毒沼（T6想定）
  swampSlime: {
    id: "swampSlime",
    name: "毒沼スライム",
    hp: 950,
    atk: 230,
    def: 80,
    money: 150,
    isBoss: false
  },
  poisonFrog: {
    id: "poisonFrog",
    name: "ポイズンフロッグ",
    hp: 1000,
    atk: 240,
    def: 85,
    money: 160,
    isBoss: false
  },
  swampSpecter: {
    id: "swampSpecter",
    name: "沼の亡霊",
    hp: 1050,
    atk: 255,
    def: 88,
    money: 170,
    isBoss: false
  },

  // 古代遺跡（T7想定）
  ruinGuardian: {
    id: "ruinGuardian",
    name: "遺跡ガーディアン",
    hp: 1150,
    atk: 280,
    def: 95,
    money: 190,
    isBoss: false
  },
  ruinMummy: {
    id: "ruinMummy",
    name: "ミイラ戦士",
    hp: 1200,
    atk: 295,
    def: 98,
    money: 200,
    isBoss: false
  },
  ruinMagus: {
    id: "ruinMagus",
    name: "古代魔導師",
    hp: 1250,
    atk: 310,
    def: 100,
    money: 210,
    isBoss: false
  },

  // 浮遊島（T8想定）
  skyHarpy: {
    id: "skyHarpy",
    name: "ハーピー",
    hp: 1350,
    atk: 340,
    def: 110,
    money: 230,
    isBoss: false
  },
  skyKnight: {
    id: "skyKnight",
    name: "空の騎士",
    hp: 1400,
    atk: 360,
    def: 115,
    money: 245,
    isBoss: false
  },
  skyElemental: {
    id: "skyElemental",
    name: "風のエレメンタル",
    hp: 1450,
    atk: 380,
    def: 118,
    money: 260,
    isBoss: false
  },

  // 氷の塔（T9想定）
  iceWolf: {
    id: "iceWolf",
    name: "アイスウルフ",
    hp: 1600,
    atk: 410,
    def: 130,
    money: 290,
    isBoss: false
  },
  iceGolem: {
    id: "iceGolem",
    name: "アイスゴーレム",
    hp: 1700,
    atk: 430,
    def: 140,
    money: 310,
    isBoss: false
  },
  frostMage: {
    id: "frostMage",
    name: "フロストメイジ",
    hp: 1650,
    atk: 450,
    def: 135,
    money: 320,
    isBoss: false
  },

  // 地獄の門（T10想定）
  hellHound: {
    id: "hellHound",
    name: "ヘルハウンド",
    hp: 1900,
    atk: 500,
    def: 155,
    money: 360,
    isBoss: false
  },
  darkKnight: {
    id: "darkKnight",
    name: "ダークナイト",
    hp: 2000,
    atk: 530,
    def: 165,
    money: 380,
    isBoss: false
  },
  abyssDemon: {
    id: "abyssDemon",
    name: "アビスデーモン",
    hp: 2100,
    atk: 560,
    def: 175,
    money: 400,
    isBoss: false
  },

  // ===== ボス =====
  // 草原ボス：0転生レベル100＋料理前提
  kingSlime: {
    id: "kingSlime",
    name: "キングスライム？",
    hp: 450,   // HP228＋装備込ATK/DEF想定で10T前後
    atk: 160,   // 0転生DEF＋料理で3〜5発耐える程度
    def: 50,
    
    money: 200,
    isBoss: true
  },
  // 森ボス：10転生＋料理前提
  hundredWolfKing: {
    id: "hundredWolfKing",
    name: "百狼の王",
    hp: 5000,   // 10転生想定、与ダメも被ダメも10T前後
    atk: 1900,
    def: 600,
    
    money: 450,
    isBoss: true
  },
  // 洞窟ボス：20転生前後＋装備＋料理前提
  goblinKing: {
    id: "goblinKing",
    name: "ゴブリンキング",
    hp: 9000,
    atk: 3900,
    def: 1000,
    
    money: 800,
    isBoss: true
  },
  // 廃鉱山ボス：40転生前後＋フルバフ前提
  berserkOgre: {
    id: "berserkOgre",
    name: "バーサークオーガー",
    hp: 21000,  // 40転生STR/スキル/料理フルで10T前後を想定
    atk: 9000,  // DEF237＋装備＋防御料理でも2〜4発は食らう
    def: 1500,   // 1転生T1装備ではまともに通らない程度
    money: 1400,
    isBoss: true
  },

  // 砂漠ボス（T5想定）
  desertLord: {
    id: "desertLord",
    name: "砂漠の覇王",
    hp: 26000,
    atk: 11000,
    def: 1800,
    money: 1800,
    isBoss: true
  },
  // 毒沼ボス（T6想定）
  swampQueen: {
    id: "swampQueen",
    name: "毒沼の女王",
    hp: 32000,
    atk: 13000,
    def: 2200,
    money: 2200,
    isBoss: true
  },
  // 古代遺跡ボス（T7想定）
  ruinOverlord: {
    id: "ruinOverlord",
    name: "遺跡の支配者",
    hp: 39000,
    atk: 15500,
    def: 2600,
    money: 2600,
    isBoss: true
  },
  // 浮遊島ボス（T8想定）
  skyDragon: {
    id: "skyDragon",
    name: "天空竜",
    hp: 47000,
    atk: 18500,
    def: 3000,
    money: 3100,
    isBoss: true
  },
  // 氷の塔ボス（T9想定）
  iceEmperor: {
    id: "iceEmperor",
    name: "氷帝",
    hp: 56000,
    atk: 21500,
    def: 3400,
    money: 3600,
    isBoss: true
  },
  // 地獄の門ボス（T10想定）
  hellLord: {
    id: "hellLord",
    name: "地獄の王",
    hp: 66000,
    atk: 25000,
    def: 3800,
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