

function getToken() {
  props = document.getElementById('container-site').getAttribute('data-dojo-props').split(", ")
  for (const e of props) {
    const key_value = e.split(":")
    if (key_value[0] == 'transactionToken') {
      return key_value[1];
    }
  }
}


const getTickerData = async (ticker) => {
  const response = await fetch('https://invest.ameritrade.com/grid/m/equityOrderQuote/json', {
    method: 'POST',
    body: 'symbols='+ticker+'&forceRealTime=true&isTradeQuote=true&transactionToken='+TOKEN+'&xhrToken=true', // string or object
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
  if (DO) {
    for (const ticker of TICKERS) {
      data = getTickerData(ticker);
      response = saveTickerData(ticker, JSON.stringify(data));
      console.log("ticker: " + ticker, "response: " + response);
      sleep(1000);
    }
  }
}

var DO = true;
var TOKEN = getToken();
var TICKERS = ['WAL'];
var intv = setInterval(getAndSave, 10000);
// data='{"content":{"identifier":"id","label":"quoteData","urls":{"Equity":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","Fund":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","Option":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","Index":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","displayNewTab":"no","advanceChartLink":"https://research.ameritrade.com/grid/wwws/research/stocks/charts?display=popup&c_name=invest_VENDOR"},"isMarketOpen":"yes","isMarketExtendedSessionOpen":"no","items":[{"id":"1.00","isValidFlag":"yes","isRealtimeFlag":"yes","symbol":"WAL","symbolDisplay":"WAL","cusip":"957638109","description":"WesternAllianceBancorporationCommonStock(DE)","securityTypeDescription":"Equity","securityTypeValue":"E","sector":"Financials","industry":"Banks","ask":"31.01","askId":"K","askSize":"100.00","bid":"30.94","bidId":"Z","bidSize":"300.00","last":"30.975","lastId":"D","lastSize":"200.00","open":"30.21","close":"31.25","high":"32.63","low":"29.27","yearHigh":"88.00","yearLow":"7.46","change":"-0.275","changePercentage":"-0.88","volume":"3639369.00","exchangeId":"n","exchangeName":"NYSE","realtimeEntitled":false,"exchangeDescription":"NYSE","fundStrategy":"","daysUntilExpiration":"0.00","openInterest":"0.00","impliedVolatility":"0.00","timeValueIndex":"0.00","delta":"0.00","gamma":"0.00","theta":"0.00","vega":"0.00","rho":"0.00","probabilityOfExpiringInTheMoney":"0.00","deliverableNotes":"","sharesPerContract":"0.00","isNonStandardOption":"no","isMiniOption":"no","netAssetValue":"0.00","offerPrice":"0.00","underlyingSymbol":"","streamingSymbol":"WAL","time":"11:06:36amET","date":"03/24/2023","DelayedDatadisplay":"none","NTFFlag":false,"noLoadFlag":false,"premierFlag":false,"family":"","categoryName":"","offerPrice":"0.00","ytdReturn":"0.00","marginPercentage":"100%","lowConcentrationPercentage":"100%","midConcentrationPercentage":"100%","highConcentrationPercentage":"100%"}]},"time":"11:06:36amET","timestamp":"11:06:36amET3/24/23","errors":{}}';
// await saveTickerData('WAL', data)