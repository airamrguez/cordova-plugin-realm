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

  function typeExists(type, schemas) {
    return schemas.some(function(schema) {
      return schema.name === type;
    });
  }

  function objectiveCTypeForNonOptionalType(propType, schemas) {
    var type = propType.type;
    switch (type) {
      case 'bool':
        return 'BOOL ';
      case 'int':
        return 'NSInteger ';
      case 'float':
        return 'float ';
      case 'double':
        return 'double ';
      case 'string':
        return 'NSString *';
      case 'date':
        return 'NSDate *';
      case 'list': {
        var objectType = propType.objectType;
        if (typeExists(objectType, schemas)) {
          return 'RLMArray<' + objectType + ' *><' + objectType + '> *';
        }
        throw new Error('type ' + propType.objectType + ' not found in schema');
      }
      default: {
        throw new Error('unsupported type ' + type);
      }
    }
  }

  function objectiveCTypeForOptionalType(type, schemas) {
    switch (type) {
      case 'bool':
        return 'NSNumber<RLMBool> *';
      case 'int':
        return 'NSNumber<RLMInt> *';
      case 'float':
        return 'NSNumber<RLMFloat> *';
      case 'double':
        return 'NSNumber<RLMDouble> *';
      case 'string':
        return 'NSString *';
      case 'date':
        return 'NSDate *';
      default:
        return type + ' *';
    }
  }

  /**
   * objectiveCType given a js type this function returns a equivalent objective-c type
   * @param {string} type is a javascript type.
   * @return {string} a equivalent objective-c type
   */
  function objectiveCType(propType, schemas) {
    if (typeof propType === 'string') {
      return objectiveCTypeForNonOptionalType({type: propType}, schemas);
    } else if (typeof propType === 'object') {
      if (propType.optional && propType.type === 'list') {
        throw new Error('A list type cannot be optional. Check propType ' +
          propType
        );
      }
      // object properties are always optional and do not need an optional designation.
      if (propType.optional || typeExists(propType.type, schemas)) {
        return objectiveCTypeForOptionalType(propType.type, schemas);
      }
      return objectiveCTypeForNonOptionalType(propType, schemas);
    }
    throw new Error('invalid property ' + propType);
  }

  // TODO
  function javaType(type) {
    return 'String';
  }

  function renderPlatformFile(platform, schemas) {
    var template = utils.getTemplate(platform);
    var objectsModel = template({
      schemas: schemas,
      objectiveCType: objectiveCType,
      javaType: javaType
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
