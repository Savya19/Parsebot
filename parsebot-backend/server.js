import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RAGSystem from './rag-system.js';
import { GoogleGenerativeAI } from '@google/generative-ai';


const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
dotenv.config({ path: ENV_PATH, override: true });
console.log(` Loading env from: ${ENV_PATH}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!GEMINI_API_KEY) {
  console.warn(
    '\u26a0\ufe0f  GEMINI_API_KEY is not set. Set it in parsebot-backend/.env to enable AI responses.'
  );
}

// Initialize Gemini AI
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Initialize RAG system
const ragSystem = new RAGSystem();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(limiter);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sessions persistence directory (to survive restarts)
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Reload persisted sessions on startup
try {
  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const sessionId = path.basename(file, '.json');
    const raw = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === 'string' && parsed.filename) {
      try {
        ragSystem.storeDocument(sessionId, parsed.text, parsed.filename);
        console.log(`Reloaded session ${sessionId} from disk`);
      } catch (e) {
        console.warn(`Failed to reload session ${sessionId}: ${e?.message}`);
      }
    }
  }
} catch (e) {
  console.warn('Failed to reload persisted sessions:', e?.message);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// In-memory storage for PDF content (replaced by RAG system)
// const pdfStore = new Map(); // Now using ragSystem for storage

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ParseBot Backend is running',
    geminiKeyPresent: Boolean(GEMINI_API_KEY)
  });
});

// Env check endpoint (non-sensitive)
app.get('/env-check', (req, res) => {
  const present = Boolean(GEMINI_API_KEY);
  const start = present ? String(GEMINI_API_KEY).slice(0, 4) : null; // e.g., "AI..."
  res.json({ geminiKeyPresent: present, geminiKeyPrefix: start });
});

// Upload PDF endpoint
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    const sessionId = req.body.sessionId || 'default';
    console.log(`Upload received for sessionId=${sessionId}, filename=${req.file.originalname}`);

    // Parse PDF using robust text extraction with fallbacks
    let pdfText = '';
    try {
      // Try using pdf-parse first
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      pdfText = (pdfData.text || '').trim();
    } catch (error) {
      console.log('PDF-parse failed, trying pdfjs-dist fallback:', error?.message);
      try {
        // Use the legacy Node build to avoid worker and file path issues
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const getDocument = (pdfjsLib.getDocument || (pdfjsLib.default && pdfjsLib.default.getDocument));
        const data = new Uint8Array(fs.readFileSync(filePath));
        const loadingTask = getDocument({ data, isEvalSupported: false, disableFontFace: true });
        const pdf = await loadingTask.promise;
        let textParts = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str).join(' ');
          textParts.push(strings);
        }
        pdfText = textParts.join('\n').trim();
      } catch (fallbackErr) {
        console.log('pdfjs-dist fallback failed:', fallbackErr?.message);
        // Final fallback: placeholder text so the RAG flow still works
        pdfText = `PDF file "${req.file.originalname}" was uploaded but text extraction failed.`;
      }
    }
    
    // Persist session text to disk for reliability
    try {
      const sessionPayload = { text: pdfText, filename: req.file.originalname };
      fs.writeFileSync(path.join(sessionsDir, `${sessionId}.json`), JSON.stringify(sessionPayload));
    } catch (persistErr) {
      console.warn(`Failed to persist session ${sessionId}:`, persistErr?.message);
    }

    // Store PDF content using RAG system
    const chunkCount = ragSystem.storeDocument(sessionId, pdfText, req.file.originalname);
    console.log(`Stored document for sessionId=${sessionId}, chunks=${chunkCount}`);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'PDF uploaded and processed with RAG successfully',
      filename: req.file.originalname,
      sessionId: sessionId,
      chunkCount: chunkCount,
      textLength: pdfText.length,
      processingMethod: 'RAG with TF-IDF'
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process PDF', 
      details: error.message 
    });
  }
});

// Chat endpoint for asking questions about the PDF
app.post('/api/chat', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Missing configuration',
        details: 'GEMINI_API_KEY is not set on the server. Please configure it in parsebot-backend/.env and restart the server.'
      });
    }
    const { message, sessionId = 'default' } = req.body;
    console.log(`Chat request for sessionId=${sessionId}, messageLength=${typeof message === 'string' ? message.length : 'n/a'}`);

    if (!message || (typeof message === 'string' && message.trim().length === 0)) {
      console.log(`Empty message received for sessionId=${sessionId}`);
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Ensure session exists before attempting retrieval
    const docInfo = ragSystem.getDocumentInfo(sessionId);
    if (!docInfo) {
      const existingIds = Array.from(ragSystem.documents?.keys?.() || []);
      console.log(`Chat failed: session not found: ${sessionId}. Existing sessions: ${existingIds.join(', ') || 'none'}`);
      return res.status(404).json({ 
        error: 'No PDF uploaded for this session. Please upload a PDF first.',
        details: `Missing sessionId=${sessionId}`
      });
    }

    // Get relevant context using RAG
    const ragContext = ragSystem.retrieveContext(sessionId, message, 3);

    // Prepare the RAG context
    const contextText = ragContext.context.map(chunk => 
      `[Relevant Section - Similarity: ${chunk.similarity.toFixed(3)}]\n${chunk.text}`
    ).join('\n\n');

    // Ensure we have context, fallback to all chunks if needed
    let finalContext = contextText.trim() || ragContext.context.map(chunk => chunk.text).join('\n\n');
    
    // If still empty, use a fallback message
    if (!finalContext || finalContext.length === 0) {
      finalContext = `Document: ${ragContext.filename}\nContent: PDF text extraction may have failed. Please try re-uploading the document.`;
      console.log(`Using fallback context - no chunks found`);
    }
    
    console.log(`Context length: ${finalContext.length} chars, chunks: ${ragContext.context.length}`);

    const systemPrompt = `
You are a question-answering assistant. 
Your goal is to provide accurate, concise answers based primarily on the given document. 
If the answer is not stated directly, use logical inference and well-known scientific or factual knowledge to infer the most likely answer. 
When inferring, clearly base your reasoning on clues or implications from the text. 
Do NOT invent information that contradicts the document. 
If the document is ambiguous, explain your reasoning briefly.

For every question:
1. Check if the answer is explicitly stated — quote or paraphrase it if so.
2. If not directly stated, reason logically using information implied by the text and common factual knowledge.
3. Respond with a short, factual answer (1–3 sentences maximum).

Example behavior:
- If the text says “The Earth orbits the Sun once every year” and you’re asked “How long is one Earth year?”, reply “About one year, or the time it takes Earth to orbit the Sun.”
- If the text mentions that “the giant planets are much more massive than the terrestrial ones” and you’re asked “Which planet is the largest?”, infer “Jupiter,” since it’s the most massive giant planet.

Now answer the user’s question using this reasoning approach.


Document: ${ragContext.filename}
Relevant Sections:
${contextText}

User Question: ${message}
Answer:`;

    // Use Gemini API instead of Hugging Face
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    let responseText;
    try {
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      responseText = response.text();

      console.log(`Gemini Response:`, responseText);
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      if (geminiError.message.includes('404') || geminiError.message.includes('not found')) {
        throw new Error(`Gemini model "${GEMINI_MODEL}" not found. Please check the model name in your .env file. Available models: gemini-1.5-pro, gemini-1.0-pro`);
      }
      if (geminiError.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in the .env file');
      }
      throw new Error(`Gemini API error: ${geminiError.message}`);
    }

    res.json({
      success: true,
      response: responseText,
      sessionId
    });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ 
      error: "Failed to process chat message", 
      details: error.message 
    });
  }
});


// Get session info endpoint
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const docInfo = ragSystem.getDocumentInfo(sessionId);
  
  if (!docInfo) {
    const existingIds = Array.from(ragSystem.documents?.keys?.() || []);
    console.log(`Session not found: ${sessionId}. Existing sessions: ${existingIds.join(', ') || 'none'}`);
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: sessionId,
    filename: docInfo.filename,
    chunkCount: docInfo.chunkCount,
    processedAt: docInfo.processedAt,
    system: 'RAG with TF-IDF'
  });
});

// List all active sessions (for debugging)
app.get('/api/sessions', (req, res) => {
  const all = [];
  for (const [id, info] of ragSystem.documents.entries()) {
    all.push({
      sessionId: id,
      filename: info.filename,
      chunkCount: info.chunkCount,
      processedAt: info.processedAt
    });
  }
  res.json({ count: all.length, sessions: all });
});

// Clear session endpoint
app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  const docInfo = ragSystem.getDocumentInfo(sessionId);
  if (docInfo) {
    ragSystem.clearDocument(sessionId);
    res.json({ success: true, message: 'Session cleared' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`ParseBot Backend running on port ${PORT}`);
  console.log(`RAG System: TF-IDF with intelligent chunking`);
  console.log(`PDF parsing and AI chat ready!`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Env check:   http://localhost:${PORT}/env-check`);
  console.log(`Gemini key present: ${Boolean(GEMINI_API_KEY)}`);
});

export default app;

