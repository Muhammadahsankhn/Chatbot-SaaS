import os
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in .env file")

genai.configure(api_key=GEMINI_API_KEY)

MODEL = "gemini-2.5-flash"

GENERATION_CONFIG = {
    "temperature": 0.4,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]


def build_system_prompt(bot_config: dict) -> str:
    bot_name = bot_config.get("botName", "Assistant")
    custom_prompt = bot_config.get("systemPrompt", "")

    prompt = f"""You are {bot_name}, a helpful AI assistant embedded on a website.
Your job is to answer visitor questions using the website content provided to you.

Rules:
- Answer ONLY based on the context provided below
- If the context does not contain the answer, say: I don't have that information. Please contact us directly.
- Keep answers brief and friendly
- Never make up information that is not in the context
- Do not discuss topics unrelated to the website"""

    if custom_prompt:
        prompt += f"\n\nAdditional instructions:\n{custom_prompt}"

    return prompt


def build_message_with_context(message: str, context_chunks: List[str]) -> str:
    if not context_chunks:
        return message

    context_text = "\n\n---\n\n".join(context_chunks)

    return f"""Use the following information from the website to answer the question.

WEBSITE CONTENT:
{context_text}

---

VISITOR QUESTION: {message}

Answer based only on the website content above."""


def get_gemini_reply(
    message: str,
    bot_config: dict = {},
    context_chunks: List[str] = []
) -> dict:
    try:
        model = genai.GenerativeModel(
            model_name=MODEL,
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
            system_instruction=build_system_prompt(bot_config)
        )

        full_message = build_message_with_context(message, context_chunks)
        response = model.generate_content(full_message)

        return {
            "success": True,
            "reply": response.text,
            "tokensUsed": response.usage_metadata.total_token_count
                          if hasattr(response, "usage_metadata") else None,
            "contextUsed": len(context_chunks) > 0
        }

    except Exception as e:
        return {
            "success": False,
            "reply": "I am having trouble responding right now. Please try again.",
            "error": str(e)
        }


def get_gemini_reply_with_history(
    message: str,
    history: List[dict],
    bot_config: dict = {},
    context_chunks: List[str] = []
) -> dict:
    try:
        model = genai.GenerativeModel(
            model_name=MODEL,
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
            system_instruction=build_system_prompt(bot_config)
        )

        # Convert history to Gemini format
        gemini_history = [
            {
                "role": item["role"],
                "parts": [{"text": item["text"]}]
            }
            for item in (history or [])
        ]

        chat_session = model.start_chat(history=gemini_history)
        full_message = build_message_with_context(message, context_chunks)
        response = chat_session.send_message(full_message)

        return {
            "success": True,
            "reply": response.text,
            "tokensUsed": response.usage_metadata.total_token_count
                          if hasattr(response, "usage_metadata") else None,
            "contextUsed": len(context_chunks) > 0
        }

    except Exception as e:
        return {
            "success": False,
            "reply": "I am having trouble responding right now. Please try again.",
            "error": str(e)
        }