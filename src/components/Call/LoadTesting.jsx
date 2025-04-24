import React from "react";
import axios from "axios";
import moment from "moment";
import * as common from "../../assets/js/helpers/common";
import * as datetime from "../../assets/js/helpers/datetime";
import "../../assets/css/call/load_testing.css";
import i18next from "i18next";

class LoadTesting extends React.Component {
  constructor(props) {
    super(props);

    this.current_user = common.getCurrentUser();
    this.max_test_users = 500;
    this.allowed_emails = [
      "zaid.iqbal.softech@gmail.com",
      "manish@ogoul.com",
      "tanwir@ogoul.com",
      "aqueel@ogoul.com",
    ];

    this.state = {
      total_test_users: 1,
      start_test_underway: false,
      is_authenticated: false,
      error: "",
    };
  }

  componentWillMount() {
    this.authenticate();
  }

  componentDidMount() {}

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  authenticate() {
    if (!this.allowed_emails.includes(this.current_user.email)) {
      window.location.href = "/";
      return;
    }

    this.setState({ is_authenticated: true });
  }

  testTestUsersChanged(event) {
    this.setState({ total_test_users: event.target.value });
  }

  async createTestMeeting() {
    var start_time = moment().add(1, "minutes");
    start_time = datetime.formatDateToDb(start_time, true);

    var meeting_data = {
      title: "Test Meeting",
      start_time,
      time_zone: moment.tz.guess(),
      duration: "00:40",
      password: common.makeRandomString(10),
      meet_now: "1",
      video_host: "0",
      video_participants: "0",
      audio_participants: "off",
      privacy_type: "public",
      chat: "on",
    };

    var response = await axios.post(
      "meetings/create_update_meeting",
      meeting_data
    );

    return response.data.data;
  }

  prepareStartTest() {
    if (this.state.total_test_users > this.max_test_users) {
      this.setState({
        error: i18next.t(
          "Maximum allowed test users are"
        )`${this.max_test_users}`,
      });

      return;
    }

    this.startTest();
  }

  async startTest() {
    if (this.state.start_test_underway) return;

    this.setState({ start_test_underway: true });

    var meeting = await this.createTestMeeting();

    if (!meeting.id) {
      this.setState({ start_test_underway: false });

      return;
    }

    var start_test_response = await window.rtc_helpers.socketEmit({
      event: "test-sfu--initiate",
      data: {
        room_id: `meeting_${meeting.id}`,
        total_test_users: this.state.total_test_users,
      },
      return_response: true,
    });

    var { total_test_users, error } = start_test_response;

    this.setState({ start_test_underway: false });

    if (error) {
      common.showAlert({
        title: "Couldn't start test, no more test users available.",
        text: "Someone else might be testing already.",
      });

      return;
    }

    common
      .showAlert({
        title: `Test Started Successfully For ${total_test_users} Test Users.`,
        html: `<b>Meeting Details</b> <br/> <br/>
                   <b>ID:</b> ${meeting.id} <br/> 
                   <b>Password:</b> ${meeting.password} `,
      })
      .then(() => {
        window.location.href = "/";
      });
  }

  render() {
    if (!this.state.is_authenticated) return;

    return (
      <div className="text-center pt-3 load-testing">
        <h3>Load Testing</h3>

        <div className="pt-4"></div>

        <div className="form-group text-left">
          <label for="total-test-users" className="font-weight-bold">
            Enter Test Users
          </label>

          <input
            type="number"
            min="1"
            max={this.max_test_users}
            className="form-control"
            id="total-test-users"
            value={this.state.total_test_users}
            onChange={this.testTestUsersChanged.bind(this)}
          />

          {this.state.error && <p className="error">{this.state.error}</p>}
        </div>

        <button
          type="button"
          className="button btn-primary w-100"
          disabled={this.state.start_test_underway}
          onClick={this.prepareStartTest.bind(this)}
        >
          <span className="pr-2">Start Test</span>

          {this.state.start_test_underway && (
            <i className="fas fa-circle-notch fa-spin"></i>
          )}
        </button>
      </div>
    );
  }
}

export default LoadTesting;
