import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.post('/api/chat', async (req, res) => {
  try {
    const { systemPrompt, messages, imageBase64, mode } = req.body;

    const anthropicMessages = messages.map((msg, idx) => {
      if (idx === 0 && imageBase64 && msg.role === 'user') {
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: msg.content
            }
          ]
        };
      }

      return {
        role: msg.role,
        content: msg.content
      };
    });

    const modeInstruction =
      mode === 'hint'
        ? 'User asked for a tiny hint only. Do not provide full answer.'
        : mode === 'stuck'
          ? 'User says they are stuck after hints. You may provide more direct help while still teaching reasoning.'
          : 'Default Socratic mode.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.5,
        system: `${systemPrompt}\n\nAdditional run mode: ${modeInstruction}`,
        messages: anthropicMessages,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      res.status(500).send(text);
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const raw = line.replace('data: ', '').trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            res.write(parsed.delta.text);
          }
        } catch {
          // ignore JSON framing fragments
        }
      }
    }

    res.end();
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`ThinkAI API running on http://localhost:${port}`);
});
