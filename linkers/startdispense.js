
<<<<<<< HEAD
function startdispense(data) {
=======
function startdispense(mldispensed) {
>>>>>>> 254b077200f16f71a9e993095d2a6811d4d7a911
  let $ = require('jquery');
  let {PythonShell} = require('python-shell');
  let path = require('path');
  var command = data.command;


  var options = {
    scriptPath: path.join(__dirname,'/python_scripts'),
<<<<<<< HEAD
    args: [data.command]
  }


  var filename = 'trigger_dispense.py';
  var py_object = new PythonShell(filename,options);

  PythonShell.run(filename, options, function (err, results) {
    if (err) throw err;
    console.log('results: %j', results);
  });

=======
  }

  options.args = [mldispensed];
  var filename = 'manual_dispense.py';
  var py_object = new PythonShell(filename,options);


  py_object.on('message',function(message) {
    mldispensed = message;
    console.log(process.argv);
  });
>>>>>>> 254b077200f16f71a9e993095d2a6811d4d7a911

  // PythonShell.run(filename, options, function (err, results) {
  //   if (err) throw err;
  //
  // });


  if (py_object.terminated) {
    console.log('Python Terminated');
  }


  return mldispensed;
}
