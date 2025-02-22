from langgraph.graph import StateGraph, MessagesState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import AzureChatOpenAI
from langgraph.prebuilt import ToolNode

from tools import search_for_product_reccommendations, query_knowledge_base

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

tools = [query_knowledge_base, search_for_product_reccommendations]

llm_with_prompt = chat_template | llm.bind_tools(tools)


def call_agent(message_state: MessagesState):
    response = llm_with_prompt.invoke(message_state)
    return {"messages": [response]}


def is_there_tool_calls(state: MessagesState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tool_node"
    else:
        return "__end__"


graph = StateGraph(MessagesState)

tool_node = ToolNode(tools)

graph.add_node("agent", call_agent)
graph.add_node("tool_node", tool_node)

graph.add_conditional_edges("agent", is_there_tool_calls)

graph.add_edge("tool_node", "agent")
graph.add_edge("agent", "__end__")
graph.set_entry_point("agent")

app = graph.compile()
