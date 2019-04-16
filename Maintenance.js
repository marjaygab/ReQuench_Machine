let $ = require('jquery');
let fs = require('fs');
const io = require('socket.io-client');
let moment = require('moment');
var socket = io('http://localhost:3000');
const path = require('path');
let Swal = require('sweetalert2');
let maintenance_data = require('./maintenance_data');
let machine_settings = require('./machine_settings');
const draining_time = 5;
$(document).ready(function() {
    var main_container_div = document.getElementById('main_container_div');
    var left_button = document.getElementById('left_button');
    var right_button = document.getElementById('right_button');
    var progress_circles = document.getElementsByClassName('progress_circle');
    var step_header = document.getElementById('step_header');
    var step_content = document.getElementById('step_content');
    var step_timer = document.getElementById('step_timer');
    var timer_controls = document.getElementById('timer_controls');
    var toggle_timer = document.getElementById('toggle_timer');
    var reset_timer = document.getElementById('reset_timer');
    var steps_control = document.getElementsByClassName('steps_control');
    var start_drain_cold = document.getElementById('start_drain_cold');
    var stop_drain_cold = document.getElementById('stop_drain_cold');
    var start_drain_hot = document.getElementById('start_drain_hot');
    var stop_drain_hot = document.getElementById('stop_drain_hot');
    var steps_size;
    var steps_list;
    var timer;
    var minute;
    var seconds;
    var current_step_selected;
    var maintenance_data_file = maintenance_data;
    var settings = machine_settings;

    right_button.style.display = 'visible';
    commandPy(socket, { command: 'Disable_Temp' });

    start_drain_cold.onclick = function() {
        this.disabled = true;
        stop_drain_cold.disabled = false;
        start_drain_hot.disabled = true;
        stop_drain_hot.disabled = true;
        
        left_button.disabled = true;
        right_button.disabled = true;
        commandPy(socket, { command: 'Start_Drain_Cold' });
    }

    stop_drain_cold.onclick = function() {
        this.disabled = true;
        start_drain_cold.disabled = false;
        stop_drain_hot.disabled = true;
        start_drain_hot.disabled = false;
        
        if (!maintenance_data.from_maintenance) {
            left_button.disabled = false;
            right_button.disabled = false;
        }else{
            right_button.disabled = false;
        }
        
        commandPy(socket, { command: 'Stop_Drain_Cold' });
    }
    
    start_drain_hot.onclick = function() {
        this.disabled = true;
        stop_drain_hot.disabled = false;
        stop_drain_cold.disabled = true;
        start_drain_cold.disabled = true;
        
        left_button.disabled = true;
        right_button.disabled = true;
        commandPy(socket, { command: 'Start_Drain_Hot' });
    }

    stop_drain_hot.onclick = function() {
        this.disabled = true;
        start_drain_hot.disabled = false;
        stop_drain_cold.disabled = true;
        start_drain_cold.disabled = false;
        if (!maintenance_data.from_maintenance) {
            left_button.disabled = false;
            right_button.disabled = false;
        }else{
            right_button.disabled = false;
        }
        
        commandPy(socket, { command: 'Stop_Drain_Hot' });
    }

    readStepsFile(function(list,size) {
        steps_list = list;
        steps_size = size;
        seconds = 0;
        current_step_selected = maintenance_data_file.current_step;
        current_step_select = 0;
        console.log(steps_list);
        minute = steps_list[current_step_selected].initial_time;
        console.log(`${minute}:0${seconds}`);
        if (maintenance_data_file.from_maintenance) {
            current_step_selected = maintenance_data_file.current_step;
            left_button.disabled = true;
            left_button.classList.remove("btn-success");
            left_button.classList.add("btn-secondary");
            for (let index = 0; index <= current_step_selected; index++) {
                left_button.innerHTML = 'Previous';
                right_button.style.display = 'unset';
                progress_circles[index].classList.add('selected');
                showStep(steps_list[current_step_selected],function(initial_time) {
                    minute = initial_time;
                    seconds = 0;
                }); 
            }
        }else{
            current_step_select = 0;
        }
    });


    
    for (let index = 0; index < steps_control.length; index++) {
        const element = steps_control[index];
        element.addEventListener("click",function() {
            if (this.id == 'left_button') {
                if (this.innerHTML == 'Start') {
                    this.innerHTML = 'Previous';
                    right_button.style.display = 'unset';
                    right_button.innerHTML = 'Next Step';
                    progress_circles[current_step_selected].classList.add('selected');
                    console.log(steps_list[current_step_selected]);
                    showStep(steps_list[current_step_selected],function(initial_time) {
                        minute = initial_time;
                        seconds = 0;
                    });
                } else {
                    if (current_step_selected > 0) {
                        this.disabled = false;
                        this.classList.remove("btn-secondary");
                        this.classList.add("btn-success");
                        progress_circles[current_step_selected].classList.remove('selected');
                        current_step_selected--;
                        showStep(steps_list[current_step_selected],function(initial_time) {
                            minute = initial_time;
                            seconds = 0;
                        });
                    }
                }
            } else {
                if (right_button.innerHTML == 'Next Step') {
                    if (current_step_selected < steps_size-1) {
                        ++current_step_selected;
                        progress_circles[current_step_selected].classList.add('selected');
                        showStep(steps_list[current_step_selected],function(initial_time) {
                            minute = initial_time;
                            seconds = 0;
                        });
                    }
                    if(current_step_selected == 4){
                        //command pi to shutdown
                        maintenance_data_file.from_maintenance = true;
                        maintenance_data_file.current_step = 5;
                        settings.status = 'offline';
                        fs.writeFile('./maintenance_data.json', JSON.stringify(maintenance_data_file,null,6), function (err) {
                            if (err) return console.log(err);
                            fs.writeFile('./machine_settings.json', JSON.stringify(settings,null,6), function (err) {
                                if (err) return console.log(err);
                            });
                        });
                    }
                    if (current_step_selected == steps_size-1) {
                        right_button.innerHTML = 'Finish';
                    }   
                }else if(right_button.innerHTML == 'Cancel'){
                    window.location.assign('admin.html');
                }else{
                    
                    maintenance_data_file.from_maintenance = false;
                    maintenance_data_file.current_step = 0;
                    settings.last_maintenance_date = moment().format('YYYY-MM-DD');
                    fs.writeFile('./maintenance_data.json', JSON.stringify(maintenance_data_file,null,6), function (err) {
                        if (err) return console.log(err);
                        fs.writeFile('./machine_settings.json', JSON.stringify(settings,null,6), function (err) {
                            if (err) return console.log(err);
                            window.location.assign('login.html');        
                        }); 
                    });
                    

                }
            }

            if (current_step_selected == 5 && maintenance_data_file.from_maintenance) {
                left_button.disabled = true;
                left_button.classList.remove("btn-success");
                left_button.classList.add("btn-secondary");
                console.log(this.classList);
            }else{
                left_button.disabled = false;
                left_button.classList.remove("btn-secondary");
                left_button.classList.add("btn-success");
            }
            console.log(current_step_selected);
            
            if (current_step_selected == 1 || current_step_selected == 5 || current_step_selected == 7) {
                document.getElementById('drain_controls').style.visibility = 'visible';

                //run python here
                // commandPy(socket, { command: 'Start_Drain' });
                // var counter = 0;
                // left_button.disabled = true;
                // right_button.disabled = true;
                // var drain_interval = setInterval(() => {
                //     counter++;
                //     console.log('Draining');
                //     if (counter == draining_time) {
                //         //command python here
                //         if (maintenance_data_file.from_maintenance) {
                //             left_button.disabled = true;
                //         }else{
                //             left_button.disabled = false;
                //         }
                //         right_button.disabled = false;
                //         console.log('Draining Done');
                //         commandPy(socket, { command: 'Stop_Drain' });
                //         clearInterval(drain_interval);
                //     }
                // }, 60000);
            }else if(current_step_selected == '11'){
                document.getElementById('drain_controls').style.visibility = 'hidden';
                Swal.fire({
                    title: 'Are you done?',
                    text: "You may skip refilling if need.",
                    type: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes',
                    cancelButtonText: "Skip Refill",
                    allowOutsideClick: false
                  }).then((result) => {
                      console.log(result);
                    if (result.dismiss == 'cancel') {
                        settings.current_water_level = 0;
                    }else{
                        settings.current_water_level = 20000;                        
                    }
                  })
            }else if(current_step_selected == '13'){
                document.getElementById('drain_controls').style.visibility = 'hidden';
                commandPy(socket, { command: 'Enable_Temp' });
            }else{
                document.getElementById('drain_controls').style.visibility = 'hidden';
            }

            
        });
    }



    toggle_timer.onclick = function() {
        if (toggle_timer.innerHTML == 'Start Timer') {
            toggle_timer.classList.remove("btn-primary");
            toggle_timer.classList.add("btn-warning");
            toggle_timer.innerHTML = 'Stop Timer';
            reset_timer.disabled = true;
            timer = setInterval(function() {
                if (seconds > 0) {
                    seconds--;
                } else {
                    if (minute <= 0) {
                        clearInterval(timer);
                    } else {
                        seconds = 59;
                        minute--;
                    }
                }
                if (seconds < 10) {
                    step_timer.innerHTML = `${minute}:0${seconds}`;
                } else {
                    step_timer.innerHTML = `${minute}:${seconds}`;
                }
                
            },1000);
        } else {
            reset_timer.disabled = false;
            toggle_timer.innerHTML = 'Start Timer';
            toggle_timer.classList.remove("btn-warning");
            toggle_timer.classList.add("btn-primary");
            clearInterval(timer);
        }
    }

    reset_timer.onclick = function() {
        showStep(steps_list[current_step_selected],function(initial_time) {
            minute = initial_time;
            seconds = 0;
        });
    }

function showStep(step,callback) {
    step_header.innerHTML = step.step_header;
    step_content.innerHTML = step.step_content;
    if (step.timer_control) {
        timer_controls.style.visibility = 'visible';
        step_timer.innerHTML = `${step.initial_time}:00`;
        callback(step.initial_time);
    }else{
        timer_controls.style.visibility = 'hidden';
    }
}

function readStepsFile(callback) {
    var list = [];
    var content = '';
    fs.readFile('./maintenance_steps.json',function read(err,data) {
        if (err) {
            throw err;
        } else {
            content = data;
        }
        var json_object = JSON.parse(content);
        
        json_object.Maintenance_Steps.forEach(step => {
            list.push(step);
        });
        callback(list,list.length);
    });
}

function commandPy(socket, content) {
    var msg = {
        destination: 'Python',
        content: content
    };
    socket.emit('socket-event', msg);
}



});
