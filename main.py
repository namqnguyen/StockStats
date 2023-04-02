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
from db import DATABASE, mongo_db

load_dotenv()

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
ld = logging.debug

app = FastAPI()

app.mount("/rootpath", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")


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


def objectIdWithTimestamp(timestamp) -> ObjectId | None:
	if timestamp:
		# dt = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
		return ObjectId.from_datetime(timestamp)


async def get_ticker_data(tickers: list, begin: datetime, end: datetime) -> list:
	if begin is None or end is None:
		return []
	conditions = {'datetime': {'$gte': begin, '$lte': end}}
	data = {}
	for ticker in tickers:
		docs = await mongo_db[ticker].find(conditions).to_list(length=5000)
		data[ticker] = {}
		data[ticker]['labels'] = []
		data[ticker]['bids'] = []
		data[ticker]['asks'] = []
		data[ticker]['lasts'] = []
		for doc in docs:
			item = doc['content']['items'][0]
			if item['bid'] == '':
				continue
			time = (doc['datetime'].astimezone(pytz.timezone('America/New_York'))).strftime('%H:%M:%S') # item['time'].split(' ')[0]
			data[ticker]['labels'].append(str(time))
			data[ticker]['bids'].append(float(item['bid']))
			data[ticker]['asks'].append(float(item['ask']))
			data[ticker]['lasts'].append(float(item['last']))
	return data



@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	#tickers = await mongo_db.list_collection_names()
	#data = await get_ticker_data(tickers)
	#return templates.TemplateResponse("tickers.html", {"request": request, "data": data})
	return ''


@app.get("/{ticker}")
async def ticker_data(request: Request, ticker: str = None, bm: int|str = None, from_time: int|str = None, to_time: int|str = None):
	utcdt = datetime.now(tz=pytz.utc).replace(tzinfo=None) - timedelta(2)
	nydt = datetime.now(tz=pytz.timezone('America/New_York')).replace(tzinfo=None) - timedelta(2)
	diff = (utcdt - nydt).seconds
	offset_hrs = math.ceil(diff / 3600)
	begin = datetime.combine(utcdt, Time.min)
	end = begin + timedelta(1)

	if type(to_time) is int and to_time > 0:
		end =  begin + timedelta(hours = to_time + offset_hrs)
	elif type(to_time) is str and to_time != '':
		hr = int(to_time.split(':')[0])
		min = int(to_time.split(':')[1])
		sec = int(to_time.split(':')[2]) if len(from_time.split(':')) > 2 else 0
		end =  begin + timedelta(hours = hr + offset_hrs, minutes=min, seconds=sec)
	if type(from_time) is int and from_time > 0:
		begin = begin + timedelta(hours = from_time + offset_hrs)
	elif type(from_time) is str and from_time != '':
		hr = int(from_time.split(':')[0])
		min = int(from_time.split(':')[1])
		sec = int(from_time.split(':')[2]) if len(from_time.split(':')) > 2 else 0
		begin = begin + timedelta(hours = hr + offset_hrs, minutes=min, seconds=sec)

	if bm is not None and bm >= 0:
		if bm == 0:
			end = begin + timedelta(hours = 9 + 7 + offset_hrs)
			begin = begin + timedelta(hours = 9 + offset_hrs, minutes=30)
		else:
			begin = utcdt - timedelta(minutes=bm)
	data = await get_ticker_data([ticker], begin, end)
	if request.headers.get('Content-Type') == 'application/json':
		return ORJSONResponse(data, status_code=200)
	else:
		html = templates.get_template('tickers.html').render({"request": request, "data": data, "ticker": ticker})
		return HTMLResponse(content=html, status_code=200)


@app.post("/{ticker}", response_class=JSONResponse)
async def insert_ticker_data(request: Request, ticker: str, data = Body()) -> ObjectId | None:
	dt = data['timestamp']
	if 'EST' in dt:
		dt = dt.replace('EST', TIMES['EST'])
	elif 'ET' in dt:
		dt = dt.replace('ET', TIMES['ET'])

	data['datetime'] = datetime.strptime(dt, '%I:%M:%S %p %z %m/%d/%y')

	res = await mongo_db[ticker].insert_one(data)
	return {"id": str(res.inserted_id)}



if __name__ == "__main__":
	uvicorn.run(
		"main:app",
		host='0.0.0.0',
		reload=True,
		port=1234,
	)

