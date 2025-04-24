import Swal from "sweetalert2/dist/sweetalert2.js";
import "../../css/sweetalert2.css";
import i18next from "i18next";

/**
 * Gets specific query string parameter
 * For parameters not present '' will be returned
 */
export function getUrlParameter(name, from_hash=false) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");

  var query_string = window.location.search;
  if(!query_string && from_hash) {
    query_string = window.location.href;
  }

  var results = regex.exec(query_string);
  
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function addUrlParameters({ url, parameters }) {
  var url_obj = new URL(url);
  
  Object.keys(parameters).forEach(key => {
    url_obj.searchParams.set(key, parameters[key]);
  });

  return url_obj.toString();
}

export function getCurrentUser() {
  return window.current_user;
}

export function getSubscription() {
  var subscription = localStorage.getItem("subscription");

  return subscription ? JSON.parse(subscription) : false;
}

export function setDummyUser() {
  // var localIpUrl = require('local-ip-url');
  // var ip_address = response.json();
  // console.log("local ip on common", localIpUrl('public', 'ipv4'));
  // var dummyUserId = "0"+dummyUserIds();
  var dummyUserId = dummyUserIds();
  var dummyUserName = dummyUserNames();
  var dummyEmail = dummyUserName + "@guest.com";
  // var privateIP = localIpUrl('public', 'ipv4');
  var loggedInUser = {
    id: parseInt(dummyUserId),
    is_guest: true,
    first_name: dummyUserName,
    last_name: "(guest)",
    firstName: dummyUserName,
    lastName: "(guest)",
    user_id: parseInt(dummyUserId),
    email: dummyEmail,
    language_id: "en",
    privateIP: "0.0.0.0",
    login_session_id: parseInt(dummyUserId),
    profile_picture_url:
      "https://mizdah.com/images/system/default_user_picture.jpg",
    profile_pic: "https://mizdah.com/images/system/default_user_picture.jpg",
    call_config: {
      bandwidth: {
        audio: 25,
        video: 100,
        screen: 200,
      },
      fps: 7,
      width: 320,
      height: 240,
    },
  };

  localStorage.setItem("dummy_user", JSON.stringify(loggedInUser));

  return getDummyUser();
}

export function getDummyUser() {
  var user = localStorage.getItem("dummy_user");

  return user ? JSON.parse(user) : false;
}

export function changeDummyData(name, ipAddress) {
  // var user = getDummyUser();
  // if(user==false) {
  //     user.first_name = name;
  // }
  var existing = localStorage.getItem("dummy_user");
  // var user = JSON.parse(localStorage.getItem('dummy_user'));
  existing = existing ? JSON.parse(existing) : {};
  existing["first_name"] = name;
  existing["privateIP"] = ipAddress;
  localStorage.setItem("dummy_user", JSON.stringify(existing));
}

export function updateDummyUser(data) {
  var existing_user = localStorage.getItem("dummy_user");
  existing_user = existing_user ? JSON.parse(existing_user) : {};

  var updated_user = { ...existing_user, ...data };
  localStorage.setItem("dummy_user", JSON.stringify(updated_user));
}

/**
 * Converts to json if necessary
 * @param escape_unicode, boolean, to escape arabic characters etc to preserve them
 */
export function convertToJson(data, escapse_unicode = false) {
  data = JSON.stringify(data);

  //escaping unicode characters
  if (escapse_unicode) {
    data = data.replace(/[\u007F-\uFFFF]/g, function (chr) {
      return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
    });
  }

  return data;
}

export function isJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function deepUpdateObject(source_object, target_object) {
  for (var key in target_object) {
    var value = target_object[key];

    if (
      key != "stream" &&
      typeof source_object[key] === "object" &&
      source_object[key] !== null
    ) {
      source_object[key] = deepUpdateObject(source_object[key], { ...value });
    } else {
      source_object[key] = value;
    }
  }

  return source_object;
}

export function capitalizeString(str) {
  return str && str[0].toUpperCase() + str.slice(1);
}

export function showAlert(params) {
  var { title, text, icon, html } = params;

  return Swal.fire({
    title: title,
    text: text,
    html,
    icon: icon,
    position: "center",
    confirmButtonText: i18next.t("OK"),
  });
}

export function showConfirmation(params) {
  var { title, text, confirm_btn_text, cancel_btn_text } = params;

  title = title || i18next.t("AreYouSure");
  confirm_btn_text = confirm_btn_text || i18next.t("Yes");
  cancel_btn_text = cancel_btn_text || i18next.t("Cancel");

  return Swal.fire({
    title: title,
    text: text,
    position: "top",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: confirm_btn_text,
    cancelButtonText: cancel_btn_text,
    buttonsStyling: false,
  });
}

export function showLoadingAlert(params = {}) {
  var { title, text, icon, html, customClass } = params;

  return Swal.fire({
    title: title,
    text: text,
    html,
    icon: icon,
    customClass,
    position: "center",
    didOpen: () => {
      Swal.showLoading();
    }
  });
}

export function closeAlerts() {
  Swal.close();
}

export function checkNetworkSpeed() {
  // var file_url = process.env.REACT_APP_SERVER_URL + '/images/system/network_speed_test_1mb.jpg';
  // var file_size_bytes = 1000000;
  var file_url =
    "https://upload.wikimedia.org/wikipedia/commons/a/a6/Brandenburger_Tor_abends.jpg";
  var file_size_bytes = "2707459";
  var file_size_bits = file_size_bytes * 8;
  var start_time = new Date().getTime();
  var end_time;

  return new Promise((resolve, reject) => {
    var download = new Image();
    download.src = file_url + "?v=" + start_time;

    download.onload = () => {
      end_time = new Date().getTime();

      var duration = (end_time - start_time) / 1000;
      var speed_bps = (file_size_bits / duration).toFixed(2);
      var speed_kbps = (speed_bps / 1024).toFixed(2);
      var speed_mbps = (speed_kbps / 1024).toFixed(2);

      resolve({
        duration,
        speed_bps,
        speed_kbps,
        speed_mbps,
      });
    };

    download.onerror = (err, msg) => {
      reject({
        error: err,
        error_msg: msg,
      });
    };
  });
}

// an alternative timing loop which can work event when tab is inactive, based on AudioContext's clock
export function setBackgroundInterval(callback, interval_ms) {
  // AudioContext time parameters are in seconds
  var ac_interval = interval_ms / 1000;
  var audio_context = new AudioContext();

  // chrome needs our oscillator node to be attached to the destination
  // so we create a silent Gain Node
  var silence = audio_context.createGain();
  silence.gain.value = 0;
  silence.connect(audio_context.destination);

  onOSCend();

  // A flag to know when we'll stop the loop
  var stopped = false;

  function onOSCend() {
    var osc = audio_context.createOscillator();
    osc.onended = onOSCend; // so we can loop
    osc.connect(silence);
    osc.start(0); // start it now
    osc.stop(audio_context.currentTime + ac_interval); // stop it next frame

    callback(audio_context.currentTime); // one frame is done

    // user broke the loop
    if (stopped) {
      osc.onended = function () {
        audio_context.close();
        return;
      };
    }
  }

  return {
    stop: function () {
      stopped = true;
    },
  };
}

export function decryptIt(string) {
  //removing first character
  string = string.substring(1);
  //removing last character
  string = string.slice(0, -1);

  try {
    return atob(string);
  } catch (err) {
    return false;
  }
}

export function makeRandomString(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var characters_length = characters.length;

  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters_length));
  }

  return result;
}

export function makeString(argu, arguLength) {
  var password = "";
  for (var i = 0; i <= arguLength; i++) {
    var randomNumber = Math.floor(Math.random() * argu.length);
    password += argu.substring(randomNumber, randomNumber + 1);
  }
  return password;
}

export function dummyUserIds() {
  var milliseconds = new Date().getTime();

  return milliseconds;
}

export function dummyUserNames() {
  var argu_first = makeString("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2);
  var argu_second = makeString(
    "abcdefghijklmnopqrstuvwxyABCDEFGHIJKLMNOPQRSTUVWXYZ",
    4
  );
  var argu_third = makeString("1234567890", 2);
  var argu_fourth = makeString(
    "abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
    3
  );

  return "guest" + argu_first + argu_second + argu_third + argu_fourth;
}

export function saveFileLocally(params) {
  var { file_name, content } = params;

  var blob = new Blob([content], { type: "text/plain;charset=utf-8;" });

  var element = document.createElement("a");
  element.setAttribute("href", URL.createObjectURL(blob));
  element.setAttribute("download", file_name);

  element.style.display = "none";
  document.body.appendChild(element);
  element.click();

  document.body.removeChild(element);
}

export function getDurationInMinutes(duration) {
  const timeSepration = duration.split(":");
  const timeHours = Number(timeSepration[0])
  const timeMinutes = Number(timeSepration[1])
  let UserPlanCheck = (timeHours * 60) + timeMinutes;
  return UserPlanCheck
}

export function makeElementFullScreen(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  
  } else if (element.webkitRequestFullscreen) { /* Safari */
    element.webkitRequestFullscreen();
  
  } else if (element.msRequestFullscreen) { /* IE11 */
    element.msRequestFullscreen();
  }
}

export function exitFullScreen() {
  if(!document.fullscreenElement) return;
  
  if (document.exitFullscreen) {
      document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
  }
}

export function makeDesktopRouteUrl({ route_name, query_string }) {
  if(process.env.REACT_APP_ENVOIRNMENT_KEY == 'app') {
    return `file://${window.app_path}/build/index.html?${query_string}#/${route_name}`;
  }

  return process.env.REACT_APP_URL + `/${route_name}?${query_string}`;
}

export function wait({ milliseconds }) {
  return new Promise((resolve, reject) => {
      setTimeout(_ => resolve(), milliseconds);
  });
}

export function maskEmail(email) {
  /* Not worked in safari,IE, FIrefox. only worked in google  console.log(email?.replace(/(?<=.{2}).(?=[^@]*?@)/g, "*"));
   below code is working fine in safari,IE, firefox and google. */
	return email?.replace(/^(.{2})[^@]+/, "$1******");
  
}

export function validateEmail(value) {
  const regex = new RegExp(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
  if (value.trim() === "") return false;
  return regex.test(value);
  
}

export function getExtension(filename) {
  var parts = filename.split('.');
  return parts[parts.length - 1];
}

export function file_type(val) {
  let ext = getExtension(val);
  let type = '';
  switch (ext.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
    case 'png':
    case 'tiff':
    case 'webp':
    case 'gif':
    case 'bmp':
    case 'ppm':
    case 'pgm':
    case 'pnm':
    case 'pbm':
    case 'svg':
    type = 'image';
    break;
    case 'mp4':
    case 'qt':
    case 'flv':
    case 'mpeg':
    case 'webm':
    case 'avi':
    case 'mkv':
    case 'mov':
    type = 'video';
    break;
    case 'mp3':
    case 'wav':
    type = 'audio';
    break;
    default:
    type = 'document';
    break;
  }
  return type;
}

export async function socketEmitAsync(socket, event, data) {
  return new Promise((resolve, reject) => {
      socket.emit(event, data, (response) => {
          if (response.error) {
              reject(response.error);
          } else {
              resolve(response); // Resolve with the response data
          }
      });
  });
}