"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Wrench, Mic, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    // 사용자 메시지 + 채워질 AI 답변 자리 추가
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: "user",
      timestamp: new Date(),
    };
    const assistantId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, content: "", role: "assistant", timestamp: new Date() },
    ]);
    setMessage("");
    setIsLoading(true);

    const setAssistantContent = (content: string) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)));
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API 요청 실패 (${response.status})`);
      }
      if (!response.body) {
        throw new Error("응답을 읽을 수 없습니다.");
      }

      // 스트리밍 응답을 받는 대로 타이핑하듯 반영
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAssistantContent(accumulated);
      }
    } catch (error) {
      console.error("오류:", error);
      const errorText =
        error instanceof Error
          ? error.message
          : "죄송합니다. 요청 처리 중 오류가 발생했습니다.";
      setAssistantContent(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-[33vh] flex flex-col bg-gray-50">
      {/* 메시지 표시 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>대화를 시작해보세요!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" && msg.content === "" && isLoading ? (
                    <div className="flex gap-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="w-full max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Input area */}
            <div className="px-4 py-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="AI에게 물어보기"
                disabled={isLoading}
                className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none text-base disabled:opacity-50"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              {/* Left buttons */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <Wrench className="h-4 w-4" />
                  <span className="text-sm">도구</span>
                </Button>
              </div>

              {/* Right buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <span className="text-sm">사고 모델</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
