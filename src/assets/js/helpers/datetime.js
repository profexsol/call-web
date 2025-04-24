import moment from "moment";

export function doFormatDate(date, format = "", output_time_zone = false, date_time_zone = false) {
	var momentt = date;
	//defaults to current datetime
	if (!date) date = moment();

	var user_time_zone = guessTimeZone().name;

	//if setting local time zone's full name
	if (output_time_zone == "local") output_time_zone = user_time_zone;
	if (date_time_zone == "local") date_time_zone = user_time_zone;

	//creating moment object if not already
	if (!(momentt instanceof moment) && date) {
		//creating from provided datetime
		if (date_time_zone && date_time_zone.toUpperCase() == "UTC") momentt = moment.utc(date);
		//local datetime
		else momentt = moment(date, date_time_zone);
	}

	//output time zone
	if (output_time_zone) momentt.tz(output_time_zone);

	return momentt.format(format);
}

export function formatDate(date, with_time = true, output_time_zone = "local", date_time_zone = false) {
	var format = "MMM D, YYYY";
	if (with_time) format = format + " hh:mm A";

	return doFormatDate(date, format, output_time_zone, date_time_zone);
}

export function formatDbDate(date, with_time = true, output_time_zone = "local") {
	return formatDate(date, with_time, output_time_zone, "utc");
}

export function formatTime(date, with_time = true, output_time_zone = "local", date_time_zone = false) {
	var format = "hh:mm A";

	return doFormatDate(date, format, output_time_zone, date_time_zone);
}

export function formatDateToDb(date, with_time = false, output_time_zone = false, date_time_zone = false) {
	var format = "YYYY-MM-DD";
	if (with_time) format += " HH:mm:ss";

	return doFormatDate(date, format, output_time_zone, date_time_zone);
}

export function formatTimeToDb(date, output_time_zone = false, date_time_zone = false) {
	return doFormatDate(date, "HH:mm:ss", output_time_zone, date_time_zone);
}

export function formatDbDateListing(date, with_time = true, output_time_zone = "local") {
	return formatDateListing(date, with_time, output_time_zone, "utc");
}

export function formatDateListing(date, with_time = true, output_time_zone = "local", date_time_zone = false) {
	var format = "YYYY-MM-DD";
	if (with_time) format += " HH:mm:ss";

	return doFormatDate(date, format, output_time_zone, date_time_zone);
}

export function utcToLocal(date) {
	var utcDate = moment.utc(date);
	var localDate = utcDate.local();

	return localDate;
}

export function guessTimeZone() {
	var timeZone = moment.tz.guess();

	return {
		name: timeZone,
		display_name: " (GMT" + moment.tz(timeZone).format("Z") + ") " + timeZone,
	};
}

export function formatTimeDB(date, with_time = true, output_time_zone = "local") {
	return formatofTime(date, with_time, output_time_zone, "utc");
}

export function formatofTime(date, with_time = true, output_time_zone = "local", date_time_zone = false) {
	if (with_time) var format = "hh:mm A";

	return doFormatDate(date, format, output_time_zone, date_time_zone);
}

export function getUtcDate() {
	var utc_date = moment.utc();

	return formatDateToDb(utc_date, true);
}

export function getLocalDate() {
	return formatDateToDb(false, true, 'local', 'local');
}

export function get_day_value(dateString) {
	var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	var date = new Date(dateString.replace(/-/g, "/"));   // Ehsan-ul-haq code for safari
	// 	var checkDate = moment(dateString).toDate(); Fauz code for safari
	var dayName = days[date.getDay()];
	return dayName;
}

export function getNextDay(dayName, recurringSelectedTime) {
	let date = new Date();
	let now = date.getDay();
	let days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
	let day = days.indexOf(dayName.toLowerCase());
	let current_day_time = get_date_value(date.getHours()) + ":" +get_date_value(date.getMinutes());
	let dd;
	if(day == date.getDay() && recurringSelectedTime >= current_day_time){
        console.log("current date", new Date());
		dd = new Date();
    }else{
		dd = new Date(desiredDayToDate(date, day, now));
	}
	console.log("dd", dd);
	return dd;
}

export function get_date_value(val){
	if (val < 10) {
		return "0" + val;
	  } else {
		return val;
	  }
}

export function get_day(date) {
	var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	var dayName = days[date.getDay()];
	return dayName;
}

// export function recurring_meeting_current_day(current_date, db_date, check_duration = false) {
// 	var currentDay = get_day(current_date);
// 	var meetingDay = get_day_value(db_date);

// 	console.log(
// 		'recurring_meeting_current_day',
// 		'currentDay', currentDay,
// 		'meetingDay', meetingDay,
// 		'current_date', current_date,
// 		'db_date', db_date
// 	);

// 	if (check_duration == true) {
// 		if (meetingDay == currentDay && addTime(db_date, "minutes", 30) > getTime(current_date, false))
// 			return true;

// 		return false;
// 	} else {
// 		if (meetingDay == currentDay)
// 			return true;

// 		return false;
// 	}

// }


export function recurring_meeting_current_day(current_date, db_date, check_duration = false) {
	var currentDay = get_day(current_date);
	var meetingDay = get_day_value(db_date);
	if (check_duration == true) {
		if (meetingDay == currentDay) {
			// && addTime(db_date,"minutes", 30) > getTime(current_date, false)){
			// if( addTime(db_date,"minutes", 30) > getTime(current_date, false)){
			return true;
		}

		return false;
	} else {
		// if(meetingDay == currentDay)
		return true;

		// return false;
	}

	// return true;
}
export function desiredDayToDate(date, desireDay, current) {
	let diff = desireDay - current;
	diff = diff < 1 ? 7 + diff : diff;
	return date.getTime() + 1000 * 60 * 60 * 24 * diff;
}

export function dateFormat(date) {
	var momentDate = moment.utc(date).local();
	var dateFormat = momentDate.format("MMM D, YYYY");
	return dateFormat;
}

export function getTimeZone() {
	return guessTimeZone().name;
}

export function getTime(date, utc = false) {
	if (utc == true) {
		var mDate = moment.utc(date);
	} else {
		var mDate = moment();
	}

	var dateFormat = mDate.format("HH:mm:ss");
	return dateFormat;
}

export function addTime(time, durantionType, durtaion) {
	var currentTime = moment(time);
	return moment(currentTime).add(durtaion, durantionType).format('HH:mm:ss');
}

export function getDate(dateTime) {
	var dd = String(dateTime.getDate()).padStart(2, '0');
	var mm = String(dateTime.getMonth() + 1).padStart(2, '0');
	var yyyy = dateTime.getFullYear();
	var today = dd + '-' + mm + '-' + yyyy;
	return today;
}