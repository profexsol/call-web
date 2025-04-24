import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { AppContext } from "../Contexts";
import ChatCall from "./Call/ChatCall";
import MeetingCall from "./Call/MeetingCall";
import JoinMeeting from "./JoinMeeting";
import IncomingCall from "./Call/IncomingCall";
import * as common from "../../assets/js/helpers/common";
import bus from "./bus";

function CallManager() {
    const { ms_socket } = useContext(AppContext);
    const auth = useSelector((state) => state.auth);
    const location = useLocation();

    useEffect(() => {
        mayBeJoinMeetingAtStart();
    }, []);

    useEffect(() => {
        attachCallSockets();
    }, [ms_socket]);

    const attachCallSockets = () => {
        if(!ms_socket) return;
        
        ms_socket.on('room:join-invitation', (data) => {
            console.log('room:join-invitation', data);
        });
    }

    const mayBeJoinMeetingAtStart = () => {
        // somehow without it we face error 'fails to minify from terser'
        if(process && process.env) {};
    
        var params = window.open_url_parameter;
    
        if (!window.is_desktop_app) {
            setTimeout(() => joinMeetingOnWeb(params), 3000);
        
        } else {
            setTimeout(() => joinMeetingOnApp(params), 3000);
        }
    }

    const joinMeetingOnWeb = (params) => {
        if (!params || params.indexOf("join_meeting") == -1) return;

        let meeting_detail = params.split("&")[1];
        let meeting_id = common.decryptIt(
            meeting_detail.split("meeting_id=")[1]
        );
        let password_detail = params.split("&")[2];
        let password = common.decryptIt(password_detail.split("password=")[1]);

        bus.dispatch("meeting_call__join", { meeting_id, password });
    }
    
    const joinMeetingOnApp = (params) => {
        if (!params) return;
    
        let meeting_detail = params.split("&")[1];
        if (!meeting_detail) return;
    
        let meeting_id = meeting_detail.split("meeting_id=")[1];
        let password_detail = params.split("&")[2];
        let password = password_detail.split("password=")[1];
    
        bus.dispatch("meeting_call__join", { meeting_id, password });
    
        if (params.split("&")[3]) {
            let auth_detail = params.split("&")[3];
            let guest_flag = auth_detail.split("auth_token=")[1];
    
            if (guest_flag == 1 && auth.authenticated == false) {
                window.open_url_parameter = null;
            } else {
                window.open_url_parameter = null;
            }
        }
    }

    return (
        <div>
        { 
            location.pathname != "/desktop_meeting" && (
            
            <>
            <MeetingCall />
            <ChatCall />
            <JoinMeeting />
            <IncomingCall />
            </>
        )}
        </div>
    )
}

export default CallManager;