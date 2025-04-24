import React from "react";
import bus from "../bus";
import $ from "jquery";
import "../../assets/css/call/share_screen_picker.css";
import i18next from "i18next";

export default class ShareScreenPicker extends React.Component {
  // class ShareScreenPicker extends React.Component {

  constructor(props) {
    super(props);

    this.identity = this.props.identity;
    this.have_shared = false;

    this.state = {
      sources: [],
      selected_source: {},
      loader: false,
    };
  }

  componentDidMount() {
    this.attachBusListeners();
    this.attachEventListeners();
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    this.hideMe();
  }

  attachBusListeners() {
    bus.on("share_screen_picker__show", () => {
      // this.setState({loader:true});
      this.showMe();
    });
  }

  attachEventListeners() {
    $(".share-screen-picker-modal").on("hidden.bs.modal", () => {
      if (!this.have_shared) {
        bus.dispatch("share_screen_picker__cancelled" + this.identity);
      }

      this.resetThings();
    });
  }

  getSources() {
    const { desktopCapturer } = window.require("electron");

    var options = {
      types: ["window", "screen"],
      thumbnailSize: {
        width: 300,
        height: 300,
      },
    };

    desktopCapturer.getSources(options).then(async (sources) => {
      this.setState({ selected_source: sources[0] });
      this.setState({ sources: sources });
    });
  }

  selectSource(source) {
    this.setState({ selected_source: source });
  }

  startSharing() {
    bus.dispatch(
      "share_screen_picker__selected" + this.identity,
      this.state.selected_source
    );
    this.have_shared = true;
    this.hideMe();
  }

  showMe() {
    this.getSources();
    setTimeout(() => {
      $(".share-screen-picker-modal").modal("show");
      // this.setState({loader:false});
    }, 800);
  }

  hideMe() {
    $(".share-screen-picker-modal").modal("hide");
  }

  resetThings() {
    this.setState({
      sources: [],
      selected_source: {},
    });

    this.have_shared = false;
  }

  render() {
    return (
      <div
        className="modal fade share-screen-picker-modal share-screen-overlay"
        role="dialog"
      >
        <div className="modal-dialog popup-container" role="document">
          <div className="modal-content popup-inner">
            <div className="popup-close" onClick={() => this.hideMe(this)}>
              <i className="fas fa-times"></i>
            </div>

            <div className="sources">
              {this.state.sources.map((source) => {
                return (
                  <div
                    className={
                      "source " +
                      (source.id == this.state.selected_source.id
                        ? "selected"
                        : "")
                    }
                    onClick={() => this.selectSource(source)}
                  >
                    <img src={source.thumbnail.toDataURL()} />

                    <p className="title">{source.name}</p>
                  </div>
                );
              })}
            </div>

            {/* { this.state.loader ? (
                        <button 
                        className='share-screen-btn button btn-primary' 
                        disabled={ !this.state.selected_source.id }
                        >
                            <CircularProgress                   
                            color="#ffffff"
                            style={{width:"20px",height:"20px"}}
                        />   Loading Screens</button>
                         ) 
                        : */}
            <button
              className="share-screen-btn button btn-primary"
              disabled={!this.state.selected_source.id}
              onClick={() => this.startSharing()}
            >
              {" "}
              {i18next.t("startSharing")}{" "}
            </button>
            {/* } */}
          </div>
        </div>
      </div>
    );
  }
}

// const mapDispatchToProps = (dispatch) => {
//     return {
//         showLoader: () => {console.log("dispatcher");dispatch(showLoader())},
//         hideLoader: () => dispatch(hideLoader())
//     }
// };
// export default connect(null, mapDispatchToProps)(ShareScreenPicker)
