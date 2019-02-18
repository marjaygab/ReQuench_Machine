// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')

const Store = require('electron-store');
const store = new Store();
const python_id_index = 1;
const js_id_index = 0;
var http = require('http').Server(app);
var io = require('socket.io')(http);
var socket_ids = [];
var connection_counter = 0;
http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
  if (connection_counter >= 2) {
    socket_ids = [];
    connection_counter = 0; 
  }
  socket_ids.push(socket.id);
  if (socket_ids.length == 2) {
    console.log(socket_ids);
  }else{
    console.log(socket_ids);
  }
  connection_counter++;
  socket.on('socket-event', function(msg){
    if (socket_ids.length == 2) {
      if(msg.destination === 'Python'){
        io.to(socket_ids[python_id_index]).emit('socket-event',msg.content);
      }else if(msg.destination === 'JS'){
        io.to(socket_ids[js_id_index]).emit('socket-event',msg.content);
      }else{
        console.log(msg);
      }  
    }
  });

  socket.on('reconnect',function() {
    console.log('User has reconnected');
  });


});


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let vkb;
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 500, height: 856})
  // and load the index.html of the app.
  mainWindow.loadFile('index.html');
  store.set('path',app.getPath('userData'));
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
