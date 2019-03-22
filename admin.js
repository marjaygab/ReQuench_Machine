let $ = require("jquery");
let fs = require('fs');
let settings = require('./machine_settings');
const file = require('./maintenance_data');
let Swal = require('sweetalert2');
$(document).ready(function() {
    var power_button = document.getElementById('power_button');
    var reboot_button = document.getElementById('reboot_button');
    var settings_button = document.getElementById('settings_button');
    var maintenance_button = document.getElementById('maintenance_button');
    const io = require('socket.io-client');
    var socket = io('http://localhost:3000');
    //get initial file settings in here

    if (file.from_maintenance) {
        window.location.assign('Maintenance.html');
    }

    power_button.onclick = function() {
        settings.status = "offline";
        jsonWrite(settings,()=>{});
    }
    reboot_button.onclick = function() {
        settings.status = "rebooting";
        jsonWrite(settings,()=>{});
    }
    settings_button.onclick = function() {
        window.location.assign('Settings.html');   
    }
    maintenance_button.onclick = function() {
        window.location.assign('Maintenance.html');
    }

    function commandPy(socket, content) {
        var msg = {
            destination: 'Python',
            content: content
        };
        socket.emit('socket-event', msg);
    }
    function jsonWrite(file,callback) {
        // Use this path for windows.
        // var file_path = 'C:/xampp/htdocs/ReQuench_Machine/machine_settings.json';
        //Use this path for RasPi
        var file_path = '/home/pi/Documents/ReQuench_Machine/machine_settings.json';
        fs.writeFile(file_path, JSON.stringify(file, null, 6), function (err) {
            if (err) return console.log(err);
            callback();
        });
    }
});