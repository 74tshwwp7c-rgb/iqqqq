import { useMemo, useState } from 'react';

const SYSTEM_PROMPT = `You are a Socratic AI tutor for students in Kazakhstan (grades 5-11). Your role is to help students understand concepts and solve problems on their OWN — you must NEVER give the direct answer immediately.

Your approach:

First message: Ask 1-2 guiding questions to understand what the student already knows
Second message: Give a small hint or analogy related to their answer
Third message onwards: Guide them step-by-step with questions until they reach the answer
Only after 3+ exchanges: you may reveal the answer if the student is truly stuck
Rules:

Speak in Russian (or Kazakh if student uses Kazakh)
Be warm, encouraging, never condescending
Use emojis sparingly to feel friendly
If student uploads a photo of homework, describe what you see and ask about it
Celebrate when student gets it right: 'Отлично! Ты сам до этого дошёл 🎉'
Max response length: 3-4 sentences per message (keep it conversational)`;

function App() {
  const [stage, setStage] = useState('landing');
  const [taskText, setTaskText] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hintCount, setHintCount] = useState(0);

  const studentTurns = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages]
  );

  const progress = useMemo(() => {
    const items = [{ text: 'Шаг 1: Ты определил(а) задачу', done: stage === 'chat' }];
    if (studentTurns >= 1) items.push({ text: 'Шаг 2: Исследуем ключевые идеи', done: true });
    if (studentTurns >= 3) items.push({ text: 'Шаг 3: Ты почти у цели!', done: true });
    if (studentTurns >= 5) items.push({ text: 'Шаг 4: Отличный прогресс 💪', done: true });
    return items;
  }, [stage, studentTurns]);

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setImagePreview(result);
      setImageBase64(String(result).split(',')[1] || '');
    };
    reader.readAsDataURL(file);
  };

  const startChat = async () => {
    if (!taskText.trim() && !imageBase64) return;
    setStage('chat');

    const bootMessage = taskText.trim()
      ? `Вот моя задача/тема: ${taskText.trim()}`
      : 'Я загрузил(а) фото домашнего задания. Помоги мне понять, с чего начать.';

    const seed = [{ role: 'user', content: bootMessage }];
    setMessages(seed);
    await requestAI(seed, { mode: 'normal' });
  };

  const requestAI = async (history, { mode }) => {
    setIsThinking(true);

    const assistantIndex = history.length;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT,
        mode,
        messages: history,
        imageBase64
      })
    });

    if (!response.ok || !response.body) {
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = {
          role: 'assistant',
          content: 'Упс, соединение прервалось. Давай попробуем ещё раз 🙏'
        };
        return next;
      });
      setIsThinking(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = { role: 'assistant', content: fullText };
        return next;
      });
    }

    setIsThinking(false);
  };

  const handleSend = async (mode = 'normal') => {
    if (!input.trim() && mode === 'normal') return;

    const modePrompt =
      mode === 'hint'
        ? 'Дай только маленькую подсказку, без полного решения.'
        : mode === 'stuck'
          ? `Я застрял(а). У нас уже было ${hintCount} подсказки. Дай более прямую помощь, но объясни ход мысли.`
          : input.trim();

    const next = [...messages, { role: 'user', content: modePrompt }];
    setMessages(next);
    setInput('');
    if (mode === 'hint') setHintCount((h) => h + 1);
    await requestAI(next, { mode });
  };

  if (stage === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thinkBlue to-slate-800 text-white px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">ThinkAI</h1>
            <p className="text-xl md:text-2xl text-thinkYellow font-semibold">
              Учись думать, не просто получать ответы
            </p>
          </div>

          <div className="bg-white text-slate-900 rounded-2xl shadow-xl p-6 md:p-8 space-y-5">
            <label className="block">
              <span className="font-medium">Введи концепцию или вопрос</span>
              <textarea
                className="mt-2 w-full h-28 rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-thinkBlue"
                placeholder="Например: как решать квадратные уравнения?"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
              />
            </label>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-thinkYellow text-thinkBlue font-semibold cursor-pointer">
                Загрузить домашнее задание
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
                />
              </label>
              {imagePreview && <span className="text-sm text-emerald-600">Фото загружено ✓</span>}
            </div>

            <button
              onClick={startChat}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-thinkBlue text-white font-semibold hover:opacity-90"
            >
              Начать с ThinkAI
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3 bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-thinkBlue">Твоя задача</h2>
          {imagePreview && <img src={imagePreview} alt="homework" className="rounded-xl w-full" />}
          {taskText && <p className="text-sm text-slate-700">{taskText}</p>}
          <div className="border-t pt-3 space-y-2 text-sm">
            <h3 className="font-semibold">Прогресс</h3>
            {progress.map((item) => (
              <p key={item.text} className={item.done ? 'text-emerald-600' : 'text-slate-500'}>
                {item.text} {item.done ? '✓' : ''}
              </p>
            ))}
            {studentTurns > 0 && <p className="text-thinkBlue">Продолжай, у тебя отлично получается!</p>}
          </div>
        </aside>

        <main className="lg:col-span-9 bg-white rounded-2xl shadow-sm p-4 md:p-6 flex flex-col h-[85vh]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800 border'
                  }`}
                >
                  {m.role === 'assistant' && <div className="text-xs mb-1">🦉 ThinkAI Tutor</div>}
                  {m.content || (isThinking ? 'Думаю…' : '')}
                </div>
              </div>
            ))}
            {isThinking && <div className="text-sm text-slate-500 animate-pulse">Thinking mode…</div>}
          </div>

          <div className="pt-4 border-t mt-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={() => handleSend('hint')}
                className="px-4 py-2 rounded-xl bg-thinkYellow text-thinkBlue font-semibold"
              >
                Подсказка
              </button>
              <button
                onClick={() => handleSend('stuck')}
                disabled={hintCount < 3}
                className="px-4 py-2 rounded-xl bg-thinkBlue text-white disabled:opacity-50"
              >
                Я застрял(а)
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend('normal')}
                placeholder="Напиши, что ты думаешь..."
                className="flex-1 border rounded-xl px-4 py-3"
              />
              <button
                onClick={() => handleSend('normal')}
                className="px-5 py-3 rounded-xl bg-thinkBlue text-white font-semibold"
              >
                Отправить
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
