"""Main app"""

import logging
import json
from datetime import datetime
from bson.objectid import ObjectId
from bson.json_util import dumps, loads

import uvicorn
from fastapi import FastAPI, Request, Body
# from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from db import DATABASE, mongo_db

load_dotenv()

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
ld = logging.debug

app = FastAPI()

# app.mount("/rootpath", StaticFiles(directory="static"), name="static")


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


DATE = '2023-03-22'


def objectIdWithTimestamp(timestamp) -> ObjectId | None:
	if timestamp:
		dt = datetime.strptime(timestamp, '%Y-%m-%d')
		constructedObjectId = ObjectId.from_datetime(dt)
		return constructedObjectId



@app.post("/{ticker}", response_class=JSONResponse)
async def insert_ticker_data(request: Request, ticker: str, data = Body()) -> ObjectId | None:
	res = await mongo_db[ticker].insert_one(data)
	return {"id": str(res.inserted_id)}



@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
	ticker_docs = {}
	for coll in await mongo_db.list_collection_names():
		# str = '{"content":{"identifier":"id","label":"quoteData","urls":{"Equity":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","Fund":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","Option":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","Index":"/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/summary?c_name=invest_VENDOR","displayNewTab":"no","advanceChartLink":"https://research.ameritrade.com/grid/wwws/research/stocks/charts?display=popup&c_name=invest_VENDOR"},"isMarketOpen":"yes","isMarketExtendedSessionOpen":"no","items":[{"id":"1.00","isValidFlag":"yes","isRealtimeFlag":"yes","symbol":"WAL","symbolDisplay":"WAL","cusip":"957638109","description":"WesternAllianceBancorporationCommonStock(DE)","securityTypeDescription":"Equity","securityTypeValue":"E","sector":"Financials","industry":"Banks","ask":"31.01","askId":"K","askSize":"100.00","bid":"30.94","bidId":"Z","bidSize":"300.00","last":"30.975","lastId":"D","lastSize":"200.00","open":"30.21","close":"31.25","high":"32.63","low":"29.27","yearHigh":"88.00","yearLow":"7.46","change":"-0.275","changePercentage":"-0.88","volume":"3639369.00","exchangeId":"n","exchangeName":"NYSE","realtimeEntitled":false,"exchangeDescription":"NYSE","fundStrategy":"","daysUntilExpiration":"0.00","openInterest":"0.00","impliedVolatility":"0.00","timeValueIndex":"0.00","delta":"0.00","gamma":"0.00","theta":"0.00","vega":"0.00","rho":"0.00","probabilityOfExpiringInTheMoney":"0.00","deliverableNotes":"","sharesPerContract":"0.00","isNonStandardOption":"no","isMiniOption":"no","netAssetValue":"0.00","offerPrice":"0.00","underlyingSymbol":"","streamingSymbol":"WAL","time":"11:06:36amET","date":"03/24/2023","DelayedDatadisplay":"none","NTFFlag":false,"noLoadFlag":false,"premierFlag":false,"family":"","categoryName":"","offerPrice":"0.00","ytdReturn":"0.00","marginPercentage":"100%","lowConcentrationPercentage":"100%","midConcentrationPercentage":"100%","highConcentrationPercentage":"100%"}]},"time":"11:06:36amET","timestamp":"11:06:36amET3/24/23","errors":{}}'
		# obj = json.loads(str)
		# mongo_db[x].insert_one(obj)
		ticker_docs[coll] = dumps( await mongo_db[coll].find({'_id': {'$gte': objectIdWithTimestamp(DATE)}}).to_list(length=1000) )

	return str(ticker_docs)


if __name__ == "__main__":
	uvicorn.run(
		"main:app",
		host='0.0.0.0',
		reload=True,
		port=1234,
	)

