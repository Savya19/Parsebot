//import React from 'react'
import { useState } from 'react'
import './App.css'
import { ChatInput } from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
 

function App () {
    const [chatMessage, setChatMessage] = useState([]);
    //const [chatMessage, setChatMessage] =array;
    //const chatMessage = array[0];
    //const setChatMessage = array[1];



    return (
        <div className = "app-container">
            {chatMessage.length === 0 && (
                <div className = "welcome-msg">
                    <h2>ParseBot</h2>
                    <p>Click the <strong>+</strong> button to upload a PDF, then start chatting.</p>
                </div>
            )}
            <ChatMessages
                chatMessage = {chatMessage}
            />
            <ChatInput 
                chatMessage = {chatMessage}
                setChatMessage = {setChatMessage}
            /> 
        </div>
    );
}

export default App
