import React from 'react';
import bus from "../bus";
import io from "socket.io-client";
import { AppContext } from '../Contexts';
import RtcClient from '../../assets/webrtc-client/src/rtc_client';
const { ipcRenderer } = window.require ? window.require('electron') : {};

export default class CallLibrary extends React.Component {
    static contextType = AppContext;

	constructor(props) {
		super(props);

        this.rtc_options = false;
        this.call = this.props.call;
        this.default_call_options = {};
        this.call_options = this.props.call_options;
        this.video_constraints = {};
        this.call_voice = false;
        this.getDisplayMediaResolve = false;
        this.getDisplayMediaReject = false;
        this.identity = this.props.identity;

        this.room = {
            id: this.props.call.room_id,
            room_id: this.props.call.room_id,
            title: this.props.call.title,
            app_data: this.props.call.app_data,
            send_invitations: this.props.call_options.ring_on_start
        }
	}

	componentDidMount() {
        this.prepareThings();
	}

	componentWillUnmount() {
		// fix Warning: Can't perform a React state update on an unmounted component
	    this.setState = (state, callback)=>{
	        return;
	    };
	}

    attachBusListeners(){
        bus.on('share_screen_picker__selected' + this.identity, (source) => {
            this.shareScreenSelected(source);
        });

        bus.on('share_screen_picker__cancelled' + this.identity, () => {
            this.shareScreenCancelled();
        });
    }

    async prepareThings() {
        await this.initiateLibrary();
        this.attachBusListeners();

        this.joinCall();
    }

    //initiate library
    async initiateLibrary() {
        var rtc_client = new RtcClient();
        rtc_client.room = this.room;
        rtc_client.room_type = 'p2p';
        rtc_client.user = this.props.current_user;
        rtc_client.socket = this.context.ms_socket;
        rtc_client.socket_io = io;
        // rtc_client.server_url = process.env.REACT_APP_MEDIA_SERVER_URL;

        var ice_servers = [
            {
                url: 'stun:stun.worldnoordev.com:3478',
                urls: 'stun:stun.worldnoordev.com:3478',
            },
            {
                urls: "stun:stun.l.google.com:19302"
            },
            {
                url: 'turn:turn.worldnoordev.com:3478',
                username: 'softech',
                urls: 'turn:turn.worldnoordev.com:3478',
                credential: 'Kalaam2020',
            },
            // {
            //     urls: "turn:jump.chat",
            //     credential: 'af920b30676076ca38359dd90c6ac665',
            //     username: "jumpchat"
            // }
        ];

        rtc_client.bandwidth = {
            audio: 40,
            video: 200,
            screen: 300,
            max_overall: 500
        }

        rtc_client.rtc_config = {
            // iceTransportPolicy: 'relay',
            iceServers: ice_servers
        }

        rtc_client.user_media_constraints = {
            video: { 
                width: { max: 640 }, 
                height: { max: 480 },
                frameRate: { ideal: 20 },
                aspectRatio: 1.77778
            },
            audio: rtc_client.user_media_constraints.audio
        }

        rtc_client.display_media_constraints = {
            video: { 
                width: { max: 1920 },
                height: { max: 1080 },
                frameRate: { ideal: 20 },
                aspectRatio: 1.77778
            }
        }

        rtc_client.initial_user_media_constraints = Object.assign({}, rtc_client.user_media_constraints);
        
        if(this.call_options.video.muted) {
            rtc_client.initial_user_media_constraints.video = false;
        }
        if(this.call_options.audio.muted) {
            rtc_client.initial_user_media_constraints.audio = false;
        }
        
        if(window.is_desktop_app){
            rtc_client.getDisplayMedia = this.getDisplayMedia.bind(this)
        }

        rtc_client.initiate();

        this.rtc_client = rtc_client;

        this.props.callLibraryInitiated(this);

        return rtc_client;
    }

    async joinCall() {
        this.props.video_effects_ref.current && this.props.video_effects_ref.current.mayBeApplyEffectsAfterVideo();
        this.rtc_client.joinCall();
    }

    getDisplayMedia() {
        bus.dispatch('share_screen_picker__show');

        return new Promise((resolve, reject) => {
            //will be resolved/rejected later
            this.getDisplayMediaResolve = resolve;
            this.getDisplayMediaReject = reject;
        });
    }

    shareScreenSelected(source) {
        this.getSourceStream(source, (screen) => {
            this.getDisplayMediaResolve(screen);

            //need to minimize app so that shared window can get focus, as sometime it doesn't
            //not if sharing mizdah app window
            // settimeout is used to give a little delay so that screen is shared first then this runs...
            // otherwise it causes error and stops screen from being shared only on mac
            setTimeout(() => {
                if(source.name.toLowerCase() !== 'mizdah')
                    ipcRenderer.send('minimize');
            }, 500);
        });
    }

    shareScreenCancelled() {
        this.getDisplayMediaReject();
    }

    /**
     * Request fresh user media stream from device
     * @param constraints, MediaStreamConstraints object, constrains for @function navigator.mediaDevices.getUserMedia
     * @return promise
    */
    getUserMedia(constraints, callback){
        if(this.get_user_media_underway)
            return;

        this.get_user_media_underway = true;

        return navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            this.get_user_media_underway = false;
            
            callback(stream);
        })
        .catch((error) => {
            this.get_user_media_underway = false;
            throw error;
        });
    }

    getSourceStream(source, callback) {
        var options = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop'
                }
            }
        }
    
        //if source provided then getting that source stream
        //otherwise get desktop screen stream
        if(source)
            options.video.mandatory.chromeMediaSourceId = source.id;

        console.log('getSourceStream', source, source.id);
    
        return navigator.mediaDevices.getUserMedia(options).then(stream => {
            callback && callback(stream);

            return stream;
        }).catch(error => {
            console.log('getSourceStream error', error);
        });
    }

    getAllStreams() {
        var all_streams = [];
    
        Object.keys(this.props.connections).forEach(function(connection) {
            if(connection.stream)
                all_streams.push(connection.stream);
        });
    
        return all_streams;
    }

    render() {
        return null;
    }
}