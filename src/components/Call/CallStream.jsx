import React from "react";
import MemorizedVideo from "./MemorizedVideo";
import bus from "../bus";
import "../../assets/css/call/call_stream.css";
import i18next from "i18next";

class CallStream extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      is_reconnecting: false,
      is_stream_playing: this.props.stream && this.props.stream.id 
    };
  }

  componentDidMount() {
    this.attachCallListeners();
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  attachCallListeners() {
    this.props.rtc_client.onStreamReconnecting = this.onStreamReconnecting.bind(this);
    this.props.rtc_client.onStreamReconnected = this.onStreamReconnected.bind(this);
  }

  onStreamReconnecting(params) {
    var { stream_id } = params;

    if (!this.props.stream || stream_id != this.props.stream.id) return;

    this.setState({ is_reconnecting: true });
  }

  onStreamReconnected(params) {
    var { stream_id } = params;

    if (!this.props.stream || stream_id != this.props.stream.id) return;

    // a little delay to wait for streams to come
    setTimeout(() => {
      this.setState({ is_reconnecting: false });
    }, 3000);
  }

  onPlaying() {
    this.setState({ is_stream_playing: true });
    this.props.onStreamPlayStarted && this.props.onStreamPlayStarted();
  }

  onSuspended() {
    this.setState({ is_stream_playing: false });
    this.props.onStreamPlayStopped && this.props.onStreamPlayStopped();
  }

  render() {
    return (
      <div className={`stream-item call-stream ${this.props.identifier} w-100 h-100`}>
        <MemorizedVideo
          stream={this.props.stream}
          force_update={this.props.force_update}
          onPlay={ this.onPlaying.bind(this) }
          onSuspend={ this.onSuspended.bind(this) }
          {...this.props.memorized_video_props}
        />

        {
          !this.state.is_stream_playing &&

          <div class="overlay">
            <div class="overlay-item">
              <i className="fas fa-circle-notch fa-spin"></i>
            </div>
          </div>
        }

        {this.state.is_reconnecting && (
          <div className="reconnecting">
            {i18next.t("Connecting")}
          </div>
        )}
      </div>
    );
  }
}

export default CallStream;
