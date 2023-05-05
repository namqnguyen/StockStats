"""Main app"""
import logging
from datetime import datetime, timedelta
from bson.objectid import ObjectId
from bson.json_util import dumps, loads

import uvicorn
from fastapi import FastAPI, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from sse_starlette.sse import EventSourceResponse
from db import DATABASE, mongo_db, mongo_client
from stock import get_ticker_data2, get_datetime, TIMES, TICKERS, stream_ticker

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	return ''


@app.get("/q/{ticker}")
async def get_quote_ticker(
		request: Request,
		ticker: str = None,
		bm: int|str = None,
		date: str = None,
		from_time: int|str = None,
		to_time: int|str = None,
		prev_volume: float = 0,
		is_stream: bool = False,
	):
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

	if is_stream:
		return data
	
	if request.headers.get('Content-Type') == 'application/json':
		return ORJSONResponse(data, status_code=200)
	
	html = templates.get_template('tickers.html').render({"request": request, "data": data, "ticker": ticker, "date": date, "from_time": from_time, "to_time": to_time})
	return HTMLResponse(content=html, status_code=200)


@app.post("/qs", response_class=JSONResponse)
async def post_qs(request: Request, data = Body()) -> ObjectId | None:
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


@app.post("/q/{ticker}", response_class=JSONResponse)
async def post_q_ticker(request: Request, ticker: str, data = Body()) -> ObjectId | None:
	dt = data['timestamp']
	if 'EST' in dt:
		dt = dt.replace('EST', TIMES['EST'])
	elif 'ET' in dt:
		dt = dt.replace('ET', TIMES['ET'])

	data['datetime'] = datetime.strptime(dt, '%I:%M:%S %p %z %m/%d/%y')

	res = await mongo_db[ticker].insert_one(data)
	return {"id": str(res.inserted_id), 'dt': data['datetime'].strftime('%H:%M:%S')}


@app.get("/s/{ticker}")
async def get_stream_ticker(request: Request, ticker: str, from_time: str = '', prev_volume: float = 0):
	data = await get_quote_ticker(request, ticker, None, None, from_time, None, prev_volume, True)
	return EventSourceResponse( stream_ticker(request, data, 10) )


if __name__ == "__main__":
	uvicorn.run(
		"main:app",
		host='0.0.0.0',
		reload=True,
		port=5000,
	)

