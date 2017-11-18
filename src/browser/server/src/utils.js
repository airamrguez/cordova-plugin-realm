function isNil(o) {
  return o === undefined || o === null;
}

var objects;

function realmObjectToPlainObject(object, path) {
  if (!(object instanceof Realm.Object)) {
    return object;
  }
  const model = object.objectSchema();
  const properties = model.properties;
  const primaryKey = model.primaryKey;
  const pk = object[primaryKey];

  if (primaryKey !== undefined && pk !== undefined) {
    if (objects.has(pk)) {
      return { $ref: objects.get(pk) };
    }
    objects.set(pk, path);
  }

  return Object.keys(properties).reduce((plain, key) => {
    if (object[key] instanceof Realm.Object) {
      const nextPath = path;
      return {
        ...plain,
        [key]: realmObjectToPlainObject(object[key], nextPath)
      };
    }
    if (object[key] instanceof Realm.List) {
      const arr = object[key].map((object, i) => {
        const nextPath = path + '[' + JSON.stringify(key) + ']' + '[' + i + ']';
        return realmObjectToPlainObject(object, nextPath);
      });
      return {
        ...plain,
        [key]: arr
      };
    }
    return {
      ...plain,
      [key]: object[key]
    };
  }, {});
}

function resultsToPlainArray(results) {
  objects = new Map();
  return results.map((object, i) => {
    return realmObjectToPlainObject(object, `$[${i}]`);
  });
}

module.exports = {
  isNil,
  resultsToPlainArray
};
