#!/usr/bin/env node

module.exports = function (ctx) {
    var https = require('https');
    var fs = require('fs');
    var zlib = require('zlib');
    var exec = require('child_process').exec;

    var q = ctx.requireCordovaModule('q');

    var pluginDir = ctx.opts.plugin.dir;
    var zipDestPath = 'plugins/cordova-plugin-realm/src/ios';
    var localZipPath = zipDestPath + '/Realm.zip';

    var download = function () {
        var deferred = q.defer();
        var zipFile = fs.createWriteStream(localZipPath);
        var url = "https://static.realm.io/downloads/objc/realm-objc-2.10.2.zip";
        console.log('Downloading iOS Realm framework. This can take a while ...');
        https.get(url, function (response) {
            response.pipe(zipFile);
            zipFile.on('finish', function () {
                console.log('Framework download completed successfully.')
                zipFile.close(deferred.resolve);
            }).on('error', function (err) {
                fs.unlink(zipFile);
                deferred.reject(err);
            });
        }).on('error', function (err) {
            console.log('Error downloading iOS Realm Framework', err);
            fs.unlink(dest);
            deferred.reject(err);
        });
        return deferred.promise;
    };

    var unzip = function () {
        console.log('Unzipping', localZipPath, '...');
        var deferred = q.defer();
        var unzipCmd = ['unzip -o', localZipPath, '-d', zipDestPath];
        var renameCmd = ['rsync -a', zipDestPath + '/realm-objc-2.10.2', pluginDir + '/src/ios/realm-framework'];
        var cmd = [unzipCmd.join(' '), renameCmd.join(' ')].join(' && ');
        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                console.error(stderr);
                deferred.reject(err);
                return;
            }
            console.log('Unzipped.');
            deferred.resolve();
        });
        return deferred.promise;
    };

    return download().then(unzip);
};