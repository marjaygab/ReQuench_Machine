let $ = require("jquery");
const file = require('./maintenance_data');
$(document).ready(function() {
    var power_button = document.getElementById('power_button');
    var reboot_button = document.getElementById('reboot_button');
    var settings_button = document.getElementById('settings_button');
    var maintenance_button = document.getElementById('maintenance_button');

    //get initial file settings in here

    if (file.from_maintenance) {
        window.location.assign('Maintenance.html');
    }

    power_button.onclick = function() {
        
    }
    reboot_button.onclick = function() {
        
    }
    settings_button.onclick = function() {
        window.location.assign('Settings.html');   
    }
    maintenance_button.onclick = function() {
        window.location.assign('Maintenance.html');
    }

});