const { getJson } = require("serpapi");
const axios = require("axios");
const express = require('express');

// 1. Web Server 設定 (讓 Render 免費版 24 小時運作)
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>UO 富國島監控機器人運行中！✈️</h1><p>目前正在雲端 24/7 幫你吼住 UO598 同 UO597。</p>');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 2. 從環境變數讀取設定
const API_KEY = process.env.SERPAPI_KEY;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const BUDGET = parseInt(process.env.FLIGHT_BUDGET) || 3000;

// 3. 手機推送函數 (ntfy.sh)
async function sendPushNotification(price) {
  try {
    await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, 
      `✈️ UO 富國島平機票！現價 HKD ${price}`, 
      {
        headers: {
          'Title': 'Flight Price Alert',
          'Priority': 'high',
          'Tags': 'airplane,moneybag'
        }
      }
    );
    console.log("📱 手機推送已發送！");
  } catch (err) {
    console.error("推送失敗:", err.message);
  }
}

// 4. 核心監控邏輯
function checkFlights() {
  const now = new Date().toLocaleString("zh-HK", {timeZone: "Asia/Hong_Kong"});
  console.log(`[${now}] 正在掃描 UO 航班 (HKG <-> PQC)...`);

  getJson({
    engine: "google_flights",
    departure_id: "HKG",
    arrival_id: "PQC",
    outbound_date: "2026-06-21",
    return_date: "2026-06-28",
    currency: "HKD",
    gl: "hk",
    hl: "zh-tw", 
    api_key: API_KEY
  }, (json) => {
    // 合併所有搜尋結果
    const allOptions = [
      ...(json.best_flights || []),
      ...(json.other_flights || [])
    ];

    if (allOptions.length === 0) {
      console.log("❌ API 無回傳任何航班數據。");
      return;
    }

    // 篩選：只要航空公司名包含「快運」或 "Express" 且是直航 (2段)
    const myFlight = allOptions.find(itinerary => {
      const flights = itinerary.flights;
      const isUO = flights.every(f => 
        f.airline.includes("快運") || 
        f.airline.toLowerCase().includes("express")
      );
      const isDirect = flights.length === 2; 
      return isUO && isDirect;
    });

    if (myFlight) {
      const currentPrice = myFlight.price;
      const flightDetails = myFlight.flights.map(f => f.flight_number).join(' & ');
      console.log(`🎯 成功鎖定 UO 直航！航班: ${flightDetails} | 票價: HKD ${currentPrice}`);

      if (currentPrice <= BUDGET) {
        console.log(`🔥 價格 $${currentPrice} 低於預算 $${BUDGET}！發送通知...`);
        sendPushNotification(currentPrice);
      } else {
        console.log(`💡 目前價格 $${currentPrice} 仍高於預算 $${BUDGET}。`);
      }
    } else {
      console.log("⚠️ 搜尋結果中找不到符合條件的 UO 直航組合。");
      if (allOptions[0]) {
        console.log(`Debug - 搜尋首選是: ${allOptions[0].flights[0].airline} ($${allOptions[0].price})`);
      }
    }
  });
}

// 5. 啟動
checkFlights(); 
setInterval(checkFlights, 8 * 60 * 60 * 1000); // 每 8 小時檢查一次
