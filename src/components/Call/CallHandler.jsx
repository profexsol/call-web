import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import bus from "../bus";
import $ from "jquery";
import { withTranslation } from "react-i18next";
import i18next from "i18next";
// import { 
//   DesktopCall, 
//   openDesktopWindow, 
//   closeDesktopWindow
// } from './Desktop/DesktopCall';
import { useTranslation } from "react-i18next";
import * as common from "../../assets/js/helpers/common";
// import useTFLite from "../../pipelines/hooks/useTFLite";
import { setInterval as setWorkerInterval, clearInterval as clearWorkerInterval } from 'worker-timers';
import Call from "./Call";
import BootstrapModal from "../Helpers/BootstrapModal";
import "../../assets/css/call/call_handler.css";
import { AppContext } from "../Contexts";

const electronn = window.require ? window.require('electron') : {};
const BrowserWindow = electronn.remote ? electronn.remote.BrowserWindow : {};
var worker_interval_id = false;

const segmentationConfig = {
  model: "meet",
  backend: window.is_desktop_app ? "wasm" : "wasmSimd",
  inputResolution: "256x144",
  pipeline: "webgl2",
  targetFps: 65, // 60 introduces fps drop and unstable fps on Chrome
  deferInputResizing: false,
};

const CallHandler = forwardRef((props, ref) => {
  const [userStatus, setUserStatus] = useState(props.user_status);
  const [userAction, setUserAction] = useState("");
  const [breakoutRoom, setBreakoutRoom] = useState(false);
  const [call, setCall] = useState(props.call);
  const [callOptions, setCallOptions] = useState(props.call_options);
  const [hostIds, setHostIds] = useState(props.hostIds);
  const [isReadyToJoin, setIsReadyToJoin] = useState(false);
  const [handlingCall, setHandlingCall] = useState(false);
  const mainRoomId = useRef(false);
  const userStatusRef = useRef(userStatus);
  const handlingCallRef = useRef(handlingCall);
  const callRef = useRef(call);
  const disrupted_modal_ref = useRef();
  const { socket } = useContext(AppContext);
  // const { tflite } = useTFLite(segmentationConfig);
  const tflite = {};
  const { t, i18n } = useTranslation();
  userStatusRef.current = userStatus;
  callRef.current = call;
  handlingCallRef.current = handlingCall;

  useEffect(() => {
    attachBusListeners();

    return () => {
      $("body").removeClass("handling-call");
    };
  }, []);

  useEffect(() => {
    if(!socket) return;

    attachSocketListeners();
  }, [socket]);

  useEffect(() => {
    setHostIds(props.host_ids);
  }, [props.host_ids]);

  const attachBusListeners = () => {
    bus.on('call__joined', () => {
      onCallJoined();
    });

    bus.on("call__left", (params) => {
      onCallLeft(params);
    });

    bus.on('call__join_cancelled', () => {
      resetThings();
    });
  };

  const attachSocketListeners = () => {
    console.log('callhandler attachSocketListeners', socket);

    socket.on("call__join_request_updated", (params) => {
      if (userStatusRef.current !== "waiting") return;
      if (callRef.current.id !== params.call_id) return;

      moveBackFromWaitingArea();
    });
  };

  const onCallJoined = (params) => {
  }

  const onCallLeft = (params) => {
    const { user_id, user_status, user_action, breakout_room, soft_leave } = params;

    if(user_id != common.getCurrentUser().id) return;
    if(!handlingCallRef.current) return;

    setBreakoutRoom(breakout_room);
    setIsReadyToJoin(false);
    setUserStatus(user_status);
    setUserAction(user_action);

    if (user_action === "join-breakout-room") joinBreakoutRoom(params);
    if (user_action === "leave-breakout-room") leaveBreakoutRoom(params);

    if(!soft_leave) {
       resetThings();
    }
  };

  const joinBreakoutRoom = async ({ is_video_on, is_audio_on, breakout_room }) => {
    await common.wait({ milliseconds: 2000 });
    
    mainRoomId.current = callRef.current.room_id;
    callRef.current.app_data.is_breakout_room = true;

    console.log('joinBreakoutRoom',callRef.current, callRef.current.app_data);

    setCall({
        ...callRef.current,
        room_id: breakout_room.id,
        main_room_id: mainRoomId.current
    });

    setCallOptions((prevOptions) => ({
        ...prevOptions,
        is_breakout_room: true,
        video: { ...prevOptions.video, muted: !is_video_on },
        audio: { ...prevOptions.audio, muted: !is_audio_on },
        enable_join_options: false,
        auth: { ...prevOptions.auth, password: "" },
    }));

    console.log("joinBreakoutRoom", mainRoomId.current, callRef.current.room_id);

    joinCall({ soft_join: true });

    setUserStatus("");
    setUserAction("");
  };

  const leaveBreakoutRoom = async ({ is_video_on, is_audio_on }) => {
    await common.wait({ milliseconds: 2000 });

    console.log("leaveBreakoutRoom", mainRoomId.current, callRef.current.app_data, callRef.current.room_id);

    callRef.current.app_data.is_breakout_room = false;

    var meeting = await props.getCall();
    if(meeting && meeting.host_ids) {
      setHostIds(meeting.host_ids || []);
    }

    setCall({
        ...callRef.current,
        room_id: mainRoomId.current,
        main_room_id: false
    });

    mainRoomId.current = false;

    setCallOptions((prevOptions) => ({
        ...prevOptions,
        is_breakout_room: false,
        video: { ...prevOptions.video, muted: !is_video_on },
        audio: { ...prevOptions.audio, muted: !is_audio_on },
        enable_join_options: false,
        auth: { ...prevOptions.auth, password: "" }
    }));

    joinCall({ soft_join: true });

    setUserStatus("");
    setUserAction("");
  };

  const moveBackFromWaitingArea = () => {
    setIsReadyToJoin(true);
    setUserStatus("");
  };

  const cancelJoin = () => {
    bus.dispatch("call__join_cancelled");

    resetThings();
  };

  const joinCall = (params = {}) => {
    var { call: new_call, soft_join } = params;

    var is_call_window = common.getUrlParameter('is_call_window', true);
    var desktop_window_id = window.is_desktop_app ? window.ipcRenderer.sendSync("call__get_window_id") : false;
    
    var call_in_progress = handlingCall || desktop_window_id;

    console.log('CallHandler joinCall', params, new_call, props.call_options, call);

    // if(call_in_progress && !is_call_window) {
    //   returnBackToCall({ new_call });

    //   if(!soft_join) return;
    // }
    
    if(window.is_desktop_app && !is_call_window && !soft_join) {
      openDesktopWindow(params);
      setCall(new_call);

      common.showLoadingAlert({ 
        customClass: { container: 'desktop-window-loading' } 
      });

      setTimeout(() => {
        common.closeAlerts();
      }, 3000);

      return;
    }

    if(!soft_join) {
      setCall(props.call);
      setCallOptions(props.call_options);
    }

    setUserStatus(props.user_status);
    setHandlingCall(true);
    setIsReadyToJoin(true);

    // makeLeaveOnSleepHibernate();

    $('body').addClass('handling-call');
 }

 const returnBackToCall = async ({ new_call }) => {
  console.log('returnBackToCall', new_call, call);

  if(new_call && new_call.id != call.id) {
    await common.showAlert({
      title: t("Another Meeting Is In Progress"),
      text: t("Please leave that meeting before joining another meeting")
    });
  }

  if(window.is_desktop_app) {
    var desktop_window_id = window.ipcRenderer.sendSync("call__get_window_id");
    var desktop_window = BrowserWindow.fromId(desktop_window_id);

    desktop_window.focus();
  } else {
    window.call_helpers.maximizeCall();
  }
 }

 const makeLeaveOnSleepHibernate = () => {
  var last_active_time = (new Date()).getTime();

  worker_interval_id = setWorkerInterval(() => {
    var current_time = (new Date()).getTime();
    var time_difference = (current_time - last_active_time) / 1000;
    var sleep_hibernate_detected = time_difference > 15;

    // console.log(
    //   'makeLeaveOnSleepHibernate interval', 
    //   'current_time', current_time,
    //   'last_active_time', last_active_time, 
    //   'time_difference', time_difference, 
    //   'sleep_hibernate_detected', sleep_hibernate_detected
    // );

    if (sleep_hibernate_detected) {
      clearWorkerInterval(worker_interval_id);
      worker_interval_id = false;

      disrupted_modal_ref.current.open();
    }
  
    last_active_time = current_time;
  }, 5000);
 }

 const disruptionOk = () => {
    window.leaveCall();
        
    setTimeout(() => {
      window.location.reload();
    }, 1000);
 }

 const resetThings = () => {
    closeDesktopWindow();
    setIsReadyToJoin(false);
    setHandlingCall(false);
    setCall(false);
    setCallOptions(false);

    if(worker_interval_id) clearWorkerInterval(worker_interval_id);
    worker_interval_id = false;

    $('body').removeClass('handling-call');
 }

 useImperativeHandle(ref, () => ({
    joinCall
 }));

  if(!handlingCall) return null;

  return (

    <div className="call-handler w-100 h-100">
      { isReadyToJoin && userStatus == '' &&

          <Call 
            {...props}
            host_ids={ hostIds }
            call={ call }
            call_options={ callOptions }
            breakout_room={ breakoutRoom }
            tflite={tflite}
          />
      }

      <BootstrapModal 
        title={ i18next.t('Meeting Disrupted') }
        className='call-disrupted-modal' 
        is_closeable={ false } 
        ref={ disrupted_modal_ref }>
        
        { i18next.t("Meeting was disrupted because your system went into sleep/hibernation state. Please Rejoin") }

        <div className="text-right mt-4">
          <button className="button btn-primary" onClick={disruptionOk}>
            { i18next.t("Ok") }
          </button>
        </div>
      </BootstrapModal>

      {userStatus === "waiting" && (
        <div className="only-notification">
          <div className="top-side">
            <i class="fas fa-hourglass-start icon"></i>
            {i18next.t("Host_has_moved_you")}
          </div>

          <button className="go-back-btn" onClick={cancelJoin}>
            {i18next.t("Go back")}
          </button>
        </div>
      )}

      {userStatus === "removed" && (
        <div className="only-notification">
          <div className="top-side">
            <i class="fas fa-user-times icon"></i>

            <p>
              {i18next.t("Host has removed you from this meeting session")}.{" "}
              <br />
              {i18next.t(
                "You can join in the next session if it is a recurring meeting"
              )}
            </p>
          </div>

          <button className="go-back-btn" onClick={cancelJoin}>
            {i18next.t("Go back")}
          </button>
        </div>
      )}

      {userStatus === "blocked" && (
        <div className="only-notification">
          <div className="top-side">
            <i class="fas fa-user-slash icon"></i>
            {i18next.t(
              "Host has blocked you from this meeting, you can't join this meeting anymore"
            )}
          </div>

          <button className="go-back-btn" onClick={cancelJoin}>
            {i18next.t("Go back")}
          </button>
        </div>
      )}

      {userAction === "join-breakout-room" && (
        <div className="only-notification">
          <div className="top-side">
            <i className="fas fa-th-large icon"></i>
            {i18next.t("Joining breakout room")} {breakoutRoom.title}
          </div>
        </div>
      )}

      {userAction === "leave-breakout-room" && (
        <div className="only-notification">
          <div className="top-side">
            <i className="fas fa-th-large icon"></i>
            {i18next.t("Returning to the main session")}
          </div>
        </div>
      )}
    </div>
  );
});

export default withTranslation("translation", { withRef: true })(CallHandler);