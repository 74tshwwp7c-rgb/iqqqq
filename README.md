# ThinkAI MVP

AI-powered Socratic tutoring platform for Kazakhstani students.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Add your Anthropic API key in `.env`.

4. Start both frontend + backend:

```bash
npm run dev
```

## Stack

- React + TailwindCSS frontend
- Express backend proxy for Claude API streaming
- Claude model: `claude-sonnet-4-20250514`

## MVP Features

- Landing page with text or homework image input
- Chat UI with Socratic tutor flow
- Hint and "I'm stuck" escalation controls
- Streaming AI responses with typewriter effect
- Session chat history in React state
- Mobile responsive layout
