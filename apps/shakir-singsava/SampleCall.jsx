import React from "react";
import CallHandler from "@components/Call/CallHandler";
import "font-awesome/css/font-awesome.min.css";
import bus from "@components/bus";
import $ from "jquery";
import { withTranslation } from "react-i18next";
import { AppContext } from "@components/Contexts";
import RtcHelpers from "../../src/assets/webrtc-client/src/rtc_helpers";
import "../../src/assets/css/call/wn_call.css";

class SampleCall extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);

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
            show_closing_screen: false,
            is_incoming: false
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
            console.log('WnCall ms_socket__connected', this.wait_call);
            this.rtc_helpers.socket = socket;

            this.attachSocketListeners(socket);

            if(this.wait_call) {
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

            if(this.call.id != data.call_id) return;

            this.leaveCall();
            this.setState({ call_status: 'no_answer', show_closing_screen: true });
        });

        socket.on('call:ringing', (data) => {
            console.log('call:ringing', data);

            if(this.call.id != data.call_id) return;

            this.setState({ call_status: 'ringing' });
        });

        socket.on('call:new', (data) => {
            this.call = data;
            this.setState({ incoming_call: data });
            $('.incoming-call-modal').modal('show');

            this.rtc_helpers.socketEmit({
                event: 'call:ringing',
                return_response: true,
                data: {
                    call_id: this.call.id
                }
            });
        });
    }

    async prepareJoinCall(params = {}) {
        var { call, is_incoming, redial } = params;

        this.call = call;
        this.setState({ is_incoming });

        console.log('prepareJoinCall', call, this.context.ms_socket && this.context.ms_socket.id);

        if(!this.call) return;

        if(this.call.is_video) {
            this.is_video = true;
        }

        if(!this.context.ms_socket || !this.context.ms_socket.id) {
            this.wait_call = this.call;

            return;
        }

        this.wait_call = false;

        clearTimeout(this.timeout_id);
        this.dial_tone_ref.current.pause();

        var call_options = {
            audio: { muted: false, can_turn_on: true, can_turn_off: true },
            video: { muted: !this.is_video, can_turn_on: true, can_turn_off: true },
            enable_join_options: false
        };

        var is_calling = false;

        if(!is_incoming) {
            is_calling = true;
        
        } else {
            this.call.room_id = this.call.id;

            if(redial) {
                is_calling = true;
            }
        }

        if(is_calling) {
            var { call_id } = await this.rtc_helpers.socketEmit({
                event: 'call:new',
                return_response: true,
                data: {
                    name: call.name,
                    type: call.type,
                    image: call.image,
                    users: call.users
                }
            });
            
            this.call.id = call_id;
            this.call.room_id = call_id;
            
            this.setState({ call_status: 'calling', show_closing_screen: false });

            this.dial_tone_ref.current.play();
            this.timeout_id = setTimeout(() => {
                this.leaveCall();
            
            }, 30000);
        }

        this.setState({
            call: this.call,
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
        $('.incoming-call-modal').modal('hide');

        this.notifyReject();
        this.showClosingScreen();
    }

    accept() {
        this.dial_tone_ref.current.pause();
        this.setState({ call_status: 'connected' });

        this.prepareJoinCall({ call: this.state.incoming_call, is_incoming: true });

        this.rtc_helpers.socketEmit({
            event: 'call:accepted',
            data: {
                call_id: this.call.id
            }
        });

        $('.incoming-call-modal').modal('hide');
    }

    notifyReject() {
        this.rtc_helpers.socketEmit({
            event: 'call:rejected',
            data: {
                call_id: this.call.id
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
                        
                        { this.call.image &&

                            <img src={ this.call.image } />
                        }

                        { this.call.images &&

                            <div class='images'>
                                <img src={ this.call.images[0] } />
                                <img src={ this.call.images[1] } />
                            </div>
                        }
                        
                        <span className="name">{ this.call.name }</span>

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
                                
                                <span className="cancel control" onClick={() => this.resetThings()}>
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
                        { this.state.is_incoming &&
                        
                            <div className="top-part text-center">
                                <img src={ this.state.call.image } width="150" height="150" />

                                <div className="right-side">
                                    <p className="name">{ this.state.call.user.name }</p>
                                    <p>is inviting you to { this.state.call.name } ({ this.state.call.type }) call</p>
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

export default withTranslation()(SampleCall);