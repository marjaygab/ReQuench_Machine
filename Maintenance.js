let $ = require('jquery');
let fs = require('fs');
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
    var steps_size;
    var steps_list;
    var timer;
    var minute;
    var seconds;
    var current_step_selected;

    readStepsFile(function(list,size) {
        steps_list = list;
        steps_size = size;
        seconds = 0;
        current_step_selected = 0;
        console.log(steps_list);
        
        minute = steps_list[current_step_selected].initial_time;
        console.log(`${minute}:0${seconds}`);
        
    });

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

    left_button.onclick = function() {
        if (this.innerHTML == 'Start') {
            this.innerHTML = 'Previous';
            right_button.style.display = 'unset';
            progress_circles[current_step_selected].classList.add('selected');
            console.log(steps_list[current_step_selected]);
            showStep(steps_list[current_step_selected],function(initial_time) {
                minute = initial_time;
                seconds = 0;
            });
        } else {
            if (current_step_selected > 0) {
                progress_circles[current_step_selected].classList.remove('selected');
                current_step_selected--;
                showStep(steps_list[current_step_selected],function(initial_time) {
                    minute = initial_time;
                    seconds = 0;
                });
            }
        }
    }

    right_button.onclick = function() {
        if (right_button.innerHTML == 'Next Step') {
            if (current_step_selected < steps_size-1) {
                ++current_step_selected;
                progress_circles[current_step_selected].classList.add('selected');
                showStep(steps_list[current_step_selected],function(initial_time) {
                    minute = initial_time;
                    seconds = 0;
                });
            }
            if (current_step_selected == steps_size-1) {
                right_button.innerHTML = 'Finish';
            }   
        }else{
            window.location.assign('login.html');
        }
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



});