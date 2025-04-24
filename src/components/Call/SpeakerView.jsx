import React from "react";
import bus from "../bus";
import CallUserStreams from "./CallUserStreams";
import CallUserStream from "./CallUserStream";
import "../../assets/css/call/speaker_view.css";

class SpeakerView extends React.Component {
    constructor(props) {
        super(props);

        this.speaker_streams = {};
        this.speaker_streams_user_ids = [];
        this.bus_events_ids = [];
        this.component_active = false;

        this.state = {
            speaker_stream: {}
        };
    }

    componentDidMount() {
        this.component_active = true;

        this.attachCallListeners();
        this.attachBusListeners();
        this.selectSpeakerStream();
    }

    componentWillUnmount() {
        this.component_active = false;
        this.removeBusListeners();

        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state, callback) => {
            return;
        };
    }

    attachCallListeners() {
        this.props.rtc_client.onUserVideoStream = this.onUserVideoStream.bind(this);
        this.props.rtc_client.onUserVideoStreamEnded = this.onUserVideoStreamEnded.bind(this);
        this.props.rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
        this.props.rtc_client.onAudioSwitched = this.onAudioSwitched.bind(this);
        this.props.rtc_client.onSpeaking = this.onSpeaking.bind(this);
        this.props.rtc_client.onLeft = this.onLeft.bind(this);
    }

    attachBusListeners() {
		this.bus_events_ids[this.bus_events_ids.length] = 
		bus.on('call__get_page_streams_underway', (params) => {
			this.onPageStreamsUnderway(params);
		});

        this.bus_events_ids[this.bus_events_ids.length] = 
		bus.on('call_video_effects__applied_effects_to_stream', (params) => {
			this.onAppliedEffectsToStream(params);
		});

        this.bus_events_ids[this.bus_events_ids.length] = 
		bus.on('call_video_effects__removed_effects_from_stream', (params) => {
			this.onRemovedEffectsFromStream(params);
		});
	}

    removeBusListeners() {
		this.bus_events_ids.forEach(event_id => {
			bus.remove(event_id);
		});
	}

    onUserVideoStream({ stream, user_id }) {
        console.log(
            'SpeakerView onUserVideoStream', 
            'user_id', user_id, 
            'speaker_streams', this.speaker_streams, 
            'speaker_streams[user_id]', this.speaker_streams[user_id]
        );
        
        if(!this.speaker_streams[user_id]) return;
        
        this.addSpeakerStream({ stream, user_id });
    }

    onUserVideoStreamEnded({ stream }) {
        if(!stream) return;
        if(!this.state.speaker_stream.stream) return;

        if(stream.id == this.state.speaker_stream.stream.id) {
            this.state.speaker_stream.stream = null;
            this.setState({ speaker_stream: this.state.speaker_stream });
        }
    }

    onAudioSwitched({ user_id, is_audio_on }) {
        if(is_audio_on) {
            this.getSpeakerStream({ user_id });
        
        }else{
            this.removeSpeakerStream({ user_id });
        }
    }

    onVideoSwitched({ user_id, is_video_on }) {
        if(user_id != this.state.speaker_stream.user_id) return;
        if(is_video_on) return;

        this.addSpeakerStream({ stream: null, user_id });
    }

    onSpeaking({ user_id }) {
        if(user_id == this.props.current_user.id && !this.props.rtc_client.is_audio_on) return;

        this.selectSpeakerStream({ user_id });
    }

    onLeft({ user_id }) {
        this.removeSpeakerStream({ user_id });
    }

    onPageStreamsUnderway({ page_participants_ids }) {
        var speaker_user_id = this.state.speaker_stream.user_id;
        
        if(!speaker_user_id) return;
        if(page_participants_ids.includes(speaker_user_id)) return;

        console.log('onPageStreamsUnderway', speaker_user_id, page_participants_ids);

        this.getSpeakerStream({ user_id: speaker_user_id });
    }

    onAppliedEffectsToStream({ effected_stream }) {
        console.log('speakerView onAppliedEffectsToStream', effected_stream, this.speaker_streams_user_ids);

        var user_id = this.props.current_user.id;
        if(!this.speaker_streams[user_id]) return;

        this.addSpeakerStream({ stream: effected_stream, user_id });
    }

    onRemovedEffectsFromStream() {
        console.log('speakerView onRemovedEffectsFromStream', this.speaker_streams_user_ids);
        
        var user_id = this.props.current_user.id;
        if(!this.speaker_streams[user_id]) return;

        this.addSpeakerStream({ stream: this.props.rtc_client.stream, user_id });
    }

    getSpeakerStream({ user_id }) {
        if(!this.component_active) return;
        if(!user_id) return;
        
        var speaker_stream = this.addSpeakerStream({ user_id });
        
        if(!this.speaker_streams_user_ids.includes(user_id))
            this.speaker_streams_user_ids.push(user_id); 
        
        this.props.rtc_client.getUserVideoStream({ user_id });

        return speaker_stream;
    }

    addSpeakerStream({ stream, user_id, select_speaker_stream = true }) {
        console.log('addSpeakerStream', stream, user_id);

        if(!user_id) return;

        var participant = this.props.participants[user_id];
        var speaker_streams = this.speaker_streams;
        var speaker_stream = speaker_streams[user_id];
    
        if (user_id == this.props.current_user.id) {
            stream = window.call_helpers.getCurrentUserStream({ stream });
        }
    
        if (speaker_stream) {
            console.log('addSpeakerStream updated stream');
            speaker_stream.stream = stream || {};
        
        } else {
            console.log('addSpeakerStream added stream');
            speaker_stream = {
                stream: stream || {},
                user_id,
                participant
            };

            speaker_streams[user_id] = speaker_stream;
        }
        
        this.speaker_streams = speaker_streams;

        if(this.state.speaker_stream.user_id == user_id) {
            this.setState({ speaker_stream });
        }
        
        if(select_speaker_stream)
            this.selectSpeakerStream({ force_update: true });
        
        this.keepFewSpeakerStreams();

        return speaker_stream;
    }

    // Keeps only 3 most recent speaker streams
    keepFewSpeakerStreams() {
        console.log('keepFewSpeakerStreams', this.speaker_streams_user_ids, this.speaker_streams);
        var count = 0;
        var max_speaker_streams = 3;
        
        for(var i = this.speaker_streams_user_ids.length - 1; i >= 0; i--) {
            var user_id = this.speaker_streams_user_ids[i];
            count++;

            console.log('keepFewSpeakerStream', user_id, count, i);

            if(count <= max_speaker_streams) continue;
            this.removeSpeakerStream({ user_id });
        }
    }

    removeSpeakerStream({ user_id }) {
        console.log('removeSpeakerStream', user_id);

        delete this.speaker_streams[user_id];

        var index = this.speaker_streams_user_ids.indexOf(user_id);
        if (index !== -1) {
            this.speaker_streams_user_ids.splice(index, 1);
        }

        if(this.state.speaker_stream.user_id == user_id) {
            this.setState(
                { speaker_stream: {} }, 
                () => this.selectSpeakerStream()
            );
        }

        window.call_helpers && window.call_helpers.mayBeDropUserStream({ user_id });
    }

    selectSpeakerStream({ user_id = 0, force_update } = {}) {
        var speaker_stream = this.speaker_streams[user_id] || this.getSpeakerStream({ user_id });
        var existing_speaker_stream = this.state.speaker_stream.stream ? this.state.speaker_stream : false
        var first_speaker_stream = Object.values(this.speaker_streams)[0];
        var first_user_stream = this.props.user_streams[0];

        speaker_stream = speaker_stream || existing_speaker_stream || first_speaker_stream || first_user_stream;
        var speaker_user_id = speaker_stream.user_id || 0;

        if(!force_update && user_id == this.state.speaker_stream.user_id) return;

        this.addSpeakerStream({ 
            stream: speaker_stream.stream, 
            user_id: speaker_user_id, 
            select_speaker_stream: false 
        });
        
        this.setState({ speaker_stream });
    }

    render() {
        return (
            <div className={ "speaker-view w-100 h-100 " + (this.props.participants_ids.length == 1 ? 'only-me' : '') }>
                { this.props.user_streams.length >= 1 &&

                    <div className="other-streams">
                        <CallUserStreams
                            user_streams={ this.props.user_streams }
                            pagination={ this.props.pagination }
                            force_update={ this.props.streams_force_update }
                            participants_ids={ this.props.participants_ids }
                            rtc_client={ this.props.rtc_client }
                            current_user={ this.props.current_user }
                        />
                    </div>
                }
                
                <div className="speaker-stream">
                    <CallUserStream
                        identifier={"speaker_view_speaker"}
                        stream={ this.state.speaker_stream.stream }
                        user_id={ this.state.speaker_stream.user_id }
                        participant={ this.state.speaker_stream.participant }
                        rtc_client={ this.props.rtc_client }
                        current_user={ this.props.current_user }
                        memorized_video_props={{
                            muted: true,
                        }}
                        className="media_element"
                    />
                </div>
            </div>
        );
    }
}

export default SpeakerView;
