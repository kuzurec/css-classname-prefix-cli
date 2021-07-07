#!/usr/bin/env node

const program = require('commander')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path');
const ora = require('ora');
const spinner = ora('Loading undead unicorns')
const addPrefix = require('./addPrefix');

const fileStat = (fileDir) => {
  return new Promise(resolve => {
    fs.stat(fileDir, (err, stats) => {
      if (err) {
        spinner.fail(chalk.red('读取文件stats失败 \n' + err))
        process.exit()
      } else {
        resolve(stats)
      }
    })
  })
}

const readDir = (filePath) => {
  return new Promise(resolve => {
    fs.readdir(filePath, (err, files) => {
    if (err) {
      spinner.fail(chalk.red('文件路径无效 \n' + err));
      process.exit();
    } else {
      resolve(files)
    }
  })})
}

const fileScan = async (filePath, prefixName) => {
  const files = await readDir(filePath);

  files.forEach(async filename => {
    const fileDir = path.join(filePath, filename);
    const stats = await fileStat(fileDir);

    if(stats.isFile()) {
      try {
        addPrefix(prefixName, fileDir, path.extname(fileDir))
        spinner.succeed(chalk.green(`${fileDir} 添加前缀成功`))
      } catch(err) {
        spinner.fail(chalk.red(`${fileDir} 添加前缀失败 \n` + err));
        process.exit();
      }
    }

    if(stats.isDirectory() && filename !== 'node_modules') {
      await fileScan(fileDir, prefixName)
    }
  })
}


program
.command('add <prefix_name>')
.option('-d, --dir <dir>', 'Which dir to use', './build')
.action((prefix_name, options) => {
  spinner.start('开始添加前缀')
  
  const { dir } = options;
  const filePath = path.resolve(dir)

  fileScan(filePath, prefix_name)
})

program.parse(process.argv)
