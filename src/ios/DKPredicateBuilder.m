//
//  DKPredicateBuilder.m
//  DiscoKit
//
//  Created by Keith Pitt on 12/07/11.
//  Copyright 2011 Mostly Disco. All rights reserved.
//

#import "DKPredicateBuilder.h"

@interface DKPredicateBuilder()
- (NSString*) getRawPredicate:(NSString*)method caseSensitive:(BOOL)casing operator:(NSString*)aggregate;
@end

@implementation DKPredicateBuilder

@synthesize predicates, sorters, limit, offset;

- (id)init {
        
    if ((self = [super init])) {
                
        // Create the predicates mutable array
        predicates = [[NSMutableArray alloc] init];
        
        // Create the sorters mutable array
        sorters = [[NSMutableArray alloc] init];
        
    }
    
    return self;
    
}

- (id)where:(DKPredicate *)predicate {
    
    [self.predicates addObject:predicate];
    
    return self;
    
}

- (id)where:(NSString *)key isFalse:(BOOL)value {
    
    [self where:key isTrue:!value];
    
    return self;
    
}

- (id)where:(NSString *)key isTrue:(BOOL)value {
    
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"%K = %@", key, [NSNumber numberWithBool:value]]
                                predicateType:value ? DKPredicateTypeIsTrue : DKPredicateTypeIsFalse
                                         info:[NSDictionary dictionaryWithObject:key forKey:@"column"]]];
    
    return self;
    
}

- (id)where:(NSString *)key isNull:(BOOL)value {
    
    if (value == YES) {
        
        [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"%K == nil", key]
                                    predicateType:value ? DKPredicateTypeIsTrue : DKPredicateTypeIsFalse
                                             info:[NSDictionary dictionaryWithObject:key forKey:@"column"]]];
        
    } else {
        
        [self where:key isNotNull:YES];
        
    }
    
    return self;
    
}

- (id)where:(NSString *)key isNotNull:(BOOL)value {
    
    if (value == YES) {
        
        [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"%K != nil", key]
                                    predicateType:value ? DKPredicateTypeIsTrue : DKPredicateTypeIsFalse
                                             info:[NSDictionary dictionaryWithObject:key forKey:@"column"]]];
        
    } else {
        
        [self where:key isNull:YES];
        
    }
    
    return self;
    
}

- (id)where:(NSString *)key equals:(id)value caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"=" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate, key, value]
                                predicateType:DKPredicateTypeEquals
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key doesntEqual:(id)value caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"!=" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate, key, value]
                                predicateType:DKPredicateTypeNotEquals
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key isIn:(NSArray *)values caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"IN" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate,
                                            key, values]
                             predicateType:DKPredicateTypeIn
                                      info:[NSDictionary dictionaryWithObjectsAndKeys:
                                            key, @"column",
                                            values, @"values",
                                            nil]]];
    
    return self;
}

- (id)where:(NSString *)key isIn:(NSArray *)values {
    return [self where:key isIn:values caseSensitive:NO operator:@""];
    
}

- (id)where:(NSString *)key isNotIn:(NSArray *)values {
    
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"NOT %K IN (%@)", key, values]
                                predicateType:DKPredicateTypeNotIn
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               values, @"values",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key startsWith:(NSString *)value caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"BEGINSWITH" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate,
                                            key, value]
                             predicateType:DKPredicateTypeStartsWith
                                      info:[NSDictionary dictionaryWithObjectsAndKeys:
                                            key, @"column",
                                            value, @"value",
                                            nil]]];
    
    return self;
}

- (id)where:(NSString *)key startsWith:(NSString *)value {
    return [self where:key startsWith:value caseSensitive:NO operator:@""];
}

- (id)where:(NSString *)key doesntStartWith:(NSString *)value {
    
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"NOT %K BEGINSWITH[c] %@", key, value]
                                predicateType:DKPredicateTypeDoesntStartWith
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key endsWith:(NSString *)value caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"ENDSWITH" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate,
                                            key, value]
                                predicateType:DKPredicateTypeEndsWith
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key endsWith:(NSString *)value {
    return [self where:key endsWith:value caseSensitive:NO operator:@""];
}

- (id)where:(NSString *)key doesntEndWith:(NSString *)value {
    
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"NOT %K ENDSWITH[c] %@", key, value]
                                predicateType:DKPredicateTypeDoesntEndWith
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key contains:(NSString *)value caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"CONTAINS" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate,
                                            key, value]
                                predicateType:DKPredicateTypeContains
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key contains:(NSString *)value {
    return [self where:key contains:value caseSensitive:NO operator:@""];
}

- (id)where:(NSString *)key like:(NSString *)value caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* rawPredicate = [self getRawPredicate:@"LIKE" caseSensitive:casing operator:aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:rawPredicate,
                                            key, value]
                                predicateType:DKPredicateTypeLike
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)subquery:(NSString *)collection variableName:(NSString *)varName predicateFormat:(NSCompoundPredicate *)predicate {
    [self where:[DKPredicate withPredicate:predicate
                             predicateType:DKPredicateTypeSubquery
                                      info:[NSDictionary dictionaryWithObjectsAndKeys:
                                            collection, @"collection",
                                            varName, @"varName", nil]]];
    return self;
}

- (id)where:(NSString *)key like:(NSString *)value {
    return [self where:key like:value caseSensitive:NO operator:@""];
}

- (id)where:(NSString *)key greaterThan:(id)value operator:(NSString*)aggregate {
    NSString* pred = [[NSString alloc] initWithFormat:@"%@ %%K > %%@", aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:pred, key, value]
                                predicateType:DKPredicateTypeGreaterThan
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
}

- (id)where:(NSString *)key greaterThanOrEqualTo:(id)value operator:(NSString*)aggregate {
    NSString* pred = [[NSString alloc] initWithFormat:@"%@ %%K >= %%@", aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:pred, key, value]
                                predicateType:DKPredicateTypeGreaterThanOrEqualTo
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key lessThan:(id)value operator:(NSString*)aggregate {
    NSString* pred = [[NSString alloc] initWithFormat:@"%@ %%K < %%@", aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:pred, key, value]
                                predicateType:DKPredicateTypeLessThan
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key lessThanOrEqualTo:(id)value operator:(NSString*)aggregate {
    NSString* pred = [[NSString alloc] initWithFormat:@"%@ %%K <= %%@", aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:pred, key, value]
                                predicateType:DKPredicateTypeLessThanOrEqualTo
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               value, @"value",
                                               nil]]];
    
    return self;
    
}

- (id)where:(NSString *)key between:(id)first andThis:(id)second operator:(NSString*)aggregate {
    NSString* pred = [[NSString alloc] initWithFormat:@"(%@ %%K >= %%@) AND (%@ %%K < %%@)", aggregate, aggregate];
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:pred, key, first, key, second]
                                predicateType:DKPredicateTypeBetween
                                         info:[NSDictionary dictionaryWithObjectsAndKeys:
                                               key, @"column",
                                               first, @"first",
                                               second, @"second",
                                               nil]]];
    
    return self;
    
}

- (id)isEmptyArray:(NSString *)key {
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"%K.@count = 0", key]
                             predicateType:DKPredicateTypeBetween
                                      info:[NSDictionary dictionaryWithObjectsAndKeys:
                                            key, @"column",
                                            nil]]];
    
    return self;
    
}

- (id)isNotEmptyArray:(NSString *)key {
    [self where:[DKPredicate withPredicate:[NSPredicate predicateWithFormat:@"%K.@count > 0", key]
                             predicateType:DKPredicateTypeBetween
                                      info:[NSDictionary dictionaryWithObjectsAndKeys:
                                            key, @"column",
                                            nil]]];
    
    return self;
    
}

- (id)orderBy:(NSString *)column ascending:(BOOL)ascending {
    
    // Create the sort descriptor
    NSSortDescriptor * sort = [[NSSortDescriptor alloc] initWithKey:column
                                                          ascending:ascending];
    
    // Add it to the sorters array
    [self.sorters addObject:sort];
    
    return self;
    
}

- (id)offset:(int)value {
    
    // Set the offset
    self.offset = [NSNumber numberWithInt:value];
    
    return self;
    
}

- (id)limit:(int)value {
    
    // Set the limit
    self.limit = [NSNumber numberWithInt:value];
    
    return self;
    
}

- (NSCompoundPredicate *)compoundPredicate {
    
    // Collect all the predicates
    NSMutableArray * collectedPredicates = [NSMutableArray array];
    for (DKPredicate * relPredicate in predicates) {
        if ([relPredicate predicateType] == DKPredicateTypeSubquery) {
            NSString* subqueryPredicate = [[((DKPredicateBuilder *)[relPredicate predicate]) compoundPredicate] predicateFormat];
            NSString* subquery = [NSString stringWithFormat:@"(%@)", subqueryPredicate];
            [collectedPredicates addObject:[NSPredicate predicateWithFormat: subquery]];
        } else {
            [collectedPredicates addObject:relPredicate.predicate];
        }
    }
    
    // Add the predicates to a NSCompoundPredicate
    NSCompoundPredicate * compoundPredicate = [[NSCompoundPredicate alloc] initWithType:NSAndPredicateType
                                                                          subpredicates:collectedPredicates];
    
    return compoundPredicate;
    
}

- (void)dealloc {
}

- (NSString*) getRawPredicate:(NSString*)method caseSensitive:(BOOL)casing operator:(NSString*)aggregate {
    NSString* aggregatePart = aggregate && [aggregate length] > 0 ?
        [NSString stringWithFormat:@"%@ ", aggregate] :
        @"";
    NSString* casingPart = !casing ? @"[c]" : @"";
    return [[NSString alloc] initWithFormat:@"%@%%K %@%@ %%@", aggregatePart, method, casingPart];
}

@end
