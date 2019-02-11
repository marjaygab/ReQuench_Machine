
exports.httpRequest = function(method,url,parameters,fn) {
    var xhr = new XMLHttpRequest();
    var parameter_objects = {};
    xhr.timeout = 60000;
    xhr.open(method,url,true);
    xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
    var data = JSON.stringify(parameters);
    xhr.send(data);
    xhr.onreadystatechange = fn;
}


exports.http_post = function(url,parameters,fn_response,fn_error) {
  const https = require('https')
  const data = JSON.stringify(parameters)
  console.log('Http Post Entry');
  
  const options = {
    hostname: 'requench.herokuapp.com',
    port: 443,
    path: `/${url}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  const req = https.request(options, (res) => {
    res.on('data', (d) => {
      console.log('Response');
      var data_string = d.toString('utf8');
      var new_data_string = `${data_string}`;
      var json_object = JSON.parse(new_data_string);
      fn_response(json_object);
    });
  });
  req.on('error', (error) => {
    fn_error(error);
  });

  req.write(data)
  req.end()
}

exports.tester = function(a) {
  var xhr = new XMLHttpRequest();
  var sampleobject = {};
  sampleobject.Acc_ID = a;
  var data = JSON.stringify(sampleobject);
  xhr.open('POST',"http://requench.000webhostapp.com/Tester.php",true);
  xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
  console.log(data);
  xhr.send(data);
  xhr.onreadystatechange = function(e) {
    console.log(xhr.status);
    if(xhr.readyState == 4 && xhr.status == 200){
      var response = this.responseText;
      response = response.replace('[','');
      response = response.replace(']','');
      console.log(response);
      var obj = JSON.parse(response);
      console.log(typeof(xhr.response));
      console.log(typeof(obj));
      console.log(obj.Acc_ID);
    }
  };
}
