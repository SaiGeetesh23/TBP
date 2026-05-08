# import os
# from dotenv import load_dotenv
# from langchain_milvus import Milvus
# from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
# # from langchain.tools import Tool
# from langchain_core.tools import Tool
# load_dotenv()

# embedding = NVIDIAEmbeddings(model="nvidia/llama-3.2-nv-embedqa-1b-v2", dimensions=8192)

# ZILLIZ_CLOUD_URI = os.getenv('ZILLIZ_CLOUD_URI')
# ZILLIZ_CLOUD_USERNAME = os.getenv('ZILLIZ_CLOUD_USERNAME')
# ZILLIZ_CLOUD_PASSWORD = os.getenv('ZILLIZ_CLOUD_PASSWORD')
# if not all([ZILLIZ_CLOUD_URI, ZILLIZ_CLOUD_USERNAME, ZILLIZ_CLOUD_PASSWORD]):
#     raise ValueError("Error in Milvus Connection Variables")

# vector_store = Milvus(
#     embedding_function= embedding,
#     connection_args={
#         "uri": ZILLIZ_CLOUD_URI,
#         "user": ZILLIZ_CLOUD_USERNAME,
#         "password": ZILLIZ_CLOUD_PASSWORD,
#         "secure": True,
#     },
#     collection_name="LangChainCollection",
#     text_field="content"
# )

# if not vector_store:
#     raise ValueError("Vector Store not Initialized")

# retriever = vector_store.as_retriever()
# retriever_tool = Tool(
#     name="argo_data_context_retriever",
#     func=retriever.invoke,
#     description="""
#         Use this tool to retrieve context about Argo float data, including
#         database schema descriptions, example questions and SQL queries,
#         and geographical region definitions. This tool automatically generates
#         multiple query variations to improve retrieval quality and should be 
#         your first step when you receive a complex question.
#     """)



import os
from dotenv import load_dotenv
from langchain_milvus import Milvus
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings

from langchain_core.tools import Tool

load_dotenv()

embedding = NVIDIAEmbeddings(model="nvidia/llama-3.2-nv-embedqa-1b-v2", dimensions=8192)

ZILLIZ_CLOUD_URI = os.getenv('ZILLIZ_CLOUD_URI')
ZILLIZ_CLOUD_USERNAME = os.getenv('ZILLIZ_CLOUD_USERNAME')
ZILLIZ_CLOUD_PASSWORD = os.getenv('ZILLIZ_CLOUD_PASSWORD')
if not all([ZILLIZ_CLOUD_URI, ZILLIZ_CLOUD_USERNAME, ZILLIZ_CLOUD_PASSWORD]):
    raise ValueError("Error in Milvus Connection Variables")

vector_store = Milvus(
    embedding_function= embedding,
    connection_args={
        "uri": ZILLIZ_CLOUD_URI,
        "user": ZILLIZ_CLOUD_USERNAME,
        "password": ZILLIZ_CLOUD_PASSWORD,
        "secure": True,
    },
    collection_name="LangChainCollection"
)

if not vector_store:
    raise ValueError("Vector Store not Initialized")

retriever = vector_store.as_retriever()
retriever_tool = Tool(
    name="argo_data_context_retriever",
    func=retriever.invoke,
    description="""
        Use this tool to retrieve context about Argo float data, including
        database schema descriptions, example questions and SQL queries,
        and geographical region definitions. This tool automatically generates
        multiple query variations to improve retrieval quality and should be 
        your first step when you receive a complex question.
    """)