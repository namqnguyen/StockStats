const createIframeRefresher = (id, func, seconds) => {
	if (document.getElementById(id) !== null) {
		document.body.removeChild(document.getElementById(id));
	}
	const iframe = document.createElement('iframe');
	const html = '<html><head><meta id="' + id + '" http-equiv="refresh" content="' + seconds + '"><script>parent.' + func + '();</script></head></html>';
	iframe.srcdoc = html;
	iframe.sandbox = 'allow-same-origin allow-scripts';
	iframe.id = id;
	iframe.style.display = 'none';
	document.body.appendChild(iframe);
};


const getPluginsByIDs = (ids) => {
	let a = [];
	CHART_PLUGINS.forEach(p => {
		if (ids.includes(p.id)) {
			a.push(p);
		}
	});
	return a;
}


const getOrCreateLegendList = (chart, id) => {
	try {
		const legendContainer = document.getElementById(id);
		let listContainer = legendContainer.querySelector('ul');
	
		if (!listContainer) {
			listContainer = document.createElement('ul');
			listContainer.style.display = 'flex';
			listContainer.style.flexDirection = 'row';
			listContainer.style.margin = 0;
			listContainer.style.padding = 0;
			legendContainer.appendChild(listContainer);
		}
		return listContainer;
	} catch (e) {
		console.log(e);
		return null;
	}
};


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
		id: 'customChartLegend',
		afterUpdate: (chart, args, options) => {
			const ul = getOrCreateLegendList(chart, options.containerID);
		
			// Remove old legend items
			while (ul.firstChild) {
				ul.firstChild.remove();
			}
		
			// Reuse the built-in legendItems generator
			const items = chart.options.plugins.legend.labels.generateLabels(chart);

			items.forEach(item => {
				const li = document.createElement('li');
				// li.style.alignItems = 'center';
				// li.style.cursor = 'pointer';
				// li.style.display = 'flex';
				// li.style.flexDirection = 'row';
				// li.style.marginLeft = '10px';
		
				li.onclick = () => {
					const {type} = chart.config;
					if (type === 'pie' || type === 'doughnut') {
						// Pie and doughnut charts only have a single dataset and visibility is per item
						chart.toggleDataVisibility(item.index);
					} else {
						chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
						chart.config.data.datasets[item.datasetIndex].hidden = !chart.isDatasetVisible(item.datasetIndex);
					}
					chart.update();
				};
		
				// Color box
				const boxSpan = document.createElement('span');
				boxSpan.style.background = item.fillStyle;
				boxSpan.style.borderColor = item.strokeStyle;
				boxSpan.style.borderWidth = item.lineWidth + 'px';
				// boxSpan.style.display = 'inline-block';
				// boxSpan.style.height = '20px';
				// boxSpan.style.marginRight = '10px';
				// boxSpan.style.width = '20px';
		
				// Text
				const textContainer = document.createElement('p');
				textContainer.style.color = item.fontColor;
				// textContainer.style.margin = 0;
				// textContainer.style.padding = 0;
				textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

				let tmp = item.text;
				if (options.showLatestDataPoints && chart.data.datasets[item.datasetIndex].data.length > 0) {
					let v = chart.data.datasets[item.datasetIndex].data.at(-1);
					(typeof options.toFixed == 'number') ? v = v.toFixed(options.toFixed) : null;
					tmp = tmp + ': ' + v;
				}
				const text = document.createTextNode(tmp);
				textContainer.appendChild(text);
		
				li.appendChild(boxSpan);
				li.appendChild(textContainer);
				ul.appendChild(li);
			});
		},
	},
	{
		id: 'doAfterRender',
		afterRender: (chart, args, options) => {
			
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


