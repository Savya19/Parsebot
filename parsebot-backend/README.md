# ParseBot Backend

A powerful backend service for parsing PDF documents and answering questions using AI.

## Features

- 📄 PDF parsing and text extraction
- 🤖 AI-powered question answering using Hugging Face Inference API
- 🔒 Secure file upload handling
- ⚡ Fast and efficient processing
- 🛡️ Rate limiting and security middleware
- 📊 Session management for multiple users

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   - Copy `env.example` to `.env`
   - Add your Hugging Face API key:
     ```
     HF_API_KEY=your_hf_api_key_here
     ```

3. **Run the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### Upload PDF
```
POST /api/upload-pdf
```
Upload and parse a PDF file.
- **Body:** FormData with `pdf` file and optional `sessionId`
- **Response:** Upload confirmation with parsing details

### Chat
```
POST /api/chat
```
Ask questions about the uploaded PDF.
- **Body:** JSON with `message` and optional `sessionId`
- **Response:** AI-generated answer based on PDF content

### Session Management
```
GET /api/session/:sessionId
DELETE /api/session/:sessionId
```
Get session info or clear a session.

## Usage Example

1. Upload a PDF:
   ```javascript
   const formData = new FormData();
   formData.append('pdf', pdfFile);
   formData.append('sessionId', 'user123');
   
   fetch('/api/upload-pdf', {
     method: 'POST',
     body: formData
   });
   ```

2. Ask questions:
   ```javascript
   fetch('/api/chat', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: 'What is the main topic of this document?',
       sessionId: 'user123'
     })
   });
   ```

## Security Features

- File type validation (PDF only)
- File size limits (10MB)
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input sanitization

## Production Considerations

- Use a proper database instead of in-memory storage
- Implement user authentication
- Add file encryption
- Set up proper logging
- Configure HTTPS
- Use environment-specific configurations

