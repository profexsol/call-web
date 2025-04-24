import React from "react";
import { withRouter } from "react-router-dom";
import CallHandler from "./CallHandler";
import moment from "moment";
import "font-awesome/css/font-awesome.min.css";
import * as common from "../../assets/js/helpers/common";
import bus from "../bus";
import { withTranslation } from "react-i18next";
import i18next from "i18next";
import { AppContext } from "../Contexts";
import RtcHelpers from "webrtc-client/src/rtc_helpers";
import '../../assets/css/call/chat_call.css';

class ChatCall extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);

        this.chat_id = props.chat_id;
        this.current_user = common.getCurrentUser() ? common.getCurrentUser() : common.getDummyUser();
        this.chat = false;
        this.call_handler_ref = React.createRef();

        this.state = {
            chat: false,
            call_options: false,
            host_ids: [],
            is_host: false,
            user_status: ''
        };

        window.chat_call = this;
    }

    componentDidMount() {
        this.rtc_helpers = new RtcHelpers({ socket: this.context.ms_socket, user: this.current_user });
        this.attachBusListeners();
    }

    componentWillUnmount() {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state, callback) => {
            return;
        };
    }

    attachBusListeners() {
        bus.on('ms_socket__connected', (socket) => {
            this.rtc_helpers.socket = socket;

            if(this.wait_chat_id) {
                this.prepareJoin({ chat_id: this.wait_chat_id });
                this.wait_chat_id = false;
            }
        });

        bus.on("chat_call__join", ({ chat_id }) => {
            console.log("chat_call__join", chat_id);
            if(!chat_id) return;

            this.prepareJoin({ chat_id });
        });

        bus.on("chat_call__accept", ({ chat_id }) => {
            this.acceptInvitation(chat_id);
        });

        bus.on("chat_call__reject", ({ chat_id }) => {
            this.rejectInvitations(chat_id);
        });

        bus.on("call__left", (data) => {
            console.log("call__left", data);

            this.onCallLeft(data);
        });

        bus.on("call__join_cancelled", () => {
            console.log("call__join_cancelled");
            this.resetThings();
        });
    }

    async getChat() {
        return;
    }

    async prepareJoin({ chat_id }) {
        console.log('prepareJoinChat', chat_id);

        if(!this.context.ms_socket) {
            this.wait_chat_id = chat_id;
            return;
        }

        if(window.is_desktop_app && this.props.location.pathname != '/desktop_chat_call') {
            var desktop_call_url = common.makeDesktopRouteUrl({
                route_name: 'desktop_chat_call',
                query_string: `chat_id=${chat_id}`
            });
        
            this.call_handler_ref.current.joinCall({
                call: { id: chat_id },
                desktop_call_url
            });

            return;
        }

        this.chat_id = chat_id;
        var chat = await this.getChat();

        if (!chat) {
            common.showAlert({
                title: i18next.t("meetingNotFound")
            });

            return;
        }

        var is_host = false;
        var user_status = '';

        this.setState({ is_host, user_status });

        this.is_removed = user_status == "removed";
        this.is_blocked = user_status == "blocked";
        this.is_waiting = user_status == "waiting";
        
        this.is_participant = true;
        this.is_approved_user = is_host || this.is_participant;

        var room_id = "private_" + chat.id;

        //checking call room presence first, to get some options
        this.rtc_helpers.getRoom({ room_id }).then((room) => {
            room = room || {};
            this.setupCall(chat, room);
        });
    }

    setupCall(chat, room) {
        chat.room_id = "private_" + chat.id;

        var app_data = room.app_data || {};
        var existing_options = app_data.start_time ? app_data : {};
        var call_max_minutes = chat.plan_max_minutes;

        var current_time = moment.utc().format("YYYY-MM-DD HH:mm:ss");
        var start_time = !existing_options.start_time ? current_time : existing_options.start_time;
        var duration_minutes = !existing_options.duration_minutes ? call_max_minutes : existing_options.duration_minutes;

        var call_options = {
            ring_on_start: true,
            copy_link: false,
            timing: {
                start_time,
                duration_minutes,
                time_zone: chat.time_zone,
            },
            participants: {
                max_participants: chat.plan_max_participants,
            }
        };

        chat.app_data = {
            chat_id: chat.id,
            start_time,
            duration_minutes
        }

        chat.who_can_start = 'anyone';
        chat.type = 'chat';

        this.setState({
            chat: chat,
            call_options: call_options,
            host_ids: []
        
        }, () => {
            this.call_handler_ref.current.joinCall({ call: chat });
        });
    }

    acceptInvitation(chat_id) {
        this.rtc_helpers.acceptInvitation({ room_id: `chat_${chat_id}` });
    }

    rejectInvitation(chat_id) {
        this.rtc_helpers.rejectInvitation({ room_id: `chat_${chat_id}` });
    }

    onCallLeft({ soft_leave }) {
        if (soft_leave) return;
        this.resetThings();
    }

    resetThings() {
        this.chat_id = false;
        this.is_approved_user = false;
        this.chat = false;

        this.setState({
            chat: false,
            call_options: false,
            user_status: '',
            is_host: false,
            host_ids: []
        })
    }

    render() {
        return (
        <div className={'call-popup-container chat-call' + (!this.state.chat ? ' d-none' : '')}>
            <CallHandler
                call={this.state.chat}
                call_options={this.state.call_options}
                is_host={this.state.is_host}
                host_ids={this.state.host_ids}
                user_status={ this.state.user_status }
                getCall={this.getChat.bind(this)}
                ref={ this.call_handler_ref }
                tflite={this.props.tflite}
            />
        </div>
        );
  }
}

export default withTranslation()(withRouter(ChatCall));