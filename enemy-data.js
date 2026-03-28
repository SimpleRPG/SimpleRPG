// enemy-data.js
// 敵マスタ＋エリア別テーブル＋ボスID定義

const ENEMIES = {
  // 草原系（初心者向けザコ）: Lv1全職でも勝てるよう大幅に弱める
  slime: {
    id: "slime",
    name: "スライム",
    hp: 10,   // 3発前後で倒せる
    atk: 3,   // HP30に対して10発耐えるくらい
    def: 0,
    exp: 8,
    money: 3,
    isBoss: false
  },
  wolf: {
    id: "wolf",
    name: "オオカミ",
    hp: 18,   // 4〜6発くらい
    atk: 4,   // ちょっとだけ痛い
    def: 1,
    exp: 12,
    money: 5,
    isBoss: false
  },

  // 森系（ここから先は元のまま）
  forestWolf: {
    id: "forestWolf",
    name: "森のオオカミ",
    hp: 70,
    atk: 18,
    def: 3,
    exp: 28,
    money: 10,
    isBoss: false
  },
  goblin: {
    id: "goblin",
    name: "ゴブリン",
    hp: 85,
    atk: 20,
    def: 4,
    exp: 35,
    money: 12,
    isBoss: false
  },

  // 洞窟系
  caveGoblin: {
    id: "caveGoblin",
    name: "洞窟ゴブリン",
    hp: 110,
    atk: 28,
    def: 6,
    exp: 55,
    money: 20,
    isBoss: false
  },
  goblinMage: {
    id: "goblinMage",
    name: "ゴブリンマジシャン",
    hp: 120,
    atk: 35,
    def: 6,
    exp: 70,
    money: 25,
    isBoss: false
  },
  goblinTamer: {
    id: "goblinTamer",
    name: "ゴブリンテイマー",
    hp: 140,
    atk: 38,
    def: 7,
    exp: 85,
    money: 30,
    isBoss: false
  },
  ogre: {
    id: "ogre",
    name: "オーガ",
    hp: 200,
    atk: 50,
    def: 9,
    exp: 140,
    money: 50,
    isBoss: false
  },

  // 廃鉱山系ザコ
  ogreBrute: {
    id: "ogreBrute",
    name: "オーガブルート",
    hp: 260,
    atk: 60,
    def: 11,
    exp: 180,
    money: 60,
    isBoss: false
  },
  ogreGuard: {
    id: "ogreGuard",
    name: "オーガガード",
    hp: 300,
    atk: 58,
    def: 13,
    exp: 210,
    money: 70,
    isBoss: false
  },
  ogreShaman: {
    id: "ogreShaman",
    name: "オーガシャーマン",
    hp: 240,
    atk: 65,
    def: 10,
    exp: 230,
    money: 80,
    isBoss: false
  },

  // ===== ボス =====（そのまま） =====

  kingSlime: {
    id: "kingSlime",
    name: "キングスライム？",
    hp: 250,
    atk: 40,
    def: 8,
    exp: 800,
    money: 200,
    isBoss: true
  },
  hundredWolfKing: {
    id: "hundredWolfKing",
    name: "百狼の王",
    hp: 400,
    atk: 65,
    def: 10,
    exp: 1500,
    money: 400,
    isBoss: true
  },
  goblinKing: {
    id: "goblinKing",
    name: "ゴブリンキング",
    hp: 650,
    atk: 90,
    def: 14,
    exp: 2600,
    money: 700,
    isBoss: true
  },
  berserkOgre: {
    id: "berserkOgre",
    name: "バーサークオーガー",
    hp: 1000,
    atk: 120,
    def: 18,
    exp: 4000,
    money: 1200,
    isBoss: true
  }
};

// ===== エリア別出現テーブル =====

const AREA_ENEMY_TABLE = {
  // 草原：スライム多め、たまにオオカミ（元の構成を継承）
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