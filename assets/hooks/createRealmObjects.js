#!/usr/bin/env node

module.exports = function(context) {
  var path = require('path');
  var utils = require('./utils.js');
  var realmrc = require('../realmrc.json');

  var opts = context.opts;
  var platforms = opts.cordova.platforms;
  var projectRoot = opts.projectRoot;
  var pluginSrcDir = path.resolve(
    projectRoot,
    'plugins',
    'cordova-plugin-realm',
    'src'
  );

  // TODO
  function objectiveCType(type) {
    return 'NSString*';
  }

  // TODO
  function javaType(type) {
    return 'String';
  }

  function renderPlatformFile(platform, schemas) {
    var template = utils.getTemplate(platform);
    var objectsModel = template({
      schemas,
      objectiveCType,
      javaType
    });
    var ext = utils.getFileExtension(platform);
    var fileName = 'Models.' + ext;
    var targetDest = path.join(pluginSrcDir, platform, fileName);
    utils.writeFile(targetDest, objectsModel, function(err) {
      if (err) {
        throw new Error('could not write schema ');
      }
      console.info('Created ', targetDest);
    });
  }

  function createNativeObjects() {
    var schemas = realmrc.schemas;
    if (!Array.isArray(schemas)) {
      return;
    }
    platforms.forEach(function(platform) {
      renderPlatformFile(platform, schemas);
    });
  }

  createNativeObjects();
};
