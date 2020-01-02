# OwntracksOSM
OwntracksOSM is a standalone, wearable mapping and location sharing app for Samsung Galaxy brand smartwatches. On its own, it can be used to view [OpenStreetMap](https://www.openstreetmap.org) based maps on your watch and display your location using the watch's builtin GPS. In conjunction with an [MQTT](https://mqtt.org) broker and the [Owntracks](https://owntracks.org) protocol, it can be used to share your location with other users and display their locations on your watch in real time.

## Why Owntracks for location sharing?
Owntracks is open source and privacy focused. Using a commercial location sharing service is impossible without sharing highly sensitive data with third parties. Owntracks lets you [set up your own private location sharing server](https://owntracks.org/booklet/guide/broker) so all of your location data remains in your own hands. Since OwntracksOSM uses the builtin GPS of your smartwatch, it will work with location services on your phone turned off. OwntracksOSM is compatible with the [official apps for Android and iOS](https://owntracks.org/booklet/guide/apps) so it is possible to share your location with users who do not own a Samsung smartwatch. Please refer to the [Owntracks documentation](https://owntracks.org/booklet) and the [Owntracks repository on Github](https://github.com/owntracks) for more information on the service.

## Usage
### Using OwntracksOSM as a Standalone App
Without an Owntracks broker, you can still use the app as a free and open source OpenStreetMap client on your smartwatch. Using the location sharing features will require an Owntracks broker.

### Setting up an Owntracks Broker
Please refer to [this manual](https://owntracks.org/booklet/guide/broker) on how to set up an Owntracks server and configure users and access rights. The document is written for the Raspberry Pi and the Raspbian OS but it also works on other Debian-based Linux distros such as Ubuntu.

### Main Screen
Upon opening the app on your watch you will be greeted with the map screen and a menu button. Use the touch screen to move the map and the bezel or two-finger pinch gesture to zoom. Press the menu button to bring up the menu where you will find the following functions (left to right):

* **Toggle Screen On**: Activate this to keep your smartwatch's screen on. This will use more battery but it will make sure you have the map ready at all times.
* **Debug Log**: Bring up the log showing error and status messages.
* **Place Pin**: Press this button to place a pin at the map center. If you have placed a pin on the map before it will be moved to the current location. (The pin is implemented as a retained location message with the device ID "pin".)
* **Remove Pin**: Remove the pin from the map.
* **Connect / Disconnect**: Press this button to start and stop tracking your location. When an Owntracks server is configured on the settings page, it will also connect to and disconnect from the server.
* **Cycle Markers**: Use this button to keep the map centered on a map marker or pin. Pressing it multiple times will cycle through all available markers.
* **Toggle Menu**: Press to show or hide the menu.
* **Settings**: Brings up the configuration page where you can configure your Owntracks server.

The buttons on the smartwatch will do the following:
* **Back Button (top)**: Exit the app and stop tracking.
* **Menu Button (bottom)**: Hide the app and show the watch face. OwntracksOSM will maintain an open connection and keep sending position updates to the server. You may get a warning about the app draining your battery.

### Server Settings
Press the Settings button in the main menu to bring up the configuration page. Here, you will find the following settings:

* **Host Address**: Your Owntracks server's host name or IP address.
* **Port**: The port on which your Owntracks server is listening for connections (e.g. 8883).
* **Use TLS/SSL**: Check this to use TLS encryption if your server supports it. Highly recommended. See [this page](https://owntracks.org/booklet/features/tls/#configure-tls-on-the-mosquitto-broker) on how to configure your broker to use TLS.
* **User Name**: Your Owntracks user name.
* **Password**: Your Owntracks password.
* **Device ID**: The device ID under which location updates from your watch are broadcast (e.g. "watch").
* **Tracker ID**: Two-character code (e.g. your initials) that will be displayed in the Owntracks app as a marker (see [this page](https://owntracks.org/booklet/features/tid) for more info).
* **Retain Messages**: Check this to retain your most recent location update on the server. Pins are always retained regardless of this checkbox.
* **Update Frequency**: Set the frequency of how often your location is sent to the server.
* **Apply**: Save settings and return to map screen.

### Using the Map
Once you press the connect button the watch's GPS will become active and your position will be displayed on the map (you may need to use the Cycle Markers button to see it). If the Owntracks server is configured correctly and reachable, markers and pins from retained messages and other users who are currently broadcasting will start appearing on the map. New incoming location updates will be displayed in real time.

The location sent by your watch's GPS will be shown as a black "shadow" marker. Your location as received by the Owntracks server will always be shown as a blue marker. The blue and black marker should always be at the same position; if they aren't, it's usually due to a connection problem (check the debug log for hints). Markers from other users will be displayed in other colours. The GPS' accuracy is shown as a circle around the marker's base. Press the marker on the touch screen to bring up additional information such as user name, time stamp, and the user's battery level.

### Compatibility with Android/iOS Apps
Given a working Owntracks broker, users of the [official Owntracks apps for Android and iOS](https://owntracks.org/booklet/guide/apps) should be able to see location updates from the watch (and vice versa) right away. If you are using both a phone and a watch under the same user name, make sure to set different device IDs for them and configure the server's access rights so other users can see them both.

### Battery Life
Keeping the GPS on and maintaining an open internet connection to the server will obviously affect your watch's battery life. In our experience it is possible to use the app for several hours on a full charge and still get through the day with normal usage. If you leave the app running in the background to send location updates without using the map a single charge should last a day. Lowering the update frequency in the settings menu may improve your results.

### Troubleshooting Connection Errors
The MQTT protocol is designed for environments with unstable connections (i.e. IoT scenarios). OwntracksOSM will always try to reconnect to the server if a connection is interrupted. If this fails, or you experience unreliable connections in general, here are a few things you can try:

* Make sure the Galaxy Wear app on your phone is allowed to run in the background and not affected by battery saving options.
* Manually disconnect and reconnect using the "connect/disconnect" menu button.
* Force the app open using the "screen on" menu button.
* Check the log for hints on why the app cannot connect.

### Unsupported Features
Only "location" type messages are currently supported by OwntracksOSM. Other message types such as [beacons](https://owntracks.org/booklet/features/beacons), [waypoints](https://owntracks.org/booklet/features/waypoints)
and [encrypted payloads](https://owntracks.org/booklet/features/encrypt) are not yet supported.
