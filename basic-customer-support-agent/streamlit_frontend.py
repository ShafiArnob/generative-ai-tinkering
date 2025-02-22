import streamlit as st
from vector_store import FlowerShopVectorStore
from langchain_core.messages import HumanMessage, AIMessage

from chatbot import app
from tools import customers_database, data_protection_checks

st.set_page_config(layout="wide", page_title="flower shop chatbot")


if "message_history" not in st.session_state:
    st.session_state.message_history = [
        AIMessage(content="Hi, I am a flower shop chatbot. How can I help?")
    ]

left_col, main_col, right_col = st.columns([1, 2, 1])

# button for chatbot clear
with left_col:
    if st.button("Clear Chat"):
        st.session_state.message_history = []
    # collection_choice = st.radio("Which collection?", ["faqs", "inventory"])

# chat history and input
with main_col:
    user_input = st.chat_input("Type here...")

    if user_input:
        # if collection_choice == "faqs":
        #     related_questions = vector_store.query_faqs(user_input)
        # else:
        #     related_questions = vector_store.query_inventories(user_input)

        st.session_state.message_history.append(HumanMessage(content=user_input))

        # The response returns all the messages passed in and the ai response
        response = app.invoke({"messages": st.session_state.message_history})
        st.session_state.message_history = response["messages"]

    for i in range(1, len(st.session_state.message_history) + 1):
        this_message = st.session_state.message_history[-i]
        if isinstance(this_message, AIMessage):
            message_box = st.chat_message("assistant")
        else:
            message_box = st.chat_message("user")
        message_box.markdown(this_message.content)

# state variables
with right_col:
    st.title("Customer Database")
    st.write(customers_database)
    st.title("Data Protection Checks")
    st.write(data_protection_checks)
