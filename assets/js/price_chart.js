let dLen = (Object.keys(GL.cur_data()).length > 0 ) ? GL.cur_data().times.length : 0
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

	let data = GL.cur_data();
	if (data.times.length == 0) {
		return data;
	}

	return {
		times: data.times.slice(idx),
		bids: data.bids.slice(idx),
		asks: data.asks.slice(idx),
		lasts: data.lasts.slice(idx),
		volumes: data.volumes.slice(idx),
	};
}

function getChartData(tbal, old = null) {
	if ( !exists(tbal) || tbal.times.length === 0) {
		return {};
	}
	let data = tbal;
	if (GL.data_interval > 1) {
		data = {times: [], bids: [], asks: [], lasts: []};
		for (const [k, v] of Object.entries(tbal)) {
			for (const [i, n] of v.entries()) {
				if (i % GL.data_interval == 0) {
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
				hidden: (old === null || typeof old.datasets[0] === 'undefined' ) ? false : old.datasets[0].hidden,
			},
			{
				label: 'Ask: ' + data.asks[data.asks.length-1].toFixed(2),
				data: data.asks,
				borderWidth: 1,
				borderColor: 'red',
				backgroundColor: 'red',
				hidden: (old === null || typeof old.datasets[1] === 'undefined' ) ? false : old.datasets[1].hidden,
			},
			{
				label: 'Last: ' + data.lasts[data.lasts.length-1].toFixed(2) + '          ',
				data: data.lasts,
				borderWidth: 2,
				borderColor: '#FFC300',
				backgroundColor: '#FFC300',
				hidden: (old === null || typeof old.datasets[2] === 'undefined' ) ? false : old.datasets[2].hidden,
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


const updateChartsWithNewData = async (newData, updateChart = true) => {
	let newd = newData[GL.cur_ticker];
	if (newd.times.length > 0) {
		let data = GL.cur_data();
		// send notifications
		if (exists('window.tickerNotie')) {
			tickerNotie.check();
		}
		// ticker price data
		for (const [k, v] of Object.entries(data)) {
			if ( Array.isArray(newd[k]) ) {
				v.push(...newd[k]);
			} else {
				data[k] = newd[k];
			}
		}

		if (updateChart === true) {
			$('#low').text().replace(data.low)
			$('#high').text().replace(data.high)

			let priceData = getDataFromIndex(IDX);
			stockChart.data = getChartData(priceData, stockChart.data);
			stockChart.update();

			// RSI data and chart
			let RSIarr = calculateRSI(RSI_PERIODS, priceData.lasts);
			rsiChart.data = getRSIChartData(RSIarr, rsiChart.data);
			rsiChart.update();
		}
	}
}


const updateCharts = () => {
	let data = GL.cur_data();
	// send notifications
	if (exists('window.tickerNotie')) {
		tickerNotie.check();
	}

	$('#low').text().replace(data.low)
	$('#high').text().replace(data.high)

	let priceData = getDataFromIndex(IDX);
	stockChart.data = getChartData(priceData, stockChart.data);
	stockChart.update();

	// RSI data and chart
	let RSIarr = calculateRSI(RSI_PERIODS, priceData.lasts);
	rsiChart.data = getRSIChartData(RSIarr, rsiChart.data);
	rsiChart.update();
}


function showChartMinsBack(minsBack) {
	let data = GL.cur_data();
	let last = data.times[data.times.length - 1];
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
		for (const [i, value] of data.times.entries()) {
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

		let RSIarr = calculateRSI(RSI_PERIODS, data.lasts.slice(IDX));
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

const ctx = document.getElementById('price_chart');
let stockChart = new Chart(ctx, getChartConfig('line', getChartData( getDataFromIndex(IDX) ), chartOptions, PriceChartPlugins));