"""DB Settings and Connections"""

import os
import json
from dotenv import load_dotenv
import motor.motor_asyncio

load_dotenv()

MONGO_CONFIG = json.loads(os.environ.get('MONGO_CONFIG'))
CLIENT_URL = MONGO_CONFIG['client']
DATABASE = 'stockstats'

mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
	CLIENT_URL, uuidRepresentation="standard"
)

mongo_db = mongo_client[DATABASE]
