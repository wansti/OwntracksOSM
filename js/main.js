
window.onload = function()
{  	
	// OpentopoMap
	var osmMaxZoom = 17;
	var opentopoUrl = "https://a.tile.opentopomap.org/{z}/{x}/{y}.png";
	var opentopoAttribution = 'Map Data by <a href="https://opentopomap.org/" target="_blank">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">CC-BY-SA</a>)';
	var opentopo = new L.TileLayer(opentopoUrl, {maxZoom: osmMaxZoom, attribution: opentopoAttribution});
	
	// Make sure these preferences have a value
	if (!tizen.preference.exists("mqttUseTLS")) { tizen.preference.setValue("mqttUseTLS", true); }
	if (!tizen.preference.exists("mqttRetainMessages")) { tizen.preference.setValue("mqttRetainMessages", false); }
	if (!tizen.preference.exists("gpsUpdateFrequency")) { tizen.preference.setValue("gpsUpdateFrequency", 10); }
	if (!tizen.preference.exists("mqttPort")) { tizen.preference.setValue("mqttPort", 8883); }
	if (!tizen.preference.exists("mqttDeviceID")) { tizen.preference.setValue("mqttDeviceID", "watch"); }
	if (!tizen.preference.exists("mapLastLatitude")) { tizen.preference.setValue("mapLastLatitude", -35.30826); }
	if (!tizen.preference.exists("mapLastLongitude")) { tizen.preference.setValue("mapLastLongitude", 149.12447); }

	// Set default until the first update
	var map = new L.Map("map", {
		center: new L.LatLng(tizen.preference.getValue("mapLastLatitude"), tizen.preference.getValue("mapLastLongitude")),
		zoom: 14,
		layers: [opentopo]
	});
	
	var iconMarkerBase = L.Icon.extend({
		options: {
			iconSize:     [28, 44],
			iconAnchor:   [14, 44],
			popupAnchor: [1, -34],
			tooltipAnchor: [16, -28]
		}
	});
	var iconMarkerLocal = L.icon({
		iconUrl: "image/marker_black.png",
		iconSize:     [32, 50],
		iconAnchor:   [19, 50],
		popupAnchor:  [1, -34],
		tooltipAnchor: [16, -28]
	});

	var iconPin = L.icon({
		iconUrl: "image/pin.png",
		iconSize: [28, 67],
		iconAnchor: [0, 67],
		popupAnchor: [14, -54]
	});
	
	var iconMarkerOwn = new iconMarkerBase({iconUrl: "image/marker_blue.png"});
	var coloredMarkers = [ new iconMarkerBase({iconUrl: "image/marker_red.png"}),
	                       new iconMarkerBase({iconUrl: "image/marker_lgreen.png"}),
	                       new iconMarkerBase({iconUrl: "image/marker_orange.png"}),
	                       new iconMarkerBase({iconUrl: "image/marker_purple.png"}),	                       
	                       new iconMarkerBase({iconUrl: "image/marker_yellow.png"}),
	                       new iconMarkerBase({iconUrl: "image/marker_dgreen.png"}),
	                       new iconMarkerBase({iconUrl: "image/marker_brown.png"}) ];
	var nextMarkerColor = 0;

	
	var markers = new Map();
	var circles = new Map();

	// status variables
	var appStatus = {
		"mqtt":"disconnected",       //disconnected/connected (unused because Paho does it internally)
		"updating":"stopped",		 //stopped/started
		"gps":"waitforpermission",	 //waitforpermission/active/waitforfix
		"activeMarker":"none",
		"batteryLevel":0,
		"menuOpen": true,
		"keepScreenOn": false,
		"debugLog": true
	};
    
	var mqttClient;
	var mqttConnectOptions;
	var mqttUserName;
	var mqttDeviceID;
	
	if (tizen.preference.exists("mqttURL") && tizen.preference.exists("mqttPort") && tizen.preference.exists("mqttDeviceID") && tizen.preference.exists("mqttInitials") && tizen.preference.exists("mqttUserName") && tizen.preference.exists("mqttPassword"))
	{
		var mqttID = tizen.preference.getValue("mqttUserName")+tizen.preference.getValue("mqttDeviceID");
		mqttUserName = tizen.preference.getValue("mqttUserName")
		mqttDeviceID = tizen.preference.getValue("mqttDeviceID");
		if ((mqttID != "") && (mqttUserName != "") && (mqttDeviceID != "")) {
			tizen.preference.setValue("mqttEnabled", true);
			mqttConnectOptions = {
					"useSSL": tizen.preference.getValue("mqttUseTLS"),
					"userName": mqttUserName,
					"password": tizen.preference.getValue("mqttPassword"),
					"timeout": 10,
					"reconnect": false,
					"keepAliveInterval": 60,
					"onSuccess": onMqttConnectSuccess,
					"onFailure": onMqttConnectFailed
			};
			try {
				mqttClient = new Paho.Client(tizen.preference.getValue("mqttURL"), parseInt(tizen.preference.getValue("mqttPort")), "/mqtt", mqttID);
				mqttClient.onConnectionLost = onMqttConnectionLost;
				mqttClient.onMessageArrived = onMqttMessageArrived;
				mqttClient.onConnected = onMqttConnected;
			}
			catch(e) {
				msg("Cannot create client: " + e.message);
				tizen.preference.setValue("mqttEnabled", false);
			}
		}
		else {
			msg("Server settings missing or incomplete.");
			tizen.preference.setValue("mqttEnabled", false);
		}
	}
	else {
		tizen.preference.setValue("mqttEnabled", false);
	}
	
	if (!tizen.preference.getValue("mqttEnabled")) {
		// Use black marker without offset in local only mode
		iconMarkerOwn = new iconMarkerBase({iconUrl: "image/marker_black.png"});
	}
	
	var gpsFreq = 10;
	if (tizen.preference.exists("gpsUpdateFrequency"))
	{
		gpsFreq = tizen.preference.getValue("gpsUpdateFrequency");
	}
	var gpsOptions = {
		"callbackInterval": (gpsFreq * 1000),
		"sampleInterval": (gpsFreq * 1000)
	};

		
	// Functions
	function msg(message)
	{
		var status = "MQTT: ";
		if (appStatus.mqtt === "connected") { status += "C"; } else { status += "D"; }		
		status += " GPS: ";
		if (appStatus.gps === "waitforpermission") { status += "WP"; } else if (appStatus.gps === "waitforfix") { status += "WF"; } else { status += "A"; }
		status += " RUN: ";
		if (appStatus.updating === "started") { status += "Y"; } else { status += "N"; }
		var textbox = document.getElementById("logBox");
		textbox.innerHTML = textbox.innerHTML + "<br>" + message;
	}
	
	function toggleMenu()
	{
		if (appStatus.menuOpen)
		{
			document.getElementById("ButtonConnection").style.display = "none";
			document.getElementById("ButtonMarker").style.display = "none";
			document.getElementById("ButtonSettings").style.display = "none";
			document.getElementById("ButtonScreen").style.display = "none";
			document.getElementById("ButtonDebug").style.display = "none";
			document.getElementById("ButtonPin").style.display = "none";
			document.getElementById("ButtonPinRemove").style.display = "none";
			document.getElementById("ButtonMenu").src = "image/menu.png";
			appStatus.menuOpen = false;
		}
		else {
			document.getElementById("ButtonConnection").style.display = "flex";
			document.getElementById("ButtonMarker").style.display = "flex";
			document.getElementById("ButtonSettings").style.display = "flex";
			document.getElementById("ButtonScreen").style.display = "flex";
			document.getElementById("ButtonDebug").style.display = "flex";
			document.getElementById("ButtonPin").style.display = "flex";
			document.getElementById("ButtonPinRemove").style.display = "flex";
			document.getElementById("ButtonMenu").src = "image/menu_open.png";
			appStatus.menuOpen = true;
		}
	}
	
	function toggleKeepScreenOn()
	{
		if (appStatus.keepScreenOn)
		{
			tizen.power.release("SCREEN");
			document.getElementById("ButtonScreen").src = "image/screenoff.png";
			appStatus.keepScreenOn = false;
		}
		else {
			tizen.power.request("SCREEN", "SCREEN_NORMAL");
			document.getElementById("ButtonScreen").src = "image/screenon.png";
			appStatus.keepScreenOn = true;
		}
	}

	function toggleDebugLog()
	{
		if (appStatus.debugLog)
		{
			document.getElementById("logLayer").style.display = "none";
			document.getElementById("ButtonDebug").src = "image/logoff.png";
			appStatus.debugLog = false;
		}
		else {
			document.getElementById("logLayer").style.display = "flex";
			document.getElementById("ButtonDebug").src = "image/logon.png";
			appStatus.debugLog = true;
		}
	}
	
	function stopUpdating()
	{
   		tizen.humanactivitymonitor.stop("GPS");
		tizen.power.release("CPU");
		if (tizen.preference.getValue("mqttEnabled"))
		{
			try {
				mqttClient.disconnect();
			}
			catch(e) {
				msg(e.message);
			}
		}		
		document.getElementById("ButtonConnection").src = "image/disconnected.png";
		appStatus.updating = "stopped";
		msg("Stopped");
	}
    
    function startUpdating()
    {
    	if (appStatus.gps !== "waitforpermission")
    	{
    		try {
    			if (appStatus.updating === "stopped")
    			{
    				if (tizen.preference.getValue("mqttEnabled"))
    				{
    					try {
							mqttClient.connect(mqttConnectOptions);
    					}
    					catch(e) {
    						msg(e.message);
    					}
    				}
    				tizen.humanactivitymonitor.start("GPS", onGPSChanged, onGPSError, gpsOptions);
    				//TODO: Enabling this seems to slightly improve GPS accuracy and even decrease power consumption??
    				tizen.power.request("CPU", "CPU_AWAKE");
    				document.getElementById("ButtonConnection").src = "image/connected.png";
    				appStatus.updating = "started";
    				msg("Started");
    			}
    			else if (appStatus.updating === "started")
    			{
					stopUpdating();
    			}
    		}
    		catch(err)
    		{
    			msg(err.message);
    		}
    	}
    	else {
    		msg("Permission error");
    	}
    }
    
    function formattedDate(tst)
    {
		var timestamp = new Date(tst*1000);
		var year = timestamp.getFullYear();
		var month = timestamp.getMonth() + 1;
		var day = timestamp.getDate();
		var hour = timestamp.getHours();
		var minute = timestamp.getMinutes();
		var sec = timestamp.getSeconds();		
		if (month < 10) { month = "0" + month; }
		if (day < 10) { day = "0" + day; }
		if (hour < 10) { hour = "0" + hour; }
		if (minute < 10) { minute = "0" + minute; }
		if (sec < 10) { sec = "0" + sec; }
		return (year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + sec);
    }
    
    function placePin()
    {
    	var mapCenter = map.getCenter();
    	var unixTime = now();
    	if (tizen.preference.getValue("mqttEnabled"))
    	{
    		var gpsInfo = {
				"errorRange": 0,
				"altitude": 0,
				"latitude": mapCenter.lat,
				"longitude": mapCenter.lng,
				"speed": 0
			};
    		if (mqttSendPosition(gpsInfo, unixTime, mqttUserName, "pin"))
    		{
    			msg("Pin sent.");
    		}
    		else {
    			msg("Unable to place pin.");
    		}
    	}
    	else {
    		//Place pin locally
    		updateMarker("Me/pin", mapCenter.lat, mapCenter.lng, 0, unixTime, 0);
    		msg("Pin placed.");
    	}
    }
    
    function removePin()
    {
    	if (tizen.preference.getValue("mqttEnabled"))
    	{
			try {
				var message = new Paho.Message('{}');
				message.destinationName = "owntracks/"+mqttUserName+"/pin";
				message.retained = true;
				mqttClient.send(message);
				msg("Pin cleared from server.");
				if (removeMarker(mqttUserName+"/pin"))
				{
					msg("Pin removed.");
				}
				else {
					msg("Pin not found.");
				}
			}
			catch(e) {
				msg("Error deleting pin: " + e.message);
			}
    	}
    	else {
    		//Remove pin locally
			if (removeMarker("Me/pin"))
			{
				msg("Local pin removed.");
			}
			else {
				msg("Local pin not found.");
			}
    	}
    }
    
    function updateMarker(key, lat, lon, acc, tst, batt)
    {
    	var marker;
    	var circle;
    	var popupString = "<b>"+key+"</b>";
    	var markerIsPin = (key.split("/").pop() === "pin");

    	if (!markerIsPin && batt > 0) {
    		popupString += " Bt:" + batt + "%";
    	}
		if (tst > 0) {
			popupString += "<br>" + formattedDate(tst);
		}

    	if (markers.has(key))
    	{
    		marker = markers.get(key);    		
    		marker.setLatLng([lat,lon]);
    		marker.bindPopup(popupString);
    		circle = circles.get(key);
    		circle.setLatLng([lat,lon]);
    		circle.setRadius(acc);
    	}
    	else {
    		if (key === "Me") { 
    			if (tizen.preference.getValue("mqttEnabled")) {    				
    				marker = L.marker([lat,lon], {icon: iconMarkerLocal}); 
    			}
    			else {
    				marker = L.marker([lat,lon], {icon: iconMarkerOwn});
    			}
    		}
    		else if (key === (mqttUserName+"/"+mqttDeviceID)) { marker = L.marker([lat,lon], {icon: iconMarkerOwn}); }
    		else if (markerIsPin) { marker = L.marker([lat, lon], {icon: iconPin}); }
    		else {
    			marker = L.marker([lat,lon], {icon: coloredMarkers[nextMarkerColor]});
    			nextMarkerColor = (nextMarkerColor + 1) % coloredMarkers.length;
    		}    		
    		marker.bindPopup(popupString);
    		marker.addTo(map);
    		markers.set(key, marker);
    		circle = L.circle([lat, lon], 100, {color: 'blue',fillColor: '#f03',fillOpacity: 0.5});
    		circle.setRadius(acc);
    		circle.addTo(map);
    		circles.set(key, circle);
    	}
    	if (appStatus.activeMarker === key) { map.setView([lat,lon]); }
    }
    
    function removeMarker(key)
    {
    	if (markers.has(key))
    	{
    		map.removeLayer(markers.get(key));
    		markers.delete(key);
    		if (circles.has(key))
    		{
    			map.removeLayer(circles.get(key));
    			circles.delete(key);
    		}
    		return true;
    	}
    	else {
    		return false;
    	}
    }
    
    function cycleMarkers()
    {
    	var next = false;
    	if (appStatus.activeMarker === "none") { next = true; }
    	for (var key of markers.keys())
    	{
    		if (next)
    		{
    			var marker = markers.get(key);
    			map.setView(marker.getLatLng());    			
    			appStatus.activeMarker = key;
    			next = false;
    			break;
    		}
    		else if (appStatus.activeMarker === key)
    		{
    			next = true;
    		}    		
    	}
    	if (next)
		{
			// last
			appStatus.activeMarker = "none";
			document.getElementById("ButtonMarker").src = "image/autopan.png";
		}
    	else
    	{
    		document.getElementById("ButtonMarker").src = "image/marker_next.png";
    	}
    }
    
    function timeDiff(tst)
    {
    	var unixTime = now();
		var diff = Math.round(unixTime - tst);
		if (diff < 2) { return "now"; }
		else if (diff < 90) { return diff+" seconds ago"; }
		else if (diff < 3600) { return Math.round(diff/60)+" minutes ago"; }
		else if (diff < 86400) { return Math.round(diff/60)+" hours ago"; }
		else { return Math.round(diff/86400)+" days ago"; }
    }
    
    function mqttSendPosition(gpsInfo, timestamp, username, devid)
    {
		if (tizen.preference.getValue("mqttEnabled"))
		{
			tizen.systeminfo.getPropertyValue("BATTERY", function(b){ appStatus.batteryLevel = b.level; });

			//TODO: Use JSON object
			var payload = "{\"_type\":\"location\",\"acc\":"+gpsInfo.errorRange+",\"alt\":"+gpsInfo.altitude+",\"batt\":"+(appStatus.batteryLevel*100)+",\"conn\":\"m\",\"lat\":"+gpsInfo.latitude+",\"lon\":"+gpsInfo.longitude+",\"t\":\"u\",\"tid\":\""+tizen.preference.getValue("mqttInitials")+"\",\"tst\":"+timestamp+",\"vel\":"+(gpsInfo.speed * 1000.0/3600.0)+"}";
			var message = new Paho.Message(payload);
			message.destinationName = "owntracks/"+username+"/"+devid;
			if (devid === "pin")
			{
				message.retained = true;
			}
			else {
				message.retained = tizen.preference.getValue("mqttRetainMessages");
			}

			try {
				mqttClient.send(message);
				return true;
			}
			catch(e) {
				msg(e.message);
				return false;
			}
		}
		else {
			return false;
		}
    }

    function now()
    {
    	var unixTime = new Date().getTime();
		unixTime = Math.floor(unixTime / 1000);
		return unixTime;
    }

    
    // Callback functions
    function onGPSChanged(info)
    {
    	if (appStatus.updating === "started")
    	{
    		if (info.gpsInfo.length > 0)
    		{       	
    			var gpsInfo = info.gpsInfo[info.gpsInfo.length-1];
    			if (gpsInfo.latitude !== 200 && gpsInfo.longitude !== 200)
    			{
    				appStatus.gps = "active";
    				
    				var unixTime = now();
					
    				updateMarker("Me", gpsInfo.latitude, gpsInfo.longitude, gpsInfo.errorRange, unixTime, 0);
    				
    				if (mqttSendPosition(gpsInfo, unixTime, mqttUserName, mqttDeviceID))
    				{
    					msg("U "+formattedDate(unixTime));
    				}
    				else {
    					msg("Position updated locally");
    				}
    			}
    			else {
    				appStatus.gps = "waitforfix";
    				msg("GPS not ready");
    			}
    		}
    	}
    }

    function onGPSError(error) {
    	msg(error.message);
    }

    function onMqttMessageArrived(message) {
    	  var json = JSON.parse(message.payloadString);
    	  if (json._type === "location")
    	  {
    		  updateMarker(message.destinationName.substring(10), json.lat, json.lon, json.acc, json.tst, json.batt);
    	  }
    	  //client.disconnect();
    }
    
    function onPermissionGranted() {
    	appStatus.gps = "active";
    }
    
    function onPermissionError() {
    	appStatus.gps = "waitforpermission";
    }       

	function onMqttConnectSuccess() {
		msg("Connect success");
	}

	function onMqttConnectFailed(responseObject) {
		appStatus.mqtt = "disconnected";
		msg(responseObject.errorMessage);
	}
	
	function onMqttConnectionLost(responseObject) {
		appStatus.mqtt = "disconnected";
		msg(responseObject.errorMessage);
		if (responseObject.errorCode !== 0) {
			try {
				mqttClient.connect(mqttConnectOptions);
			}
			catch(e) {
				msg(e.message);
			}
		}
	}

	function onMqttConnected(reconnect, URI) {
		appStatus.mqtt = "connected";
		if (reconnect) { msg("Reconnected"); } else { msg("Connected"); }
		mqttClient.subscribe("owntracks/#", {"onSuccess": onMqttSubscribeSuccess, "onFailure": onMqttSubscribeFailed});
	}
	
	function onMqttSubscribeSuccess() {
		msg("Subscribed");
	}

	function onMqttSubscribeFailed(responseObject)
	{
		msg("Subscription failed: "+responseObject.errorMessage);
	}
    
    // Hardware key listeners 
    document.addEventListener("tizenhwkey", function(e)
    {
    	if(e.keyName === "back")
    	{
    		try {
				stopUpdating();
				
				// store last map position
		    	var mapCenter = map.getCenter();
		    	tizen.preference.setValue("mapLastLatitude",mapCenter.lat);
		    	tizen.preference.setValue("mapLastLongitude",mapCenter.lng);
		    	
    			tizen.application.getCurrentApplication().exit();
    		}
    		catch (ignore) {
    		}
    	}
    });
    
    document.addEventListener("rotarydetent", function(e)
    {
    	// Get the direction value from the event
    	var direction = e.detail.direction;

    	if (direction === "CW") {
    		var zoomIn = map.getZoom()+1;
    		if (zoomIn <= osmMaxZoom) { map.setZoom(zoomIn); }
    	} else if (direction === "CCW") {
    		var zoomOut = map.getZoom()-1;
    		if (zoomOut >= 0) { map.setZoom(zoomOut); }
    	}
    });
    
   
    // Button listeners
    document.getElementById("ButtonConnection").addEventListener("click", startUpdating);
    document.getElementById("ButtonSettings").addEventListener("click", function() { window.location = "settings.html"; });
    document.getElementById("ButtonMarker").addEventListener("click", cycleMarkers);        
    document.getElementById("ButtonMenu").addEventListener("click", toggleMenu);
    document.getElementById("ButtonScreen").addEventListener("click", toggleKeepScreenOn);
    document.getElementById("ButtonDebug").addEventListener("click", toggleDebugLog);
    document.getElementById("ButtonPin").addEventListener("click", placePin);
    document.getElementById("ButtonPinRemove").addEventListener("click", removePin);

    // Startup and permission requests
	toggleMenu(); // Doesn't work if started closed for some reason
	toggleDebugLog(); // Doesn't work if started closed for some reason
	
	tizen.ppm.requestPermission("http://tizen.org/privilege/location", onPermissionGranted, onPermissionError);
	tizen.ppm.requestPermission("http://tizen.org/privilege/healthinfo", onPermissionGranted, onPermissionError);	
};
