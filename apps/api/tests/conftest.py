import os

os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB", "insightscope")
os.environ.setdefault("MONGODB_TEST_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000")
