#!/usr/bin/env node

'use strict';

module.exports = function(context) {
  var path = require('path');
  var Schema = require('./Schema');
  var JavaBuilder = require('./JavaBuilder');
  var ObjcBuilder = require('./ObjcBuilder');

  var opts = context.opts;
  var platforms = opts.cordova.platforms;
  var projectRoot = opts.projectRoot;
  var realmrc = require(path.join(opts.projectRoot, 'realmrc.json'));
  var pluginSrcDir = path.resolve(
    projectRoot, 'plugins', 'cordova-plugin-realm', 'src'
  );
  var ConfigParser = context.requireCordovaModule(
    'cordova-common/src/ConfigParser/ConfigParser'
  );
  var configFile = path.resolve(context.opts.projectRoot, 'config.xml');
  var config = new ConfigParser(configFile);

  function createRealmModels() {
    var schemas = realmrc.schemas;
    if (!Array.isArray(schemas)) {
      return;
    }

    var schema = new Schema(schemas);
    var dependencyGraph = schema.createDependencyGraph();
    var sortedSchemas = schema.sortSchemas(dependencyGraph);
    var project = {
      name: config.name(),
      projectRoot: projectRoot,
      pluginSrcDir: pluginSrcDir
    };

    platforms.forEach(function(platform) {
      var builder = null;
      switch (platform) {
        case 'ios':
          builder = new ObjcBuilder(project, sortedSchemas);
          break;
        case 'android':
          builder = new JavaBuilder(project, sortedSchemas);
          break;
        default:
          console.warn('Platform ', platform, ' is not supported.');
      }

      if (builder) {
        builder.generateSourceFiles();
      }
    });
  }

  createRealmModels();
};
