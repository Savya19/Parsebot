import natural from 'natural';
import fs from 'fs';

class RAGSystem {
  constructor() {
    this.documents = new Map();
    this.embeddings = new Map(); 
    this.vectorIndex = new Map(); 
    this.chunkSize = 1000; 
    this.chunkOverlap = 200; 
  }

  
  chunkText(text, chunkSize = this.chunkSize, overlap = this.chunkOverlap) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);
      
      
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
      
      if (chunk.trim().length > 50) { 
        chunks.push({
          text: chunk.trim(),
          start: start - chunk.length,
          end: start
        });
      }
    }
    
    return chunks;
  }

  
  calculateTFIDF(chunks) {
    const tfidf = new natural.TfIdf();
    const documents = chunks.map(chunk => chunk.text);
    
   
    documents.forEach(doc => tfidf.addDocument(doc));
    
    
    const tfidfScores = documents.map((doc, docIndex) => {
      const scores = {};
      tfidf.listTerms(docIndex).forEach(item => {
        scores[item.term] = item.tfidf;
      });
      return scores;
    });
    
    return tfidfScores;
  }

  
  findRelevantChunks(query, chunks, tfidfScores, topK = 3) {
    const queryTokens = new natural.WordTokenizer().tokenize(query.toLowerCase());
    const queryTfidf = new Map();
    
    
    queryTokens.forEach(token => {
      const cleanToken = natural.PorterStemmer.stem(token);
      queryTfidf.set(cleanToken, (queryTfidf.get(cleanToken) || 0) + 1);
    });
    
   
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
    
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(item => item.similarity > 0);
  }

 
  storeDocument(sessionId, text, filename) {
    console.log(`Processing document for session: ${sessionId}`);
    
    
    const chunks = this.chunkText(text);
    console.log(`Created ${chunks.length} chunks`);
    
    const tfidfScores = this.calculateTFIDF(chunks);
    
  
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


  retrieveContext(sessionId, query, topK = 3) {
    const docData = this.documents.get(sessionId);
    if (!docData) {
      throw new Error('No document found for this session');
    }

    console.log(`Searching for context: "${query}"`);
    
    
    const relevantChunks = this.findRelevantChunks(
      query, 
      docData.chunks, 
      docData.tfidfScores, 
      topK
    );

    console.log(`Found ${relevantChunks.length} relevant chunks`);
    
    
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

 
  clearDocument(sessionId) {
    this.documents.delete(sessionId);
    this.embeddings.delete(sessionId);
    this.vectorIndex.delete(sessionId);
    console.log(`Cleared document data for session: ${sessionId}`);
  }

  
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
