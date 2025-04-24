import React from "react";

function isStreamEqual(prev, next) {
  if (!next.stream || !prev.stream) return false;

  return (
    prev.stream.id === next.stream.id && prev.force_update === next.force_update
  );
}

// Need to memorize video otherwise it will flicker as this component will re-render on every state update from parent component
// it will also create audio echo due to video player re-rendering
const MemorizedVideo = React.memo(
  class extends React.Component {
    render() {
      return (
        <video
          className={this.props.className}
          ref={(video) => {
            if (video != null && this.props.stream && this.props.stream.id) {
              video.srcObject = this.props.stream;
            }
          }}
          autoPlay
          playsInline
          id={this.props.stream && this.props.stream.id}
          muted={this.props.muted}
          onPlay={() => this.props.onPlay && this.props.onPlay()}
          onSuspend={() => this.props.onSuspend && this.props.onSuspend()}
        ></video>
      );
    }
  },
  isStreamEqual
);

export default MemorizedVideo;
