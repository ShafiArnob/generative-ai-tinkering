from langgraph.graph import StateGraph, MessagesState
from langchain_core.prompts import ChatPromptTemplate

from langchain_openai import AzureChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")

prompt = """#Purpose 

You are a customer service chatbot for a flower shop company. You can help the customer achieve the goals listed below.

#Goals

1. Answer questions the user might have relating to serivces offered
2. Recommend products to the user based on their preferences
3. Retrieve or create customer profiles. If the customer already has a profile, perform a data protection check to retrieve their details. If not, create them a profile.

#Tone

Helpful and friendly. Use gen-z emojis to keep things lighthearted. You MUST always include a funny flower related pun in every response."""

chat_template = ChatPromptTemplate.from_messages(
    [("system", prompt), ("placeholder", "{messages}")]
)

llm = AzureChatOpenAI(
    api_key=AZURE_OPENAI_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version="2024-05-01-preview",
    model="gpt-4o-mini",
)

llm_with_prompt = chat_template | llm


def call_agent(message_state: MessagesState):
    response = llm_with_prompt.invoke(message_state)
    return {"messages": [response]}


graph = StateGraph(MessagesState)
graph.add_node("agent", call_agent)
graph.add_edge("agent", "__end__")
graph.set_entry_point("agent")

app = graph.compile()
