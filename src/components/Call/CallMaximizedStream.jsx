import React from 'react';
import $ from 'jquery';
import '../../assets/css/call/maximized_stream.css';
import CallUserStream from './CallUserStream';
import bus from '../bus';

class CallMaximizedStream extends React.Component {
    constructor(props) {
		super(props);

        this.stream = false;

		this.state = {
            stream_ready: false
		}
	};

	componentDidMount() {
		this.attachCallListeners();
		this.attachBusListeners();
	}

    componentWillUnmount() {
		// fix Warning: Can't perform a React state update on an unmounted component
		this.setState = (state, callback) => {
			return;
		};

		this.hideMe();
	}

    attachCallListeners() {
        this.props.rtc_client.onUserVideoStream = this.onUserVideoStream.bind(this);
    }

    attachBusListeners() {
        bus.on('call_maximized_stream__maximize', (user_id) => {
            bus.dispatch('side_panel__hide_all');
            this.maximizeUserStream(user_id);
        });
    }

    maximizeUserStream(user_id) {
        this.maximized_user_id = user_id;
        
		this.props.rtc_client.getUserVideoStream({ user_id });
        
        this.setState({ stream_ready: true });
    }

    onUserVideoStream(params) {
        var { user_id, stream } = params;

        if(user_id != this.maximized_user_id) return;

        this.stream = stream || {};
    }

    hideMe() {
        window.call_helpers && window.call_helpers.mayBeDropUserStream({ user_id: this.maximized_user_id });

        this.setState({ stream_ready: false });
        this.maximized_user_id = false;
        this.stream = false;
    }

    render() {
        if(!this.state.stream_ready) return null;

		return (
            <div className='maximized-stream'>
                <div className="popup-close" onClick={ this.hideMe.bind(this) }>
                    <i className="fas fa-times icon"></i>
                </div>

                <CallUserStream 
                    identifier={ this.maximized_user_id + '_user' }
                    stream={ this.stream }
                    user_id={ this.maximized_user_id }
                    current_user={ this.props.current_user }
                    rtc_client={ this.props.rtc_client }
                    memorized_video_props = {{ muted: true }} 
                />
            </div>
        )
	}
}

export default CallMaximizedStream