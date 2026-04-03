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

  // 森系（10転生目安に少し強化）
  forestWolf: {
    id: "forestWolf",
    name: "森のオオカミ",
    hp: 80,     // 旧:70
    atk: 20,    // 旧:18
    def: 3,
    exp: 30,    // やや増
    money: 12,
    isBoss: false
  },
  goblin: {
    id: "goblin",
    name: "ゴブリン",
    hp: 95,     // 旧:85
    atk: 22,    // 旧:20
    def: 4,
    exp: 38,
    money: 14,
    isBoss: false
  },

  // 洞窟系（20転生目安に強化）
  caveGoblin: {
    id: "caveGoblin",
    name: "洞窟ゴブリン",
    hp: 135,    // 旧:110
    atk: 32,    // 旧:28
    def: 6,
    exp: 65,
    money: 24,
    isBoss: false
  },
  goblinMage: {
    id: "goblinMage",
    name: "ゴブリンマジシャン",
    hp: 150,    // 旧:120
    atk: 40,    // 旧:35
    def: 6,
    exp: 80,
    money: 30,
    isBoss: false
  },
  goblinTamer: {
    id: "goblinTamer",
    name: "ゴブリンテイマー",
    hp: 180,    // 旧:140
    atk: 45,    // 旧:38
    def: 7,
    exp: 100,
    money: 36,
    isBoss: false
  },
  ogre: {
    id: "ogre",
    name: "オーガ",
    hp: 240,    // 旧:200
    atk: 56,    // 旧:50
    def: 9,
    exp: 160,
    money: 60,
    isBoss: false
  },

  // 廃鉱山系ザコ（40転生目安に強化）
  ogreBrute: {
    id: "ogreBrute",
    name: "オーガブルート",
    hp: 340,    // 旧:260
    atk: 70,    // 旧:60
    def: 11,
    exp: 210,
    money: 70,
    isBoss: false
  },
  ogreGuard: {
    id: "ogreGuard",
    name: "オーガガード",
    hp: 400,    // 旧:300
    atk: 72,    // 旧:58
    def: 13,
    exp: 250,
    money: 82,
    isBoss: false
  },
  ogreShaman: {
    id: "ogreShaman",
    name: "オーガシャーマン",
    hp: 320,    // 旧:240
    atk: 78,    // 旧:65
    def: 10,
    exp: 270,
    money: 90,
    isBoss: false
  },

  // ===== ボス =====
  // 草原ボスはほぼ据え置き（0転生レベル100＋料理前提）
  kingSlime: {
    id: "kingSlime",
    name: "キングスライム？",
    hp: 260,    // 旧:250（微増）
    atk: 42,    // 旧:40
    def: 8,
    exp: 800,
    money: 200,
    isBoss: true
  },
  // 森ボス：10転生＋料理前提で少し強化
  hundredWolfKing: {
    id: "hundredWolfKing",
    name: "百狼の王",
    hp: 480,    // 旧:400
    atk: 75,    // 旧:65
    def: 11,    // 旧:10
    exp: 1600,
    money: 450,
    isBoss: true
  },
  // 洞窟ボス：20転生前後＋装備＋料理前提
  goblinKing: {
    id: "goblinKing",
    name: "ゴブリンキング",
    hp: 820,    // 旧:650
    atk: 110,   // 旧:90
    def: 15,    // 旧:14
    exp: 2800,
    money: 800,
    isBoss: true
  },
  // 廃鉱山ボス：40転生前後＋フルバフ前提
  berserkOgre: {
    id: "berserkOgre",
    name: "バーサークオーガー",
    hp: 1400,   // 旧:1000
    atk: 145,   // 旧:120
    def: 20,    // 旧:18
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