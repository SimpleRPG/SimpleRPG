// season-core.js
// 季節システム
// ・全プレイヤー共通の現実カレンダーを基準にする（将来のオンライン化を見据えた設計）
// ・月曜始まりの「週」単位で 春→夏→秋→冬 の順にサイクルする
// ・cook-data.js 側の各作物メタに season: "spring"|"summer"|"autumn"|"winter"|"all" を設定して利用する
// 前提: getFarmCropMeta（farm-core.js）が存在すること

// =======================
// 設定
// =======================

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];
const SEASON_LABEL_JA = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬"
};

// 季節外の作物に掛けるペナルティ倍率（要バランス調整）
const FARM_OFF_SEASON_GROWTH_RATE  = 0.5; // 成長速度: 半減
const FARM_OFF_SEASON_HARVEST_RATE = 0.7; // 収穫量: -30%

// =======================
// 週インデックス計算（月曜始まり）
// =======================

// 指定日が属する「月曜始まりの週インデックス」を返す（その年の1/1からの通算・0始まり）
function getMondayWeekIndex(date) {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);

  // 1/1の曜日（0=日,1=月,...6=土）→ 直前(または当日)の月曜まで遡る日数
  const jan1Weekday = jan1.getDay();
  const offsetToMonday = (jan1Weekday === 0) ? 6 : (jan1Weekday - 1);
  const firstMonday = new Date(year, 0, 1 - offsetToMonday);

  const diffDays = Math.floor((date - firstMonday) / 86400000);
  return Math.floor(diffDays / 7);
}

// =======================
// 現在の季節
// =======================

// 現在の季節キーを返す（"spring"|"summer"|"autumn"|"winter"）
function getCurrentSeason() {
  const now = new Date();
  const weekIndex = getMondayWeekIndex(now);
  const idx = ((weekIndex % SEASON_ORDER.length) + SEASON_ORDER.length) % SEASON_ORDER.length;
  return SEASON_ORDER[idx];
}

// 現在の季節の日本語ラベル（"春"など）
function getCurrentSeasonLabel() {
  return SEASON_LABEL_JA[getCurrentSeason()] || "-";
}

// =======================
// 作物との季節判定
// =======================

// 指定した作物IDのseason設定と、現在の季節が一致するか
// season未設定 or "all" は常に一致扱い
function isCropInSeason(cropId) {
  if (!cropId) return true;
  if (typeof getFarmCropMeta !== "function") return true;

  const meta = getFarmCropMeta(cropId);
  if (!meta || !meta.meta) return true;

  const cropSeason = meta.meta.season;
  if (!cropSeason || cropSeason === "all") return true;

  return cropSeason === getCurrentSeason();
}

// 季節外なら成長delta量にペナルティを掛けて返す（季節内ならそのまま）
function applySeasonToGrowthDelta(delta, cropId) {
  if (isCropInSeason(cropId)) return delta;
  return delta * FARM_OFF_SEASON_GROWTH_RATE;
}

// 季節外なら収穫量にペナルティを掛けて返す（季節内ならそのまま、最低1は保証）
function applySeasonToHarvestAmount(amount, cropId) {
  if (isCropInSeason(cropId)) return amount;
  return Math.max(1, Math.floor(amount * FARM_OFF_SEASON_HARVEST_RATE));
}
