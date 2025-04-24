import React from "react";
import bus from "../bus";
import $ from "jquery";
import "../../assets/css/call/breakout_rooms.css";
import {
  Accordion,
  AccordionItem,
  AccordionItemHeading,
  AccordionItemButton,
  AccordionItemPanel,
} from "react-accessible-accordion";
import "react-accessible-accordion/dist/fancy-example.css";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { withTranslation } from "react-i18next";
import i18next from "i18next";

class CallBreakoutRooms extends React.Component {
  constructor(props) {
    super(props);

    this.rtc_client = this.props.rtc_client;

    this.state = {
      total_rooms: 1,
      auto_assign: true,
      assigned_users: {},
      rooms: {},
      are_rooms_opened: false,
      unassigned_room: {
        title: "unassigned",
        is_unassigned: true,
      },
      can_open_close: true,
      broadcast_message: "",
    };
  }

  componentDidMount() {
    this.attachBusListeners();
    this.attachSocketListeners();
    this.loadBreakoutRooms();
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    $(".init-breakout-rooms").modal("hide");
    $(".create-breakout-rooms").modal("hide");
  }

  attachBusListeners() {
    bus.on("call_breakout_rooms__init" + this.props.identity, () => {
      if (Object.keys(this.state.rooms).length) {
        $(".create-breakout-rooms").modal("show");
        return;
      }

      this.calculateUsersPerRoom();

      $(".init-breakout-rooms").modal("show");
    });
  }

  attachSocketListeners() {
    console.log('breakout attachSocketListeners', this.rtc_client.socket);
    this.rtc_client.socket.on("breakout-room-left", (params) => {
      this.userLeftBreakoutRoom(params);
    });

    this.rtc_client.socket.on("breakout-room-broadcast", (params) => {
      this.onBreakoutRoomBroadcast(params);
    });
  }

  onBreakoutRoomBroadcast(params) {
    var { message } = params;

    toast.info(
      <span>
        <b>{i18next.t("Message from host")}</b> <br /> {message}
      </span>,
      {
        autoClose: 60000,
        position: 'bottom-left',
        className: 'call-toast'
      }
    );
  }

  async loadBreakoutRooms() {
    var room_id = this.props.call.main_room_id || this.props.call.room_id;

    var room_data = await this.props.getRoomDataFromCache({ room_id });
    var breakout_rooms = room_data.breakout_rooms || {};

    if (!breakout_rooms.rooms) return;

    var assigned_users = {};

    Object.values(breakout_rooms.rooms).forEach((breakout_room) => {
      Object.values(breakout_room.users).forEach((user) => {
        assigned_users[user.id] = user;
      });
    });

    this.setState({
      rooms: breakout_rooms.rooms,
      total_rooms: Object.keys(breakout_rooms.rooms),
      are_rooms_opened: Object.keys(breakout_rooms.are_rooms_opened),
      assigned_users,
    });
  }

  hideInitRooms() {
    this.resetThings();
    $(".init-breakout-rooms").modal("hide");
  }

  hideCreateRooms() {
    $(".create-breakout-rooms").modal("hide");
  }

  totalRoomsChanged(event) {
    this.setState({ total_rooms: event.target.value }, () => {
      this.calculateUsersPerRoom();
    });
  }

  calculateUsersPerRoom() {
    var total_users = Object.values(this.props.participants).filter(
      (participant) => participant.id != this.props.current_user.id
    ).length;
    var users_per_room = 0;

    if (total_users && this.state.total_rooms) {
      users_per_room = total_users / this.state.total_rooms;
      users_per_room = Math.ceil(users_per_room);

      users_per_room =
        users_per_room <= total_users ? users_per_room : total_users;
    }

    this.setState({
      users_per_room,
    });
  }

  assignChanged(event) {
    var auto_assign = event.target.value == "1" ? true : false;

    this.setState({ auto_assign });
  }

  createRooms() {
    $(".init-breakout-rooms").modal("hide");

    var rooms = {};
    var assigned_users = {};

    var participants = Object.values(this.props.participants).filter(
      (participant) => participant.id != this.props.current_user.id
    );
    var next_user_index = 0;

    var main_room_id = this.props.call.room_id;

    for (let index = 0; index < this.state.total_rooms; index++) {
      var room_title = "room-" + (index + 1);
      var room_users = {};

      rooms[room_title] = {
        id: main_room_id + "_breakout_room_" + room_title,
        title: room_title,
        users: {},
      };

      if (!this.state.auto_assign) continue;
      if (next_user_index == participants.length) continue;

      for (let index_1 = 0; index_1 < this.state.users_per_room; index_1++) {
        var user = participants[next_user_index].user;
        room_users[user.id] = user;
        assigned_users[user.id] = user;

        next_user_index++;
      }

      rooms[room_title].users = room_users;
    }

    this.setState({ rooms, assigned_users });

    $(".create-breakout-rooms").modal("show");
  }

  moveUserToOtherRoom(user, to_room, from_room) {
    if (from_room.is_unassigned) {
      this.assignUserToRoom(user, to_room);
      return;
    }

    var rooms = this.state.rooms;

    rooms[to_room.title].users[user.id] = user;
    delete rooms[from_room.title].users[user.id];

    this.setState({ rooms });
  }

  assignUserToRoom(user, to_room) {
    if (!user) return;

    var rooms = this.state.rooms;
    var assigned_users = this.state.assigned_users;

    rooms[to_room.title].users[user.id] = user;
    assigned_users[user.id] = user;

    this.setState({ rooms, assigned_users });

    if (this.state.are_rooms_opened) {
      this.rtc_client.notifyTheseUsers({
        event: "join-breakout-room",
        user_ids: [user.id],
        data: {
          breakout_room: to_room,
        },
      });

      this.props.saveRoomDataInCache({
        data: {
          breakout_rooms: {
            rooms: this.state.rooms,
            are_rooms_opened: true,
          }
        }
      });
    }
  }

  userLeftBreakoutRoom(params) {
    var { user_id, main_room_id } = params;

    var assigned_users = this.state.assigned_users;

    if (main_room_id != this.props.call.room_id || !assigned_users[user_id])
      return;

    delete assigned_users[user_id];

    var rooms = this.state.rooms;
    Object.values(rooms).forEach((room) => {
      delete room.users[user_id];
    });

    this.setState({ rooms, assigned_users });
  }

  leaveBreakoutRoom() {
    var user_id = this.props.current_user.id;
    var breakout_room = this.props.breakout_room;

    if (!breakout_room) return;

    this.props.saveRoomDataInCache({
      get_data_callback: (old_data) => {
        var breakout_rooms = old_data.breakout_rooms || {};

        if (!breakout_rooms.rooms) return old_data;

        breakout_room = breakout_rooms.rooms[breakout_room.title];

        if (!breakout_room) return old_data;

        delete breakout_room.users[user_id];

        return {
          breakout_rooms
        };
      }
    });

    this.rtc_client.rtc_helpers.notifyTheseUsers({
      event: "breakout-room-left",
      user_ids: this.props.host_ids,
      data: {
        breakout_room,
        main_room_id: this.props.call.main_room_id,
      },
    });
  }

  addRoom() {
    var rooms = this.state.rooms;
    var title = "room-" + (Object.keys(rooms).length + 1);
    var main_room_id = this.props.call.room_id;

    rooms[title] = {
      id: main_room_id + "_breakout_room_" + title,
      title,
      users: {},
    };

    this.setState({ rooms });
  }

  recreateRooms() {
    this.resetThings();
    $(".create-breakout-rooms").modal("hide");
    $(".init-breakout-rooms").modal("show");
  }

  openAllRooms() {
    var rooms = this.state.rooms;

    Object.values(rooms).forEach((room) => {
      if (!Object.keys(room.users).length) return;

      this.rtc_client.notifyTheseUsers({
        event: "join-breakout-room",
        user_ids: Object.keys(room.users),
        data: {
          breakout_room: room,
        },
      });
    });

    this.setState({ are_rooms_opened: true, can_open_close: false });

    setTimeout(() => {
      this.setState({ can_open_close: true });
    }, 5000);

    this.props.saveRoomDataInCache({
      data: {
        breakout_rooms: {
          rooms: this.state.rooms,
          are_rooms_opened: true
        }
      }
    });
  }

  closeAllRooms() {
    Object.values(this.state.rooms).forEach((room) => {
      this.rtc_client.rtc_helpers.deleteRoom({ room_id: room.id, room_type: 'p2p-sfu' });
    });

    this.setState({ are_rooms_opened: false, can_open_close: false });

    setTimeout(() => {
      this.setState({ can_open_close: true });
    }, 5000);

    this.props.saveRoomDataInCache({
      data: { breakout_rooms: {} } 
    });
  }

  endBreakoutRooms() {
    this.props.saveRoomDataInCache({ 
      room_id: this.props.call.main_room_id || this.props.call.room_id, 
      data: { breakout_rooms: {} } 
    });

    Object.values(this.state.rooms).forEach((room) => {
      this.rtc_client.rtc_helpers.deleteRoom({
        room_id: room.id,
        room_type: 'p2p-sfu',
        join_main_room: false
      });
    });

    this.resetThings();
  }

  prepareBroadcastMessage() {
    $(".broadcast-breakout-room").modal("show");
  }

  broadcastMessageChanged(event) {
    this.setState({ broadcast_message: event.target.value });
  }

  broadcastMessage() {
    if (!this.state.broadcast_message) return;

    this.rtc_client.notifyTheseUsers({
      event: "breakout-room-broadcast",
      user_ids: Object.keys(this.state.assigned_users),
      data: {
        message: this.state.broadcast_message,
      },
    });

    this.hideBroadcastMessage();
  }

  hideBroadcastMessage() {
    $(".broadcast-breakout-room").modal("hide");
    this.setState({ broadcast_message: "" });
  }

  resetThings() {
    this.setState(
      {
        total_rooms: 1,
        auto_assign: true,
        rooms: {},
        are_rooms_opened: false,
      },
      () => {
        this.calculateUsersPerRoom();
      }
    );
  }

  render() {
    const { t, i18n } = this.props;

    var unassigned_users = Object.values(this.props.participants)
      .map((participant) => {
        var is_unassinged =
          !Object.keys(this.state.assigned_users).includes(
            participant.id.toString()
          ) && participant.id != this.props.current_user.id;

        if (is_unassinged) return participant.user;
      })
      .filter(Boolean);

    return (
      <>
        <div
          className="init-breakout-rooms modal fade"
          tabIndex="-1"
          role="dialog"
          aria-hidden="true">
          
          <div className="popup-backdrop"></div>

          <div className="modal-dialog popup-container" role="document">
            <div className="modal-content popup-inner">

              <div className="popup-header">
                <div className="popup-heading">
                  {t("Create_breaking_rooms")}
                </div>

                <div className="popup-close" onClick={this.hideInitRooms.bind(this)}>
                  <i className="fas fa-times icon"></i>
                </div>
              </div>

              <div className="total-rooms-container">
                <label className="left-side">{t("Create_Rooms_count")}</label>

                <div className="right-side">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="form-control"
                    value={this.state.total_rooms}
                    onChange={this.totalRoomsChanged.bind(this)}
                  />

                  {
                    this.state.auto_assign && 

                    <div className="participants-per-room">
                      {this.state.users_per_room}{" "}
                      {t("participants_per_room")}
                    </div>
                  }
                </div>
              </div>

              <div className="assign-options-container">
                <div className="left-side">
                  <input
                    name="gender"
                    type="radio"
                    id="assign-auto"
                    value="1"
                    checked={this.state.auto_assign}
                    onChange={this.assignChanged.bind(this)}
                  />

                  <label for="assign-auto">
                    {t("Assign_automatically")}
                  </label>
                </div>
                
                <div className="right-side">
                  <input
                    name="gender"
                    type="radio"
                    id="assign-manually"
                    value="0"
                    checked={!this.state.auto_assign}
                    onChange={this.assignChanged.bind(this)}
                  />

                  <label for="assign-manually">
                    {t("Assign_manually")}
                  </label>
                </div>
              </div>

              <div class="options">
                <button
                  className="button"
                  onClick={this.hideInitRooms.bind(this)}>
                  
                  {t("Cancel")}
                </button>

                <button
                  className="button success-btn"
                  onClick={this.createRooms.bind(this)}>
                  {t("Create")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="create-breakout-rooms modal fade"
          tabIndex="-1"
          role="dialog"
          aria-hidden="true"
        >
          <div className="popup-backdrop"></div>

          <div className="modal-dialog popup-container" role="document">
            <div className="modal-content popup-inner">
              
              <div className="popup-header">
                <div className="popup-heading">
                  {t("Create_breaking_rooms")}
                </div>

                <div className="popup-close" onClick={this.hideCreateRooms.bind(this)}>
                  <i className="fas fa-times icon"></i>
                </div>
              </div>

              <div className="modal-body">
                {[
                  this.state.unassigned_room,
                  ...Object.values(this.state.rooms),
                ].map((room) => {
                  var room_users = !room.is_unassigned
                    ? room.users
                    : unassigned_users;
                  // no need to show unassigned_room
                  if (
                    room.is_unassigned &&
                    (!unassigned_users.length || !this.state.are_rooms_opened)
                  )
                    return null;

                  return (
                    <div className="room">
                      <Accordion
                        allowMultipleExpanded
                        allowZeroExpanded
                        preExpanded={[[], room.title]}
                      >
                        <AccordionItem uuid={room.title}>
                          <AccordionItemHeading>
                            <AccordionItemButton>
                              <div className="room-header">
                                <span>{room.title}</span>
                              </div>
                            </AccordionItemButton>
                          </AccordionItemHeading>

                          <div className="actions room-actions">
                            {!this.state.are_rooms_opened ? (
                              <div class="dropdown assign-dropdown">
                                <a
                                  className="dropdown-toggle"
                                  data-toggle="dropdown"
                                >
                                  {t("Assign")}
                                </a>

                                <div class="dropdown-menu">
                                  {unassigned_users.map((assign_user) => {
                                    return (
                                      <div
                                        className="dropdown-item"
                                        onClick={() =>
                                          this.assignUserToRoom(
                                            assign_user,
                                            room
                                          )
                                        }
                                      >
                                        {assign_user.name}
                                      </div>
                                    );
                                  })}

                                  {!unassigned_users.length && (
                                    <i className="dropdown-item">
                                      {t(
                                        "All_users_have_been_assigned_to_rooms"
                                      )}
                                    </i>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <a
                                onClick={() =>
                                  this.props.joinBreakoutRoom({ breakout_room: room })
                                }
                              >
                                {t("join")}
                              </a>
                            )}
                          </div>

                          <AccordionItemPanel>
                            {Object.values(room_users).map((user) => {
                              var other_rooms = Object.values(
                                this.state.rooms
                              ).filter(
                                (other_room) => other_room.title != room.title
                              );

                              return (
                                <div className="participant participant-image">
                                  <img
                                    className="profile-picture"
                                    src={user.profile_picture_url}
                                  />

                                  <div className="right-side right-side-inside">
                                    <span className="full_name">
                                      {user.name}
                                    </span>

                                    {(!this.state.are_rooms_opened ||
                                      room.is_unassigned) && (
                                      <div className="actions">
                                        <div class="dropdown">
                                          <button
                                            className="moveto-btn dropdown-toggle"
                                            data-toggle="dropdown"
                                          >
                                            {room.is_unassigned
                                              ? t("Assign_to")
                                              : t("Move_to")}
                                          </button>

                                          <div class="dropdown-menu">
                                            {other_rooms.map((other_room) => {
                                              return (
                                                <div
                                                  className="dropdown-item"
                                                  onClick={() =>
                                                    this.moveUserToOtherRoom(
                                                      user,
                                                      other_room,
                                                      room
                                                    )
                                                  }
                                                >
                                                  {other_room.title}
                                                </div>
                                              );
                                            })}

                                            {!other_rooms.length && (
                                              <i className="dropdown-item">
                                                {t("No_more_rooms")}
                                              </i>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </AccordionItemPanel>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  );
                })}
              </div>

              <div className="options">
                {!this.state.are_rooms_opened ? (
                  <>
                    <button
                      className="button"
                      onClick={this.recreateRooms.bind(this)}
                    >
                      {t("Recreate")}
                    </button>

                    <button
                      className="button"
                      onClick={this.addRoom.bind(this)}
                    >
                      {t("Add_Room")}
                    </button>

                    <button
                      className="button success-btn"
                      disabled={!this.state.can_open_close}
                      onClick={this.openAllRooms.bind(this)}
                    >
                      {t("Open_all_rooms")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button success-btn"
                      onClick={this.prepareBroadcastMessage.bind(this)}
                    >
                      {t("Broadcast_message_to_all")}
                    </button>

                    <button
                      className="button error-btn"
                      disabled={!this.state.can_open_close}
                      onClick={this.closeAllRooms.bind(this)}
                    >
                      {t("Close_all_rooms")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className="broadcast-breakout-room modal fade"
          tabIndex="-1"
          role="dialog"
          aria-hidden="true"
        >
          <div className="popup-backdrop"></div>

          <div className="modal-dialog popup-container" role="document">
            <div className="modal-content popup-inner">
              <div className="popup-header mb-0">
                <div className="popup-heading"></div>

                <div className="popup-close" onClick={this.hideBroadcastMessage.bind(this)}>
                  <i className="fas fa-times icon"></i>
                </div>
              </div>

              <textarea
                className="form-control"
                rows="5"
                placeholder="Broadcast message"
                value={this.state.broadcast_message}
                onChange={this.broadcastMessageChanged.bind(this)}>
              </textarea>

              <i className="info">
                {" "}
                {t("Maximum_150_characters_are_allowed")}
              </i>
              
              <div className="options">
                <button
                  className="button"
                  onClick={this.hideBroadcastMessage.bind(this)}>
                  
                  {t("Cancel")}
                </button>

                <button
                  className="button success-btn"
                  onClick={this.broadcastMessage.bind(this)}>

                  {t("Broadcast")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}
export default withTranslation("translation", { withRef: true })(
  CallBreakoutRooms
);
