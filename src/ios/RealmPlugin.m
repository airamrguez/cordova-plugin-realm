#import <Cordova/CDV.h>
#import <Realm/Realm.h>
#import <Realm/RLMObject.h>
#import "RealmPlugin.h"
#import "Models.h"
#import "RLMObject+JSON.h"

#import <objc/runtime.h>

@implementation RealmPlugin

@synthesize realms;
@synthesize realmResults;

- (void)initialize:(CDVInvokedUrlCommand*)command
{
    NSString* callbackId = command.callbackId;
    NSDictionary* options = [command argumentAtIndex:0 withDefault:nil];
    
    [[NSFileManager defaultManager] removeItemAtURL:[RLMRealmConfiguration defaultConfiguration].fileURL error:nil];

    NSArray* rawSchema = [options objectForKey: @"schema"];

    if ([self realms] == nil) {
        [self setRealms: [[NSMutableArray alloc] init]];
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
            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageToErrorObject:1];
            [self.commandDelegate sendPluginResult:result callbackId:callbackId];
            return;
        }
    } else {
      realm = [RLMRealm defaultRealm];
    }
    [[self realms] addObject: realm];
    
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsNSInteger:realmID];
    [self.commandDelegate sendPluginResult:result callbackId:callbackId];
}

- (void)write:(CDVInvokedUrlCommand*)command
{
    NSNumber *realmInstanceId = [command argumentAtIndex:0];
    NSString *schemaName = [command argumentAtIndex:1];
    NSDictionary *rawJSON = [command argumentAtIndex:2 withDefault: nil];
    
    RLMRealm *realm = [[self realms] objectAtIndex:[realmInstanceId integerValue]];
    [realm beginWriteTransaction];
    Class objectClass = NSClassFromString(schemaName);
    [objectClass createOrUpdateInRealm: realm withJSONDictionary: rawJSON];
    [realm commitWriteTransaction];
    
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)findAll:(CDVInvokedUrlCommand*)command
{
    NSNumber *realmInstanceId = [command argumentAtIndex:0];
    NSString *schemaName = [command argumentAtIndex:1];
    // TODO
    // NSArray *operations = [command argumentAtIndex:2 withDefault:nil];

    Class objectClass = NSClassFromString(schemaName);
    RLMRealm *realm = [[self realms] objectAtIndex:[realmInstanceId integerValue]];
    RLMResults *results = [objectClass allObjectsInRealm:realm];
    NSInteger resultsId = [[self realmResults] count];
    [[self realmResults] addObject:results];
    
    NSMutableArray *arr = [NSMutableArray new];
    for (RLMObject *object in results) {
        [arr addObject:[object JSONDictionary]];
    }
    
    NSDictionary *resultArgs = [NSDictionary dictionaryWithObjectsAndKeys:
                                [NSNumber numberWithInteger:resultsId], @"realmResultsId",
                                arr, @"results",
                                nil];
    
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultArgs];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}
@end
