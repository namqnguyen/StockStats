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
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from sse_starlette.sse import EventSourceResponse
from db import DATABASE, mongo_db, mongo_client
from stock import get_ticker_data2, get_ticker_data3, get_datetime, TIMES, TICKERS, stream_ticker, stream_tickers

load_dotenv()

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.CRITICAL)
ld = logging.critical

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
app.add_middleware(GZipMiddleware)



@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	return ''


@app.get("/q/tickers/{ticker}")
async def get_quote_tickers(
		request: Request,
		ticker: str = None,
		date: str = None,
		from_time: int|str = None,
		to_time: int|str = None,
	):

	dt = get_datetime(date, from_time, to_time)
	# dt['begin'] = dt['begin'] - timedelta(3)  # for testing
	data = await get_ticker_data3(TICKERS, dt['begin'], dt['end'])
	# print(len(data['BAC']))
	
	if request.headers.get('Content-Type') == 'application/json':
		return ORJSONResponse(data, status_code=200)
	
	html = templates.get_template('tickers2.html').render({"request": request, "ticker": ticker,  "data": data, "date": date, "from_time": from_time, "to_time": to_time})
	return HTMLResponse(content=html, status_code=200)


@app.get("/q/{ticker}")
async def get_quote_ticker(
		request: Request,
		ticker: str = None,
		bm: int|str = None,
		date: str = None,
		from_time: int|str = None,
		to_time: int|str = None,
		prev_volume: float = 0
	):
	dt = get_datetime(date, from_time, to_time, bm)
	data = await get_ticker_data2([ticker], dt['begin'], dt['end'], prev_volume)
	# when we want data for all tickers, we need to fix volume for current ticker
	for k in TICKERS:
		if k not in data:
			data[k] = {}
	
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


@app.get("/s/tickers")
async def get_stream_ticker(request: Request, from_time: str = '',):
	return EventSourceResponse( stream_tickers(request, from_time) )


@app.get("/s/{ticker}")
async def get_stream_ticker(request: Request, ticker: str, from_time: str = '', prev_volume: float = 0, sleep: int = 1):
	return EventSourceResponse( stream_ticker(request, ticker, from_time, prev_volume, sleep) )


if __name__ == "__main__":
	uvicorn.run(
		"main:app",
		host='0.0.0.0',
		reload=True,
		port=5000,
	)

