import { useAutoScroll } from './useAutoScroll';
import { ChatMessage } from './ChatMessage';
import './ChatMessages.css';

function ChatMessages ({chatMessage}){
    const chatMessageRef = useAutoScroll([chatMessage]);

    return (
        <div className = "chat-messages-container"
        ref = {chatMessageRef}>
            
            {chatMessage.map((chatMessage) => {
                return (
                    <ChatMessage 
                        message = {chatMessage.message}
                        imgname = {chatMessage.imgname}
                        time = {chatMessage.time}
                        key = {chatMessage.id}
                    />
                );
            })}
        </div>
    );
};

export default ChatMessages;