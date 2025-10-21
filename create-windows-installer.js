const path = require('path');
const electronInstaller = require('electron-winstaller');

console.log('Mono path:', process.env.MONO_PATH || 'Not set');
console.log('Wine path:', process.env.WINE_PATH || 'Not set');
console.log('PATH:', process.env.PATH);

const createInstaller = async () => {
  try {
    console.log('Creating Windows installer...');
    
    const result = await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'out', 'kkcrop-win32-x64'),
      outputDirectory: path.join(__dirname, 'out', 'windows-installer'),
      authors: 'HunDegong',
      exe: 'kkcrop.exe',
      name: 'kkcrop',
      description: 'KKCrop图片处理工具',
      setupExe: 'KKCropInstaller.exe',
      setupIcon: '', // 如果有图标可以添加路径
    });
    
    console.log(`Successfully created installer at ${result}`);
  } catch (error) {
    console.error('Error creating Windows installer:', error);
  }
};

createInstaller();