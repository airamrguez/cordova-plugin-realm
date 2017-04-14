const PORT = 8080;
const URL = `http://localhost:${PORT}`;

const postJSON = (url, payload) => fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
}).then(response => response.json());

function initialize(success, error, options) {
  const schema = cordova.require('cordova-plugin-realm.schemaProxy');
  const [configuration] = options;
  postJSON(`${URL}/initialize`, { configuration, schema })
    .then(success)
    .catch(error);
}

function create(success, error, options) {
  const [realmInstanceID, schemaName, json, update] = options;
  postJSON(`${URL}/create`, {
    realmInstanceID,
    schemaName,
    json,
    update
  })
    .then(success)
    .catch(error);
}

function deleteAll(success, error, options) {
  const [realmInstanceID] = options;
  postJSON(`${URL}/deleteAll`, { realmInstanceID }).then(success).catch(error);
}

function findAll(success, error, options) {
  const [realmInstanceID, schemaName, ops] = options;
  postJSON(`${URL}/findAll`, { realmInstanceID, schemaName, ops })
    .then(success)
    .catch(error);
}
function findAllSorted(success, error, options) {
  // TODO Missing args...!!!
  const [realmInstanceID, schemaName, ops] = options;
  postJSON(`${URL}/findAllSorted`, { realmInstanceID, schemaName, ops })
    .then(success)
    .catch(error);
}

function _delete(success, error, options) {
  const [realmInstanceID, schemaName, ops] = options;
  postJSON(`${URL}/delete`, { realmInstanceID, schemaName, ops })
    .then(success)
    .catch(error);
}

var realmResultsFuncs = {};

['sum', 'min', 'max', 'average', 'sort'].forEach(method => {
  realmResultsFuncs[method] = (success, error, options) => {
    const [realmResultsId, ...rest] = options;
    postJSON(`${URL}/${method}`, { realmResultsId }).then(success).catch(error);
  };
});

module.exports = Object.assign(
  {
    initialize,
    create,
    deleteAll,
    findAll,
    findAllSorted,
    delete: _delete
  },
  realmResultsFuncs
);

require('cordova/exec/proxy').add('RealmPlugin', module.exports);
