#import <Cordova/CDV.h>

@interface RealmPlugin : CDVPlugin {
    NSMutableArray* realms;
    NSMutableArray* realmResults;
}
@property (nonatomic, strong) NSMutableArray* realms;
@property (nonatomic, strong) NSMutableArray* realmResults;

- (void)initialize:(CDVInvokedUrlCommand*)command;
- (void)write:(CDVInvokedUrlCommand*)command;
- (void)findAll:(CDVInvokedUrlCommand*)command;
@end
