const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });

function createOrderUpdates(
  startId,
  count,
  price,
  triggerPrice,
  priceType,
  status,
  symbol
) {
  return Array.from({ length: count }, (_, i) => ({
    AppOrderID: startId + i,
    price: price + i,
    triggerPrice: triggerPrice + i,
    priceType,
    productType: "1",
    status,
    exchange: "NSE",
    symbol,
  }));
}

function sendOrderUpdates(ws) {
  const updates = [
    ...createOrderUpdates(1, 10, 100, 90, "MKT", "complete", "ABC"),
    ...createOrderUpdates(11, 20, 200, 190, "LMT", "open", "DEF"),
    ...createOrderUpdates(31, 40, 300, 290, "SL-LMT", "pending", "IGH"),
    ...createOrderUpdates(71, 30, 400, 390, "SL-MKT", "complete", "JKL"),
    ...createOrderUpdates(41, 5, 150, 140, "MKT", "cancelled", "NFLX"),
  ];

  const sendUpdatesWithDelay = (updatesSlice, delay) => {
    setTimeout(() => {
      updatesSlice.forEach((update) => {
        const time = new Date().toLocaleTimeString();
        ws.send(JSON.stringify(update));
        console.log(`[${time}] Sent update: ${JSON.stringify(update)}`);
      });
    }, delay);
  };

  sendUpdatesWithDelay(updates.slice(0, 10), 1000);
  sendUpdatesWithDelay(updates.slice(10, 30), 2000);
  sendUpdatesWithDelay(updates.slice(30, 70), 3000);
  sendUpdatesWithDelay(updates.slice(70, 100), 5000);
}

wss.on("connection", (ws) => {
  console.log("Client connected");
  sendOrderUpdates(ws);

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server running on ws://localhost:3000");
