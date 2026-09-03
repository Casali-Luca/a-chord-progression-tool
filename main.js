const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('public/index.html');
}

app.whenReady().then(createWindow);
