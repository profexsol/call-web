import React from "react";
import bus from "../bus";
import { withTranslation } from "react-i18next";
import i18next from "i18next";
import { toast } from "react-toastify";
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import * as common from "../../assets/js/helpers/common";
import "../../assets/css/call/call_participant.css";

class CallParticipant extends React.Component {
    constructor(props) {
        super(props);
    
        this.participant = this.props.participants[props.user_id] || {};
        this.user = this.participant.user || {};
    
        this.state = {
            is_hand_raised: false,
            remove_underway: false,
            video_on_off_underway: false,
            audio_on_off_underway: false,
            stop_share_screen_underway: false,
        }

        this.attachBusListeners();
        this.attachCallListeners();
    }
    
    attachBusListeners() {
        bus.on("call_shared_screen__closed", () => {
          this.maximized_screen_user_id = false;
        });
    }

    attachCallListeners() {
        this.props.rtc_client.onScreenStream = this.onScreenStream.bind(this);
        this.props.rtc_client.onHandRaised = this.onHandRaised.bind(this);
        this.props.rtc_client.onHandLowered = this.onHandLowered.bind(this);
    }

    onScreenStream(params) {
        var { user_id } = params;
    
        this.maximized_screen_user_id = user_id;
    }

    onHandRaised(params) {
        var { user_id } = params;
        if(user_id != this.user.id) return;

        this.setState({ is_hand_raised: true });
    }

    onHandLowered(params) {
        var { user_id } = params;
        if(user_id != this.user.id) return;

        this.setState({ is_hand_raised: false });
    }

    maximizeUserStream() {
        bus.dispatch("call_maximized_stream__maximize", this.user.id);
    }

    async makeHost() {
        var result = await this.props.rtc_client.addHost({ target_user_id: this.user.id });
        if(!result) return;
    }
    
    async removeHost() {
        var result = await this.props.rtc_client.removeHost({ target_user_id: this.user.id });
        if(!result) return;
    }

    allowUserToRecord() {
        this.props.rtc_client.notifyTheseUsers({
            event: "allow-user-recording",
            user_ids: [this.user.id],
        });
    }

    async moveUserToWaitingArea() {
        if(!await this.removeUser({ is_waiting: true })) return;
        
        toast.info(
            i18next.t("You can move user back to call from join requests section"),
            {
                position: 'bottom-left',
                className: 'call-toast',
                hideProgressBar: true
            }
        );
    }

    prepareBlockUser() {
        common.showConfirmation({
            title: i18next.t(
                "This user will not be able to participate in any future sessions of this meeting Do you want to continue"
            ),
            text: i18next.t(
                "You can unblock user anytime from meeting details page"
            ),
        })
        .then((choice) => {
            if (choice.value) {
                this.blockUser(this.user);
            }
        });
    }
    
    async blockUser(user) {
        if(!await this.removeUser({ is_blocked: true })) return;
    }

    async removeUser(remove_user_options = {}) {
        return;
    }

    turnOffUserAudio() {
        if(!this.props.is_host) return;
        if(this.user.id == this.props.current_user.id) return;

        this.props.rtc_client.switchUserAudio({ target_user_id: this.user.id, is_audio_on: false });

        this.setState({ audio_on_off_underway: true });    
        // just a precautionary step
        setTimeout(() => {
            this.setState({ audio_on_off_underway: false });
        }, 5000);
    }
    
    turnOffUserVideo() {
        if(!this.props.is_host) return;
        if(this.user.id == this.props.current_user.id) return;

        this.props.rtc_client.switchUserVideo({ target_user_id: this.user.id, is_video_on: false });

        this.setState({ video_on_off_underway: true });    
        // just a precautionary step
        setTimeout(() => {
            this.setState({ video_on_off_underway: false });
        }, 5000);
      }
    
    requestTurnOnUserAudio() {
        if(!this.props.is_host) return;
        if(this.user.id == this.props.current_user.id) return;

        this.props.rtc_client.notifyTheseUsers({
            event: "request-turn-on-user-audio",
            user_ids: [this.user.id]
        });
    }
    
    requestTurnOnUserVideo() {
        if(!this.props.is_host) return;
        if(this.user.id == this.props.current_user.id) return;
        
        this.props.rtc_client.notifyTheseUsers({
            event: "request-turn-on-user-video",
            user_ids: [this.user.id]
        });
    }

    stopUserShareScreen() {
        this.props.rtc_client.stopUserShareScreen({ target_user_id: this.user.id });
        
        this.setState({ stop_share_screen_underway: true });
    
        setTimeout(() => {
            this.setState({ stop_share_screen_underway: false });
        }, 5000);
    }
    
    disableUserShareScreen() {
        this.stopUserShareScreen();
    
        this.props.rtc_client.notifyTheseUsers({
            event: "disable-user-share-screen",
            user_ids: [this.user.id]
        });
    }
    
    enableUserShareScreen() {
        this.props.rtc_client.notifyTheseUsers({
            event: "enable-user-share-screen",
            user_ids: [this.user.id]
        });
    }

    lowerUserHand() {
        if(!this.props.is_host) return;
        
        this.props.rtc_client.notifyTheseUsers({
            event: "lower-user-hand",
            user_ids: [this.user.id]
        });
    }

    viewScreenStream() {
        if (this.maximized_screen_user_id) {
            this.props.rtc_client.dropScreenStream({
                user_id: this.maximized_screen_user_id,
            });
            
            this.maximized_screen_user_id = false;
        }

        this.props.rtc_client.getScreenStream({ user_id: this.user.id });
        bus.dispatch('side_panel__hide_all');
    }
  
    render() {
        return (
            <div className="participant">
                <div className="left-side d-flex align-items-center">
                    <img
                        className="profile-picture"
                        src={this.user.profile_picture_url}
                    />
        
                    {
                    this.user.id != this.props.current_user.id 
                    
                    ?
                    
                    <span className="full-name participantNameEllipsis ">{this.user.name}</span>
                    
                    : 
                    
                    <span className="full-name">
                        {i18next.t("You")}
                    </span>
                    }
                </div>
    
                <div className="right-side actions">
                    {this.props.audio_on_users[this.user.id]
        
                    ?
                    
                    <span className="action on" onClick={ () => this.turnOffUserAudio() }>
                        <i class="fas fa-microphone" />
                    </span>
        
                    :
        
                    <span className="action" onClick={ () => this.requestTurnOnUserAudio() }>
                        <i class="fas fa-microphone-slash" />
                    </span>
                    }
        
                    {this.props.video_on_users[this.user.id]
        
                    ?
        
                    <span className="action on" onClick={ () => this.turnOffUserVideo() }>
                        <i class="fas fa-video" />
                    </span>
        
                    :
        
                    <span className="action" onClick={ () => this.requestTurnOnUserVideo() }>
                        <i class="fas fa-video-slash" />
                    </span>
                    }

                    {this.props.screen_sharing_users[this.user.id] &&
                        
                        <span className="action share-screen-action on" onClick={ () => this.viewScreenStream() }>
                            <ScreenShareIcon />
                        </span>
                    }

                    {
                        this.state.is_hand_raised &&

                        <span className="action on" onClick={ () => this.lowerUserHand() }>
                            <i class="fas fa-hand-paper" />
                        </span>
                    }

                    { this.user.id != this.props.current_user.id &&

                    <div class="dropdown">
                        <button
                            class="dropdown-toggle"
                            data-toggle="dropdown">
            
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
            
                        <div class="dropdown-menu">
                            <button
                                className="dropdown-item"
                                onClick={ () => this.maximizeUserStream() }>
                                
                                <i class="fas fa-expand-alt icon"></i>
                                {i18next.t("Maximize")}
                            </button>

                            { this.props.is_host && (
                                <>
                                {
                                    !window.call_helpers.isBreakoutRoom() && 
                                
                                    ( this.props.host_ids.indexOf(this.user.id) > -1 
                                    
                                    ?
                                    
                                    <button
                                        className="dropdown-item"
                                        onClick={ () => this.removeHost() }>
                                        
                                        <i class="fas fa-user-cog icon"></i>
                                        {i18next.t("Remove Host")}
                                    </button>
                                    
                                    :
                    
                                    <button
                                        className="dropdown-item"
                                        onClick={ () => this.makeHost() }>
                                        
                                        <i class="fas fa-user-cog icon"></i>
                                        {i18next.t("Make Host")}
                                    </button>
                                    )
                                }

                                <button
                                    className="dropdown-item"
                                    onClick={ () => this.turnOffUserAudio() }>
                                    
                                    <i class="fas fa-microphone-slash icon" />

                                    {i18next.t("Mute")}
                                </button>

                                <button
                                    className="dropdown-item"
                                    onClick={ () => this.requestTurnOnUserAudio() }>
                                    
                                    <i class="fas fa-microphone icon" />

                                    {i18next.t("Ask To Speak")}
                                </button>

                                {
                                    this.props.screen_sharing_users[this.user.id] &&
                                    
                                    <button
                                        className="dropdown-item"
                                        onClick={ () => this.stopUserShareScreen() }>
                                        
                                        <StopScreenShareIcon className="icon" />
                                        {i18next.t("Stop Share Screen")}
                                    </button>
                                }

                                <button
                                    className="dropdown-item"
                                    onClick={ () => this.enableUserShareScreen() }>
                                    
                                    <ScreenShareIcon className="icon" />
                                    {i18next.t("Enable Share Screen")}
                                </button>

                                <button
                                    className="dropdown-item"
                                    onClick={ () => this.disableUserShareScreen() }>
                                    
                                    <CancelPresentationIcon className="icon" />
                                    {i18next.t("Disable Share Screen")}
                                </button>
                
                                <button
                                    className="dropdown-item"
                                    onClick={ () => this.allowUserToRecord() }>
                                    
                                    <i class="fas fa-record-vinyl icon"></i>
                                    {i18next.t("Allow to record")}
                                </button>
                                
                                {
                                    !window.call_helpers.isBreakoutRoom() && 
                                    
                                    <>
                                    <button
                                        className="dropdown-item"
                                        onClick={ () => this.moveUserToWaitingArea() }
                                        disabled={ this.state.remove_underway }>
                                        
                                        <i class="fas fa-hourglass-start icon"></i>
                                        {i18next.t("Move to waiting area")}
                                    </button>
                    
                                    <button
                                        className="dropdown-item"
                                        onClick={ () => this.removeUser() }
                                        disabled={ this.state.remove_underway }>
                                        
                                        <i class="fas fa-user-minus icon"></i>
                                        {i18next.t("Remove")}
                                    </button>
                    
                                    <button
                                        className="dropdown-item"
                                        onClick={ () => this.prepareBlockUser() }
                                        disabled={ this.state.remove_underway }>
                                        
                                        <i class="fas fa-user-alt-slash icon"></i>
                                        {i18next.t("Block")}
                                    </button>
                                    </>
                                }
                                </>
                            )}
                        </div>
                    </div>
                    }
                </div>
    
                <div className="clearfix"></div>
            </div>
        )
    }
}

export default withTranslation()(CallParticipant);