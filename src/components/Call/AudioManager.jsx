import React from "react";
import MemorizedAudio from "./MemorizedAudio";
import { toast } from "react-toastify";
import i18next from "i18next";
import bus from "../bus";

class AudioManager extends React.Component {
    constructor(props) {
        super(props);
        
        this.audio_refs = React.createRef([]);
        this.audio_refs.current = [];
        this.have_notified_about_mute = true;

        this.state = {
            audio_streams: []
        }

        window.call_helpers.getAudioStreams = () => this.state.audio_streams;

        console.log('audio_refs', this.audio_refs, this.audio_refs.current);
    }

    componentDidMount() {
        this.attachCallListeners();
        this.prepareThings();
    }

    componentWillUnmount() {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state, callback) => {
            return;
        };
    }

    attachCallListeners() {
        this.props.rtc_client.onJoined = this.onJoined.bind(this);
        this.props.rtc_client.onLeft = this.onLeft.bind(this);
        this.props.rtc_client.onSpeaking = this.onSpeaking.bind(this);
        this.props.rtc_client.onAudioSwitched = this.onAudioSwitched.bind(this);
        this.props.rtc_client.onUserAudioStream = this.onUserAudioStream.bind(this);
        this.props.rtc_client.onUserAudioStreamEnded = this.onUserAudioStreamEnded.bind(this);
        this.props.rtc_client.onPotentialUserAudio = this.onPotentialUserAudio.bind(this);
        
    }

    prepareThings() {
        this.onJoined({ user_id: this.props.current_user.id });
    }

    onJoined(params) {
        var { user_id } = params;
    
        if (user_id == this.props.current_user.id) {
            this.getUserStreams();
        
        }
    }

    async onLeft(params) {
        var { user_id } = params;
    
        this.props.rtc_client.dropUserAudioStream({ user_id });
    }

    onAudioSwitched({ user_id, is_audio_on }) {
        if(user_id != this.props.current_user.id) return;

        if(!is_audio_on) this.have_notified_about_mute = false;
    }

    onSpeaking({ user_id }) {
        if(user_id != this.props.current_user.id) return;
        if(this.props.rtc_client.is_audio_on) return;
        
        this.onSpeakingWhileMuted();
    }

    // i am talking but my audio is off
    onSpeakingWhileMuted() {
        if(this.have_notified_about_mute) return;

        this.have_notified_about_mute = true;
        
        toast.info(() => {
            return (
                <div className="toast-inner">
                    <i className="fa fa-microphone-slash icon"></i>
                    { i18next.t("Are you talking? Your microphone is off") }
                </div>
            )}, 
            {
                position: "top-center",
                className: "call-toast height-auto alert",
                hideProgressBar: true,
                closeButton: false,
                pauseOnFocusLoss: false,
                autoClose: 10000
            }
        );
    }

    onUserAudioStream(params) {
        this.addToUserStreams(params);
    }

    onPotentialUserAudio({ user_id }) {
        this.props.rtc_client.getUserAudioStream({ user_id });
    }

    onUserAudioStreamEnded(params) {
        var { user_id } = params;

        this.removeFromUserStreams({ user_id });
    }

    getUserStreams() {
        this.props.participants_ids.forEach(user_id => {
            this.props.rtc_client.getUserAudioStream({ user_id });
        });
    }

    async addToUserStreams(params) {
        var { stream, user_id } = params;

        console.log('AudioManager addToUserStreams', user_id);
    
        var participant = participant || this.props.participants[user_id];
        var audio_streams = this.state.audio_streams;
        
        var stream_index = audio_streams.findIndex(audio_stream => audio_stream.user_id == user_id);
        
        if(stream_index != -1) {
            console.log('AudioManager addToUserAudioStream updated');
            audio_streams[stream_index].stream = stream || {}
        
        }else {
            console.log('AudioManager addToUserAudioStream added');
            audio_streams.push({
                stream: stream || {},
                user_id
            });
        }
    
        await this.setStateAsync({ audio_streams });

        bus.dispatch('audio_manager__audio_streams_updated');
    }

    async removeFromUserStreams(params) {
        var { user_id } = params;

        console.log('AudioManager removeFromUserStreams', user_id);

        var stream_index = this.state.audio_streams.findIndex(audio_stream => audio_stream.user_id == user_id);
        if(stream_index == -1) return;
    
        var audio_streams = this.state.audio_streams;
        audio_streams.splice(stream_index, 1);
    
        console.log('AudioManager removeFromUserStreams removed', audio_streams);
    
        await this.setStateAsync({ audio_streams });

        bus.dispatch('audio_manager__audio_streams_updated');
    }

    forcePlayAudios() {
        bus.dispatch('memorized_audio__force_play');
    }

    setStateAsync(state) {
        return new Promise((resolve) => {
          this.setState(state, resolve);
        });
    }

    render() {
        return (
        <>
        <div className="user-audio-streams-container" style={{ position: 'absolute', visibility: 'hidden' }}>
            { this.state.audio_streams.map((audio_stream) => {
                if(audio_stream.user_id == this.props.current_user.id) return;

                return (
                    <MemorizedAudio
                        key={audio_stream.user_id + '_audio'}
                        stream={ audio_stream.stream }
                        force_update={ this.props.force_update }
                        id="mix-audio-stream"
                    />
                );
            })}
        </div>
        </>
        );
    }
}

export default AudioManager;