// enemy-data.js
// 敵マスタ＋エリア別テーブル＋ボスID定義

// ===== 敵マスタ =====
// ENEMIES は「id をキーにしたオブジェクト」として定義する
const ENEMIES = {
  // 草原系（初心者向けザコ）
  slime: {
    id: "slime",
    name: "スライム",
    hp: 30,
    atk: 8,
    def: 1,
    exp: 10,
    money: 3,
    isBoss: false
  },
  wolf: {
    id: "wolf",
    name: "オオカミ",
    hp: 45,
    atk: 12,
    def: 2,
    exp: 18,
    money: 6,
    isBoss: false
  },

  // 森系
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

  // ===== ボス =====

  // 草原ボス（0転生Lv100目安）
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

  // 森ボス（5〜10転生目安）
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

  // 洞窟ボス（20転生目安）
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

  // 廃鉱山ボス（40転生目安）
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
// 配列内の重複回数で出現しやすさを調整
const AREA_ENEMY_TABLE = {
  // 草原エリア1（field）：スライム主体、たまにオオカミ
  field: [
    "slime","slime","slime","slime",
    "wolf"
  ],

  // 森エリア2（forest）：オオカミ主体、たまにゴブリン
  forest: [
    "forestWolf","forestWolf","forestWolf",
    "goblin"
  ],

  // 洞窟エリア3（cave）：
  // ゴブリン系メイン、たまにオーガ
  cave: [
    "caveGoblin","caveGoblin",
    "goblinMage",
    "goblinTamer",
    "ogre" // レア枠
  ],

  // 廃鉱山エリア4（mine）：オーガ系3種
  mine: [
    "ogreBrute",
    "ogreGuard",
    "ogreShaman"
  ]
};

// ===== エリアごとのボスID =====
const AREA_BOSS_ID = {
  field:  "kingSlime",
  forest: "hundredWolfKing",
  cave:   "goblinKing",
  mine:   "berserkOgre"
};