import React from "react";
import ReactDOM from "react-dom";
import bus from "../bus";
import $ from "jquery";
import * as common from "../../assets/js/helpers/common";
import "../../assets/css/call/call_auth.css";
import i18next from "i18next";
import { AppContext } from "../Contexts";

export default class CallAuth extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);

    this.password = "";
    this.provided_password = "";
    this.is_authenticated = false;

    this.state = {
      join_request: {},
      error: "",
      is_loading: false,
    };

    this.onJoinRequestUpdated = this.onJoinRequestUpdated.bind(this);
  }

  componentDidMount() {
    this.prepareThings();
    this.attachSocketListeners();
    this.attachEventListeners();
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    this.hideMe();
    this.removeSocketListeners();
  }

  prepareThings() {
    this.password = this.props.call_options.auth.password;
    this.initAuthentication();
  }

  attachSocketListeners() {
    console.log('auth attachSocketListeners');
  }

  removeSocketListeners() {
  }

  attachEventListeners() {
    $(".call-auth-modal").on("hidden.bs.modal", () => {
      if (!this.is_authenticated && !this.state.join_request.request_status)
        bus.dispatch("call_auth__cancelled");
    });
  }

  onJoinRequestUpdated(data) {
    var request = data.join_request;

    if (this.state.join_request.id != request.id) return;

    this.setState((prevState) => ({
      join_request: {
        ...prevState.join_request,
        request_status: request.request_status,
      },
    }));

    if (request.request_status == "accepted") {
      this.authenticated();
    }
  }

  initAuthentication() {
    var provided_password = common.getUrlParameter("pwd");

    if (this.provided_password == this.password || !this.password)
      this.passwordVerified();
    else this.showMe();
  }

  authenticate() {
    this.setState({ is_loading: true });

    if (this.provided_password == this.password) {
      this.passwordVerified();
      return;
    }

    this.setState({ is_loading: false });
    this.setState({ error: "Invalid password" });
  }

  passwordVerified() {
    bus.dispatch("call_auth__password_verified");

    if (this.props.call_options.auth.is_approval_needed) {
      this.requestApproval();
    } else {
      this.authenticated();
    }
  }

  authenticated() {
    this.setState({ is_loading: false });
    this.is_authenticated = true;
    this.hideMe();
    bus.dispatch("call_auth__authenticated" + this.props.identity);
  }

  requestApproval() {
    return;
  }

  cancelJoin() {
    this.props.cancelJoin();
  }

  showMe() {
    $(".call-auth-modal").modal("show");
  }

  hideMe() {
    $(".call-auth-modal").modal("hide");
  }

  updatePasswordState(event) {
    this.provided_password = event.target.value;
  }

  render() {
    return (
      <div className='call-auth'>
        <div
          className="call-auth-modal modal fade"
          tabIndex="-1"
          role="dialog"
          aria-hidden="true">
          
          <div className="modal-dialog popup-container" role="document">
            <div className="modal-content popup-inner">

              <div className="popup-header">
                <div className="popup-heading">
                  {i18next.t("Enter your Password")}
                </div>

                <div className="popup-close" onClick={this.cancelJoin.bind(this)}>
                  <i className="fas fa-times icon"></i>
                </div>
              </div>

              <input
                type="text"
                onChange={(evt) => this.updatePasswordState(evt)}
                className="form-control"
                autoFocus
              />

              {this.state.error && (
                <span className="basic-error font-small">
                  {this.state.error}
                </span>
              )}

              <div className="options">
                <button
                  className="button success-btn"
                  onClick={this.authenticate.bind(this)}
                  disabled={this.state.is_loading}>

                  {i18next.t("Join Meeting")}
                  {this.state.is_loading && (
                    <i className="fa fa-circle-notch fa-spin"></i>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        { this.state.join_request.request_status &&
          this.state.join_request.request_status != "accepted" &&
          
          <div className="only-notification">
            <div>
              <i className="fas fa-user-plus icon" aria-hidden="true"></i>

              {this.state.join_request.request_status == "pending" && (
                <span className="text">{i18next.t("request_sent")}</span>
              )}

              {this.state.join_request.request_status == "rejected" && (
                <span className="rejected text">
                  { i18next.t("Your join request has been rejected by host") }
                </span>
              )}
            </div>

            <button 
              className="go-back-btn"
              onClick={ this.cancelJoin.bind(this) }>
              
              { i18next.t('Go back') }
            </button>
          </div>
        }
      </div>
    );
  }
}