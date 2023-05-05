let dLen = dataObj['times'].length
let IDX = (dLen > 15*60) ? dLen - 15*60 : 0; 

const getNewTickerData = async (url) => {
	try {
		const response = await fetch(url, {
			"headers": {
				"accept": "*/*",
				"content-type": "application/json",
			},
			"method": "GET"
		});
		return await response.json();
	} catch (e) {
		console.log(url);
		console.log(e);
	}
}


function getDataFromIndex(idx) {
	if ( !exists(idx) ) {
		idx = 0;
	}
	return {
		times: dataObj.times.slice(idx),
		bids: dataObj.bids.slice(idx),
		asks: dataObj.asks.slice(idx),
		lasts: dataObj.lasts.slice(idx),
		volumes: dataObj.volumes.slice(idx),
	};
}

function getChartData(tbal, old = null) {
	if ( !exists(tbal) || tbal.times.length === 0) {
		return {};
	}
	let data = tbal;
	if (DATAINTERVAL > 1) {
		data = {times: [], bids: [], asks: [], lasts: []};
		for (const [k, v] of Object.entries(tbal)) {
			for (const [i, n] of v.entries()) {
				if (i%DATAINTERVAL == 0) {
					data[k].push(n);
				}
			}
		}
	}
	return {
		labels: data.times,
		datasets: [
			{
				label: 'Bid: ' + data.bids[data.bids.length-1].toFixed(2),
				data: data.bids,
				borderWidth: 1,
				borderColor: 'green',
				backgroundColor: 'green',
				hidden: (old != null) ? old.datasets[0].hidden : false,
			},
			{
				label: 'Ask: ' + data.asks[data.asks.length-1].toFixed(2),
				data: data.asks,
				borderWidth: 1,
				borderColor: 'red',
				backgroundColor: 'red',
				hidden: (old != null) ? old.datasets[1].hidden : false,
			},
			{
				label: 'Last: ' + data.lasts[data.lasts.length-1].toFixed(2) + '          ',
				data: data.lasts,
				borderWidth: 2,
				borderColor: '#FFC300',
				backgroundColor: '#FFC300',
				hidden: (old != null) ? old.datasets[2].hidden : false,
			},
		],
		text: 'blahblahblah'
	};
}

let chartOptions = {
	responsive: true,
	stacked: true,
	//maintainAspectRatio: false,
	animation: {
		duration: 0
	},
	scales: {
		x: {
			ticks: {
				color: '#C0C0C0',
			},
			grid: {
				//drawOnChartArea: false,
				color: '#181a19',
			}
		},
		y: {
			type: 'linear',
			position: 'right',
			grid: {
				//drawOnChartArea: false,
				color: '#3c403f',
			},
			ticks: {
				color: '#C0C0C0',
			},
		},
	},
	plugins: {
		zoom: {
			pan: {
				enabled: false,
				mode: 'xy',
			},
			zoom: {
				wheel: {
					enabled: false,
				},
				pinch: {
					enabled: false
				},
				drag: {
					enabled: false
				},
				mode: 'xy',
			},
		},
		tooltip: {
			enabled: false,
		},
		legend: {
			display: false,
			align: 'end',
			labels: {
				color: '#FFFFFF',
				font: {
					size: 20,
				},
			},
			onHover: (evt, item, legend) => {
				console.log('onhover');
				//document.getElementById("WAL").style.cursor = 'pointer';
			},
		},
		customChartLegend: {
			containerID: 'PriceChartLegend',
		},
	},
	elements:{
		point: {
			borderWidth: 0,
			radius: 1,
			//backgroundColor: 'rgba(0,0,0,0)'
		}
	},
	legend: {
		onClick: (evt, item, legend) => {
			let index = item.datasetIndex;
			if (this.chart.getDataVisibility(index)) {
				this.chart.hide(index);
			} else {
				this.chart.show(index);
			}
		},
		onHover: (evt, item, legend) => {
			console.log('onhover');
			//document.getElementById("WAL").style.cursor = 'pointer';
		},
	},
};

function getChartConfig(type, data, options, plugins) {
	return {
		type: type,
		data: data,
		options: options,
		plugins: plugins
	};
}


const updateChartsWithNewData = async (newData) => {
	// if (dataObj.times.length == 0) {
	// 	return;
	// }
	// let end = dataObj.times[dataObj.times.length - 1];
	// let begin = end.split(':');
	// begin[2] = parseInt(begin[2]) + 1;  // want 1 second more
	// prev_volume = dataObj.volumes[dataObj.volumes.length - 1];
	// let url = ticker + '?prev_volume=' + prev_volume + '&from_time=' + begin.join(':');
	// let newData = await getNewTickerData(url);

	if (newData[ticker].times.length > 0) {
		// send notifications
		if (exists('window.tickerNotie')) {
			tickerNotie.check();
		}
		// ticker price data and chart
		dataObj.times.push(...newData[ticker].times)
		dataObj.bids.push(...newData[ticker].bids);
		dataObj.asks.push(...newData[ticker].asks);
		dataObj.lasts.push(...newData[ticker].lasts);
		dataObj.volumes.push(...newData[ticker].volumes);
		let priceData = getDataFromIndex(IDX);
		stockChart.data = getChartData(priceData, stockChart.data);
		stockChart.update();
		$('#low').text().replace(newData[ticker].low)
		$('#high').text().replace(newData[ticker].high)
		// stockChart.destroy();
		// stockChart = new Chart(ctx, getChartConfig('line', getChartData(data), chartOptions, []));

		// RSI data and chart
		let RSIarr = calculateRSI(RSI_PERIODS, priceData.lasts);
		rsiChart.data = getRSIChartData(RSIarr, rsiChart.data);
		rsiChart.update();
		//rsiChart = new Chart($('#RSIchart'), getChartConfig('line', getRSIChartData(RSIarr), RSIChartOptions, [horizontalLine]));
	}
}


function showChartMinsBack(minsBack) {
	let last = dataObj.times[dataObj.times.length - 1];
	let hms = last.split(':');
	let hrs = parseInt(hms[0])
	let mins = parseInt(hms[1]);
	let secs = parseInt(hms[2]);
	let openSince = 9*60 + 30;   // Open time, 9:30 AM Eastern
	const oldIDX = IDX;

	if ( minsBack === 0 && hrs*60 + mins >= openSince) {
		minsBack = hrs*60 + mins - openSince;
	}

	if (minsBack > 0) {
		let backAsSeconds = (hrs*60 + mins - minsBack)*60 + secs;
		for (const [i, value] of dataObj.times.entries()) {
			let time = value.split(':');
			let asSecs = parseInt(time[0])*3600 + parseInt(time[1]*60) + parseInt(time[2]);
			if (asSecs > backAsSeconds) {
				IDX = i;
				break;
			}
		}
	}
	if (IDX !== oldIDX) {
		let priceData = getDataFromIndex(IDX);
		stockChart.data = getChartData(priceData, stockChart.data);
		stockChart.update();
		// stockChart.destroy();
		//stockChart = new Chart(ctx, getChartConfig('line', getChartData(data), chartOptions, []));

		let RSIarr = calculateRSI(RSI_PERIODS, dataObj.lasts.slice(IDX));
		rsiChart.data = getRSIChartData(RSIarr, rsiChart.data);
		rsiChart.update();
		// rsiChart.destroy();
		// rsiChart = new Chart($('#RSIchart'), getChartConfig('line', getRSIChartData(RSIarr), RSIChartOptions, [CHART_PLUGINS[1]]));
	}
}


function updateBidAskLastLegendPrices(bid, ask, last) {
	stockChart.data.datasets.forEach (
		(obj, i) => {
			let label = obj.label.split(':')[0];
			if ( label == 'Bid') {
				obj.label = 'Bid: ' + bid;
			} else if ( label == 'Ask' ) {
				obj.label = 'Ask: ' + ask;
			} else if ( label == 'Last' ) {
				obj.label = 'Last: ' + last;
			}
		}
	);
	stockChart.update();
}

let PriceChartPlugins = [];
PriceChartPlugins.push(...getPluginsByIDs(['customChartLegend']));

const ctx = document.getElementById(ticker);
let stockChart = new Chart(ctx, getChartConfig('line', getChartData( getDataFromIndex(IDX) ), chartOptions, PriceChartPlugins));