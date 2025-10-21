const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const fs = require('fs');
const path = require('path');

module.exports = {
  packagerConfig: {
    // 使用 asar，并确保 sharp 及其平台二进制包(@img)解包到 app.asar.unpacked
    asar: { smartUnpack: true, unpack: '**/node_modules/sharp/**', unpackDir: '**/node_modules/@img/**' },
    // 平台特定的图标配置 - 使用条件配置以避免类型错误
    icon: './assets/icon', // 默认图标路径，会根据平台自动添加相应的扩展名
    // 使用自定义的Info.plist文件以确保图标设置正确
    extendInfoFrom: './custom_info.plist',
    // 复制关键运行时依赖到构建产物，确保 require() 可解析
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      try {
        // 同时复制 sharp 的平台可选依赖（@img），避免运行时报缺失
        const modulesToCopy = ['sharp', 'detect-libc', 'semver'];
        const extraDirsToCopy = [{ src: path.resolve(__dirname, 'node_modules', '@img'), dest: path.join(buildPath, 'node_modules', '@img') }];
        const copyRecursiveSync = (src, dest) => {
          if (!fs.existsSync(src)) return;
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          for (const entry of fs.readdirSync(src)) {
            const srcEntry = path.join(src, entry);
            const destEntry = path.join(dest, entry);
            const stat = fs.statSync(srcEntry);
            if (stat.isDirectory()) {
              copyRecursiveSync(srcEntry, destEntry);
            } else {
              fs.copyFileSync(srcEntry, destEntry);
            }
          }
        };
        for (const mod of modulesToCopy) {
          const srcDir = path.resolve(__dirname, 'node_modules', mod);
          const destDir = path.join(buildPath, 'node_modules', mod);
          if (fs.existsSync(srcDir)) {
            copyRecursiveSync(srcDir, destDir);
          }
        }
        // 复制整个 @img 目录（含 sharp-win32-x64）到构建产物
        for (const dir of extraDirsToCopy) {
          if (fs.existsSync(dir.src)) {
            copyRecursiveSync(dir.src, dir.dest);
          }
        }
      } catch (e) {
        // 忽略复制失败，继续打包流程
      }
      callback();
    }]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'kkcrop',
        authors: 'HunDegong',
        exe: 'kkcrop.exe',
        description: 'A crop tool application'
      },
      platforms: ['win32']
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // 自动解包原生模块，补充 asar unpack 配置
    new AutoUnpackNativesPlugin(),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // 允许从 app.asar.unpacked 加载原生模块（如 sharp）
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};
