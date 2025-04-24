import React from 'react';
import $ from "jquery";
import bus from '../bus';

function isStreamEqual(prev, next) {
    if(!next.stream || !prev.stream) return false;

    return prev.stream.id === next.stream.id && prev.force_update === next.force_update;
}
  

// Need to memorize video otherwise it will flicker as this component will re-render on every state update from parent component
// it will also create audio echo due to video player re-rendering
const MemorizedAudio = React.memo(class extends React.Component {
    componentDidMount() {
        this.attachBusListeners();
    }

    attachBusListeners() {
        bus.on('memorized_audio__force_play', () => {
            this.forcePlayAudio();
        });
    }

    render () {
        return (
            <audio className={ this.props.className } 
                ref={ audio => { if(audio != null && this.props.stream && this.props.stream.id) { audio.srcObject = this.props.stream } } }
                autoPlay
                id={ this.props.stream && this.props.stream.id }
                playsInline
                controls>
            </audio>
        );
    }

    forcePlayAudio() {
        if(!this.props.stream) return;
        
        $('#' + this.props.stream.id)[0].srcObject = this.props.stream;
        $('#' + this.props.stream.id)[0].play();
    }

}, isStreamEqual);

export default MemorizedAudio