import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import started from 'electron-squirrel-startup';

// 为ES模块环境提供__dirname和__filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 确保应用单实例运行
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时，聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // 允许加载本地资源
    },
    title: 'KKCrop图片等比分割工具',
    // 设置应用图标 - 根据不同操作系统使用对应的图标格式
    icon: process.platform === 'darwin' 
      ? path.join(__dirname, '../assets/icon.icns') 
      : path.join(__dirname, '../assets/icon.ico')
  });

  // 创建自定义菜单栏，完全替换默认的Electron菜单
  const template = [
    {
      label: 'KKCrop',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => { app.quit(); }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于我们',
          click: () => {
            dialog.showMessageBox({
              title: '关于我们',
              message: 'KKCrop图片等比分割工具',
              detail: '作者信息：\n昏德公\n\n免责声明：\n本软件仅用于学习和研究目的。\n使用本软件所产生的一切后果由用户自行承担，\n作者不承担任何法律责任。\n\n版本：1.0.0',
              buttons: ['确定'],
              icon: process.platform === 'darwin' 
                ? path.join(__dirname, '../assets/icon.icns') 
                : path.join(__dirname, '../assets/icon.ico'),
              type: 'info'
            });
          }
        }
      ]
    }
  ];
  
  // 添加开发工具菜单项（仅在开发环境中显示）
  if (process.env.NODE_ENV === 'development') {
    template.push({
      label: '开发',
      submenu: [
        {
          label: '切换开发者工具',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => { mainWindow.webContents.toggleDevTools(); }
        }
      ]
    });
  };

  // 构建菜单
  const menu = Menu.buildFromTemplate(template);
  
  // 设置应用菜单
  Menu.setApplicationMenu(menu);

  // 根据环境加载不同的URL
  if (process.env.NODE_ENV === 'development') {
    // 开发环境加载Vite开发服务器，使用环境变量PORT或默认5173端口
    const PORT = process.env.PORT || 5173;
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } else {
    // 在生产环境中，HTML文件位于Vite构建的输出目录中
    mainWindow.loadFile(path.join(__dirname, '../../.vite/renderer/main_window/index.html'));
  }

  // 打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 选择图片文件
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 分割图片功能 - 实际处理图片
ipcMain.handle('split-image', async (event, { imagePath, rows, cols }) => {
  try {
    // 导入sharp库进行图像处理
    const sharp = await import('sharp');
    
    // 获取原始图像的信息
    const image = sharp.default(imagePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    // 计算每个分割块的尺寸
    const pieceWidth = Math.floor(width / cols);
    const pieceHeight = Math.floor(height / rows);
    
    // 实际分割图片
    const pieces = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // 计算当前块的裁剪区域
        const left = col * pieceWidth;
        const top = row * pieceHeight;
        
        // 裁剪图片并转换为base64格式
        const buffer = await image
          .clone()
          .extract({ left, top, width: pieceWidth, height: pieceHeight })
          .toBuffer();
        
        // 转换为data URL
        const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
        
        pieces.push({
          row,
          col,
          dataUrl,
          // 添加实际的位置和尺寸信息
          x: left,
          y: top,
          width: pieceWidth,
          height: pieceHeight
        });
      }
    }
    
    return {
      success: true,
      message: `成功分割为 ${rows}×${cols} = ${rows*cols} 个块`,
      pieces,
      imagePath,
      rows,
      cols
    };
  } catch (error) {
    console.error('分割图片时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 保存为文件功能
ipcMain.handle('save-as-files', async (event, data) => {
  try {
    const { pieces, originalPath, rows, cols } = data;
    const fsModule = await import('node:fs');
    const pathModule = await import('node:path');
    const electron = await import('electron');
    const fs = fsModule.default;
    const path = pathModule.default;
    const { dialog } = electron;
    
    // 显示保存对话框，让用户选择保存目录
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择保存目录'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const saveDir = result.filePaths[0];
      const originalName = path.basename(originalPath, path.extname(originalPath));
      const fileExt = path.extname(originalPath).toLowerCase();
      
      // 确保文件扩展名是图片格式
      const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
      const ext = validExts.includes(fileExt) ? fileExt : '.png';
      
      // 创建保存子目录
      const outputDir = path.join(saveDir, `${originalName}_split_${cols}x${rows}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 保存每个分割块
      for (const piece of pieces) {
        // 提取base64数据
        const base64Data = piece.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 生成文件名 (列_行 格式)
        const fileName = `${originalName}_${piece.col + 1}x${piece.row + 1}${ext}`;
        const filePath = path.join(outputDir, fileName);
        
        // 写入文件
        fs.writeFileSync(filePath, buffer);
      }
      
      return {
        success: true,
        message: `成功保存了 ${pieces.length} 个图片文件到目录: ${outputDir}`,
        saveDir: outputDir
      };
    } else {
      return {
        success: false,
        message: '用户取消了保存操作'
      };
    }
  } catch (error) {
    console.error('保存文件时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 保存为PDF功能
ipcMain.handle('save-as-pdf', async (event, data) => {
  try {
    const { pieces, originalPath, rows, cols } = data;
    const pathModule = await import('node:path');
    const electron = await import('electron');
    const fsModule = await import('node:fs');
    const pdfLib = await import('pdf-lib');
    
    const path = pathModule.default;
    const { dialog } = electron;
    const fs = fsModule.default;
    const { PDFDocument } = pdfLib.default;
    
    // 显示保存对话框，让用户选择保存位置和文件名
    const result = await dialog.showSaveDialog({
      title: '保存为PDF',
      defaultPath: path.join(path.dirname(originalPath), `${path.basename(originalPath, path.extname(originalPath))}_split_${cols}x${rows}.pdf`),
      filters: [{
        name: 'PDF文件',
        extensions: ['pdf']
      }]
    });
    
    if (!result.canceled && result.filePath) {
      // 创建新的PDF文档
      const pdfDoc = await PDFDocument.create();
      
      // A4页面大小（210mm × 297mm）
      const a4Width = 595.28;
      const a4Height = 841.89;
      
      // 页边距
      const margin = 20;
      
      // 为每个图片块添加单独的页面
      for (const piece of pieces) {
        try {
          // 提取base64数据
          const base64Data = piece.dataUrl.replace(/^data:image\/\w+;base64,/, '');
          
          // 将base64转换为ArrayBuffer
          const imgBytes = Buffer.from(base64Data, 'base64');
          
          // 将图片添加到PDF
          const image = await pdfDoc.embedPng(imgBytes);
          
          // 添加一个A4页面
          const page = pdfDoc.addPage([a4Width, a4Height]);
          
          // 计算图片在页面上的大小和位置（居中显示）
          // 计算最大可显示尺寸，保留页边距
          const maxDisplayWidth = a4Width - (margin * 2);
          const maxDisplayHeight = a4Height - (margin * 2);
          
          // 计算图片的缩放比例，保持原始宽高比
          const widthScale = maxDisplayWidth / image.width;
          const heightScale = maxDisplayHeight / image.height;
          const scale = Math.min(widthScale, heightScale, 1); // 不放大，只缩小
          
          // 计算缩放后的图片尺寸
          const imgWidth = image.width * scale;
          const imgHeight = image.height * scale;
          
          // 计算居中位置
          const x = (a4Width - imgWidth) / 2;
          const y = (a4Height - imgHeight) / 2;
          
          // 绘制图片（居中显示）
          page.drawImage(image, {
            x: x,
            y: y,
            width: imgWidth,
            height: imgHeight
          });
        } catch (imgError) {
          console.warn(`处理图片块 (${piece.col}×${piece.row}) 时出错:`, imgError);
          // 跳过这个图片块，继续处理其他块
        }
      }
      
      // 保存PDF到文件
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(result.filePath, pdfBytes);
      
      return {
        success: true,
        message: `成功保存PDF文件到: ${result.filePath}`,
        filePath: result.filePath
      };
    } else {
      return {
        success: false,
        message: '用户取消了保存操作'
      };
    }
  } catch (error) {
    console.error('保存PDF时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
