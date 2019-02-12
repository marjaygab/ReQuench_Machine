let $ = require("jquery");
const http = require('http');
var request = require('request');
const Store = require('electron-store');
const store = new Store();
let httpcustomrequest = require('./loginBackend.js');
'use strict';
var sessionstorage = require('sessionstorage');
$(document).ready(main);

function main() {
  var scanbutton = document.getElementById('scanbutton');
  var enterotpbutton = document.getElementById('enterotpbutton');
  var scanningheader = document.getElementById('inputheader');
  var input_container = document.getElementById('input_container');
  var input_text_field = document.getElementById('otp_field');
  var keyboard_div = document.getElementsByClassName('layout');
  var letters = document.getElementsByClassName('letter');
  var keyboard= document.getElementById('keyboard');
  var key = document.getElementsByClassName('key');
  var capslock = document.getElementById('capslock');
  var delete_button = document.getElementById('delete');
  var letter_q = document.getElementById('q');
  var legends = document.getElementsByClassName('fas');
  var caps_label = document.getElementById('caps_label');
  var lshift = document.getElementById('left-shift-button');
  var rshift = document.getElementById('right-shift-button');
  var enter_button = document.getElementById('return');
  var scanned = false;
  var scaninterval;
  var count = 0;
  var key_register = 0;
  var char_array = [];
  var otp_string = '';

  var key_pressed = {
    lshift : false,
    rshift : false,
    caps : false,
    press : function(params,letters) {
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
          toggleShifts('left',letters);
          break;
        case 'RSHIFT':
          this.rshift = true;
          this.lshift = false;
          this.caps = false;
          untoggleCaps(letters);
          toggleShifts('right',letters);
          break;
        default:
          break;
      }
    }
  }


  enter_button.onclick = function() {
    if (otp_string.length == 6) {
      //handle enter button here
      $('#enterotpbutton').removeClass().addClass("btn btn-success");
      $('#enterotpbutton').text("Login");
      $('#enterotpbutton').prop('disabled',false);
      $("input:text").prop('disabled', true);
      hideKeyboard();
      
    } else {
      console.log('OTP is too short!');
      char_array = [];
      otp_string = '';
    }
  }


  lshift.onclick = function() {
    key_pressed.press('LSHIFT',letters);
  }

  rshift.onclick = function () {
    key_pressed.press('RSHIFT',letters);
  }

  capslock.onclick = function() {
    key_pressed.press('CAPS',letters);
  }

  scanbutton.onclick = function(){
    // execScan();
  };

  delete_button.onclick = function() {
    otp_string = '';
    if (char_array.length != 0 ) {
      char_array.pop();  
    }
    char_array.forEach(element => {
      otp_string = otp_string + element;
    });
    $("#otp_field").val(otp_string);
  }


  input_text_field.onfocus = function() {
    keyboard.style.visibility = "visible";
    $("#keyboard").animate({'opacity':'1'});
  };

  keyboard_div.onclick = function() {
    input_text_field.focus();
  };

  
for (let index = 0; index < key.length; index++) {
  var element = key[index];
  
  key[index].onclick = function() {
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
  enterotpbutton.onclick = function() {
    var button_text = $('#enterotpbutton').text();
    switch (button_text) {
      case "Enter OTP":
      $('#enterotpbutton').removeClass().addClass("btn");
      $('#enterotpbutton').text("Cancel");
      $("input:text").prop('disabled', false);
      input_text_field.focus();
        break;
      case "Cancel":
        //handle cancellation of entry
        count = 0;
      $('#enterotpbutton').removeClass().addClass("btn btn-success");
      $('#enterotpbutton').text("Enter OTP");
      $('#enterotpbutton').prop('disabled',false);
      $("input:text").prop('disabled', true);
      $("input:text").val("");
      input_text_field.blur();
      $("#keyboard").animate({'opacity':'0'});
      char_array = [];
      otp_string = '';
      keyboard.style.visibility = "hidden";
        break;
      case "Login":
        var params = {};
        params.OTP_Entered = $("input:text").val();
        //put error handling for user. if there is an error in loging in, show swal then
        //try again to restart the logging process


        httpcustomrequest.http_post('Machine_Initialize.php',params,function(json_object) {
          // sessionstorage.setItem('User_Information',json_object);
          store.set('User_Information',json_object.Account);
          params = {};
          params.Acc_ID = json_object.Account.Acc_ID;
            //check user persmissions first
          store.set('Purchase_History',json_object.Purchase_History);
          store.set('Transaction_History',json_object.Transaction_History);
          var user_info_object = store.get('User_Information');
          console.log(user_info_object);
          
          if(user_info_object.Access_Level == 'USER'){
            window.location.assign("HomePage.html");
          }else if (user_info_object.Access_Level == 'ADMIN') {
            window.location.assign("admin.html");
          }else{

          }
        },function(error) {
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


function toggleShifts(shift,letters) {
  var lshift_label = document.getElementById('left-shift');
  var rshift_label = document.getElementById('right-shift');
  var lshift = document.getElementById('left-shift-button');
  var rshift = document.getElementById('right-shift-button');
  if (shift == 'left') {
    style = window.getComputedStyle(lshift);
    var background = style.getPropertyValue('background-color');
    if(background == "rgb(30, 179, 190)"){
      lshift_label.style.color = '#030303';
      lshift.style.backgroundColor = "#f3f3f3";
      rshift_label.style.color = '#f3f3f3';
      rshift.style.backgroundColor = "#1EB3BE";
      for (let index = 0; index < letters.length; index++) {
        console.log('Test');
        var element = letters[index];
        element.innerHTML = element.innerHTML.toUpperCase();
      }
    }else{
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
    if(background == "rgb(30, 179, 190)"){
      rshift_label.style.color = '#030303';
      rshift.style.backgroundColor = "#f3f3f3";
      lshift_label.style.color = '#f3f3f3';
      lshift.style.backgroundColor = "#1EB3BE";
      for (let index = 0; index < letters.length; index++) {
        var element = letters[index];
        element.innerHTML = element.innerHTML.toUpperCase();
      }
    }else{
      rshift_label.style.color = '#f3f3f3';
      rshift.style.backgroundColor = "#1EB3BE";
      for (let index = 0; index < letters.length; index++) {
        var element = letters[index];
        element.innerHTML = element.innerHTML.toLowerCase();
      }
    }
  }
}

function untoggleShifts(letters = null) 
{
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
  var keyboard= document.getElementById('keyboard');
  $("#keyboard").animate({'opacity':'0'});
  keyboard.style.visibility = "hidden";
}

function showKeyboard() {
  var keyboard= document.getElementById('keyboard');
  keyboard.style.visibility = "visible";
  $("#keyboard").animate({'opacity':'1'});
}