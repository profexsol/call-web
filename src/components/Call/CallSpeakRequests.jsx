import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { withTranslation } from 'react-i18next';
import bus from '../bus';
import i18next from "i18next";
import '../../assets/css/call/call_participant.css';
import '../../assets/css/call/call_raised_hands.css';

 class CallRaisedHands extends React.Component {
	constructor(props) {
		super(props);

        this.call = this.props.call;
        this.toast_id = 'speak-requests-toast';

		this.state = {
            show_me: false,
            users_requested: []
		};
	}

	componentDidMount() {
        this.attachBusListeners();
        this.attachCallListeners();   
	}

    componentWillUnmount() {
        toast.dismiss(this.toast_id);

		// fix Warning: Can't perform a React state update on an unmounted component
	    this.setState = (state, callback)=>{
	        return;
	    };
	}

    attachBusListeners() {
        bus.on('side_panel__hide_all', () => {
            this.hideMe();
        });

        bus.on('speak_requests__toggle', () => {
            if(this.state.show_me) {
                this.hideMe();
                return;
            }

            this.showMe();
        });
    }

    attachCallListeners() {
        this.props.rtc_client.onLeft = this.onLeft.bind(this);
        this.props.rtc_client.onSpeakRequest = this.onSpeakRequest.bind(this);
        this.props.rtc_client.onAudioSwitched = this.onAudioSwitched.bind(this);
    }

    onSpeakRequest({ user_id }) {
        var user = this.props.getUser(user_id);

        var users_requested = this.state.users_requested.filter(function(userrr) { 
			return userrr.id != user_id;
		});
        
        users_requested = [user, ...users_requested];
        this.setState({ users_requested });
        bus.dispatch('call_speak_requests__updated', users_requested);

        if(user_id != this.props.current_user.id) {
            this.showNotification(users_requested);
        }
    }

    onAudioSwitched({ is_audio_on, user_id }) {
        if(!is_audio_on) return;

        this.removeUserRequest(user_id);
    }

    onLeft(params) {
        var { user_id } = params;

        this.removeUserRequest(user_id);
    }

    allowToSpeak(user_id) {
        this.props.rtc_client.allowUserToSpeak({ target_user_id: user_id });
        this.removeUserRequest(user_id);
    }

    removeUserRequest(user_id) {
        var users_requested = this.state.users_requested.filter(function(userrr) { 
			return userrr.id != user_id;
		});
        
        this.setState({ users_requested });
        this.updateNotification(users_requested);
        bus.dispatch('call_speak_requests__updated', users_requested);
    }

    showNotification(users_requested) {
        if(this.updateNotification(users_requested)) return;

        toast.info(<SpeakRequestsToast users_requested={users_requested} showRequests={ this.showMe.bind(this) } />,
            {
                toastId: this.toast_id,
                position: "bottom-left",
                className: "call-toast",
                hideProgressBar: true,
                closeButton: true,
                pauseOnFocusLoss: false,
                autoClose: false
            }
        );
    }

    updateNotification(users_requested) {
        if(!users_requested.length) {
            toast.dismiss(this.toast_id);
            return;
        }

        if(toast.isActive(this.toast_id)) {
            toast.update(this.toast_id, {
                render: <SpeakRequestsToast users_requested={users_requested} showRequests={ this.showMe.bind(this) } />
            });

            return true;
        }
    }

    showMe() {
        bus.dispatch('side_panel__hide_all');

        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 1, section_name: 'speak-requests'}
        );

        this.setState({ show_me: true });
    }

    hideMe() {
        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 0, section_name: 'speak-requests'}
        );

        this.setState({ show_me: false });
    }

	render() {
		return (
        <div className={"side-panel raised-hands-section" + (this.state.show_me ? '' : ' d-none')}> 
        
            <div className='side-panel-header'>
                <span>{ i18next.t("Speak Requests") }</span>

                <div className='actions'>
                    <i class="fas fa-times action" onClick={ () => this.hideMe() }></i>
                </div>
            </div>
            
            <div className='side-panel-body raised-hands-container'>
                { this.state.users_requested.map(user => {

                    return (
                    <div className="participant">
                        <div className="left-side w-100">
                            <img
                                className="profile-picture"
                                src={user.profile_picture_url}
                            />

                            <span className="full-name">
                                { user.first_name + ' ' + user.last_name }
                            </span>
                        </div>

                        <div className='right-side text-right'>
                            <button className='button btn-info' onClick={ () => this.allowToSpeak(user.id) }>
                                { i18next.t("Allow To Speak") }
                            </button>
                        </div>
                    </div>
                    )

                })}

                {  
                    !this.state.users_requested.length &&

                    <i className='no-record'>
                        {i18next.t("noOneRaisedHand")}
                    </i>
                }
            </div>
        </div>
        )
	}
}

const SpeakRequestsToast = ({ users_requested, showRequests }) => {
    const [toastText, setToastText] = useState('');

    useEffect(() => {
        var first_user_names = [];
        users_requested.forEach((user, i) => {
            if(i == 3) return;
            first_user_names.push(user.name);
        });

        var toast_text = first_user_names.join(', ');
        if(users_requested.length > 3) {
            toast_text += ` and ${users_requested.length - 3} other(s)`;
        }

        toast_text += ' ' + i18next.t('have requested to speak');

        setToastText(toast_text);
    }, [users_requested]);
    
    return (
    <div className="toast-inner hand-raised-toast">
        <i className="fas fa-hand-paper icon"></i>
        
        <div className='toast-main-body'>
            { toastText }

            <div className='view-btn' onClick={ () => showRequests() }>
                { i18next.t("View") }
            </div>
        </div>
    </div>
    );
}

export default withTranslation()(CallRaisedHands);