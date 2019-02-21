let $ = require("jquery");
let {PythonShell} = require('python-shell');
let fs = require('fs');
let path = require('path');
let file = require('./operations');
let httpcustomrequest = require('./loginBackend.js');
const Store = require('electron-store');
const store = new Store();
let current_ml_dispensed = 0;
let operation_json_format = {
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
  var temp_array_transaction = [];
  var temp_array_purchase = [];
  var full_size = 0;
  var current_size = 0;
  var size_percentage = 0;
  var computed_height = 0;
  var options = {
    scriptPath: path.join(__dirname,'/python_scripts')
  }
  // var filename = 'main.py';
  // var py_object = new PythonShell(filename,options);
  
  // var previous_size = 0;
  // py_object.on('message', function (message) {
  //   try {
  //     console.log(message);
      
  //     var json_object = JSON.parse(message);
  //     if (current_size >= 0) {
  //       var total = json_object.Total;
  //       console.log(`Info from Python: ${total}`);
  //       total = parseInt(total);
  //       total = Math.round(total)
  //       current_size = previous_size - total; 
  //       console.log(`Current Balnce: ${current_size}`);
        
  //       size_percentage = (current_size/full_size);
  //       computed_height = size_percentage * 250;
  //       $("#water-level").animate({height:computed_height+'px'}); 
  //       ml_label.innerHTML = `${current_size} mL`;
  //     }else{
  //       //let python know that there is nothing left
  //       endDispenseCold(file);
  //       endDispenseHot(file);
  //       console.log('Nothing left!');
  //     }
  //   } catch (error) {
  //    throw error; 
  //   }
  // });

  // py_object.end(function (err,code,signal) {
  //   if (err) throw err;
  // });

  var params = {};
  params.Acc_ID = store.get('User_Information').Acc_ID;
  httpcustomrequest.http_post('Machine_Init.php',params,function(json_object) {
    store.set('Purchase_History',json_object.Purchase_History);
    store.set('Transaction_History',json_object.Transaction_History);
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
  $("button").click(function(){
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
          startDispenseHot(file);
          $(this).text("Stop");
          // $("#cold-button").prop('disabled',true);
        }else{
          data.command = 'stop';
          $('#toggle_switch').bootstrapToggle('enable');
          $(this).removeClass().addClass("btn btn-danger");
          $(this).text("HOT");
          // clearInterval(interval);
          previous_size = current_size;
          endDispenseHot(file);
          $("#cold-button").prop('disabled',false);
        }
          break;

        case "cold-button":
        if(current=="COLD"){
          data.command = 'start';
          $('#toggle_switch').bootstrapToggle('disable');
          $(this).removeClass().addClass("btn");
          startDispenseCold(file);
          $(this).text("Stop");
          $("#hot-button").prop('disabled',true)
        }else{
          data.command = 'stop';
          $('#toggle_switch').bootstrapToggle('enable');
          $(this).removeClass().addClass("btn btn-primary");
          $(this).text("COLD");
          endDispenseCold(file);
          $("#hot-button").prop('disabled',false)
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
          setRequestedAmount(file,amount,function(){
            if (current == 'HOT') {
              startDispenseHot(file);
            } else {
              startDispenseCold(file);
            }
            amount = 0;  
          });
        }
      });


    }
  });


  $('#toggle_switch').change(function() {
    if ($(this).prop('checked') == false) {
        toggle_state = 'Manual';
        toggle_operation(file,'Manual');
    }else{
      toggle_state = 'Automatic';
      toggle_operation(file,'Automatic');
    }
  });

    window.onbeforeunload = function (e) {
      PythonShell.terminate();
    };




}


function jsonWrite(file) {
  fs.writeFile('/home/pi/Documents/ReQuench_Machine/operations.json', JSON.stringify(file,null,6), function (err) {
    if (err) return console.log(err);
  });
}


function toggle_operation(file,operation) {
  if (operation == 'Manual') {
    file.Operation_Variables.Manual = 1; 
    file.Operation_Variables.Automatic = 0; 
  } else {
    file.Operation_Variables.Manual = 0; 
    file.Operation_Variables.Automatic = 1; 
  }  
  jsonWrite(file);
}

function setRequestedAmount(file,amount,callback) {
  file.Operation_Variables.Requested_Amount = amount; 
  jsonWrite(file);
  callback();
}

function startDispenseHot(file) {
  file.Command_Variable.Dispense_Hot = 1;
  file.Command_Variable.Dispense_Cold = 0; 
  jsonWrite(file);
}

function startDispenseCold(file) {
  file.Command_Variable.Dispense_Hot = 0;
  file.Command_Variable.Dispense_Cold = 1;
  jsonWrite(file);
}

function endDispenseHot(file) {
  file.Command_Variable.Dispense_Hot = 0;
  jsonWrite(file);
}
function endDispenseCold(file) {
  file.Command_Variable.Dispense_Cold = 0;
  jsonWrite(file);
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

// function startdispense(callback) {
//   var options = {
//     scriptPath: path.join(__dirname,'/python_scripts'),
//     args : [current_ml_dispensed]
//   }
//   var filename = 'manual_dispense.py';
//   var py_object = new PythonShell(filename,options);

//   PythonShell.run(filename, options, function (err, results) {
//     if (err) throw err;
//     current_ml_dispensed = results[0];
//     callback();
//   });

// }




function autostartdispense(amount,callback) {
  var options = {
    scriptPath: path.join(__dirname,'/python_scripts'),
    args : [amount]
  }
  var filename = 'test1.py';
  var filename2 = 'test2.py';
  var py_object = new PythonShell(filename,options);

  py_object.on('message', function (message) {
    callback(message);
  });

  py_object.end(function (err,code,signal) {
    if (err) throw err;
  });

}
