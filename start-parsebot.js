#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting ParseBot - AI PDF Assistant...\n');

// Start backend
console.log('Starting backend server...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'parsebot-backend'),
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  console.log(`[Backend] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data.toString().trim()}`);
});

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  console.log('\n Starting frontend development server...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'parsebot'),
    stdio: 'pipe',
    shell: true
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[Frontend] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.error(`[Frontend Error] ${data.toString().trim()}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n Shutting down ParseBot...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });

}, 3000);

console.log('\n ParseBot is starting up!');
console.log('Backend will be available at: http://localhost:3001');
console.log('Frontend will be available at: http://localhost:5173');
console.log('\n Make sure to set your HF_API_KEY in parsebot-backend/.env');
console.log('Press Ctrl+C to stop both servers\n');






