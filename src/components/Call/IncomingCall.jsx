import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../Contexts";
import RtcHelpers from "webrtc-client/src/rtc_helpers";
import bus from "./bus";
import IncomingCallSound from "../../assets/audios/dial_tone.mp3"
import "../../assets/css/call/incoming_call.css";
import $ from "jquery";

var call_sound = false;

function IncomingCall() {
    const { ms_socket } = useContext(AppContext);
    const [incoming, setIncoming] = useState({});
    const incomingRef = useRef(incoming);
    incomingRef.current = incoming;
    const timeoutIdRef = useRef(false);
    const rtcHelperRef = useRef(false);

    useEffect(() => {
        call_sound = new Audio(IncomingCallSound);
        call_sound.loop = true;
        call_sound.volume = '0.6';
    }, []);

    useEffect(() => {
        attachCallListeners();
    }, [ms_socket]);
    
    const attachCallListeners = () => {
        if(!ms_socket) return;
        
        rtcHelperRef.current = new RtcHelpers({ socket: ms_socket });

        rtcHelperRef.current.onInvitation = (params) => onInvitation(params);
        rtcHelperRef.current.onInvitationCancelled = (params) => onInvitationCancelled(params);
    }

    const onInvitation = (params) => {
        setIncoming(params);
        showMe();

        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = setTimeout(() => {
            hideMe();
        }, 30000);
        
        call_sound.currentTime = 0;
        call_sound.play();
    }

    const onInvitationCancelled = ({ call_id, call_type }) => {
        if(call_id == incomingRef.current.call_id && call_type == incomingRef.current.call_type) {
            hideMe();
        }
    }

    const accept = () => {
        rtcHelperRef.current.acceptInvitation({ room_id: `${incoming.call_type}_${incoming.call_id}` });
        bus.dispatch('chat_call__join', { chat_id: incoming.call_id });
        hideMe();
    }

    const reject = () => {
        rtcHelperRef.current.rejectInvitation({ room_id: `${incoming.call_type}_${incoming.call_id}` });
        hideMe();
    }

    const showMe = () => {
        $(".incoming-call-modal").modal("show");
    }

    const hideMe = () => {
        setIncoming({});
        clearTimeout(timeoutIdRef.current);
        $(".incoming-call-modal").modal("hide");
        call_sound.pause();
    }

    return (
        <div
            className="incoming-call-modal modal fade"
            tabIndex="-1"
            role="dialog"
            aria-hidden="true">
        
            <div className="popup-backdrop"></div>

            <div className="modal-dialog popup-container" role="document">
                <div className="modal-content popup-inner">
                    <div className="top-part">
                        <img src={ incoming.caller_picture } />

                        <div className="right-side">
                            <p className="name">{ incoming.caller_name }</p>
                            <p>is inviting you to a private meeting</p>
                        </div>
                    </div>

                    <div className="bottom-part">
                        <button className="button btn-primary" onClick={ () => accept() }>Accept</button>
                        <button className="button btn-danger" onClick={ () => reject() }>Reject</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IncomingCall;