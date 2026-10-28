import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware for parsing JSON with generous limit for audio data
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize server-side Gemini client with required User-Agent header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Voice Audio Transcription Endpoint
  app.post('/api/transcribe-voice', async (req, res) => {
    try {
      const { audioBase64, mimeType, languageHint } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'No audio data provided' });
      }

      // Normalize mimeType to standard IANA audio type without parameters (e.g. audio/webm)
      const rawMime = mimeType || 'audio/webm';
      const cleanMimeType = rawMime.split(';')[0].trim() || 'audio/webm';

      // Strip any data: URL scheme prefix (e.g. data:audio/webm;codecs=opus;base64, or data:audio/webm;base64,)
      let cleanBase64 = audioBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1].trim();
      } else {
        cleanBase64 = cleanBase64.replace(/^data:[^,]+,/, '').trim();
      }

      const audioPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanBase64,
        },
      };

      const promptText = `Transcribe this voice audio of a shopkeeper or customer adding billing items. Spoken in ${languageHint || 'Hindi, Hinglish, or English'}.
Examples: "2 packet maggi aur ek kilo cheeni aur 3 lux sabun", "aadha kilo atta", "amul butter hata do".
Return ONLY the transcribed spoken words as plain text.`;

      const cleanOutput = (text: string) => {
        let cleaned = (text || '').trim();
        cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '').trim();
        cleaned = cleaned.replace(/^(?:transcription|transcript|spoken words?|the user said|customer said|shopkeeper said):\s*/i, '').trim();
        return cleaned;
      };

      const extractTranscriptFromResponse = (response: any): string => {
        // 1. Direct text property if available
        if (response.text && typeof response.text === 'string' && response.text.trim()) {
          return cleanOutput(response.text);
        }

        // 2. Iterate candidates and parts for audioTranscription or text
        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.audioTranscription?.text && typeof part.audioTranscription.text === 'string') {
              return cleanOutput(part.audioTranscription.text);
            }
            if (part.text && typeof part.text === 'string' && part.text.trim()) {
              return cleanOutput(part.text);
            }
          }
        }

        return '';
      };

      // First attempt with gemini-3.5-transcribe
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              audioPart,
              { text: promptText },
            ],
          },
        });

        const rawText = extractTranscriptFromResponse(response);
        return res.json({ transcript: rawText });
      } catch (transcribeErr: any) {
        console.warn('gemini-3.5-transcribe attempt failed, falling back to gemini-3.8-flash:', transcribeErr.message);

        // Fallback to gemini-3.8-flash
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              audioPart,
              { text: promptText },
            ],
          },
        });

        const rawText = extractTranscriptFromResponse(fallbackRes);
        return res.json({ transcript: rawText });
      }
    } catch (err: any) {
      console.error('Server transcription error:', err?.message || 'Internal error');
      return res.status(500).json({
        error: 'Failed to transcribe audio',
      });
    }
  });

  // Mount Vite middlewares in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static build in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
