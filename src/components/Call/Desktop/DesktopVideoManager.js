import React, { useEffect, useState } from 'react';
import VideoStreamsManager from "../VideoManager";
import bus from 'components/bus';
import Draggable from 'react-draggable';

function DesktopVideoManager(props) {
    const [speaking_user, setSpeakingUser] = useState({});

    useEffect(() => {
        attachCallListeners();
    });

    const attachCallListeners = () => {
        props.rtc_client.onSpeaking = onSpeaking;
        props.rtc_client.onStoppedSpeaking = onStoppedSpeaking
    }

    const onSpeaking = ({ user_id }) => {
        var participant = this.props.rtc_client.participants[user_id] || {};
        setSpeakingUser(participant.user);
    }

    const onStoppedSpeaking = ({ user_id }) => {
        if(speaking_user.id != user_id) return;

        setSpeakingUser({});
    }

    const switchToMinimizedView = () => {
        bus.dispatch('desktop-call--switch-view', 'minimized');
    }

    const switchToSpeakerView = () => {
        bus.dispatch('desktop-call--switch-view', 'speaker');
    }

    const switchToGalleryView = () => {
        bus.dispatch('desktop-call--switch-view', 'gallery');
    }

    return (
        <Draggable 
            handle='.desktop-videos-area'
            bounds='body'
            disabled={ props.layout_type != 'shared-screen' }>
            
            <div className='desktop-videos-area'>
                { 
                    props.layout_type == 'shared-screen' &&
                    
                    <div className='toolbar'>
                        <i class="fas fa-minus control minimized" onClick={ switchToMinimizedView }></i>
                        <i class="fas fa-grip-lines control speaker" onClick={ switchToSpeakerView }></i>
                        <i class="fas fa-th-large control gallery" onClick={ switchToGalleryView }></i>
                    </div>

                }

                <div className='speaking-container'>
                    Speaking: { speaking_user.name }
                </div>

                <VideoStreamsManager { ...props } />
            </div>
        </Draggable>
    )
}

export default DesktopVideoManager;