let $ = require("jquery");
let fs = require('fs');
let settings = require('./machine_settings');
const file = require('./maintenance_data');
let Swal = require('sweetalert2');
$(document).ready(function() {
    let Swal = require('sweetalert2');
    var power_button = document.getElementById('power_button');
    var reboot_button = document.getElementById('reboot_button');
    var settings_button = document.getElementById('settings_button');
    var maintenance_button = document.getElementById('maintenance_button');
    var refill_button = document.getElementById('refill_button');
    var requench_button = document.getElementById('requench_button');
    var mode_toggle = document.getElementById('mode_toggle');
    var logout_button = document.getElementById('logout_button');

    const io = require('socket.io-client');
    var socket = io('http://localhost:3000');
    //get initial file settings in here

    if (file.from_maintenance) {
        window.location.assign('Maintenance.html');
    }

    power_button.onclick = function() {
        settings.status = "offline";
        jsonWrite(settings,()=>{
            jsonRead(function(data) {
                if (data != false) {
                    settings = data;
                } 
            });
        });
        
    }
    reboot_button.onclick = function() {
        settings.status = "rebooting";
        jsonWrite(settings,()=>{
            jsonRead(function(data) {
                if (data != false) {
                    settings = data;
                } 
             });
        });
        
    }
    settings_button.onclick = function() {
        window.location.assign('Settings.html');   
    }
    maintenance_button.onclick = function() {
        window.location.assign('Maintenance.html');
    }

    refill_button.onclick = function() {
        Swal.fire({
            type: "info",
            text: "You may start refilling now",
            allowOutsideClicks: false,
            showConfirmButton: false,
            onOpen:()=>{
                    var refill_timeout = setTimeout(()=>{
                        Swal.fire({
                            type: "question",
                            title: "Are you done?",
                            allowOutsideClicks: false,
                            showConfirmButton: true,
                            showCancelButton: false
                        }).then(()=>{
                            settings.current_water_level = 20000;
                            jsonWrite(settings,()=>{
                                jsonRead(function(data) {
                                    if (data != false) {
                                        settings = data;
                                    } 
                                 });
                            });
                            Swal.close();
                        });
                    },5000);
            }
        });
    }   

    requench_button.onclick = function() {
        window.location.assign('HomePage.html');
    }

    logout_button.onclick = function() {
        window.location.assign('login.js');
    }

    mode_toggle.onclick = function() {
        window.location.assign('HomePage.html');
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

    function jsonRead(callback) {
        // Use this path for windows.
        // var file_path = 'C:/xampp/htdocs/ReQuench_Machine/machine_settings.json';
    
        var file_path = '/home/pi/Documents/ReQuench_Machine/machine_settings.json';
        fs.readFile(file_path, (err, data) => {
            try {
                if (err) throw err;
                var parsed = JSON.parse(data);
                callback(parsed);
            } catch (e) {
                callback(false);
            }
        });
    }
});