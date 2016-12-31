#!/usr/bin/env node

module.exports = function(context) {
  var path = require('path');
  var fs = require('fs');
  var deferred = context.requireCordovaModule('q').defer();
  var opts = context.opts;
  var projectRoot = opts.projectRoot;

  var projectHooksDir = path.join(projectRoot, 'hooks');
  var realmHooksDir = path.join(projectHooksDir, '__realm');

  var deleteDirectoryRecursive = function(target) {
    if (fs.existsSync(target)) {
      fs.readdirSync(target).forEach(function(file, index) {
        var curPath = path.join(target, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteDirectoryRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(target);
    }
  };

  if (!fs.existsSync(realmHooksDir)) {
    return deferred.reject();
  }
  deleteDirectoryRecursive(realmHooksDir);
  process.stdout.write('Would you like to remove realmrc.json file? [y/N]');
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(input) {
    var value = input.trim().toLowerCase();
    if (['yes', 'y'].indexOf(value) >= 0) {
      fs.unlinkSync(path.join(projectRoot, 'realmrc.json'));
    }
    process.stdin.pause();
    deferred.resolve();
  }).resume();
  return deferred.promise;
};
