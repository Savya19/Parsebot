import natural from 'natural';
import fs from 'fs';

class RAGSystem {
  constructor() {
    this.documents = new Map(); // sessionId -> chunks
    this.embeddings = new Map(); // sessionId -> embeddings
    this.vectorIndex = new Map(); // sessionId -> FAISS-like index
    this.chunkSize = 1000; // characters per chunk
    this.chunkOverlap = 200; // overlap between chunks
  }

  // Simple text chunking function
  chunkText(text, chunkSize = this.chunkSize, overlap = this.chunkOverlap) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);
      
      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentence, lastNewline);
        
        if (breakPoint > start + chunkSize * 0.5) {
          chunk = text.slice(start, start + breakPoint + 1);
          start = start + breakPoint + 1 - overlap;
        } else {
          start = end - overlap;
        }
      } else {
        start = end;
      }
      
      if (chunk.trim().length > 50) { // Only add meaningful chunks
        chunks.push({
          text: chunk.trim(),
          start: start - chunk.length,
          end: start
        });
      }
    }
    
    return chunks;
  }

  // Simple TF-IDF based similarity (lightweight alternative to embeddings)
  calculateTFIDF(chunks) {
    const tfidf = new natural.TfIdf();
    const documents = chunks.map(chunk => chunk.text);
    
    // Add all documents to TF-IDF
    documents.forEach(doc => tfidf.addDocument(doc));
    
    // Calculate TF-IDF scores for each document
    const tfidfScores = documents.map((doc, docIndex) => {
      const scores = {};
      tfidf.listTerms(docIndex).forEach(item => {
        scores[item.term] = item.tfidf;
      });
      return scores;
    });
    
    return tfidfScores;
  }

  // Find most relevant chunks based on query
  findRelevantChunks(query, chunks, tfidfScores, topK = 3) {
    const queryTokens = new natural.WordTokenizer().tokenize(query.toLowerCase());
    const queryTfidf = new Map();
    
    // Calculate query TF-IDF
    queryTokens.forEach(token => {
      const cleanToken = natural.PorterStemmer.stem(token);
      queryTfidf.set(cleanToken, (queryTfidf.get(cleanToken) || 0) + 1);
    });
    
    // Calculate similarity scores
    const similarities = chunks.map((chunk, index) => {
      const scores = tfidfScores[index];
      let similarity = 0;
      
      queryTfidf.forEach((queryFreq, term) => {
        const docScore = scores[term] || 0;
        similarity += queryFreq * docScore;
      });
      
      return {
        chunk,
        similarity,
        index
      };
    });
    
    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(item => item.similarity > 0);
  }

  // Store document chunks with RAG indexing
  storeDocument(sessionId, text, filename) {
    console.log(`Processing document for session: ${sessionId}`);
    
    // Chunk the text
    const chunks = this.chunkText(text);
    console.log(`Created ${chunks.length} chunks`);
    
    // Calculate TF-IDF scores
    const tfidfScores = this.calculateTFIDF(chunks);
    
    // Store in memory
    this.documents.set(sessionId, {
      chunks,
      tfidfScores,
      filename,
      processedAt: new Date().toISOString(),
      chunkCount: chunks.length
    });
    
    console.log(`Document stored with ${chunks.length} chunks`);
    return chunks.length;
  }

  // Retrieve relevant context for a query
  retrieveContext(sessionId, query, topK = 3) {
    const docData = this.documents.get(sessionId);
    if (!docData) {
      throw new Error('No document found for this session');
    }

    console.log(`Searching for context: "${query}"`);
    
    // Find relevant chunks
    const relevantChunks = this.findRelevantChunks(
      query, 
      docData.chunks, 
      docData.tfidfScores, 
      topK
    );

    console.log(`Found ${relevantChunks.length} relevant chunks`);
    
    // Combine relevant chunks into context
    const context = relevantChunks.map(item => ({
      text: item.chunk.text,
      similarity: item.similarity,
      start: item.chunk.start,
      end: item.chunk.end
    }));

    return {
      context,
      totalChunks: docData.chunks.length,
      relevantChunks: relevantChunks.length,
      filename: docData.filename
    };
  }

  // Clear document data
  clearDocument(sessionId) {
    this.documents.delete(sessionId);
    this.embeddings.delete(sessionId);
    this.vectorIndex.delete(sessionId);
    console.log(`Cleared document data for session: ${sessionId}`);
  }

  // Get document info
  getDocumentInfo(sessionId) {
    const docData = this.documents.get(sessionId);
    if (!docData) return null;
    
    return {
      filename: docData.filename,
      chunkCount: docData.chunkCount,
      processedAt: docData.processedAt
    };
  }
}

export default RAGSystem;
