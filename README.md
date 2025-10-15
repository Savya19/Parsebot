# 🤖 ParseBot - AI PDF Assistant

A powerful full-stack application that allows you to upload PDF documents and ask intelligent questions about their content using AI.

## ✨ Features

- 📄 **PDF Upload & Parsing**: Upload PDF files and extract text content
- 🤖 **AI-Powered Q&A**: Ask questions about your PDF documents using Google Gemini AI
- 🎨 **Modern UI**: Clean and intuitive React frontend
- ⚡ **Real-time Chat**: Interactive chat interface with loading states
- 🔒 **Secure**: File validation, rate limiting, and CORS protection
- 📱 **Responsive**: Works on desktop and mobile devices
- 💰 **Cost Effective**: Uses Google Gemini API with competitive pricing

## 🏗️ Architecture

- **Frontend**: React + Vite (Port 5173)
- **Backend**: Node.js + Express (Port 3001)
- **AI**: Google Gemini API
- **PDF Processing**: pdf-parse library

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Google Gemini API key

### Installation

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd parsebot-full-stack
   npm run setup
   ```

2. **Get Gemini API Key:**
   - Visit [Google AI Studio](https://ai.google.dev/tutorials/setup)
   - Sign in with your Google account
   - Click "Get API Key" to generate a new key

3. **Configure environment:**
   ```bash
   cd parsebot-backend
   cp env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

This will start both the backend (http://localhost:3001) and frontend (http://localhost:5173) servers.


## 📖 Usage

1. **Upload a PDF**: Click the `+` button to upload a PDF document
2. **Ask Questions**: Type questions about the PDF content in the chat
3. **Get AI Answers**: Receive intelligent, context-aware responses



## 🛠️ Development

### Manual Setup

If you prefer to run servers separately:

**Backend:**
```bash
cd parsebot-backend
npm install
npm start
```

**Frontend:**
```bash
cd parsebot
npm install
npm run dev
```

### Environment Variables

Create `parsebot-backend/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## 🔧 API Endpoints

### Upload PDF
```
POST /api/upload-pdf
Content-Type: multipart/form-data
Body: { pdf: File, sessionId: string }
```

### Chat
```
POST /api/chat
Content-Type: application/json
Body: { message: string, sessionId: string }
```

### Health Check
```
GET /health
```

## 🛡️ Security Features

- File type validation (PDF only)
- File size limits (10MB)
- Rate limiting (100 requests/15min)
- CORS protection
- Input sanitization
- Helmet security headers

## 📁 Project Structure

```
Unthinkable-Project/
├── parsebot/                 # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   └── assets/          # Images and icons
│   └── package.json
├── parsebot-backend/         # Node.js backend
│   ├── server.js            # Main server file
│   ├── .env
|   |── rag-system.js 
│   └── package.json
├── start-parsebot.js        # Startup script
└── package.json            # Root package.json
```

## 🚀 Production Deployment

For production deployment:

1. **Environment Setup:**
   - Use a proper database instead of in-memory storage
   - Set up HTTPS
   - Configure proper logging
   - Use environment-specific configs

2. **Frontend Build:**
   ```bash
   cd parsebot
   npm run build
   ```

3. **Backend:**
   ```bash
   cd parsebot-backend
   npm start
   ```


## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter any issues:

1. Check that both servers are running
2. Verify your Gemini API key is correctly set
3. Ensure your PDF file is valid and under 10MB
4. Check the browser console for errors

## 🎯 Future Enhancements

- [ ] Support for multiple file formats (DOCX, TXT)
- [ ] User authentication and sessions
- [ ] PDF annotation and highlighting
- [ ] Export chat conversations
- [ ] Advanced search within PDFs
- [ ] Batch processing of multiple PDFs

## Demo Video Link
https://drive.google.com/file/d/1MbINlHwqXQR2HeYdqtNwYskpQ96QhOZD/view?usp=drive_link

