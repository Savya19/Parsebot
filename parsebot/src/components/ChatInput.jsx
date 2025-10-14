import { useState, useEffect } from 'react';
import LoadingSpinner from '../assets/loading-spinner.gif';
import './ChatInput.css';
import dayjs from 'dayjs';

export function ChatInput({chatMessage, setChatMessage}){
    const [inputText, setInputText] = useState('');
    const [isLoading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [sessionId] = useState(() => {
        const saved = localStorage.getItem('parsebot_session_id');
        const id = saved || crypto.randomUUID();
        if (!saved) localStorage.setItem('parsebot_session_id', id);
        return id;
    });
    const [pdfUploaded, setPdfUploaded] = useState(false);

    function saveInputText(event){
        setInputText(event.target.value);
    }

    
    async function uploadPDF(file) {
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('sessionId', sessionId);

        try {
            const response = await fetch('http://localhost:3001/api/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            
            if (response.ok) {
                if (result.sessionId) {
                    localStorage.setItem('parsebot_session_id', result.sessionId);
                }
                setPdfUploaded(true);
                // Add system message about PDF upload
                const uploadMessage = {
                    message: ` PDF "${result.filename}" uploaded successfully! You can now ask questions about this document.`,
                    imgname: 'robot',
                    id: crypto.randomUUID(),
                    time: dayjs().valueOf()
                };
                setChatMessage(prev => [...prev, uploadMessage]);
                return true;
            } else {
                const details = result.details ? ` (${result.details})` : '';
                throw new Error((result.error || 'Failed to upload PDF') + details);
            }
        } catch (error) {
            console.error('PDF upload error:', error);
            alert('Failed to upload PDF: ' + error.message);
            return false;
        }
    }

    async function sendMessage(){
        if (!pdfUploaded) {
            alert('Please upload a PDF file first before asking questions.');
            return;
        }

        const newChatMessage = [
            ...chatMessage,
            {
                message: inputText,
                imgname: 'user',
                id: crypto.randomUUID(),
                time: dayjs().valueOf()
            },
            {
                message: <img src ={LoadingSpinner} width = "50" />,
                imgname: 'robot',
                id: crypto.randomUUID(),
                time: dayjs().valueOf()
            }
        ]
        setLoading(true); 
        setChatMessage(newChatMessage);

        const currentInput = inputText;
        setInputText('');

        try {
            // Quick session pre-check using latest stored session id
            const activeSessionId = localStorage.getItem('parsebot_session_id') || sessionId;
            const sessionCheck = await fetch(`http://localhost:3001/api/session/${activeSessionId}`);
            if (!sessionCheck.ok) {
                setChatMessage([
                    ...newChatMessage.slice(0, newChatMessage.length -1),
                    {
                        message: 'No PDF found for this session. Please upload your PDF again (press +) and then ask your question.',
                        imgname: 'robot',
                        id: crypto.randomUUID(),
                        time: dayjs().valueOf()
                    }
                ]);
                setLoading(false);
                return;
            }

            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: currentInput,
                    sessionId: activeSessionId
                }),
            });

            const result = await response.json();
            
            if (response.ok) {
                setChatMessage([
                    ...newChatMessage.slice(0, newChatMessage.length -1),
                    {
                        message: result.response,
                        imgname: 'robot',
                        id: crypto.randomUUID(),
                        time: dayjs().valueOf()
                    }
                ]);
            } else {
                const details = result.details ? ` (${result.details})` : '';
                throw new Error((result.error || 'Failed to get response') + details);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setChatMessage([
                ...newChatMessage.slice(0, newChatMessage.length -1),
                {
                    message: `Sorry, I encountered an error: ${error.message}`,
                    imgname: 'robot',
                    id: crypto.randomUUID(),
                    time: dayjs().valueOf()
                }
            ]);
        }
        
        setLoading(false); 
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }else if(event.key === 'Escape'){
            setInputText('');
        }
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setUploadedFile(file);
            // Automatically upload the PDF when selected
            await uploadPDF(file);
        } else if (file) {
            alert('Please select a PDF file only.');
        }
        // Reset the input value to allow selecting the same file again
        event.target.value = '';
    }

    function removeFile() {
        setUploadedFile(null);
        setPdfUploaded(false);
        document.getElementById('pdf-upload').value = '';
        // Add message about file removal
        const removeMessage = {
            message: ' PDF file removed. Please upload a new PDF to continue asking questions.',
            imgname: 'robot',
            id: crypto.randomUUID(),
            time: dayjs().valueOf()
        };
        setChatMessage(prev => [...prev, removeMessage]);
    }

    function triggerFileUpload() {
        document.getElementById('pdf-upload').click();
    }

    return (
        <div className = "chat-input-container">
            <div className="input-wrapper">
                <input 
                    placeholder = 'Send a message to chatbot' 
                    size = "30"
                    onChange = {saveInputText}
                    value = {inputText}
                    onKeyDown = {handleKeyDown}
                    disabled = {isLoading}
                    className = "chat-input"
                />
                <button 
                    onClick = {triggerFileUpload}
                    className = "plus-button"
                    title="Upload PDF"
                    disabled = {isLoading}
                >
                    +
                </button>
                <input
                    type="file"
                    id="pdf-upload"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    style={{display: 'none'}}
                />
            </div>
            {uploadedFile && (
                <div className="file-indicator">
                    <span className="file-info">
                        📄 {uploadedFile.name} {pdfUploaded ? '✅' : '⏳'}
                    </span>
                    <button 
                        onClick={removeFile}
                        className="remove-file-button"
                        title="Remove file"
                    >
                        ×
                    </button>
                </div>
            )}
            <button 
                onClick = {sendMessage}
                className = "send-button"
                disabled = {isLoading}
            >Send</button>
        </div>
    );
};

//export default ChatInput; 