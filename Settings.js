let $ = require('jquery');
let fs = require('fs');
let moment = require('moment');
let httpcustomrequest = require('./loginBackend.js');
const machine_settings = require('./machine_settings');
const path = require('path');
let Swal = require('sweetalert2');

$(document).ready(function () {
    var notification_toggler = document.getElementById('notification_toggler');
    var machine_location = document.getElementById('machine_location');
    var model_number = document.getElementById('model_number');
    var date_of_purchase = document.getElementById('date_of_purchase');
    var last_maintenance_date = document.getElementById('last_maintenance_date');
    var price_per_ml = document.getElementById('price_per_ml');
    var access_token = document.getElementById('access_token');
    var renew_access_token = document.getElementById('renew_access_token');
    var save_button = document.getElementById('save_button');
    var defaults_button = document.getElementById('defaults_button');
    var critical_level = document.getElementById('critical_level');
    var reveal_link = document.getElementById('reveal_link');
    var renew_access_token = document.getElementById('renew_access_token');
    var override_link = document.getElementById('override_link');
    var current_api_key = machine_settings.api_key;
    var notification_toggler_state = machine_settings.notify_admin;
    var current_secret;
    //set notification toggler here to machine_settings.notify_admin value
    if (notification_toggler_state) {
        $('#notification_toggler').bootstrapToggle('on');
    } else {
        $('#notification_toggler').bootstrapToggle('off');
    }

    machine_location.value = machine_settings.location;
    model_number.value = machine_settings.Model_Number;
    date_of_purchase.value = moment(machine_settings.date_of_purchase).format("YYYY-MM-DD");
    last_maintenance_date.value = moment(machine_settings.last_maintenance_date).format("YYYY-MM-DD");
    price_per_ml.value = machine_settings.price_per_ml;
    critical_level.value = machine_settings.critical_level;




    reveal_link.onclick = function () {
        if (this.innerHTML == 'Reveal') {
            this.innerHTML = 'Hide'
            access_token.value = current_api_key;
        } else {
            this.innerHTML = 'Reveal'
            access_token.value = 'Hidden';
        }
    }

    override_link.onclick = function () {
        if (this.innerHTML == 'Override') {
            this.innerHTML = 'Save';
            price_per_ml.disabled = false;
        } else {
            this.innerHTML = 'Override';
            machine_settings.price_per_ml = this.value;
            price_per_ml.disabled = true;
        }
    }


    renew_access_token.onclick = function () {
        Swal.fire({
            title: "Renew Token",
            allowOutsideClick: false,
            showCancelButton: false,
            showConfirmButton: false,
            html: `
            <div class="container">
              <div class="row form-account">
                <div class="col-sm-8">
                    <p>Enter the Secret provided by the official website</p>
                    <input id = "secret_field" type="text" class="form-control" placeholder = "Enter Secret">
                    <div id="feedback" class="invalid-feedback">
                        Secret is invalid.
                    </div>
                </div>
              </div>
              <div class="row form-account">
                <div class="col-6">
                  <button id = "submit" class="btn btn-outline-info">Submit</button>
                </div>
                <div class="col-6">
                  <button id = "cancel" class="btn btn-outline-danger">Cancel</button>
                </div>
              </div>
            </div>
      `,
            onBeforeOpen: () => {
                const content = Swal.getContent();
                const $ = content.querySelector.bind(content);
                const secret_field = $('#secret_field');
                const submit = $('#submit');
                const cancel = $('#cancel');
                const feedback = $('#feedback');

                feedback.style.display = 'unset';
                feedback.innerHTML = 'Please enter a Secret Key';

                secret_field.oninput = function () {
                    if (this.value.length == 8) {
                        //we can check secret here
                        var params = {};
                        params.Model_Number = machine_settings.Model_Number;
                        params.Secret_Key = this.value;
                        httpcustomrequest.http_post('Check_Secret.php', params, function (response) {
                            if (response.Success) {
                                feedback.classList.remove("invalid-feedback");
                                feedback.classList.add("valid-feedback");
                                feedback.innerHTML = 'Secret matched!';
                                submit.disabled = false;
                            } else {
                                feedback.classList.remove("valid-feedback");
                                feedback.classList.add("invalid-feedback");
                                feedback.innerHTML = 'Secret mismatched!';
                                submit.disabled = true;
                            }
                        }, function (error) {
                            console.log('Error: ' + error);
                        })
                    } else {
                        feedback.classList.remove("valid-feedback");
                        feedback.classList.add("invalid-feedback");
                        feedback.innerHTML = 'Please enter a valid key.'
                        submit.disabled = true;
                    }
                }

                submit.onclick = function () {
                    current_secret = secret_field.value;
                    Swal.fire({
                        title: 'Renewing access token..',
                        allowOutsideClick: false,
                        onClose: function () {
                        }, onBeforeOpen: function () {
                            Swal.showLoading();
                            var params = {};
                            params.Secret_Key = current_secret;
                            httpcustomrequest.http_post('Renew_API_Key.php', params, function (response) {
                                if (response.Success) {
                                    current_api_key = response.API_KEY;
                                    machine_settings.api_key = current_api_key;
                                    if (reveal_link.innerHTML == 'Hide') {
                                        access_token.value = current_api_key;
                                    }else{
                                        access_token.value = 'Hidden';
                                    }
                                    jsonWrite(machine_settings);
                                    this.disabled = true;
                                    Swal.close();
                                } else {
                                    //error handling here
                                }
                            }, function (error) {
                                //error handling here
                            });
                        }
                    });
                }

                cancel.onclick = function () {
                    Swal.close();
                }
            }
        });
    }


    save_button.onclick = function () {
        Swal.fire({
            title: 'Save changes?',
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Save'
        }).then((result) => {
            if (result.value) {
                //get notification status
                if (notification_toggler_state == 'On') {
                    machine_settings.notify_admin = true
                } else {
                    machine_settings.notify_admin = false;
                }
                machine_settings.location = machine_location.value;
                machine_settings.Model_Number = model_number.value;
                machine_settings.date_of_purchase = moment(date_of_purchase.value).format('YYYY-MM-DD');
                machine_settings.last_maintenance_date = moment(last_maintenance_date.value).format('YYYY-MM-DD');
                machine_settings.price_per_ml = price_per_ml.value;
                machine_settings.critical_level = critical_level.value;
                //get current api key here to save
                jsonWrite(machine_settings);
                window.location.assign('admin.html');
            }
        })
    }

    $('#notification_toggler').change(function () {
        if ($(this).prop('checked') == false) {
            notification_toggler_state = 'Off';
        } else {
            notification_toggler_state = 'On';
        }
    });

    function jsonWrite(file) {
        // Use this path for windows.
        var file_path = 'C:/xampp/htdocs/ReQuench_Machine/machine_settings.json';

        //Use this path for RasPi
        // var file_path = '/home/pi/Documents/ReQuench_Machine/machine_operations.json';
        fs.writeFile(file_path, JSON.stringify(file, null, 6), function (err) {
            if (err) return console.log(err);
        });
    }
});


