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
				let rs = parseFloat(previousAvgGain / previousAvgLoss);
				rsi = parseFloat(100 - (100 / (1 + rs)));
			}
			RSIarr.push(rsi);
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


function calculateVolumeChange(volArr) {
	if (!exists(volArr) || volArr.length == 0) return [];
	let prev_vol = 0;
	let arr = [0];
	for (const [i, n] of volArr.entries()) {
		if (i == 0) continue;
		let change = n - volArr[i-1];
		arr.push(change);
	}
	return arr;
}

function getVolumeColor() {
	let colorArr = [];
	for (let i = IDX; i < dataObj.lasts.length; i++) {
		if (dataObj.lasts[i] > dataObj.lasts[i-1]) {
			colorArr.push('green');
		} else if (dataObj.lasts[i] < dataObj.lasts[i-1]) {
			colorArr.push('red');
		} else {
			colorArr.push('grey');
		}
	}
	return colorArr;
}

function getExponentialSmoothing(data = [], ntimes = 1) {
	if (data.length == 0 || ntimes <= 0) return data;
	let forcastArr = [0];
	//console.log(data);
	for (const [i, n] of data.entries()) {
		if (i == 0) { continue; }
		val = (i==1) ? data[i-1] : EXPSMTH_ALPHA*data[i-1] + (1 - EXPSMTH_ALPHA)*forcastArr[i-1];
		if (isNaN(val)) continue; 
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
			min: 0,
			max: 100,
			grid: {
				color: "#2b2e2d",
			},
			ticks: {
				color: '#C0C0C0',
				callback: (value, index, values) => {
					return value; // + '.0';
				}
			},
		},
		y_volume: {
			display: false,
			beginAtZero: true,
			min: 0,
			max: 10000,
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
		customChartLegend: {
			containerID: 'RSIchartLegend',
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
			// onHover: (evt, item, legend) => {
			// 	console.log('onhover');
			// 	//document.getElementById("WAL").style.cursor = 'pointer';
			// },
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


const getRSIChartData = (RSIdata, old = null) => {
	try {
		if (!exists(RSIdata) || RSIdata.length === 0) {
			return {};
		}
		let expSmthData = getExponentialSmoothing(RSIdata, EXPSMTH_TIMES);
		let volData = calculateVolumeChange(dataObj.volumes.slice(IDX));
		let volColor = getVolumeColor();
		let rsiChartData = {
			labels: dataObj.times.slice(IDX),
			datasets: [
				{
					label: 'RSI: ' + RSIdata[RSIdata.length - 1].toFixed(1),
					data: RSIdata,
					borderWidth: 1,
					borderColor: '#706247',
					backgroundColor: '#706247',
					hidden: (old != null) ? old.datasets[0].hidden : false,
				},
				//{label: 'overbought', data: overbought, borderWidth: 1, borderColor: 'green'},
				//{label: 'oversold', data: oversold, borderWidth: 1, borderColor: 'red'},
				{
					label: EXPSMTH_TIMES + 'x.Exp.Smoothing: ' + expSmthData[expSmthData.length -1].toFixed(1), // + '          ',
					data: expSmthData,
					borderWidth: 1,
					borderColor: '#FFC300',
					backgroundColor: '#FFC300',
					hidden: (old != null) ? old.datasets[1].hidden : false,
				},
				{
					label: 'Volume: ' + volData[volData.length - 1] + '          ',
					type: 'bar',
					data: volData,
					borderWidth: 5,
					borderColor: volColor, //'#00ffff',
					backgroundColor: volColor, //'#00ffff',
					fillColor: volColor,
					yAxisID: 'y_volume',
					hidden: (old != null) ? old.datasets[2].hidden : false,
				},
			]
		}
		return rsiChartData;
	} catch (e) {
		console.log(e);
		return [];
	}
}


let RSIplugins = [
	{
		id: 'overSoldOverBoughtLines',
		beforeDatasetsDraw: ( chart, args, options ) => {
			const { ctx, chartArea: {top, right, bottom, left, width, height}, scales: {x, y} } = chart;
			ctx.save();
			// draw line
			ctx.strokeStyle = 'green';
			//ctx.setLineDash([50, 50]);
			ctx.strokeRect(left, y.getPixelForValue(30), width, 1);
			
			ctx.strokeStyle = 'red';
			ctx.strokeRect(left, y.getPixelForValue(70), width, 1);

			ctx.restore();
		},
	},
];
RSIplugins.push(...getPluginsByIDs(['customChartLegend']));


let RSIarr = calculateRSI(RSI_PERIODS, dataObj.lasts);
rsiChart = new Chart($('#RSIchart'), getChartConfig('line', getRSIChartData(RSIarr), RSIChartOptions, RSIplugins));