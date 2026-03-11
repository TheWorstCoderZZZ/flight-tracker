const { getJson } = require("serpapi");
const axios = require("axios");
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Web Server 讓 Render 保持運行
app.get('/', (req, res) => {
  res.send('<h1>機票監控機器人運行中！✈️</h1>');
});
app.listen(port, () => console.log(`Server running on port ${port}`));

// 從 Environment Variables 讀取設定
const API_KEY = process.env.SERPAPI_KEY;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const BUDGET = parseInt(process.env.FLIGHT_BUDGET) || 1100;

function checkFlights() {
  const now = new Date().toLocaleString("zh-HK", {timeZone: "Asia/Hong_Kong"});
  console.log(`[${now}] 正在檢查 UO598/UO597 航班...`);

  getJson({
    engine: "google_flights",
    departure_id: "HKG",
    arrival_id: "PQC",
    outbound_date: "2026-06-21",
    return_date: "2026-06-28",
    currency: "HKD",
    api_key: API_KEY
  }, (json) => {
    // 1. 結合 best_flights 同其他 flights 搵出最齊嘅數據
    const allItineraries = [...(json.best_flights || []), ...(json.other_flights || [])];

    // 2. 篩選出同時符合 UO598 同 UO597 嘅組合
    const targetFlight = allItineraries.find(itinerary => {
      const flights = itinerary.flights;
      // 確保呢個組合入面有呢兩個航班編號
      const hasOutbound = flights.some(f => f.flight_number === "UO598");
      const hasReturn = flights.some(f => f.flight_number === "UO597");
      return hasOutbound && hasReturn;
    });

    if (targetFlight) {
      const price = targetFlight.price;
      console.log(`✅ 搵到目標航班！UO598/UO597 現價: HKD ${price}`);

      if (price <= BUDGET) {
        sendPushNotification(price);
      } else {
        console.log(`❌ 價格 ${price} 仲未跌到預算 ${BUDGET}。`);
      }
    } else {
      console.log("⚠️ 暫時搵唔到 UO598/UO597 嘅直航組合，可能已售罄或日期有誤。");
    }
  });
}

checkFlights();
setInterval(checkFlights, 8 * 60 * 60 * 1000); // 8 小時 Check 一次

