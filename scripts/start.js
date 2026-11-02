/**
 * 启动器：清掉 ELECTRON_RUN_AS_NODE 再拉起 Electron。
 *
 * 这台机器的环境里带着 ELECTRON_RUN_AS_NODE=1，直接执行 electron 会以纯 Node 身份启动，
 * 于是 require('electron') 拿到的是一串路径而不是 API，启动即崩。
 */
const { spawn } = require('node:child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = ['.', ...process.argv.slice(2)];
const child = spawn(electron, args, { stdio: 'inherit', env, windowsHide: false });

child.on('close', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
