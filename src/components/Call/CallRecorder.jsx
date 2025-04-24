import React from "react";
import ReactDOM from "react-dom";
import $ from "jquery";
import bus from "../bus";
import * as datetime from "../../assets/js/helpers/datetime";
import * as common from "../../assets/js/helpers/common";
import { withTranslation } from "react-i18next";
import * as ebml from "ts-ebml";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../assets/css/call/call_recorder.css";
import i18next from "i18next";
const { desktopCapturer } = window.require ? window.require("electron") : {};

class CallRecorder extends React.Component {
  /**
   * Records call, get video stream from host's desktop screen
   * Gets audio from all call streams as desktop audio capture doesn't work in mac
   * Uses 'Audio Context', 'Audio destination Node' to add new audio tracks during recording...
   * as MediaRecorder doesn't allow stream to change during recording, it stops recording
   */

  constructor(props) {
    super(props);

    this.call = this.props.call;
    this.rtc_client = this.props.rtc_client;
    this.media_recorder = false;
    this.audio_context = false;
    this.audio_destination_node = false;
    this.audio_source_node = false;
    this.recorded_chunks = [];
    this.desktop_screen_stream = false;
    this.audio_tracks = [];
    this.interval_id = false;

    this.bus_events_ids = [];
  }

  componentDidMount() {
    this.attachBusListeners();
    this.attachCallListeners();

    if (Object.keys(this.props.recording_users).length) {
      $(".recording-consent-modal").modal("show");
    }
  }

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };

    $(".recording-consent-modal").modal("hide");
    this.removeBusListeners();
  }

  attachBusListeners() {
    var bus_events_ids = this.bus_events_ids;

    bus_events_ids[bus_events_ids.length] = bus.on("call_recorder__record", this.startRecording.bind(this));
    bus_events_ids[bus_events_ids.length] = bus.on("call_recorder__stop", this.stopRecording.bind(this));
    bus_events_ids[bus_events_ids.length] = bus.on("audio_manager__audio_streams_updated", this.onAudioStreamsUpdated.bind(this));
  }

  removeBusListeners() {
    this.bus_events_ids.forEach(event_id => {
      bus.remove(event_id);
    });

    this.bus_events_ids = [];
  }

  attachCallListeners() {
    this.props.rtc_client.onRecordingStarted = this.onRecordingStarted.bind(this);
    this.props.rtc_client.onRecordingStopped = this.onRecordingStopped.bind(this);
    this.props.rtc_client.onScreenShared = this.onScreenShared.bind(this);
    this.props.rtc_client.onShareScreenStopped =this.onShareScreenStopped.bind(this);
    // this.props.rtc_client.onScreenStream = this.onScreenStream.bind(this);
    // this.props.rtc_client.onScreenStreamEnded = this.onScreenStreamEnded.bind(this);
    this.props.rtc_client.onLocalUserAudioStream = this.onLocalUserAudioStream.bind(this);
  }

  onRecordingStarted(params) {
    var { user_id } = params;

    if (user_id != this.props.current_user.id) {
      $(".recording-consent-modal").modal("show");
    }
  }

  onRecordingStopped(params) {
    var { user_id } = params;

    if (user_id != this.props.current_user.id) {
      var user = this.props.participants[user_id].user;
      toast.info(
        `${user.name} ${i18next.t("has stopped recording")}`,
        {
          position: 'bottom-left',
          className: 'call-toast',
          hideProgressBar: true
        }
      );
    }
  }

  onScreenShared(params) {
    var { user_id } = params;

    if (!this.media_recorder) return;

    if (user_id == this.props.current_user.id) {
      var shared_screen_stream_by_me = this.props.rtc_client.screen_stream;

      this.mixable_stream.replaceTrack(
        shared_screen_stream_by_me.getVideoTracks()[0]
      );
    }
  }

  onShareScreenStopped(params) {
    var { user_id } = params;

    if (!this.media_recorder) return;

    if (user_id == this.props.current_user.id) {
      this.mixable_stream.replaceTrack(
        this.desktop_screen_stream.getVideoTracks()[0]
      );
    }
  }

  onScreenStream(params) {
    var { stream } = params;

    if (!this.media_recorder) return;

    this.has_share_screen = true;
    this.mixable_stream.replaceTrack(stream.getVideoTracks()[0]);
  }

  onScreenStreamEnded(params) {
    if (!this.media_recorder) return;

    this.mixable_stream.replaceTrack(
      this.desktop_screen_stream.getVideoTracks()[0]
    );
  }

  onLocalUserAudioStream(params) {
    this.mergeAudioTracks();
  }

  onAudioStreamsUpdated(params) {
    this.mergeAudioTracks();
  }

  /**
   * Gets screen stream, captures only video as dektop audio capture doesn't work on mac
   */
  getMizdahScreenStream() {
    return desktopCapturer
      .getSources({ types: ["window", "screen"] })
      .then(async (sources) => {
        for (const source of sources) {
          if (source.id == window.electron_window.getMediaSourceId()) {
            var stream = await this.props.call_library.getSourceStream(source);

            return stream;
          }
        }
      });
  }

  async startRecording(options = {}) {
    var { soft_recording } = options;

    //Need to do before start again as sometime after recorder is stopped ondataavailable gets called
    //after we have restted things which adds a buffer to recorded_chunks and when we record again in the
    //same call it causes file corrupt issue because of that buffer
    this.resetThings();

    this.stopped = false;

    this.desktop_screen_stream = await this.getMizdahScreenStream();

    /**
     * Audio content, audio destination nodes are necessary to update audio tracks during recording e.g when someone joins call
     * Without it MediaRecorder stops recording whenever new track is added to stream directly during recording
     */
    this.audio_context = new AudioContext();
    this.audio_destination_node = new MediaStreamAudioDestinationNode(
      this.audio_context
    );

    var screen_stream_by_me = this.props.rtc_client.screen_stream;
    var screen_stream =
      this.props.shared_screen_ref.current.state.screen_stream;

    var stream =
      screen_stream_by_me || screen_stream || this.desktop_screen_stream;

    if (!screen_stream_by_me && screen_stream) {
      this.has_share_screen = true;
    }

    //Making new media stream from screen stream's video track and from audio destination node's audio tracks
    //We will add audio tracks later on to this audio destination node
    this.stream = new MediaStream([
      this.audio_destination_node.stream.getAudioTracks()[0],
      stream.getVideoTracks()[0],
    ]);

    this.mixable_stream = await this.makeMixableStream(this.stream);

    //Using lower bit rates to reduce file size
    this.media_recorder = new MediaRecorder(this.mixable_stream, {
      mimeType: "video/webm;codecs=vp9",
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 400000,
    });

    this.mergeAudioTracks();

    //Saving stream data whenever data buffer is received
    this.media_recorder.ondataavailable = (event) => {
      this.saveStreamData(event);
    };

    this.media_recorder.onstop = () => {
      this.downloadRecording();

      if (!this.stopped) {
        this.stopRecording();

        common.showAlert({
          title: i18next.t("Recording ended unexpectedly"),
          text: i18next.t("Recorded till this point has been downloaded"),
        });
      }
    };

    //Starting recorder, data will be received every second i.e 1000ms
    this.media_recorder.start();

    // When screen loosed focus, we will not record
    // this.dontRecordWhenMinimized();

    if (!soft_recording) {
      this.props.rtc_client.startRecording();
    }

    // without this the recorded data becomes 0, I think assigning it to video
    // elements makes the stream to flow that makes the recording data available not sure
    $('.call-recorder-video')[0].srcObject=this.mixable_stream;
  }

  stopRecording() {
    if (!this.media_recorder) return;

    if (this.media_recorder.state != "inactive") {
      this.media_recorder.stop();
    }

    this.props.rtc_client.stopRecording();
    this.mixable_stream.destroy();

    bus.dispatch("call_recorder__stopped");

    this.resetThings();
  }

  mergeAudioTracks() {
    if(!this.media_recorder) return;
    this.audio_tracks = [];

    window.call_helpers.getAudioStreams().forEach((audio_stream) => {
      this.audio_tracks.push(audio_stream.stream.getAudioTracks()[0])
    });

    // attaching my audio as well as this is not part of stream in SFU
    if (this.props.rtc_client.stream) {
      this.props.rtc_client.stream.getAudioTracks().forEach((track) => {
        this.audio_tracks.push(track);
      });
    }

    var audio_context = new AudioContext();
    var audio_stream_mixer = audio_context.createMediaStreamDestination();

    for (var i = 0; i < this.audio_tracks.length; i++) {
      const source_stream = audio_context.createMediaStreamSource(
        new MediaStream([this.audio_tracks[i]])
      );
      source_stream.connect(audio_stream_mixer);
    }

    var audio_stream = audio_stream_mixer.stream;

    //creating new audio source node
    var audio_source_node = new MediaStreamAudioSourceNode(this.audio_context, {
      mediaStream: audio_stream,
    });

    //conncting it to audio destination node
    audio_source_node.connect(this.audio_destination_node);

    //disconnecting previous audio source node, if any
    if (this.audio_source_node) this.audio_source_node.disconnect();

    this.audio_source_node = audio_source_node;
  }

  //No need to record when window is mimized or out of focus, due to privacy issue
  dontRecordWhenMinimized() {
    this.interval_id = setInterval(() => {
      var is_focused = window.ipcRenderer.sendSync("window__is_focused");

      if (!this.media_recorder) return;

      //if app is not in focus, no need to record stream part
      if (!is_focused) this.media_recorder.pause();
      else this.media_recorder.resume();
    }, 1000);
  }

  saveStreamData(event) {
    if (event.data.size > 0) {
      this.recorded_chunks = [event.data];
    }
  }

  async downloadRecording() {
    var blob = new Blob(this.recorded_chunks, {
      type: "video/mp4; codecs='vp9,opus'",
    });

    this.getSeekableBlob(blob, (seekable_blob) => {
      //file name
      var date_time = datetime.formatDateToDb(false, true);
      var call_title = this.call.title.substring(0, 10);
      var file_name = "Mizdah-Call-Recording-(" + call_title + ")-" + date_time;
      file_name = file_name.toLowerCase().replace(/\b./g, function (a) {
        return a.toUpperCase();
      });

      var url = URL.createObjectURL(seekable_blob);

      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = file_name + ".mp4";

      a.click();

      window.URL.revokeObjectURL(url);
    });
  }

  getSeekableBlob(blob, callback) {
    var reader = new ebml.Reader();
    var decoder = new ebml.Decoder();
    var tools = ebml.tools;
    var file_reader = new FileReader();

    file_reader.onload = function (e) {
      var ebml_elms = decoder.decode(this.result);

      ebml_elms.forEach(function (element) {
        reader.read(element);
      });

      reader.stop();

      var refined_metadata_buf = tools.makeMetadataSeekable(
        reader.metadatas,
        reader.duration,
        reader.cues
      );
      var body = this.result.slice(reader.metadataSize);

      var seekable_blob = new Blob([refined_metadata_buf, body], {
        type: "video/mp4",
      });

      callback(seekable_blob);
    };

    file_reader.readAsArrayBuffer(blob);
  }

  //Reset things for next recording
  resetThings() {
    this.media_recorder = false;
    this.recorded_chunks = [];
    this.audio_tracks = [];
    this.audio_context = false;
    this.audio_destination_node = false;
    this.audio_source_node = false;
    this.stopped = true;
    this.has_share_screen = false;
    this.desktop_screen_stream &&
      this.desktop_screen_stream.getTracks().forEach((track) => track.stop());
    this.desktop_screen_stream = false;

    clearInterval(this.interval_id);

    this.interval_id = false;
  }

  // Allows changing stream during recording
  // Makes self peer connection to transmit stream and then allows changing stream during recording using RtpSender
  async makeMixableStream(source_stream) {
    const self_pc_1 = new RTCPeerConnection();
    const self_pc_2 = new RTCPeerConnection();

    self_pc_1.onicecandidate = (evt) => {
      if (!evt.candidate) return;

      self_pc_2.addIceCandidate(evt.candidate);
    };

    self_pc_2.onicecandidate = (evt) => {
      if (!evt.candidate) return;

      self_pc_1.addIceCandidate(evt.candidate);
    };

    const mixable_stream_promise = waitForEvent(self_pc_2, "track").then(
      (event) => {
        return event.streams[0];
      }
    );

    source_stream.getTracks().forEach((track) => {
      self_pc_1.addTrack(track, source_stream);
    });

    await waitForEvent(self_pc_1, "negotiationneeded");

    try {
      var offer = await self_pc_1.createOffer();

      await self_pc_1.setLocalDescription(offer);
      await self_pc_2.setRemoteDescription(self_pc_1.localDescription);

      var offer = await self_pc_2.createAnswer();

      await self_pc_2.setLocalDescription(offer);
      await self_pc_1.setRemoteDescription(self_pc_2.localDescription);
    } catch (err) {
      console.error(err);
    }

    // Promisifies EventTarget.addEventListener
    function waitForEvent(target, type) {
      return new Promise((res) =>
        target.addEventListener(type, res, { once: true })
      );
    }

    const mixable_stream = await mixable_stream_promise;

    window.mixable_stream = mixable_stream;

    mixable_stream.replaceTrack = function (new_track) {
      const sender = self_pc_1
        .getSenders()
        .find(({ track }) => track.kind == new_track.kind);

      return (
        (sender && sender.replaceTrack(new_track)) ||
        Promise.reject("no such track")
      );
    };

    mixable_stream.destroy = function () {
      self_pc_1.close();
      self_pc_2.close();
    };

    return mixable_stream;
  }

  render() {
    const { t, i18n } = this.props;

    return (
      <>
        <div
          className="recording-consent-modal modal fade"
          role="dialog"
          ref="modal"
        >
          <div className="popup-backdrop"></div>

          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <h3>{i18next.t("This meeting is now being recorded")}</h3>

              <p>{i18next.t("permission to record")}</p>

              <p>{i18next.t("agree_to_be_recorded")}</p>

              <div className="text-right">
                <button
                  className="button btn-primary mr-2"
                  data-dismiss="modal"
                >
                  {i18next.t("Ok")}
                </button>

                <button
                  className="button btn-danger"
                  onClick={function () {
                    window.leaveCall({ reason: "recording" });
                  }}
                >
                 {i18next.t("Leave")}{(i18next.t("Meetings"))}
                </button>
              </div>
            </div>
          </div>
        </div>

        <video 
          class='call-recorder-video' 
          controls 
          muted>
        </video>

        { !!Object.keys(this.props.recording_users).length &&
          <span className="call-notification recording-notification">
            <i className="fas fa-record-vinyl icon"></i>

            {t("Meeting is being recorded by") + " "}
            {Object.values(this.props.recording_users)
              .map((user) => {
                return user.first_name;
              })
              .join(", ")}
          </span>
        }
      </>
    );
  }
}
export default withTranslation()(CallRecorder);
