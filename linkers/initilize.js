function initialize(data) {
  let $ = require('jquery');
  let {PythonShell} = require('python-shell');
  let path = require('path');
  var options = {
    scriptPath: path.join(__dirname,'/python_scripts')
  }
  var filename = '/init.py';
  var py_object = new PythonShell(filename,options);

  py_object.send(JSON.stringify(data));
  
  py_object.on('message',function(message) {
    //handle things here for python response
  });

  py_object.end(function (err,code,signal) {
  if (err) throw err;
  tester.terminate();
});

}
