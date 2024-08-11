const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:3000");

let lastReceivedUpdateTime = null;
let pendingUpdates = [];
let existingOrders = {};

function isRedundantUpdate(newUpdate, existingUpdate) {
  return (
    newUpdate.AppOrderID === existingUpdate.AppOrderID &&
    newUpdate.price === existingUpdate.price &&
    newUpdate.triggerPrice === existingUpdate.triggerPrice &&
    newUpdate.priceType === existingUpdate.priceType &&
    newUpdate.productType === existingUpdate.productType &&
    newUpdate.status === existingUpdate.status &&
    newUpdate.exchange === existingUpdate.exchange &&
    newUpdate.symbol === existingUpdate.symbol
  );
}

function determineAction(orderUpdate) {
  const orderExists = existingOrders[orderUpdate.AppOrderID] !== undefined;

  if (orderUpdate.priceType === "MKT" && orderUpdate.status === "complete") {
    return orderExists ? "modifyOrder" : "placeOrder";
  } else if (orderUpdate.priceType === "LMT" && orderUpdate.status === "open") {
    return orderExists ? "modifyOrder" : "placeOrder";
  } else if (
    (orderUpdate.priceType === "SL-LMT" ||
      orderUpdate.priceType === "SL-MKT") &&
    orderUpdate.status === "pending"
  ) {
    return orderExists ? "modifyOrder" : "placeOrder";
  } else if (
    (orderUpdate.priceType === "LMT" ||
      orderUpdate.priceType === "SL-LMT" ||
      orderUpdate.priceType === "SL-MKT") &&
    orderUpdate.status === "cancelled"
  ) {
    return "cancelOrder";
  }
  return null;
}

function handleOrderUpdate(orderUpdate) {
  const action = determineAction(orderUpdate);
  if (action) {
    console.log(`For AppOrderId: ${orderUpdate.AppOrderID}: ${action} `);
  }
}

function processUpdates() {
  if (pendingUpdates.length > 0) {
    const uniqueUpdates = Array.from(
      new Map(pendingUpdates.map((item) => [item["AppOrderID"], item])).values()
    );

    uniqueUpdates.forEach((orderUpdate) => {
      const existingOrder = existingOrders[orderUpdate.AppOrderID];
      if (existingOrder && isRedundantUpdate(orderUpdate, existingOrder)) {
        console.log(
          `Filtered redundant update for Order ID: ${orderUpdate.AppOrderID}`
        );
        return;
      }

      handleOrderUpdate(orderUpdate);
      existingOrders[orderUpdate.AppOrderID] = orderUpdate;
    });

    pendingUpdates = [];
  }
}

ws.on("message", (data) => {
  const orderUpdate = JSON.parse(data);

  console.log(`Received: ${JSON.stringify(orderUpdate)}`);

  pendingUpdates.push(orderUpdate);

  const currentTime = new Date().getTime();
  if (!lastReceivedUpdateTime || currentTime - lastReceivedUpdateTime > 1000) {
    processUpdates();
    lastReceivedUpdateTime = currentTime;
  } else {
    setTimeout(processUpdates, 1000 - (currentTime - lastReceivedUpdateTime));
  }
});

ws.on("open", () => {
  console.log("Connected to WebSocket server");
});

ws.on("close", () => {
  console.log("Disconnected from WebSocket server");
});

ws.on("error", (error) => {
  console.error(`WebSocket error: ${error}`);
});
