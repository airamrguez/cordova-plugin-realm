const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Realm = require('realm');

const RealmQuery = require('./RealmQuery');
const { isNil, resultsToPlainArray } = require('./utils');
const utils = require('../../../../www/utils');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const realms = new Map();
const realmResults = new Map();

app.post('/initialize', (req, res) => {
  const { configuration, schema } = req.body;

  const { schemaVersion } = configuration;

  const realmID = realms.size;
  const realm = new Realm({
    schema: schema.map(s => Object.create(s)),
    schemaVersion
  });
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
  if (isNil(schemaName)) {
    res.status(400);
    res.send({ error: { msg: 'schemaName cannot be null or undefined' } });
    return;
  }
  const realm = realms.get(realmInstanceID);
  if (realm === undefined) {
    res.status(400);
    res.send(new Error('realm instance not found. Did you call initialize?'));
  }
  const schemas = realm.schema;
  const model = schemas.find(s => s.name === schemaName);
  if (isNil(model)) {
    res.status(400);
    res.send({ error: { msg: `model ${schemaName} not found in schema` } });
    return;
  }
  const json = utils.normalizeDates(rawJSON, schemas, model);
  realm.write(() => {
    try {
      if (Array.isArray(json)) {
        json.forEach(item => {
          realm.create(schemaName, item, update);
        });
      } else {
        realm.create(schemaName, json, update);
      }
    } catch (error) {
      res.status(400);
      console.trace(error);
      res.send(error);
      return;
    }
    res.send({});
  });
});

app.post('/findAll', (req, res) => {
  const { realmInstanceID, schemaName, ops } = req.body;
  const realm = realms.get(realmInstanceID);
  const results = RealmQuery.findAll(realm, schemaName, ops);
  const realmResultsId = realmResults.size;
  realmResults.set(realmResultsId, results);
  res.send({
    realmResultsId,
    results: resultsToPlainArray(results)
  });
});

app.post('/findAllSorted', (req, res) => {
  const { realmInstanceID, schemaName, ops, sortField, sortOrder } = req.body;
  const realm = realms.get(realmInstanceID);
  const results = RealmQuery.findAllSorted(
    realm,
    schemaName,
    ops,
    sortField,
    sortOrder
  );
  const realmResultsId = realmResults.size;
  realmResults.set(realmResultsId, results);
  res.send({
    realmResultsId,
    results: resultsToPlainArray(results)
  });
});

app.listen(8080, function() {
  console.log('Realm server listening on port 8080!');
});
