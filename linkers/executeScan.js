
function execScan() {
  let {PythonShell} = require('python-shell');
  let path = require('path');
  let $ = require("jquery");
  let Swal = require('sweetalert2');
  var sample_object = {};
  sample_object.mess = "Mello World";
  var scanningheader = document.getElementById('inputheader');
  var enterotpbutton = document.getElementById('enterotpbutton');
  var scaninterval;
  var timeout = 10;
  var options = {
    scriptPath: path.join(__dirname,'/python_scripts')
  }

  var tester = new PythonShell('/tester.py',options);
  $('#enterotpbutton').prop('disabled',true);
  tester.send("Start Scan");
  var secondpassed = 0;
     scaninterval =   setInterval(function() {
        scanningheader.style.visibility = "visible";
        if (scanningheader.textContent == "Scanning. . .") {
          scanningheader.textContent = "Scanning.";
        }else{
          scanningheader.textContent += " .";
        }
        secondpassed++;
        if (secondpassed == timeout) {
          scanningheader.style.visibility = "hidden";
          tester.terminate();
          $('#enterotpbutton').prop('disabled',false);
          clearInterval(scaninterval);
        }
    },1000);

  tester.on('message',function(message) {
    console.log(message);
    $('#enterotpbutton').prop('disabled',false);
    clearInterval(scaninterval);
    swal('Scanned ID. Welcome!',{
      html:'<button id="stop" class="btn btn-danger">Test</button>'
    });
    scanningheader.style.visibility = "hidden";
    tester.terminate();
  });


  tester.end(function (err,code,signal) {
  if (err) throw err;
  tester.terminate();
});

  // PythonShell.run('tester.py',options,function(err,results) {
  //   if (err) {
  //     throw err;
  //   }
  //   alert(results);
  // });

}
