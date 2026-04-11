// server.js
const http = require("http");
const { Server } = require("socket.io");

// 環境変数から許可オリジンを指定できるようにする（未設定なら *）
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

// シンプルな HTTP サーバー（動作確認用）
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Simple RPG server with Socket.io is running.\n");
});

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

// クライアント接続時
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // ping / pong テスト
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
      // 単純に現在の配列を返す
      socket.emit("market:listResult", marketListings);
      console.log("market:listResult sent, count =", marketListings.length);
    } catch (e) {
      console.error("market:list error", e);
    }
  });

  // ★マーケット: 出品する
  socket.on("market:sell", (payload, ack) => {
    // payload: { itemKey, category, amount, price }
    try {
      console.log("market:sell payload:", payload);

      const { itemKey, category, amount, price } = payload || {};

      // 最低限のバリデーション
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

      const listing = {
        id: Date.now().toString() + ":" + Math.random().toString(16).slice(2),
        sellerId: socket.id,
        itemKey,
        category,
        amount,
        price
      };

      marketListings.push(listing);
      console.log("marketListings now:", marketListings);

      // 要求元にACK
      if (typeof ack === "function") {
        ack({ ok: true, listing });
      }

      // 全クライアントへ最新リストを通知
      console.log("emitting market:update, count =", marketListings.length);
      io.emit("market:update", marketListings);
    } catch (e) {
      console.error("market:sell error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★マーケット: 出品を減らす／削除する（購入されたとき用）
  socket.on("market:consume", (payload, ack) => {
    // payload: { id, consumeAmount }
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

      const idx = marketListings.findIndex(l => l.id === id);
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
      // 最新状態をブロードキャスト
      io.emit("market:update", marketListings);
    } catch (e) {
      console.error("market:consume error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });
});

// ポート 3001 で待機（Render では PORT は環境変数で渡される）
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log("Server (HTTP + Socket.io) listening on port " + port);
});