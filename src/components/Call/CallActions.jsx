import React from "react";
import bus from "../bus";
import $ from "jquery";
import * as common from "../../assets/js/helpers/common";
import * as datetime from "../../assets/js/helpers/datetime";
import { toast } from "react-toastify";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import WhiteboardIcon from "../../assets/images/call/whiteboard.svg";
import { withTranslation } from "react-i18next";
import "../../assets/css/call/call_actions.css";
import i18next from "i18next";
import { AppContext } from "../Contexts";

const { desktopCapturer } = window.require ? window.require("electron") : {};
const { ipcRenderer } = window.require ? window.require("electron") : {};
// const { globalShortcut } = window.require ? window.require('electron').remote : {};
let timer = null;

class CallActions extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);

    this.call = this.props.call;
    this.call_library = this.props.call_library;
    this.rtc_client = this.props.call_library.rtc_client;
    this.call_options = this.props.call_options;
    this.screen_share_track = false;
    this.identity = this.props.identity;
    this.current_user = this.props.current_user;
    this.have_muted_once = false;

    this.state = {
      innerWidth: 0,
      participants_opened: false,
      chat_opened: false,
      raised_hands_count: 0,
      speak_requests_count: 0,
      can_raise_hand: true,
      durationMins: this.props.call_options.timing.duration_minutes,
      has_raised_hand: false,
      unread_message_count: 0,
      recording: false,
      can_share_screen: this.call_options.share_screen.enabled,
      temp_can_share_screen: true,
      is_whiteboard_opened: false,
      open: false,
      call_options: JSON.parse(JSON.stringify(this.call_options)),
      go_live_page_id: "",
      live_stream_id: "",
      mute_audio_underway: false,
      mute_video_underway: false,
      temporarily_unmuted: false
    };

    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
    this.onSpaceKeyDownBinded = this.onSpaceKeyDown.bind(this);
    this.onSpaceKeyUpBinded = this.onSpaceKeyUp.bind(this);

    window.call_helpers.closeAllDropdowns = this.closeAllDropdowns.bind(this);
    window.call_helpers.isWhiteboardOpen = () => this.state.is_whiteboard_opened;
  }

  componentDidMount() {
    this.prepareThings();
    this.attachBusListeners();
    this.attachSocketListeners();
    this.attachCallListeners();
    this.attachEventListeners();
    this.detectSpaceKeyHold();

    if (ipcRenderer) {
      ipcRenderer.on("audio_flag", () => {
        console.log("COmmand audio run");
        console.log("audio props ", this.props.is_audio_on);
        if (this.props.is_audio_on == true) {
          console.log("Mute");
          this.muteAudio();
        } else if (this.props.is_audio_on == false) {
          console.log("UnMute");
          this.unmuteAudio();
        }
      });

      ipcRenderer.on("video_flag", () => {
        console.log("COmmand video run");
        console.log("audio props ", this.props.is_video_on);
        if (this.props.is_video_on) {
          console.log("Mute Video");
          this.muteVideo();
        } else {
          console.log("UnMute Video");
          this.unmuteVideo();
        }
      });
    }

    this.updateWindowDimensions();
  }

  componentWillUnmount() {
    this.removeSocketListeners();
    this.removeEventListeners();
    this.stopSpaceKeyHoldDetection();

    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  updateWindowDimensions() {
    this.setState({ innerWidth: window.innerWidth });

    this.onButtonsContrinerResize();
  }

  prepareThings() {
    window.leaveCall = this.leaveCall.bind(this);
  }

  attachCallListeners() {
    this.rtc_client.onUserVideoSwitched = this.onUserVideoSwitched.bind(this);
    this.rtc_client.onUserAudioSwitched = this.onUserAudioSwitched.bind(this);
    this.rtc_client.onUserShareScreenStopped = this.onUserShareScreenStopped.bind(this);
    this.rtc_client.onAllowedToSpeak = this.onAllowedToSpeak.bind(this);
  }

  attachBusListeners() {
    bus.on("call_raised_hands__updated", (users_raised_hand) => {
      this.setState({ raised_hands_count: users_raised_hand.length });
    });

    bus.on("call_speak_requests__updated", (users_requested) => {
      this.setState({ speak_requests_count: users_requested.length });
    });

    bus.on("call__other_section_changed", (show) => {
      if (!show) {
        this.setState({
          chat_opened: false,
          participants_opened: false,
        });
      }

      setTimeout(() => {
        this.onButtonsContrinerResize();
      }, 1000);
    });

    bus.on("call__share_current_screen" + this.props.identity, () => {
      this.shareCurrentScreen();
    });

    bus.on("call__stop_share_screen" + this.props.identity, () => {
      this.stopShareScreen();
    });

    bus.on("call_recorder__stopped", () => {
      this.can_record = false;
      this.setState({ recording: false });
    });

    bus.on("side_panel__visibility_changed", ({ is_shown, section_name }) => {
      if (section_name == "participants") this.setState({ participants_opened: is_shown });
      
      if (section_name == "chat") this.setState({ chat_opened: is_shown });
      
      if (section_name == "raised-hands") this.setState({ show_raised_hands: is_shown });

      if (section_name == "speak-requests") this.setState({ show_speak_requests: is_shown });
    });

    bus.on('whiteboard__closed', () => {
      this.setState({ is_whiteboard_opened: false });
    });

    bus.on('call__maximized', () => {
      this.onButtonsContrinerResize();
    })
  }

  attachSocketListeners() {
    console.log('actions attachSocketListeners');

    this.rtc_client.socket.on("breakout-room-message", () => {
      if ($(".chat_section:visible").length) return;
       //Yoonus added to show count if chat is not opened only
      if(!this.state.chat_opened)
      this.setState({
        unread_message_count: this.state.unread_message_count + 1,
      });
    });

    this.rtc_client.socket.on("request-turn-on-user-audio", () => {
      this.onRequestTurnOnAudio();
    });

    this.rtc_client.socket.on("request-turn-on-user-video", () => {
      this.onRequestTurnOnVideo();
    });

    this.rtc_client.socket.on("request-user-recording", (params) => {
      this.onRequestUserRecording(params);
    });

    this.rtc_client.socket.on("allow-user-recording", () => {
      this.onAllowUserRecording();
    });

    this.rtc_client.socket.on("disable-user-share-screen", () => {
      this.onDisableUserShareScreen();
    });

    this.rtc_client.socket.on("enable-user-share-screen", () => {
      this.onEnableUserShareScreen();
    });

    this.rtc_client.socket.on("lower-user-hand", () => {
      this.onLowerUserHand();
    });
  }

  attachEventListeners() {
    window.addEventListener("resize", this.updateWindowDimensions);
  }

  removeSocketListeners() {
    this.rtc_client.socket.removeAllListeners("request-turn-on-user-audio");
    this.rtc_client.socket.removeAllListeners("request-turn-on-user-video");
  }

  removeEventListeners() {
    window.removeEventListener("resize", this.updateWindowDimensions);
  }

  showParticipants() {
    this.userEventDetail("show Participant");
    bus.dispatch("participants__toggle");
  }

  showChat() {
    this.userEventDetail("show chat");
    this.setState({ unread_message_count: 0 });

    bus.dispatch("chat__toggle");
  }

  showWhiteboard() {
    this.setState({ is_whiteboard_opened: true });
    
    if (common.getCurrentUser()) {
      this.userEventDetail("show White board");
    }

    bus.dispatch("whiteboard__show");
  }

  showRaisedHands() {
    bus.dispatch("raised_hands__toggle");
  }

  showSpeakRequests() {
    bus.dispatch("speak_requests__toggle");
  }

  raiseHand() {
    this.setState({ has_raised_hand: true });
    this.rtc_client.raiseHand();
  }

  lowerHand() {
    this.setState({
      can_raise_hand: false,
      has_raised_hand: false,
    });

    this.rtc_client.lowerHand();

    setTimeout(() => {
      this.setState({ can_raise_hand: true });
    }, 2000);
  }

  toggleSendReaction() {
    bus.dispatch(
      'call_reactions__toggle', 
      { position_left: $('.send-reaction-btn').offset().left + ($('.send-reaction-btn').width() / 2) }
    );
  }

  requestRecordCall() {
    if (this.props.is_host || this.can_record) {
      this.startRecordCall();
      return;
    }

    common
      .showConfirmation({
        title: i18next.t("You need host permission to record this meeting"),
        confirm_btn_text: i18next.t("Request permission"),
      })
      .then((choice) => {
        if (!choice.value) return;

        this.rtc_client.notifyTheseUsers({
          event: "request-user-recording",
          user_ids: this.props.host_ids,
          data: { user: this.current_user },
        });
      });
  }

  onAllowUserRecording() {
    if (process.env.REACT_APP_ENVOIRNMENT_KEY != "app") return;

    this.can_record = true;
    toast.info("Host has allowed you to record meeting.", {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  startRecordCall() {
    this.userEventDetail("call recording start");
    bus.dispatch("call_recorder__record");
    this.setState({ recording: true });
  }

  stopRecordCall() {
    this.userEventDetail("call recording stop");
    bus.dispatch("call_recorder__stop");
  }

  muteVideo() {
    this.rtc_client.turnOffVideo();
    this.props.onVideoMutedByMe();

    this.userEventDetail("mute Video");

    this.setState({ mute_video_underway: true });

    setTimeout(() => {
      this.setState({ mute_video_underway: false });
    }, 2000);
  }

  async unmuteVideo() {
    this.userEventDetail("unmute Video");

    this.rtc_client.turnOnVideo();
    this.props.video_effects_ref.current.mayBeApplyEffectsAfterVideo();
  }

  muteAudio() {
    this.rtc_client.pauseAudio();
    this.props.onAudioMutedByMe();
    this.userEventDetail("mute Audio");

    if(!this.have_muted_once) {
      toast.info(() => {
        return (
          <div className="toast-inner">
            <i className="fa fa-microphone icon"></i>
            { i18next.t("Hold space bar to temporarily unmute") }
          </div>
        )}, 
        {
          position: "top-center",
          className: "call-toast height-auto",
          hideProgressBar: true,
          closeButton: false
        }
      );
    }

    this.have_muted_once = true;
  }

  unmuteAudio() {
    if(this.host_muted_me) {
      this.rtc_client.requestHostToSpeak();

      common.showAlert({
        title: i18next.t("Your request has been sent to host, you will be able to speak after host's approval"),
      });
      
      return;
    }

    this.rtc_client.resumeAudio();
    this.userEventDetail("unmute Audio");
  }

  onSpaceKeyHold() {
    console.log('fffff onSpaceKeyHold', this.have_muted_once, this.rtc_client.is_audio_on);
    if(!this.have_muted_once || this.rtc_client.is_audio_on) return;

    this.unmuteAudio();
    this.setState({ temporarily_unmuted: true });
  }

  onSpaceKeyRelease() {
    console.log('fffff onSpaceKeyRelease', this.rtc_client.is_audio_on, this.state.temporarily_unmuted);
    if(!this.state.temporarily_unmuted) return;
    
    this.muteAudio();
    this.setState({ temporarily_unmuted: false });
  }

  onUserVideoSwitched() {
    var call_options = this.state.call_options;
    call_options.video.can_turn_on = false;
    this.setState({ call_options });
  }

  onUserAudioSwitched() {
    // if as per initial settings user can't turn on audio then user shouldn't turn on audio when host mutes him
    if (!this.props.call_options.audio.can_turn_on) {
      var call_options = this.state.call_options;
      call_options.audio.can_turn_on = false;
      this.setState({ call_options });
    }

    window.call_helpers.playNotificationSound();

    toast.info(i18next.t("Host has turned off your audio"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });

    this.host_muted_me = true;
  }

  onRequestTurnOnAudio() {
    var call_options = this.state.call_options;
    call_options.audio.can_turn_on = true;
    this.setState({ call_options });

    this.host_muted_me = false;

    // user's audio is already on, no need to show message
    if (this.props.is_audio_on) return;

    common
      .showConfirmation({
        title: i18next.t("Host_is_requesting_you"),
        confirm_btn_text: i18next.t("Turn_on"),
        cancel_btn_text: i18next.t("Later"),
      })
      .then((choice) => {
        if (choice.value) {
          this.unmuteAudio();
        }
      });
  }

  onRequestTurnOnVideo() {
    var call_options = this.state.call_options;
    call_options.video.can_turn_on = true;
    this.setState({ call_options });

    // user's video is already on, no need to show message
    if (this.props.is_video_on) return;

    common
      .showConfirmation({
        title: i18next.t("Host is requesting you to turn on your video"),
        confirm_btn_text: i18next.t("Turn_on"),
        cancel_btn_text: i18next.t("Later"),
      })
      .then((choice) => {
        if (choice.value) {
          this.unmuteVideo();
        }
      });
  }

  onUserShareScreenStopped() {
    if (!this.props.sharing_screen) return;

    toast.info(i18next.t("Host has stopped your shared screen"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  onDisableUserShareScreen() {
    if (!this.state.can_share_screen) return;

    this.setState({ can_share_screen: false });

    toast.info(i18next.t("Host has stopped you from sharing screen"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  onEnableUserShareScreen() {
    if (this.state.can_share_screen) return;

    this.setState({ can_share_screen: true });

    toast.info(i18next.t("Host has allowed you to share screen"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  onLowerUserHand() {
    this.lowerHand();
  }

  onRequestUserRecording(params) {
    var { user } = params;

    toast.info(
      `${user.name} ${i18next.t("is requesting to record the meeting.")}`,
      {
        position: "bottom-left",
        className: "call-toast",
        hideProgressBar: true
      }
    );
  }

  onAllowedToSpeak() {
    window.call_helpers.playNotificationSound();
    this.host_muted_me = false;

    common.showAlert({
      title: i18next.t("Host have allowed you to speak, unmute to speak")
    });
  }

  leaveCall({ reason = "self" } = {}) {
    this.props.logEventToServer("leave_init reason: " + reason);
    this.userEventDetail("leave_init or leave_call");

    this.rtc_client.leaveCall({ join_main_room: false });
    bus.dispatch("call_actions__left");
    this.endCallFromWeb();
  }

  endCall() {
    this.props.logEventToServer("end_init");
    this.userEventDetail("end_init or end_call from host.");

    var ended_main_room = this.props.endMainRoom();
    this.props.endBreakoutRooms();

    // main room is ended already
    if (!ended_main_room) {
      this.rtc_client.endCall();
    }

    bus.dispatch("call_actions__ended");

    this.endCallFromWeb();
  }

  endCallFromWeb() {
    // setTimeout is to let socket event pass through as redirecting immediately can block some events
    setTimeout(() => {
      if (process && process.env.REACT_APP_ENVOIRNMENT_KEY == "web") {
        var params = window.location.href;
        if (params.indexOf("join_meeting") > -1) {
          window.location.replace(process.env.REACT_APP_SITE_URL);
        }
      }
    }, 1000);
  }

  shareCurrentScreen() {
    this.stopShareScreen();

    this.userEventDetail("share Screen");
    if (process.env.REACT_APP_ENVOIRNMENT_KEY == "web") {
      this.rtc_client.shareScreen({});
      return;
    }

    desktopCapturer
      .getSources({ types: ["window", "screen"] })
      .then(async (sources) => {
        for (const source of sources) {
          if (source.id == window.electron_window.getMediaSourceId()) {
            this.call_library.getSourceStream(source, (screen) => {
              this.shareScreen(screen);
            });

            return;
          }
        }
      });
  }

  shareScreen(stream = false) {
    if (this.props.sharing_screen) return;

    var max_at_time = this.call_options.share_screen.max_at_time;
    var max_share_limit_exceeded = (max_at_time == Object.keys(this.props.screen_sharing_users).length);

    if (this.props.is_host && max_share_limit_exceeded) {
      max_share_limit_exceeded = false;
      this.rtc_client.stopAllUsersShareScreen();
    }

    if (max_at_time && max_share_limit_exceeded) {
      common.showAlert({
        title: i18next.t("already_sharing"),
      });

      return;
    }

    this.rtc_client.shareScreen({ stream });

    this.setState({ temp_can_share_screen: false });

    setTimeout(() => {
      this.setState({ temp_can_share_screen: true });
    }, 2000);
  }

  stopShareScreen() {
    console.log('stopShareScreen', this.props.sharing_screen);
    if (!this.props.sharing_screen) return;

    this.rtc_client.stopShareScreen();
  }

  showAddToCall() {
    this.userEventDetail("add To Call Participants");
    bus.dispatch("add_to_call__show");
  }

  showAddTimeLimit() {
    this.userEventDetail("add time");
    bus.dispatch("time__show");
  }

  prepareBreakoutRooms() {
    this.userEventDetail("Breakout rooms");
    bus.dispatch("call_breakout_rooms__init" + this.identity);
  }

  prepareChangeBackground() {
    this.userEventDetail(i18next.t("Change background"));
    this.props.video_effects_ref.current.showBackgroundEffects();
  }

  toggleBlurBackground() {
    if (this.props.video_effect_type == "background_blur") {
      this.props.video_effects_ref.current.removeEffects();
      return;
    }

    this.props.video_effects_ref.current.applyBackgroundBlur();
  }

  removeBackgroundBlur() {
    this.props.video_effects_ref.current.removeEffects();
  }

  toggleVideoOptions(e) {
    e.stopPropagation();
    $(".video-options .dropdown-toggle").dropdown("toggle");
  }

  onSpaceKeyDown(event) {
    if(event.repeat) return;
    if(event.code != 'Space') return;

    this.space_key_is_pressed = true;
    this.space_key_is_hold = false;
    
    this.space_key_timeout_id = setTimeout(() => {
      if(!this.space_key_is_pressed) return;

      this.space_key_is_hold = true;
      this.onSpaceKeyHold();
    }, 200);
  }

  onSpaceKeyUp(event) {
    if(event.code != 'Space') return;
      
    if(this.space_key_is_hold) {
      this.onSpaceKeyRelease();
    }

    clearTimeout(this.space_key_timeout_id);
    this.space_key_is_pressed = false;
    this.space_key_is_hold = false;
  }

  detectSpaceKeyHold() {
    document.addEventListener("keydown", this.onSpaceKeyDownBinded);
    document.addEventListener("keyup", this.onSpaceKeyUpBinded);
  }

  stopSpaceKeyHoldDetection() {
    document.removeEventListener("keydown", this.onSpaceKeyDownBinded);
    document.removeEventListener("keyup", this.onSpaceKeyUpBinded);
  }

  copyLink() {
    var title, pwd, date_time,timeZone;

    if (this.call.meet_now == 1) {
      title = "Meet Now";
    } else {
      title = this.call.title;
    }
    pwd = "Password: " + this.call.password;
    //Yoonus added TimeZone
    timeZone =" (" + datetime.getTimeZone()+ ")";

    if (!this.call.is_recurring) {
      date_time = datetime.formatDbDate(this.call.start_time);
    } else {
      date_time =
        "Every " +
        datetime.get_day_value(this.call.start_time) +
        " " +
        datetime.formatTimeDB(this.call.start_time);
    }
    var copy_text = `${this.current_user.first_name} is inviting you to a scheduled MIZDAH meeting
    Topic: ${title}
    Meeting Id: ${this.call.id}
    ${pwd}
    Date & Time: ${date_time} ${timeZone}
    Join MIZDAH meeting ${this.call.join_link}`;

    navigator.clipboard.writeText(copy_text);
    toast.success(i18next.t("InvitationLinkCopied"), {
      position: "bottom-left",
      className: "call-toast",
      hideProgressBar: true
    });
  }

  userEventDetail(event_name) {
    return;
  }

  getActionButtons(source) {
    const { t, i18n } = this.props;

    // need to trigger resize method, otherwise some buttons might appear in both inside dropdown or outside dropdown
    if (!this.get_actions_button_resize_underway) {
      this.get_actions_button_resize_underway = true;

      setTimeout(() => {
        this.onButtonsContrinerResize();
        this.get_actions_button_resize_underway = false;
      }, 5);
    }

    var tooltip_class = source != "dropdown" ? "tooltip" : "";

    return (
      <>
        {/* {
          this.call_options.copy_link &&
          
          <button
            className="action-btn btn-meeting-link-board dropdown-item con-tooltip top"
            id="btn-meeting-link-board"
            onClick={() => this.copyLink()}
          >
            <i class="fas fa-copy action-icon icon"></i>
            <span className={`action-title ${tooltip_class}`}>
              {t("Copy Link")}
            </span>
          </button>
        } */}

        <button
          className={
            "action-btn participants_btn dropdown-item con-tooltip top" +
            (this.state.participants_opened ? "on" : "")
          }
          onClick={this.showParticipants.bind(this)}
        >
          {!this.state.participants_opened ? (
            <>
              <i class="fas fa-user action-icon icon"></i>
            </>
          ) : (
            <>
              <i class="fas fa-user action-icon icon"></i>
            </>
          )}

          {!this.state.participants_opened ? (
            <>
              {this.props.is_host ? (
                <div className={`action-title on ${tooltip_class}`}>
                  {t("Participants / Requests")}
                </div>
              ) : (
                <div className={`action-title on ${tooltip_class}`}>
                  {t("Participants")}
                </div>
              )}
            </>
          ) : (
            <div className={`action-title ${tooltip_class}`}>
              {t("Hide Participants")}
            </div>
          )}

          <div className="badge-icon participants-count">
            {Object.keys(this.props.participants).length}
          </div>
        </button>

        {/* <button
          className={
            "open_chat action-btn dropdown-item con-tooltip top " +
            (this.state.chat_opened ? "on" : "")
          }
          onClick={this.showChat.bind(this)}
        >
          {!this.state.chat_opened ? (
            <>
              <i className="fas fa-comment-dots action-icon icon"></i>
              <div className={`action-title on ${tooltip_class}`}>
                {" "}
                {t("Chat")}
              </div>
            </>
          ) : (
            <>
              <i className="fas fa-comment-dots action-icon icon"></i>
              <div className={`action-title off ${tooltip_class}`}>
                {" "}
                {t("Close Chat")}
              </div>
            </>
          )}

          {this.state.unread_message_count > 0 && (
            <span className="counter badge-icon">
              {this.state.unread_message_count}
            </span>
          )}
        </button> */}

        {/* {!this.props.sharing_screen ? (
          <button
            className="share-screen-btn action-btn dropdown-item con-tooltip top"
            disabled={
              !this.state.can_share_screen || !this.state.temp_can_share_screen
            }
            onClick={() => this.shareScreen()}
            title={
              !this.state.can_share_screen
                ? i18next.t("Host has disabled share screen")
                : ""
            }
          >
            <ScreenShareIcon className="action-icon icon" />
            <div className={`action-title on ${tooltip_class}`}>
              {" "}

              { this.state.can_share_screen ? t("Share Screen") : i18next.t("Host has disabled share screen") }
            </div>
          </button>
        ) : (
          <button
            className="share-screen-btn action-btn on dropdown-item con-tooltip top"
            onClick={() => this.stopShareScreen()}
          >
            <StopScreenShareIcon className="action-icon icon" />
            <div className={`action-title off ${tooltip_class}`}>
              {" "}
              {t("Stop Sharing")}
            </div>
          </button>
        )} */}

        {/* <button 
          className="send-reaction-btn action-btn dropdown-item con-tooltip top"
          onClick={ () => this.toggleSendReaction() }>
          
          <i class="fas fa-smile action-icon icon"></i>

          <div className={`action-title ${tooltip_class}`}>
            {t("Send a reaction")}
          </div>
        </button> */}

        {/* {!this.state.has_raised_hand ? (
          <button
            className="raise-hand-btn-new action-btn dropdown-item con-tooltip top"
            disabled={!this.state.can_raise_hand}
            onClick={() => this.raiseHand()}
          >
            <i className="fas fa-hand-paper action-icon icon"></i>
            <div className={`action-title ${tooltip_class}`}>
              {t("Raise Hand")}
            </div>
          </button>
        ) : (
          <button
            className="raise-hand-btn-new action-btn raised dropdown-item con-tooltip top"
            onClick={() => this.lowerHand()}
          >
            <i
              className="fas fa-hand-paper action-icon icon"
              style={{ color: "#f5cb65" }}
            ></i>
            <div className={`action-title ${tooltip_class}`}>
              {" "}
              {t("Lower Hand")}
            </div>
          </button>
        )} */}

        {/* {this.props.is_host &&
          this.call_options.breakout_rooms &&
          !this.props.breakout_room && (
            <button
              className="action-btn breakout-btn dropdown-item con-tooltip top"
              onClick={() => this.prepareBreakoutRooms()}
            >
              <div className="action-icon action-icon-group icon">
                <i className="fas fa-ellipsis-h action-icon"></i>
                <i className="fas fa-ellipsis-h action-icon"></i>
                <i className="fas fa-ellipsis-h action-icon"></i>
              </div>
              <div className={`action-title on ${tooltip_class}`}>
                {" "}
                {t("Brakeout_Rooms")}
              </div>
            </button>
          )} */}

        {/* <button
          className="white-board action-btn dropdown-item con-tooltip top"
          id="btn-white-board"
          disabled={this.state.is_whiteboard_opened}
          onClick={() => this.showWhiteboard()}
        >
          <img src={WhiteboardIcon} className="action-icon icon" />
          <div className={`action-title ${tooltip_class}`}>
            {" "}
            {t("White Board")}
          </div>
        </button> */}

        {/* {this.props.is_host && (
          <button
            className="add_to_call_btn action-btn dropdown-only-btn dropdown-item"
            onClick={() => this.showAddToCall()}
          >
            <i className="fas fa-user-plus action-icon icon"></i>&nbsp;
            <div className="action-title"> {t("Add To Call")}</div>
          </button>
        )} */}

        {/* {this.props.is_host && (
          <button
            className="raise-hand-btn action-btn dropdown-only-btn dropdown-item"
            onClick={() => this.showRaisedHands()}
          >
            <i className="fas fa-hand-paper action-icon icon"></i>

            {!this.state.show_raised_hands ? (
              <div className="action-title"> {t("See Raised Hands")}</div>
            ) : (
              <div className="action-title">{t("Hide Raised Hands")}</div>
            )}

            {!!this.state.raised_hands_count && (
              <div className="badge-icon raised_hands_count">
                {this.state.raised_hands_count}
              </div>
            )}
          </button>
        )} */}

        {/* {this.props.is_host && (
          <button
            className="speak-requests-btn action-btn dropdown-only-btn dropdown-item"
            onClick={() => this.showSpeakRequests()}
          >
            <i className="fas fa-microphone-alt action-icon icon"></i>

            {!this.state.show_speak_requests ? (
              <div className="action-title"> {t("Speak Requests")}</div>
            ) : (
              <div className="action-title">{t("Hide Speak Requests")}</div>
            )}

            {!!this.state.speak_requests_count && (
              <div className="badge-icon raised_hands_count">
                {this.state.speak_requests_count}
              </div>
            )}
          </button>
        )} */}

        {this.state.go_live_page_id == "" ? (
          ""
        ) : (
          // <button
          //   className="raise-hand-btn action-btn dropdown-only-btn dropdown-item"
          //   onClick={() => this.goLive()}
          // >
          //  <i className="fas fa-record-vinyl action-icon"></i>
          //   <div className="action-title">{t('Go Live')}</div>
          // </button>
          <>
            <button
              className=" raise-hand-btn action-btn dropdown-only-btn dropdown-item "
              onClick={() => {
                navigator.clipboard.writeText(
                  "https://live.worldnoor.com/MizdahDev/play.html?id=" +
                    this.state.live_stream_id
                );
                toast.success(i18next.t("Go live link has been copied"));
              }}
            >
              <i class="fas fa-copy action-icon icon"></i>
              <div className="action-title">{t("Go live link")}</div>
            </button>
            <button
              className="record-call-btn action-btn dropdown-only-btn dropdown-item"
              onClick={() => this.closeGoLive()}
            >
              <i className="stop-recording fas fa-stop action-icon"></i>
              <div className="action-title">{t("End Go Live")}</div>
            </button>
          </>
        )}

        {/* {process.env.REACT_APP_ENVOIRNMENT_KEY == "app" &&
          (!this.state.recording ? (
            <button
              className="record-call-btn action-btn on_demand dropdown-only-btn dropdown-item"
              onClick={() => this.requestRecordCall()}
            >
              <i className="fas fa-record-vinyl action-icon"></i>
              <div className="action-title">{t("Record")}</div>
            </button>
          ) : (
            <button
              className="record-call-btn action-btn dropdown-only-btn dropdown-item"
              onClick={() => this.stopRecordCall()}
            >
              <i className="stop-recording fas fa-stop action-icon"></i>
              <div className="action-title off"> {t("Stop Recording")}</div>
            </button>
          ))} */}
      </>
    );
  }

  onButtonsContrinerResize() {
    $(".footer-middle > .action-btn").not(".dropdown-actions").show();
    $(".dropdown-actions .dropdown-menu .action-btn").hide();

    var dropdown_visible_elements = 0;

    $(".footer-middle > .action-btn")
      .not(".dropdown-only-btn")
      .each(function (element, i) {
        var container_width = $(".footer-middle").outerWidth(true);

        if (
          $(this).position().left + $(this).outerWidth(true) >
          container_width
        ) {
          dropdown_visible_elements++;

          $(this).hide();

          $(".dropdown-actions")
            .find("[class='" + $(this).attr("class") + "']")
            .show();
        } else {
          $(this).show();
          $(".dropdown-actions")
            .find("[class='" + $(this).attr("class") + "']")
            .hide();
        }
      });

    dropdown_visible_elements += $(".dropdown-only-btn").length;

    if (dropdown_visible_elements <= 0) {
      $(".dropdown-actions").hide();
    } else {
      $(".dropdown-actions").show();
    }
  }

  // Go live Method
  goLive() {
  }

  // Close Go live Method
  closeGoLive() {
  }

  closeAllDropdowns() {
    $('.footer_btns .dropdown').each(function() {
      if(!$(this).find('.dropdown-menu').is(':hidden')) {
        $(this).find('[data-toggle="dropdown"]').dropdown('toggle');
      }
    });

    bus.dispatch('call_reactions__hide');
  }

  render() {
    const { t, i18n } = this.props;
    return (
      <>
      <div className='footer_btns'>
        <div className="footer-left">
          {this.props.is_audio_on ? (
            <button
              className="action-btn on"
              disabled={!this.state.call_options.audio.can_turn_on}
              onClick={() => this.muteAudio()}
              onKeyDown={(e) => { e.preventDefault() }}
              title={
                !this.state.call_options.audio.can_turn_off
                  ? i18next.t("Option disabled by host")
                  : "Cmd/Ctrl + Shift + a"
              }
            >
              <i class="fa fa-microphone action-icon"></i>
            </button>
          ) : (
            <button
              className="action-btn"
              disabled={!this.state.call_options.audio.can_turn_on}
              onClick={() => this.unmuteAudio()}
              onKeyDown={(e) => { e.preventDefault() }}
              title={
                !this.state.call_options.audio.can_turn_on
                  ? i18next.t("Option disabled by host")
                  : "Cmd/Ctrl + Shift + a"
              }
            >
              <i class="fa fa-microphone-slash action-icon"></i>
            </button>
          )}

          {this.props.is_video_on ? (
            <button
              className="action-btn on"
              id="muteVideoBtn"
              onClick={() => this.muteVideo()}
              onKeyDown={(e) => { e.preventDefault() }}
              title="Cmd/Ctrl + Shift + v"
            >
              <i class="fa fa-video action-icon on"></i>

              {/* <button
                className="options-icon"
                onClick={this.toggleVideoOptions}
              >
                <i class="fa fa-angle-up"></i>
              </button> */}
            </button>
          ) : (
            <button
              className="action-btn"
              onClick={() => this.unmuteVideo()}
              onKeyDown={(e) => { e.preventDefault() }}
              disabled={this.state.mute_video_underway}
              title={
                !this.state.call_options.video.can_turn_on
                  ? i18next.t("Option disabled by host")
                  : "Cmd/Ctrl + Shift + v"
              }
            >
              <i class="fas fa-video-slash action-icon off"></i>

              {/* <button
                className="options-icon"
                onClick={this.toggleVideoOptions}
              >
                <i class="fa fa-angle-up"></i>
              </button> */}
            </button>
          )}

          {/* <div class="dropdown video-options">
            <button
              class="dropdown-toggle"
              type="button"
              data-toggle="dropdown"
            ></button>

            <div class="dropdown-menu">
              <div
                className="dropdown-item"
                onClick={() => this.toggleBlurBackground()}
              >
                {this.props.video_effect_type == "background_blur" && (
                  <i class="fa fa-check mr-2"></i>
                )}

                {i18next.t("Blur background")}
              </div>

              <button
                className="dropdown-item"
                onClick={() => this.prepareChangeBackground()}
              >
                {i18next.t("Change background")}
              </button>
            </div>
          </div> */}
        </div>

        <div className="footer-middle">{this.getActionButtons()}</div>

        <div className="footer-right">
          <span className="dropdown-actions dropdown action-btn">
            <button
              type="button"
              className="dropup-btn action-btn"
              data-toggle="dropdown"
            >
              <i class="fas fa-ellipsis-v action-icon"></i>
              <div className="action-title"> {t("More")}</div>
            </button>

            <div className={`dropdown-menu droplist`}>
              {this.getActionButtons("dropdown")}
            </div>
          </span>

          <div class="dropdown d-inline-block h-100 leave-call-dropdown">
            <button
              className="action-btn leave-call-btn con-tooltip"
              data-toggle="dropdown"
            >
              <i className="fas fa-phone phone action-icon"></i>
              <div className="action-title tooltip"> {t("Leave Call")}</div>
            </button>

            <div class="dropdown-menu">
              {this.props.breakout_room && (
                <button
                  className="dropdown-item button leave-breakout-room-btn"
                  onClick={() => this.props.leaveBreakoutRoom()}
                >
                  <i class="fas fa-level-down-alt icon"></i>

                  {t("Leave breakout room")}
                </button>
              )}

              <button
                className="dropdown-item button just-leave-call-btn"
                onClick={() => this.leaveCall()}
              >
                <i class="fas fa-sign-out-alt icon"></i>
                {t("Leave")}
              </button>

              {this.props.is_host && (
                <button
                  className="dropdown-item button end-call-btn"
                  onClick={() => this.endCall()}
                >
                  <i class="fas fa-phone phone icon"></i>
                  {t("End for everyone")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="clearfix"></div>
      </div>

      {
        this.state.temporarily_unmuted &&

        <div className="temporarily-unmuted">
          <i class="fa fa-microphone"></i>

          <div>{ t("Temporarily Unmuted") }</div>
        </div>
      }
    </>
    );
  }
}

export default withTranslation("translation", { withRef: true })(CallActions);
