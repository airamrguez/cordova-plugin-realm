#!/usr/bin/env node

'use strict';

module.exports = function (ctx) {
    var npm = require('npm');
    var fs = require('fs');
    var path = require('path');
    var os = require('os');
    var q = ctx.requireCordovaModule('q');

    var opts = ctx.opts;
    var projectRoot = opts.projectRoot;
    var pluginSrcPath = [
        projectRoot,
        'plugins',
        'cordova-plugin-realm',
        'src',
        'browser',
        'server'
    ];

    var serverDir = path.resolve(pluginSrcPath.join('/'));

    var packageFile = fs.readFileSync(path.resolve(pluginSrcPath.concat('package.json').join('/')));
    var config = JSON.parse(packageFile);

    var deferred = q.defer();

    npm.load(config, function (err) {
        if (err) {
            deferred.reject(err);
            return;
        }

        npm.prefix = serverDir;
        console.log('Installing server dependencias ...');
        npm.commands.install([], function (err, data) {
            if (err) {
                deferred.reject(err);
                return;
            }
            console.log('Done.');
            deferred.resolve();
        });
    });

    return deferred.promise;
};