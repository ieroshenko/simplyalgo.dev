import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse-new';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

// Ensure upload directory exists before Multer tries to use it
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const PORT = process.env.RESUME_SERVER_PORT || 3002;

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(pdf|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Resume parser server running' });
});

// Create ephemeral Realtime session token
app.post('/api/ephemeral-token', async (req, res) => {
  try {
    const apiKey = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: req.body?.model || 'gpt-realtime',
        voice: req.body?.voice || 'verse',
        modalities: ['text', 'audio'],
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[ResumeParser] Failed to create session:', text);
      return res.status(500).json({ error: 'Failed to create session', detail: text });
    }

    const data = await response.json();
    const token = data?.client_secret?.value;
    if (!token) {
      return res.status(500).json({ error: 'No ephemeral token in response' });
    }

    console.log('[ResumeParser] Created ephemeral token successfully');
    res.json({ token });
  } catch (err) {
    console.error('[ResumeParser] Error creating ephemeral token:', err);
    res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

// Resume upload and parsing endpoint
app.post('/api/upload-resume', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();

    console.log(`[ResumeParser] Processing: ${fileName}`);

    let text = '';

    try {
      if (req.file.mimetype === 'application/pdf' || fileExt === '.pdf') {
        // Parse PDF using pdf-parse-new
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text || '';
        console.log(`[ResumeParser] Extracted ${text.length} chars from PDF`);

      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 fileExt === '.docx') {
        // Parse DOCX using mammoth
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
        console.log(`[ResumeParser] Extracted ${text.length} chars from DOCX`);

      } else {
        // Plain text
        text = fs.readFileSync(filePath, 'utf8');
        console.log(`[ResumeParser] Read ${text.length} chars from TXT`);
      }

      // Clean up uploaded file
      fs.unlink(filePath, (err) => {
        if (err) console.error('[ResumeParser] Failed to delete temp file:', err);
      });

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          error: 'No text extracted from file'
        });
      }

      const cleaned = text.trim();
      const preview = cleaned.slice(0, 500);
      console.log('[ResumeParser] Text preview:', preview);
      if (cleaned.length > preview.length) {
        console.log('[ResumeParser] Text preview truncated (showing first 500 characters)');
      }

      res.json({ text: text.trim() });

    } catch (parseError) {
      // Clean up on error
      fs.unlink(filePath, () => {});
      console.error('[ResumeParser] Parse error:', parseError);
      throw parseError;
    }

  } catch (error) {
    console.error('[ResumeParser] Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to parse resume'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[ResumeParser] Middleware error:', error);
  res.status(500).json({
    error: error.message || 'Internal server error'
  });
});

app.listen(PORT, (error) => {
  if (error) {
    console.error(`[ResumeParser] Failed to start on port ${PORT}`, error);
    process.exit(1);
  }

  console.log(`[ResumeParser] Server running on http://localhost:${PORT}`);
  console.log(`[ResumeParser] Ready to parse resumes (PDF, DOCX, TXT)`);
});
