
const sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms));
}


let getTickerDataFromTDA = async (tickerStr) => {
	const paramStr = "symbols="+ tickerStr +"&forceRealTime=true&xhrToken=true&transactionToken="+ getProps().transactionToken +"&request.preventCache="+ Date.now();
	const response = await fetch("https://invest.ameritrade.com/grid/m/quoteData/json?"+ paramStr, {
		"headers": {
			"accept": "*/*",
			"accept-language": "en-US,en;q=0.9,ja;q=0.8,zh-CN;q=0.7,zh;q=0.6",
			"cache-control": "no-cache",
			"content-type": "application/x-www-form-urlencoded",
			"correlation-id": "r01ffb63b59-e8e9-11ed-8170-005056b40e0b",
			"pragma": "no-cache",
			"sec-ch-ua": "\"Chromium\";v=\"112\", \"Google Chrome\";v=\"112\", \"Not:A-Brand\";v=\"99\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"x-requested-with": "XMLHttpRequest"
		},
		"referrer": "https://invest.ameritrade.com/grid/p/site",
		"referrerPolicy": "origin-when-cross-origin",
		"body": null,
		"method": "GET",
		"mode": "cors",
		"credentials": "include"
	});

	return await response.json();
}


let saveTickerData = async (json_str) => {
	const response = await fetch('http://127.0.0.1:5000/qs', {
		method: 'POST',
		body: json_str,
		headers: {
			'Content-Type': 'application/json',
		}
	});

	return await response.json();
}


var getProps = ()=>{
	let attrs = document.getElementById('container-site').getAttribute('data-dojo-props');
	let obj = eval('({' + attrs + '})');
	return obj;
};


let getAndSave = async () => {
	if ( !exists( getProps().transactionToken ) ) {
		console.log('no transaction token; got logged out?');
		return;
	}
	const tickerStr = TICKERS.join(',');
	const ticker_data = await getTickerDataFromTDA(tickerStr);
	const db_response = await saveTickerData(JSON.stringify(ticker_data));
	console.log("tickers: " + tickerStr + " response: " + JSON.stringify(db_response));
}


const keepAlive = () => {
	document.getElementById('dtExpand').click();
	document.getElementById('navAccOverview').click();
	sleep(5000);
	document.getElementById('portfolioPositions').click();
}



function run() {
	if (!P) {
		getAndSave();
	}
}

let TICKERS = ['BAC', 'WFC', 'WAL', 'PACW', 'SCHW', 'ZION', 'KEY', 'JPM', 'ALLY', 'NTB'];
let TICKERS2 = ['AAPL', 'AMAT', 'AMZN', 'ASML', 'AXP', 'BABA', 'BX', 'CPT', 'DTC', 'EGP', 'FND', 'INTC', 'JEF', 'KLIC', 'MPTI', 'MPW', 'NU', 'NVDA', 'OXY', 'PARA', 'RH', 'TSLA', 'TSM'];
let TICKERS3 = ['ARRY', 'CVNA', 'GME', 'LAZR', 'NKE', 'NYCB', 'S'];
TICKERS = [...TICKERS, ...TICKERS2, ...TICKERS3];
let P = false;  // 1=pause fetching, 0=do fetching
let S = (secs) => {
	clearAllIntervals();
	setInterval2( run, secs*1000 )
}

S(10);
runAtSpecificTimeOfDay( 8, 25, true, ()=>{S(1)} );
runAtSpecificTimeOfDay( 15, 01, true, ()=>{S(10)} );
