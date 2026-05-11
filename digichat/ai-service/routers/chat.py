from fastapi import APIRouter, Depends
from models.schemas import ChatRequest, ChatWithHistoryRequest, ChatResponse
from services.gemini import get_gemini_reply, get_gemini_reply_with_history
from services.knowledge_base import search_knowledge_base
from services.embeddings import embed_single
from middleware.validate_key import verify_internal_key

router = APIRouter()


@router.post("/message", response_model=ChatResponse, dependencies=[Depends(verify_internal_key)])
async def chat_message(body: ChatRequest):
    # Step 1 - embed the visitor question
    query_vector = embed_single(body.message)

    # Step 2 - search ChromaDB for relevant chunks
    context_chunks = search_knowledge_base(
        user_id=body.userId,
        query_embedding=query_vector,
        top_k=4
    )

    # Step 3 - call Gemini with context
    result = get_gemini_reply(
        message=body.message,
        bot_config=body.botConfig or {},
        context_chunks=context_chunks
    )

    return ChatResponse(
        success=result["success"],
        reply=result["reply"],
        sessionId=body.sessionId,
        tokensUsed=result.get("tokensUsed"),
        error=result.get("error")
    )


@router.post("/message-with-history", response_model=ChatResponse, dependencies=[Depends(verify_internal_key)])
async def chat_message_with_history(body: ChatWithHistoryRequest):
    query_vector = embed_single(body.message)

    context_chunks = search_knowledge_base(
        user_id=body.userId,
        query_embedding=query_vector,
        top_k=4
    )

    history = [{"role": m.role, "text": m.text} for m in (body.history or [])]

    result = get_gemini_reply_with_history(
        message=body.message,
        history=history,
        bot_config=body.botConfig or {},
        context_chunks=context_chunks
    )

    return ChatResponse(
        success=result["success"],
        reply=result["reply"],
        sessionId=body.sessionId,
        tokensUsed=result.get("tokensUsed"),
        error=result.get("error")
    )


@router.get("/health")
async def health():
    return {"status": "ok", "service": "chat"}