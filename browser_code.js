
const getTickerData = async (ticker) => {
  const response = await fetch('https://invest.ameritrade.com/grid/m/equityOrderQuote/json', {
    method: 'POST',
    body: 'symbols='+ ticker +'&forceRealTime=true&isTradeQuote=true&transactionToken='+ getProps().authToken.token +'&xhrToken=true', // string or object
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
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
    const ticker_data = await getTickerData(ticker)
    const db_response = await saveTickerData(ticker, JSON.stringify(ticker_data))
    console.log("ticker: " + ticker + " response: " + JSON.stringify(db_response))
    sleep(1000)
  }
}


function keepAlive() {
  document.getElementById('dtExpand').click()
}


function getProps() {
  const tmp = '{' + document.getElementById('container-site').getAttribute('data-dojo-props').replace(/(\w+):/g, '"$1":').replace(/'/g, '"') + '}';
  return JSON.parse(tmp)
}


function r(seconds) {
  if (typeof INTV === 'undefined'|| INTV === null) {
    clearInterval(INTV);
  }
  INTV = setInterval(getAndSave, seconds*1000);
}

const TICKERS = ['WAL'];
const KEEP_ALIVE_INTERVAL = 300*1000
let INTV = setInterval(getAndSave, 5*1000);
let KA = setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
