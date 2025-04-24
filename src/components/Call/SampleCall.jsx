import React from "react";
import CallHandler from "./CallHandler";
import "font-awesome/css/font-awesome.min.css";
import * as common from "../../assets/js/helpers/common";
import bus from "../bus";
import $ from "jquery";
import { withTranslation } from "react-i18next";
import { AppContext } from "../Contexts";
import RtcHelpers from "../../assets/webrtc-client/src/rtc_helpers";
import "../../assets/css/call/wn_call.css";

class WnCall extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        
        this.chat_id = props.chat_id;
        this.chat = {};
        this.is_video = false;
        this.is_incoming = false;
        this.current_user = props.current_user;
        this.call_handler_ref = React.createRef();
        this.dial_tone_ref = React.createRef();
        this.timeout_id = false;

        this.state = {
            call_options: false,
            host_ids: [],
            is_host: false,
            user_status: '',
            call_status: '',
            show_closing_screen: false
        };
    }

    componentDidMount() {
        this.rtc_helpers = new RtcHelpers({ socket: this.context.ms_socket, user: this.current_user });
        this.attachSocketListeners(this.context.ms_socket);
        this.attachBusListeners();
        this.prepareJoinCall();

        window.prepareJoinCall = this.prepareJoinCall.bind(this);

        window.onbeforeunload = (event) => {
            this.notifyReject();
        };

        const channel = new BroadcastChannel('calling_broadcast');
        channel.onmessage = (event) => {
            if(event.data.leave_call) {
                this.leaveCall();

                setTimeout(() => {
                    window.close();
                }, 3000);
            }
        };        
    }

    componentWillUnmount() {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state, callback) => {
            return;
        };
    }

    attachBusListeners() {
        bus.on('ms_socket__connected', (socket) => {
            console.log('WnCall ms_socket__connected', this.wait_call_id);
            this.rtc_helpers.socket = socket;

            this.attachSocketListeners(socket);

            if(this.wait_call_id) {
                this.prepareJoinCall();
            }
        });

        bus.on("call__left", (data) => {
            console.log("call__left", data);

            this.onCallLeft(data);
        });

        bus.on("call__join_cancelled", () => {
            console.log("call__join_cancelled");

            this.resetThings();
        });

        bus.on('call__joined', ({ user_id }) => {
            this.onCallJoined({ user_id });
        });
    }

    attachSocketListeners(socket) {
        console.log('attachSocketListeners', socket);
        if(!socket) return;

        socket.on('call:rejected', (data) => {
            console.log('call:rejected', data);

            if(this.call_id != data.call_id) return;

            this.leaveCall();
            this.setState({ call_status: 'no_answer' });
        });

        socket.on('call:ringing', (data) => {
            console.log('call:ringing', data);

            if(this.call_id != data.call_id) return;

            this.setState({ call_status: 'ringing' });
        });

        socket.on('call:new', (data) => {
            this.chat = { call_image: data.user.profile_image, call_name: data.user.name };
            this.setState({ incoming_call: data });
            $('.incoming-call-modal').modal('show');

            this.rtc_helpers.socketEmit({
                event: 'call:ringing',
                return_response: true,
                data: {
                    call_id: data.call_id,
                    target_user_id: data.user.id,
                }
            });
        });
    }

    async prepareJoinCall(params = {}) {
        var { chat_id, chat, current_user, target_user_id, redial } = params;

        if(chat_id && current_user) {
            this.chat_id = chat_id;
            this.chat = chat || {};
            this.current_user = current_user;
            this.target_user_id = target_user_id;
        }

        console.log('prepareJoinCall', this.chat_id, this.context.ms_socket, this.context.ms_socket && this.context.ms_socket.id, this.context.ms_socket && this.context.ms_socket.connected);

        var has_video = common.getUrlParameter('hasVideo');
        if(has_video === "true" || has_video === true) {
            this.is_video = true;
        }

        if(!this.context.ms_socket || !this.context.ms_socket.id) {
            this.wait_call_id = this.chat_id;

            return;
        }

        this.wait_call_id = false;
        window.incoming_call = false;

        clearTimeout(this.timeout_id);
        this.dial_tone_ref.current.pause();

        var call_options = {
            audio: { muted: false, can_turn_on: true, can_turn_off: true },
            video: { muted: !this.is_video, can_turn_on: true, can_turn_off: true },
            enable_join_options: false
        };

        var call = { chatId: this.chat_id };
        var is_calling = false;

        if(!this.state.incoming_call) {
            is_calling = true;
        
        } else {
            call.id = this.state.incoming_call.call_id;
            call.chat_id = this.state.incoming_call.call_id;
            call.room_id = this.state.incoming_call.call_id;

            if(redial) {
                is_calling = true;
            }
        }

        if(is_calling) {
            var { call_id } = await this.rtc_helpers.socketEmit({
                event: 'call:new',
                return_response: true,
                data: {
                    chat_id: this.chat_id,
                    target_user_id: target_user_id,
                    user: this.current_user,
                    has_video: this.is_video
                }
            });

            this.call_id = call_id;
            
            call.id = call_id;
            call.chat_id = this.chat_id;
            call.room_id = call_id;
            
            this.setState({ call_status: 'calling', show_closing_screen: false });

            this.dial_tone_ref.current.play();
            this.timeout_id = setTimeout(() => {
                this.leaveCall();
            
            }, 30000);
        }

        this.setState({
            call: call,
            call_options: call_options,
            host_ids: []
          
        }, () => {
            this.call_handler_ref.current.joinCall({ call: call });
        });
    }

    onCallLeft({ soft_leave, user_id }) {
        if (soft_leave) return;
        if(!user_id) return;

        if(user_id == this.current_user.id) {
            this.notifyReject();
            this.showClosingScreen();
        
        } else if(window.call_helpers.getParticipantsIds().length == 1) {
            this.leaveCall();
            this.showClosingScreen();
        }
    }

    onCallJoined({ user_id }) {
        if(user_id && user_id != this.current_user.id) {
            this.dial_tone_ref.current.pause();

            clearTimeout(this.timeout_id);
            this.setState({ call_status: 'connected' });
        }
    }

    resetThings() {
        this.setState({
            call: false,
            call_options: false,
            user_status: '',
            is_host: false,
            host_ids: []
        })
    }

    leaveCall() {
        this.dial_tone_ref.current.pause();
        window.leaveCall();
        this.setState({ call_status: 'left' });
    }

    showClosingScreen() {
        this.dial_tone_ref.current.pause();
        this.setState({ show_closing_screen: true, call_status: 'left' });
    }

    closeWindow() {
        window.close();
    }

    redial() {
        this.prepareJoinCall({ redial: true });
    }

    reject() {
        this.notifyReject();
        this.showClosingScreen();
    }

    accept() {
        this.dial_tone_ref.current.pause();
        this.setState({ call_status: 'connected' });

        this.prepareJoinCall({ });

        this.rtc_helpers.socketEmit({
            event: 'call:accepted',
            data: {
                call_id: this.state.incoming_call.call_id,
                chat_id: this.state.incoming_call.chat_id,
                target_user_id: this.state.incoming_call.user.id
            }
        });

        $('.incoming-call-modal').modal('hide');
    }

    notifyReject() {
        this.rtc_helpers.socketEmit({
            event: 'call:rejected',
            data: {
                call_id: this.state.incoming_call.call_id,
                chat_id: this.state.incoming_call.chat_id,
                target_user_id: this.state.incoming_call.user.id
            }
        });
    }

    render() {
        const { t } = this.props;

        return (
            <div>
            <div className={'call-popup-container' + (!this.state.call ? ' d-none' : '')}>
                <>
                <CallHandler
                    call={this.state.call}
                    current_user={this.current_user}
                    call_options={this.state.call_options}
                    is_host={this.state.is_host}
                    host_ids={this.state.host_ids}
                    user_status={ this.state.user_status }
                    ref={ this.call_handler_ref }
                    tflite={this.props.tflite}
                />

                {
                    this.state.call_status && this.state.call_status != 'connected' &&
                    
                    <div className="precall-screen">
                        
                        { this.chat.call_image &&

                            <img src={ this.chat.call_image } />
                        }

                        { this.chat.call_images &&

                            <div class='images'>
                                <img src={ this.chat.call_images[0] } />
                                <img src={ this.chat.call_images[1] } />
                            </div>
                        }
                        
                        <span className="name">{ this.chat.call_name }</span>

                        {
                            (this.state.call_status == 'calling' || this.state.call_status == 'ringing') &&
                            
                            <>
                            <span>{ this.state.call_status }...</span>
                            
                            <div className="bottom_controls">
                                <span className="leave control" onClick={() => this.leaveCall()}>
                                    <i class="fas fa-phone-alt icon"></i>
                                </span>
                            </div>
                            </>
                        }

                        {
                            this.state.call_status == 'no_answer' &&
                            
                            <span>No Answer</span>
                        }
                        
                        {
                            this.state.show_closing_screen &&
                            
                            <span className="bottom_controls">
                                <span className="redial control" onClick={() => this.redial()}>
                                    <i class="fas fa-phone-alt icon"></i>
                                    <span>Redial</span>
                                </span>
                                
                                <span className="cancel control" onClick={() => this.closeWindow()}>
                                    <i class="fas fa-times icon"></i>
                                    <span>Cancel</span>
                                </span>
                            </span>
                        }
                    </div>
                }

                <audio src='/ringtone/dial_tone.mp3' ref={this.dial_tone_ref} class='d-none' loop />
                </>
            </div>
            
            
            <div
                className="incoming-call-modal modal fade"
                tabIndex="-1"
                role="dialog"
                aria-hidden="true">
            
                <div className="popup-backdrop"></div>

                <div className="modal-dialog popup-container" role="document">
                    <div className="modal-content popup-inner" style={{ display: 'flex', alignItems: 'center' }}>
                        { this.state.incoming_call &&
                        
                            <div className="top-part text-center">
                                <img src={ this.state.incoming_call.user.profile_image } width="150" height="150" />

                                <div className="right-side">
                                    <p className="name">{ this.state.incoming_call.user.name }</p>
                                    <p>is inviting you to a private meeting</p>
                                </div>
                            </div>
                        }

                        <div className="bottom-part">
                            <button className="btn btn-primary" onClick={ () => this.accept() }>Accept</button>
                            <button className="btn btn-danger ml-1" onClick={ () => this.reject() }>Reject</button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        );
    }
}

export default withTranslation()(WnCall);