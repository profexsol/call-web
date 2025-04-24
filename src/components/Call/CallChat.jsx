import React from 'react';
import bus from "../bus";
import JustMessagesListing from "../Messages/JustMessagesListing";
import JustAddMessage from "../Messages/JustAddMessage";
import MessagesListing from "../Messages/MessagesListing";
import AddMessage from "../Messages/AddMessage";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import  { withTranslation }  from 'react-i18next';
import i18next from "i18next";
import NewMessageSound from "../../assets/audios/new_message.mp3"
import "../../assets/css/call/call_chat.css";
import { AppContext } from 'components/Contexts';

class CallChat extends React.Component {
    static contextType = AppContext;

	constructor(props) {
		super(props);

        this.just_messages_listing_ref = React.createRef();

        this.state = {
            show_me: false
        }

        this.attachBusListeners();

        this.message_sound = new Audio(NewMessageSound);
        this.message_sound.volume = '0.6';
	}

    componentDidMount() {
        this.attachSocketListeners();
    }

    attachBusListeners() {
        bus.on('side_panel__hide_all', () => {
            this.hideMe();
        });

        bus.on('chat__toggle', () => {
            if(this.state.show_me) {
                this.hideMe();
                return;
            }

            this.showMe();
        });
    }

    attachSocketListeners() {
    }

    onNewMessage(message) {
        if(!message) return;

        var author = message.author || {};
        var user_name = message.user_id ? `${author.first_name} ${author.last_name}` : message.user_name;
        var message_text = message.text;
        if(message_text && message_text.length > 100) {
            message_text = message_text.substring(0,100);
        }

        toast.info(() => {
            return (
                <div className="toast-inner new-message-toast">
                    <i className="fas fa-comment-dots icon"></i>
                    
                    <div className='toast-main-body'>
                        { user_name }
                        <p className='m-0'>
                            { message_text || `(${ i18next.t('File') })` }
                        </p>

                        <div className='view-btn' onClick={ () => this.showMe() }>
                            { i18next.t("View") }
                        </div>
                    </div>
                </div>
            )},
            {
                position: "bottom-right",
                className: "call-toast",
                hideProgressBar: true,
                closeButton: true,
                pauseOnFocusLoss: true,
                autoClose: 15000
            }
        );

        this.message_sound.currentTime = 0;
        this.message_sound.play();
    }

    onBreakoutRoomMessage(params) {
        var { message } = params;
    
        this.just_messages_listing_ref.current.onNewMessage({ message });
    }

    sendBreakoutRoomMessage(params) {
        var { message } = params;
    
        this.props.rtc_client.notifyOtherUsers({
            event: "breakout-room-message",
            data: {
                message
            }
        });
    }

    showMe() {
        bus.dispatch('side_panel__hide_all');

        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 1, section_name: 'chat'}
        );

        this.setState({ show_me: true });
        setTimeout(() => {
            bus.dispatch('messages_listing__scroll_to_bottom');
        }, 1000);
    }

    hideMe() {
        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 0, section_name: 'chat'}
        );

        this.setState({ show_me: false });
    }

    render() {
        return (
        <div className={"side-panel chat-section" + (this.state.show_me ? '' : ' d-none')}> 
            
            <div className='side-panel-header'>
                <span>{ i18next.t("Chat") }</span>

                <div className='actions'>
                    {/* <i class="fas fa-angle-down action"></i> */}
                    <i class="fas fa-times action" onClick={ () => this.hideMe() }></i>
                </div>
            </div>
            
            <div className='side-panel-body'>
                { !this.props.breakout_room 
                    
                    ? (
                    <>
                    <MessagesListing
                        id={this.props.record_id}
                        type={this.props.record_type}
                    />
                
                    <AddMessage
                        host={this.props.is_host}
                        chat={this.props.chat}
                        id={this.props.record_id}
                        type={this.props.record_type}
                        current_user={this.props.current_user}
                        users={ Object.values(this.props.participants).map(a => a.user || {}) }
                    />
                    </>
                    
                    ) : (
                    <>
                    <JustMessagesListing
                        ref={this.just_messages_listing_ref}
                    />
                    {/* Yoonus added to check if chat enabled or disabled */}
                    <JustAddMessage   chat={this.props.chat}
                        sendMessage={this.sendBreakoutRoomMessage.bind(this)}
                    />
                    </>
                )}
            </div>
        </div>
        )
    }
}

export default withTranslation()(CallChat);