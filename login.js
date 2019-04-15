let $ = require("jquery");
const http = require('http');
var request = require('request');
var fs = require('fs');
const Store = require('electron-store');
const remote = require('electron').remote;
const moment = require('moment');
let Swal = require('sweetalert2');
const store = new Store();
let httpcustomrequest = require('./loginBackend.js');

'use strict';
$(document).ready(main);

function main() {
    var scanbutton = document.getElementById('scanbutton');
    var enterotpbutton = document.getElementById('enterotpbutton');
    var scanningheader = document.getElementById('inputheader');
    var input_container = document.getElementById('input_container');
    var input_text_field = document.getElementById('otp_field');
    var keyboard = document.getElementById('keyboard');
    var capslock = document.getElementById('capslock');
    var letter_q = document.getElementById('q');
    var delete_button = document.getElementById('delete');
    var caps_label = document.getElementById('caps_label');
    var lshift = document.getElementById('left-shift-button');
    var rshift = document.getElementById('right-shift-button');
    var enter_button = document.getElementById('return');
    var keyboard_div = document.getElementsByClassName('layout');
    var letters = document.getElementsByClassName('letter');
    var key = document.getElementsByClassName('key');
    var legends = document.getElementsByClassName('fas');
    var cold_label = document.getElementById('cold_label');
    var hot_label = document.getElementById('hot_label');
    var Response_Success = store.get('Response_Success');
    var scanned = false;
    var scaninterval;
    var count = 0;
    var key_register = 0;
    var char_array = [];
    var otp_string = '';
    var current_value = '000000000';
    var present_value = '000000000';
    const io = require('socket.io-client');
    const socket = io('http://localhost:3000');


    socket.on('socket-event', function (msg) {
        if (msg.destination === 'JS') {
            switch (msg.content.type) {
                case "TEMP_READING":
                    cold_int = Math.round(parseFloat(msg.content.body.Cold));
                    hot_int = Math.round(parseFloat(msg.content.body.Hot));
                    cold_label.innerHTML = cold_int;
                    hot_label.innerHTML = hot_int;
                    break;
            }
        }
    });


    var key_pressed = {
        lshift: false,
        rshift: false,
        caps: false,
        press: function (params, letters) {
            switch (params) {
                case 'CAPS':
                    if (this.caps == true) {
                        console.log('Caps toggle off');
                        this.rshift = false;
                        this.lshift = false;
                        this.caps = false;
                        untoggleCaps(letters);
                    } else {
                        console.log('Caps toggle on');
                        this.rshift = false;
                        this.lshift = false;
                        this.caps = true;
                        untoggleShifts(letters);
                        toggleCaps(letters);
                    }
                    break;
                case 'LSHIFT':
                    this.rshift = false;
                    this.lshift = true;
                    this.caps = false;
                    untoggleCaps(letters);
                    toggleShifts('left', letters);
                    break;
                case 'RSHIFT':
                    this.rshift = true;
                    this.lshift = false;
                    this.caps = false;
                    untoggleCaps(letters);
                    toggleShifts('right', letters);
                    break;
                default:
                    break;
            }
        }
    }

    try {
        if (fs.existsSync('./machine_settings.json')) {

            if(Response_Success){
                let machine_settings = require('./machine_settings');
                store.set('Machine_Settings', machine_settings);
                if ((machine_settings.current_water_level / 22500 * 100) <= machine_settings.critical_level) {

                    Swal.fire({
                        type: 'error',
                        title: 'Oops...',
                        text: 'Water is at critical level. Please call maintenance for Refill.',
                        confirmButtonText: "I am an Admin",
                        allowOutsideClick: false,
                    }).then((result) => {
                        if (result.value) {
                            Swal.close();
                        }
                    });
                    if (machine_settings.notify_admin) {
                        sendNotification('Refill Notification', 'Machine ' + machine_settings.Model_Number + ' needs refill!', function (response) {
                            console.log(response);
                        }, function (error) {
                            console.error(error);
                        });
                    }
                }

                //Add Last Maintenance Data notification here
                var last_maintenance_moment = moment(machine_settings.last_maintenance_date);
                var today_moment = moment().format("YYYY-MM-DD");

                var after_6_months_moment = last_maintenance_moment.add(6, "months").format("YYYY-MM-DD");

                if (after_6_months_moment <= today_moment) {
                    Swal.fire({
                        type: 'error',
                        title: 'Oops...',
                        text: 'This machine needs maintainance. Please call maintenance personnel for assistance.',
                        confirmButtonText: "I am an Admin",
                        allowOutsideClick: false,
                    }).then((result) => {
                        if (result.value) {
                            Swal.close();
                        }
                    });
                    if (machine_settings.notify_admin) {
                        sendNotification('Maintenance Notification', 'Machine ' + machine_settings.Model_Number + ' needs cleaning!', function (response) { }, function (error) { });
                    }
                }
            }else{
                //do something here if machine is not in the db
            }
        } else {
            var secret_entered = false;

            swal_initialize(function (result) {
                if (result.value) {
                    swal_secret(function (result) {
                        if (result.dismiss == 'cancel') {
                            window.location.reload();
                        } else {
                            var params = {};
                            params.Secret_Key = result.value;

                            httpcustomrequest.http_post("New_Machine.php", params, function (response) {
                                if (response.Success) {
                                    var params = {};
                                    var machine_object = response.Machine;
                                    params.location = machine_object.Machine_Location;
                                    params.date_of_purchase = machine_object.Date_of_Purchase;
                                    params.last_maintenance_date = machine_object.Last_Maintenance_Date;
                                    params.Model_Number = machine_object.Model_Number;
                                    params.price_per_ml = machine_object.Price_Per_ML;
                                    params.current_water_level = machine_object.Current_Water_Level;
                                    params.api_key = machine_object.API_KEY;
                                    params.notify_admin = machine_object.Notify_Admin;
                                    params.critical_level = machine_object.Critical_Level;
                                    params.status = machine_object.STATUS;
                                    params.mu_id = machine_object.MU_ID;

                                    jsonWrite(params, function () {
                                        //restart whole program here
                                        remote.app.relaunch();
                                        remote.app.exit(0);
                                    });
                                }
                            }, function (error) {
                                Swal.fire({
                                    title: 'An error occured. Please try again later.',
                                    type: 'error',
                                    confirmButtonColor: '#3085d6',
                                    confirmButtonText: 'Ok',
                                    onClose: function () {
                                        window.location.assign('login.html');
                                    }
                                }).then((result) => {
                                    window.location.assign('login.html');
                                });
                            }, function () {
                                Swal.fire({
                                    title: 'Network Timeout. Please try again later.',
                                    type: 'error',
                                    confirmButtonColor: '#3085d6',
                                    confirmButtonText: 'Ok',
                                    onClose: function () {
                                        window.location.assign('login.html');
                                    }
                                }).then((result) => {
                                    window.location.assign('login.html');
                                });
                            });
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.log(error);
    }




    enter_button.onclick = function () {
        if (otp_string.length == 6) {
            //handle enter button here
            $('#enterotpbutton').removeClass().addClass("btn btn-success");
            $('#enterotpbutton').text("Login");
            $('#enterotpbutton').prop('disabled', false);
            $("input:text").prop('disabled', true);
            hideKeyboard();
        } else {
            Swal.fire({
                type: 'error',
                title: 'Oops...',
                text: 'OTP is too short!',
                confirmButtonText: "Try again",
                onClose: () => {
                    otp_string = '';
                    $("#otp_field").val('');
                    $('#enterotpbutton').text("Enter OTP");
                }
            })
            char_array = [];
            otp_string = '';
        }
    }

    input_text_field.oninput = function () {
        if (this.value.length % 10 == 0 && this.value.length > 10) {
            present_value = this.value;
            this.value = '';
            this.value = (present_value).slice(10);
            console.log(`Present Value: ${present_value}`);
            console.log(`Current Value: ${current_value}`);
            console.log(`TextBox Value: ${this.value}`);
            //http request here
        } else if (this.value.length == 10) {
            present_value = this.value;
            console.log(present_value);
            current_value = present_value;
            console.log(`Present Value: ${present_value}`);
            console.log(`Current Value: ${current_value}`);
            console.log(`TextBox Value: ${this.value}`);
            //http request here

        }


    }


    input_text_field.onkeypress = function (e) {
        if (e.keyCode == 13) {
            var params = {};
            params.RFID_ID = $("input:text").val();
            params.Login_Method = 'RFID';
            //put error handling for user. if there is an error in logging in, show swal then
            //try again to restart the logging process


            httpcustomrequest.http_post('Machine_Initialize.php', params, function (json_object) {
                // sessionstorage.setItem('User_Information',json_object);
                if (json_object.Success) {
                    store.set('Response_Object', json_object);
                    store.set('Account_Type', json_object.Account_Type);
                    store.set('User_Information', json_object.Account);
                    //check user persmissions first
                    store.set('Purchase_History', json_object.Purchase_History);
                    store.set('Transaction_History', json_object.Transaction_History);
                    store.set('Login_Method', 'RFID');
                    var user_info_object = store.get('User_Information');
                    console.log(user_info_object.Balance);
                    if (json_object.Account_Type == 'Recorded') {
                        if (user_info_object.Access_Level == 'USER') {
                            window.location.assign("HomePage.html");
                        } else if (user_info_object.Access_Level == 'ADMIN') {
                            window.location.assign("admin.html");
                        } else {

                        }
                    } else {
                        window.location.assign("HomePage.html");
                    }
                }else{
                    Swal.fire({
                        type: 'error',
                        title: 'Oops...',
                        text: 'User not found!',
                        confirmButtonText: "Try again",
                        onClose: () => {
                            otp_string = '';
                            $("#otp_field").val('');
                            $('#enterotpbutton').text("Enter OTP");
                        }
                    })
                }


            }, function (error) {
                console.log(`Error 1: ${error}`);
            });
        }
    }




    lshift.onclick = function () {
        key_pressed.press('LSHIFT', letters);
    }

    rshift.onclick = function () {
        key_pressed.press('RSHIFT', letters);
    }

    capslock.onclick = function () {
        key_pressed.press('CAPS', letters);
    }

    scanbutton.onclick = function () {
        input_text_field.value = '';
        scanning();
        input_text_field.style.visibility = 'visible';
        input_text_field.focus();
    };

    delete_button.onclick = function () {
        otp_string = '';
        if (char_array.length != 0) {
            char_array.pop();
        }
        char_array.forEach(element => {
            otp_string = otp_string + element;
        });
        $("#otp_field").val(otp_string);
    }


    input_text_field.onfocus = function () {

    };

    keyboard_div.onclick = function () {
        input_text_field.focus();
    };


    for (let index = 0; index < key.length; index++) {
        var element = key[index];

        key[index].onclick = function () {
            otp_string = '';
            if (char_array.length < 6) {
                char_array.push(this.innerHTML);
            } else {
                char_array = [];
                char_array.push(this.innerHTML);
                otp_string = '';
            }
            char_array.forEach(element => {
                otp_string = otp_string + element;
            });

            if (key_pressed.lshift == true || key_pressed.rshift == true) {
                untoggleShifts(letters);
            }
            console.log(otp_string);

            $("#otp_field").val('');
            $("#otp_field").val(otp_string);
        }
    }

    // input_text_field.onblur = function() {
    //   count =0;
    //   // $(".center").animate({'marginTop':'50%'});
    //   $('#enterotpbutton').removeClass().addClass("btn btn-success");
    //   $('#enterotpbutton').prop('disabled',false);
    //   $("input:text").prop('disabled', true);
    // }


    // $("#otp_field").on('input',function(e) {
    //   count++;
    //   if (count >=6) {
    //     $('#enterotpbutton').text("Login");
    //     $("input:text").prop('disabled', true);
    //     input_text_field.blur();
    //   }
    // })
    enterotpbutton.onclick = function () {
        var button_text = $('#enterotpbutton').text();
        switch (button_text) {
            case "Enter OTP":
                $('#enterotpbutton').removeClass().addClass("btn");
                $('#enterotpbutton').text("Cancel");
                $("input:text").prop('disabled', false);
                keyboard.style.visibility = "visible";
                $("#keyboard").animate({ 'opacity': '1' });
                break;
            case "Cancel":
                //handle cancellation of entry
                count = 0;
                $('#enterotpbutton').removeClass().addClass("btn btn-success");
                $('#enterotpbutton').text("Enter OTP");
                $('#enterotpbutton').prop('disabled', false);
                $("input:text").prop('disabled', true);
                $("input:text").val("");
                $("#keyboard").animate({ 'opacity': '0' });
                char_array = [];
                otp_string = '';
                keyboard.style.visibility = "hidden";
                break;
            case "Login":
                var params = {};
                params.OTP_Entered = $("input:text").val();
                params.Login_Method = 'OTP';
                //put error handling for user. if there is an error in logging in, show swal then
                //try again to restart the logging process


                httpcustomrequest.http_post('Machine_Initialize.php', params, function (json_object) {
                    // sessionstorage.setItem('User_Information',json_object);
                    if (json_object.Success) {
                        store.set('Response_Object', json_object);
                        store.set('Account_Type', json_object.Account_Type);
                        store.set('User_Information', json_object.Account);
                        params = {};
                        params.Acc_ID = json_object.Account.Acc_ID;
                        //check user persmissions first
                        store.set('Purchase_History', json_object.Purchase_History);
                        store.set('Transaction_History', json_object.Transaction_History);
                        store.set('Login_Method', 'OTP');
                        var user_info_object = store.get('User_Information');
                        console.log(json_object);


                        if (user_info_object.Access_Level == 'USER') {
                            window.location.assign("HomePage.html");
                        } else if (user_info_object.Access_Level == 'ADMIN') {
                            window.location.assign("admin.html");
                        } else {

                        }
                    } else {
                        Swal.fire({
                            type: 'error',
                            title: 'Oops...',
                            text: 'User not found!',
                            confirmButtonText: "Try again",
                            onClose: () => {
                                otp_string = '';
                                $("#otp_field").val('');
                                $('#enterotpbutton').text("Enter OTP");
                            }
                        })
                    }
                }, function (error) {
                    console.log(`Error 1: ${error}`);
                });

                break;
            default:
                console.log("An Error Occured");
                break;
        }
    }



}

function getScanInput() {
    //get scanned input here
    scanned = false;

    if (scanned) {
        clearInterval(scaninterval);
    }
}

function scanning() {
    counter = 0;
    var inputheader = document.getElementById('inputheader');
    var input_text_field = document.getElementById('otp_field');
    inputheader.style.visibility = 'visible';
    input_text_field.style.visibility = 'visible';
    $("input:text").prop('disabled', false);
    input_text_field.focus();
    var timer = setInterval(function () {
        input_text_field.focus();
        if (inputheader.innerHTML == 'Scanning....') {
            inputheader.innerHTML = 'Scanning.';
        } else {
            inputheader.innerHTML = inputheader.innerHTML + '.';
        }

        counter++;
        if (counter == 10) {
            input_text_field.style.visibility = 'hidden';
            input_text_field.blur();
            inputheader.style.visibility = 'hidden';
            clearInterval(timer);
        }
    }, 1000);
}




function toggleShifts(shift, letters) {
    var lshift_label = document.getElementById('left-shift');
    var rshift_label = document.getElementById('right-shift');
    var lshift = document.getElementById('left-shift-button');
    var rshift = document.getElementById('right-shift-button');
    if (shift == 'left') {
        style = window.getComputedStyle(lshift);
        var background = style.getPropertyValue('background-color');
        if (background == "rgb(30, 179, 190)") {
            lshift_label.style.color = '#030303';
            lshift.style.backgroundColor = "#f3f3f3";
            rshift_label.style.color = '#f3f3f3';
            rshift.style.backgroundColor = "#1EB3BE";
            for (let index = 0; index < letters.length; index++) {
                console.log('Test');
                var element = letters[index];
                element.innerHTML = element.innerHTML.toUpperCase();
            }
        } else {
            lshift_label.style.color = '#f3f3f3';
            lshift.style.backgroundColor = "#1EB3BE";
            for (let index = 0; index < letters.length; index++) {
                var element = letters[index];
                element.innerHTML = element.innerHTML.toLowerCase();
            }
        }
    } else {
        style = window.getComputedStyle(rshift);
        var background = style.getPropertyValue('background-color');
        if (background == "rgb(30, 179, 190)") {
            rshift_label.style.color = '#030303';
            rshift.style.backgroundColor = "#f3f3f3";
            lshift_label.style.color = '#f3f3f3';
            lshift.style.backgroundColor = "#1EB3BE";
            for (let index = 0; index < letters.length; index++) {
                var element = letters[index];
                element.innerHTML = element.innerHTML.toUpperCase();
            }
        } else {
            rshift_label.style.color = '#f3f3f3';
            rshift.style.backgroundColor = "#1EB3BE";
            for (let index = 0; index < letters.length; index++) {
                var element = letters[index];
                element.innerHTML = element.innerHTML.toLowerCase();
            }
        }
    }
}

function untoggleShifts(letters = null) {
    var lshift_label = document.getElementById('left-shift');
    var rshift_label = document.getElementById('right-shift');
    var lshift = document.getElementById('left-shift-button');
    var rshift = document.getElementById('right-shift-button');
    lshift_label.style.color = '#f3f3f3';
    lshift.style.backgroundColor = "#1EB3BE";
    rshift_label.style.color = '#f3f3f3';
    rshift.style.backgroundColor = "#1EB3BE";
    if (letters != null) {
        for (let index = 0; index < letters.length; index++) {
            var element = letters[index];
            element.innerHTML = element.innerHTML.toLowerCase();
        }
    }
}



function toggleCaps(letters) {
    var caps_label = document.getElementById('caps_label');
    var capslock = document.getElementById('capslock');
    caps_label.style.color = '#030303';
    capslock.style.backgroundColor = "#f3f3f3";
    for (let index = 0; index < letters.length; index++) {
        var element = letters[index];
        element.innerHTML = element.innerHTML.toUpperCase();
    }
}
function untoggleCaps(letters) {
    var caps_label = document.getElementById('caps_label');
    var capslock = document.getElementById('capslock');
    caps_label.style.color = '#f3f3f3';
    capslock.style.backgroundColor = "#1EB3BE";
    for (let index = 0; index < letters.length; index++) {
        var element = letters[index];
        element.innerHTML = element.innerHTML.toLowerCase();
    }
}

function hideKeyboard() {
    var keyboard = document.getElementById('keyboard');
    $("#keyboard").animate({ 'opacity': '0' });
    keyboard.style.visibility = "hidden";
}

function showKeyboard() {
    var keyboard = document.getElementById('keyboard');
    keyboard.style.visibility = "visible";
    $("#keyboard").animate({ 'opacity': '1' });
}

function sendNotification(title, body, fn_response, fn_error) {
    var params = {};
    params.title = title;
    params.body = body;
    httpcustomrequest.http_post('Notify.php', params, function (response) {
        fn_response(response);
    }, function (error) {
        fn_error(error);
    });
}


function jsonWrite(file, callback) {
    // Use this path for windows.
    // var file_path = 'C:/xampp/htdocs/ReQuench_Machine/machine_settings.json';

    //Use this path for RasPi
    // var file_path = '/home/pi/Documents/ReQuench_Machine/machine_settings.json';
    fs.writeFile('./machine_settings.json', JSON.stringify(file, null, 6), function (err) {
        if (err) {
            callback(false);
        } else {
            callback(true);
        }
    });
}

async function swal_secret(callback) {
    let promise = Swal.fire({
        title: 'Please enter secret code',
        input: 'text',
        inputAttributes: {
            autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Submit',
        showLoaderOnConfirm: true,
        allowOutsideClick: false,
    });

    let result = await promise;
    callback(result);
}

async function swal_initialize(callback) {
    let promise = new Promise((resolve, reject) => {
        Swal.fire({
            type: 'error',
            title: 'Oops...',
            text: 'This machine needs initialization. Please call maintenance personnel for assistance.',
            confirmButtonText: "I am an Admin",
            allowOutsideClick: false,
        }).then((result) => {
            resolve(result);
        })
            .catch((err) => {
                reject(err)
            });
    });
    let result = await promise;
    callback(result);
}
