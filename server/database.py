from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "scripts.db")
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
DB_PATH = os.getenv("DB_PATH", DEFAULT_DB_PATH)


def _resolve_sqlalchemy_url() -> str:
    if DATABASE_URL:
        return DATABASE_URL

    if DB_PATH != ":memory:":
        db_dir = os.path.dirname(DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        return f"sqlite:///{DB_PATH}"
    return "sqlite://"


SQLALCHEMY_DATABASE_URL = _resolve_sqlalchemy_url()
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

engine_kwargs = {"pool_pre_ping": True}
if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, **engine_kwargs
)

# 註：main 分支（v0.5.0 發佈線）曾在此註冊一個 connect 事件監聽器，對每條連線
# 執行 SQLite PRAGMA（journal_mode/synchronous/busy_timeout/cache_size/
# foreign_keys）。那段程式碼沒有 IS_SQLITE 保護，而正式環境已改用 Postgres：
#
#   postgres=# PRAGMA journal_mode=WAL;
#   ERROR:  syntax error at or near "PRAGMA"
#
# 亦即每次建立連線都會拋錯。該段是 SQLite 時代的遺留，於 main 併入 dev 時
# 一併移除。目前 SQLite 僅用於測試的記憶體模式，用不到這些調校。

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
