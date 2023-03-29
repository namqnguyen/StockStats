"""Main app"""

import logging
import json
from datetime import datetime, time as Time, timedelta
from bson.objectid import ObjectId
from bson.json_util import dumps, loads

import uvicorn
from fastapi import FastAPI, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
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


MINUTES_DIFF = 60
DATE_TIME = datetime.now() - timedelta(minutes=MINUTES_DIFF)
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


async def get_ticker_data(tickers: list, times: list = list(), bm: int = None) -> list:
	if len(times) == 0:
		begin = datetime.combine(datetime.utcnow(), Time.min)
		times = [begin, begin + timedelta(1)]
	if bm is not None:
		times[0] = datetime.utcnow() - timedelta(minutes=bm)
	conditions = {'datetime': {'$gte': times[0], '$lt': times[1]}}
	ticker_docs = {}
	for ticker in tickers:
		# docs = await mongo_db[ticker].find({'_id': {'$gte': ObjectId('642151aaa5f6119f4fd7a9f6')}}).to_list(length=1000)
		docs = await mongo_db[ticker].find(conditions).to_list(length=1000)
		ticker_docs[ticker] = {}
		ticker_docs[ticker]['labels'] = []
		ticker_docs[ticker]['bids'] = []
		ticker_docs[ticker]['asks'] = []
		ticker_docs[ticker]['lasts'] = []
		for doc in docs:
			item = doc['content']['items'][0]
			time = item['time'].split(' ')[0]
			ticker_docs[ticker]['labels'].append(str(time))
			ticker_docs[ticker]['bids'].append(float(item['bid']))
			ticker_docs[ticker]['asks'].append(float(item['ask']))
			ticker_docs[ticker]['lasts'].append(float(item['last']))
	return ticker_docs


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	tickers = await mongo_db.list_collection_names()
	ticker_docs = await get_ticker_data(tickers)
	return templates.TemplateResponse("tickers.html", {"request": request, "data": ticker_docs})
	# return str(ticker_docs)


@app.get("/{ticker}", response_class=HTMLResponse)
async def ticker_data(request: Request, ticker: str, date: str = None, bm: int = None):
	times = []
	if date is not None:
		begin = datetime.combine(datetime.strptime(date, '%Y%m%d'), Time.min)
		end = begin + timedelta(1)
		times = [begin, end]
	ticker_docs = await get_ticker_data([ticker], times, bm)
	return templates.TemplateResponse("tickers.html", {"request": request, "data": ticker_docs})
	# return str(ticker_docs)


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

