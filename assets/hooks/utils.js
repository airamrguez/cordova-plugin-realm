var fs = require('fs');
var ejs = require('./ejs');

var getRawTemplate = function(platform) {
  var filename;
  switch (platform) {
    case 'ios':
      filename = 'Objc.tpl';
      break;
    case 'java':
      filename = 'Java.tpl';
      break;
    default:
      throw new Error('platform ' + platform + ' not supported.');
  }
  return fs.readFileSync('hooks/realm/templates/' + filename + '.ejs', 'utf8');
};

module.exports = {
  getTemplate: function(platform) {
    return ejs.compile(getRawTemplate(platform));
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
  }
};
