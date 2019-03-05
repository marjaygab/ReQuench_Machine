// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const fs = require('fs');
let file = require('./maintenance_data');
const Store = require('electron-store');
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
var filename = 'main.py';
var options = {
    scriptPath: path.join(__dirname, '/python_scripts')
}




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
        console.log(msg);
        io.emit('socket-event', msg);
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

var read_temp = function () {
    fs.readFile(cold_probe_path, 'utf8', function (err, data) {
        var index = data.indexOf('t=');
        var temp = data.substring(index + 2, data.length);
        var temperature = parseInt(temp) / 1000
        temperature = Math.round(temperature);
        console.log(temperature);
        cold_label.innerHTML = `${temperature}`;
        store.set('Cold_Temp',temperature);
        if (temperature <= 5) {
            commandPy(io, { command: 'Compressor Off' });
        } else if (temperature >= 7) {
            commandPy(io, { command: 'Compressor On' });
        }
    });

    fs.readFile(hot_probe_path, 'utf8', function (err, data) {
        var index = data.indexOf('t=');
        var temp = data.substring(index + 2, data.length);
        var temperature = parseInt(temp) / 1000
        temperature = Math.round(temperature);
        console.log(temperature);
        store.set('Hot_Temp',temperature);
        hot_label.innerHTML = `${temperature}`;
        if (temperature <= 5) {
            commandPy(io, { command: 'Heater Off' });
        } else if (temperature >= 7) {
            commandPy(io, { command: 'Heater On' });
        }
    });
}




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
        app.quit()
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
    socket.emit('socket-event', msg);
}