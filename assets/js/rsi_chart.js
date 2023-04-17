const RSI_PERIODS = 14;
const EXPSMTH_TIMES = 2;
const EXPSMTH_ALPHA = 0.2;


function calculateRSI(periods = RSI_PERIODS, data = []) {
	if (data.length < periods) return [];
	let RSIarr = [];
	let periodSumGain = 0.0;
	let periodSumLoss = 0.0;
	let previousAvgGain = 0.0;
	let previousAvgLoss = 0.0;
	// let tgain = [0.0, 0.0, 0.06, 0.0, 0.72, 0.50, 0.27, 0.33, 0.42, 0.24, 0.0, 0.14, 0.0, 0.67, 0.0, 0.0, 0.03, 0.38, 0.0, 0.0, 0.57, 0.04, 0.0, 0.74, 0.0, 0.0, 0.0, 0.15, 0.04, 0.35, 0.0, 0.0, 0.47]
	// let tloss = [0.0, 0.25, 0.0, 0.54, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.19, 0.0, 0.42, 0.0, 0.0, 0.28, 0.0, 0.0, 0.19, 0.58, 0.0, 0.0, 0.54, 0.0, 0.67, 0.43, 1.33, 0.0, 0.0, 0.0, 1.15, 0.76, 0.0]
	for (const [i, n] of data.entries()) {
		let diff = parseFloat(Math.abs(n - data[i-1]));
		let gain = (n > data[i-1]) ? diff: 0.0;
		let loss = (n < data[i-1]) ? diff: 0.0;
		// let gain = (tgain[i] > 0.0) ? tgain[i] : 0.0;
		// let loss = (tloss[i] > 0.0) ? tloss[i] : 0.0;
		if (i < periods) {
			periodSumGain += gain;
			periodSumLoss += loss;
			RSIarr.push(50);
		} else if (i == periods) {
			previousAvgGain = periodSumGain / periods;
			previousAvgLoss = periodSumLoss / periods;
			let rsi = 100.0;
			if (previousAvgLoss > 0.0) {
				let rs = parseFloat(previousAvgGain / previousAvgLoss)
				rsi = parseFloat(100 - (100 / (1 + rs)).toFixed(4));
			}
			RSIarr.push(rsi)
		} else {
			[RSIarr, previousAvgGain, previousAvgLoss] = addToRSI(RSIarr, previousAvgGain, previousAvgLoss, gain, loss, periods)
		}
		// if (i == tgain.length) {
		// 	break;
		// }
	}
	return RSIarr;
}


function addToRSI(RSIarr, previousAvgGain, previousAvgLoss, gain, loss, periods) {
	let avgGain = ( (previousAvgGain * (periods-1)) + gain ) / periods;
	let avgLoss = ( (previousAvgLoss * (periods-1)) + loss ) / periods;
	let rsi = 100.0;
	if (avgLoss > 0.0) {
		let rs = parseFloat(previousAvgGain / previousAvgLoss)
		rsi = parseFloat(100 - (100 / (1 + rs)).toFixed(4));
	}
	RSIarr.push(rsi);
	previousAvgGain = avgGain;
	previousAvgLoss = avgLoss;
	return [RSIarr, previousAvgGain, previousAvgLoss];
}


function getExponentialSmoothing(data = [], ntimes = 1) {
	if (data.length == 0 || ntimes <= 0) return data;
	let forcastArr = [0];
	for (const [i, n] of data.entries()) {
		if (i == 0) { continue; }
		val = (i==1) ? data[i-1] : EXPSMTH_ALPHA*data[i-1] + (1 - EXPSMTH_ALPHA)*forcastArr[i-1];
		forcastArr.push(val);
	}
	return getExponentialSmoothing(forcastArr, --ntimes);
}


let RSIChartOptions = {
	responsive: true,
	stacked: true,
	animation: {
		duration: 0
	},
	scales: {
		x: {
			grid: {
				color: "#181a19",
			},
			ticks: {
				color: '#C0C0C0',
			},		
		},
		y: {
			type: 'linear',
			position: 'right',
			grid: {
				color: "#2b2e2d",
			},
			ticks: {
				color: '#C0C0C0',
			},
		},
		y_volume: {
			beginAtZero: true,
			min: 0,
			position: 'right',
			ticks: {
				padding: -200,
				//labelOffset: -100,
			},
		}
	},
	plugins: {
		tooltip: {
			enabled: false,
		},
		legend: {
			display: true,
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
	},
	elements:{
		point:{
			borderWidth: 1,
			radius: 1,
		},
		line: {
			tension: 0
		}
	},
};


const getRSIChartData = (RSIdata) => {
	try {
		if (!exists(RSIdata) || RSIdata.length === 0) {
			return [];
		}
		let expSmthData = getExponentialSmoothing(RSIdata, EXPSMTH_TIMES);
		let rsiChartData = {
			labels: dataObj.times.slice(IDX),
			datasets: [
				{
					label: 'Volume: ' + dataObj.volumes[dataObj.volumes.length - 1],
					type: 'bar',
					data: dataObj.volumes,
					borderWidth: 5,
					borderColor: '#00ffff',
					backgroundColor: '#00ffff',
					yAxisID: 'y_volume',
				},
				{
					label: 'RSI: ' + RSIdata[RSIdata.length - 1].toFixed(1),
					data: RSIdata,
					borderWidth: 1,
					borderColor: '#706247',
					backgroundColor: '#706247',
				},
				//{label: 'overbought', data: overbought, borderWidth: 1, borderColor: 'green'},
				//{label: 'oversold', data: oversold, borderWidth: 1, borderColor: 'red'},
				{
					label: EXPSMTH_TIMES + 'x.Exp.Smoothing: ' + expSmthData[expSmthData.length -1].toFixed(1) + '          ',
					data: expSmthData,
					borderWidth: 1,
					borderColor: '#FFC300',
					backgroundColor: '#FFC300',
				},
			]
		}
		return rsiChartData;
	} catch (e) {
		console.log(e);
		return [];
	}
}

let RSIarr = calculateRSI(RSI_PERIODS, dataObj.lasts)
rsiChart = new Chart($('#RSIchart'), getChartConfig('line', getRSIChartData(RSIarr), RSIChartOptions, CHART_PLUGINS));