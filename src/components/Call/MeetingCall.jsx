import React from "react";
import { withRouter } from "react-router-dom";
import axios from "axios";
import CallHandler from "./CallHandler";
import moment from "moment";
import "font-awesome/css/font-awesome.min.css";
import * as common from "../../assets/js/helpers/common";
import bus from "../bus";
import { withTranslation } from "react-i18next";
import i18next from "i18next";
import { AppContext } from "../Contexts";
import RtcHelpers from "webrtc-client/src/rtc_helpers";

class MeetingCall extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);

    this.meeting_id = props.meeting_id;
    this.password = props.password;
    this.is_approved_user = false;
    this.current_user = common.getCurrentUser() ? common.getCurrentUser() : common.getDummyUser();
    this.meeting = false;
    this.publicCall = false;
    this.call_handler_ref = React.createRef();

    this.state = {
      meeting: false,
      call_options: false,
      host_ids: [],
      is_host: false,
      user_status: ''
    };
  }

  componentDidMount() {
    this.rtc_helpers = new RtcHelpers({ socket: this.context.ms_socket, user: this.current_user });
    this.attachBusListeners();

    var meeting_id = this.meeting_id;
    var password = '';
    
    if(!meeting_id) {
      meeting_id = common.getUrlParameter('meeting_id', true);
      password = common.getUrlParameter('password', true);
    }

    if(meeting_id && window.is_desktop_app) {
      this.prepareJoinMeeting({
        meeting_id,
        password
      });
    }
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  attachBusListeners() {
    bus.on('ms_socket__connected', (socket) => {
      console.log('MeetingCall ms_socket__connected', this.wait_meeting_id);
      this.rtc_helpers.socket = socket;

      if(this.wait_meeting_id) {
        this.prepareJoinMeeting({ meeting_id: this.wait_meeting_id, password: this.wait_password });
        this.wait_meeting_id = false;
        this.wait_password = false;
      }
    });

    bus.on("meeting_call__join", ({ meeting_id, password }) => {
      console.log("meeting_call__join", meeting_id);
      
      if(!meeting_id) return;

      this.prepareJoinMeeting({ meeting_id, password });
    });

    bus.on("call__left", (data) => {
      console.log("call__left", data);

      this.onCallLeft(data);
    });

    bus.on("call__join_cancelled", () => {
      console.log("call__join_cancelled");

      this.resetThings();
    });

    bus.on("call_actions__ended", () => {
      console.log("call_actions__ended");
      if (this.meeting.meet_now == true) {
        axios.post("/meetings/delete_meeting", {
          meeting_id: this.meeting_id,
        });
      }
    });
  }

  async getMeeting() {
    var url = "meetings/get_meeting_call";
    var params = { meeting_id: this.meeting_id };

    var response = await axios.get(url, { params });
    var meeting = response.data.data;


    if(!meeting || !meeting.id) return;

    return meeting;
  }

  async prepareJoinMeeting({ meeting_id, password }) {
    console.log('prepareJoinMeeting', meeting_id, password, this.context.ms_socket, this.context.ms_socket && this.context.ms_socket.id, this.context.ms_socket && this.context.ms_socket.connected);

    if(!this.context.ms_socket || !this.context.ms_socket.id) {
      this.wait_meeting_id = meeting_id;
      this.wait_password = password;

      return;
    }

    if(window.is_desktop_app && this.props.location.pathname != '/desktop_meeting') {
      var desktop_call_url = common.makeDesktopRouteUrl({
        route_name: 'desktop_meeting',
        query_string: `meeting_id=${meeting_id}&password=${password}`
      });
      
      this.call_handler_ref.current.joinCall({
        call: { id: meeting_id },
        desktop_call_url
      });

      return;
    }

    this.meeting_id = meeting_id;
    this.password = password;

    var meeting = await this.getMeeting();

    if (!meeting) {
      common.showAlert({
        title: i18next.t("meetingNotFound")
      });

      return;
    }

    meeting.meeting_user = meeting.meeting_user || {};

    var is_host = meeting.meeting_user.is_host == true;
    var user_status = meeting.meeting_user.status || '';

    this.setState({ is_host, user_status });

    this.is_removed = meeting.meeting_user.status == "removed";
    this.is_blocked = meeting.meeting_user.status == "blocked";
    this.is_waiting = meeting.meeting_user.status == "waiting";

    if (meeting.meet_now == 1) {
      this.publicCall = true;
    }

    var is_participant = true;
    if(!meeting.meeting_user.id || meeting.meeting_user.is_guest) {
      is_participant = false;
    }

    this.is_approved_user = is_host || is_participant || this.publicCall;
    this.is_participant = is_participant;

    console.log('prepareJoinMeeting', meeting, meeting.meeting_user);

    if (meeting.privacy_type == "private" && !this.is_approved_user) {
      common.showAlert({ 
        title: i18next.t("authorizedAccess")
      });
      
      return;
    }

    if (!common.getCurrentUser() && !meeting.guest_flag) {
      common.showAlert({ 
        title: i18next.t("authorizedAccess")
      });

      return;
    }

    var room_id = "meeting_" + meeting.id;

    //checking call room presence first, to get some options
    this.rtc_helpers.getRoom({ room_id }).then((room) => {
      room = room || {};
      this.setupCall(meeting, room);
    });
  }

  setupCall(meeting, room) {
    meeting.type = "meeting";
    meeting.room_id = "meeting_" + meeting.id;

    var call_started = room.id || false;
    var app_data = room.app_data || {};
    var existing_options = app_data.start_time ? app_data : {};

    var allow_chat = meeting.chat == "on";
    if (this.state.is_host && meeting.chat == "host_only") allow_chat = true;

    //if host then get master time, duration from host plan, otherwise for pariticipants
    //we will get these things from host's initial settings via connection extra data
    var call_max_minutes = meeting.plan_max_minutes;

    var current_time = moment.utc().format("YYYY-MM-DD HH:mm:ss");
    var start_time = !existing_options.start_time ? current_time : existing_options.start_time;
    var duration_minutes = !existing_options.duration_minutes ? call_max_minutes : existing_options.duration_minutes;

    var video_muted = false;
    var audio_muted = false;
    var can_share_screen = this.state.is_host || meeting.who_can_share == "anyone";

    //if host is starting then need to pick option from meeting entry
    //otherwise from join popup
    if (!call_started && this.state.is_host) {
      video_muted = !meeting.video_host;
    } else {
      video_muted = meeting.video_participants == "0" || meeting.video_participants == "3";
      audio_muted = meeting.audio_participants == "off" || meeting.audio_participants == "off_can_change";
    }

    duration_minutes = 1440;

    var call_options = {
      auth: {
        //no need to ask password from those who are part of meeting
        //for the rest we will ask password
        password: (this.is_approved_user || this.password == meeting.password) ? "" : meeting.password,
        is_approval_needed: meeting.join_approval && !this.is_participant
      },
      leave: {
        show_options: this.state.is_host ? true : false,
      },
      timing: {
        start_time,
        duration_minutes,
        time_zone: meeting.time_zone,
      },
      participants: {
        max_participants: meeting.plan_max_participants,
      },
      video: {
        muted: video_muted,
        can_turn_on: true,
        can_turn_off: true
      },
      audio: {
        muted: audio_muted,
        can_turn_on: true,
        can_turn_off: true
      },
      share_screen: {
        enabled: can_share_screen,
        max_at_time: meeting.max_sharing_at_time,
      },
      chat: {
        send_msg: allow_chat,
      },
      urls: {
        join_request: "/meeting_users/request_join",
        join_requests: "/meeting_users/get_join_requests",
        update_join_request: "/meeting_users/update_status",
      },
      socket_events: {
        call_started: 'meeting__started'
      },
      breakout_rooms: meeting.breakout_rooms == "1",
      enable_join_options: true
    };

    meeting.app_data = {
      meeting_id: meeting.id,
      start_time,
      duration_minutes
    }

    this.setState({
      meeting: meeting,
      call_options: call_options,
      host_ids: meeting.host_ids
    
    }, () => {
      this.call_handler_ref.current.joinCall({ call: meeting });
    });
  }

  onCallLeft({ soft_leave }) {
    if (soft_leave) return;

    this.resetThings();
  }

  resetThings() {
    this.meeting_id = false;
    this.password = false;
    this.is_approved_user = false;
    this.meeting = false;
    this.publicCall = false;

    this.setState({
      meeting: false,
      call_options: false,
      user_status: '',
      is_host: false,
      host_ids: []
    })
  }

  render() {
    const { t } = this.props;

    return (
      <div className={'call-popup-container' + (!this.state.meeting ? ' d-none' : '')}>
          <CallHandler
            call={this.state.meeting}
            call_options={this.state.call_options}
            is_host={this.state.is_host}
            host_ids={this.state.host_ids}
            user_status={ this.state.user_status }
            getCall={this.getMeeting.bind(this)}
            ref={ this.call_handler_ref }
            tflite={this.props.tflite}
          />
      </div>
    );
  }
}

export default withTranslation()(withRouter(MeetingCall));
