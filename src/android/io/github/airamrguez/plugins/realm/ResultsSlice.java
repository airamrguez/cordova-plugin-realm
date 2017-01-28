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

import android.util.Pair;

import com.google.gson.Gson;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import io.realm.Realm;
import io.realm.RealmModel;
import io.realm.RealmResults;

public class ResultsSlice {
    public ResultsSlice(Realm realm, Class objectClass, RealmResults results, Pair range) {
        this.realm = realm;
        this.objectClass = objectClass;
        this.results = results;
        this.range = range;
    }

    public JSONArray slice() throws NoSuchMethodException, InvocationTargetException, IllegalAccessException, JSONException {
        Pair range = getRange();
        Integer offset = (Integer)range.first;
        Integer limit = (Integer)range.second;
        RealmResults results = getResults();
        int fromIndex = offset != null ? offset.intValue() : 0;
        int toIndex = limit != null ? Math.min(limit.intValue() + 1, results.size()) : results.size();

        Class clazz = getObjectClass();
        Method createSerializer = clazz.getDeclaredMethod("createSerializer", null);
        Gson gson = (Gson) createSerializer.invoke(null);

        JSONArray slice = new JSONArray();
        for (int i = fromIndex; i < toIndex; i++) {
            RealmModel model = results.get(i);
            JSONObject resultObject = new JSONObject(gson.toJson(clazz.cast(model)));
            slice.put(resultObject);
        }
        return slice;
    }

    public Realm getRealm() {
        return realm;
    }

    public Class getObjectClass() {
        return objectClass;
    }

    public RealmResults getResults() {
        return results;
    }

    public Pair getRange() {
        return range;
    }

    private Realm realm;
    private Class objectClass;
    private RealmResults results;
    private Pair range;
}
