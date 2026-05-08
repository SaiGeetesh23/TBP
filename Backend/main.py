import os
from dotenv import load_dotenv
import json
from typing import Optional
from uuid import uuid4
from datetime import datetime, timedelta
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from sqlalchemy.orm import Session

import utilities.database as database
import utilities.models as models
import utilities.schemas as schemas

from Prompts.AgentPrompt import ARGO_SQL_AGENT_SYSTEM_PROMPT

from Tools.run_sql_and_get_json import run_sql_and_get_json
from Tools.retriever_tool import retriever_tool

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langchain_community.utilities import SQLDatabase
from sqlalchemy import create_engine
# from langgraph.prebuilt import create_agent
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_community.agent_toolkits.sql.toolkit import (
    ListSQLDatabaseTool,
    InfoSQLDatabaseTool,
    QuerySQLCheckerTool,
)

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

models.Base.metadata.create_all(bind = database.engine)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72])

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes = 15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token:str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail = "Could Not Validate Credentials",
        headers = {"WWW-Authenticate" : "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

memory = MemorySaver()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Cannot Find Database URL in Environment Variables")

llm = ChatOpenAI(model = 'gpt-4o-mini')
if not any([llm]):
    raise ValueError("LLMs not Initialized")

data_engine = create_engine(DATABASE_URL)
if not data_engine:
    raise ValueError("Could Not Create Data_engine")

db = SQLDatabase(data_engine)
if not db:
    print("DB Could not be created")

def create_trajectory_plot(df):
    """Create trajectory plot for ARGO float data"""
    try:
        lat_col = None
        lon_col = None
        time_col = None
        
        for col in df.columns:
            if col.lower() in ['latitude', 'lat']:
                lat_col = col
            elif col.lower() in ['longitude', 'lon', 'long']:
                lon_col = col
            elif col.lower() in ['time']: # Detect time column
                time_col = col
                
        if not lat_col or not lon_col:
            return None
            
        df = df.dropna(subset=[lat_col, lon_col])
        df = df[(df[lat_col] >= -90) & (df[lat_col] <= 90)]
        df = df[(df[lon_col] >= -180) & (df[lon_col] <= 180)]
        
        if time_col:
            df[time_col] = pd.to_datetime(df[time_col])
            df = df.sort_values(by=time_col)

        if len(df) == 0:
            return None
            
        color_col = None
        for col in ['platform_number', 'float_id', 'cycle_number']:
            if col in df.columns:
                color_col = col
                break
                
        if color_col and len(df[color_col].unique()) > 1:
            fig = px.scatter_geo(
                df, 
                lat=lat_col, 
                lon=lon_col, 
                color=color_col,
                title='ARGO Float Trajectories',
                hover_data=[col for col in df.columns if col not in [lat_col, lon_col]]
            )
        else:
            fig = px.scatter_geo(
                df, 
                lat=lat_col, 
                lon=lon_col,
                title='ARGO Float Trajectory',
                hover_data=[col for col in df.columns if col not in [lat_col, lon_col]]
            )
            fig.update_traces(mode='lines+markers')
            
        fig.update_layout(
            geo=dict(
                showland=True,
                landcolor='lightgray',
                showocean=True,
                oceancolor='lightblue'
            )
        )
        
        return fig.to_json()
        
    except Exception as e:
        print(f"Error creating trajectory plot: {e}")
        return None

def create_depth_time_plot(df):
    """Create depth-time plot for ARGO float data"""
    try:
        temp_col = None
        pressure_col = None
        time_col = None
        
        for col in df.columns:
            col_lower = col.lower()
            if 'temp' in col_lower and ('adjust' in col_lower or 'qc' not in col_lower):
                temp_col = col
            elif 'pressure' in col_lower and ('adjust' in col_lower or 'qc' not in col_lower):
                pressure_col = col
            elif 'time' in col_lower or 'date' in col_lower:
                time_col = col
                
        if not pressure_col:
            return None
            
        df = df.dropna(subset=[pressure_col])
        df = df[df[pressure_col] >= 0]
        
        if len(df) == 0:
            return None
            
        df = df.sort_values(by=pressure_col)
        if time_col and df[time_col].nunique() > 1:
            df[time_col] = pd.to_datetime(df[time_col])
            df = df.sort_values(by=[time_col, pressure_col])
            
            if temp_col:
                fig = px.scatter(
                    df, 
                    x=time_col, 
                    y=pressure_col, 
                    # color=temp_col,
                    title='Depth-Time Plot with Temperature',
                    labels={
                        pressure_col: 'Pressure/Depth (dbar)',
                        time_col: 'Time',
                        # temp_col: 'Temperature (°C)'
                    }
                )
            else:
                fig = px.scatter(
                    df, 
                    x=time_col, 
                    y=pressure_col,
                    title='Depth-Time Plot'
                )
        elif temp_col:
            fig = px.line(
                df, 
                x=temp_col, 
                y=pressure_col,
                title='Temperature Profile',
                labels={
                    temp_col: 'Temperature (°C)',
                    pressure_col: 'Pressure/Depth (dbar)'
                }
            )
        else:
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=list(range(len(df))),
                y=df[pressure_col],
                mode='lines+markers',
                name='Depth Profile'
            ))
            fig.update_layout(
                title='Depth Profile',
                xaxis_title='Data Points',
                yaxis_title='Pressure/Depth (dbar)'
            )
            
        fig.update_yaxes(autorange="reversed")
        
        return fig.to_json()
        
    except Exception as e:
        print(f"Error creating depth-time plot: {e}")
        return None

def determine_plot_type_and_create(df):
    """Determine the appropriate plot type based on data columns and create it"""
    if df is None or len(df) == 0:
        return None, "No data available for plotting"
        
    columns = [col.lower() for col in df.columns]
    
    has_lat_lon = any('lat' in col for col in columns) and any('lon' in col for col in columns)
    has_depth_data = any('pressure' in col or 'depth' in col for col in columns)
    
    # CORRECTED LOGIC: Check for the more specific plot type (depth) FIRST.
    if has_depth_data:
        plot_json = create_depth_time_plot(df)
        if plot_json:
            return plot_json, f"Generated depth-time plot with {len(df)} data points"
    
    # If no depth data is found, then check for trajectory data.
    if has_lat_lon and len(df) > 1:
        plot_json = create_trajectory_plot(df)
        if plot_json:
            return plot_json, f"Generated trajectory plot with {len(df)} data points"
    
    return None, "Could not determine appropriate plot type for this data"

system_message = ARGO_SQL_AGENT_SYSTEM_PROMPT.format(dialect="PostgreSQL", top_k=100)
sql_tools = [
    ListSQLDatabaseTool(db=db),
    InfoSQLDatabaseTool(db=db),
    QuerySQLCheckerTool(db=db, llm=llm)
]

all_tools = sql_tools + [run_sql_and_get_json, retriever_tool]
agent_executor = create_agent(model=llm,
    tools=all_tools,
    system_prompt=system_message)



app = FastAPI(
    title="FloatChat",
    description="Conversational AI - AI Chatbot for Ocean Data(ARGO Floats)",
    version = "3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

async def generate_chat_response(message: str, thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    plot_handled_this_turn = False
    async for event in agent_executor.astream_events({"messages": [HumanMessage(content=message)]}, version="v2", config=config):
        event_type, event_name, data = event["event"], event["name"], event["data"]

        if event_type == "on_tool_start":
             yield f"data: {json.dumps({'type': 'tool_start', 'content': f'Executing query...'})}\n\n"
             continue
        
        if event_type == "on_tool_end" and event_name == "run_sql_and_get_json":
            try:
                tool_output = data.get("output").content
                json_output = json.loads(tool_output)
                
                if isinstance(json_output, list):
                    df = pd.DataFrame(json_output)
                    plot_json, summary_message = determine_plot_type_and_create(df)
                    if plot_json:
                        plot_handled_this_turn = True
                        yield f"data: {json.dumps({'type': 'plot', 'data': plot_json})}\n\n"
                        yield f"data: {json.dumps({'type': 'content', 'content': summary_message})}\n\n"
                    else:
                        pass
                elif isinstance(json_output, dict) and 'error' in json_output:
                    # Handle the error case if the tool returns a JSON with an error key
                    error_summary = f"The database query failed with an error: {json_output['error']}"
                    yield f"data: {json.dumps({'type': 'content', 'content': error_summary})}\n\n"

            except Exception as e:
                print(f"Error processing plot: {e}")
            continue
            
        if event_type == "on_chat_model_stream" and not plot_handled_this_turn:
            chunk = data.get("chunk")
            if chunk and chunk.content and not chunk.tool_calls:
                yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
                
    yield f"data: {json.dumps({'type': 'end'})}\n\n"

@app.post("/signup", response_model = schemas.Token)
async def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email Already Registered")
    
    hashed_password = get_password_hash(user.password)

    thread_id = str(uuid4())
    new_user = models.User(
        username = user.username,
        email = user.email,
        hashed_password=hashed_password,
        thread_id = thread_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token_expires = timedelta(minutes = ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data = {"sub": new_user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model = schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Note: The form's 'username' field is used for the user's email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail = "Incorrect Username or password",
            headers = {"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes = ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data = {"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token" : access_token, "token_type": "bearer"}

@app.post("/chat-stream")
async def chat_stream(request: schemas.ChatRequest, current_user: models.User = Depends(get_current_user)):
    thread_id = current_user.thread_id
    return StreamingResponse(
        generate_chat_response(request.message, thread_id),
        media_type="text/event-stream"
    )

@app.get("/")
def read_root():
    return {"status" : "FloatChat API is running"}

# Additional endpoint for testing plot generation
@app.post("/test-plot")
async def test_plot(current_user: models.User = Depends(get_current_user)):
    """Test endpoint to verify plot generation works"""
    # Sample data for testing
    sample_trajectory_data = [
        {"latitude": 45.5, "longitude": -125.3, "platform_number": "12345", "time": "2023-01-01"},
        {"latitude": 45.6, "longitude": -125.4, "platform_number": "12345", "time": "2023-01-02"},
        {"latitude": 45.7, "longitude": -125.5, "platform_number": "12345", "time": "2023-01-03"}
    ]
    
    df = pd.DataFrame(sample_trajectory_data)
    plot_json, message = determine_plot_type_and_create(df)
    
    return {
        "success": plot_json is not None,
        "message": message,
        "plot_data": plot_json
    }