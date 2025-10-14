import dayjs from 'dayjs';
import RobotProfileImage from '../assets/robot.png';
import UserProfileImage from '../assets/user.png';
import './ChatMessage.css';

export function ChatMessage ({message, imgname, time}) {
    //const { message, imgname } = props;

    /*
    if(imgname == 'robot'){
        return (
            <div>
                <img src = "robot.png" width = "50" />
                {message}
            </div>
        );
    } */
    return (
        <div className = {
            imgname === 'robot'
            ? 'chat-message-robot'
            : 'chat-message-user'
        }>
            {imgname === 'robot' && (
                <img src = {RobotProfileImage}
                className = "chat-message-image"
                />
            )}
            <div className = "chat-message-text">
                {message}
                {time && (
                    <div className = "chat-msg-time">
                        {dayjs(time).format('h:mma')}
                    </div>
                )}
            </div>
            {imgname === 'user' && (
                <img src = {UserProfileImage}
                className = "chat-message-image"
                />
            )}
        </div>
    );
}