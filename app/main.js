const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Student Planner',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

// Handle Claude API calls from renderer via IPC
ipcMain.handle('claude-chat', async (event, { apiKey, messages }) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a helpful AI tutor built into a student planner app. Help students with homework, explain concepts, quiz them, give study tips, and motivate them. Keep answers concise and student-friendly. Use simple language. If solving math or science, show step-by-step work.',
      messages
    });

    const request = net.request({
      method: 'POST',
      protocol: 'https:',
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    let responseData = '';

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            resolve({ error: parsed.error.message });
          } else {
            const text = parsed.content?.[0]?.text || 'No response';
            resolve({ text });
          }
        } catch {
          resolve({ error: 'Failed to parse response' });
        }
      });
    });

    request.on('error', (err) => {
      resolve({ error: err.message });
    });

    request.write(postData);
    request.end();
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
