let $ = require("jquery");
let {PythonShell} = require('python-shell');
let fs = require('fs');
let path = require('path');
let file = require('./operations');
let httpcustomrequest = require('./loginBackend.js');
const Store = require('electron-store');
const store = new Store();
const io = require('socket.io-client');
let current_ml_dispensed = 0;
let operation_json = {
  "Operation_Variables":{
    "Manual": 0,
    "Automatic":0,
    "Requested_Amount":0
  },
  "Command_Variable":{
    "Dispense_Hot":0,
    "Dispense_Cold":0
  }
};

$(document).ready(main);

function main(){
  //update user data every reloading of the page
  let Swal = require('sweetalert2');
  var interval;
  var toggle_state = true;
  var branding_image = document.getElementById('branding_image');
  var user_information = store.get('User_Information');
  var ml_label = document.getElementById('ml_label');
  var history = store.get('History');
  var purchase_history = store.get('Purchase_History');
  var transaction_history = store.get('Transaction_History');
  var logout_button = document.getElementById('logout_button');
  var temp_array_transaction = [];
  var temp_array_purchase = [];
  var full_size = 0;
  var current_size = 0;
  var size_percentage = 0;
  var computed_height = 0;
  var socket  = io('http://localhost:3000');
  var options = {
    scriptPath: path.join(__dirname,'/python_scripts')
  }
  var filename = 'main.py';
  var py_object = new PythonShell(filename,options);
  var previous_size = 0;
  // in seconds
  const idle_timeout = 10;
  const idle_interval = 1000;
  var idle_time = 0;
  var idle_prompt = setInterval(function() {
    idle_time = idle_time + 1;
    if (idle_time == idle_timeout) {
      let timerInterval
      Swal.fire({
        title: 'Auto close alert!',
        html: '<button id="present" class="btn btn-info">' +
        "I'm still here!" +
      '</button><br/>',
        timer: 2000,
        showConfirmButton:true,
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
          commandPy(socket,{command:'Terminate'});
          console.log('Terminated, hopefully');
          window.location.assign('login.html');
        }
      })
    }
  },idle_interval);
  py_object.on('message', function (message) {
    console.log(message);
    // try {
    //   console.log(message);
      
    //   var json_object = JSON.parse(message);
    //   if (current_size >= 0) {
    //     var total = json_object.Total;
    //     current_size = previous_size - total; 
    //     console.log(`Current Balnce: ${current_size}`);
        
    //     size_percentage = (current_size/full_size);
    //     computed_height = size_percentage * 250;
    //     $("#water-level").animate({height:computed_height+'px'}); 
    //     ml_label.innerHTML = `${current_size} mL`;
    //   }else{
    //     //let python know that there is nothing left
    //     console.log('Nothing left!');
    //   }
    // } catch (error) {
    //  throw error; 
    // }
  });

  py_object.end(function (err,code,signal) {
    if (err) throw err;
    console.log('Ended');
    
  });



  window.onmousemove = function(e) {
    idle_time = 0;
  }



  logout_button.onclick = function(){
    Swal.fire({
      title: 'Are you done?',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Log me out'
    }).then((result) => {
      if (result.value) {
        store.delete('User_Information');
        store.delete('Purchase_History');
        store.delete('Transaction_History');
        commandPy(socket,{command:'Terminate'});
        console.log('Terminated, hopefully');
        window.location.assign('login.html');
      }
    })
  }



 ml_label.onclick = function() {
   var msg = {
     destination:'Python',
     content:{
      command:'Toggle_Manual'
     }
   };
  commandPy(socket,{command:'Toggle_Manual'});
  console.log('Clicked');
 }

 socket.on('socket-event', function(msg){
    console.log('Message:' + msg);
    if (msg != 'Stopped Dispense') {
      // if (current_size >= 0) {
      //   var total = msg.Total;
      //   current_size = previous_size - total; 
      //   console.log(`Current Balnce: ${current_size}`);
      //   size_percentage = (current_size/full_size);
      //   computed_height = size_percentage * 250;
      //   $("#water-level").animate({height:computed_height+'px'}); 
      //   ml_label.innerHTML = `${current_size} mL`;
      // }else{
      //   //let python know that there is nothing left
      //   console.log('Nothing left!');
      // }
    } else {
      enableAll();
    }
});

  var params = {};
  params.Acc_ID = store.get('User_Information').Acc_ID;
  httpcustomrequest.http_post('Machine_Init.php',params,function(json_object) {
    if (json_object != false) {
      store.set('Purchase_History',json_object.Purchase_History);
      store.set('Transaction_History',json_object.Transaction_History);
    } else {
      Swal.fire({
        title: 'An error occured. Refreshing page..',
        type: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Ok',
        onClose:function() {
          location.reload();  
        }
      }).then((result) => {
        location.reload();
      })
    }
  },function(error) {
    console.log(`Error: ${error}`);
  });
  
  var purchase_history = store.get('Purchase_History');
  var transaction_history = store.get('Transaction_History');

  for (var i = 0; i < transaction_history.length; i++) {
    temp_array_transaction.push(transaction_history[i]);
  }
  for (var i = 0; i < purchase_history.length; i++) {
    temp_array_purchase.push(purchase_history[i]);
  }

  var compare_function = function(a,b) {
    if (Date.parse(a.Date) > Date.parse(b.Date)) {
      if (a.Time > b.Time) {
        return -1;
      }else {
        return 1;
      }
    }else {
      if (a.Time > b.Time) {
        return -1;
      }else {
        return 1;
      }
    }
  }

  temp_array_transaction.sort(compare_function);
  temp_array_purchase.sort(compare_function);

  //Logic for finding the Full and Current Size for representation
  if (Date.parse(temp_array_transaction[0].Date) >  Date.parse(temp_array_purchase[0].Date)) {
    full_size = parseInt(temp_array_transaction[0].Amount) + parseInt(temp_array_transaction[0].Remaining_Balance);
    current_size = parseInt(temp_array_transaction[0].Remaining_Balance);
  }else if (Date.parse(temp_array_transaction[0].Date) <  Date.parse(temp_array_purchase[0].Date)) {
    full_size = parseInt(user_information.Balance);
    current_size = full_size;
  }else{
    if (temp_array_transaction[0].Time > temp_array_purchase[0].Time) {
      full_size = parseInt(temp_array_transaction[0].Amount) + parseInt(temp_array_transaction[0].Remaining_Balance);
      current_size = parseInt(temp_array_transaction[0].Remaining_Balance);
    }else if (temp_array_transaction[0].Time < temp_array_purchase[0].Time) {
  
      full_size = parseInt(user_information.Balance);
      current_size = full_size;
    }
  }

  console.log(`Current Balance: ${current_size}`);
  
  previous_size = current_size;
  size_percentage = (current_size/full_size);
  computed_height = size_percentage * 250;
  $("#water-level").animate({height:computed_height+'px'});

  ml_label.innerHTML = `${user_information.Balance} mL`;
  $('#toggle_switch').bootstrapToggle('on');
  $(".main-controls").click(function(){
    var current = $(this).text();
    var current_id = $(this).attr("id");

    if (toggle_state == 'Manual') {
      //do things for manual dispensing
      var data = {};
      switch (current_id) {
        case "hot-button":
        if(current=="HOT"){
          data.command = 'hello';
          $('#toggle_switch').bootstrapToggle('disable');
          $(this).removeClass().addClass("btn");
          // interval = setInterval(mouseaction,100,current_ml_dispensed);
          // interval = setInterval(tester,100);
          $(this).text("Stop");
          $("#cold-button").prop('disabled',true);
          $('#toggle_switch').prop('disable',true);
          commandPy(socket,{command:'Toggle_Hot'});
        }else{
          data.command = 'stop';
          $('#toggle_switch').bootstrapToggle('enable');
          $(this).removeClass().addClass("btn btn-danger");
          $(this).text("HOT");
          // clearInterval(interval);
          previous_size = current_size;
          $("#cold-button").prop('disabled',false);
          $('#toggle_switch').prop('disable',false);
          commandPy(socket,{command:'Stop_Dispense'});
        }
          break;

        case "cold-button":
        if(current=="COLD"){
          data.command = 'start';
          $('#toggle_switch').bootstrapToggle('disable');
          $(this).removeClass().addClass("btn");
          $(this).text("Stop");
          $("#hot-button").prop('disabled',true);
          $('#toggle_switch').prop('disable',true);
          commandPy(socket,{command:'Toggle_Cold'});
        }else{
          data.command = 'stop';
          $('#toggle_switch').bootstrapToggle('enable');
          $(this).removeClass().addClass("btn btn-primary");
          $(this).text("COLD");
          $("#hot-button").prop('disabled',false);
          $('#toggle_switch').prop('disable',false);
          commandPy(socket,{command:'Stop_Dispense'});
        }
          break;
        default:
          break;
      }

    }else{
      //do things for automatic dispensing
      var amount = 0.00;
      Swal({
        title: 'Amount',
        html:
          'Enter the amount of water to be dispensed:<br/><br/><button id="decrease" class="btn btn-info"><strong>-</strong></button>' +
          '<input type="text" id=amount>' +
          '<button id="increase" class="btn btn-danger"><strong>+</strong></button>',
        confirmButtonText:'Dispense',
        onBeforeOpen: () => {
          const content = Swal.getContent();
          const $ = content.querySelector.bind(content);

          const input = $('#amount');
          const stop = $('#stop');
          const increase = $('#increase');
          content.querySelector("#amount").value= amount;

          decrease.onclick = function() {
            const content = Swal.getContent();
            const $ = content.querySelector.bind(content);
            const input = $('#amount');
            if (amount > 0) {
              amount--;
              content.querySelector("#amount").value = amount;
            }
          }
          increase.onclick = function() {
            const content = Swal.getContent();
            const $ = content.querySelector.bind( content);
            const input = $('#amount');
            amount++;
            content.querySelector("#amount").value = amount;
          }

        },
        onClose: () => {
          commandPy(socket,{command:'Set_Amount',amount:amount});
          if (current == 'HOT') {
            commandPy(socket,{command:'Toggle_Hot'});

            $(this).text("Stop");
            $("#hot-button").prop('disabled',true);
            $("#cold-button").prop('disabled',true);
            $('#toggle_switch').prop('disabled',true);
          } else {
            commandPy(socket,{command:'Toggle_Cold'});
            $(this).text("Stop");
            $("#hot-button").prop('disabled',true);
            $("#cold-button").prop('disabled',true);
            $('#toggle_switch').prop('disabled',true);
          }
          amount = 0;  
        }
      });


    }
  });


  $('#toggle_switch').change(function() {
    if ($(this).prop('checked') == false) {
        toggle_state = 'Manual';
        commandPy(socket,{command:'Toggle_Manual'});
        
    }else{
      toggle_state = 'Automatic';
      commandPy(socket,{command:'Toggle_Auto'});
    }
  });

    window.onbeforeunload = function (e) {
      PythonShell.terminate();
    };




}



function commandPy(socket,content) {
  var msg = {
    destination:'Python',
    content:content
  };
 socket.emit('socket-event', msg);
}

function jsonWrite(directory,file) {
  // Sample Directory :'/home/pi/Documents/ReQuench_Machine/operations.json'
  fs.writeFile(directory, JSON.stringify(file,null,6), function (err) {
    if (err) return console.log(err);
  });
}

function mouseaction(){
  var height = $("#water-level").height();
  height-=10;
  $("#water-level").animate({height:height+'px'});
  startdispense(display_output);
}

function display_output() {
  console.log('Value: ' + current_ml_dispensed);
}

function disableAllExcept(element_id) {
  
}

function enableAll() {
  $("#hot-button").text("HOT");
  $("#cold-button").text("COLD");
  $("#hot-button").prop('disabled',false);
  $("#cold-button").prop('disabled',false);
  $('#toggle_switch').prop('disable',false);
}