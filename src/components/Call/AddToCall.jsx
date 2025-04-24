import React from "react";
import bus from "../bus";
import $ from "jquery";
import compose from "recompose/compose";
import { withTranslation } from "react-i18next";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { toast } from "react-toastify";
import i18next from "i18next";
import "react-toastify/dist/ReactToastify.css";
import "../../assets/css/call/add_to_call.css";
import "font-awesome/css/font-awesome.min.css";

class AddToCall extends React.Component {
  constructor(props) {
    super(props);

    this.call_data = this.props.call;
    this.call_options = this.props.call_options;
    this.fetched_contacts = false;
    this.contacts = [];

    this.state = {
      filtered_contacts: [],
      to_be_added_users: {},
      searched_query: '',
      email_query: '',
      user_ids: [],
      emailError: "",
      email: "",
      tabingvalue: 0,
      users: [],
      is_loading: false,
      add_to_call_underway: false,
      search_by_email_underway : false,
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

    bus.on("add_to_call__show", () => {
      this.showMe();
    });
  }

  fetchContacts() {
    if (this.fetched_contacts) return false;

    this.setState({ is_loading: true });
  }

  searchContacts(e) {
    var query = e.target.value;

    this.setState({ searched_query: query });

    var filtered_contacts = this.contacts.filter((contact) => {
      var first_name_matched = contact.other_user.first_name.indexOf(query) != -1;
      var last_name_matched = contact.other_user.last_name.indexOf(query) != -1;
      var email_matched = contact.other_user.email.indexOf(query) != -1;

      return first_name_matched || last_name_matched || email_matched;
    });

    this.setState({ filtered_contacts });
  }

  searchByEmailChanged(e) {
    this.setState({ 
      email_query: e.target.value,
      error: ''
    });
  }

  async searchByEmail() {
    if(!this.state.email_query) return;
    if(this.state.search_by_email_underway) return;

    this.setState({ search_by_email_underway: true });

    var user = await this.getUserByEmail(this.state.email_query);

    this.setState({ search_by_email_underway: false });
    
    if(!user) {
      this.setState({ error: 'User not found' });
      return;
    }

    this.setState({ email_query: '' });
    this.prepareToBeAddedUser(user);
  }

  prepareContacts() {
    var contacts = this.contacts;

    contacts.forEach((contact) => {
      if (contact.user_id == this.props.current_user.id){
        contact.other_user = contact.contact_user;
      
      } else { 
        contact.other_user = contact.user;
      }

      //whether user is already in call or not
      contact.is_participant = Object.values(this.props.participants).some(
        (participant) => {
          return participant.id == contact.other_user.id;
        }
      );

      //current user is participant and is added to call
      if (contact.other_user.id == this.props.current_user.id) {
        contact.is_participant = true;
      }
    });

    this.contacts = contacts;
  }

  prepareToBeAddedUser(user) {
    var users = this.state.to_be_added_users;
    if(this.props.participants[user.id]) return;
    if(users[user.id]) return;

    users[user.id] = user;

    this.setState({ to_be_added_users: users });
  }

  removeToBeAddedUser(user) {
    var users = this.state.to_be_added_users;
    delete users[user.id];

    this.setState({ to_be_added_users: users });
  }

  addToCall() {
    if (this.state.add_to_call_underway || !Object.keys(this.state.to_be_added_users).length) return false;

    this.setState({ add_to_call_underway: true });
  }

  async getUserByEmail(email) {
    return false;
  }

  validateEmail(email) {
    const re =
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  handleNewTabChange(event, newValue) {
    this.setState({ tabingvalue: newValue });
  }

  a11yProps(index) {
    return {
      id: `scrollable-auto-tab-${index}`,
      "aria-controls": `scrollable-auto-tabpanel-${index}`,
    };
  }

  showMe() {
    $(".add-to-call").modal("show");
    this.fetchContacts();
  }

  hideMe() {
    this.resetThings();
    $(".add-to-call").modal("hide");
  }

  resetThings() {
    this.setState({
      to_be_added_users: {},
      add_to_call_underway: false,
      search_by_email_underway: false,
      searched_query: '',
      email_query: '',
      error: '',
      is_loading: false
    });
  }

  render() {
    const { t, i18n } = this.props;

    return (
      <div
        className="add-to-call modal fade"
        tabIndex="-1"
        role="dialog"
        aria-hidden="true">

        <div className="popup-backdrop"></div>

        <div className="modal-dialog popup-container" role="document">
          <div className="modal-content popup-inner">
            
            {this.state.is_loading && (
              <i className="fas fa-circle-notch fa-spin loaderr mb-2"></i>
            )}

            <div className="popup-header">
              <div className="popup-heading">
                { t("Add Participants") }
              </div>

              <div className="popup-close" onClick={ this.hideMe.bind(this) }>
                <i className="fas fa-times icon"></i>
              </div>
            </div>
            
            {this.props.participants_ids.length >= this.call_options.participants.max_participants &&
              <p className="p-3 m-0 font-italic">
                {t("maxParticipants")}
              </p>
            }
          
            <Tabs
              className="tabs-container"
              value={this.state.tabingvalue}
              onChange={this.handleNewTabChange.bind(this)}
              indicatorColor="primary"
              variant="fullWidth"
              aria-label="scrollable auto tabs"
              TabIndicatorProps={{ className: 'tab-indicator' }}>

              <Tab
                focus
                label={t("Invite by Contact")}
                className='single-tab'
                {...this.a11yProps(0)}
              />

              <Tab
                label={t("Invite by Email")}
                className='single-tab'
                {...this.a11yProps(1)}
              />
            </Tabs>

            <div className={ "add-by-contact" + (this.state.tabingvalue === 0 ? '' : ' d-none') }>
              <input 
                type='text' 
                className='form-control search-contacts' 
                placeholder={t("Seach Contacts")}
               
                value={ this.state.searched_query }
                onChange={ this.searchContacts.bind(this) }
              />

              <div className="to-be-added-container">
                {
                  Object.values(this.state.to_be_added_users).map((user) => {
                    return (
                      <div className="to-be-added-user">
                        { user.first_name + ' ' + user.last_name }
                        
                        <span className="remove-btn" onClick={ () => this.removeToBeAddedUser(user) }>
                          <i class="fas fa-times"></i>
                        </span>
                      </div>
                    )
                  })
                }
              </div>

              <div className="contacts-container">
                {this.state.filtered_contacts.map((contact) => {
                  return (
                    <div className="contact" key={contact.id} onClick={ () => this.prepareToBeAddedUser(contact.other_user) }>
                      <div className="left-side">
                        <img src={ contact.other_user.profile_picture_url } />

                        <div className="name-email">
                          <p>{contact.other_user.first_name}</p>
                          <p className="email">{contact.other_user.email}</p>
                        </div>
                      </div>

                      {
                        !this.props.participants[contact.other_user.id] && !this.state.to_be_added_users[contact.other_user.id] &&
                        
                        <i class="fas fa-plus"></i>
                      }
                    </div>
                  );
                })}

                {
                  !this.state.filtered_contacts.length &&

                  <div className="no-record">
                    {t("No contacts to show")}
                  </div>
                }
              </div>

              <div className="options">
                <button
                  className="button"
                  onClick={this.hideMe.bind(this)}>

                  {t("Cancel")}
                </button>

                <button
                  className="button success-btn add-to-call-btn"
                  disabled={this.state.add_to_call_underway}
                  onClick={this.addToCall.bind(this)}>

                  {t("Add To Call")}
                  
                  {this.state.add_to_call_underway && (
                    <i className="fa fa-circle-notch fa-spin"></i>
                  )}
                </button>
              </div>
            </div>
            
            <div className={ "add-by-email" + (this.state.tabingvalue === 1 ? '' : ' d-none') }>
              
              <div className="search-by-email">
                <input 
                  type='text' 
                  className='form-control' 
                  placeholder={t("Enter email")}
                  value={ this.state.email_query }
                  onChange={ this.searchByEmailChanged.bind(this) } 
                />

                <button 
                  className="button-add" 
                  disabled={ this.state.search_by_email_underway }
                  onClick={ this.searchByEmail.bind(this) }>
                  
                  {t("Add")}

                  {this.state.search_by_email_underway && (
                    <i className="fa fa-circle-notch fa-spin"></i>
                  )}
                </button>
              </div>

              {
                this.state.error &&

                <p className="error">{ this.state.error }</p>
              }

              <div className="to-be-added-container">
                {
                  Object.values(this.state.to_be_added_users).map((user) => {
                    return (
                      <div className="to-be-added-user">
                        { user.first_name + ' ' + user.last_name }
                        
                        <span className="remove-btn" onClick={ () => this.removeToBeAddedUser(user) }>
                          <i class="fas fa-times"></i>
                        </span>
                      </div>
                    )
                  })
                }
              </div>

              <div className="options">
                <button
                  className="button"
                  onClick={this.hideMe.bind(this)}>

                  {t("Cancel")}
                </button>

                <button
                  className="button success-btn add-to-call-btn"
                  disabled={this.state.add_to_call_underway}
                  onClick={this.addToCall.bind(this)}>

                  {t("Add To Call")}
                  
                  {this.state.add_to_call_underway && (
                    <i className="fa fa-circle-notch fa-spin"></i>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default compose(withTranslation())(AddToCall);