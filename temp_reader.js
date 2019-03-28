const fs = require('fs');
const file_path = 'E:/xampp/htdocs/ReQuench_Machine/test.txt';

var read = function(){
    fs.readFile(file_path,'utf8',function(err,data) {
        var index = data.indexOf('t=');
        var temp = data.substring(index+2,data.length);
        var temperature = parseInt(temp)/1000
        console.log(temperature);
    });
}

setInterval(read,1000);