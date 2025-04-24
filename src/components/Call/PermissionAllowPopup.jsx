import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import chrome from "../../assets/images/call/chrome_permission.png";
import $ from "jquery";
import { FormLabel } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  mobile_img:{
    width:"95%",
  }
}));

function AddCallOptions() {
  const classes = useStyles();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    showMe();
  }, []);

  const showMe = () => {
    $(".permission-allow-modal").modal("show");
  }

  const hideMe = () => {
    $(".permission-allow-modal").modal("hide");
  }

  return (
    <div className="modal fade permission-allow-modal" role="dialog">

      <div className="popup-backdrop"></div>

      <div className="modal-dialog popup-container" role="document">
        <div className="modal-content popup-inner">
          <div className="popup-header">
            <div className="popup-heading">
              {t("Camera and microphone access")}
            </div>
          
            <div className="popup-close" onClick={hideMe}>
              <i className="fas fa-times"></i>
            </div>
          </div>
            
          <div
            className={classes.rootMain}
            style={{ display: "block", textAlign: 'center' }}>
              <FormLabel
                style={{ color: "#0057D3", textAlign: 'left' }}
                className="privacyMargin-20">
                
                {t("If you see a popup like the one above asking for permission to use these devices, make sure to allow access.")}
              </FormLabel>
          
              <FormLabel
                style={{ color: "#0057D3", textAlign: 'left' }}
                className="privacyMargin-20">
                
                {t("We need access of camera and microphone to continue.")}
              </FormLabel>

              <img 
                src={chrome} 
                style={{ marginTop: '15px' }}
                className={window.innerWidth > 768 ? '' : classes.mobile_img} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCallOptions;
