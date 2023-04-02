
let getTickerDataFromTDA = async (ticker) => {
  const response = await fetch("https://invest.ameritrade.com/grid/m/equityOrderQuote/json", {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "adrum": "isAjax:true",
      "content-type": "application/x-www-form-urlencoded",
      "correlation-id": dojoConfig.correlationId,
      "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest"
    },
    "referrer": "https://invest.ameritrade.com/grid/p/site",
    "referrerPolicy": "origin-when-cross-origin",
    "body": "symbols="+ticker+"&forceRealTime=true&isTradeQuote=true&transactionToken="+dojoConfig.transactionToken+"&xhrToken=true&dojo.preventCache="+Date.now(),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  return await response.json();
}


const saveTickerData = async (ticker, json_str) => {
  const response = await fetch('http://127.0.0.1:5000/'+ticker, {
    method: 'POST',
    body: json_str,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getAndSave = async () => {
  for (const ticker of TICKERS) {
    const ticker_data = await getTickerDataFromTDA(ticker);
    const db_response = await saveTickerData(ticker, JSON.stringify(ticker_data));
    console.log("ticker: " + ticker + " response: " + JSON.stringify(db_response));
    sleep(1000)
  }
}


function keepAlive() {
  document.getElementById('dtExpand').click();
  document.getElementById('navAccOverview').click();
  sleep(5000);
  document.getElementById('portfolioPositions').click();
}


function getProps() {
  // const tmp = '{' + document.getElementById('container-site').getAttribute('data-dojo-props').replace(/(\w+):/g, '"$1":').replace(/'/g, '"') + '}';
  // return JSON.parse(tmp)
  return dojoConfig;
}


function run() {
  setTimeout(run, S*1000);
  if (P !== 1) {
    getAndSave();
  }
}

const TICKERS = ['WAL'];
const KEEP_ALIVE_INTERVAL = 180*1000
let KA = setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
let S = 5;
let P = 0;
setTimeout(run, 100);
