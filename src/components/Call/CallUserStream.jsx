import React from "react";
import $ from "jquery";
import bus from "../bus";
import CallStream from "./CallStream";
import * as common from '../../assets/js/helpers/common';
import "../../assets/css/call/call_user_stream.css";
import { withTranslation } from "react-i18next";
import i18next from "i18next";

class CallUserStream extends React.Component {
  constructor(props) {
    super(props);

    this.participant = {};
    this.bus_events_ids = [];
    this.reaction_timeout_id = false;

    this.state = {
      user: {},
      is_video_on: false,
      is_audio_on: false,
      is_speaking: false,
      is_hand_raised: false,
      design_size_class: "extra-small-design",
      is_stream_playing: false,
      reaction_type: '',
      is_disconnected: false
    };
  }

  componentDidMount() {
    this.loadData();
    this.attachCallListeners();
    this.attachBusListeners();

    this.adjustDesign();
    this.observeResize();

    setTimeout(() => {
      this.adjustDesign();
    }, 500);
  }

  componentWillUnmount() {
    this.removeBusListeners();

    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  componentDidUpdate(prev_props) {
    if (prev_props.user_id != this.props.user_id) {
      this.loadData();
    }
  }

  attachCallListeners() {
    this.props.rtc_client.onJoined = this.onJoined.bind(this);
    this.props.rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
    this.props.rtc_client.onAudioSwitched = this.onAudioSwitched.bind(this);
    this.props.rtc_client.onSpeaking = this.onSpeaking.bind(this);
    this.props.rtc_client.onStoppedSpeaking = this.onStoppedSpeaking.bind(this);
    this.props.rtc_client.onHandRaised = this.onHandRaised.bind(this);
    this.props.rtc_client.onHandLowered = this.onHandLowered.bind(this);
    this.props.rtc_client.onReaction = this.onReaction.bind(this);
    this.props.rtc_client.onReconnecting = this.onReconnecting.bind(this);
    this.props.rtc_client.onReconnected = this.onReconnected.bind(this);
  }

  attachBusListeners() {
    var bus_events_ids = this.bus_events_ids;

    bus_events_ids[bus_events_ids.length] = bus.on("call__back_in_call", () => {
      this.adjustDesign();
    });

    bus_events_ids[bus_events_ids.length] = bus.on('call__participants_data_updated', (params) => {
      this.onParticipantsDataUpdated(params);
    });

    if(this.props.user_id == this.props.current_user.id) {
      bus_events_ids[bus_events_ids.length] = bus.on("call_video_effects__apply_effects_init", () => {
        this.applyingVideoEffects();
      });

      bus_events_ids[bus_events_ids.length] = bus.on("call_video_effects__apply_effects_success", () => {
        this.applyedVideoEffects();
      });
    }
  }

  removeBusListeners() {
    this.bus_events_ids.forEach(event_id => {
      bus.remove(event_id);
    });

    this.bus_events_ids = [];
  }

  loadData() {
    this.participant = this.props.participant || this.props.rtc_client.participants[this.props.user_id] || {};

    this.setState({
      user: this.participant.user || {},
      is_video_on: this.participant.is_video_on,
      is_audio_on: this.participant.is_audio_on,
      is_speaking: this.participant.is_speaking,
      is_hand_raised: this.participant.is_hand_raised,
      is_disconnected: this.participant.is_disconnected
    });
  }

  onJoined(params) {
    var { user_id } = params;

    if (user_id != this.props.user_id) return;

    var participant = this.props.rtc_client.participants[user_id];

    this.setState({
      user: participant.user,
      is_video_on: participant.is_video_on,
      is_audio_on: participant.is_audio_on,
      is_speaking: participant.is_speaking,
      is_hand_raised: participant.is_hand_raised,
      is_disconnected: participant.is_disconnected
    });
  }

  onVideoSwitched(params) {
    var { user_id, is_video_on } = params;

    if (user_id != this.props.user_id) return;

    window.call_helpers.mayBeGetUserStream({ user_id });

    this.setState({ is_video_on });
  }

  onAudioSwitched(params) {
    var { user_id, is_audio_on } = params;

    if (user_id != this.props.user_id) return;

    this.setState({ is_audio_on });
    // for-safety: if audio is turned off then need to set is_speaking to false
    this.setState({
      is_speaking: !is_audio_on ? false : this.state.is_speaking,
    });
  }

  onParticipantsDataUpdated({ participants }) {
    var participant = participants[this.props.user_id];
    if(!participant) return;

    this.setState({
      is_video_on: participant.is_video_on,
      is_audio_on: participant.is_audio_on
    });
  }

  onSpeaking(params) {
    var { user_id } = params;

    if (user_id != this.props.user_id) return;
    // if audio is off then no need to show speaking indicators
    if(user_id == this.props.current_user.id && !this.props.rtc_client.is_audio_on) return;

    var participant = this.props.rtc_client.participants[this.props.user_id] || {};
    
    bus.dispatch("call__log_event_to_local", {
      event: "is_speaking",
      data: {
        is_speaking: true,
        user_id: this.props.user_id,
        user_name: this.state.user.name,
        user_name_1: participant.user.name,
      },
    });

    this.setState({ is_speaking: true });
  }

  onStoppedSpeaking(params) {
    var { user_id } = params;
    
    if (user_id != this.props.user_id) return;
    if (!this.props.rtc_client.participants) return;

    var participant = this.props.rtc_client.participants[this.props.user_id] || {};
    bus.dispatch("call__log_event_to_local", {
      event: "is_speaking",
      data: {
        is_speaking: false,
        user_id: this.props.user_id,
        user_name: this.state.user.name,
        user_name_1: participant.user.name,
      },
    });

    this.setState({ is_speaking: false });
  }

  onHandRaised(params) {
    var { user_id } = params;

    if (user_id != this.props.user_id) return;

    this.setState({ is_hand_raised: true });
  }

  onHandLowered(params) {
    var { user_id } = params;

    if (user_id != this.props.user_id) return;

    this.setState({ is_hand_raised: false });
  }

  onReaction(params) {
    var { user_id, reaction_type } = params;

    if (user_id != this.props.user_id) return;

    this.setState({ reaction_type });
    
    clearTimeout(this.reaction_timeout_id);
    this.reaction_timeout_id = setTimeout(() => {
      this.setState({ reaction_type: '' });
    }, 5000);
  }

  onReconnecting({ user_id }) {
    if(user_id != this.props.user_id) return;

    this.setState({ is_disconnected: true });
  }

  onReconnected({ user_id }) {
    if(user_id != this.props.user_id) return;

    this.setState({ is_disconnected: false });
  }

  onStreamPlayStarted() {
    this.setState({ is_stream_playing: true });
  }

  onStreamPlayStopped() {
    this.setState({ is_stream_playing: false });
  }

  applyingVideoEffects() {
    this.setState({ is_applying_effects: true });
  }

  applyedVideoEffects() {
    this.setState({ is_applying_effects: false });
  }

  adjustDesign() {
    var stream_element = $(`.user-stream-item.${this.props.identifier}`);
    var width = stream_element.width();
    var height = stream_element.height();

    var design_size_class = "extra-small-design";
    var width_or_height = width < height ? width : height;

    if (width_or_height > 300) {
      design_size_class = "large-design";
    } else if (width_or_height > 200) {
      design_size_class = "medium-design";
    } else if (width_or_height > 120) {
      design_size_class = "small-design";
    }

    this.setState({ design_size_class });

    bus.dispatch('call_user_stream__adjust_design');
  }

  observeResize() {
    var stream_element = $(`.user-stream-item.${this.props.identifier}`);
    this.resize_observer = new ResizeObserver(
      this.adjustDesign.bind(this)
    ).observe(stream_element[0]);
  }

  render() {
    const { t } = this.props;
    return (
      <div 
        className={`user-stream-item ${this.props.identifier} ${this.state.design_size_class} ${this.state.is_speaking ? "speaking " : ""}`}
        onContextMenu={(e)=> e.preventDefault()}>
        <CallStream
          identifier={ this.props.identifier }
          stream={this.props.stream}
          user_id={this.props.user_id}
          force_update={this.props.force_update}
          rtc_client={ this.props.rtc_client }
          onStreamPlayStarted={ this.onStreamPlayStarted.bind(this) }
          onStreamPlayStopped={ this.onStreamPlayStopped.bind(this) }
          memorized_video_props={ this.props.memorized_video_props }
        ></CallStream>

        { (!this.state.is_video_on 
          || !this.state.is_stream_playing
          || this.props.is_waiting
          || this.state.is_applying_effects) &&
          
          <>
          <div class="overlay">
            <div class="overlay-item">
              {(!this.state.is_video_on || !this.state.is_stream_playing) &&
                <img class="video-off profile-picture" src={this.state.user.profile_picture_url} />
              }

              {this.state.is_applying_effects &&
                <i className="fas fa-circle-notch fa-spin icon"></i>
              }

              <p class="name">{this.state.user.name}</p>

              {this.props.is_waiting &&
                <p class="waiting">Waiting...</p>
              }
            </div>
          </div>
          </>
        }

        <div class="controls">
          {!this.state.is_audio_on ? (
            <div class="control audio-off">
              <i class="fas fa-microphone-slash"></i>
            </div>
          ) : (
            <div class="control audio-on">
              <i class="fas fa-microphone"></i>
            </div>
          )}

          {this.state.is_hand_raised && (
            <div class="control hand-raised">
              <i class="fas fa-hand-paper"></i>
            </div>
          )}

          { this.state.is_disconnected && (
            <div class="control is-disconnected" title={ i18next.t("User is disconnected")}>
              <span className="icon-group">
                <i class="fas fa-wifi"></i>
                <i class="fas fa-slash"></i>
              </span>
            </div>
          )}
        </div>

        <div class="controls controls-right">
          {
            this.state.reaction_type && (
              <div className="control reaction">
                { window.getReactionIcon({ reaction_type: this.state.reaction_type }) }
              </div>
            )
          }
        </div>

        <p class="name">
          { this.state.user.name }
        </p>
      </div>
    );
  }
}

export default withTranslation()(CallUserStream);
