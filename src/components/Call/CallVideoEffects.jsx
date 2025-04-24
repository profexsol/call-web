import React, { createRef } from "react";
import $ from "jquery";
import "../../assets/css/call/video_effects.css";
import MemorizedVideo from "./MemorizedVideo";
import bus from "../bus";
import { toast } from "react-toastify";
import i18next from "i18next";
import { withTranslation } from "react-i18next";
import VideoBackground1 from "../../assets/images/call/virtual_background_1.jpg";
import VideoBackground2 from "../../assets/images/call/virtual_background_2.jpg";
import VideoBackground3 from "../../assets/images/call/virtual_background_3.jpg";
import VideoBackground4 from "../../assets/images/call/virtual_background_4.jpg";
import VideoBackground5 from "../../assets/images/call/virtual_background_5.jpg";
import VideoBackground6 from "../../assets/images/call/virtual_background_6.jpg";
import VideoBackground7 from "../../assets/images/call/virtual_background_7.jpg";
import BlurredBackground from "../../assets/images/call/blurred_background.jpg";
import MeetSegmentationWrapper from "./MeetSegmentationWrapper";

class CallVideoEffects extends React.Component {
  constructor(props) {
    super(props);

    this.background_options = [
      {
        type: "image",
        value: VideoBackground5,
      },
      {
        type: "image",
        value: VideoBackground4,
      },
      {
        type: "color",
        value: "#aec5c5",
      },
      {
        type: "image",
        value: VideoBackground3,
      },
      {
        type: "image",
        value: VideoBackground6,
      },
      {
        type: "image",
        value: VideoBackground1,
      },
      {
        type: "color",
        value: "#5d5df1",
      },
      {
        type: "color",
        value: "#c0c0c0",
      },
      {
        type: "image",
        value: VideoBackground2,
      },
      {
        type: "image",
        value: VideoBackground7,
      },
      {
        type: "color",
        value: "#333333",
      },
      {
        type: "color",
        value: "#666666",
      },
    ];

    this.effects_mode = "preview";
    this.processing_video = false;
    this.is_drawing_canvas = false;
    this.bus_events_ids = [];
    this.first_segmentation_done = false;

    this.state = {
      is_opened: false,
      source_stream: false,
      effect_type: "",
      effected_stream: {},
      effects_applied: false,
      background: {},
      effects_applied_to_stream: false,
      is_loading_video: false,
    };
  }

  componentDidMount() {
    this.prepareThings();
    this.attachBusListeners();
    this.loadLocalBackgroundSettings();
  }

  componentWillUnmount() {
    this.hideMe(true);
    this.removeEffects();
    this.removeBusListeners();
  }

  prepareThings() {
    this.canvas = createRef(document.createElement("canvas"));
    this.source_video = $(".original-stream")[0];
  }

  async loadLocalBackgroundSettings() {
    var call_settings = this.props.getLocalCallSettings();
    var background_settings = call_settings["virtual_background"];

    if (!background_settings) return;

    bus.dispatch("call_video_effects__effect_changed", { effect_type: background_settings.effect_type });

    await this.setStateAsync({
      effect_type: background_settings.effect_type,
      background: background_settings.background || {},
    });
  }

  attachBusListeners() {
    this.bus_events_ids[this.bus_events_ids.length] = bus.on(
      "call__rtc_client_ready",
      (rtc_client) => {
        this.rtc_client = rtc_client;

        this.attachCallListeners();
      }
    );
    this.bus_events_ids[this.bus_events_ids.length] = bus.on(
      "call_video_effects__apply_effects_success",
      () => {
        this.setState({ applying_effects: false });
      }
    );
  }

  attachCallListeners() {
    this.rtc_client.onVideoSwitched = this.onVideoSwitched.bind(this);
    this.rtc_client.onUserVideoTrackAdded = this.onUserVideoTrackAdded.bind(this);
  }

  removeBusListeners() {
    this.bus_events_ids.forEach((event_id) => {
      bus.remove(event_id);
    });
  }

  onBackgroundImageLoaded(image_url, image_number) {
    console.log(
      "CallVideoEffects onBackgroundImageLoaded",
      "image_url",
      image_url,
      "first_segmentation_done",
      this.first_segmentation_done
    );

    if (this.first_segmentation_done) return;

    var image_el = $(".option .image")[image_number];

    console.log(
      "CallVideoEffects before segmentation",
      "image_el",
      image_el,
      "naturalWidth",
      image_el && image_el.naturalWidth,
      "naturalHeight",
      image_el && image_el.naturalHeight
    );

    if (!image_el || !image_el.naturalWidth || !image_el.naturalHeight) return;
  }

  onVideoSwitched(params) {
    var { user_id, is_video_on } = params;

    if (user_id != this.props.current_user.id) return;

    // if user turned off video then need to stop processing
    if (!is_video_on) {
      this.removeEffects();
    }
  }

  onUserVideoTrackAdded() {
    console.log('ttttt onUserVideoTrackAdded', this.applying_effects_after_video);
    if(!this.applying_effects_after_video) return;

    this.applyEffects();
    this.applying_effects_after_video = false;
  }

  async mayBeApplyEffectsAfterVideo() {
    await this.loadLocalBackgroundSettings();
    if(!this.state.effect_type) return;

    this.applying_effects_after_video = true;
  }

  stopSourceStream() {
    var stream = this.state.source_stream;
    if(!stream) return;

    this.state.source_stream.getVideoTracks().forEach((track) => {
      track.enabled = false;
      track.stop();
    });

    this.setState({ source_stream: false });
  }

  async selectSourceStream() {
    console.log('ttttt selectSourceStream source_stream', this.state.source_stream);
    if(this.state.source_stream) return;

    var stream = await this.rtc_client.getUserMediaVideo();
    await this.setSourceStream({ stream });
  }

  async setSourceStream({ stream }) {
    console.log('ttttt setSourceStream stream', stream, stream && stream.getTracks());

    if(!stream || !stream.id || !stream.getVideoTracks().length) return;

    await this.setStateAsync({ source_stream: stream });

    this.source_video.play();

    if (this.canvas.current) {
      this.canvas.current.width = stream.getVideoTracks()[0].getSettings().width;
      this.canvas.current.height = stream.getVideoTracks()[0].getSettings().height;
    }

    return true;
  }

  async startProcessingVideo() {
    this.source_video.play();

    await this.setStateAsync({ processing_video: true });
  }

  stopProcessingVideo() {
    if (!this.state.processing_video) return;

    this.setState({ processing_video: false });
  }

  async showBackgroundEffects() {
    this.setState({ is_opened: true });

    await this.loadLocalBackgroundSettings();
    await this.selectSourceStream();
    this.effects_mode = this.rtc_client.is_video_on ? 'live' : 'preview';

    // if there was background applied already then need to continue from that
    if (this.state.effect_type) {
      this.applyEffects();
    }
  }

  async applyEffects() {
    console.log('ttttt applyEffects');
    this.effects_mode = this.rtc_client.is_video_on ? 'live' : 'preview';
    
    bus.dispatch("call_video_effects__effect_changed", { effect_type: this.state.effect_type });
    
    this.props.saveLocalCallSettings({
      virtual_background: {
        effect_type: this.state.effect_type,
        background: this.state.background,
      },
    });

    if(!this.rtc_client.is_video_on && !this.state.is_opened) {
      toast.info(
        i18next.t("Effects will be applied when you turn ON your video"),
        {
          hideProgressBar: true
        }
      );

      return;
    }

    await this.selectSourceStream();

    if (this.state.processing_video || !this.state.effect_type) return;
    if (!this.props.tflite) return;

    console.log('ttttt applyEffects applying');

    this.is_drawing_canvas = false;
    bus.dispatch("call_video_effects__apply_effects_init");

    var effected_stream = this.canvas.current.captureStream();
    effected_stream.effected_stream = true;

    await this.setStateAsync({
      applying_effects: true,
      effects_applied: true,
      effected_stream,
    });

    this.startProcessingVideo();
    this.applyEffectsToStream();

    return effected_stream;
  }

  removeEffects({ stop_source_stream = true } = {}) {
    console.log('ttttt removeEffects');

    this.stopProcessingVideo();
    this.removeEffectsFromStream();

    this.setState({
      background: {},
      effect_type: "",
      applying_effects: false,
      effects_applied: false
    });

    bus.dispatch("call_video_effects__effect_changed", { effect_type: "" });

    if(stop_source_stream) {
      this.stopSourceStream();
    };
  }

  applyNoBackground() {
    this.removeEffects({ stop_source_stream: false });

    this.props.saveLocalCallSettings({
      virtual_background: {},
    });
  }

  removePreviewEffects() {
    if (this.effects_mode != "preview") return;

    this.removeEffects({ soft_remove: true });
    this.stopSourceStream();
    
    return true;
  }

  async applyVirtualBackground(background) {
    await this.setStateAsync({ background, effect_type: "background" });

    await this.applyEffects();
  }

  async applyBackgroundBlur() {
    await this.setStateAsync({
      effect_type: "background_blur",
      background: {},
    });

    this.applyEffects();
  }

  async applyEffectsToStream() {
    console.log('ttttt applyEffectsToStream');

    if (!this.state.effects_applied) return;
    if (this.state.effects_applied_to_stream) return;
    if (this.effects_mode == "preview") return;

    console.log('ttttt applyEffectsToStream applying');

    this.setState({ effects_applied_to_stream: true });

    var effected_stream = this.state.effected_stream;

    this.rtc_client.replaceUserTrack({ track: effected_stream.getVideoTracks()[0] });

    bus.dispatch("call_video_effects__applied_effects_to_stream", { effected_stream });
  }

  async removeEffectsFromStream() {
    console.log('ttttt removeEffectsFromStream effects_applied_to_stream', this.state.effects_applied_to_stream);
    if (!this.state.effects_applied_to_stream) return;

    await this.setStateAsync({
      effects_applied_to_stream: false,
      effected_stream: {},
    });

    if (!this.props.is_video_on) return;

    console.log('ttttt removeEffectsFromStream replacing track');

    // need to replace original unprocessed track
    this.rtc_client.replaceUserTrack({ track: this.rtc_client.stream.getVideoTracks()[0] });

    bus.dispatch("call_video_effects__removed_effects_from_stream");
  }

  setStateAsync(state) {
    return new Promise((resolve) => {
      this.setState(state, resolve);
    });
  }

  hideMe() {
    this.setState({ is_opened: false });
    
    var preview_effects_removed = this.removePreviewEffects();
    if(preview_effects_removed && this.state.effects_applied) {
      toast.info(
        i18next.t("Effects will be applied when you turn ON your video"),
        {
          hideProgressBar: true
        }
      );
    }
  }

  render() {
    return (
      <>
        <div
          className={`video-effects-modal modal ${ this.state.is_opened ? '' : 'hidden' }`}
          tabIndex="-1"
          role="dialog"
          aria-hidden="true"
        >
          <div className="popup-backdrop"></div>

          <div className="modal-dialog popup-container" role="document">
            <div
              className={
                "modal-content popup-inner " +
                (this.state.processing_video ? "effected " : "")
              }
            >
              <div className="popup-header">
                <div className="popup-heading">Change Background</div>

                <div className="popup-close" onClick={this.hideMe.bind(this)}>
                  <i className="fas fa-times icon"></i>
                </div>
              </div>

              <div className="video-effects-container">
                <div className="preview">
                  {(this.state.applying_effects ||
                    this.state.is_loading_video)  && (
                    <i className="fas fa-circle-notch fa-spin icon applying-effect"></i>
                  )}

                  {this.state.background && this.state.effect_type ? (
                    this.props.tflite ? (
                      <MeetSegmentationWrapper
                        backgroundImage={this.state.background}
                        effectType={this.state.effect_type}
                        canvasRef={this.canvas}
                        tflite={this.props.tflite}
                      />
                    ) : (
                      <i className="fas fa-circle-notch fa-spin icon applying-effect"></i>
                    )
                  ) : null}

                  <MemorizedVideo
                    stream={this.state.source_stream}
                    muted={true}
                    className="original-stream"
                  ></MemorizedVideo>
                </div>

                <div className="backgrounds-section">
                  <div
                    className={
                      "option no-background " +
                      (!this.state.effect_type ? "selected" : "")
                    }
                    onClick={() => this.applyNoBackground()}
                  >
                    <div className="text">None</div>
                  </div>

                  <div
                    className={
                      "option background-blur " +
                      (this.state.effect_type == "background_blur"
                        ? "selected"
                        : "")
                    }
                    onClick={(e) => this.applyBackgroundBlur()}
                  >
                    <img
                      alt="blur"
                      className="image"
                      src={BlurredBackground}
                    />
                    <span className="text" style={{color:"white"}}>Blur</span>
                  </div>

                  {this.background_options.map((background, index) => {
                    return (
                      <div
                        className={
                          "option " +
                          (this.state.background.value == background.value
                            ? "selected"
                            : "")
                        }
                      >
                        {background.type == "color" ? (
                          <div
                            className="color"
                            style={{ backgroundColor: background.value }}
                            onClick={(e) =>
                              this.applyVirtualBackground(background)
                            }
                          ></div>
                        ) : (
                          <img
                            className="image"
                            src={background.value}
                            onClick={(e) =>
                              this.applyVirtualBackground(background)
                            }
                            onLoad={(e) =>
                              this.onBackgroundImageLoaded(
                                background.value,
                                index
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation("translation", { withRef: true })(
  CallVideoEffects
);
