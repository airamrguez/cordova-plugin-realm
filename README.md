# cordova-plugin-realm
__IMPORTANT__: This is not an official Realm plugin.

This is a Work In Progress. **DO NOT USE IT**. The API will change.

## About
This plugin provides an interface to Realm mobile database, particularly iOS and Android.

## Instalation
```sh
cordova plugin add https://github.com/airamrguez/cordova-plugin-realm
```

## Usage

### Schema definitions

Create a file named `realmrc.json` and place inside of it schema definitions for your project.
```json
{
	"schemas": [{
		"name": "Person",
		"properties": {
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

### Initialization

Realm plugin files are exposed under `cordova.plugins.realm`. 
```js
	var realmPlugin = cordova.plugins.realm;
	var Realm = realmPlugin.Realm;

	Realm.init({ schema: ['PersonSchema', 'Car'] }, function(realm) {
		realm.write('Person', json, (success, error) => {
			if (error) {
				alert('Error committing into the database.');
				return;
			}
		});
	});
```
### Queries
Queries are created using the builder pattern.

```js
	realm.where('Person')
		.between('age', 18, 39)
			.beginGroup()
				.equalTo('name', 'Peter', Realm.Case.SENSITIVE)
				.or()
				.contains('name', 'Jo')
			.endGroup()
		.sort('age')
		.findAll(function(results) {
			results.forEach(function(result, i) {
				console.log('Result ', i, result);
			});
		});
```

### Results
Queries returns a `Result` object.

```js
	realm.where('Person')
		.findAll(function(results) {
			results.onChange(function(nextResults) {
				// Print all results
				nextResults.forEach(r, i) {
					console.log('Result ', i, r);
				};
			});
			results[0] = {
				id: 1,
				name: 'Bob',
				age: 26
			};
		}, function(error) {
			console.log('[Error]: ', error);
		});
```

## API

### `Realm`
  - `init({ schema: RealmSchema })` creates a new Realm instance.
  - `where(schemaName: string): QueryBuilder` allows to create queries.

### `QueryBuilder`
  - `beginGroup()`
  - `beginsWith()`

### `Results`
  - `every`
  - `find`
  - `findIndex`