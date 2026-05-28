// system-info.js
const os = require('os');
const fs = require('fs');

function getSystemInfo() {
  const info = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    cpus: os.cpus(),
    loadavg: os.loadavg(),
    networkInterfaces: os.networkInterfaces(),
    userInfo: os.userInfo()
  };

  return info;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function printSystemInfo() {
  const info = getSystemInfo();
  
  console.log('=== System Information ===');
  console.log(`Hostname: ${info.hostname}`);
  console.log(`Platform: ${info.platform}`);
  console.log(`Architecture: ${info.arch}`);
  console.log(`Release: ${info.release}`);
  console.log(`Uptime: ${Math.floor(info.uptime / 3600)} hours`);
  console.log(`Total Memory: ${formatBytes(info.totalmem)}`);
  console.log(`Free Memory: ${formatBytes(info.freemem)}`);
  console.log(`Memory Usage: ${(100 - (info.freemem / info.totalmem) * 100).toFixed(2)}%`);
  console.log(`CPU Load Average: ${info.loadavg.map(avg => avg.toFixed(2)).join(', ')}`);
  console.log(`User: ${info.userInfo.username} (UID: ${info.userInfo.uid}, GID: ${info.userInfo.gid})`);
  
  console.log('\n=== CPU Information ===');
  info.cpus.forEach((cpu, index) => {
    console.log(`CPU ${index}: ${cpu.model}`);
    console.log(`  Speed: ${cpu.speed} MHz`);
    console.log(`  Times: user=${cpu.times.user}, nice=${cpu.times.nice}, sys=${cpu.times.sys}, idle=${cpu.times.idle}`);
  });
  
  console.log('\n=== Network Interfaces ===');
  Object.keys(info.networkInterfaces).forEach(iface => {
    console.log(`${iface}:`);
    info.networkInterfaces[iface].forEach(addr => {
      console.log(`  ${addr.family} ${addr.address} ${addr.internal ? '(internal)' : '(external)'}`);
    });
  });
}

printSystemInfo();