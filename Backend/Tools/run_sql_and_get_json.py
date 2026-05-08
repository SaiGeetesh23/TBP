import os
from dotenv import load_dotenv
import json
import pandas as pd
from langchain.tools import tool
from sqlalchemy import create_engine

load_dotenv(dotenv_path='../.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Cannot Find Database URL in Environment Variables")

data_engine = create_engine(DATABASE_URL)
if not data_engine:
    raise ValueError("Could Not Create Data_engine")

@tool
def run_sql_and_get_json(query: str) -> str:
    """
    Executes a SQL query against the database and returns the result as a structured JSON string.
    THIS IS THE ONLY TOOL that can be used to execute a query and get data.
    It must be used after checking the query with QuerySQLCheckerTool.
    Input must be a valid and checked SQL query.
    """
    print(f"\n✅ Custom tool 'run_sql_and_get_json' was CALLED with query: {query}\n")
    try:
        with data_engine.connect() as connection:
            df = pd.read_sql(query, connection)
        result = df.to_json(orient='records', date_format='iso')
        print(f"✅ Query executed successfully, returning {len(df)} rows")
        return result
    except Exception as e:
        error_result = json.dumps({"error": str(e)})
        print(f"❌ Query execution failed: {e}")
        return error_result