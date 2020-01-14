window.onload = function ()
{
	if (tizen.preference.exists("mqttURL")) { document.getElementById("inputURL").value = tizen.preference.getValue("mqttURL"); }
	if (tizen.preference.exists("mqttPort")) { document.getElementById("inputPort").value = tizen.preference.getValue("mqttPort"); }
	if (tizen.preference.exists("mqttUserName")) { document.getElementById("inputUserName").value = tizen.preference.getValue("mqttUserName"); }
	if (tizen.preference.exists("mqttPassword")) { document.getElementById("inputPassword").value = tizen.preference.getValue("mqttPassword"); }
	if (tizen.preference.exists("mqttDeviceID")) { document.getElementById("inputDeviceID").value = tizen.preference.getValue("mqttDeviceID"); }
	if (tizen.preference.exists("mqttInitials")) { document.getElementById("inputInitials").value = tizen.preference.getValue("mqttInitials"); }
	if (tizen.preference.exists("mqttUseTLS")) { document.getElementById("inputTLS").checked = tizen.preference.getValue("mqttUseTLS"); }
	if (tizen.preference.exists("mqttRetainMessages")) { document.getElementById("inputRetain").checked = tizen.preference.getValue("mqttRetainMessages"); }
	if (tizen.preference.exists("gpsUpdateFrequency")) { document.getElementById("inputUpdateFrequency").value = tizen.preference.getValue("gpsUpdateFrequency"); }
	
    var btnApply = document.getElementById("buttonApply"); 
    btnApply.addEventListener("click", function() {
    	tizen.preference.setValue("mqttEnabled",true);
    	tizen.preference.setValue("mqttURL", document.getElementById("inputURL").value);
    	tizen.preference.setValue("mqttPort", document.getElementById("inputPort").value);
    	tizen.preference.setValue("mqttUserName", document.getElementById("inputUserName").value);
    	tizen.preference.setValue("mqttPassword", document.getElementById("inputPassword").value);
    	tizen.preference.setValue("mqttDeviceID", document.getElementById("inputDeviceID").value);
    	tizen.preference.setValue("mqttInitials", document.getElementById("inputInitials").value);
    	tizen.preference.setValue("mqttRetainMessages", document.getElementById("inputRetain").checked);
    	tizen.preference.setValue("mqttUseTLS", document.getElementById("inputTLS").checked);
    	tizen.preference.setValue("gpsUpdateFrequency", document.getElementById("inputUpdateFrequency").value);
    	
    	window.location = "index.html";
    });
    
    // Hardware key listeners 
    document.addEventListener("tizenhwkey", function(e)
    {
    	if(e.keyName === "back")
    	{
    		window.location = "index.html";
    	}
    });
};