import React from "react";
import $ from "jquery";
import bus from "../bus";
import "font-awesome/css/font-awesome.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../assets/css/call/call.css";
import * as common from "../../assets/js/helpers/common";
import * as datetime from "../../assets/js/helpers/datetime";
import "react-toastify/dist/ReactToastify.css";
import { Flip, toast } from "react-toastify";
import i18next from "i18next";
import CallLibrary from "./CallLibrary.jsx";
import ActionsComponent from "./CallActions.jsx";
import CallAuth from "./CallAuth.jsx";
// import CallTimeMaster from "./CallTimeMaster";
// import AddToCall from "./AddToCall";
import CallParticipantsSection from "./CallParticipantsSection.jsx";
import ShareScreenPicker from "./ShareScreenPicker.jsx";
// import Whiteboard from "../Whiteboard";
import CallRaisedHands from "./CallRaisedHands.jsx";
import CallSpeakRequests from "./CallSpeakRequests.jsx";
// import CallRecorder from "./CallRecorder";
import CallSharedScreen from "./CallSharedScreen.jsx";
import CallMaximizedStream from "./CallMaximizedStream.jsx";
import JoinOptions from "./JoinOptions.jsx";
import CallBreakoutRooms from "./CallBreakoutRooms.jsx";
// import VideoEffectsComponent from "./CallVideoEffects";
import AddTimeToCall from "./AddTimeToCall.jsx";
import PermissionAllowPopup from "./PermissionAllowPopup.jsx"
import VideoManagerComponent from "./VideoManager.jsx";
import AudioManager from "./AudioManager.jsx";
// import CallChat from "./CallChat";
// import CallReactions from "./CallReactions";
// import DeleteModal from "./Messages/DeleteModal";
import MeetingJoinedSound from "../../assets/audios/meeting_joined.mp3";
import NotificationSound from "../../assets/audios/notification.mp3"
// import GoogleAd from "./GoogleAd";
// import GoogleAdNew from "./GoogleAdNew";
import { AppContext } from "../Contexts";

var VideoManager;
var CallActions;
var VideoEffects;

export default class Call extends React.Component {
  static contextType = AppContext;
  #rtc_client;

  constructor(props) {
    super(props);
    this.isMeetNow = this.props.call.meet_now == 1 ? true : false;
    this.record_id = this.props.call.id;
    this.record_type = this.props.call.type;
    this.current_user = this.props.current_user;

    this.call = this.props.call;
    this.call_library = null;
    this.current_user.name = this.current_user.firstname + ' ' + this.current_user.lastname;
    this.current_user.profile_picture_url = this.current_user.profile_image;
    this.user_status = "";

    this.call.cache_data_key = this.call.room_id + "_cache_data";
    this.local_logs = "";

    //to make bus events unique
    //otherwise they will get called n number of times
    //where n is number of times call component mounted
    this.identity = Math.random();

    this.call_breakout_rooms_ref = React.createRef();
    this.video_effects_ref = window.video_effects_ref = React.createRef();
    this.actions_ref = React.createRef();
    this.shared_screen_ref = React.createRef();
    this.audio_ref = React.createRef();
    this.video_manager_ref = React.createRef();

    this.call_settings = localStorage.getItem("call_settings");
    this.call_settings = this.call_settings
      ? JSON.parse(this.call_settings)
      : {};
    this.breakout_room = this.is_breakout_room = this.props.breakout_room;
    this.breakout_room_to_join = false;
    this.have_left_call = false;

    this.call_title = this.props.call.title || "Meeting";
    if (this.breakout_room) {
      this.call_title = `Breakout Room: ${this.breakout_room.title} (${this.call_title})`;
    }

    //default call options
    this.default_call_options = {
      auth: {
        //call join password
        password: "",
        is_approval_needed: false
      },
      leave: {
        //ask user about ending the call etc
        show_options: is_host ? true : false
      },
      timing: {
        //call start time, datetime
        start_time: "",
        //call duration minutes
        duration_minutes: "",
        //call time timezone
        time_zone: "",
      },
      video: {
        muted: 1,
        can_turn_on: true,
        can_turn_off: true
      },
      audio: {
        muted: 0,
        can_turn_on: true,
        can_turn_off: true
      },
      share_screen: {
        enabled: true
      },
      chat: {
        //send message is allowed or not
        send_msg: true,
      },
      participants: {
        max_participants: false,
      },
      copy_link: true,
      ring_on_start: false,
      breakout_rooms: true,
      enable_join_options: true,
      urls: {
        //to trigger when call is started
        call_started: "",
        //to trigger when user has joined the call
        user_joined: "",
        //to trigger when join request is made
        join_request: "",
        //to get join requests for the call
        join_requests: "",
        //to update join request status
        update_join_request: "",
      },
      socket_events: {}
    };

    var is_host = this.props.host_ids.includes(this.current_user.id);
    var call_options = {
      ...this.default_call_options,
      ...this.props.call_options,
    };

    this.state = {
      call: this.props.call,
      call_joined: false,
      current_user: this.current_user,
      call_options: call_options,
      participants: [],
      participants_ids: [],
      screen_sharing_users: [],
      recording_users: [],
      video_on_users: [],
      audio_on_users: [],
      is_host: is_host,
      join_options_passed: !call_options.enable_join_options,
      is_video_on: false,
      is_audio_on: false,
      host_ids: this.props.host_ids || [],
      sharing_screen: false,
      video_paused: false,
      init_library: true,
      mix_audio_stream: false,
      view_type: "speaker",
      video_effect_type: "",
      permission_check: false,
      is_full_screen: false,
      is_countdown_started: false,
      time_check_passed: false,
      show_actions: true
    };

    this.joined_sound = new Audio(MeetingJoinedSound);
    this.notification_sound = new Audio(NotificationSound);
    this.joined_sound.volume = '0.2';
    this.notification_sound.volume = '0.2';
  }

  componentDidMount() {
    this.prepareThings();
    this.attachBusListeners();
    this.keepScreenAwake();

    window.call_helpers = {};
    window.call_helpers.call = this.call;
    window.call_helpers.device = this.device;
    window.call_helpers.maximizeCall = this.maximizeCall.bind(this);
    window.call_helpers.toggleFullScreen = this.toggleFullScreen.bind(this);
    window.call_helpers.cancelJoin = this.cancelJoin.bind(this);
    window.call_helpers.showActions = this.showActions.bind(this);
    window.call_helpers.hideActions = this.hideActions.bind(this);
    window.call_helpers.hideSidePanels = this.hideSidePanels.bind(this);
    window.call_helpers.changeViewType = this.changeViewType.bind(this);
    window.call_helpers.playNotificationSound = this.playNotificationSound.bind(this);
    window.call_helpers.isBreakoutRoom = () => { return this.is_breakout_room };
    window.call_helpers.isSharingScreen = () => { return this.state.sharing_screen };
    window.call_helpers.getParticipantsIds = () => { return this.state.participants_ids };

    bus.dispatch("call__mounted");
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    window.call = false;
    window.connection = false;
    window.call_helpers = false;

    this.keepScreenAwake(false);
    this.downloadLocalLogs();

    clearInterval(this.network_quality_interval_id);
    toast.dismiss('network-toast');
    toast.dismiss('network-quality-toast');
  }

  prepareThings() {
    this.subscription = common.getSubscription();
    
    this.is_basic_plan = true;
    if(this.subscription) {
      this.is_basic_plan = (this.subscription.plan_id == 1);
    }

    VideoManager = this.props.VideoManagerComponent || VideoManagerComponent;
    CallActions = this.props.ActionsComponent || ActionsComponent;
    // VideoEffects = this.props.VideoEffectsComponent || VideoEffectsComponent;

    if(!this.state.call_options.auth.is_approval_needed) {
      this.setState((prevState) => ({
        current_user: {
          ...prevState.current_user,
          is_authenticated: true,
        },
      }));
    }

    if(!this.state.call_options.enable_join_options) {
      this.setState({ join_options_passed: true });
      bus.dispatch('call__going_to_join');
    }
  }

  attachBusListeners() {
    bus.on("call_time_master__allowed" + this.identity, () => {
      this.setState({ time_check_passed: true });
    });

    bus.on("call_auth__authenticated" + this.identity, () => {
      this.setState((prevState) => ({
        current_user: {
          ...prevState.current_user,
          is_authenticated: true,
        },
      }));
    });

    bus.on("call__updated_participants", (participants) => {
      this.setState({ participants: participants });
    });

    //time finished
    bus.on("call_time_master__time_ended", () => {
      window.leaveCall({ reason: "time ended" });
    });

    bus.on("call_time_master__visbility_changed", (is_shown) => {
      this.setState({ is_countdown_started: is_shown });
    });

    bus.on("call_actions__left", () => {
      this.haveLeftCall();
    });

    bus.on("call_actions__ended", () => {
      this.breakout_room = false;
      this.haveLeftCall();
    });

    bus.on("call__log_event_to_local", (data) => {
      this.logEventToLocal(data);
    });

    bus.on("call_video_effects__effect_changed", ({ effect_type }) => {
      this.setState({ video_effect_type: effect_type });
    });

    bus.on("side_panel__visibility_changed", ({ is_shown }) => {
      this.setState({ side_panel_opened: is_shown });
    });
  }

  attachSocketListeners() {
    console.log('call attachSocketListeners');

    this.#rtc_client.socket.on("join-breakout-room", (params) => {
      this.joinBreakoutRoom(params);
    });
  }

  setStateAsync(state) {
    return new Promise((resolve) => {
      this.setState(state, resolve);
    });
  }

  callLibraryInitiated(call_library) {
    this.call_library = call_library;
    this.#rtc_client = this.call_library.rtc_client;

    this.#rtc_client.onScreenStream = this.onScreenStream.bind(this);
    this.#rtc_client.onLocalUserVideoStream = this.onLocalUserVideoStream.bind(this);
    this.#rtc_client.onLocalUserAudioStream = this.onLocalUserAudioStream.bind(this);
    this.#rtc_client.onScreenStreamEnded = this.onScreenStreamEnded.bind(this);
    this.#rtc_client.onVideoError = this.onVideoError.bind(this);
    this.#rtc_client.onAudioError = this.onAudioError.bind(this);
    this.#rtc_client.onPostJoinData = this.onPostJoinData.bind(this);
    this.#rtc_client.onShareScreenError = this.onShareScreenError.bind(this);
    this.#rtc_client.onJoined = this.onJoined.bind(this);
    this.#rtc_client.onLeft = this.onLeft.bind(this);
    this.#rtc_client.onCallStarted = this.onCallStarted.bind(this);
    this.#rtc_client.onCallEnded = this.onCallEnded.bind(this);
    this.#rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
    this.#rtc_client.onAudioSwitched = this.onAudioSwitched.bind(this);
    this.#rtc_client.onHostAdded = this.onHostAdded.bind(this);
    this.#rtc_client.onHostRemoved = this.onHostRemoved.bind(this);
    this.#rtc_client.onScreenShared = this.onScreenShared.bind(this);
    this.#rtc_client.onShareScreenStopped = this.onShareScreenStopped.bind(this);
    this.#rtc_client.onPotentialScreenVideo = this.onPotentialScreenVideo.bind(this);
    this.#rtc_client.onReconnecting = this.onReconnecting.bind(this);
    this.#rtc_client.onReconnected = this.onReconnected.bind(this);
    this.#rtc_client.onReconnectionFailed = this.onReconnectionFailed.bind(this);
    this.#rtc_client.onRemoved = this.onRemoved.bind(this);
    this.#rtc_client.onRecordingStarted = this.onRecordingStarted.bind(this);
    this.#rtc_client.onRecordingStopped = this.onRecordingStopped.bind(this);
    this.#rtc_client.onUsersAdded = this.onUsersAdded.bind(this);
    this.#rtc_client.onSocketSent = this.onSocketSent.bind(this);
    this.#rtc_client.onSocketReceived = this.onSocketReceived.bind(this);
    this.#rtc_client.onSocketConnected = this.onSocketConnected.bind(this);
    this.#rtc_client.onSocketDisconnected = this.onSocketDisconnected.bind(this);
    this.#rtc_client.onLeaveCall = this.onLeaveCall.bind(this);
    this.#rtc_client.onCallback = this.onCallback.bind(this);
    this.#rtc_client.onInvitationUpdated = this.onInvitationUpdated.bind(this);
    this.#rtc_client.onRoomTypeChanged = this.onRoomTypeChanged.bind(this);

    this.attachSocketListeners();

    bus.dispatch("call__rtc_client_ready", this.#rtc_client);
  }

  onScreenStream() {
    this.setState({ viewing_screen: true });
  }

  onLocalUserAudioStream({ track }) {
    toast.info(() => {
      return (
        <div className="toast-inner">
          <i className="fa fa-microphone icon"></i>
          { i18next.t("Connected to") }: { track.label }
        </div>
      )}, 
      {
        position: "top-center",
        className: "call-toast height-auto",
        hideProgressBar: true,
        closeButton: false,
        pauseOnFocusLoss: false
      });
  }

  onLocalUserVideoStream() {
    this.setState({ is_video_on: true });
  }

  onScreenStreamEnded() {
    this.viewing_screen = false;
    this.setState({ viewing_screen: false });
  }

  onJoined(params) {
    var { user_id } = params;

    this.updateParticipantsData();
    var user = this.getUser(user_id);

    this.setState({
      is_video_on: this.#rtc_client.is_video_on,
      is_audio_on: this.#rtc_client.is_audio_on,
    });

    if (user_id == this.state.current_user.id) {
      this.haveJoinedCall();
    
    } else {
      toast.info(`${user.name} ${i18next.t("has joined")}`, {
        position: "bottom-left",
        className: "call-toast",
        hideProgressBar: true,
        autoClose: 3000
      });

      this.joined_sound.currentTime = 0;
      this.joined_sound.play();
    }

    bus.dispatch("call__joined", { user_id} );
  }

  async onLeft(params) {
    var { user_id, join_main_room = true } = params;

    if (user_id == this.current_user.id) {
      if (!join_main_room) this.breakout_room = false;
      if (this.breakout_room) this.haveLeftBreakoutRoom();

      this.haveLeftCall();
    } else {
      this.updateParticipantsData();

      if(this.call.type == 'chat') {
        window.leaveCall();
      }
    }

    bus.dispatch('call__left', { user_id });
  }

  onPostJoinData() {
    this.updateParticipantsData();
    this.updateHosts();
  }

  async onReconnecting(params) {
    var { user_id } = params;

    if (user_id != this.current_user.id) return;

    this.onPossibleNetworkDisconnected();

    this.logEventToServer("reconnecting");
  }

  onReconnected(params) {
    var { user_id } = params;

    if (user_id != this.current_user.id) return;

    this.onNetworkReconnected();
  }

  onReconnectionFailed() {
    this.haveLeftCall();
  }

  async onPossibleNetworkDisconnected() {
    this.network_disconnected = true;
    // verifying if network is really disrupted
    var is_success_1 = await this.pingBackendServer();
    var is_success_2 = await this.pingBackendServer();
    if(!is_success_1 && !is_success_2 && this.network_disconnected) {
      this.onNetworkDisconnected();
    }
  }

  async onNetworkDisconnected() {
    this.network_disconnected = true;
    clearTimeout(this.network_toast_timout_id);

    if(toast.isActive('network-toast')) {
      toast.update('network-toast', {
        render: <NetworkToast is_disconnected={true} />,
        className: "call-toast alert slim"
      });

      return;
    }

    toast.dismiss('network-quality-toast');
    this.notification_sound.currentTime = 0;
    this.notification_sound.play();

    toast.info(<NetworkToast is_disconnected={true} />,
    {
      toastId: 'network-toast',
      position: "top-center",
      className: "call-toast alert slim",
      hideProgressBar: true,
      closeButton: false,
      pauseOnFocusLoss: false,
      autoClose: false,
      closeOnClick: false,
      draggable: false
    });
  }

  onNetworkReconnected() {
    this.network_disconnected = false;

    toast.update('network-toast', {
      render: <NetworkToast is_disconnected={false} />,
      className: "call-toast success slim"
    });

    clearTimeout(this.network_toast_timout_id);
    
    this.network_toast_timout_id = setTimeout(() => { 
      toast.dismiss('network-toast');
    }, 5000);
  }

  onScreenShared(params) {
    var { user_id } = params;

    this.updateParticipantsData();
    var user = this.getUser(user_id);

    if (user_id == this.current_user.id) {
      this.setState({ sharing_screen: true });
    
    } else {
      toast.info(`${user.name} ${i18next.t("has shared screen")}`, {
        position: "bottom-left",
        className: "call-toast",
        pauseOnFocusLoss: false,
        hideProgressBar: true
      });
    }
  }

  onPotentialScreenVideo({ user_id }) {
    if (this.viewing_screen || this.state.sharing_screen) return;
    if (user_id == this.current_user.id) return;

    this.#rtc_client.getScreenStream({ user_id });
    this.viewing_screen = true;
  }

  onShareScreenStopped(params) {
    var { user_id } = params;

    this.updateParticipantsData();

    if (user_id == this.current_user.id) {
      this.setState({ sharing_screen: false });
    }
  }

  onVideoError(params) {
    var { error } = params;

    var os_name = this.device.os && this.device.os.name;
    var mac_camera_settings_link =
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera";
    var message = "Please check your camera settings";

    if (os_name == "Mac") {
      message = `Please check your 
                  <a 
                    href='${mac_camera_settings_link}' 
                    target='_blank' style="color: white; text-decoration: underline">
                    
                    camera settings
                  </a>`;
    }

    this.setState({ permission_check: true });
    toast.error(() => {
      return (
        <div>
          <b>Cannot start video</b>
          <br />

          <span dangerouslySetInnerHTML={{ __html: message }}></span>
        </div>
      );
    });
  }

  onAudioError(params) {
    var { error } = params;

    var os_name = this.device.os && this.device.os.name;
    var mac_camera_settings_link =
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
    var message = "Please check your microphone settings";

    if (os_name == "Mac") {
      message = `Please check your 
                  <a 
                    href='${mac_camera_settings_link}' 
                    target='_blank' 
                    style="color: white; text-decoration: underline">
                  
                    microphone settings
                  </a>`;
    }

    this.setState({ permission_check: true });
    toast.error(() => {
      return (
        <div>
          <b>Cannot start audio</b>
          <br />

          <span dangerouslySetInnerHTML={{ __html: message }}></span>
        </div>
      );
    });
  }

  onShareScreenError(params) {
    var { error } = params;

    var os_name = this.device.os && this.device.os.name;

    if (os_name != "Mac") return;
    if (error.message.toLowerCase() != "permission denied by system") return;

    var app_name =
      process.env.REACT_APP_ENVOIRNMENT_KEY == "web"
        ? "Your browser"
        : process.env.REACT_APP_NAME;

    var mac_preferences_link =
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
    var message = `${app_name} might not have screen-recording permission on your computer.`;
    message += ` Please enable it in <a href='${mac_preferences_link}' target='_blank'>System Preferences</a>.`;

    common.showAlert({
      title: i18next.t("Can share your screen"),
      html: message,
    });
  }

  onVideoSwitched(params) {
    var { user_id, is_video_on } = params;

    this.updateParticipantsData();

    if (user_id == this.state.current_user.id) {
      var call_options = this.state.call_options;
      call_options.video.muted = !is_video_on;

      this.setState({ is_video_on, call_options });
    }
  }

  onAudioSwitched(params) {
    var { user_id, is_audio_on } = params;

    this.updateParticipantsData();

    if (user_id == this.state.current_user.id) {
      var call_options = this.state.call_options;
      call_options.audio.muted = !is_audio_on;

      this.setState({ is_audio_on, call_options });
    }
  }

  onVideoMutedByMe() {
    this.setState({ is_video_on: false });
  }

  onAudioMutedByMe() {
    this.setState({ is_audio_on: false });
  }

  onHostAdded({ user_id }) {
    this.updateHosts();
    
    if (this.current_user.id != user_id) return;

    this.setState({ is_host: true });
    toast.success(i18next.t("AddedAsHost"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  onHostRemoved({ user_id }) {
    this.updateHosts();

    if (this.current_user.id != user_id) return;

    this.setState({ is_host: false });
    toast.success(i18next.t("youAreRemovedAsHost"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  //user has started the call
  onCallStarted() {
    this.logEventToServer("started");
  }

  onCallEnded(params) {
    this.logEventToServer("ended");

    params.user_id = this.current_user.id;
    this.onLeft(params);
  }

  onRemoved(params) {
    var { is_blocked, is_waiting } = params;

    this.logEventToServer("removed_by_host");

    if (is_blocked) {
      this.user_status = "blocked";
    } else if (is_waiting) {
      this.user_status = "waiting";
    } else {
      this.user_status = "removed";
    }
  }

  onRecordingStarted() {
    this.updateParticipantsData();
  }

  onRecordingStopped() {
    this.updateParticipantsData();
  }

  onUsersAdded(params) {
    var { users } = params;

    users.forEach((user) => {
      window.call_helpers.addWaitingUser({ user });
    });
  }

  onInvitationUpdated({ status }) {
    console.log('onInvitationUpdated', status);
    if(this.call.type == 'chat' && status == 'rejected' && this.state.participants_ids.length == 1) {
      common.showAlert({
        title: i18next.t("Meeting was declined by user")
      });

      window.leaveCall();
    }
  }

  onSocketConnected(params) {}
  onSocketDisconnected(params) {}
  onLeaveCall(params) {}

  onSocketSent(params) {
    var { event, data = {} } = params;

    this.logEventToLocal({
      event: `socket-sent ${event}`,
      data,
    });
  }

  onSocketReceived(params) {
    var { event, data = {} } = params;

    this.logEventToLocal({
      event: `socket-received ${event}`,
      data,
    });
  }

  onCallback(params) {
    var { callback_name = "", data = {} } = params;

    // no need to log these callbacks as we are already logging them in detail
    if (
      callback_name.indexOf("SocketSent") >= 0 ||
      callback_name.indexOf("SocketReceived") >= 0
    )
      return;

    this.logEventToLocal({
      event: `callback ${callback_name}`,
      data,
    });
  }

  playNotificationSound() {
    this.notification_sound.currentTime = 0;
    this.notification_sound.play();
  }

  updateParticipantsData() {
    var participants = this.#rtc_client.participants;

    if (!participants) return;

    var screen_sharing_users = {};
    var recording_users = {};
    var video_on_users = {};
    var audio_on_users = {};
    var participants_ids = JSON.parse(
      JSON.stringify(this.#rtc_client.participants_ids)
    );
    // need to move current user on top, will be helpful in pagination
    participants_ids = participants_ids.filter(
      (participant_user_id) => participant_user_id != this.current_user.id
    );
    participants_ids.unshift(this.current_user.id);

    Object.values(participants).forEach((participant) => {
      if (participant.is_sharing)
        screen_sharing_users[participant.id] = participant.user;
      if (participant.is_recording)
        recording_users[participant.id] = participant.user;
      if (participant.is_video_on)
        video_on_users[participant.id] = participant.user;
      if (participant.is_audio_on)
        audio_on_users[participant.id] = participant.user;
    });

    this.setState({
      participants,
      participants_ids,
      screen_sharing_users,
      recording_users,
      audio_on_users,
      video_on_users,
    });

    bus.dispatch("call__participants_data_updated", { participants });

    return participants_ids;
  }

  updateHosts() {
    var host_ids = this.#rtc_client.host_ids;
    this.setState({ host_ids: host_ids });
  }

  async joinBreakoutRoom({ breakout_room }) {
    this.user_action = "join-breakout-room";
    this.breakout_room_to_join = breakout_room;

    this.#rtc_client.leaveCall();
  }

  leaveBreakoutRoom() {
    if (!this.breakout_room) return;

    this.haveLeftBreakoutRoom();

    this.#rtc_client.leaveCall();

    if (this.call_breakout_rooms_ref.current) {
      this.call_breakout_rooms_ref.current.leaveBreakoutRoom();
    }
  }

  haveLeftBreakoutRoom() {
    this.user_action = "leave-breakout-room";
  }

  endBreakoutRooms() {
    this.call_breakout_rooms_ref.current.endBreakoutRooms();
  }

  endMainRoom() {
    // host is in main room
    // no need to end manually as it will get ended automatically with @function endCall in @component CallActions
    if (!this.breakout_room) return;

    this.#rtc_client.rtc_helpers.deleteRoom({
      room_id: this.state.call.main_room_id,
    });

    return true;
  }

  getRecentShareScreenStream() {
    var recent_share_screen_time = "";
    var recent_share_screen_user_id = false;

    Object.keys(this.state.screen_sharing_users).forEach((user_id) => {
      var participant = this.state.participants[user_id];
      var share_screen_time = participant.is_sharing;

      if (share_screen_time > recent_share_screen_time) {
        recent_share_screen_time = recent_share_screen_time;
        recent_share_screen_user_id = user_id;
      }
    });

    if (!recent_share_screen_user_id) return false;

    this.#rtc_client.getScreenStream({ user_id: recent_share_screen_user_id });

    return true;
  }

  //user has joined the call
  haveJoinedCall() {
    this.logEventToServer("joined");

    this.user_status = "";
    this.user_action = "";

    this.setState({
      call_joined: true,
    });

    bus.dispatch("call__joined", this.call);
    this.observeNetworkQuality();

    setTimeout(() => {
      this.setState({ show_ad: true });
    }, 2000);

    if(this.call.type == 'chat') {
      toast.info(i18next.t("Invitation has been sent to the user"), {
        position: "top-right",
        className: "call-toast",
        hideProgressBar: true,
        pauseOnFocusLoss: false,
        closeButton: false
      });
    }

    this.setState({
      current_room_type: this.#rtc_client.current_room_type
    });
  }

  haveLeftCall() {
    if (this.have_left_call) return;

    this.have_left_call = true;
    var soft_leave =
      this.breakout_room ||
      this.breakout_room_to_join ||
      this.user_status != "";

    console.log("haveLeftCall", soft_leave);

    this.logEventToServer("left");

    this.maximizeCall();

    bus.dispatch("call_recorder__stop" + this.identity);
    bus.dispatch("call__left", {
      user_id: this.current_user.id,
      user_status: this.user_status,
      user_action: this.user_action,
      breakout_room: this.breakout_room_to_join,
      is_video_on: this.state.is_video_on,
      is_audio_on: this.state.is_audio_on,
      soft_leave,
    });

    this.setState({ call_joined: false });
  }

  keepScreenAwake(keep_awake = true) {
    if (!window.ipcRenderer) return;

    window.ipcRenderer.send("keep-screen-awake", keep_awake);
  }

  updateParticipant(user_id, data) {
    var index = this.state.participants.findIndex(
      (item) => item && item.id === user_id
    );
    var participants = this.state.participants;
    var participant = participants[index];
    participants[index] = { ...participant, ...data };

    this.setState({ participants: participants });
  }

  showActions() {
    this.setState({ show_actions: true });
  }

  hideActions() {
    this.setState({ show_actions: false });
  }

  getUser(user_id) {
    var user = false;

    var participant = this.state.participants[user_id];
    if(participant) {
      user = participant.user;
    }

    return user || {};
  }

  updateRoomAppData(get_data_callback) {
    this.#rtc_client.getRoom().then((room) => {
      var app_data = room.app_data;
      var new_app_data = get_data_callback(app_data);

      this.#rtc_client.updateAppData({ app_data: new_app_data });
    });
  }

  async saveRoomDataInCache({ room_id, data = {}, get_data_callback = false }) {
    var room_id = room_id || this.call.room_id;
    var cache_data_key = `${room_id}_cache_data`;

    var json_data = await this.#rtc_client.rtc_helpers.getFromCache({
      key: cache_data_key,
    });
    var old_data = json_data ? JSON.parse(json_data) : {};

    if (get_data_callback) {
      data = get_data_callback(old_data);
    }

    var room_data = { ...old_data, ...data };

    if (!this.#rtc_client.rtc_helpers) return;

    this.#rtc_client.rtc_helpers.saveToCacheTemporarily({
      key: cache_data_key,
      value_json: JSON.stringify(room_data),
      seconds: 86400,
    });
  }

  async getRoomDataFromCache({ room_id }) {
    var room_id = room_id || this.call.room_id;
    var cache_data_key = `${room_id}_cache_data`;

    return this.#rtc_client.rtc_helpers
      .getFromCache({ key: cache_data_key })
      .then((json_data) => {
        return json_data ? JSON.parse(json_data) : {};
      });
  }

  initJoin = ({ is_video_on, is_audio_on }) => {
    let call_options = this.state.call_options;
    call_options.video.muted = !is_video_on;
    call_options.audio.muted = !is_audio_on;

    this.setState({ call_options });
    this.setState({ join_options_passed: true });

    bus.dispatch("call__going_to_join");
  };

  cancelJoin() {
    bus.dispatch("call__join_cancelled");
  }

  minimizeCall() {
    if(process.env.REACT_APP_ENVOIRNMENT_KEY == 'app') return;
    if(this.current_user.is_guest) return;
    
    common.exitFullScreen();
    this.setState({ is_full_screen: false });
    $("body").removeClass("handling-call");
    $("body").addClass("call-minimized");
  }

  maximizeCall() {
    $("body").addClass("handling-call");
    $("body").removeClass("call-minimized");

    bus.dispatch('call__maximized');
  }

  pingBackendServer() {
    return;
  }

  observeNetworkQuality() {
    this.network_quality_interval_id = setInterval(async () => {
      // if network disconnected then no need to show notification regarding quality
      if(this.network_disconnected) return;
      
      var quality = await this.checkNetworkQuality();
      var is_toast_active = toast.isActive('network-quality-toast');

      if(quality == 'good') {
        toast.dismiss('network-quality-toast');
      }
      else if(!is_toast_active) {
        toast.info(
          <NetworkQualityToast quality={quality} />,
          {
            toastId: 'network-quality-toast',
            position: "top-center",
            className: "call-toast warning slim",
            hideProgressBar: true,
            closeButton: false,
            pauseOnFocusLoss: false,
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            transition: Flip
          }
        );
      }
    }, 10000);
  }

  async checkNetworkQuality() {
    var quality = 'good';

    var rtt_seconds_1 = await this.#rtc_client.getRoundTripTime();
    await common.wait({ milliseconds: 1000 });
    var rtt_seconds_2 = await this.#rtc_client.getRoundTripTime();
    await common.wait({ milliseconds: 1000 });
    var rtt_seconds_3 = await this.#rtc_client.getRoundTripTime();

    var avg_rtt_seconds = (rtt_seconds_1 + rtt_seconds_2 + rtt_seconds_3) / 3;

    if(avg_rtt_seconds > .6) quality = 'bad';
    if(avg_rtt_seconds > 1) quality = 'very-bad';

    console.log(
      'checkNetworkQuality', 
      'quality', quality, 'avg_rtt_seconds', avg_rtt_seconds, 
      'rtt_seconds_1', rtt_seconds_1, 'rtt_seconds_2', rtt_seconds_2, 'rtt_seconds_3', rtt_seconds_3
    );

    return quality;
  }

  async changeViewType(params) {
    var { view_type } = params;

    await this.setStateAsync({ view_type });
    this.video_manager_ref.current && this.video_manager_ref.current.changeViewType(params);
  }

  toggleFullScreen() {
    if (this.state.is_full_screen) {
      common.exitFullScreen();
      this.setState({ is_full_screen: false });

      return;
    }

    common.makeElementFullScreen($(".call-container")[0]);
    this.setState({ is_full_screen: true });
  }

  hideSidePanels() {
    bus.dispatch('side_panel__hide_all');
  }

  logEventToLocal(params) {
    return;
    var { event, data = {} } = params;

    if (process.env.REACT_APP_DEV_EMAILS.indexOf(this.current_user.email) == -1)
      return;

    data = JSON.parse(JSON.stringify(data));

    data.participants_ids = this.state.participants_ids;

    delete data.room;
    delete data.user;
    delete data.participants;
    delete data.has_stream;
    delete data.sdp;
    delete data.candidate;
    delete data.connect_parameters;
    delete data.produce_parameters;
    delete data.device;
    delete data.router;

    var message = `event: ${event}`;
    message += ` ${datetime.getUtcDate() + " " + datetime.getLocalDate()}`;
    message += `\r\n data: ${JSON.stringify(data)} \r\n \r\n`;

    this.local_logs += message;
  }

  downloadLocalLogs() {
    if (!this.local_logs) return;

    var file_name = `meeting-${
      this.call.id
    }-${datetime.getLocalDate()}-logs.txt`;

    common.saveFileLocally({
      file_name,
      content: this.local_logs,
    });
  }

  logEventToServer(event, by_user_id) {
    return;
  }

  saveLocalCallSettings(options = {}) {
    var call_settings = this.getLocalCallSettings();
    call_settings = { ...call_settings, ...options };

    localStorage.setItem("call_settings", JSON.stringify(call_settings));
  }

  getLocalCallSettings() {
    var call_settings = localStorage.getItem("call_settings");
    return call_settings ? JSON.parse(call_settings) : {};
  }

  onRoomTypeChanged({ current_type }) {
    this.setState({ current_room_type: current_type });
  }

  render() {
    return (
      <div
        id="video_screen"
        className={
          "call-container" +
          (this.state.side_panel_opened ? " side-panel-opened" : "") +
          (this.state.is_countdown_started ? " countdown-visible" : "") +
          (this.state.is_full_screen ? " full-screen" : "") +
          (this.state.viewing_screen ? " viewing-shared-screen" : "") +
          (this.state.is_minimized ? " is-minimized" : "") +
          (this.state.show_ad ? " showing-ad" : "") +
          (this.props.layout_type ? ` ${this.props.layout_type}-layout` : " main-layout") +
          (this.current_user.is_guest ? ' is-guest' : "")
        }>
        
        {this.state.call_joined &&
            
        <>
        <div className="call-header">
          <div className="left" title={ this.call_title }>
            <i class="fas fa-chevron-left go-back-btn" onClick={ () => this.minimizeCall() }></i>
            
            <span className="call-title" onClick={ () => this.minimizeCall() }>
              { this.call_title }
            </span>
          </div>
         
          <div className="right">
            
            {
              this.state.current_room_type == 'sfu' &&

              <div class="view-type dropdown dropup">
       
                <span className="dropdown-toggle" data-toggle="dropdown">
                  {
                    this.state.view_type == 'speaker'
                    
                    ?

                    <i class="fas fa-window-maximize mr-1"></i>

                    :

                    <i class="fas fa-th mr-1"></i> 
                  }

                  { this.state.view_type == 'speaker' ? i18next.t("Speaker View") : i18next.t("Gallery View") }
                </span>

                <div class="dropdown-menu">
                  <div
                    className="dropdown-item"
                    onClick={() => this.changeViewType({ view_type: "speaker" })}
                  >
                    {this.state.view_type == "speaker" && (
                      <i class="fa fa-check tick-mark"></i>
                    )}

                    <div className="main-content">
                      <i class="fas fa-window-maximize mr-2"></i>

                      {i18next.t("Speaker View")}
                    </div>
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => this.changeViewType({ view_type: "gallery"})}
                  >
                    {this.state.view_type == "gallery" && (
                      <i class="fa fa-check tick-mark"></i>
                    )}

                    <div className="main-content">
                      <i class="fas fa-th mr-2"></i>

                      {i18next.t("Gallery View")}
                    </div>
                  </div>
                </div>
              </div>
              }

                <i
                  class={
                    "fas" +
                    (this.state.is_full_screen
                      ? " fa-compress-arrows-alt"
                      : " fa-expand-arrows-alt")
                  }
                  onClick={() => this.toggleFullScreen()}
                />
              </div>
            </div>

        <div className="call-body">
          <AudioManager
            current_user={ this.state.current_user }
            participants={ this.state.participants }
            participants_ids={ this.state.participants_ids }
            rtc_client={ this.#rtc_client }
          />

          <VideoManager
            view_type={ this.state.view_type }
            current_user={ this.state.current_user }
            participants={ this.state.participants }
            participants_ids={ this.state.participants_ids }
            rtc_client={ this.#rtc_client }
            layout_type={ this.props.layout_type }
            getRecentShareScreenStream={this.getRecentShareScreenStream.bind(this)}
            video_effects_ref={this.video_effects_ref}
            ref={this.video_manager_ref}
          />

          {/* {
            this.is_basic_plan && window.innerWidth > 500 &&

            <div className="google-ad-container" style={{ position: 'relative', width: '160px', height: '600px' }}>
              <div className="sponsored">{ i18next.t("Sponsored") }</div>

              { this.state.show_ad &&
                <div className="google-ad" style={{ position: 'relative', width: '160px', height: '600px' }}>
                  <GoogleAdNew refreshable={ true } slot={window.meeting_ad_slot} />
                </div>
              }
            </div>
          } */}

          <CallSharedScreen
            rtc_client={this.#rtc_client}
            screen_sharing_users={this.state.screen_sharing_users}
            sharing_screen={this.state.sharing_screen}
            is_full_screen={this.state.is_full_screen}
            participants={this.state.participants}
            current_user={this.state.current_user}
            identity={this.identity}
            getUser={this.getUser.bind(this)}
            ref={this.shared_screen_ref}
          />

          <CallMaximizedStream
            rtc_client={this.#rtc_client}
            participants={this.state.participants}
            current_user={this.state.current_user}
          />

          <CallParticipantsSection
            call={this.state.call}
            is_host={this.state.is_host}
            host_ids={this.state.host_ids}
            call_options={this.state.call_options}
            participants={this.state.participants}
            participants_ids={this.state.participants_ids}
            screen_sharing_users={this.state.screen_sharing_users}
            video_on_users={this.state.video_on_users}
            audio_on_users={this.state.audio_on_users}
            recording_users={this.state.recording_users}
            current_user={this.state.current_user}
            rtc_client={this.#rtc_client}
          />

          {/* <CallChat
            is_host={this.state.is_host}
            chat={this.state.call.chat}
            record_id={this.record_id}
            record_type={this.record_type}
            current_user={this.current_user}
            participants={this.state.participants}
            participants_ids={this.state.participants_ids}
            breakout_room={this.breakout_room}
            rtc_client={this.#rtc_client}
          /> */}

          {this.state.is_host && (
            <>
            <CallRaisedHands
              call={this.state.call}
              current_user={this.state.current_user}
              identity={this.identity}
              rtc_client={this.#rtc_client}
              getUser={this.getUser.bind(this)}
            />

            <CallSpeakRequests
              call={this.state.call}
              current_user={this.state.current_user}
              identity={this.identity}
              rtc_client={this.#rtc_client}
              getUser={this.getUser.bind(this)}
            />
            </>
          )}
        </div>

        <div className={ `call-footer ${!this.state.show_actions ? ' d-none' : ''}` }>
          <CallActions
            call={this.state.call}
            call_library={this.call_library}
            call_options={this.state.call_options}
            participants={this.state.participants}
            is_host={this.state.is_host}
            host_ids={this.state.host_ids}
            current_user={this.state.current_user}
            showChat={this.showChat}
            identity={this.identity}
            record_id={this.record_id}
            is_video_on={this.state.is_video_on}
            is_audio_on={this.state.is_audio_on}
            sharing_screen={this.state.sharing_screen}
            screen_sharing_users={this.state.screen_sharing_users}
            breakout_room={this.breakout_room}
            video_effect_type={ this.state.video_effect_type }
            layout_type={ this.props.layout_type }
            leaveBreakoutRoom={this.leaveBreakoutRoom.bind(this)}
            endBreakoutRooms={this.endBreakoutRooms.bind(this)}
            endMainRoom={this.endMainRoom.bind(this)}
            onVideoMutedByMe={this.onVideoMutedByMe.bind(this)}
            onAudioMutedByMe={this.onAudioMutedByMe.bind(this)}
            logEventToServer={this.logEventToServer.bind(this)}
            video_effects_ref={this.video_effects_ref}
            ref={this.actions_ref}
          />
        </div>
        </>
        }

        {/* <CallTimeMaster
          call={this.state.call}
          call_options={this.state.call_options}
          is_host={this.state.is_host}
          host_ids={this.state.host_ids}
          current_user={this.state.current_user}
          identity={this.identity}
        /> */}

        {this.state.time_check_passed && (
          <CallAuth
            call={this.state.call}
            call_options={this.state.call_options}
            current_user={this.state.current_user}
            host_ids={this.state.host_ids}
            identity={this.identity}
            cancelJoin={this.cancelJoin.bind(this)}
          />
        )}

        {this.state.current_user.is_authenticated && (
          <div className="w-100 h-100">
            {this.state.call_options.enable_join_options && (
              <JoinOptions
                call={this.state.call}
                initJoin={this.initJoin.bind(this)}
                cancelJoin={this.cancelJoin.bind(this)}
                call_options={this.state.call_options}
              />
            )}

            {this.state.permission_check == true ? (
              <PermissionAllowPopup />
            ) : null}

            {/* <VideoEffects
              current_user={this.state.current_user}
              call_settings={this.call_settings}
              is_video_on={this.state.is_video_on}
              ref={this.video_effects_ref}
              tflite={this.props.tflite}
              saveLocalCallSettings={this.saveLocalCallSettings.bind(this)}
              getLocalCallSettings={this.getLocalCallSettings.bind(this)}
            /> */}

            {this.state.join_options_passed && this.state.init_library && (
              <CallLibrary
                call={this.state.call}
                call_options={this.state.call_options}
                identity={this.identity}
                current_user={this.state.current_user}
                video_effects_ref={this.video_effects_ref}
                callLibraryInitiated={this.callLibraryInitiated.bind(this)}
              />
            )}
          </div>
        )}

        {this.state.call_joined && (
          <>
            <ShareScreenPicker identity={this.identity} />

            <CallBreakoutRooms
              rtc_client={this.#rtc_client}
              participants={this.state.participants}
              current_user={this.state.current_user}
              call={this.state.call}
              identity={this.identity}
              host_ids={this.state.host_ids}
              breakout_room={this.breakout_room}
              joinBreakoutRoom={this.joinBreakoutRoom.bind(this)}
              getRoomDataFromCache={this.getRoomDataFromCache.bind(this)}
              saveRoomDataInCache={this.saveRoomDataInCache.bind(this)}
              ref={this.call_breakout_rooms_ref}
            />

            {/* <CallRecorder
              recording_users={this.state.recording_users}
              call={this.state.call}
              rtc_client={this.#rtc_client}
              participants={this.state.participants}
              current_user={this.state.current_user}
              call_library={this.call_library}
              shared_screen_ref={this.shared_screen_ref}
            /> */}

            {/* <Whiteboard
              call_library={this.call_library}
              sharing_screen={this.state.sharing_screen}
              identity={this.identity}
            /> */}

            {/* <AddTimeToCall
              call={this.state.call}
              call_options={this.state.call_options}
              updateRoomAppData={this.updateRoomAppData.bind(this)}
            /> */}

            {/* <CallReactions 
              rtc_client={ this.#rtc_client } 
              getUser={this.getUser.bind(this)}
            /> */}

            {/* {this.state.is_host && (
              <AddToCall
                call={this.state.call}
                call_options={this.state.call_options}
                participants={this.state.participants}
                participants_ids={this.state.participants_ids}
                current_user={this.state.current_user}
                identity={this.identity}
              />
            )} */}

            {/* <DeleteModal /> */}
          </>
        )}
        
        <div className="maximize-call-btn" onClick={this.maximizeCall.bind(this)}>
          <i class="fas fa-phone-alt"></i> &nbsp;&nbsp;
          {i18next.t("Return to Meeting")}
        </div>
      </div>
    );
  }
}

const NetworkToast = ({ is_disconnected }) => {
  return <div className="toast-inner network-toast">
    <i className="fas fa-wifi icon"></i>
    
    { is_disconnected 
      ? 
      i18next.t("You have lost your network connection. Waiting for connection") + '...'
      :
      i18next.t("Reconnected to network")
    }
  </div>
}

const NetworkQualityToast = ({ quality }) => {
  return <div className="toast-inner network-quality-toast">
    <i className="fas fa-wifi icon"></i>
    
    { i18next.t("Your internet is experiencing issues, you may notice reduced call quality") }
  </div>
}