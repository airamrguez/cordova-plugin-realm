#! /usr/bin/env node
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Realm = require('realm');

const RealmQuery = require('./RealmQuery');
const utils = require('../../../www/utils');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const realms = new Map();
const realmResults = new Map();

app.post('/initialize', function(req, res) {
  const { configuration, schema } = req.body;

  const realmID = realms.size;
  const realm = new Realm({ schema: schema.map(s => Object.create(s)) });
  realms.set(realmID, realm);
  res.send({
    realmInstanceID: realmID,
    schemas: realm.schema,
    schemaVersion: realm.schemaVersion
  });
});

app.post('/create', (req, res) => {
  const {
    realmInstanceID,
    schemaName,
    json: rawJSON,
    update = false
  } = req.body;
  const realm = realms.get(realmInstanceID);
  const schemas = realm.schema;
  const schema = schemas.find(s => s.name === schemaName);
  const json = utils.normalizeSchema(rawJSON, realm.schema, schema);
  realm.write(() => {
    if (Array.isArray(json)) {
      json.forEach(item => realm.create(schemaName, item, update));
    } else {
      realm.create(schemaName, json, update);
    }
    res.send({});
  });
});

app.post('/findAll', (req, res) => {
  const {
    realmInstanceID,
    schemaName,
    ops
  } = req.body;
  const realm = realms.get(realmInstanceID);
  const results = RealmQuery.findAll(realm, schemaName, ops);
  const realmResultsId = realmResults.size;
  realmResults.set(realmResultsId, results);
  res.send({
    realmResultsId,
    results
  });
});

app.post('/findAllSorted', (req, res) => {
  const {
    realmInstanceID,
    schemaName,
    ops
  } = req.body;
  const realm = realms.get(realmInstanceID);
  const results = RealmQuery.findAllSorted(realm, schemaName, ops);
  const realmResultsId = realmResults.size;
  realmResults.set(realmResultsId, results);
  res.send({
    realmResultsId,
    results
  });
});

app.listen(8080, function() {
  console.log('Realm server listening on port 8080!');
});
