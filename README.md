# @airamrguez/cordova-plugin-realm

__IMPORTANT__: This is not an official Realm product.

This is a Work In Progress. **DO NOT USE IT**. The API will change.

## About

This plugin provides an interface to Realm mobile database for iOS, Android and the browser.

## Installation

```sh
cordova plugin add https://github.com/airamrguez/cordova-plugin-realm
```

## Browser

On your project root directory add the browser platform:

```
cordova platform add browser
```

Install @airamrguez/cdv-realm (_not yet on npm_) and launch it before working on the browser.

```
npm install -g cordova-realm-server
cdv-realm
```

See the Workflow section below to see how to start using Realm in Cordova.

## Workflow

![cordova-plugin-realm workflow](https://cloud.githubusercontent.com/assets/1159448/25042398/0e590fe4-2118-11e7-87d1-b18b2509c3ab.png)

## Usage

### Schema definitions

Create a file named `realmrc.json` under your Cordova project **root** directory.

```json
{
  "schemas": [{
    "name": "Person",
    "primaryKey": "id",
    "properties": {
      "id": "int",
      "name": { "type": "string", "indexed": true },
      "birthday": { "type": "date", "optional": true },
      "car": { "type": "Car" }
    }
  }, {
    "name": "Car",
    "properties": {
      "make": "string",
      "model": "string"
    }
  }]
}
```

This plugin uses realmrc.json file to generate native classes. Be sure you have added a platform
to your project and build it every time you change your schema definition.

```sh
cordova platform add ios android
cordova build
```

### Initialization

Realm plugin files are exposed under `cordova.plugins.realm`.

```js
var Realm = cordova.plugins.realm;

Realm.init({ schema: ['Person', 'Car'] }, function(realm) {
  realm.create('Person', json, true, function(success, error) {
    if (error) {
      alert('Error committing into the database.');
      return;
    }
  });
});
```

### Inserts and updates

```js
var people = [{
  id: 1,
  name: "Joanne"
}, {
  id: 2,
  name: "Airam"
}];
realm.create('Person', people, true, function() {
  console.log('inserted');
}, function () {
  console.error('error');
});
```

### Queries

Queries are created using the builder pattern.

Get all rows from a collection:

```js
realm.where('Person')
  .findAll(function(results) {
    if (results.length > 0) {
      console.log('First result: ', results[0]);
      results.map(function(result) {
        // Do something with result...
      });
    }
  });
```

Write complex queries and get the results sorted by a field.

```js
realm.where('Person')
  .between('age', 18, 39)
  .beginGroup()
    .equalTo('name', 'Peter', Realm.Types.Case.SENSITIVE)
    .or()
    .contains('name', 'Jo')
  .endGroup()
  .isNotEmpty('surnames')
  .findAllSorted('age', function(results) {
    results.forEach(function(result, i) {
      console.log('Result ', i, result);
    });
  });
```

### Deletes

```js
realm.where('Task').equalTo('id', 4).delete(() => {
  console.log('Task with id', 4, 'deleted.');
});
```

### Results

Queries returns an array of results.

```js
realm.where('Person')
  .findAll(function(results) {
    if (results.length > 0) {
      console.log('First result: ', results[0]);
      results.map(function(result) {
        // Do something with result...
      });
    }
  });
```

## API

### Realm

#### Realm class methods.

  - `init({ schema: RealmSchema })`

#### Realm instance methods.

  - `where(schemaName: string): QueryBuilder` returns a query object which you can use to append query methods.
  - `create(schemaName: string, json: Array | Object, update: boolean, success, error)`: create or update an array or an object into the database.
  - `deleteAll(schemaName)` clears all objects.

### Queries

Queries methods are auto-explanatory. Each condition of the query is implicitly logical-and together.

  - `between(fieldName, from, to)`
  - `greaterThan(fieldName, value)`
  - `lessThan(fieldName, value)`
  - `greaterThanOrEqualTo(fieldName, value)`
  - `lessThanOrEqualTo(fieldName, value)`
  - `equalTo(fieldName, value, casing = cordova.plugins.Realm.Types.Case.INSENSITIVE)`
  - `notEqualTo(fieldName, value, casing = cordova.plugins.Realm.Types.Case.INSENSITIVE)`
  - `contains(fieldName, value, casing = cordova.plugins.Realm.Types.Case.INSENSITIVE)`
  - `beginsWith(fieldName, value, casing = cordova.plugins.Realm.Types.Case.INSENSITIVE)`
  - `endsWith(fieldName, value, casing = cordova.plugins.Realm.Types.Case.INSENSITIVE)`
  - `isNull(fieldName)`
  - `isNotNull(fieldName)`
  - `isEmpty(fieldName)`
  - `isNotEmpty(fieldName)`

Join or negate conditions.

  - `or()`
  - `not()`

Add left parenthesis or right parenthesis with:

  - `beginGroup()`
  - `endGroup()`

End up your query with one of the following methods:
  - `findAll(success)`
  - `findAllSorted(fieldName, success)`
  - `findAllSorted(fieldName, sorting = cordova.plugins.realm.Types.Sort.ASCENDING, success)`
  - `findAllSorted(fieldName: Array<string>, sorting: Array<cordova.plugins.realm.Types.Sort.ASCENDING>, success)`
  - `delete(success)`
