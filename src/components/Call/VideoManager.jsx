import React from "react";
import bus from "../bus";
import GalleryView from "./GalleryView";
import SpeakerView from "./SpeakerView";

class VideoManager extends React.Component {
    constructor(props) {
        super(props);
        
        this.speaker_view_ref = React.createRef();
        this.bus_events_ids = [];

        this.state = {
            pagination: {
                page_number: 1,
                per_page_streams: window.innerWidth > 800 ? 5 : 3,
                total_pages: 1,
                is_page_underway: false,
                is_initial: true
            },
            video_streams: []
        }

        window.call_helpers.addWaitingUser = this.addWaitingUser.bind(this);
        window.call_helpers.getPageStreams = this.getPageStreams.bind(this);
        window.call_helpers.getCurrentUserStream = this.getCurrentUserStream.bind(this);
        window.call_helpers.mayBeGetUserStream = this.mayBeGetUserStream.bind(this);
        window.call_helpers.mayBeDropUserStream = this.mayBeDropUserStream.bind(this);
        window.call_helpers.goToNextPage = this.goToNextPage.bind(this);
        window.call_helpers.goToPreviousPage = this.goToPreviousPage.bind(this);
    }

    componentDidMount() {
        this.attachCallListeners();
        this.attachBusListeners();

        this.onJoined({ user_id: this.props.current_user.id });
    }

    componentWillUnmount() {
        this.removeBusListeners();

        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state, callback) => {
            return;
        };
    }

    attachCallListeners() {
        this.props.rtc_client.onJoined = this.onJoined.bind(this);
        this.props.rtc_client.onLeft = this.onLeft.bind(this);
        this.props.rtc_client.onUserVideoStream = this.onUserVideoStream.bind(this);
        this.props.rtc_client.onUserVideoStreamEnded = this.onUserVideoStreamEnded.bind(this);
        this.props.rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
        this.props.rtc_client.onPotentialUserVideo = this.onPotentialUserVideo.bind(this);
        this.props.rtc_client.onRoomTypeChanged = this.onRoomTypeChanged.bind(this);
    }

    attachBusListeners() {
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

    async onJoined(params) {
        var { user_id } = params;

        var participants_ids = this.props.rtc_client.participants_ids;
        
        var total_pages = Math.ceil(participants_ids.length / this.state.pagination.per_page_streams);
        var page_number = this.state.pagination.page_number;
        
        await this.updatePaginationState({
            total_pages, 
            is_last_page: (page_number == total_pages),
            is_first_page: page_number == 1
        });
    
        if (user_id == this.props.current_user.id) {
            this.addToUserStreams({ user_id, stream: this.props.rtc_client.stream });
    
            // either get recent share screen or page streams
            if (!this.props.getRecentShareScreenStream()) {
                this.getPageStreams();
            }

        } else {
            this.mayBeGetUserStream({ user_id, get_fresh: true });
        }
    }

    async onLeft(params) {
        var { user_id } = params;
    
        this.removeFromUserStreams({ user_id });

        if (user_id == this.props.current_user.id) return;

        var participants_ids = this.props.rtc_client.participants_ids;
        var total_pages = Math.ceil(participants_ids.length / this.state.pagination.per_page_streams);
        var page_number = this.state.pagination.page_number;

        await this.updatePaginationState({ 
            total_pages, 
            is_last_page: (page_number == total_pages),
            is_first_page: page_number == 1
        });
    
        var page_participants_ids = this.getPageParticipantsIds();
    
        if (page_participants_ids.length) {
          this.getPageStreams();
        
        } else {
          this.goToPreviousPage();
        }
    }

    onUserVideoStream(params) {
        this.mayBeAddToUserStreams(params);
    }

    onUserVideoStreamEnded({ user_id }) {
        this.removeFromUserStreams({ user_id, just_remove_stream: true });
    }

    onVideoSwitched(params) {
        var { user_id } = params;
    
        if (user_id == this.props.current_user.id) {
            this.mayBeAddToUserStreams({ user_id, stream: this.props.rtc_client.stream });
        }
    }

    onPotentialUserVideo({ user_id }) {
        this.mayBeGetUserStream({ user_id, get_fresh: true });
    }

    onRoomTypeChanged() {
        this.getPageStreams();
    }

    onAppliedEffectsToStream(params) {
        var { effected_stream } = params;
    
        this.mayBeAddToUserStreams({
            user_id: this.props.current_user.id,
            stream: effected_stream,
        });
    }
    
    onRemovedEffectsFromStream() {
        this.mayBeAddToUserStreams({
            user_id: this.props.current_user.id,
            stream: this.props.rtc_client.stream,
        });
    }

    getPageParticipantsIds({ page_number } = {}) {
        var { page_number: current_page_number, per_page_streams } = this.state.pagination;
    
        if(!page_number) page_number = current_page_number;
    
        var max_number = page_number * per_page_streams;
        var start_number = max_number - per_page_streams;
    
        var page_participants_ids = [];
    
        for (var i = start_number; i < max_number; i++) {
          if(!this.props.participants_ids[i]) continue;
    
          page_participants_ids.push(this.props.participants_ids[i]);
        }
    
        console.log('getPageParticipantsIds', page_number, per_page_streams, start_number, max_number, page_participants_ids, this.props.participants_ids);
    
        return page_participants_ids;
    }

    getUserStream(params) {
        var { user_id } = params;

        console.log('getUserStream', user_id);
        this.addToUserStreams({ user_id });
        
        this.props.rtc_client.getUserVideoStream(params);
    }

    mayBeGetUserStream(params) {
        var { user_id } = params;
    
        var page_participants_ids = this.getPageParticipantsIds();
        if (!page_participants_ids.includes(user_id)) return;
    
        this.getUserStream(params);
    }

    addWaitingUser(params) {
        var { user } = params;

        if (this.state.video_streams.length >= this.state.pagination.per_page_streams) return;
    
        this.addToUserStreams({
            user_id: user.id,
            is_waiting: true,
            participant: {
                user
            }
        });
    
        // need to remove waiting box if user doesn't join within mentioned time
        setTimeout(() => {
            var { user_stream } = this.getFromUserStreams({ user_id: user.id });
    
            if (!user_stream || !user_stream.is_waiting) return;
    
            this.removeFromUserStreams({ user_id: user.id });
        
        }, 40000);
    }

    getPageStreams(params) {
        var { page_number } = params || {};
    
        console.log('getPageStreams');
    
        var { page_number: previous_page_number, per_page_streams } = this.state.pagination;
        if(!page_number) page_number = previous_page_number;
        
        this.updatePaginationState({ page_number });
    
        var page_participants_ids = this.getPageParticipantsIds({ page_number });
    
        bus.dispatch('call__get_page_streams_underway', { page_participants_ids });
    
        var max_number = page_number * per_page_streams;
        var start_number = max_number - per_page_streams;
    
        console.log("getPageStreams info", page_number, start_number, max_number);
    
        for (var i = start_number; i < max_number; i++) {
          var user_id = this.props.participants_ids[i];

          if(typeof user_id == "number" || (typeof user_id == "string" && !user_id.match("_live_stream"))){
          
            var { user_stream } = this.getFromUserStreams({ user_id });
        
            console.log("getPageStreams user_id", user_id, 'user_stream', user_stream, user_stream && user_stream.stream && user_stream.stream.id);
        
            if (!user_id) continue;
            if (user_stream && user_stream.stream && user_stream.stream.id) continue;
        
            this.getUserStream({ user_id });
          }
        }
    
        // pagination underway is not needed first time, no need to show loaders
        if(this.state.pagination.is_initial) return;

        this.updatePaginationState({ is_page_underway: true });
        
        setTimeout(() => {
            this.updatePaginationState({ is_page_underway: false });
        }, 2000);
    }

    dropPageStreams(params) {
        var { page_number = this.state.pagination.page_number } = params || {};
    
        console.log('dropPageStreams', page_number);
    
        if(!page_number || page_number < 1) return;
    
        var { page_number: page_number_original, per_page_streams } = this.state.pagination;
        if(!page_number) page_number = page_number_original;
    
        var max_number = page_number * per_page_streams;
        var start_number = max_number - per_page_streams;
    
        for (var i = start_number; i < max_number; i++) {
            var user_id = this.props.participants_ids[i];
    
            console.log('dropPageStream', user_id);
    
            if (!user_id) continue;
            
            this.mayBeDropUserStream({ user_id, check_user_streams: false });
            this.removeFromUserStreams({ user_id });
        }
    }
    
    dropNonPageStreams() {
        var page_participants_ids = this.getPageParticipantsIds();
        var video_streams = JSON.parse(JSON.stringify(this.state.video_streams));
    
        console.log('dropNonPageStreams', page_participants_ids, video_streams);
    
        video_streams.forEach((user_stream) => {
            var user_id = user_stream.user_id;
            console.log('dropNonPageStreams', user_id);
            if(page_participants_ids.includes(user_id) || user_stream.is_waiting) return;
        
            this.mayBeDropUserStream({ 
                user_id,
                remove_from_user_streams: true,
                check_user_streams: false
            });
        });
    }

    goToNextPage() {
        var page_number = this.state.pagination.page_number + 1;
        if(page_number > this.state.pagination.total_pages) return;
    
        this.goToPage({ page_number });
    }
    
    goToPreviousPage() {
        var page_number = this.state.pagination.page_number - 1;
        if (page_number < 1) return;
    
        this.goToPage({ page_number });
    }
    
    async goToPage({ page_number }) {
        console.log('goToPage', page_number);
    
        var previous_page_number = this.state.pagination.page_number;
        var total_pages = this.state.pagination.total_pages;

        await this.updatePaginationState({ 
            is_initial: false, 
            is_last_page: page_number == total_pages,
            is_first_page: page_number == 1
        });
    
        if(page_number != previous_page_number)
            this.dropPageStreams({ page_number: previous_page_number });
        
        this.getPageStreams({ page_number });
    }

    getCurrentUserStream({ stream }) {
        if(!this.props.video_effects_ref) return;
        
        var video_effects_component = this.props.video_effects_ref.current;
        var effected_stream = video_effects_component ? video_effects_component.state.effected_stream : {};
    
        // if effects are applied to stream then we should use effected stream
        // if we don't do this then on video switched event local original stream can override
        // effected stream in player which is an issue
        if (effected_stream.id) return effected_stream;
    
        return stream;
    }

    mayBeAddToUserStreams(params) {
        var { user_id } = params;
    
        var page_participants_ids = this.getPageParticipantsIds();

        console.log(
            'mayBeAddToUserStreams', 
            'params', params,
            'page_participants_ids', page_participants_ids, 
            'page_number', this.state.pagination.page_number
        );

        if (!page_participants_ids.includes(user_id)) return;
    
        this.addToUserStreams(params);
    }
    
    addToUserStreams(params) {
        var { stream, user_id, is_waiting, participant } = params;
    
        var participant = participant || this.props.participants[user_id];
        var video_streams = this.state.video_streams;
    
        var { user_stream_key: existing_stream_key } = this.getFromUserStreams({
            user_id,
        });
    
        if (user_id == this.props.current_user.id) {
            stream = this.getCurrentUserStream({ stream });
        }
    
        console.log(
            'addToUserStreams', 
            'user_id', user_id, 
            'stream', stream, 
            'existing_stream_key', existing_stream_key, 
            'video_streams', video_streams
        );
    
        if (existing_stream_key !== false) {
            console.log('addToUserStreams updated');

            video_streams[existing_stream_key].stream = stream;
            video_streams[existing_stream_key].is_waiting = is_waiting || false;
            
        } else if (video_streams.length < this.state.pagination.per_page_streams) {
            console.log('addToUserStreams added');
            
            video_streams.push({
                stream: stream || {},
                user_id,
                is_waiting,
                participant,
            });
        }
    
        this.setState({ video_streams });
    }
    
    getFromUserStreams(params) {
        var { user_id } = params;
    
        var user_stream = false;
        var user_stream_key = false;
    
        this.state.video_streams.forEach((u_stream, key) => {
          if (u_stream.user_id == user_id) {
            user_stream = u_stream;
            user_stream_key = key;
          }
        });
    
        console.log('getFromUserStreams', user_id, user_stream_key, user_stream, this.state.video_streams);
    
        return { user_stream, user_stream_key };
    }
    
    removeFromUserStreams(params) {
        var { user_id, just_remove_stream } = params;
    
        var { user_stream_key } = this.getFromUserStreams({ user_id });
    
        console.log('removeFromUserStreams', user_id, user_stream_key)
    
        if (user_stream_key === false) return;
    
        var video_streams = this.state.video_streams;
        if(just_remove_stream) {
            video_streams[user_stream_key].stream = {};
        
        } else{
            video_streams.splice(user_stream_key, 1);
        }
    
        console.log('removeFromUserStreams removed just_remove_stream', just_remove_stream, 'video_streams', video_streams);
    
        this.setState({ video_streams });
    }
    
    mayBeDropUserStream(params) {
        var { user_id, check_user_streams = true, remove_from_user_streams = false } = params;
    
        var { user_stream } = this.getFromUserStreams({ user_id });
        var speaker_stream = this.speaker_view_ref.current ? this.speaker_view_ref.current.speaker_streams[user_id] : false;
    
        console.log(
            'mayBeDropUserStream', 
            'user_id', user_id, 
            'check_user_streams', check_user_streams, 
            'user_stream', user_stream, 
            'speaker_stream', speaker_stream, 
            'speaker_streams', this.speaker_view_ref.current && this.speaker_view_ref.current.speaker_streams
        );

        // no need to drop user stream if it is being used as user stream or as speaker stream
        if ((check_user_streams && user_stream) || speaker_stream) return;
    
        console.log('mayBeDropUserStream going to drop');
    
        this.props.rtc_client.dropUserVideoStream({ user_id });
    
        if(remove_from_user_streams) {
            this.removeFromUserStreams({ user_id, just_remove_stream: true });
        }
    
        return true;
    }

    async changeViewType({ view_type, per_page_streams }) {
        console.log('videoManager changeViewType', view_type, per_page_streams);

        var per_page_streams = per_page_streams;
        var set_default = !per_page_streams;
        var page_number = 1;

        this.updatePagination({ page_number, per_page_streams, set_default });
    }

    async updatePagination(params) {
        console.log('updatePagintation', params, this.props.view_type);
        var { page_number, per_page_streams, set_default } = params;

        if(set_default) {
            per_page_streams = (this.props.view_type == 'speaker') ? (window.innerWidth > 800 ? 5 : 3) : 20;
        }

        page_number = page_number || this.state.pagination.page_number;
        var total_pages = Math.ceil(this.props.participants_ids.length / per_page_streams);
        var is_last_page = (page_number == total_pages);
        var is_first_page = page_number == 1;
        
        await this.updatePaginationState({
            page_number,
            total_pages, 
            per_page_streams, 
            is_last_page,
            is_first_page 
        });
 
         // incase if per page streams are lesser now, need to remove unnecessary streams
         // can happen e.g when switched from gallery to speaker view
         this.dropNonPageStreams();
 
         this.getPageStreams();
    }

    updatePaginationState(pagination) {
        return this.setStateAsync({ 
            pagination: {
                ...this.state.pagination,
                ...pagination
            }
        });
    }

    setStateAsync(state) {
        return new Promise((resolve) => {
          this.setState(state, resolve);
        });
    }

    render() {
        return (
            <div className="video-manager w-100 h-100">
            {
                (!this.state.pagination.is_initial || this.state.video_streams.length) &&
                
                (
                    this.props.view_type == 'gallery'

                    ?

                    <GalleryView
                        user_streams={ this.state.video_streams }
                        pagination={ this.state.pagination }
                        participants_ids={ this.props.participants_ids }
                        rtc_client={ this.props.rtc_client }
                        current_user={ this.props.current_user }
                    />

                    :

                    <SpeakerView
                        user_streams={ this.state.video_streams }
                        participants={ this.props.participants }
                        participants_ids={ this.props.participants_ids }
                        current_user={ this.props.current_user }
                        pagination={ this.state.pagination }
                        rtc_client={ this.props.rtc_client }
                        ref={ this.speaker_view_ref }
                    />
                )
            }
            </div>
        );
    }
}

export default VideoManager;