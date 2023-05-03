"""Main app"""

import math
import logging
from datetime import datetime, time as Time, timedelta
from bson.objectid import ObjectId
from bson.json_util import dumps, loads
import pytz

import uvicorn
from fastapi import FastAPI, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from db import DATABASE, mongo_db, mongo_client

load_dotenv()

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
ld = logging.debug

app = FastAPI()

app.mount("/assets", StaticFiles(directory="assets"), name="assets")
templates = Jinja2Templates(directory="templates")


origins = [
    "http://0.0.0.0:5000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://invest.ameritrade.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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



@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	return ''


def get_datetime(date: str = None) -> dict:
	utcdt = datetime.now(tz=pytz.utc).replace(tzinfo=None) #- timedelta(1)
	nydt = datetime.now(tz=pytz.timezone('America/New_York')).replace(tzinfo=None) #- timedelta(1)
	diff = (utcdt - nydt).seconds
	offset_hrs = math.ceil(diff / 3600)
	if date is not None:
		begin = datetime.strptime(date, '%Y-%m-%d')
	else:
		begin = datetime.combine(utcdt, Time.min)
	end = begin + timedelta(1)
	return {"begin": begin, "end": end, "offset_hrs": offset_hrs, "utcdt": utcdt, "nydt": nydt}


@app.get("/{ticker}")
async def ticker_data(request: Request,
		      ticker: str = None,
			  bm: int|str = None,
			  date: str = None,
			  from_time: int|str = None,
			  to_time: int|str = None,
			  prev_volume: float = 0,
			  prev: int = 0):
	dt = get_datetime(date)
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

	data = await get_ticker_data2([ticker], dt['begin'], dt['end'], prev_volume)
	# when we want data for all tickers, we need to fix volume for current ticker
	for k in TICKERS:
		if k not in data:
			data[k] = {}

	if request.headers.get('Content-Type') == 'application/json':
		return ORJSONResponse(data, status_code=200)
	else:
		html = templates.get_template('tickers.html').render({"request": request, "data": data, "ticker": ticker, "date": date, "from_time": from_time, "to_time": to_time})
		return HTMLResponse(content=html, status_code=200)


@app.post("/quotes", response_class=JSONResponse)
async def insert_ticker_data(request: Request, data = Body()) -> ObjectId | None:
	dt = data['timestamp']
	if 'EST' in dt:
		dt = dt.replace('EST', TIMES['EST'])
	elif 'ET' in dt:
		dt = dt.replace('ET', TIMES['ET'])

	data['datetime'] = datetime.strptime(dt, '%I:%M:%S %p %z %m/%d/%y')
	tickers = {}
	for item in data['content']['items']:
		ticker = item['symbol']
		tmp = data.copy()
		tmp['content'] = item
		res = await mongo_client['stockstats2'][ticker].insert_one(tmp)
		if res.inserted_id:
			tickers[ticker] = {"id": str(res.inserted_id), 'dt': tmp['datetime'].strftime('%H:%M:%S')}

	return tickers


@app.post("/{ticker}", response_class=JSONResponse)
async def insert_ticker_data(request: Request, ticker: str, data = Body()) -> ObjectId | None:
	dt = data['timestamp']
	if 'EST' in dt:
		dt = dt.replace('EST', TIMES['EST'])
	elif 'ET' in dt:
		dt = dt.replace('ET', TIMES['ET'])

	data['datetime'] = datetime.strptime(dt, '%I:%M:%S %p %z %m/%d/%y')

	res = await mongo_db[ticker].insert_one(data)
	return {"id": str(res.inserted_id), 'dt': data['datetime'].strftime('%H:%M:%S')}



if __name__ == "__main__":
	uvicorn.run(
		"main:app",
		host='0.0.0.0',
		reload=True,
		port=5000,
	)

