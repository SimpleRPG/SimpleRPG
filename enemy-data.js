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
    exp: 8,
    money: 3,
    isBoss: false
  },
  wolf: {
    id: "wolf",
    name: "オオカミ",
    hp: 22,   // 4〜6発くらい
    atk: 6,   // ちょっとだけ痛い
    def: 1,
    exp: 12,
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
    exp: 30,
    money: 12,
    isBoss: false
  },
  goblin: {
    id: "goblin",
    name: "ゴブリン",
    hp: 170,
    atk: 60,
    def: 20,
    exp: 38,
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
    exp: 65,
    money: 24,
    isBoss: false
  },
  goblinMage: {
    id: "goblinMage",
    name: "ゴブリンマジシャン",
    hp: 300,
    atk: 95,
    def: 32,
    exp: 80,
    money: 30,
    isBoss: false
  },
  goblinTamer: {
    id: "goblinTamer",
    name: "ゴブリンテイマー",
    hp: 340,
    atk: 105,
    def: 35,
    exp: 100,
    money: 36,
    isBoss: false
  },
  ogre: {
    id: "ogre",
    name: "オーガ",
    hp: 420,
    atk: 120,
    def: 40,
    exp: 160,
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
    exp: 210,
    money: 70,
    isBoss: false
  },
  ogreGuard: {
    id: "ogreGuard",
    name: "オーガガード",
    hp: 720,
    atk: 165,
    def: 60,
    exp: 250,
    money: 82,
    isBoss: false
  },
  ogreShaman: {
    id: "ogreShaman",
    name: "オーガシャーマン",
    hp: 680,
    atk: 175,
    def: 52,
    exp: 270,
    money: 90,
    isBoss: false
  },

  // ===== ボス =====
  // 草原ボス：0転生レベル100＋料理前提
  kingSlime: {
    id: "kingSlime",
    name: "キングスライム？",
    hp: 420,   // HP228＋装備込ATK/DEF想定で10T前後
    atk: 60,   // 0転生DEF＋料理で3〜5発耐える程度
    def: 18,
    exp: 800,
    money: 200,
    isBoss: true
  },
  // 森ボス：10転生＋料理前提
  hundredWolfKing: {
    id: "hundredWolfKing",
    name: "百狼の王",
    hp: 900,   // 10転生想定、与ダメも被ダメも10T前後
    atk: 110,
    def: 40,
    exp: 1600,
    money: 450,
    isBoss: true
  },
  // 洞窟ボス：20転生前後＋装備＋料理前提
  goblinKing: {
    id: "goblinKing",
    name: "ゴブリンキング",
    hp: 1500,
    atk: 150,
    def: 60,
    exp: 2800,
    money: 800,
    isBoss: true
  },
  // 廃鉱山ボス：40転生前後＋フルバフ前提
  berserkOgre: {
    id: "berserkOgre",
    name: "バーサークオーガー",
    hp: 2600,  // 40転生STR/スキル/料理フルで10T前後を想定
    atk: 210,  // DEF237＋装備＋防御料理でも2〜4発は食らう
    def: 90,   // 1転生T1装備ではまともに通らない程度
    exp: 4500,
    money: 1400,
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
  ]
};

const AREA_BOSS_ID = {
  field:  "kingSlime",
  forest: "hundredWolfKing",
  cave:   "goblinKing",
  mine:   "berserkOgre"
};