# @airamrguez/cordova-plugin-realm

__IMPORTANT__: This is not an official Realm product.

This is a Work In Progress. **DO NOT USE IT**. The API will change.

## About

This plugin provides an interface to Realm mobile database, particularly iOS and Android.

## Installation

```sh
cordova plugin add https://github.com/airamrguez/cordova-plugin-realm
```

Be patient. It will take a while.

### Android Installation

**IMPORTANT**: On Android you have to **manually** add the Realm classpath dependency. Your `[YOUR_CORDOVA_PROJECT]/platforms/android/build.gradle` file should look like the code below:

```groovy
[...]
buildscript {
    repositories {
        mavenCentral()
        jcenter()
    }

    // Switch the Android Gradle plugin version requirement depending on the
    // installed version of Gradle. This dependency is documented at
    // http://tools.android.com/tech-docs/new-build-system/version-compatibility
    // and https://issues.apache.org/jira/browse/CB-8143
    dependencies {
        classpath 'com.android.tools.build:gradle:2.1.0'
        classpath 'io.realm:realm-gradle-plugin:2.0.2'
    }
}
[...]
```


## Workflow

![cordova-plugin-realm workflow](https://cloud.githubusercontent.com/assets/1159448/21962439/4b524196-db26-11e6-9735-f2efdbba28d8.png)

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
var realmPlugin = cordova.plugins.realm;
var Realm = realmPlugin.Realm;

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
    .equalTo('name', 'Peter', Realm.Case.SENSITIVE)
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
  - `equalTo(fieldName, value, casing = cordova.plugins.realm.Case.INSENSITIVE)`
  - `notEqualTo(fieldName, value, casing = cordova.plugins.realm.Case.INSENSITIVE)`
  - `contains(fieldName, value, casing = cordova.plugins.realm.Case.INSENSITIVE)`
  - `beginsWith(fieldName, value, casing = cordova.plugins.realm.Case.INSENSITIVE)`
  - `endsWith(fieldName, value, casing = cordova.plugins.realm.Case.INSENSITIVE)`
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
  - `findAllSorted(fieldName, sorting = cordova.plugins.realm.Sort.ASCENDING, success)`
  - `findAllSorted(fieldName: Array<string>, sorting: Array<cordova.plugins.realm.Sort.ASCENDING>, success)`
  - `delete(success)`
