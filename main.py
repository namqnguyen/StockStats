"""Main app"""

import logging
import json
from datetime import datetime, timedelta
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


def objectIdWithTimestamp(timestamp) -> ObjectId | None:
	if timestamp:
		# dt = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
		return ObjectId.from_datetime(timestamp)



@app.post("/{ticker}", response_class=JSONResponse)
async def insert_ticker_data(request: Request, ticker: str, data = Body()) -> ObjectId | None:
	res = await mongo_db[ticker].insert_one(data)
	return {"id": str(res.inserted_id)}




@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	ticker_docs = {}
	for coll in await mongo_db.list_collection_names():
		docs = await mongo_db[coll].find({'_id': {'$gte': objectIdWithTimestamp(DATE_TIME)}}).to_list(length=1000)
		ticker_docs[coll] = dict()
		ticker_docs[coll]['labels'] = list()
		ticker_docs[coll]['bids'] = list()
		ticker_docs[coll]['asks'] = list()
		ticker_docs[coll]['lasts'] = list()
		for doc in docs:
			item = doc['content']['items'][0]
			time = item['time'].split(' ')[0]
			ticker_docs[coll]['labels'].append(str(time))
			ticker_docs[coll]['bids'].append(float(item['bid']))
			ticker_docs[coll]['asks'].append(float(item['ask']))
			ticker_docs[coll]['lasts'].append(float(item['last']))

	return templates.TemplateResponse("tickers.html", {"request": request, "data": ticker_docs})
	# return str(ticker_docs)


if __name__ == "__main__":
	uvicorn.run(
		"main:app",
		host='0.0.0.0',
		reload=True,
		port=1234,
	)

