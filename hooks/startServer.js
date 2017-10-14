#!/usr/bin/env node

'use strict';

module.exports = function (ctx) {
    console.log('hola');
    var npm = require('npm');
    var fs = require('fs');
    var path = require('path');

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
            console.log('Error cargando configuración');
            deferred.reject(err);
            return;
        }
        npm.prefix = serverDir;
        npm.commands.run(['start'], function (err, data) {
            if (err) {
                deferred.reject(err);
                return;
            }
        });
        // Ugly fix to release console lock.
        var timer = setTimeout(function () {
            clearTimeout(timer);
            deferred.resolve();
        }, 1000);
        npm.registry.log.on('log', function (message) {
            console.log(message);
        });
    });

    return deferred.promise;
};