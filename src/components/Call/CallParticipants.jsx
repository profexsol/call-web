import React from "react";
import bus from "../bus";
import CallParticipant from "./CallParticipant";
import * as common from "../../assets/js/helpers/common";
import { withTranslation } from "react-i18next";
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import "../../assets/css/call/call_participants.css";

class CallParticipants extends React.Component {
  constructor(props) {
    super(props);

    this.rtc_client = this.props.rtc_client;
    this.user = common.getCurrentUser();
    this.call_id = this.props.call.id;
    this.is_host = this.props.is_host;

    this.state = {
      participants_data: {},
      audio_off_all_underway: false,
      video_off_all_underway: false,
    };

    this.attachCallListeners();
  }

  attachCallListeners() {
    this.rtc_client.onAudioSwitched = this.onAudioSwitched.bind(this);
    this.rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
  }

  onAudioSwitched(params) {
    var { user_id } = params;

    this.updateParticipantState(user_id, "audio_on_off_underway", false);
  }

  onVideoSwitched(params) {
    var { user_id } = params;

    this.updateParticipantState(user_id, "video_on_off_underway", false);
  }

  requestTurnOnAllUsersAudio(user_id) {
    this.rtc_client.notifyOtherUsers({
      event: "request-turn-on-user-audio",
      user_id,
    });
  }

  requestTurnOnAllUserVideo(user_id) {
    this.rtc_client.notifyOtherUsers({
      event: "request-turn-on-user-video",
      user_id,
    });
  }

  turnOffAllUsersAudio() {
    this.rtc_client.switchAllUsersAudio({ is_audio_on: false });

    this.setState({ audio_off_all_underway: true });
    // just a precautionary step
    setTimeout(() => {
      this.setState({ audio_off_all_underway: false });
    }, 5000);
  }

  turnOffAllUsersVideo() {
    this.rtc_client.switchAllUsersVideo({ is_video_on: false });

    this.setState({ video_off_all_underway: true });
    // just a precautionary step
    setTimeout(() => {
      this.setState({ video_off_all_underway: false });
    }, 5000);
  }

  showParticipantActions(user_id, show) {
    this.updateParticipantState(user_id, "show_actions", show);
  }

  updateParticipantState(user_id, key, value) {
    //updating key inside object in array of objects
    this.setState((prevState) => {
      const participants_data = prevState.participants_data;
      participants_data[user_id] = participants_data[user_id] || {};

      participants_data[user_id][key] = value;

      return { participants_data: participants_data };
    });
  }

  stopAllUsersShareScreen() {
    this.rtc_client.stopAllUsersShareScreen();

    this.setState({ stop_all_share_screens_underway: true });

    // just a precautionary step
    setTimeout(() => {
      this.setState({ stop_all_share_screens_underway: false });
    }, 5000);
  }

  enableAllUsersShareScreen() {
    this.rtc_client.notifyOtherUsers({
      event: "enable-user-share-screen",
    });
  }

  disableAllUsersShareScreen() {
    this.stopAllUsersShareScreen();

    this.rtc_client.notifyOtherUsers({
      event: "disable-user-share-screen",
    });
  }

  render() {
    const { t, i18n } = this.props;
    return (
      <div className="participants-container">
        <div className="hosts-section">
          <div className="section-title">
            { i18n.t("Hosts") } 
            <span>{ this.props.participants_ids.filter((id) => this.props.host_ids.indexOf(id) != -1).length }</span>
          </div>

          {
            this.props.host_ids.map((host_id) => {
              if(!this.props.participants[host_id]) return null;

              return (
                <CallParticipant
                  key={ host_id }
                  is_host={ this.props.is_host }
                  user_id={ host_id }
                  current_user={ this.props.current_user }
                  rtc_client={ this.props.rtc_client }
                  host_ids={ this.props.host_ids }
                  audio_on_users={ this.props.audio_on_users }
                  video_on_users={ this.props.video_on_users }
                  screen_sharing_users={ this.props.screen_sharing_users }
                  participants={ this.props.participants }
                  participants_ids={this.props.participants_ids}
                />
              )
            })
          }
        </div>
        
        <div className="participants-section">
          <div className="section-title">
            { i18n.t("Participants") } 
            <span>{
              this.props.participants_ids.filter((id) => this.props.host_ids.indexOf(id) == -1).length
            }</span>

            {this.is_host && this.props.participants_ids.filter((id) => this.props.host_ids.indexOf(id) == -1).length >= 1 && (
            
            <div className="actions bulk-actions">
              <button
                onClick={() => this.turnOffAllUsersAudio()}
                //Yoonus added this to disable when no participants available
                disabled={this.state.audio_off_all_underway || this.props.participants_ids.length <=1 }>
                {t("Mute_all")} 
              </button>

              <div class="dropdown">
                <button
                  className="dropdown-toggle"
                   //Yoonus added this to disable when no participants available
                  data-toggle="dropdown" disabled={this.props.participants_ids.length <= 1}>
                  
                  <i class="fas fa-ellipsis-h"></i>
                </button>

                <div class="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => this.turnOffAllUsersVideo()}
                    disabled={this.state.video_off_all_underway}>
                    
                    <i class="fas fa-video-slash icon"></i>
                    {t("Turn off videos of all")}
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => this.requestTurnOnAllUsersAudio()}>
                    
                    <i class="fas fa-microphone icon"></i>
                    {t("Ask all to turn on audio")}
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => this.requestTurnOnAllUserVideo()}>
                    
                    <i class="fas fa-video icon"></i>
                    {t("Ask all to turn on video")}
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => this.stopAllUsersShareScreen()}
                    disabled={this.state.stop_all_share_screens_underway}>
                    
                    <StopScreenShareIcon className="icon" />
                    {t("Stop all share screens")}
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => this.disableAllUsersShareScreen()}
                    disabled={this.state.stop_all_share_screens_underway}>
                    
                    <CancelPresentationIcon className="icon" />
                    {t("Disable share screen for all")}
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => this.enableAllUsersShareScreen()}>
                    
                    <ScreenShareIcon className="icon" />
                    {t("Enable share screen for all")}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>

          {Object.values(this.props.participants)
            .filter((participant) => this.props.host_ids.indexOf(participant.id) == -1)
            .sort((participant_2, participant_1) => {
              var user_2 = participant_2.user;
              var user_1 = participant_1.user;
              var user_1_name = participant_1.user.name || '';
              var user_2_name = participant_2.user.name || '';

              // screen sharing users will be on top
              // second user is sharing screen so bring to to top
              if (
                this.props.screen_sharing_users[user_2.id] &&
                user_2.id != this.props.current_user.id
              ) {
                return -1;
              }

              // first user is sharing and is already on top so return 1
              if (
                this.props.screen_sharing_users[user_1.id] &&
                user_1.id != this.props.current_user.id
              ) {
                return 1;
              }

              // name ascending order
              // second user name is less so bringing it to top
              return user_2_name.toLowerCase() < user_1_name.toLowerCase() ? -1 : 1;
            })
            .map((participant) => {
              return (
                <div key={participant.id}>
                  <CallParticipant 
                    is_host={ this.props.is_host }
                    user_id={ participant.id }
                    host_ids={ this.props.host_ids }
                    rtc_client={ this.props.rtc_client }
                    current_user={ this.props.current_user }
                    participants={ this.props.participants }
                    participants_ids={this.props.participants_ids}
                    audio_on_users={ this.props.audio_on_users }
                    video_on_users={ this.props.video_on_users }
                    screen_sharing_users={ this.props.screen_sharing_users }
                  />
                  
                  <div className="clearfix"></div>
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  }
}

export default withTranslation()(CallParticipants);