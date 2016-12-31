#!/usr/bin/env node

module.exports = function(context) {
  var path = require('path');
  var fs = require('fs');
  var deferred = context.requireCordovaModule('q').defer();

  var opts = context.opts;
  var projectRoot = opts.projectRoot;
  var pluginDir = context.opts.plugin.dir;

  var projectHooksDir = path.join(projectRoot, 'hooks');
  var realmHooksDir = path.join(projectHooksDir, '__realm');
  var pluginAssetsDir = path.join(pluginDir, 'assets', 'hooks');
  var realmConfigFileTpl = path.join(pluginDir, 'assets', 'realmrc.json');
  var realmConfigFileDest = path.resolve(projectRoot, 'realmrc.json');

  var copyFile = function(src, dest) {
    fs.createReadStream(src).pipe(fs.createWriteStream(dest));
  };

  var copyRecursiveSync = function(src, dest) {
    var exists = fs.existsSync(src);
    var stats = exists && fs.statSync(src);
    var isDirectory = exists && stats.isDirectory();
    if (exists && isDirectory) {
      fs.mkdirSync(dest);
      fs.readdirSync(src).forEach(function(childItemName) {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      copyFile(src, dest);
    }
  };

  if (fs.existsSync(realmHooksDir)) {
    var errMessage =
      'A __realm hook directory already exists. Aborting hooks copy. ' +
      'If you removed realm plugin manually then remove that folder.'
    ;
    console.error(errMessage);
    return deferred.reject(errMessage);
  }

  // Copy hooks.
  if (!fs.existsSync(projectHooksDir)) {
    fs.mkdirSync(projectHooksDir);
  }
  copyRecursiveSync(pluginAssetsDir, realmHooksDir);

  // Copy realmrc.json file.
  if (!fs.existsSync(realmConfigFileDest)) {
    copyFile(realmConfigFileTpl, realmConfigFileDest);
  }
  return deferred.resolve();
};
