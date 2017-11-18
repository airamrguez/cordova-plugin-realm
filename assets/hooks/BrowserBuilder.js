'use strict';

var utils = require('./utils');
var path = require('path');

function generateSource(targetDest, templateName, schemas) {
  var template = utils.getTemplate(templateName);
  var objectsModel = template({
    schemas: schemas
  });
  utils.writeFile(targetDest, objectsModel, function(err) {
    if (err) {
      throw new Error('could not write schema @ ' + targetDest);
    }
    console.info('Created ', targetDest);
  });
}

function BrowserBuilder(project, schemas) {
  this.project = project;
  this.schemas = schemas;
}

BrowserBuilder.prototype.generateSourceFiles = function() {
  var project = this.project;
  var schemas = this.schemas;
  var pluginBrowserPath = path.join('browser', 'client', 'schemaProxy.js');
  ['www' /*, 'platform_www'*/]
    .map(function(part) {
      return {
        tpl: 'BrowserAMD',
        dir: path.resolve(
          project.projectRoot,
          'platforms',
          'browser',
          part,
          'plugins',
          'cordova-plugin-realm',
          'src',
          pluginBrowserPath
        )
      };
    })
    .concat([
      {
        tpl: 'Browser',
        dir: path.resolve(project.pluginSrcDir, pluginBrowserPath)
      }
    ])
    .forEach(function(item) {
      generateSource(item.dir, item.tpl, schemas);
    });
};

module.exports = BrowserBuilder;
