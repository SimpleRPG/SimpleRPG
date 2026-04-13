// server.js
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

// 環境変数から許可オリジンを指定できるようにする（未設定なら *）
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

// Express アプリケーションを作成
const app = express();

// public ディレクトリ（または実際のフロント配置先）を静的配信
const PUBLIC_DIR = path.join(__dirname);
app.use(express.static(PUBLIC_DIR));

// ルートアクセスで index.html を返す（念のため明示）
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// HTTP サーバーを Express アプリから作成
const httpServer = http.createServer(app);

// Socket.io サーバー
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// ★サーバー共通の市場データ（超シンプル版）
// listing 形式: { id, sellerId, itemKey, category, amount, price }
let marketListings = [];

// ★サーバー共通の買い注文データ（プレイヤー同士用）
// order 形式: { id, buyerId, itemKey, category, price, maxAmount, remainAmount, reservedMoney, createdAt }
let marketBuyOrders = [];

// =======================
// NPC 買いロジック（サーバ側）
// =======================

const MAX_NPC_CHECK = 20;

function getMarketBaseValueServer(category, itemKey) {
  if (!Array.isArray(marketListings) || !marketListings.length) return 0;
  let minPrice = Infinity;
  for (const l of marketListings) {
    if (!l) continue;
    if (l.category !== category) continue;
    if (l.itemKey !== itemKey) continue;
    if (typeof l.price !== "number") continue;
    if (l.price < minPrice) {
      minPrice = l.price;
    }
  }
  if (!isFinite(minPrice)) return 0;
  return minPrice;
}

function getNpcBuyProbServer(baseValue, price, category) {
  if (price <= 0 || baseValue <= 0) return 0;

  const ratio = price / baseValue;
  let prob = 0;

  if (ratio < 0.5) {
    prob = 0.05;
  } else if (ratio < 1.0) {
    prob = 0.02;
  } else if (ratio < 1.5) {
    prob = 0.005;
  } else if (ratio < 2.5) {
    prob = 0.001;
  } else {
    prob = 0.0001;
  }

  if (prob > 0.25) prob = 0.25;
  return prob;
}

function serverSideRollNpcBuy() {
  try {
    if (!Array.isArray(marketListings) || marketListings.length === 0) return;

    const indices = [...marketListings.keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const maxCheck = Math.min(MAX_NPC_CHECK, indices.length);
    let updated = false;

    for (let idx = 0; idx < maxCheck; idx++) {
      const li = marketListings[indices[idx]];
      if (!li || li.amount <= 0) continue;

      const category = li.category;
      const itemKey = li.itemKey;
      if (!category || !itemKey) continue;

      const baseValue = getMarketBaseValueServer(category, itemKey);
      if (baseValue <= 0) continue;

      const prob = getNpcBuyProbServer(baseValue, li.price, category);
      if (prob <= 0) continue;
      if (Math.random() >= prob) continue;

      const buyAmount = Math.max(1, Math.floor(li.amount * 0.2)) || 1;
      const actualBuy = Math.min(li.amount, buyAmount);
      if (actualBuy <= 0) continue;

      li.amount -= actualBuy;
      if (li.amount <= 0) {
        marketListings[indices[idx]] = null;
      }

      updated = true;
    }

    if (updated) {
      marketListings = marketListings.filter(
        (l) => l && typeof l.amount === "number" && l.amount > 0
      );
      console.log(
        "[NPC] market updated by NPC buy, remaining listings:",
        marketListings.length
      );
      io.emit("market:update", marketListings);
    }
  } catch (e) {
    console.error("serverSideRollNpcBuy error:", e);
  }
}

const NPC_BUY_INTERVAL_MS = 30 * 1000;
setInterval(serverSideRollNpcBuy, NPC_BUY_INTERVAL_MS);

// =======================
// 買い注文ヘルパー
// =======================

function addBuyOrder(buyerId, category, itemKey, price, amount) {
  const now = Date.now();
  const order = {
    id: now.toString() + ":" + Math.random().toString(16).slice(2),
    buyerId,
    category,
    itemKey,
    price,
    maxAmount: amount,
    remainAmount: amount,
    reservedMoney: price * amount,  // ★ 予約Gをサーバー側でも保持
    createdAt: now
  };
  marketBuyOrders.push(order);
  return order;
}

function getBuyOrders(filter = {}) {
  const { buyerId, category, itemKey } = filter;
  return marketBuyOrders.filter(o => {
    if (!o) return false;
    if (buyerId && o.buyerId !== buyerId) return false;
    if (category && o.category !== category) return false;
    if (itemKey && o.itemKey !== itemKey) return false;
    return true;
  });
}

// キャンセル時に返金額を計算できるよう、対象 order を返すように変更
function cancelBuyOrder(buyerId, orderId) {
  const idx = marketBuyOrders.findIndex(o => o && o.id === orderId && o.buyerId === buyerId);
  if (idx === -1) return null;
  const order = marketBuyOrders[idx];
  marketBuyOrders.splice(idx, 1);
  return order;
}

function matchBuyOrdersForListing(listing) {
  const { category, itemKey, price: sellPrice } = listing;
  let remain = listing.amount;
  const matchedOrders = [];

  const candidates = getBuyOrders({ category, itemKey });

  if (!candidates.length) {
    return {
      matchedAmount: 0,
      remainingAmount: remain,
      matchedOrders
    };
  }

  candidates.sort((a, b) => {
    if (b.price !== a.price) return b.price - a.price;
    return a.createdAt - b.createdAt;
  });

  for (const order of candidates) {
    if (remain <= 0) break;
    if (order.price < sellPrice) continue;
    if (order.remainAmount <= 0) continue;

    const use = Math.min(order.remainAmount, remain);
    if (use <= 0) continue;

    order.remainAmount -= use;
    remain -= use;

    matchedOrders.push({
      orderId: order.id,
      buyerId: order.buyerId,
      price: order.price,
      amount: use
    });
  }

  marketBuyOrders = marketBuyOrders.filter(o => o && o.remainAmount > 0);

  const matchedAmount = listing.amount - remain;

  return {
    matchedAmount,
    remainingAmount: remain,
    matchedOrders
  };
}

// =======================
// Socket.io 接続ハンドラ
// =======================

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("ping-from-client", () => {
    console.log("Ping from client:", socket.id);
    socket.emit("pong-from-server");
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });

  // ★マーケット: 出品一覧を要求
  socket.on("market:list", () => {
    try {
      console.log("market:list from", socket.id);
      socket.emit("market:listResult", marketListings);
      console.log("market:listResult sent, count =", marketListings.length);
    } catch (e) {
      console.error("market:list error", e);
    }
  });

  // ★買い注文: （自分の）一覧要求
  socket.on("market:buyOrder:list", () => {
    try {
      const myOrders = getBuyOrders({ buyerId: socket.id });
      socket.emit("market:buyOrder:listResult", myOrders);
    } catch (e) {
      console.error("market:buyOrder:list error", e);
    }
  });

  // ★買い注文: 全体一覧要求（全プレイヤー分）
  socket.on("market:buyOrder:listAll", () => {
    try {
      const allOrders = getBuyOrders({});
      socket.emit("market:buyOrder:listAllResult", allOrders);
    } catch (e) {
      console.error("market:buyOrder:listAll error", e);
    }
  });

  // ★買い注文: 登録
  socket.on("market:buyOrder", (payload, ack) => {
    try {
      console.log("market:buyOrder payload:", payload);
      const { category, itemKey, price, amount } = payload || {};

      if (!category || !itemKey ||
          typeof price !== "number" || typeof amount !== "number") {
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }
      if (price <= 0 || amount <= 0) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_value" });
        }
        return;
      }

      const order = addBuyOrder(socket.id, category, itemKey, price, amount);

      if (typeof ack === "function") {
        ack({ ok: true, order });
      }

      const myOrders = getBuyOrders({ buyerId: socket.id });
      socket.emit("market:buyOrder:listResult", myOrders);

      const allOrders = getBuyOrders({});
      io.emit("market:buyOrder:listAllResult", allOrders);
    } catch (e) {
      console.error("market:buyOrder error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★買い注文: キャンセル
  socket.on("market:buyOrder:cancel", (payload, ack) => {
    try {
      console.log("market:buyOrder:cancel payload:", payload);
      const { orderId } = payload || {};
      if (!orderId) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }

      // 対象 order を取得してから削除
      const order = cancelBuyOrder(socket.id, orderId);
      if (!order) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "not_found" });
        }
        return;
      }

      // ここで「未使用分の返金額」を計算して ack で返す
      const usedAmount = (order.maxAmount || 0) - (order.remainAmount || 0);
      const usedMoney  = usedAmount * (order.price || 0);
      const reservedMoney = (order.price || 0) * (order.maxAmount || 0);
      const returnMoney = Math.max(0, reservedMoney - usedMoney);

      if (typeof ack === "function") {
        ack({ ok: true, returnMoney });
      }

      const myOrders = getBuyOrders({ buyerId: socket.id });
      socket.emit("market:buyOrder:listResult", myOrders);

      const allOrders = getBuyOrders({});
      io.emit("market:buyOrder:listAllResult", allOrders);
    } catch (e) {
      console.error("market:buyOrder:cancel error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★マーケット: 出品する（買い注文とマッチングしてから残りを掲載）
  socket.on("market:sell", (payload, ack) => {
    try {
      console.log("market:sell payload:", payload);

      const { itemKey, category, amount, price } = payload || {};

      if (!itemKey || !category ||
          typeof amount !== "number" || typeof price !== "number") {
        console.log("market:sell invalid_payload");
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }
      if (amount <= 0 || price <= 0) {
        console.log("market:sell invalid_value");
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_value" });
        }
        return;
      }

      const tempListing = {
        id: "temp",
        sellerId: socket.id,
        itemKey,
        category,
        amount,
        price
      };

      const matchResult = matchBuyOrdersForListing(tempListing);
      const matchedAmount = matchResult.matchedAmount || 0;
      let remainingAmount = matchResult.remainingAmount || 0;

      console.log(
        "market:sell match result:",
        { matchedAmount, remainingAmount, matchedOrders: matchResult.matchedOrders }
      );

      let listing = null;

      if (remainingAmount > 0) {
        listing = {
          id: Date.now().toString() + ":" + Math.random().toString(16).slice(2),
          sellerId: socket.id,
          itemKey,
          category,
          amount: remainingAmount,
          price
        };
        marketListings.push(listing);
      }

      console.log("marketListings now:", marketListings);

      if (typeof ack === "function") {
        ack({ ok: true, listing, matchedAmount });
      }

      console.log("emitting market:update, count =", marketListings.length);
      io.emit("market:update", marketListings);

      const allOrders = getBuyOrders({});
      io.emit("market:buyOrder:listAllResult", allOrders);
    } catch (e) {
      console.error("market:sell error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★マーケット: 出品を減らす／削除する（購入されたとき用）
  socket.on("market:consume", (payload, ack) => {
    try {
      console.log("market:consume payload:", payload);

      const { id, consumeAmount } = payload || {};
      if (!id || typeof consumeAmount !== "number" || consumeAmount <= 0) {
        console.log("market:consume invalid_payload");
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }

      const idx = marketListings.findIndex(l => l && l.id === id);
      if (idx === -1) {
        console.log("market:consume not_found:", id);
        if (typeof ack === "function") {
          ack({ ok: false, error: "not_found" });
        }
        return;
      }

      const listing = marketListings[idx];
      if (listing.amount < consumeAmount) {
        console.log("market:consume not_enough_amount:", id);
        if (typeof ack === "function") {
          ack({ ok: false, error: "not_enough_amount" });
        }
        return;
      }

      listing.amount -= consumeAmount;
      if (listing.amount <= 0) {
        marketListings.splice(idx, 1);
      }

      if (typeof ack === "function") {
        ack({ ok: true });
      }

      console.log("market:consume done, remaining listings:", marketListings.length);
      io.emit("market:update", marketListings);
    } catch (e) {
      console.error("market:consume error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });
});

// ポート
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log("Server (HTTP + Socket.io) listening on port " + port);
});