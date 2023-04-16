const CHART_PLUGINS = [
	{
		id: 'customCanvasBackgroundColor',
		beforeDraw: (chart, args, options) => {
			return;
			const {ctx} = chart;
			ctx.save();
			ctx.globalCompositeOperation = 'destination-over';
			ctx.fillStyle = options.color || '#99ffff';
			ctx.fillRect(30, 30, chart.width-50, chart.height-700);
			ctx.restore();
		},
	},
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
	// {
	// 	id: 'overlayText',
	// 	afterDraw: (chart, args, options) => {
	// 		console.log('afterdarw');
	// 		const { ctx, chartArea: {top, right, bottom, left, width, height}, scales: {x, y} } = chart;
	// 		let maxValue = Math.max(...chart.data.datasets[0].data);
	// 		let minValue = Math.min(...chart.data.datasets[0].data);
	// 		ctx.save();
	// 		ctx.textAlign = 'center';
	// 		ctx.font = '12px Arial';
	// 		ctx.fillStyle = 'white';
	// 		ctx.textAlign = 'left';
	// 		ctx.fillText('Dagens temperatur = ' + maxValue + ' : ', 5, 5);
	// 		ctx.fillText('Dagens laveste temperatur = ' + minValue + ' : ', 50, 50);
	// 		ctx.restore();
	// 	},
	// },
];