import React from "react";
import "../../assets/css/call/join_options.css";
import { useTranslation } from "react-i18next";

function JoinOptions({ call, call_options, initJoin, cancelJoin }) {
  var video_muted = call_options.video.muted;
  var audio_muted = call_options.audio.muted;
  var can_turn_on_audio = call_options.audio.can_turn_on;
  var can_turn_off_audio = call_options.audio.can_turn_off;

  if(window.call_helpers.device.os.name == "iOS") {
    audio_muted = false;
    can_turn_on_audio = true;
    can_turn_off_audio = false;
  }

  const { t, i18n } = useTranslation();
  const [show_me, setShowMe] = React.useState(true);
  const [is_video_on, setIsVideoOn] = React.useState(!video_muted);
  const [is_audio_on, setIsAudioOn] = React.useState(!audio_muted);

  const onAudioOptionChanged = (e) => {
    setIsAudioOn(!!parseInt(e.target.value));
  }

  const onVideoOptionChanged = (e) => {
    setIsVideoOn(!!parseInt(e.target.value));
  }

  const join = () => {
    initJoin({ is_video_on, is_audio_on });
    setShowMe(false);
  }

  const cancel = () => {
    cancelJoin();
    setShowMe(false);
  }

  const getLanguageDirection = () => {
    const language = i18n.language;

    if (language === "ar") {
      return "rtl";
    } else {
      return "ltr";
    }
  };
  const languageDirection = getLanguageDirection(); 
  return (
    <div  dir={languageDirection} className={"join-options-container popup-container" + (show_me ? '' : ' d-none')}>
      <div className="popup-inner">
        <div className="popup-header">
          <div className="popup-heading w-100">
            {t("Join Meeting")}
            <div className="call-title">{ call.title }</div>
          </div>

          <div className="popup-close" onClick={ cancel }>
            <i className="fas fa-times icon"></i>
          </div>
        </div>

        <div className="video-options" >
          <div className="title">{t("Video")}</div>

          <div className="video-options-container">

            <input 
              className="form-control"
              id="video-on" 
              type='radio' 
              name='video-option'
              value='1'
              checked={ is_video_on } 
              onChange={ onVideoOptionChanged } 
            />
            <label for='video-on'>{ t("Enable") }</label>

            <input 
              className="form-control"
              id="video-off" 
              type='radio' 
              name='video-option' 
              value='0'
              checked={ !is_video_on } 
              onChange={ onVideoOptionChanged } 
            />
            <label for='video-off'>{ t("Disable") }</label>
          </div>
        </div>

        <div className="audio-options">
          <div className="title">{t("Audio")}</div>

          <div className="audio-options-container">
            
            <input 
              className="form-control"
              id="audio-on" 
              type='radio' 
              name='audio-option' 
              value='0'
              checked={ !is_audio_on } 
              disabled={ !can_turn_off_audio }
              onChange={ onAudioOptionChanged } 
            />
            <label 
              for='audio-on'
              title={ !can_turn_on_audio ? t("Option disabled by host") : "" }>
              
              { t("Mute") }
            </label>

            <input 
              className="form-control"
              id="audio-off" 
              type='radio' 
              name='audio-option' 
              value='1'
              checked={ is_audio_on } 
              disabled={ !can_turn_on_audio }
              onChange={ onAudioOptionChanged } 
            />
            <label 
              for='audio-off' 
              title={ !can_turn_on_audio ? t("Option disabled by host") : "" }>
              
              { t("Unmute") }
            </label>
          </div>
        </div>

        <div className="options">
          <button 
            type="button" 
            className="button cancel-btn"
            onClick={ cancel }>
            
            {t("Cancel")}
          </button>

          <button 
            type="button" 
            className="button success-btn"
            onClick={ join }>
            
            {t("Join")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default JoinOptions;