#import <Realm/Realm.h>

@class Car;

@class Person;

@class Artist;

@class Album;

@class Comment;

@class Picture;

@class Post;

 

@interface Car : RLMObject

@property NSString *make;

@property NSString *model;

@end
RLM_ARRAY_TYPE(Car)


@interface Person : RLMObject

@property NSInteger id;

@property NSString *name;

@property NSDate *birthday;

@property RLMArray<Car *><Car> *cars;

@end
RLM_ARRAY_TYPE(Person)


@interface Artist : RLMObject

@property NSString *name;

@property NSDate *born;

@end
RLM_ARRAY_TYPE(Artist)


@interface Album : RLMObject

@property NSInteger id;

@property NSString *name;

@property NSString *genre;

@property NSDate *released;

@property Artist *artist;

@end
RLM_ARRAY_TYPE(Album)


@interface Comment : RLMObject

@property NSString *text;

@property NSDate *timestamp;

@property NSInteger likes;

@end
RLM_ARRAY_TYPE(Comment)


@interface Picture : RLMObject

@property NSInteger id;

@property NSString *src;

@property RLMArray<Comment *><Comment> *comments;

@end
RLM_ARRAY_TYPE(Picture)


@interface Post : RLMObject

@property NSInteger id;

@property NSString *body;

@property NSDate *publishDate;

@property RLMArray<Picture *><Picture> *images;

@property RLMArray<Comment *><Comment> *comments;

@end
RLM_ARRAY_TYPE(Post)





@implementation Car

@end

@implementation Person

+ (NSString *)primaryKey {
    return @"id";
}

@end

@implementation Artist

+ (NSString *)primaryKey {
    return @"name";
}

@end

@implementation Album

+ (NSString *)primaryKey {
    return @"id";
}

@end

@implementation Comment

@end

@implementation Picture

+ (NSString *)primaryKey {
    return @"id";
}

@end

@implementation Post

+ (NSString *)primaryKey {
    return @"id";
}

@end


