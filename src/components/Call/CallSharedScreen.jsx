import React from "react";
import $ from "jquery";
import bus from "../bus";
import "../../assets/css/call/shared_screen.css";
import CallStream from "./CallStream";
import CallUserStream from "./CallUserStream";
import * as common from "../../assets/js/helpers/common";
import i18next from "i18next";

class CallSharedScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      screen_stream: false,
      speaker_stream: false,
      selected_user_id: 0,
      selected_user_name: '',
      screen_mode: "full",
      display_mode: "fit_to_window",
      is_reconnecting: false
    };
  }

  componentDidMount() {
    this.attachBusListeners();
    this.attachCallListeners();
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    this.hideMe();
  }

  attachBusListeners() {
    bus.on('call_shared_screen__hide', () => {
      this.hideMe();
    });
  }

  attachCallListeners() {
    this.props.rtc_client.onScreenStream = this.onScreenStream.bind(this);
    this.props.rtc_client.onScreenStreamEnded = this.onScreenStreamEnded.bind(this);
    this.props.rtc_client.onShareScreenStopped = this.onShareScreenStopped.bind(this);
    this.props.rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
    this.props.rtc_client.onUserVideoStream = this.onUserVideoStream.bind(this);
    this.props.rtc_client.onStreamReconnecting = this.onStreamReconnecting.bind(this);
    this.props.rtc_client.onStreamReconnected = this.onStreamReconnected.bind(this);
    this.props.rtc_client.onLeft = this.mayBeCloseScreen.bind(this);
    this.props.rtc_client.onJoined = this.mayBeCloseScreen.bind(this);
  }

  onVideoSwitched({ user_id, is_video_on }) {
    if(this.state.screen_mode != "side_by_side_speaker") return;
    if(user_id != this.state.selected_user_id) return;
    if(is_video_on) return;

    this.setState({ speaker_stream: {} });
  }

  onScreenStream(params) {
    var { user_id, stream } = params;

    var user = this.props.getUser(user_id);

    this.setState({
      selected_user_id: user_id,
      selected_user_name: user.name,
      screen_stream: stream,
      screen_mode: "full",
      speaker_stream: false
    });

    this.switch_user_underway = false;
    bus.dispatch("call__full_screen", true);

    this.setState({ show_me: true });
  }

  onScreenStreamEnded(params) {
    var { user_id } = params;

    if (this.state.is_reconnecting) return;

    if (this.state.selected_user_id == user_id && !this.switch_user_underway) {
      this.hideMe();
    }
  }

  onShareScreenStopped(params) {
    var { user_id } = params;

    if (this.state.selected_user_id != user_id) return;

    this.hideMe();
  }

  onUserVideoStream(params) {
    var { stream = {}, user_id } = params;

    if (this.state.screen_mode != "side_by_side_speaker") return;
    if (user_id != this.state.selected_user_id) return;

    this.setState({
      speaker_stream: stream || {},
    });
  }

  onStreamReconnecting(params) {
    var { stream_id } = params;

    if (!this.state.screen_stream || stream_id != this.state.screen_stream.id)
      return;

    this.setState({ is_reconnecting: true });
  }

  onStreamReconnected(params) {
    var { stream_id } = params;

    if (!this.state.screen_stream || stream_id != this.state.screen_stream.id)
      return;

    // a little delay to wait for streams to come
    setTimeout(() => {
      this.setState({ is_reconnecting: false });
    }, 3000);
  }

  mayBeCloseScreen(params) {
    var { user_id } = params;

    if (user_id != this.state.selected_user_id) return;

    // needed incase if stream is reconnecting and screen sharing user left during that process
    // as we don't let shared screen stream hide when it is reconnecting
    this.hideMe();
  }

  switchUser(e) {
    var user_id = e.target.value;
    var previous_user_id = this.state.selected_user_id;

    var user = this.props.getUser(user_id);

    this.setState({
      selected_user_id: user_id,
      selected_user_name: user.name,
      screen_mode: "full",
    });

    this.switch_user_underway = true;

    this.props.rtc_client.getScreenStream({ user_id });
    this.props.rtc_client.dropScreenStream({ user_id: previous_user_id });
  }

  switchMode(e) {
    var screen_mode = e.target.value;

    this.setState(
      {
        screen_mode,
        speaker_stream: false,
      },
      () => {
        if (screen_mode == "side_by_side_speaker") {
          this.getSpeakerStream();
        }
      }
    );
  }

  getSpeakerStream() {
    this.props.rtc_client.getUserVideoStream({
      user_id: this.state.selected_user_id,
    });
  }

  switchDisplayMode(e) {
    this.setState({ display_mode: e.target.value });
  }

  toggleFullScreen() {
    window.call_helpers.toggleFullScreen();
  }

  hideMe() {
    if (!this.state.show_me) return;

    this.setState({ show_me: false });

    this.props.rtc_client.dropScreenStream({
      user_id: this.state.selected_user_id,
    });

    window.call_helpers && window.call_helpers.mayBeDropUserStream({
      user_id: this.state.selected_user_id,
    });

    window.call_helpers && window.call_helpers.getPageStreams();

    bus.dispatch("call__full_screen", false);
    bus.dispatch("call_shared_screen__closed", false);

    this.resetThings();
  }

  resetThings() {
    this.setState({
      screen_stream: false,
      speaker_stream: false,
      selected_user_id: 0,
      selected_user_name: '',
      screen_mode: "full",
      display_mode: "fit_to_window",
      is_reconnecting: false,
    });
  }

  render() {
    return (
      <div className={"shared-screen-container" + (this.state.show_me ? '' : ' d-none')}>
        {this.state.selected_user_id && (
          <>
          <div className="options">
            <div className="left-side">
              <i class="fas fa-chalkboard mr-1"></i>
              <u>{ this.state.selected_user_name }</u> is presenting
            </div>

            <div className="right-side">
            { Object.keys(this.props.screen_sharing_users).length > 1 &&
                
                <span className="item">
                  <b className="item-title">{i18next.t("Switch Screen")}</b>

                  <select
                    value={this.state.selected_user_id}
                    onChange={(e) => this.switchUser(e)}
                  >
                    {Object.keys(this.props.screen_sharing_users)
                      .filter(
                        (user_id) => user_id != this.props.current_user.id
                      )
                      .map((user_id) => {
                        return (
                          <option value={user_id}>
                            {
                              this.props.screen_sharing_users[user_id].name
                            }
                          </option>
                        );
                      })}
                  </select>
                </span>
              }

              <span className="item">
                <b className="item-title">{i18next.t("Switch Mode")}</b>

                <select
                  value={this.state.screen_mode}
                  onChange={(e) => this.switchMode(e)}
                >
                  <option value="full">{i18next.t("Full Screen")}</option>

                  <option value="side_by_side_speaker">
                    {i18next.t("Side by side speaker")}
                  </option>
                </select>
              </span>

              <span className="item">
                <b className="item-title">{i18next.t("Display")}</b>

                <select
                  value={this.state.display_mode}
                  onChange={(e) => this.switchDisplayMode(e)}
                >
                  <option value="fit_to_window">
                    {i18next.t("Fit to window")}
                  </option>

                  <option value="original">{i18next.t("Original")}</option>
                </select>
              </span>

              <i 
                class={
                  "icon-item full-screen fas icon full-screen-toggle-icon" + 
                  (this.props.is_full_screen ? ' fa-compress-alt' : ' fa-expand-alt')
                } 
                onClick={ () => this.toggleFullScreen() }
              />

              <i class="icon-item close-icon fas fa-times-circle icon" onClick={ () => this.hideMe() }></i>
            </div>

            <div className="clearfix"></div>
          </div>

          <div
            className={
              "video-container " +
              this.state.screen_mode +
              " " +
              this.state.display_mode
            }
          >
            {this.state.screen_stream && (
              <div className="w-100 h-100 screen-stream-parent">
                <CallStream
                  identifier={ this.state.selected_user_id + '_screen' }
                  stream={this.state.screen_stream}
                  user_id={this.state.selected_user_id}
                  rtc_client={this.props.rtc_client}
                  memorized_video_props={{
                    className: "screen-stream",
                  }}
                ></CallStream>
              </div>
            )}

            {this.state.screen_mode == "side_by_side_speaker" && (
              <div className="speaker-stream">
                <CallUserStream
                  identifier={ this.state.selected_user_id + "_user" }
                  stream={ this.state.speaker_stream }
                  user_id={ this.state.selected_user_id }
                  current_user={this.props.current_user}
                  rtc_client={ this.props.rtc_client }
                  memorized_video_props={{ muted: true }}
                  className="media_element"
                />
              </div>
            )}
          </div>
        </>
        )}
      </div>
    );
  }
}

export default CallSharedScreen;