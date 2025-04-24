import React from "react";
import bus from "../bus";
import * as datetime from "../../assets/js/helpers/datetime";
import * as common from "../../assets/js/helpers/common";
import moment from "moment";
import Countdown from "react-countdown";
import { red } from "@material-ui/core/colors";
import "../../assets/css/call/time_master.css";
import i18next from "i18next";
import { AppContext } from "../Contexts";
var RtcHelpers = require("webrtc-client/src/rtc_helpers").default;

export default class CallTimeMaster extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);

    this.duration_minutes = "";
    this.minutes_passed = 0;
    this.allowed_emitted = false;
    this.interval = false;
    this.show_info_interval = false;
    this.current_date = datetime.getDate(new Date());
    this.is_host = this.props.is_host;
    this.current_user = this.props.current_user;
    this.timing = this.props.call_options.timing;
    this.call = this.props.call;
    this.call_started = false;
    this.is_breakout_room = this.props.call_options.is_breakout_room;
    this.bus_events_ids = [];
    this.socket_events = this.props.call_options.socket_events;
    this.subscription = common.getSubscription();
    this.plan_id = this.subscription ? this.subscription.plan_id : 0;

    this.state = {
      start_time: "",
      start_time_local_obj: "",
      duration_minutes: this.timing.duration_minutes,
      end_time_local: "",
      minutes_remaining: 0,
      call_ended: false,
      call_in_progress: false,
      show_info: false,
      call_allowed: false
    };
  }

  componentDidMount() {
    this.rtc_helpers = new RtcHelpers({ socket: this.context.ms_socket });

    this.attachBusListeners();
    this.attachSocketListeners();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    clearInterval(this.show_info_interval);
    this.removeBusListeners();

    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  attachBusListeners() {
    var bus_events_ids = this.bus_events_ids;

    bus_events_ids[bus_events_ids.length] = bus.on('call__mounted', () => {
      this.checkIfAllowed();
    });

    bus_events_ids[bus_events_ids.length] = bus.on("call__going_to_join", () => {
      this.startTimeWork();
    });
  }

  removeBusListeners() {
    this.bus_events_ids.forEach(event_id => {
      bus.remove(event_id);
    });

    this.bus_events_ids = [];
  }

  checkIfAllowed() {
    this.rtc_helpers.getRoom({ room_id: this.call.room_id }).then((room) => {
      this.call_started = room;

      if (this.isCallAllowed()) {
        this.allowCall();
      
      } else {
        this.setState({
          call_ended: this.isTimeFinished(),
          show_info: true 
        });
      }
    });
  }

  startTimeWork() {
    this.initializeTiming();
      
    if (this.timing.duration_minutes) {
      //calculating minutes passed every 10 seconds
      this.interval = setInterval(() => this.calcMinutesPassed(), 10000);
      this.show_info_interval = setInterval(() => this.decideToShowInfo(), 2000);
    }
  }

  initializeTiming() {
    var timing = this.timing;

    if (!timing) return;

    var state = {};

    if (timing.duration_minutes) {
      var start_time_local_obj = datetime.utcToLocal(timing.start_time);

      //if host started call before time, then start time is now
      if (this.is_host && moment().diff(start_time_local_obj, "minutes") < 0) {
        this.timing.start_time = new Date().toUTCString();
        timing.start_time = new Date().toUTCString();

        start_time_local_obj = datetime.utcToLocal(timing.start_time);
      }

      var end_time_local_obj = moment(start_time_local_obj).add(
        timing.duration_minutes,
        "minutes"
      );

      this.duration_minutes = timing.duration_minutes;

      state.start_time = timing.start_time;
      state.start_time_local_obj = start_time_local_obj;
      state.end_time_local = datetime.formatDateToDb(end_time_local_obj, true);
    }

    this.setState(state, function () {
      this.calcMinutesPassed();
    });
  }

  attachSocketListeners() {
    console.log('joinrequests attachSocketListeners');
  }

  calcMinutesPassed() {
    if (this.state.start_time) {
      this.minutes_passed = moment().diff(
        this.state.start_time_local_obj,
        "minutes"
      );
    }

    this.calcMinutesRemaining();
  }

  calcMinutesRemaining() {
    var minutes_remaining = 0;

    if (!this.state.start_time) minutes_remaining = false;

    if (this.minutes_passed < 0) minutes_remaining = 0;
    else minutes_remaining = this.duration_minutes - this.minutes_passed;

    this.setState(
      {
        minutes_remaining
      },
      function () {
        this.durationChanged();
      }
    );
  }

  //allowed if
  //there is no time restriction
  //or call time has not ended
  //&& (user is host of call or host has allowed anyone to start) or user is participant and call has been started by host
  isCallAllowed() {
    if (!this.timing.start_time) return true;

    if (
      !this.isTimeFinished() &&
      (this.is_host || this.call.who_can_start == "anyone" || this.call_started || this.is_breakout_room)
    ) {
      return true;
    }

    return false;
  }

  isCallTimeStarted() {
    var start_time_local_obj = datetime.utcToLocal(this.timing.start_time);
    return moment().diff(start_time_local_obj, "seconds") > 0;
  }

  isCallStarted() {
    return this.minutes_passed > 0;
  }

  isTimeFinished() {
    return false;
  }

  allowCall() {
    //no need to emit if already emitted
    if (!this.allowed_emitted) {
      this.setState({
        call_allowed: true,
      });

      this.allowed_emitted = true;
      bus.dispatch("call_time_master__allowed" + this.props.identity);
    }
  }

  durationChanged() {
    if (this.isCallStarted() && this.state.minutes_remaining <= 0) {
      this.setState({ call_ended: true });
    }

    if (!this.state.call_in_progress && this.isCallAllowed()) {
      this.setState({ call_in_progress: true });
    }
  }

  countdownFinished() {
    this.setState({ call_ended: true });

    common.showAlert({
      title: i18next.t("Meeting time finished")
    });

    bus.dispatch("call_time_master__time_ended");
  }

  decideToShowInfo() {
    //need to show time info
    var show_info = (!this.state.call_allowed && !this.state.call_ended) ||
      (this.state.duration_minutes &&
        this.state.call_in_progress &&
        this.state.minutes_remaining > 0 &&
        this.state.minutes_remaining <= 5);

    if(!this.state.show_info && show_info) {
      bus.dispatch('call_time_master__visbility_changed', 1);
    
    } else if(!show_info) {
      bus.dispatch('call__time_master__visbility_changed', 0);
    }

    this.setState({ show_info: show_info });
  }

  renderCountdown({ hours, minutes, seconds, completed }) {
    var sec = seconds;

    if (seconds < 10) sec = "0" + seconds;

    return (
      <div className="time-container">
        {i18next.t("Meeting ending in")} <span className="time">{`${minutes}:${sec}`}</span>
      </div>
    );
  }

  showAddTimeLimit() {
    bus.dispatch("time__show");
  }

  cancelJoin() {
    window.call_helpers.cancelJoin();
  }

  render() {
    return (
      <span className={"call-notification call-time-master " + (this.state.show_info ? '' : 'd-none')}>
        <i className="fa fa-clock-o icon" aria-hidden="true"></i>

        {!this.state.call_allowed && !this.state.call_ended && (
          <>
          <span className="text">
            {i18next.t("Please wait for the host to start the meeting")}

            <button className="button go-back-btn mt-3" onClick={() => window.call_helpers.cancelJoin()}>
              {i18next.t("Go back")}
            </button>
          </span>
          </>
        )}

        { this.state.duration_minutes &&
          this.state.call_in_progress &&
          this.state.minutes_remaining > 0 &&
          this.state.minutes_remaining <= 5 && (
            <>
              <Countdown
                date={this.state.end_time_local}
                renderer={this.renderCountdown}
                onComplete={this.countdownFinished.bind(this)}
              ></Countdown>
              {"  "}
              
              { this.props.host_ids.indexOf(this.current_user.id) != -1 && this.plan_id > 1 ? (
                <button
                  className="add-time-btn"
                  onClick={() => this.showAddTimeLimit()}>
                  
                  {i18next.t("Add Time")}
                </button>
              ) : null}
            </>
          )}
      </span>
    );
  }
}