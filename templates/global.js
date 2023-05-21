var GL = {
	tickers: {
		{% for key in data.keys() %}
		{{key}}: {
			data: {{data[key]|safe}},
			idx: 0,
		},
		{% endfor %}
	},
	cur_ticker: '{{ticker}}',
	IDX: 0,
	volume_y_axis_ticks: [100000, 90000, 80000, 70000, 60000, 50000, 40000, 30000, 20000, 10000],
	mins_back_times: [-1, 0, 180, 120, 90, 60, 45, 30, 20, 15, 10, 5, 2, 1],
	cur_mins_back: 15,
	mins_back_rolling: false,
	data_interval: 1,
	RSI_PERIODS: 14,
	EXPSMTH_TIMES: 2,
	P: false,
};
// fill current ticker's data with empty
if ( Object.keys(GL.tickers).length == 0 ) {
	GL.tickers[GL.cur_ticker] = {'data': getDataStub()}
}
// get current ticker's data
GL.cur_data = ()=>{
	if ( GL.cur_ticker in GL.tickers && 'data' in GL.tickers[GL.cur_ticker] ) {
		return GL.tickers[GL.cur_ticker].data;
	}
	return {};
}
// update low, high, volume numbers
GL.updateTickerStats = () => {
	let data = GL.cur_data();
	$('#ticker-low').text( data.low );
	$('#ticker-high').text( data.high );
	$('#total-volume').text( (parseFloat(data['volumes'].slice(-1)[0])/1000000).toFixed(2) + 'M');
}
window.GL = GL;



GL.updateTickerStats();
GL.mins_back_times.forEach( n => {
	let cls = (n === GL.cur_mins_back) ? 'unclickable' : 'clickable';
	let text = n + 'm';
	if (n === 0) {
		text = 'Open';
	} else if (n === -1) {
		text = 'Today';
	}
	let a = $(`<a href="#" class="${cls}">` + text + '</a>');
	a.click( e => {
		e.preventDefault();
		GL.cur_mins_back = n;
		if (e.target.classList.contains('unclickable')) return false;
		e.target.parentElement.querySelectorAll('.unclickable').forEach(
			el=>el.classList.replace('unclickable', 'clickable')
		)
		e.target.classList.replace('clickable', 'unclickable');

		if (n >= 1 && n <= 30) {
			GL.P = false;
		} else {
			GL.P = true;
		}
		setMinsBackIndex();
		updateCharts2();
		return false;
	});
	$('#mins-back-container').append(' | ')
	$('#mins-back-container').append(a);
});

$('#ticker-select').change( e => {
	let val = $("#ticker-select option:selected").attr('value');
	if (val === '') return;
	TM.removeTickerListener(GL.cur_ticker, GL.updateTickerStats);
	GL.cur_ticker = val;
	$('#ticker-symbol').text(val);
	GL.updateTickerStats();
	TM.addTickerListener(GL.cur_ticker, GL.updateTickerStats);
	setMinsBackIndex();
	updateCharts2();
})

$('#skipInterval').blur( (e) => { GL.data_interval = parseInt(e.target.value) } );
$('#skipInterval').keypress( (e) => { if (e.which == 13) { GL.data_interval = parseInt(e.target.value) } } );
$('#resetInterval').click( (e) => { $('#skipInterval').val(1); $('#skipInterval').blur(); } )
$('#ticker-symbol').click( (e) => { stockChart.resetZoom(); } );
$('#stream-switch').click( (e) => {
	GL.P ? $('#stream-switch').html('Stream OFF') : $('#stream-switch').html('Stream ON');
	GL.P = !GL.P;
 });

GL.volume_y_axis_ticks.forEach( vol => {
	let a = $('<option value="'+ vol +'">'+ vol +'</option>');
	$('#volume-controls').append(a);
	// if (vol === 10000) $('#volume-controls').val(vol);
});
$('#volume-controls').change( e => {
	let val = $("#volume-controls option:selected").attr('value')
	if (val === '') return;
	rsiChart.options.scales.y_volume.max = parseInt(val);
});

$('#volume-Y-axis-checkbox').click( e => {
	rsiChart.options.scales.y_volume.display = !rsiChart.options.scales.y_volume.display;
});

$('#mins-back-rolling').change( (el)=> {
	GL.mins_back_rolling = el.target.checked;
});