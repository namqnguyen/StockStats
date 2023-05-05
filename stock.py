import logging
import asyncio
from datetime import datetime, time as Time, timedelta
import math
import pytz
from json import dumps
from db import DATABASE, mongo_db, mongo_client


ld = logging.debug

TIMES = {
	'ET': '-0400',
	'EST': '-0500',
	'MARKET_OPEN_TIME': '09:30:00',
	'MARKET_CLOSE_TIME': '16:00:00'
}

TICKERS = ['BAC', 'WFC', 'WAL', 'PACW', 'SCHW', 'ZION', 'KEY', 'JPM']
TICKERS.sort()

async def get_ticker_data(tickers: list, begin: datetime, end: datetime, prev_volume: float = 0) -> list:
	if begin is None or end is None:
		return []
	conditions = {'datetime': {'$gte': begin, '$lte': end}}
	data = {}
	for ticker in tickers:
		docs = await mongo_db[ticker].find(conditions, {'datetime': 1, 'content.items': {'time': 1, 'bid': 1, 'ask': 1, 'last': 1, 'low': 1, 'high': 1, 'volume': 1}}).sort('datetime', 1).to_list(length=50000)
		data[ticker] = {'times': [], 'bids': [], 'asks': [], 'lasts': [], 'volumes': [], 'low': 0, 'high': 0}
		for doc in docs:
			items = doc['content']['items']
			if len(items) == 0:
				continue
			item = items[0]
			if item['bid'] == '':
				continue
			et = item['time'].split(' ')[2]
			time = doc['datetime'] + timedelta(hours=int(int(TIMES[et])/100))
			volume = float(item['volume'])
			if (volume > prev_volume):
				data[ticker]['times'].append(time.strftime('%H:%M:%S'))
				data[ticker]['bids'].append(float(item['bid']))
				data[ticker]['asks'].append(float(item['ask']))
				data[ticker]['lasts'].append(float(item['last']))
				data[ticker]['volumes'].append(volume)
				prev_volume = volume
				try:
					data[ticker]['low'] = float(item['low'])
					data[ticker]['high'] = float(item['high'])
				except:
					pass
	return data


async def get_ticker_data2(tickers: list, begin: datetime, end: datetime, prev_volume: float = 0) -> list:
	if begin is None or end is None:
		return []
	conditions = {'datetime': {'$gte': begin, '$lte': end}}
	data = {}
	for ticker in tickers:
		docs = await mongo_client['stockstats2'][ticker].find(conditions, {'datetime': 1, 'content': {'time': 1, 'bid': 1, 'ask': 1, 'last': 1, 'low': 1, 'high': 1, 'volume': 1}}).sort('datetime', 1).to_list(length=50000)
		data[ticker] = {'times': [], 'bids': [], 'asks': [], 'lasts': [], 'volumes': [], 'low': 0, 'high': 0}
		for doc in docs:
			item = doc['content']
			if item['bid'] == '':
				continue
			et = item['time'].split(' ')[2]
			time = doc['datetime'] + timedelta(hours=int(int(TIMES[et])/100))
			volume = float(item['volume'])
			if (volume > prev_volume):
				data[ticker]['times'].append(time.strftime('%H:%M:%S'))
				data[ticker]['bids'].append(float(item['bid']))
				data[ticker]['asks'].append(float(item['ask']))
				data[ticker]['lasts'].append(float(item['last']))
				data[ticker]['volumes'].append(volume)
				prev_volume = volume
				try:
					data[ticker]['low'] = float(item['low'])
					data[ticker]['high'] = float(item['high'])
				except:
					pass
	return data


def get_datetime(date: str = None, from_time = None, to_time = None, bm = None) -> dict:
	utcdt = datetime.now(tz=pytz.utc).replace(tzinfo=None) #- timedelta(1)
	nydt = datetime.now(tz=pytz.timezone('America/New_York')).replace(tzinfo=None) #- timedelta(1)
	diff = (utcdt - nydt).seconds
	offset_hrs = math.ceil(diff / 3600)
	if date is not None:
		begin = datetime.strptime(date, '%Y-%m-%d')
	else:
		begin = datetime.combine(utcdt, Time.min)
	end = begin + timedelta(1)

	dt = {"begin": begin, "end": end, "offset_hrs": offset_hrs, "utcdt": utcdt, "nydt": nydt}

	if type(to_time) is int and to_time > 0:
		dt['end'] =  dt['begin'] + timedelta(hours = to_time + dt['offset_hrs'])
	elif type(to_time) is str and to_time != '':
		hr = int(to_time.split(':')[0])
		min = int(to_time.split(':')[1])
		sec = int(to_time.split(':')[2]) if len(from_time.split(':')) > 2 else 0
		dt['end'] =  dt['begin'] + timedelta(hours = hr + dt['offset_hrs'], minutes=min, seconds=sec)

	if type(from_time) is int and from_time > 0:
		dt['begin'] = dt['begin'] + timedelta(hours = from_time + dt['offset_hrs'])
	elif type(from_time) is str and from_time != '':
		hr = int(from_time.split(':')[0])
		min = int(from_time.split(':')[1])
		sec = int(from_time.split(':')[2]) if len(from_time.split(':')) > 2 else 0
		dt['begin'] = dt['begin'] + timedelta(hours = hr + dt['offset_hrs'], minutes=min, seconds=sec)

	# go back x minutes
	if bm is not None and bm >= 0:
		if bm == 0:
			# 9am; 7 is number of hrs we want; market is opened for 6.5 hrs
			dt['end'] = dt['begin'] + timedelta(hours = 9 + 7 + dt['offset_hrs'])
			dt['begin'] = dt['begin'] + timedelta(hours = 9 + dt['offset_hrs'], minutes=30)
		else:
			dt['begin'] = dt['utcdt'] - timedelta(minutes=bm)

	return dt

def calculate_relative_datetime(dt: dict = None, from_time = None, to_time = None, bm = None) -> dict:
	if dt is None:
		return None



async def stream_ticker(request = None, ticker: str = '', from_time: str = '', prev_volume: float = 0, sleep: int = 1):
	while True:
		if request != None and await request.is_disconnected():
			break
		
		dt = get_datetime(None, from_time, None, None)
		data = await get_ticker_data2([ticker], dt['begin'], dt['end'], prev_volume)
		if len(data[ticker]['times']) > 0:
			yield {
				"event": "update",
				"retry": 5000,  # ms
				"data": dumps(data)
			}
			prev_volume = data[ticker]['volumes'][-1]
		await asyncio.sleep( sleep )