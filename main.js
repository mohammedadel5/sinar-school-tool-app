const { app, BrowserWindow, ipcMain, Menu, dialog, nativeImage } = require('electron');
const path = require('path');
const pkg = require('./package.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    title: pkg.productName || 'Sinar School Tool',
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
}

function createAppMenu() {
  const isMac = process.platform === 'darwin';
  const productName = pkg.productName || app.name || 'Sinar School Tool';
  const aboutLabel = `${isMac ? 'حول' : 'About'} ${productName}`;

  function showAbout() {
    const appIcon = nativeImage.createFromPath(
      path.join(
        __dirname,
        'build',
        process.platform === 'darwin'
          ? 'icon.icns'
          : process.platform === 'win32'
            ? 'icon.ico'
            : 'icon.png'
      )
    );
    const iconImage = appIcon && !appIcon.isEmpty() ? appIcon : undefined;

    if (isMac && typeof app.setAboutPanelOptions === 'function' && typeof app.showAboutPanel === 'function') {
      app.setAboutPanelOptions({
        applicationName: productName,
        applicationVersion: pkg.version || app.getVersion(),
        copyright: (pkg.build && pkg.build.copyright) || '',
        credits: pkg.description || '',
        icon: iconImage
      });
      app.showAboutPanel();
      return;
    }
    dialog.showMessageBox({
      type: 'info',
      icon: iconImage,
      title: aboutLabel,
      message: productName,
      detail: pkg.description || '',
      buttons: ['OK']
    });
  }

  const template = [];

  if (isMac) {
    template.push({
      label: productName,
      submenu: [
        { label: aboutLabel, click: showAbout },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  template.push(
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        { label: aboutLabel, click: showAbout }
      ]
    }
  );

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  app.setName(pkg.productName || 'Sinar School Tool');
  createAppMenu();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
