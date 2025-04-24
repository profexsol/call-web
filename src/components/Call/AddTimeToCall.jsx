import React from "react";
import bus from "../bus";
import $ from "jquery";
import { withTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Button,
  FormControl,
  Select,
  MenuItem,
} from "@material-ui/core";
import i18next from "i18next";
import * as common from "../../assets/js/helpers/common";
import "../../assets/css/call/add_to_call.css";
import "../../assets/css/call/add_time_to_call.css";
import "font-awesome/css/font-awesome.min.css";

class AddTimeToCall extends React.Component {
  constructor(props) {
    super(props);

    this.call_data = this.props.call;
    this.subscription = common.getSubscription();
    this.plan = this.subscription ? this.subscription.plan : {};
    this.plan = this.plan || {};
    this.call_max_minutes = this.plan.call_max_minutes || 40;
    this.existing_minutes = this.props.call_options.timing.duration_minutes;

    this.state = {
      max_addable_hours: 0,
      max_addable_minutes: 0,
      minutes_selected: 0,
      hours_selected: 0,
      error: ''
    };
  }

  componentDidMount() {
    this.attachBusListeners();
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    this.hideMe();
  }

  attachBusListeners() {
    bus.on("add_to_call__update_call", (call_object) => {
      for (var key in call_object) {
        this.call_data[key] = call_object[key];
      }
    });

    bus.on("time__show", () => {
      this.prepareThings();
      this.showMe();
    });
  }

  onMinutesSelected(event) {
    this.setState({ minutes_selected: event.target.value });
  }

  onHoursSelected(event) {
    this.setState({ hours_selected: event.target.value });
  }

  prepareThings() {
    this.resetThings();

    var addable_minutes = this.call_max_minutes - this.existing_minutes;
    var max_addable_hours = 0;
    var max_addable_minutes = 0;

    if(addable_minutes <= 0) {
      this.setState({ error: "You subscription plan doesn't allow meeting to be extended more" })
    
    } else {
      max_addable_minutes = addable_minutes < 60 ? addable_minutes : 60;
      max_addable_hours = Math.floor(addable_minutes / 60);
    }

    this.setState({ 
      max_addable_minutes,
      max_addable_hours
    });
  }

  addTime() {
    var hours_to_add = this.state.hours_selected;
    var minutes_to_add = this.state.minutes_selected;

    const new_minutes_to_add = (hours_to_add * 60) + Number(minutes_to_add);
    if(new_minutes_to_add <= 0) {
      this.hideMe();
      return;
    }

    const final_minutes_to_add = new_minutes_to_add + this.existing_minutes;

    this.props.updateRoomAppData((app_data) => {
      var existing_minutes = app_data.duration_minutes ? app_data.duration_minutes : this.props.call.duration_minutes;
      app_data.duration_minutes = existing_minutes + new_minutes_to_add;

      return app_data;
    });
    
    toast.success(
      i18next.t("Time added successfully"),
      {
        position: 'bottom-left',
        className: 'call-toast'
      }
    );

    this.hideMe();
  }

  showMe() {
    $(".add-time-container").modal("show");
  }

  hideMe() {
    $(".add-time-container").modal("hide");
  }

  resetThings() {
    this.setState({
      error: '',
      minutes_selected: 0,
      hours_selected: 0
    });
  }

  render() {
    const { t } = this.props;

    return (
      <div
        className="add-time-container modal fade"
        tabIndex="-1"
        role="dialog"
        aria-hidden="true">
        
        <div className="popup-backdrop"></div>

        <div className="modal-dialog popup-container" role="document">
          <div className="modal-content popup-inner">

            <div className="popup-header">
              <div className="popup-heading">
                {t("Add Time")}  
              </div>

              <div className="popup-close" onClick={this.hideMe.bind(this)}>
                <i className="fas fa-times icon"></i>
              </div>
            </div>

            {this.state.error &&
              <p className="error">{ this.state.error }</p>
            }

            <FormControl className={`customFormControl select-container hours-container`}>
              <label>{ t('hours') }</label>

              <select
                id="add-hours-select"
                className="add-time-select"
                disabled={ !this.state.max_addable_hours }
                value={ this.state.hours_selected }
                onChange={ this.onHoursSelected.bind(this) }>
                
                {[...Array(this.state.max_addable_hours).keys()].map((val) => (
                  <option value={val}>{val} </option>
                ))}
              </select>
            </FormControl>

            <FormControl className={`customFormControl select-container minutes-container`}>
              <label>{ t('minutes') }</label>

              <select
                id="add-minutes-select"
                className="add-time-select"
                disabled={ !this.state.max_addable_minutes }
                value={ this.state.minutes_selected }
                onChange={ this.onMinutesSelected.bind(this) }>

                {[...Array(this.state.max_addable_minutes).keys()].map((val) => (
                  <option value={val}> {val} </option>
                ))}
              </select>
            </FormControl>
            
            <div className="options">
              <Button
                className="button success-btn"
                type="submit"
                variant="contained"
                color="secondary"
                style={{
                  backgroundColor: "#2d74da",
                }}
                fullWidth
                disabled={ this.state.error }
                onClick={ this.addTime.bind(this) }>

                {t("Add Time")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default withTranslation()(AddTimeToCall);