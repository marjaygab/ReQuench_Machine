// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const fs = require('fs');
let file = require('./maintenance_data');
let settings = require('./machine_settings');
const Store = require('electron-store');
const https = require('https');
const store = new Store();
const python_id_index = 1;
const js_id_index = 0;
const path = require('path')
var http = require('http').Server(app);
var io = require('socket.io')(http);
let { PythonShell } = require('python-shell');
var socket_ids = [];
var connection_counter = 0;
const cold_probe_path = '/sys/bus/w1/devices/28-0417824753ff/w1_slave';
const hot_probe_path = '/sys/bus/w1/devices/28-0316856147ff/w1_slave';
var py_object;
var machine_settings = settings;
//Use this for actual
var filename = 'main.py';

//User this for Windows testing
// var filename = 'main_windows.py';




machine_settings.status = "online";
jsonWrite(machine_settings,()=>console.log("Initialized"));

var options = {
    scriptPath: path.join(__dirname, '/python_scripts')
}

const admin = require('firebase-admin');
//var firebase_app = firebase.initializeApp({
//    apiKey: "AIzaSyC4zvxWTcj8gk7FmX0UMLqMP-2RrNSvzos",
//    authDomain: "requenchweb2019.firebaseapp.com",
//    databaseURL: "https://requenchweb2019.firebaseio.com",
//    projectId: "requenchweb2019",
//    storageBucket: "requenchweb2019.appspot.com",
//    messagingSenderId: "824630117884"
//  });


const serviceAccount = require('./requenchweb2019-firebase-adminsdk-ix063-8738f90a17.json');
admin.initializeApp({
     credential:admin.credential.cert(serviceAccount)
 });

const db = admin.firestore();






fs.watchFile('./machine_settings.json',(curr,prev)=>{
     fs.readFile('./machine_settings.json', (err, data) => {  
         if (err) throw err;
         machine_settings = JSON.parse(data);
         var mu_id = machine_settings.mu_id;
         
         var params = machine_settings;
        http_post('Update_Machine_State.php',params,function(response) {
          if (!response.Success) {
              console.error('Inserting Values Error');
          }else{
              console.log(response);
          }  
        },function(error) {
            console.error('HTTP Post Error ' + error);
        },function() {
            console.error('Network Timeout');
        });

        console.log('Im Here');


         db.collection('Machines').doc(`${mu_id}`).set(machine_settings)
         .then(()=>{
             console.log("Data inserted");
             setTimeout(()=>{
                if (machine_settings.status == 'offline') {
                 commandPy(io,{command:"Shutdown"});
                 }else if(machine_settings.status == 'rebooting'){
                     commandPy(io,{command:"Reboot"});
                 }
            },5000);
             
         })
         .catch(()=>{
             console.error('Firebase Error');
         });
     });
 });



http.listen(3000, function () {
    console.log('listening on *:3000');
});

io.on('connection', function (socket) {
    if (connection_counter >= 2) {
        socket_ids = [];
        connection_counter = 0;
    }
    socket_ids.push(socket.id);
    if (socket_ids.length == 2) {
        console.log(socket_ids);
    } else {
        console.log(socket_ids);
    }
    connection_counter++;
    
    socket.on('socket-event', function (msg) {
       	io.emit('socket-event', msg);
        if(msg.content.type != 'TEMP_READING'){
            console.log(msg);
        }
        
    });

    socket.on('reconnect', function () {
        console.log('User has reconnected');
    });
    socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
            // the disconnection was initiated by the server, you need to reconnect manually
            socket.connect();
        } else {
            console.log('Python has disconnected');

        }
        // else the socket will automatically try to reconnect
    });

});

py_object = new PythonShell(filename, options);

//listens for print() from main.py
py_object.on('message', function (message) {
    if (message == 'Ready') {
        py_ready = true;
        console.log('Python is running')
    }else{
        console.log(message);
    }
});

//end the current print stdout
py_object.end(function (err, code, signal) {
    if (err) throw err;
});


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let vkb;
function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({ width: 500, height: 856 })
    // and load the index.html of the app.
    if (!file.from_maintenance) {
        mainWindow.loadFile('index.html');
    } else {
        mainWindow.loadFile('admin.html');
    }

    store.set('path', app.getPath('userData'));
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        commandPy(io, { command: 'Terminate' });
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        machine_settings.status = "offline";
        jsonWrite(machine_settings,()=>{
            fs.readFile('./machine_settings.json', (err, data) => {  
                if (err) throw err;
                machine_settings = JSON.parse(data);
                var mu_id = machine_settings.mu_id;
                console.log(mu_id);
                try {

                    var params = machine_settings;
                    http_post('Update_Machine_State.php',params,function(response) {
                        if (!response.Success) {
                            console.error('Inserting Values Error');
                        }else{
                            db.collection('Machines').doc(`${mu_id}`).set(machine_settings)
                            .then(()=>{
                                console.log("Data inserted");
                                app.quit();
                            });        
                        }  
                    },function(error) {
                        console.error(error);
                    },function() {
                        console.error('Network Timeout');
                    });
      
                } catch (error) {
                    console.log('Firebase Error: ' + error);
                }

                
            });
        });
    }
})

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function commandPy(io, content) {
    var msg = {
        destination: 'Python',
        content: content
    };
    io.emit('socket-event', msg);
}
function jsonWrite(file,callback) {
    // Use this path for windows.
    //var file_path = 'C:/xampp/htdocs/ReQuench_Machine/machine_settings.json';
    //Use this path for RasPi
    var file_path = '/home/pi/Documents/ReQuench_Machine/machine_settings.json';
    fs.writeFile(file_path, JSON.stringify(file, null, 6), function (err) {
        if (err) return console.log(err);
        callback();
    });
}

function http_post(url, parameters, fn_response, fn_error, timeout_cb) {
    console.log('Called');
    var timeout_callback = timeout_cb || function(){};
    const data = JSON.stringify(parameters);
    const options = {
        hostname: 'requench-rest.herokuapp.com',
        port: 443,
        path: `/${url}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        timeout:15000
    }

    const req = https.request(options, (res) => {
        res.on('data', (d) => {
            var data_string = d.toString('utf8');
            var new_data_string = `${data_string}`;
            var json_object = tryParse(new_data_string);
            if (json_object != false) {
                console.log(json_object);
                fn_response(json_object);
            } else {
                fn_response(false);
            }
        });
    });
    req.on('error', (error) => {
        fn_error(error);
    });

    // request.setTimeout(() => {
    //     request.abort();
    //     timeout_callback();
    // }, 15000);

    req.on('timeout', (error) => {
        request.abort();
        timeout_callback();
    });

    req.write(data);
    req.end();

}

function tryParse(jsonString) {
    try {
        console.log(jsonString);
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return o;
        }
    } catch (error) {
        console.log(error)
        console.log(jsonString);

    }
    return false
}
