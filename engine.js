let $ = require("jquery");
let { PythonShell } = require('python-shell');
let fs = require('fs');
let moment = require('moment');
let path = require('path');
let file = require('./operations');
let httpcustomrequest = require('./loginBackend.js');
let os = require('os');
const Store = require('electron-store');
const store = new Store();
const io = require('socket.io-client');
let current_ml_dispensed = 0;
let operation_json = {
    "Operation_Variables": {
        "Manual": 0,
        "Automatic": 0,
        "Requested_Amount": 0
    },
    "Command_Variable": {
        "Dispense_Hot": 0,
        "Dispense_Cold": 0
    }
};

$(document).ready(main);

function main() {
    //update user data every reloading of the page
    let Swal = require('sweetalert2');
    var branding_image = document.getElementById('branding_image');
    var ml_label = document.getElementById('ml_label');
    var logout_button = document.getElementById('logout_button');
    var cold_label = document.getElementById('cold_label');
    var hot_label = document.getElementById('hot_label');
    var mode_toggle = document.getElementById('mode_toggle');
    var user_information = store.get('User_Information');
    var history = store.get('History');
    var purchase_history = store.get('Purchase_History');
    var transaction_history = store.get('Transaction_History');
    var account_type = store.get('Account_Type');
    var response_object = store.get('Response_Object');
    var machine_settings = store.get('Machine_Settings');
    const socket = io('http://localhost:3000');
    // in seconds
    const idle_timeout = 3600;
    const idle_interval = 1000;
    const temperature_interval = 2000;
    const cold_probe_path = '/sys/bus/w1/devices/28-0417824753ff/w1_slave';
    const hot_probe_path = '/sys/bus/w1/devices/28-0316856147ff/w1_slave';
    var toggle_state = true;
    var temp_array_transaction = [];
    var temp_array_purchase = [];
    var full_size = 0;
    var current_size = 0;
    var size_percentage = 0;
    var computed_height = 0;
    var previous_size = 0;
    var idle_time = 0;
    var water_level_before = 0;
    var water_level_after = 0;
    var temp_water_level = 0;
    var py_ready = false;
    var js_ready = false;
    var py_object;
    var filename = 'main.py';
    var transactions_list = [];
    var container_present = false;
    var remaining_balance = store.get('User_Information').Balance;
    var current_operation = {
        operation: 'STANDBY',
        get: function () {
            return this.operation;
        },
        set: function (params) {
            switch (params) {
                case 'HOT':
                    this.operation = 'HOT'
                    break;
                case 'COLD':
                    this.operation = 'COLD'
                    break;
                case 'STANDBY':
                    this.operation = 'STANDBY'
                    break;
                default:
                    break;
            }
        }
    };

    var options = {
        scriptPath: path.join(__dirname, '/python_scripts')
    }

    if (remaining_balance <= 0) {
        $(".main-controls").prop('disabled',true);
    }


    if (user_information.Access_Level == 'ADMIN') {
        mode_toggle.disabled = false;
        mode_toggle.onclick = function() {
            Swal.fire({
                title: 'Are you done?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Log me out'
            }).then((result) => {
                if (result.value) {
                    //Send Transaction Here
                    var params = {};
                    params.API_KEY = machine_settings.api_key;
                    params.Account_Type = account_type;
    
                    if (account_type == 'Recorded') {
                        params.Acc_ID = store.get('User_Information').Acc_ID;
                    } else {
                        params.UU_ID = store.get('User_Information').UU_ID;
                    }
                    params.Transaction = temp_array_transaction;
    
                    if (temp_array_transaction.length != 0) {
                        Swal.fire({
                            title: 'Please wait..',
                            allowOutsideClick: false,
                            onBeforeOpen: () => {
                                Swal.showLoading();
                            },
                            onOpen: () => {
                                httpcustomrequest.http_post('Save_Transaction.php', params, function (response) {
                                    if (response.Success) {
                                        store.delete('User_Information');
                                        store.delete('Purchase_History');
                                        store.delete('Transaction_History');
                                        console.log('Terminated, hopefully');
                                        Swal.close();
                                        window.location.assign('admin.html');
                                    } else {
                                        //handle error here   
                                    }
                                }, function (error) {
                                    //handle error here 
                                });
                            },
                            onClose: () => {
                            }
                        }).then((result) => {
                        });
                    } else {
                        commandPy(socket, { command: 'End_Transaction' });
                        //commandPy(socket, { command: 'Terminate' });
                        store.delete('User_Information');
                        store.delete('Purchase_History');
                        store.delete('Transaction_History');
                        console.log('Terminated, hopefully');
                        Swal.close();
                        window.location.assign('admin.html');
                    }
                }
            });
        }
        
    }else{
        mode_toggle.disabled = true;
    }

    
    


    //This function couns every second if a user is idle.
    var idle_prompt = setInterval(function () {
        idle_time = idle_time + 1;
        if (idle_time == idle_timeout) {
            let timerInterval
            Swal.fire({
                title: 'Auto close alert!',
                html: '<button id="present" class="btn btn-info">' +
                    "I'm still here!" +
                    '</button><br/>',
                timer: 2000,
                showConfirmButton: true,
                confirmButtonText: "I'm still here!",
                onBeforeOpen: () => {
                    Swal.showLoading()
                    timerInterval = setInterval(() => {
                        Swal.getContent().querySelector('strong')
                            .textContent = Swal.getTimerLeft()
                    }, 100)
                },
                onClose: () => {
                    clearInterval(timerInterval);
                    idle_time = 0;
                }
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.timer) {
                    //handle exits here
                    store.delete('User_Information');
                    store.delete('Purchase_History');
                    store.delete('Transaction_History');
                    commandPy(socket, { command: 'End_Transaction' });
                    //commandPy(socket, { command: 'Terminate' });
                    console.log('Terminated, hopefully');
                    window.location.assign('login.html');
                }
            })
        }
    }, idle_interval);

    //Listens for Mouse Movement. If mouse moves, idle time = 0
    window.onmousemove = function (e) {
        idle_time = 0;
    }


    //Listens for Logout button Click
    logout_button.onclick = function () {
        Swal.fire({
            title: 'Are you done?',
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Log me out'
        }).then((result) => {
            if (result.value) {
                //Send Transaction Here
                var params = {};
                params.API_KEY = machine_settings.api_key;
                params.Account_Type = account_type;

                if (account_type == 'Recorded') {
                    params.Acc_ID = store.get('User_Information').Acc_ID;
                } else {
                    params.UU_ID = store.get('User_Information').UU_ID;
                }
                params.Transaction = temp_array_transaction;

                if (temp_array_transaction.length != 0) {
                    Swal.fire({
                        title: 'Please wait..',
                        allowOutsideClick: false,
                        onBeforeOpen: () => {
                            Swal.showLoading();
                        },
                        onOpen: () => {
                            httpcustomrequest.http_post('Save_Transaction.php', params, function (response) {
                                if (response.Success) {
                                    store.delete('User_Information');
                                    store.delete('Purchase_History');
                                    store.delete('Transaction_History');
                                    console.log('Terminated, hopefully');
                                    Swal.close();
                                    window.location.assign('login.html');
                                } else {
                                    //handle error here   
                                }
                            }, function (error) {
                                //handle error here 
                            });
                        },
                        onClose: () => {
                        }
                    }).then((result) => {
                    });
                } else {
                    commandPy(socket, { command: 'End_Transaction' });
                    //commandPy(socket, { command: 'Terminate' });
                    store.delete('User_Information');
                    store.delete('Purchase_History');
                    store.delete('Transaction_History');
                    console.log('Terminated, hopefully');
                    Swal.close();
                    window.location.assign('login.html');
                }
            }
        });
    }

    //This block of code listens for socket-event then computes for the remaining balance
    //This block of code also computes for the current height of the water level indicator.
    socket.on('socket-event', function (msg) {
        if (msg.destination === 'JS') {
            switch (msg.content.type) {
                case "TEMP_READING":
                    cold_int = Math.round(parseFloat(msg.content.body.Cold));
                    hot_int = Math.round(parseFloat(msg.content.body.Hot));
                    cold_label.innerHTML = cold_int;
                    hot_label.innerHTML = hot_int;
                    break;
                case "DISPENSE_READING":
                    // console.log(msg);
                    console.log(current_operation.get());

                    try {
                        if (current_size > 0) {
                            //Get volume reading from python
                            var total = msg.content.body.Total;

                            //Subtract total reading from water level
                            temp_water_level = machine_settings.current_water_level - total;



                            //Get current size for GUI presentation
                            current_size = previous_size - total;
    
                            if(toggle_state == 'Manual'){
                                if (current_size < 0) {
                                current_size = 0;            
                                commandPy(socket, { command: 'Stop_Dispense' });
                                disableAll();
                                }else{
                                    current_size = Math.round(current_size);
                                }
                            }else{
                                if (current_size < 0) {
                                    current_size = 0;            
                                }else{
                                    current_size = Math.round(current_size);
                                }
                            }

                            

                            size_percentage = (current_size / full_size);
                            computed_height = size_percentage * 250;
                            $("#water-level").animate({ height: computed_height + 'px' });

                            //Show current mL label
                            ml_label.innerHTML = `${current_size} mL`;

                            if (getPercentage(temp_water_level, 22500) <= machine_settings.critical_level) {
                                commandPy(socket, { command: 'Stop_Dispense' });
                                Swal.fire({
                                    type: 'error',
                                    title: 'Oops...',
                                    text: 'Water is at critical level. Ending transaction.',
                                    confirmButtonText: "Ok",
                                    allowOutsideClick: false,
                                    onBeforeOpen: () => {
                                        
                                    },
                                }).then((result) => {
                                    if (result.value) {
                                        //send last transaction here
                                        var params = {};
                                        params.API_KEY = machine_settings.api_key;
                                        params.Account_Type = account_type;

                                        if (account_type == 'Recorded') {
                                            params.Acc_ID = store.get('User_Information').Acc_ID;
                                        } else {
                                            params.UU_ID = store.get('User_Information').UU_ID;
                                        }
                                        params.Transaction = temp_array_transaction;

                                        if (temp_array_transaction.length != 0) {
                                            Swal.fire({
                                                title: 'Please wait..',
                                                allowOutsideClick: false,
                                                onBeforeOpen: () => {
                                                    Swal.showLoading();
                                                },
                                                onOpen: () => {
                                                    httpcustomrequest.http_post('Save_Transaction.php', params, function (response) {
                                                        if (response.Success) {
                                                            store.delete('User_Information');
                                                            store.delete('Purchase_History');
                                                            store.delete('Transaction_History');
                                                            console.log('Terminated, hopefully');
                                                            Swal.close();
                                                            window.location.assign('login.html');
                                                        } else {
                                                            //handle error here   
                                                        }
                                                    }, function (error) {
                                                        //handle error here 
                                                    });
                                                },
                                                onClose: () => {
                                                }
                                            }).then((result) => {
                                            });
                                        } else {
                                            store.delete('User_Information');
                                            store.delete('Purchase_History');
                                            store.delete('Transaction_History');
                                            console.log('Terminated, hopefully');
                                            Swal.close();
                                            window.location.assign('login.html');
                                        }
                                        Swal.close();
                                        window.location.assign('login.html');
                                    }
                                });
                            }
                        } else {
                            //let python know that there is nothing left
                            // commandPy(socket, { command: 'Stop_Dispense' });
                            current_size = 0;
                            $("#water-level").animate({ height: 0 + 'px' });
                            //Show current mL label
                            ml_label.innerHTML = `0 mL`;
                            $(".main-controls").prop('disabled',true);
                            //show alert here
                        }
                    } catch (error) {
                        throw error;
                    }
                    break;
                case "DISPENSE_CONTROL":
                    if (msg.content.body === 'Stopped_Dispense') {
                        enableAll();
                        var amount_dispensed = previous_size - current_size;
                        var price_computed = amount_dispensed * machine_settings.price_per_ml;
                        price_computed = round(price_computed, 2);
                        remaining_balance = current_size;

                        commandPy(socket, { command: 'Set_Remaining_Balance', amount: remaining_balance });


                        water_level_before = machine_settings.current_water_level;
                        water_level_after = temp_water_level;
                        machine_settings.current_water_level = temp_water_level;
                        var params = {};

                        if (current_operation.get() != 'STANDBY') {
                            var date_now = moment().format('YYYY-MM-DD');
                            var time_now = moment().format('HH:mm:ss');
                            params.Time = time_now;
                            params.Date = date_now;
                            params.Temperature = current_operation.get();
                            params.Amount = amount_dispensed;
                            params.Price_Computed = price_computed;
                            params.Water_Level_Before = water_level_before;
                            params.Water_Level_After = water_level_after;
                            params.Remaining_Balance = remaining_balance;
                        }
                        temp_array_transaction.push(params);

                        jsonWrite(machine_settings,response => {
                            if (response) {
                                jsonRead(data => {
                                    if (data != false) {
                                        machine_settings = data;
                                    }
                                });        
                            }
                        });

                        

                        // jsonRead(function (data) {
                        //     if (data != false) {
                        //         jsonWrite(data);
                        //     }
                        // });
                        
                        if(current_size == 0){
                        
                            disableAll();
                        
                        }
                        
                        
                        previous_size = current_size;
                        current_operation.set('STANDBY');
                    }
                    break;
                case "CONTAINER_STATUS":
                    if (msg.content.body == 'Container Present') {
                        container_present = true;
                    } else if (msg.content.body == 'Container Absent') {
                        container_present = false;
                    }
                    break;
                default:
                    break;
            }
            // if (msg.content != 'Stopped Dispense') {
            //     console.log(msg);

            // } else {

            // }
        }
    });

    // This block of code is where the loading occurs.
    //This loads the user profile as well as computes ng height for UI interaction
    Swal.fire({
        title: 'Please wait..',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
            console.log('Before Opened');
        },
        onOpen: () => {
            console.log('Opened');
            if ((machine_settings.current_water_level / 22500 * 100) <= machine_settings.critical_level) {
                Swal.fire({
                    type: 'error',
                    title: 'Oops...',
                    timer: 2000,
                    text: 'Water is at critical level. Closing transaction..',
                    confirmButtonText: "Ok",
                    allowOutsideClick: false,
                    onBeforeOpen: () => {
                        Swal.showLoading();
                    }
                }).then((result) => {
                    if (result.dismiss === Swal.DismissReason.timer) {
                        Swal.close();
                        window.location.assign('login.html');
                    }
                });
            } else {
                var params = {};
                params.Account_Type = account_type;
                
                if(params.Account_Type == 'Recorded'){
                    params.Acc_ID = store.get('User_Information').Acc_ID;
                }else{
                    params.UU_ID = store.get('User_Information').UU_ID;    
                }
                
                console.log(params);
                
                
                httpcustomrequest.http_post('Machine_Init.php', params, function (json_object) {
                    if (json_object != false) {
                        store.set('Purchase_History', json_object.Purchase_History);
                        store.set('Transaction_History', json_object.Transaction_History);
                        var purchase_history = store.get('Purchase_History');
                        var transaction_history = store.get('Transaction_History');
                        console.log(purchase_history);
                        console.log(transaction_history);
                        
                        //function used to sort DATE TIME
                        var compare_function = function (a, b) {
                            if (Date.parse(a.Date) > Date.parse(b.Date)) {
                                if (a.Time > b.Time) {
                                    return -1;
                                } else {
                                    return 1;
                                }
                            } else {
                                if (a.Time > b.Time) {
                                    return -1;
                                } else {
                                    return 1;
                                }
                            }
                        }

                        if (transaction_history != null) {
                            for (var i = 0; i < transaction_history.length; i++) {
                                temp_array_transaction.push(transaction_history[i]);
                            }
                        }
                        if (purchase_history != null) {
                            for (var i = 0; i < purchase_history.length; i++) {
                                temp_array_purchase.push(purchase_history[i]);
                            }
                        }


                        if (transaction_history == null && purchase_history == null) {
                            full_size = 0;
                            current_size = 0;
                        } else if (transaction_history == null && purchase_history != null) {
                            full_size = parseInt(user_information.Balance);
                            current_size = full_size;
                            console.log('I am here!');
                        } else if (transaction_history != null && purchase_history == null) {
                            full_size = parseInt(transaction_history.Remaining_Balance);
                            current_size = full_size;
                        } else {
                            if (Date.parse(transaction_history.Date) > Date.parse(purchase_history.Date)) {
                                full_size = parseInt(transaction_history.Amount) + parseInt(transaction_history.Remaining_Balance);
                                current_size = parseInt(transaction_history.Remaining_Balance);
                            } else if (Date.parse(transaction_history.Date) < Date.parse(purchase_history.Date)) {
                                full_size = parseInt(user_information.Balance);
                                current_size = full_size;
                            } else {
                                if (transaction_history.Time > purchase_history.Time) {
                                    full_size = parseInt(transaction_history.Amount) + parseInt(transaction_history.Remaining_Balance);
                                    current_size = parseInt(transaction_history.Remaining_Balance);
                                } else if (transaction_history.Time < purchase_history.Time) {

                                    full_size = parseInt(user_information.Balance);
                                    current_size = full_size;
                                }
                            }
                        }
                        //Logic for finding the Full and Current Size for representation
                        previous_size = current_size;
                        size_percentage = (current_size / full_size);
                        computed_height = size_percentage * 250;
                        $("#water-level").animate({ height: computed_height + 'px' });
                        
                        console.log('Current: ' + current_size);
                        console.log('Previous: ' + previous_size);
                        console.log('Full: ' + full_size);
                        ml_label.innerHTML = `${user_information.Balance} mL`;
                        js_ready = true;
                        commandPy(socket, { command: 'Set_Remaining_Balance', amount: current_size });

                        var container_promise = new Promise(function (resolve, reject) {
                            commandPy(socket, { command: 'New_Transaction' });
                            commandPy(socket, { command: 'Get_Baseline' });
                            
                            setTimeout(function() {
                                commandPy(socket, { command: 'Get_Container' });
                                Swal.fire({
                                    title: 'Waiting for container..',
                                    allowOutsideClick: false,
                                    onClose: function () {
                                    }, onBeforeOpen: function () {
                                        Swal.showLoading();
                                        var timeout = 5;
                                        var counter = 0;
                                        var timer = setInterval(() => {
                                            commandPy(socket, { command: 'Get_Container' });
                                            if (counter == timeout) {
                                                clearInterval(timer);
                                                resolve(false)
                                            } else {
                                                if (container_present) {
                                                    clearInterval(timer);
                                                    resolve(true);
                                                }
                                                counter++;
                                            }
                                        }, 2000);
                                    }
                                });
                            },2000)

                        });

                        container_promise.then(function (response) {
                            if (response) {
                                Swal.close();
                            } else {
                                return Swal.fire({
                                    title: 'Container not detected. Try again?',
                                    type: 'error',
                                    cancelButtonText: 'Nope',
                                    showCancelButton: true,
                                    allowOutsideClick: false,
                                });
                            }
                        }).then((result) => {
                            console.log(result);
                            if (result.value) {
                                console.log('OKed');
                                window.location.reload();
                            } else if (result.dismiss == 'cancel') {
                                //properly exit
                                console.log('Cancelled');
                                window.location.assign('login.html');
                            }
                        })
                            .catch(function () {
                                //Container not detected. Try again? 

                            });

                    } else {
                        Swal.fire({
                            title: 'An error occured. Refreshing page..',
                            type: 'error',
                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'Ok',
                            onClose: function () {
                                location.reload();
                            }
                        }).then((result) => {
                            location.reload();
                        })
                    }
                }, function (error) {
                    console.log(`Error: ${error}`);
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
                    })
                });
            }

        },
        onClose: () => {
        }
    }).then((result) => {
    });


    //Initializes toggle button to Automatic. Chnge bootstrapToggle to Off for Manual.
    $('#toggle_switch').bootstrapToggle('on');
    //Button clicks listener for both Automatic and Manual Button
    $(".main-controls").click(function () {
        var current = $(this).text();
        var current_id = $(this).attr("id");

        if (toggle_state == 'Manual') {
            //do things for manual dispensing
            var data = {};
            switch (current_id) {
                case "hot-button":
                    if (current == "HOT") {
                        data.command = 'hello';
                        $('#toggle_switch').bootstrapToggle('disable');
                        $(this).removeClass().addClass("btn");
                        $(this).text("Stop");
                        $("#cold-button").prop('disabled', true);
                        $('#toggle_switch').prop('disable', true);
                        commandPy(socket, { command: 'Toggle_Hot' });
                        current_operation.set('HOT');

                    } else {
                        data.command = 'stop';
                        $('#toggle_switch').bootstrapToggle('enable');
                        $(this).removeClass().addClass("btn btn-danger");
                        $(this).text("HOT");
                        $("#cold-button").prop('disabled', false);
                        $('#toggle_switch').prop('disable', false);
                        commandPy(socket, { command: 'Stop_Dispense' });
                        var transaction_params = {};
                        // previous_size = current_size;

                    }
                    break;

                case "cold-button":
                    if (current == "COLD") {
                        data.command = 'start';
                        $('#toggle_switch').bootstrapToggle('disable');
                        $(this).removeClass().addClass("btn");
                        $(this).text("Stop");
                        $("#hot-button").prop('disabled', true);
                        $('#toggle_switch').prop('disable', true);
                        commandPy(socket, { command: 'Toggle_Cold' });
                        current_operation.set('COLD');
                    } else {
                        data.command = 'stop';
                        $('#toggle_switch').bootstrapToggle('enable');
                        $(this).removeClass().addClass("btn btn-primary");
                        $(this).text("COLD");
                        $("#hot-button").prop('disabled', false);
                        $('#toggle_switch').prop('disable', false);
                        commandPy(socket, { command: 'Stop_Dispense' });
                    }
                    break;
                default:
                    break;
            }

        } else {
            //do things for automatic dispensing
            var amount = 0.00;
            Swal.fire({
                title: 'Amount',
                allowOutsideClick: false,
                html:
                    'Enter the amount of water to be dispensed:<br/><br/><button id="decrease" class="btn btn-info"><strong>-</strong></button>' +
                    '<input type="text" id=amount>' +
                    '<button id="increase" class="btn btn-danger"><strong>+</strong></button><br>' + 
                    '<button id="preset_100" class="presets btn btn-info btn-sm"><strong>100 mL</strong></button>' + 
                    '<button id="preset_200" class="presets btn btn-info btn-sm"><strong>200 mL</strong></button>' +
                    '<button id="preset_300" class="presets btn btn-info btn-sm"><strong>300 mL</strong></button>' +
                    '<button id="preset_400" class="presets btn btn-info btn-sm"><strong>400 mL</strong></button>' +
                    '<button id="preset_500" class="presets btn btn-info btn-sm"><strong>500 mL</strong></button>',
                confirmButtonText: 'Dispense',
                onBeforeOpen: () => {
                    const content = Swal.getContent();
                    const $ = content.querySelector.bind(content);

                    const input = $('#amount');
                    const stop = $('#stop');
                    const increase = $('#increase');
                    const preset_100 = $('#preset_100');
                    const preset_200 = $('#preset_200');
                    const preset_300 = $('#preset_300');
                    const preset_400 = $('#preset_400');
                    const preset_500 = $('#preset_500');

                    content.querySelector("#amount").value = amount;

                    decrease.onclick = function () {
                        const content = Swal.getContent();
                        const $ = content.querySelector.bind(content);
                        const input = $('#amount');
                        if (amount > 0) {
                            amount = amount - 100;
                            content.querySelector("#amount").value = amount;
                        }
                    }
                    increase.onclick = function () {
                        const content = Swal.getContent();
                        const $ = content.querySelector.bind(content);
                        const input = $('#amount');
                        amount = amount + 100;
                        content.querySelector("#amount").value = amount;
                    }

                    preset_100.onclick = function() {
                        amount = 100;
                        content.querySelector("#amount").value = amount;
                    }
                    preset_200.onclick = function() {
                        amount = 200;
                        content.querySelector("#amount").value = amount;
                    }
                    preset_300.onclick = function() {
                        amount = 300;
                        content.querySelector("#amount").value = amount;
                    }
                    preset_400.onclick = function() {
                        amount = 400;
                        content.querySelector("#amount").value = amount;
                    }
                    preset_500.onclick = function() {
                        amount = 500;
                        content.querySelector("#amount").value = amount;
                    }


                },
                onClose: () => {
                }
            }).then((result) => {

                //Check Remaining Balance Here. Block transaction if input mL is greater than remaining balance.
                if (amount <= remaining_balance) {
                    commandPy(socket, { command: 'Set_Amount', amount: amount });
                    current_operation.set(current);
                    if (current == 'HOT') {
                        commandPy(socket, { command: 'Toggle_Hot' });
                        $(this).text("Stop");
                        $("#hot-button").prop('disabled', true);
                        $("#cold-button").prop('disabled', true);
                        $('#toggle_switch').prop('disabled', true);
                    } else {
                        commandPy(socket, { command: 'Toggle_Cold' });
                        $(this).text("Stop");
                        $("#hot-button").prop('disabled', true);
                        $("#cold-button").prop('disabled', true);
                        $('#toggle_switch').prop('disabled', true);
                    }
                    amount = 0;
                } else {
                    amount = 0;
                    Swal.fire({
                        title: "You don't have enough balance.",
                        type: 'error',
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'Ok.Sorry',
                        onClose: function () {
                        }
                    });
                }
                
            });


        }
    });

    //Toggle Event Listener for toggling between Auto and Manual
    $('#toggle_switch').change(function () {
        if ($(this).prop('checked') == false) {
            toggle_state = 'Manual';
            commandPy(socket, { command: 'Toggle_Manual' });

        } else {
            toggle_state = 'Automatic';
            commandPy(socket, { command: 'Toggle_Auto' });
        }
    });


}




//Function to command Python
function commandPy(socket, content) {
    var msg = {
        destination: 'Python',
        content: content
    };
    socket.emit('socket-event', msg);
}

//Function that will enable all controls
function enableAll() {
    $("#hot-button").text("HOT");
    $("#cold-button").text("COLD");
    $("#hot-button").prop('disabled', false);
    $("#cold-button").prop('disabled', false);
    $('#toggle_switch').prop('disabled', false);
    $('#hot-button').removeClass().addClass("btn btn-danger");
    $('#cold-button').removeClass().addClass("btn btn-primary");
}

function disableAll() {
    $("#hot-button").text("HOT");
    $("#cold-button").text("COLD");
    $("#hot-button").prop('disabled', true);
    $("#cold-button").prop('disabled', true);
    $('#toggle_switch').prop('disabled', true);
}


function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function jsonWrite(file,callback) {
    // Use this path for windows.
    // var file_path = 'C:/xampp/htdocs/ReQuench_Machine/machine_settings.json';

    //Use this path for RasPi
    var file_path = '/home/pi/Documents/ReQuench_Machine/machine_settings.json';
    fs.writeFile(file_path, JSON.stringify(file, null, 6), function (err) {
        if (err){
            callback(false);
        }else{
            callback(true);
        }
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

function getPercentage(value, overall) {
    var percentage_value = (value / overall) * 100
    return percentage_value;
}

function sendNotification(title, body, fn_response, fn_error) {
    var params = {};
    params.title = title;
    params.body = body;
    httpcustomrequest.http_post('Notify.php', params, fn_response(response), fn_error(error));
}
