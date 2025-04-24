import React from 'react';
import bus from "../bus";
import Tab from "react-bootstrap/Tab";
import Nav from "react-bootstrap/Nav";
import CallParticipants from './CallParticipants';
import CallJoinRequests from './CallJoinRequests';
import  { withTranslation }  from 'react-i18next';
import i18next from "i18next";
import "../../assets/css/call/call_participants_section.css";

class CallParticipantsSection extends React.Component {
	constructor(props) {
		super(props);

        this.state = {
            show_me: false,
            active_tab_name: 'participants',
            total_join_requests: 0
        }

        this.attachBusListeners();
	}

    attachBusListeners() {
        bus.on('join_requests__count_updated', (total_join_requests) => {
            this.setState({ total_join_requests });
        });

        bus.on('side_panel__hide_all', () => {
            this.hideMe();
        });

        bus.on('participants__toggle', () => {
            if(this.state.show_me) {
                this.hideMe();
                return;
            }

            this.showMe();
        });
    }

    showMe() {
        bus.dispatch('side_panel__hide_all');
        
        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 1, section_name: 'participants'}
        );

        this.setState({ show_me: true });

        bus.dispatch('participants_section__opened');
    }

    hideMe() {
        bus.dispatch(
            'side_panel__visibility_changed', 
            { is_shown: 0, section_name: 'participants'}
        );

        this.setState({ show_me: false });
    }

	openJoinRequest() {
        this.setState({ active_tab_name: 'join-requests' });
    }

	render() {
		return (
            <div 
                className={"side-panel participants-section" + (this.state.show_me ? '' : ' d-none')}> 
                <div className='side-panel-header'>
                    {
                    !this.props.is_host
            
                    ?

                    <span>{ i18next.t("Participants") }</span>

                    :
                    
                    <Nav
                        variant="pills"
                        className="position-relative">
                        
                        <Nav.Item 
                            onClick={ () => this.setState({ active_tab_name: 'participants' }) }>
                            
                            <Nav.Link 
                                eventKey="participants" 
                                className={ this.state.active_tab_name == 'participants' ? 'active' : '' }>
                                
                                { i18next.t("Participants") }
                            </Nav.Link>
                        </Nav.Item>

                        <Nav.Item
                            onClick={ this.openJoinRequest.bind(this) }>

                            <Nav.Link eventKey="join-requests">
                                { i18next.t("Join_Requests") } 
                                <span className='ml-1'>{ this.state.total_join_requests }</span>
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                    }

                    <div className='actions'>
                        {/* <i class="fas fa-angle-down action"></i> */}
                        <i class="fas fa-times action" onClick={ () => this.hideMe() }></i>
                    </div>

                </div>
                
                <div className='side-panel-body'>
                    {
                    !this.props.is_host
                
                    ?
                    
                    <CallParticipants 
                        call={ this.props.call }
                        current_user={ this.props.current_user }
                        participants={ this.props.participants }
                        participants_ids={this.props.participants_ids}
                        screen_sharing_users={ this.props.screen_sharing_users }
                        video_on_users={ this.props.video_on_users }
                        audio_on_users={ this.props.audio_on_users }
                        recording_users={ this.props.recording_users }
                        host_ids={ this.props.host_ids }
                        rtc_client={ this.props.rtc_client }
                        is_host={ this.props.is_host }>
                    </CallParticipants>

                    :

                    <Tab.Container 
                        defaultActiveKey="participants"
                        activeKey={ this.state.active_tab_name }>
                        
                        <Tab.Content>
                            <Tab.Pane eventKey="participants">
                                <CallParticipants 
                                    call={ this.props.call }
                                    current_user={ this.props.current_user }
                                    participants={ this.props.participants }
                                    participants_ids={this.props.participants_ids}
                                    screen_sharing_users={ this.props.screen_sharing_users }
                                    video_on_users={ this.props.video_on_users }
                                    audio_on_users={ this.props.audio_on_users }
                                    recording_users={ this.props.recording_users }
                                    host_ids={ this.props.host_ids }
                                    rtc_client={ this.props.rtc_client }
                                    is_host={ this.props.is_host }>
                                </CallParticipants>
                            </Tab.Pane>

                            <Tab.Pane eventKey="join-requests">
                                <CallJoinRequests 
                                    call={ this.props.call }
                                    call_options={ this.props.call_options }
                                    current_user={ this.props.current_user }
                                    host_ids={ this.props.host_ids }>
                                </CallJoinRequests>       
                            </Tab.Pane>
                            
                        </Tab.Content>
                    </Tab.Container>
                    }
                </div>
            </div>
        )
	}
}
export default withTranslation()(CallParticipantsSection)