/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

package io.github.airamrguez.plugins.realm;

import android.content.Context;
import android.util.Pair;

import com.facebook.stetho.Stetho;
import com.uphyca.stetho_realm.RealmInspectorModulesProvider;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Set;

import io.realm.Case;
import io.realm.Realm;
import io.realm.RealmConfiguration;
import io.realm.RealmFieldType;
import io.realm.RealmObject;
import io.realm.RealmObjectSchema;
import io.realm.RealmQuery;
import io.realm.RealmResults;
import io.realm.RealmSchema;

public class RealmPlugin extends CordovaPlugin {
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext)
            throws JSONException {
        if (action.equals("initialize")) {
            return initialize(args, callbackContext);
        } else if (action.equals("create")) {
            return create(args, callbackContext);
        } else if (action.equals("findAll")) {
            return findAll(args, callbackContext);
        }
        return false;
    }

    private boolean initialize(JSONArray args, CallbackContext callbackContext) {
        Context context = getApplicationContext();
        Realm.init(context);
        config = new RealmConfiguration.Builder()
                .deleteRealmIfMigrationNeeded()
                .build();

        Realm realm = Realm.getInstance(config);
        int realmInstanceID = realms.size();
        realms.put(realmInstanceID, realm);

        JSONArray schemas;
        JSONObject result;
        try {
            schemas = schemaToJSON(realm);

            result = new JSONObject();
            result.put("realmInstanceID", realmInstanceID);
            result.put("schemas", schemas);
            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
            callbackContext.sendPluginResult(pluginResult);
        } catch (JSONException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }

        Stetho.initialize(
                Stetho.newInitializerBuilder(context)
                        .enableDumpapp(Stetho.defaultDumperPluginsProvider(context))
                        .enableWebKitInspector(RealmInspectorModulesProvider.builder(context).build())
                        .build());

        return true;
    }

    private boolean create(JSONArray args, CallbackContext callbackContext) {
        int realmInstanceID;
        String schemaName;
        String rawJSON;
        Boolean update = false;
        try {
            realmInstanceID = args.getInt(0);
            schemaName = args.getString(1);
            rawJSON = args.getString(2);
            update = args.getBoolean(3);
        } catch (JSONException e) {
            callbackContext.error("invalid parameter");
            PluginResult r = new PluginResult(PluginResult.Status.JSON_EXCEPTION);
            callbackContext.sendPluginResult(r);
            return true;
        }

        boolean isJSONArray = false;
        if (!rawJSON.isEmpty()) {
            isJSONArray = rawJSON.charAt(0) == '[';
        }

        Realm realm = realms.get(realmInstanceID);
        Class objectClass;
        try {
            objectClass = getClass(schemaName);
        } catch (ClassNotFoundException e) {
            callbackContext.error("schema name not found.");
            PluginResult r = new PluginResult(PluginResult.Status.CLASS_NOT_FOUND_EXCEPTION);
            callbackContext.sendPluginResult(r);
            return true;
        }
        realm.beginTransaction();
        if (isJSONArray) {
            if (update) {
                realm.createOrUpdateAllFromJson(objectClass, rawJSON);
            } else {
                realm.createAllFromJson(objectClass, rawJSON);
            }
        } else {
            if (update) {
                realm.createOrUpdateObjectFromJson(objectClass, rawJSON);
            } else {
                realm.createObjectFromJson(objectClass, rawJSON);
            }
        }
        realm.commitTransaction();

        callbackContext.success();
        return true;
    }

    private boolean findAll(JSONArray args, CallbackContext callbackContext) {
        int realmInstanceID;
        String schemaName;
        JSONArray query;
        try {
            realmInstanceID = args.getInt(0);
            schemaName = args.getString(1);
            query = args.getJSONArray(2);
        } catch (JSONException e) {
            callbackContext.error("invalid parameter");
            PluginResult r = new PluginResult(PluginResult.Status.JSON_EXCEPTION);
            callbackContext.sendPluginResult(r);
            return true;
        }

        Realm realm = realms.get(realmInstanceID);
        Class objectClass;
        try {
            objectClass = getClass(schemaName);
        } catch (ClassNotFoundException e) {
            callbackContext.error("schema name not found.");
            PluginResult r = new PluginResult(PluginResult.Status.CLASS_NOT_FOUND_EXCEPTION);
            callbackContext.sendPluginResult(r);
            return true;
        }

        RealmResults results = null;
        Pair range = new Pair<Integer, Integer>(null, null);

        if (query.length() > 0) {
            try {
                JSONArray operations = this.extractOffsetAndLimit(query, range);
                RealmQuery predicate = buildQuery(realm, operations, objectClass);
                results = predicate.findAll();
            } catch (Exception e) {
                callbackContext.error("invalid query.");
                e.printStackTrace();
                PluginResult r = new PluginResult(PluginResult.Status.JSON_EXCEPTION);
                callbackContext.sendPluginResult(r);
                return true;
            }
        } else {
            results = realm.where(objectClass).findAll();
        }

        int resultsId = results.size();
        ResultsSlice resultsSlice = new ResultsSlice(realm, objectClass, results, range);
        resultsSlices.put(resultsId, resultsSlice);

        try {
            JSONArray jsResults = resultsSlice.slice();
            JSONObject resultObj = new JSONObject();
            resultObj.put("realmResultsId", resultsId);
            resultObj.put("results", jsResults);
            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, resultObj);
            callbackContext.sendPluginResult(pluginResult);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return true;
    }

    private JSONArray extractOffsetAndLimit(JSONArray operations, Pair range) throws JSONException {
        JSONArray filteredOperations = new JSONArray();
        Integer limit = null;
        Integer offset = null;
        for (int i = 0; i < operations.length(); i++) {
            JSONObject operation = operations.getJSONObject(i);
            String opName = operation.getString("name");
            if (opName.equals("limit")) {
                JSONArray args = operation.getJSONArray("args");
                limit = args.getInt(0);
            } else if (opName.equals("offset")) {
                JSONArray args = operation.getJSONArray("args");
                offset = args.getInt(0);
            } else {
                filteredOperations.put(operation);
            }
        }
        range = new Pair<Integer, Integer>(offset, limit);
        return operations;
    }

    private RealmQuery buildQuery(Realm realm, JSONArray operations, Class<? extends RealmObject> objectClass)
            throws JSONException, NoSuchFieldException, NoSuchMethodException, InvocationTargetException,
            IllegalAccessException, ClassNotFoundException, InstantiationException, ParseException {
        RealmQuery query = realm.where(objectClass);
        Method method;
        Class[] parameterTypes;
        Case[] caseValues = Case.values();
        for (int i = 0; i < operations.length(); i++) {
            JSONObject operation = operations.getJSONObject(i);
            String opName = operation.getString("name");
            JSONArray args = operation.getJSONArray("args");
            Class parameterType = parameterType(args.getString(0), objectClass);
            if (opName.equals("beginsWith")) {
                Case casing = args.length() > 2 ? caseValues[args.getInt(2)] : Case.INSENSITIVE;
                Class[] pTypes = new Class[]{String.class, String.class, Case.class};
                method = query.getClass().getMethod(opName, pTypes);
                method.invoke(query, args.get(0), args.get(1), casing);
            } else if (opName.equals("between")) {
                parameterTypes = new Class[2];
                Arrays.fill(parameterTypes, parameterType);
                method = query.getClass().getMethod(opName, String.class, parameterType, parameterType);
                query = (RealmQuery) method.invoke(query, args.get(0), args.get(1), args.get(2));
            } else if (opName.equals("endsWith")) {
                Case casing = args.length() > 2 ? caseValues[args.getInt(2)] : Case.INSENSITIVE;
                Class[] pTypes = new Class[]{String.class, String.class, Case.class};
                method = query.getClass().getMethod(opName, pTypes);
                method.invoke(query, args.get(0), args.get(1), casing);
            } else if (opName.equals("contains")) {
                Case casing = args.length() > 2 ? caseValues[args.getInt(2)] : Case.INSENSITIVE;
                Class[] pTypes = new Class[]{String.class, String.class, Case.class};
                method = query.getClass().getMethod(opName, pTypes);
                method.invoke(query, args.get(0), args.get(1), casing);
            } else if (opName.equals("equalTo")) {
                query = buildEqualityQuery(query, opName, args, parameterType);
            } else if (opName.equals("greaterThan")) {
                query = buildArithmeticQuery(query, opName, args, parameterType);
            } else if (opName.equals("greaterThanOrEqualTo")) {
                query = buildArithmeticQuery(query, opName, args, parameterType);
            } else if (opName.equals("in")) {
                int numOfArgs = args.length();
                Class[] pTypes = new Class[numOfArgs];
                ArrayList arguments = new ArrayList(3);
                pTypes[0] = String.class;
                pTypes[1] = Array.newInstance(parameterType, 0).getClass();
                arguments.add(args.get(0));

                JSONArray paramValue = args.getJSONArray(1);

                Object values = Array.newInstance(parameterType, numOfArgs);
                for (int j = 0; j < paramValue.length(); j++) {
                    Object value = paramValue.get(j);
                    if (parameterType.getSimpleName().equals("Date")) {
                        value = jsonDateFormat.parse((String)value);
                    }
                    Array.set(values, j, parameterType.cast(value));
                }
                arguments.add(values);
                if (numOfArgs > 2) {
                    pTypes[2] = Case.class;
                    arguments.add(caseValues[args.getInt(2)]);
                }
                method = query.getClass().getMethod("in", pTypes);
                query = (RealmQuery) method.invoke(query, arguments.toArray());
            } else if (opName.equals("isEmpty")) {
                query = buildNullableQuery(query, opName, args);
            } else if (opName.equals("isNotEmpty")) {
                query = buildNullableQuery(query, opName, args);
            } else if (opName.equals("isNotNull")) {
                query = buildNullableQuery(query, opName, args);
            } else if (opName.equals("isNull")) {
                query = buildNullableQuery(query, opName, args);
            } else if (opName.equals("lessThan")) {
                query = buildArithmeticQuery(query, opName, args, parameterType);
            } else if (opName.equals("lessThanOrEqualTo")) {
                query = buildArithmeticQuery(query, opName, args, parameterType);
            } else if (opName.equals("notEqualTo")) {
                query = buildEqualityQuery(query, opName, args, parameterType);
            } else if (opName.equals("beginGroup")) {
                query = query.beginGroup();
            } else if (opName.equals("endGroup")) {
                query = query.endGroup();
            } else if (opName.equals("not")) {
                query = query.not();
            } else if (opName.equals("or")) {
                query = query.or();
            }
        }

        return query;
    }

    private RealmQuery buildArithmeticQuery(RealmQuery query, String operation, JSONArray args, Class parameterType)
            throws JSONException, ParseException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Class[] paramTypes = new Class[2];
        paramTypes[0] = String.class;
        paramTypes[1] = parameterType;

        ArrayList arguments = new ArrayList(2);
        arguments.add(args.get(0)); // 1st arg is field name.
        // 2nd arg can be date or number.
        Object value = args.get(1);
        if (parameterType.getSimpleName().equals("Date")) {
            arguments.add(jsonDateFormat.parse((String)value));
        } else {
            arguments.add(value);
        }
        Method method = query.getClass().getMethod(operation, paramTypes);
        return (RealmQuery) method.invoke(query, arguments.toArray());
    }

    private RealmQuery buildNullableQuery(RealmQuery query, String operation, JSONArray args)
            throws NoSuchMethodException, JSONException, InvocationTargetException, IllegalAccessException {
        Method method = query.getClass().getMethod(operation, String.class);
        return (RealmQuery) method.invoke(query, args.getString(0));
    }

    private RealmQuery buildEqualityQuery(RealmQuery query, String operation, JSONArray args, Class parameterType)
            throws NoSuchMethodException, JSONException, InvocationTargetException, IllegalAccessException {
        Class[] parameterTypes = new Class[1];
        Arrays.fill(parameterTypes, parameterType);
        Method method = query.getClass().getMethod(operation, String.class, parameterType);
        return (RealmQuery) method.invoke(query, args.get(0), args.get(1));
    }

    private JSONArray schemaToJSON(Realm realm) throws JSONException, ClassNotFoundException, NoSuchFieldException {
        JSONArray jsonSchemas = new JSONArray();
        RealmSchema schema = realm.getSchema();
        Set<RealmObjectSchema> objectSchemas = schema.getAll();
        for (RealmObjectSchema objectSchema : objectSchemas) {
            JSONObject jsonSchema = new JSONObject();
            jsonSchema.put("name", objectSchema.getClassName());
            if (objectSchema.hasPrimaryKey()) {
                jsonSchema.put("primaryKey", objectSchema.getPrimaryKey());
            }
            Set<String> fieldNames = objectSchema.getFieldNames();
            JSONObject properties = new JSONObject();
            for (String fieldName : fieldNames) {
                JSONObject property = new JSONObject();
                RealmFieldType fieldType = objectSchema.getFieldType(fieldName);
                String type;
                String objectType = null;
                switch (fieldType) {
                    case BOOLEAN:
                        type = "boolean";
                        break;
                    case STRING:
                        type = "string";
                        break;
                    case DATE:
                        type = "date";
                        break;
                    case DOUBLE:
                        type = "double";
                        break;
                    case FLOAT:
                        type = "float";
                        break;
                    case INTEGER:
                        type = "int";
                        break;
                    case BINARY:
                        type = "data";
                        break;
                    case OBJECT:
                        type = "object";
                        objectType = getSchemaPropertyType(schema, objectSchema.getClassName(), fieldName);
                        break;
                    case LIST:
                        type = "list";
                        objectType = getSchemaPropertyType(schema, objectSchema.getClassName(), fieldName);
                        break;
                    default:
                        throw new RuntimeException("Unsupported type: " + fieldType.name());
                }
                property.put("type", type);
                properties.put("optional", !objectSchema.isRequired(fieldName));
                if (objectSchema.hasIndex(fieldName)) {
                    properties.put("indexed", true);
                }
                if (objectType != null) {
                    property.put("objectType", objectType);
                }

                properties.put(fieldName, property);
            }
            jsonSchema.put("properties", properties);
            jsonSchemas.put(jsonSchema);
        }
        return jsonSchemas;
    }

    private String getSchemaPropertyType(RealmSchema schema, String parentSchemaName, String fieldName)
            throws NoSuchFieldException, ClassNotFoundException {
        Class objectClass = getClass(parentSchemaName);
        Field field = objectClass.getDeclaredField(fieldName);
        String schemaFieldType = field.getType().getSimpleName();
        if (schemaFieldType.equals("RealmList")) {
            ParameterizedType listType = (ParameterizedType) field.getGenericType();
            Class<?> listClass = (Class<?>)listType.getActualTypeArguments()[0];
            schemaFieldType = listClass.getSimpleName();
        }
        RealmObjectSchema relation = schema.get(schemaFieldType);
        if (relation == null) {
            throw new RuntimeException("Unsupported type: " + schemaFieldType);
        }
        return schemaFieldType;
    }

    private Class parameterType(String keypath, Class<? extends RealmObject> objectClass)
            throws JSONException, NoSuchFieldException {
        String[] fields = keypath.split("\\.", 2);
        if (fields.length <= 0) {
            return null;
        }
        String fieldName = fields[0];
        if (fields.length == 1) {
            Field field = objectClass.getDeclaredField(fieldName);
            field.setAccessible(true);
            return field.getType();
        } else {
            Field field = objectClass.getDeclaredField(fieldName);
            return parameterType(fields[1], (Class<? extends RealmObject>) field.getType());
        }
    }

    private Class typeAsArrayType(Class type) throws ClassNotFoundException {
        return Class.forName(String.format("[L%s;", type.getName()));
    }

    private Class getClass(String schemaName) throws ClassNotFoundException {
        return Class.forName(String.format("io.github.airamrguez.plugins.realm.%s", schemaName));
    }

    private Context getApplicationContext() {
        return this.cordova.getActivity().getApplicationContext();
    }

    private RealmConfiguration config;
    private HashMap<Integer, Realm> realms = new HashMap<Integer, Realm>();
    private HashMap<Integer, ResultsSlice> resultsSlices = new HashMap<Integer, ResultsSlice>();
    private SimpleDateFormat jsonDateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX");
}
