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
        this.toast_id = 'raised-hands-toast';

		this.state = {
            show_me: false,
            users_raised_hand: []
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

        bus.on('raised_hands__toggle', () => {
            if(this.state.show_me) {
                this.hideMe();
                return;
            }

            this.showMe();
        });
    }

    attachCallListeners() {
        this.props.rtc_client.onLeft = this.onLeft.bind(this);
        this.props.rtc_client.onHandRaised = this.onHandRaised.bind(this);
        this.props.rtc_client.onHandLowered = this.onHandLowered.bind(this);
    }

    onHandRaised({ user_id }) {
        var user = this.props.getUser(user_id);
        
        var users_raised_hand = this.state.users_raised_hand.filter(function(userrr) { 
			return userrr.id != user_id;
		});
        
        users_raised_hand = [user, ...users_raised_hand];
        this.setState({ users_raised_hand });
        bus.dispatch('call_raised_hands__updated', users_raised_hand);

        if(user_id != this.props.current_user.id) {
            this.showNotification(users_raised_hand);
        }
    }

    onHandLowered({ user_id }) {
        var users_raised_hand = this.state.users_raised_hand.filter(function(userrr) { 
			return userrr.id != user_id;
		});
        
        this.setState({ users_raised_hand });
        this.updateNotification(users_raised_hand);
        bus.dispatch('call_raised_hands__updated', users_raised_hand);
    }

    onLeft(params) {
        var { user_id } = params;

        this.onHandLowered({ user_id });
    }

    showNotification(users_raised_hand) {
        if(this.updateNotification(users_raised_hand)) return;

        toast.info(<RaiseHandsToast users_raised_hand={users_raised_hand} showRaisedHands={ this.showMe.bind(this) } />,
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

    updateNotification(users_raised_hand) {
        if(!users_raised_hand.length) {
            toast.dismiss(this.toast_id);
            return;
        }

        if(toast.isActive(this.toast_id)) {
            toast.update(this.toast_id, {
                render: <RaiseHandsToast users_raised_hand={users_raised_hand} showRaisedHands={ this.showMe.bind(this) } />
            });

            return true;
        }
    }

    lowerUserHand(user_id) {
        this.props.rtc_client.notifyTheseUsers({
            event: "lower-user-hand",
            user_ids: [user_id]
        });
    }

    showMe() {
        bus.dispatch('side_panel__hide_all');

        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 1, section_name: 'raised-hands'}
        );

        this.setState({ show_me: true });
    }

    hideMe() {
        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 0, section_name: 'raised-hands'}
        );

        this.setState({ show_me: false });
    }

	render() {
		return (
        <div className={"side-panel raised-hands-section" + (this.state.show_me ? '' : ' d-none')}> 
        
            <div className='side-panel-header'>
                <span>{ i18next.t("See Raised Hands") }</span>

                <div className='actions'>
                    <i class="fas fa-times action" onClick={ () => this.hideMe() }></i>
                </div>
            </div>
            
            <div className='side-panel-body raised-hands-container'>
                { this.state.users_raised_hand.map(user => {

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
                            <button className='button btn-info' onClick={ () => this.lowerUserHand(user.id) }>
                                { i18next.t("Lower Hand") }
                            </button>
                        </div>
                    </div>
                    )

                })}

                {  
                    !this.state.users_raised_hand.length &&

                    <i className='no-record'>
                        {i18next.t("noOneRaisedHand")}
                    </i>
                }
            </div>
        </div>
        )
	}
}

const RaiseHandsToast = ({ users_raised_hand, showRaisedHands }) => {
    const [toastText, setToastText] = useState('');

    useEffect(() => {
        var first_user_names = [];
        users_raised_hand.forEach((user, i) => {
            if(i == 3) return;
            first_user_names.push(user.name);
        });

        var toast_text = first_user_names.join(', ');
        if(users_raised_hand.length > 3) {
            toast_text += ` and ${users_raised_hand.length - 3} other(s)`;
        }

        toast_text += ' ' + i18next.t('have raised hand') + '(s)';

        setToastText(toast_text);
    }, [users_raised_hand]);
    
    return (
    <div className="toast-inner hand-raised-toast">
        <i className="fas fa-hand-paper icon"></i>
        
        <div className='toast-main-body'>
            { toastText }

            <div className='view-btn' onClick={ () => showRaisedHands() }>
                { i18next.t("View") }
            </div>
        </div>
    </div>
    );
}

export default withTranslation()(CallRaisedHands);