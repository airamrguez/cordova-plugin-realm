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

#import <objc/runtime.h>
#import <Cordova/CDV.h>
#import "DKPredicateBuilder.h"
#import <Realm/Realm.h>
#import <Realm/RLMObject.h>
#import "RealmPlugin.h"
#import "Models.h"
#import "RLMObject+JSON.h"

@interface RealmPlugin()
- (NSCompoundPredicate*)buildPredicate:(NSArray*)operations for:(Class)objectClass;
- (NSCompoundPredicate*)createPredicate:(NSDictionary*)op for:(Class)objectClass;
- (NSArray*)addImplicitAndOperators:(NSArray*)operations;
- (NSArray*)extractFrom:(NSArray*)operations limit:(NSNumber**)limit andOffset:(NSNumber**)offset;
- (NSArray*)sliceResults:(RLMResults*)results from:(NSNumber*)offset to:(NSNumber*)limit;
- (NSArray*)schemaToJSON:(RLMRealm*)realm;
- (NSString*)schemaPropertyType:(RLMRealm *)realm schema:(NSString*)schemaName field:(NSString*)fieldName;
- (void)aggregate:(CDVInvokedUrlCommand*)command operation:(ResultOperationType)opType;
- (BOOL)isPropertyNSDate: (Class)objectClass withPath:(NSArray*) propertyPath;
- (BOOL)isPropertyRLMArray: (Class)objectClass withPath:(NSArray*) propertyPath;
- (BOOL)isRelationOneToOne: (Class)objectClass withPath:(NSArray*) propertyPath;
@end

@implementation RealmPlugin

@synthesize realms;
@synthesize realmResults;

- (void)initialize:(CDVInvokedUrlCommand*)command
{
    NSString* callbackId = command.callbackId;
    NSDictionary* options = [command argumentAtIndex:0 withDefault:nil];
    
    [[NSFileManager defaultManager]
     removeItemAtURL:[RLMRealmConfiguration defaultConfiguration].fileURL error:nil];

    NSArray* rawSchema = [options objectForKey: @"schema"];

    if ([self realms] == nil) {
        [self setRealms: [[NSMutableArray alloc] init]];
    }
    if ([self realmResults] == nil) {
        [self setRealmResults: [[NSMutableArray alloc] init]];
    }

    NSInteger realmID = [[self realms] count];
    RLMRealm *realm;
    if ([rawSchema count] > 0) {
        NSMutableArray *objectClasses = [[NSMutableArray alloc] init];
        for (NSString *className in rawSchema) {
            Class objectClass = NSClassFromString(className);
            [objectClasses addObject: objectClass];
        }
        RLMRealmConfiguration *config = [RLMRealmConfiguration defaultConfiguration];
        [config setObjectClasses:[objectClasses copy]];
        NSError *error;
        realm = [RLMRealm realmWithConfiguration:config error:&error];
        if (error != nil) {
            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                                   messageToErrorObject:1];
            [self.commandDelegate sendPluginResult:result callbackId:callbackId];
            return;
        }
    } else {
      realm = [RLMRealm defaultRealm];
    }
    [[self realms] addObject: realm];
    
    NSDictionary *resultArgs = [NSDictionary dictionaryWithObjectsAndKeys:
                                [NSNumber numberWithInteger:realmID], @"realmInstanceID",
                                [self schemaToJSON:realm], @"schemas",
                                nil];

    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                             messageAsDictionary:resultArgs];
    [self.commandDelegate sendPluginResult:result callbackId:callbackId];
}

- (void)insert:(CDVInvokedUrlCommand*)command
{
    NSNumber *realmInstanceId = [command argumentAtIndex:0];
    NSString *schemaName = [command argumentAtIndex:1];
    id rawJSON = [command argumentAtIndex:2 withDefault: nil];
    
    RLMRealm *realm = [[self realms] objectAtIndex:[realmInstanceId integerValue]];
    [realm beginWriteTransaction];
    Class objectClass = NSClassFromString(schemaName);
    CDVPluginResult* result;
    if ([rawJSON isKindOfClass:[NSDictionary class]]) {
        [objectClass createOrUpdateInRealm: realm withJSONDictionary: rawJSON];
    } else if ([rawJSON isKindOfClass:[NSArray class]]) {
        [objectClass createOrUpdateInRealm: realm withJSONArray: rawJSON];
    } else {
        // TODO Improve error payload.
        result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }
    [realm commitWriteTransaction];
    if (!result) {
        result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)deleteAll:(CDVInvokedUrlCommand*)command
{
    NSNumber *realmInstanceId = [command argumentAtIndex:0];
    
    RLMRealm *realm = [[self realms] objectAtIndex:[realmInstanceId integerValue]];
    [realm beginWriteTransaction];
    [realm deleteAllObjects];
    [realm commitWriteTransaction];
    
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)delete:(CDVInvokedUrlCommand*)command
{
    NSNumber *realmInstanceId = [command argumentAtIndex:0];
    NSString *schemaName = [command argumentAtIndex:1];
    NSArray *query = [command argumentAtIndex:2 withDefault:nil];
    
    Class objectClass = NSClassFromString(schemaName);
    RLMRealm *realm = [[self realms] objectAtIndex:[realmInstanceId integerValue]];
    RLMResults *results = nil;
    NSNumber *limit;
    NSNumber *offset;
    if ([query count] > 0) {
        NSArray* operations = [self extractFrom:query limit:&limit andOffset:&offset];
        NSPredicate *predicate = [self buildPredicate:operations for:objectClass];
        results = [objectClass objectsWithPredicate: predicate];
    } else {
        results = [objectClass allObjectsInRealm:realm];
    }
    
    [realm beginWriteTransaction];
    [realm deleteObjects:results];
    [realm commitWriteTransaction];
    
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)findAll:(CDVInvokedUrlCommand*)command
{
    // Js layer checks which arguments has to be passed.
    return [self findAllSorted:command];
}

- (void)findAllSorted:(CDVInvokedUrlCommand*)command
{
    NSNumber *realmInstanceId = [command argumentAtIndex:0];
    NSString *schemaName = [command argumentAtIndex:1];
    NSArray *query = [command argumentAtIndex:2 withDefault:nil];
    
    Class objectClass = NSClassFromString(schemaName);
    RLMRealm *realm = [[self realms] objectAtIndex:[realmInstanceId integerValue]];
    RLMResults *results = nil;
    NSNumber *limit;
    NSNumber *offset;
    if ([query count] > 0) {
        NSArray* operations = [self extractFrom:query limit:&limit andOffset:&offset];
        NSPredicate *predicate = [self buildPredicate:operations for:objectClass];
        results = [objectClass objectsWithPredicate: predicate];
    } else {
        results = [objectClass allObjectsInRealm:realm];
    }
    
    // Sorting
    id sortFieldArg = [command argumentAtIndex:3];
    if (sortFieldArg) {
        if ([sortFieldArg isKindOfClass:[NSArray class]]) {
            NSArray* sortTypes = [command argumentAtIndex:4];
            NSMutableArray* descriptors = [[NSMutableArray alloc] init];
            for (NSUInteger i = 0; i < [sortFieldArg count]; i++) {
                NSString* sortField = [sortFieldArg objectAtIndex:i];
                [descriptors addObject:
                 [RLMSortDescriptor sortDescriptorWithProperty:sortField
                                                     ascending:[sortTypes objectAtIndex:i]]];
            }
            results = [results sortedResultsUsingDescriptors:descriptors];
        } else {
            NSString* sortField = [sortFieldArg stringValue];
            BOOL asc = [[command argumentAtIndex:4
                                     withDefault:[NSNumber numberWithBool:YES]] boolValue];
            results = [results sortedResultsUsingProperty:sortField ascending:asc];
        }
    }
    
    NSInteger resultsId = [[self realmResults] count];
    [[self realmResults] addObject:[NSDictionary dictionaryWithObjectsAndKeys:
                                    results, @"results", limit, @"limit", offset, @"offset", nil]];
    
    NSDictionary *resultArgs = [NSDictionary dictionaryWithObjectsAndKeys:
                                [NSNumber numberWithInteger:resultsId], @"realmResultsId",
                                [self sliceResults:results from:offset to:limit], @"results",
                                nil];
    
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                  messageAsDictionary:resultArgs];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)sort:(CDVInvokedUrlCommand*)command {
    NSNumber* realmResultsId = [command argumentAtIndex:0];
    NSString* property = [command argumentAtIndex:1];
    BOOL sortProperty = [[command argumentAtIndex:2
                                      withDefault:[NSNumber numberWithBool:YES]] boolValue];

    NSDictionary* resultsInfo = [[self realmResults] objectAtIndex:[realmResultsId integerValue]];
    RLMResults* results = [resultsInfo objectForKey:@"results"];
    results = [results sortedResultsUsingProperty:property ascending:sortProperty];
    
    NSNumber* offset = [resultsInfo objectForKey:@"offset"];
    NSNumber* limit = [resultsInfo objectForKey:@"limit"];
    NSDictionary *resultArgs = [NSDictionary dictionaryWithObjectsAndKeys:
                                realmResultsId, @"realmResultsId",
                                [self sliceResults:results from:offset to:limit], @"results",
                                nil];
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                  messageAsDictionary:resultArgs];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)sum:(CDVInvokedUrlCommand*)command {
    [self aggregate:command operation:ResultOperationTypeSum];
}

- (void)max:(CDVInvokedUrlCommand*)command {
    [self aggregate:command operation:ResultOperationTypeMax];
}

- (void)min:(CDVInvokedUrlCommand*)command {
    [self aggregate:command operation:ResultOperationTypeMin];
}

- (void)average:(CDVInvokedUrlCommand*)command {
    [self aggregate:command operation:ResultOperationTypeAverage];
}

#pragma mark - Private Methods -

- (NSArray*)extractFrom:(NSArray*)operations limit:(NSNumber**)limit andOffset:(NSNumber**)offset
{
    NSMutableArray *filteredOperations = [[NSMutableArray alloc] init];
    for (NSDictionary* operation in operations) {
        NSString *opName = [operation valueForKey:@"name"];
        if ([opName isEqualToString:@"limit"]) {
            NSArray *args = [operation valueForKey:@"args"];
            *limit = [args objectAtIndex:0];
        } else if ([opName isEqualToString:@"offset"]) {
            NSArray *args = [operation valueForKey:@"args"];
            *offset = [args objectAtIndex:0];
        } else {
            [filteredOperations addObject:operation];
        }
    }
    return [filteredOperations copy];
}

- (NSArray*)sliceResults:(RLMResults*)results from:(NSNumber*)offset to:(NSNumber*)limit
{
    NSMutableArray *arr = [NSMutableArray new];
    NSUInteger fromIndex = offset != nil ? [offset integerValue] : 0;
    NSUInteger toIndex = limit != nil ?
        MIN([limit integerValue] + 1, [results count]) :
        [results count];

    for (NSUInteger i = fromIndex; i < toIndex; i++) {
        RLMObject *object = [results objectAtIndex:i];
        [arr addObject:[object JSONDictionary]];
    }
    return arr;
}

- (NSCompoundPredicate*)buildPredicate:(NSArray*)operations for:(Class)objectClass
{
    NSMutableArray* postfixExp = [[NSMutableArray alloc] init];
    NSMutableArray* stack = [[NSMutableArray alloc] init];
    
    NSArray* filledOperations = [self addImplicitAndOperators:operations];

    for (NSDictionary* operation in filledOperations) {
        NSString *opName = [operation valueForKey:@"name"];
        // If an operator is found.
        if ([opName isEqualToString:@"or"] || [opName isEqualToString:@"and"] ||
            [opName isEqualToString:@"not"]) {
            // If the stack is empty or if the top element is a (
            if ([stack count] == 0 ||
                [[[stack lastObject] valueForKey:@"name"] isEqualToString:@"beginGroup"]) {
                [stack addObject:operation];
            } else {
                while ([stack count] > 0) {
                    NSDictionary* stackOperation = [stack lastObject];
                    if ([[stackOperation valueForKey:@"name"] isEqualToString:@"beginGroup"]) {
                        break;
                    }
                    [stack removeLastObject];
                    [postfixExp addObject:stackOperation];
                }
                // Push the latest operator onto the stack.
                [stack addObject:operation];
            }
        } else if ([opName isEqualToString:@"beginGroup"]) {
            [stack addObject:operation];
        } else if ([opName isEqualToString:@"endGroup"]) {
            while ([stack count] > 0) {
                NSDictionary* stackOperation = [stack lastObject];
                // Pop the stack operation & left parenthesis.
                [stack removeLastObject];
                if ([[stackOperation valueForKey:@"name"] isEqualToString:@"beginGroup"]) {
                    break;
                }
                [stack removeLastObject];
                [postfixExp addObject:stackOperation];
            }
        } else {
            // If an operand is found.
            [postfixExp addObject:operation];
        }
    }
    while ([stack count] > 0) {
        NSDictionary* stackOperation = [stack lastObject];
        [postfixExp addObject:stackOperation];
        [stack removeLastObject];
    }


    NSMutableArray* predicates = [[NSMutableArray alloc] init];
    
    for (NSDictionary* operation in postfixExp) {
        NSString *opName = [operation valueForKey:@"name"];
        if ([opName isEqualToString:@"not"]) {
            NSPredicate* predicate = [predicates lastObject];
            [predicates removeLastObject];
            [predicates addObject:[NSCompoundPredicate notPredicateWithSubpredicate:predicate]];
        } else if ([opName isEqualToString:@"or"]) {
            NSPredicate* predicateA = [predicates lastObject];
            [predicates removeLastObject];
            NSPredicate* predicateB = [predicates lastObject];
            [predicates removeLastObject];
            [predicates addObject:[NSCompoundPredicate orPredicateWithSubpredicates:
                                   [NSArray arrayWithObjects:predicateA, predicateB, nil]]];
        } else if ([opName isEqualToString:@"and"]) {
            NSPredicate* predicateA = [predicates lastObject];
            [predicates removeLastObject];
            NSPredicate* predicateB = [predicates lastObject];
            [predicates removeLastObject];
            [predicates addObject:[NSCompoundPredicate andPredicateWithSubpredicates:
                                   [NSArray arrayWithObjects:predicateA, predicateB, nil]]];
        } else {
            // Operand: Push it onto the stack.
            [predicates addObject:[self createPredicate:operation for:objectClass]];
        }
    }
    return [predicates lastObject];
}

- (NSArray*) addImplicitAndOperators:(NSArray*)operations {
    NSMutableArray* expression = [[NSMutableArray alloc] init];
    NSUInteger numOfOperations = [operations count];
    NSUInteger i = 0;
    while (i < numOfOperations) {
        NSDictionary* op = [operations objectAtIndex:i];
        NSString* opName = [op objectForKey:@"name"];
        NSDictionary* nextOp = i + 1 < numOfOperations ? [operations objectAtIndex:i + 1] : nil;
        // Current opName is operator, ( or the las element.
        if ([opName isEqualToString:@"beginGroup"] || [opName isEqualToString:@"or"] ||
            [opName isEqualToString:@"not"] || !nextOp) {
            [expression addObject:op];
        } else if (nextOp) {
            [expression addObject:op];
            NSString* nextOpName = [nextOp objectForKey:@"name"];
            if (!([nextOpName isEqualToString:@"or"] || [nextOpName isEqualToString:@"endGroup"])) {
                [expression addObject:[[NSDictionary alloc]
                                       initWithObjectsAndKeys:@"and", @"name", nil]];
            }
        }
        i++;
    }
    
    return [expression copy];
}
         
- (NSCompoundPredicate*)createPredicate:(NSDictionary*)op for:(Class)objectClass {
    DKPredicateBuilder* predicate = [[DKPredicateBuilder alloc] init];
    NSString *opName = [op valueForKey:@"name"];
    NSArray *args = [op valueForKey:@"args"];
    NSUInteger numOfArgs = [args count];
    NSString* arg0 = numOfArgs > 0 ? [args objectAtIndex:0] : nil;
    NSArray* keypathComponents = [arg0 componentsSeparatedByString:@"."];
    BOOL isKeypath = [arg0 rangeOfString:@"."].location != NSNotFound;
    BOOL oneToOneRelation = [self isRelationOneToOne: objectClass withPath:keypathComponents];
    NSString* aggregateOp = isKeypath && !oneToOneRelation ? @"ANY" : @"";

    if ([opName isEqualToString: @"between"]) {
        [predicate where:arg0 between:[args objectAtIndex:1] andThis:[args objectAtIndex:2]];
    } else if ([opName isEqualToString:@"contains"]) {
        BOOL casing = [args count] > 2 ? [args[2] boolValue] : NO;
        [predicate where:arg0 contains:[args objectAtIndex:1]
           caseSensitive: casing operator:aggregateOp];
    } else if ([opName isEqualToString: @"endsWith"]) {
        BOOL casing = [args count] > 2 ? [args[2] boolValue] : NO;
        [predicate where:arg0 endsWith:[args objectAtIndex:1]
           caseSensitive: casing operator:aggregateOp];
    } else if ([opName isEqualToString: @"equalTo"]) {
        BOOL casing = [args count] > 2 ? [args[2] boolValue] : NO;
        [predicate where:arg0 equals:[args objectAtIndex:1]
           caseSensitive: casing operator:aggregateOp];
    } else if ([opName isEqualToString: @"greaterThan"]) {
        id arg1 = [args objectAtIndex:1];
        if ([self isPropertyNSDate:objectClass withPath:keypathComponents]) {
            NSValueTransformer* transformer = [NSValueTransformer valueTransformerForName:
                                               MCJSONDateTimeTransformerName];
            arg1 = [transformer transformedValue: arg1];
        }
        [predicate where:arg0 greaterThan:arg1];
    }  else if ([opName isEqualToString: @"greaterThanOrEqualTo"]) {
        id arg1 = [args objectAtIndex:1];
        if ([self isPropertyNSDate:objectClass withPath:keypathComponents]) {
            NSValueTransformer* transformer = [NSValueTransformer valueTransformerForName:
                                               MCJSONDateTimeTransformerName];
            arg1 = [transformer transformedValue: arg1];
        }
        [predicate where:arg0 greaterThanOrEqualTo:arg1];
    } else if ([opName isEqualToString:@"in"]) {
        NSArray* inArg;
        NSArray* inArgRawValues = [args objectAtIndex: 1];
        
        if ([self isPropertyNSDate:objectClass withPath:keypathComponents]) {
            NSMutableArray* tmpDates = [[NSMutableArray alloc] initWithCapacity:
                                        [inArgRawValues count]];
            NSValueTransformer* transformer = [NSValueTransformer valueTransformerForName:
                                               MCJSONDateTimeTransformerName];
            for (NSString* strDate in inArgRawValues) {
                [tmpDates addObject:[transformer transformedValue:strDate]];
            }
            inArg = [[NSArray alloc] initWithArray:tmpDates];
        } else {
            inArg = inArgRawValues;
        }
        BOOL casing = [args count] > 2 ? [[args objectAtIndex:2] boolValue] : NO;
        [predicate where:arg0 isIn:inArg caseSensitive: casing operator:aggregateOp];
    } else if ([opName isEqualToString:@"isEmpty"]) {
        if ([self isPropertyRLMArray:objectClass withPath:keypathComponents]) {
            [predicate isEmptyArray:arg0];
        } else {
            [predicate where:arg0 equals:@"" caseSensitive:NO operator:@""];
        }
    } else if ([opName isEqualToString:@"isNotEmpty"]) {
        if ([self isPropertyRLMArray:objectClass withPath:keypathComponents]) {
            [predicate isNotEmptyArray:arg0];
        } else {
            [predicate where:arg0 doesntEqual:@"" caseSensitive:NO operator:@""];
        }
    } else if ([opName isEqualToString:@"isNotNull"]) {
        [predicate where:arg0 isNotNull:YES];
    } else if ([opName isEqualToString:@"isNull"]) {
        [predicate where:arg0 isNull:YES];
    } else if ([opName isEqualToString:@"lessThan"]) {
        id arg1 = [args objectAtIndex:1];
        if ([self isPropertyNSDate:objectClass withPath:keypathComponents]) {
            NSValueTransformer* transformer = [NSValueTransformer valueTransformerForName:
                                               MCJSONDateTimeTransformerName];
            arg1 = [transformer transformedValue: arg1];
        }
        [predicate where:arg0 lessThan:arg1];
    } else if ([opName isEqualToString:@"lessThanOrEqualTo"]) {
        id arg1 = [args objectAtIndex:1];
        if ([self isPropertyNSDate:objectClass withPath:keypathComponents]) {
            NSValueTransformer* transformer = [NSValueTransformer valueTransformerForName:
                                               MCJSONDateTimeTransformerName];
            arg1 = [transformer transformedValue: arg1];
        }
        [predicate where:arg0 lessThanOrEqualTo:arg1];
    } else if ([opName isEqualToString:@"notEqualTo"]) {
        BOOL casing = [args count] > 2 ? [args[2] boolValue] : NO;
        [predicate where:arg0 doesntEqual:@"" caseSensitive:casing operator:aggregateOp];
    }
    return [predicate compoundPredicate];
}

- (NSCompoundPredicate*)createPredicate:(NSDictionary*)opA and:(NSDictionary*)opB
                           operatedWith:(NSString*)operator for:(Class)objectClass {
    NSMutableArray* predicates = [[NSMutableArray alloc] init];
    
    [predicates addObject:[self createPredicate:opA for:objectClass]];
    if (opB != nil) {
        [predicates addObject:[self createPredicate:opB for:objectClass]];
    }
    
    if ([operator isEqualToString:@"not"]) {
        return [NSCompoundPredicate notPredicateWithSubpredicate:[predicates objectAtIndex:0]];
    } else if ([operator isEqualToString: @"or"]) {
        return [NSCompoundPredicate orPredicateWithSubpredicates:predicates];
    }
    return [NSCompoundPredicate andPredicateWithSubpredicates:predicates];
}

- (void)aggregate:(CDVInvokedUrlCommand*)command operation:(ResultOperationType)opType {
    NSNumber* realmResultsId = [command argumentAtIndex:0];
    NSString* property = [command argumentAtIndex:1];
    
    NSDictionary* resultsInfo = [[self realmResults] objectAtIndex:[realmResultsId integerValue]];
    RLMResults* results = [resultsInfo objectForKey:@"results"];

    NSNumber* value;
    switch (opType) {
        case ResultOperationTypeSum:
            value = [results sumOfProperty:property];
            break;
        case ResultOperationTypeMax:
            value = [results maxOfProperty:property];
            break;
        case ResultOperationTypeMin:
            value = [results minOfProperty:property];
            break;
        case ResultOperationTypeAverage:
            value = [results averageOfProperty:property];
            break;
        default:
            break;
    }
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                      messageAsDouble:[value doubleValue]];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

#pragma end

- (BOOL)isPropertyNSDate: (Class)objectClass withPath:(NSArray*) propertyPath {
    if ([propertyPath count] <= 0) {
        return NO;
    }
    NSString* targetProp = [propertyPath objectAtIndex:0];
    unsigned int pcount;
    objc_property_t *properties = class_copyPropertyList(objectClass, &pcount);
    for (int i = 0; i < pcount; i++) {
        NSLog(@"%@", [[NSString alloc] initWithCString:property_getName(properties[i])
                                              encoding:NSUTF8StringEncoding]);
        NSLog(@"%@", [[NSString alloc] initWithCString:property_getAttributes(properties[i])
                                              encoding:NSUTF8StringEncoding]);
        objc_property_t prop = properties[i];
        NSString* name = [[NSString alloc] initWithCString:property_getName(prop)
                                                  encoding:NSUTF8StringEncoding];
        if ([name isEqual: targetProp]) {
            NSString* originalType = [[NSString alloc] initWithCString:property_getAttributes(prop)
                                                              encoding:NSUTF8StringEncoding];
            if ([originalType hasPrefix:@"T@\"NSDate\""]) {
                return YES;
            } else if ([originalType hasPrefix:@"T@\"RLMArray"]) {
                NSUInteger startRange = [originalType rangeOfString:@"<"].location;
                NSUInteger endRange = [originalType rangeOfString:@">"].location;
                NSString* className = [originalType substringWithRange:
                                       NSMakeRange(startRange + 1, endRange - startRange - 1)];
                
                return [self isPropertyNSDate:NSClassFromString(className)
                                     withPath:[propertyPath subarrayWithRange:
                                               NSMakeRange(1, [propertyPath count] - 1)]];
            } else if ([originalType hasPrefix:@"T@"]) {
                NSUInteger endRange = [originalType rangeOfString:@"\","].location;
                NSString* className = [originalType substringWithRange:
                                       NSMakeRange(3, endRange - 3)];
                return [self isPropertyNSDate:NSClassFromString(className)
                                     withPath:[propertyPath subarrayWithRange:
                                               NSMakeRange(1, [propertyPath count] - 1)]];
            }
            return NO;
        }
    }
    return NO;
}

- (BOOL)isRelationOneToOne: (Class)objectClass withPath:(NSArray*) propertyPath {
    return ![self isPropertyRLMArray:objectClass withPath:propertyPath];
}

- (BOOL)isPropertyRLMArray: (Class)objectClass withPath:(NSArray*) propertyPath {
    NSString* targetProp = [propertyPath objectAtIndex:0];
    unsigned int pcount;
    objc_property_t *properties = class_copyPropertyList(objectClass, &pcount);
    for (int i = 0; i < pcount; i++) {
        objc_property_t prop = properties[i];
        NSString* name = [[NSString alloc] initWithCString:property_getName(prop)
                                                  encoding:NSUTF8StringEncoding];
        if ([name isEqual: targetProp]) {
            NSString* originalType = [[NSString alloc] initWithCString:property_getAttributes(prop)
                                                              encoding:NSUTF8StringEncoding];
            if ([originalType hasPrefix:@"T@\"RLMArray"]) {
                return YES;
            }
            return NO;
        }
    }
    return NO;
}

- (NSArray*)schemaToJSON:(RLMRealm*)realm {
    NSMutableArray *schemas = [[NSMutableArray alloc] init];
    RLMSchema *schema = [realm schema];
    NSArray *objectSchemas = [schema objectSchema];
    for (RLMObjectSchema *objectSchema in objectSchemas) {
        NSMutableDictionary *model = [[NSMutableDictionary alloc] init];
        [model setObject:[objectSchema className] forKey:@"name"];
        RLMProperty *pkProperty = [objectSchema primaryKeyProperty];
        if (pkProperty != nil) {
            [model setObject:[pkProperty name] forKey:@"primaryKey"];
        }
        NSArray *properties = [objectSchema properties];
        NSMutableDictionary *modelProperties = [[NSMutableDictionary alloc] init];
        for (RLMProperty *property in properties) {
            NSString *type;
            NSString *objectType = nil;
            switch ([property type]) {
                case RLMPropertyTypeBool:
                    type = @"boolean";
                    break;
                case RLMPropertyTypeString:
                    type = @"string";
                    break;
                case RLMPropertyTypeDate:
                    type = @"date";
                    break;
                case RLMPropertyTypeDouble:
                    type = @"double";
                    break;
                case RLMPropertyTypeFloat:
                    type = @"float";
                    break;
                case RLMPropertyTypeInt:
                    type = @"int";
                    break;
                case RLMPropertyTypeData:
                    type = @"data";
                    break;
                case RLMPropertyTypeObject:
                    type = @"object";
                    objectType = [self schemaPropertyType:realm schema:[objectSchema className] field:[property name]];
                    break;
                case RLMPropertyTypeArray:
                    type = @"list";
                    objectType = [self schemaPropertyType:realm schema:[objectSchema className] field:[property name]];
                default:
                    break;
            }
            NSDictionary *jsonProperty = [NSDictionary dictionaryWithObjectsAndKeys:
                                          type, @"type",
                                          objectType, @"objectType",
                                          @([property indexed]), @"indexed",
                                          @([property optional]), @"optional",
                                          nil];
            [modelProperties setObject:jsonProperty forKey:[property name]];
        }
        [model setObject:modelProperties forKey:@"properties"];
        [schemas addObject:model];
    }
    return schemas;
}

- (NSString*)schemaPropertyType:(RLMRealm *)realm schema:(NSString*)schemaName field:(NSString*)fieldName {
    Class objectClass = NSClassFromString(schemaName);
    unsigned int pcount;
    objc_property_t *properties = class_copyPropertyList(objectClass, &pcount);
    for (int i = 0; i < pcount; i++) {
        objc_property_t prop = properties[i];
        NSString* name = [[NSString alloc] initWithCString:property_getName(prop)
                                                  encoding:NSUTF8StringEncoding];
        if ([name isEqual: fieldName]) {
            NSString* originalType = [[NSString alloc] initWithCString:property_getAttributes(prop)
                                                              encoding:NSUTF8StringEncoding];
            if ([originalType hasPrefix:@"T@\"RLMArray"]) {
                NSUInteger startRange = [originalType rangeOfString:@"<"].location;
                NSUInteger endRange = [originalType rangeOfString:@">"].location;
                return [originalType substringWithRange:
                                       NSMakeRange(startRange + 1, endRange - startRange - 1)];
            } else if ([originalType hasPrefix:@"T@"]) {
                NSUInteger endRange = [originalType rangeOfString:@"\","].location;
                return [originalType substringWithRange:
                        NSMakeRange(3, endRange - 3)];
            }
            return originalType;
        }
    }
    return nil;
}

@end
