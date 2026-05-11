import os
from groq import Groq
from dotenv import load_dotenv
from typing import List

load_dotenv()

GROQ_API_KEY = os.getenv("groq_Api_Key")
if not GROQ_API_KEY:
    raise ValueError("groq_Api_Key is not set in .env file")

client = Groq(api_key=GROQ_API_KEY)

# ── Groq free tier: 14,400 requests/day ──
# Available models:
#   llama-3.3-70b-versatile  → best quality
#   llama-3.1-8b-instant     → fastest
#   mixtral-8x7b-32768       → good balance
MODEL = "llama-3.3-70b-versatile"


def build_system_prompt(bot_config: dict) -> str:
    bot_name      = bot_config.get("botName", "Assistant")
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
    if not context_chunks:
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
    message:        str,
    bot_config:     dict = {},
    context_chunks: List[str] = []
) -> dict:
    try:
        full_message  = build_message_with_context(message, context_chunks)
        system_prompt = build_system_prompt(bot_config)

        response = client.chat.completions.create(
            model    = MODEL,
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": full_message},
            ],
            temperature       = 0.7,
            max_tokens        = 1024,
            top_p             = 0.95,
        )

        reply = response.choices[0].message.content
        print(f"[Groq OK] {len(reply)} chars")
        return {
            "success":     True,
            "reply":       reply,
            "tokensUsed":  response.usage.total_tokens if response.usage else None,
            "contextUsed": len(context_chunks) > 0
        }

    except Exception as e:
        print(f"[Groq ERROR] {type(e).__name__}: {e}")
        return {
            "success": False,
            "reply":   "I'm having a little trouble right now. Please try again in a moment!",
            "error":   str(e)
        }


def get_gemini_reply_with_history(
    message:        str,
    history:        List[dict],
    bot_config:     dict = {},
    context_chunks: List[str] = []
) -> dict:
    try:
        full_message  = build_message_with_context(message, context_chunks)
        system_prompt = build_system_prompt(bot_config)

        # ── Build messages list for Groq ──
        # Groq uses OpenAI-compatible format: role = system/user/assistant
        messages = [{"role": "system", "content": system_prompt}]

        for item in (history or []):
            role = item.get("role", "")
            text = item.get("text", item.get("content", ""))
            if not role or not text or not text.strip():
                continue
            # Map bot/model → assistant (OpenAI format)
            groq_role = "assistant" if role in ("assistant", "bot", "model") else "user"
            messages.append({"role": groq_role, "content": text})

        # ── Fix consecutive same-role messages ──
        merged = [messages[0]]  # keep system message
        for msg in messages[1:]:
            if merged[-1]["role"] == msg["role"] and merged[-1]["role"] != "system":
                merged[-1]["content"] += "\n" + msg["content"]
            else:
                merged.append(msg)

        # ── Add current user message ──
        merged.append({"role": "user", "content": full_message})

        response = client.chat.completions.create(
            model       = MODEL,
            messages    = merged,
            temperature = 0.7,
            max_tokens  = 1024,
            top_p       = 0.95,
        )

        reply = response.choices[0].message.content
        print(f"[Groq OK] {len(reply)} chars")
        return {
            "success":     True,
            "reply":       reply,
            "tokensUsed":  response.usage.total_tokens if response.usage else None,
            "contextUsed": len(context_chunks) > 0
        }

    except Exception as e:
        print(f"[Groq ERROR - with_history] {type(e).__name__}: {e}")
        return {
            "success": False,
            "reply":   "I'm having a little trouble right now. Please try again in a moment!",
            "error":   str(e)
        }