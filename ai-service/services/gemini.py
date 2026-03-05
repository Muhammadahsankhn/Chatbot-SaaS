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
    "temperature": 0.7,       # ← increased from 0.4 for more natural responses
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
    bot_name    = bot_config.get("botName", "Assistant")
    custom_prompt = bot_config.get("systemPrompt", "")

    prompt = f"""You are {bot_name}, a friendly and helpful AI assistant embedded on a website.

Your primary job is to help visitors using the website content provided to you.
But you are also a smart, conversational assistant — not a rigid FAQ bot.

## HOW TO RESPOND:

1. **If the question is answered in the website context** → Answer directly and helpfully from it.

2. **If the question is a general/common question** (greetings, how are you, general knowledge, common sense) → Answer naturally and helpfully. You don't need website content for these.

3. **If the question is partially answered in the context** → Answer what you know from the context and mention what additional info they can get by contacting support.

4. **ONLY say you don't have information** if:
   - The question is very specific to this business (pricing, order status, account info, etc.)
   - AND it's genuinely not covered in the context provided

## TONE & STYLE:
- Be warm, conversational, and helpful — not robotic
- Keep answers concise but complete (2-5 sentences is usually enough)
- Use bullet points only when listing multiple items
- Never be dismissive — always try to help
- If you can't fully answer, suggest what they should do next (contact support, check a specific page, etc.)

## STRICT RULES:
- Never make up specific business facts (prices, policies, dates) not in the context
- Never discuss harmful, illegal, or inappropriate topics
- Always stay relevant to helping the visitor"""

    if custom_prompt:
        prompt += f"\n\n## ADDITIONAL INSTRUCTIONS FROM WEBSITE OWNER:\n{custom_prompt}"

    return prompt


def build_message_with_context(message: str, context_chunks: List[str]) -> str:
    """Build message — with context if available, without if not."""
    if not context_chunks:
        # No context — just answer naturally
        return f"""VISITOR MESSAGE: {message}

Note: No specific website content is available for this query. 
Answer helpfully using your general knowledge if this is a general question.
If it seems like a business-specific question you can't answer, politely say so and suggest contacting support."""

    context_text = "\n\n---\n\n".join(context_chunks)

    return f"""Use the following website content to help answer the visitor's question.
If the answer is fully covered in the content, use it.
If only partially covered, use what's available and be honest about the rest.
If it's a general question not needing this content, answer naturally.

WEBSITE CONTENT:
{context_text}

---

VISITOR MESSAGE: {message}

Respond helpfully and naturally."""


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
        response     = model.generate_content(full_message)

        return {
            "success":     True,
            "reply":       response.text,
            "tokensUsed":  response.usage_metadata.total_token_count
                           if hasattr(response, "usage_metadata") else None,
            "contextUsed": len(context_chunks) > 0
        }

    except Exception as e:
        return {
            "success": False,
            "reply":   "I'm having a little trouble right now. Please try again in a moment!",
            "error":   str(e)
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

        # ── Convert history to Gemini format ──
        # Filter out any malformed history items
        gemini_history = []
        for item in (history or []):
            role = item.get("role", "")
            text = item.get("text", "")
            if role in ("user", "model") and text.strip():
                gemini_history.append({
                    "role":  role,
                    "parts": [{"text": text}]
                })

        chat_session = model.start_chat(history=gemini_history)
        full_message = build_message_with_context(message, context_chunks)
        response     = chat_session.send_message(full_message)

        return {
            "success":     True,
            "reply":       response.text,
            "tokensUsed":  response.usage_metadata.total_token_count
                           if hasattr(response, "usage_metadata") else None,
            "contextUsed": len(context_chunks) > 0
        }

    except Exception as e:
        return {
            "success": False,
            "reply":   "I'm having a little trouble right now. Please try again in a moment!",
            "error":   str(e)
        }