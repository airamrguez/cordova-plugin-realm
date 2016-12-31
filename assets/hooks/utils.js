'use strict';

var fs = require('fs');
var ejs = require('./ejs');

var getRawTemplate = function(filename) {
  return fs.readFileSync(
    'hooks/__realm/templates/' + filename + '.tpl.ejs',
    'utf8'
  );
};

module.exports = {
  getTemplate: function(filename) {
    return ejs.compile(getRawTemplate(filename));
  },
  getFileExtension: function(platform) {
    switch (platform) {
      case 'ios':
        return 'h';
      case 'android':
        return 'java';
      default:
        throw new Error('platform ' + platform + ' not supported.');
    }
  },
  writeFile: function(path, content, cb) {
    fs.writeFile(path, content, function(error) {
      if (error) {
        cb(error);
        return;
      }
      cb(null);
    });
  },
  findAndReplaceInFile(regex, replacement, file) {
    fs.readFile(file, 'utf8', function(err, prevContent) {
      if (err) {
        throw err;
      }
      var newContent = prevContent.replace(regex, replacement);
      fs.writeFile(file, newContent, 'utf8', function(writeErr) {
        if (writeErr) {
          throw writeErr;
        }
      });
    });
  },
  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  typeExists(type, schemas) {
    return schemas.some(function(schema) {
      return schema.name === type;
    });
  }
};
