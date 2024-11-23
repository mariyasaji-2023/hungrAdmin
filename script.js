const fs = require('fs');
const JSONStream = require('JSONStream');
const { MongoClient } = require('mongodb');

class RestaurantProcessor {
    constructor(mongoUri = 'mongodb+srv://hungrx001:b19cQlcRApahiWUD@cluster0.ynchc4e.mongodb.net/hungerX', dbName = 'hungerX') {
        this.mongoUri = mongoUri;
        this.dbName = dbName;
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            this.client = await MongoClient.connect(this.mongoUri);
            this.db = this.client.db(this.dbName);
            console.log('Connected to MongoDB successfully');

            // Get existing collection info
            const collection = this.db.collection('restaurants');
            const existingCount = await collection.countDocuments();
            console.log(`Found ${existingCount} existing documents in collection`);

        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    async splitAndStore(inputFile, itemsPerChunk = 100) {
        try {
            let currentChunk = [];
            let chunkNumber = 0;
            let totalItems = 0;
            let updatedCount = 0;
            let newCount = 0;

            // Function to clean restaurant data
            const cleanRestaurant = (restaurant) => {
                if (!restaurant) return null;
                
                // Ensure ID exists
                if (!restaurant.id) {
                    restaurant.id = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }

                // Add timestamp for new data
                restaurant.updatedAt = new Date();
                restaurant.source = 'nutritionix_import';

                return restaurant;
            };

            // Function to store chunk in MongoDB
            const storeChunk = async (restaurants) => {
                try {
                    const collection = this.db.collection('restaurants');
                    
                    // Clean and prepare restaurants
                    const validRestaurants = restaurants
                        .map(cleanRestaurant)
                        .filter(r => r !== null);

                    if (validRestaurants.length === 0) return;

                    // Use bulkWrite with ordered: false for parallel processing
                    const operations = validRestaurants.map(restaurant => ({
                        updateOne: {
                            filter: { id: restaurant.id },
                            update: {
                                $set: restaurant,
                                $setOnInsert: {
                                    createdAt: new Date()
                                }
                            },
                            upsert: true
                        }
                    }));

                    const result = await collection.bulkWrite(operations, { ordered: false });
                    
                    // Track updates and insertions
                    if (result.result) {
                        updatedCount += result.result.nModified || 0;
                        newCount += result.result.nUpserted || 0;
                    }

                    console.log(`Processed chunk ${chunkNumber}: Updated ${result.result.nModified || 0}, Inserted ${result.result.nUpserted || 0} restaurants`);
                    
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`Duplicate keys found in chunk ${chunkNumber}, continuing with next chunk`);
                    } else {
                        throw error;
                    }
                }
            };

            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(inputFile)
                    .pipe(JSONStream.parse('restaurants.*'));

                readStream.on('data', async (restaurant) => {
                    currentChunk.push(restaurant);
                    totalItems++;

                    if (currentChunk.length >= itemsPerChunk) {
                        readStream.pause();
                        await storeChunk(currentChunk);
                        currentChunk = [];
                        chunkNumber++;
                        readStream.resume();
                    }
                });

                readStream.on('end', async () => {
                    if (currentChunk.length > 0) {
                        await storeChunk(currentChunk);
                    }
                    console.log('\nImport Summary:');
                    console.log(`Total items processed: ${totalItems}`);
                    console.log(`New restaurants added: ${newCount}`);
                    console.log(`Existing restaurants updated: ${updatedCount}`);
                    resolve({ totalItems, newCount, updatedCount });
                });

                readStream.on('error', (error) => {
                    console.error('Error processing file:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error in splitAndStore:', error);
            throw error;
        }
    }

    async validateData() {
        try {
            const collection = this.db.collection('restaurants');
            
            // Get collection stats
            const totalCount = await collection.countDocuments();
            const nutritionixCount = await collection.countDocuments({ source: 'nutritionix_import' });
            const recentlyUpdated = await collection.countDocuments({
                updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            console.log('\nValidation Results:');
            console.log(`Total restaurants in collection: ${totalCount}`);
            console.log(`Restaurants from Nutritionix import: ${nutritionixCount}`);
            console.log(`Recently updated restaurants: ${recentlyUpdated}`);

            // Sample some recently added documents
            const sample = await collection.find({
                source: 'nutritionix_import'
            }).limit(3).toArray();

            console.log('\nSample of recently imported restaurants:');
            sample.forEach(doc => {
                console.log(`- ${doc.name} (ID: ${doc.id})`);
            });

            return {
                totalCount,
                nutritionixCount,
                recentlyUpdated
            };
        } catch (error) {
            console.error('Error validating data:', error);
            throw error;
        }
    }

    async close() {
        if (this.client) {
            await this.client.close();
            console.log('MongoDB connection closed');
        }
    }
}

// Usage example
async function main() {
    const processor = new RestaurantProcessor();
    
    try {
        await processor.connect();
        await processor.splitAndStore(
            'nutritionix_restaurant.json',
            100  // restaurants per chunk
        );
        await processor.validateData();
    } catch (error) {
        console.error('Error in main:', error);
    } finally {
        await processor.close();
    }
}

// Run the script
main();

// const fs = require('fs');
// const JSONStream = require('JSONStream');
// const { MongoClient } = require('mongodb');

// class FoodProcessor {
//     constructor(mongoUri = 'mongodb+srv://hungrx001:Os4GO3Iajie9lvGr@hungrx.8wv0t.mongodb.net/hungerX', dbName = 'hungerX') {
//         this.mongoUri = mongoUri;
//         this.dbName = dbName;
//         this.client = null;
//         this.db = null;
//     }

//     async connect() {
//         try {
//             this.client = await MongoClient.connect(this.mongoUri);
//             this.db = this.client.db(this.dbName);
//             console.log('Connected to MongoDB successfully');

//             // Get existing collection info
//             const collection = this.db.collection('grocery');
//             const existingCount = await collection.countDocuments();
//             console.log(`Found ${existingCount} existing documents in grocery collection`);

//         } catch (error) {
//             console.error('MongoDB connection error:', error);
//             throw error;
//         }
//     }

//     async splitAndStore(inputFile, itemsPerChunk = 100) {
//         try {
//             let currentChunk = [];
//             let chunkNumber = 0;
//             let totalItems = 0;
//             let updatedCount = 0;
//             let newCount = 0;

//             // Function to clean food data
//             const cleanFood = (food) => {
//                 if (!food) return null;
                
//                 // Ensure ID exists
//                 if (!food.id) {
//                     food.id = `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//                 }

//                 // Add timestamp for new data
//                 food.updatedAt = new Date();
//                 food.source = 'nutritionix_import';

//                 return food;
//             };

//             // Function to store chunk in MongoDB
//             const storeChunk = async (foods) => {
//                 try {
//                     const collection = this.db.collection('grocery');
                    
//                     // Clean and prepare foods
//                     const validFoods = foods
//                         .map(cleanFood)
//                         .filter(f => f !== null);

//                     if (validFoods.length === 0) return;

//                     // Use bulkWrite with ordered: false for parallel processing
//                     const operations = validFoods.map(food => ({
//                         updateOne: {
//                             filter: { id: food.id },
//                             update: {
//                                 $set: food,
//                                 $setOnInsert: {
//                                     createdAt: new Date()
//                                 }
//                             },
//                             upsert: true
//                         }
//                     }));

//                     const result = await collection.bulkWrite(operations, { ordered: false });
                    
//                     // Track updates and insertions
//                     if (result.result) {
//                         updatedCount += result.result.nModified || 0;
//                         newCount += result.result.nUpserted || 0;
//                     }

//                     console.log(`Processed chunk ${chunkNumber}: Updated ${result.result.nModified || 0}, Inserted ${result.result.nUpserted || 0} food items`);
                    
//                 } catch (error) {
//                     if (error.code === 11000) {
//                         console.log(`Duplicate keys found in chunk ${chunkNumber}, continuing with next chunk`);
//                     } else {
//                         throw error;
//                     }
//                 }
//             };

//             return new Promise((resolve, reject) => {
//                 const readStream = fs.createReadStream(inputFile)
//                     .pipe(JSONStream.parse('foods.*')); // Changed to parse foods array

//                 readStream.on('data', async (food) => {
//                     currentChunk.push(food);
//                     totalItems++;

//                     if (currentChunk.length >= itemsPerChunk) {
//                         readStream.pause();
//                         await storeChunk(currentChunk);
//                         currentChunk = [];
//                         chunkNumber++;
//                         readStream.resume();
//                     }
//                 });

//                 readStream.on('end', async () => {
//                     if (currentChunk.length > 0) {
//                         await storeChunk(currentChunk);
//                     }
//                     console.log('\nImport Summary:');
//                     console.log(`Total items processed: ${totalItems}`);
//                     console.log(`New food items added: ${newCount}`);
//                     console.log(`Existing food items updated: ${updatedCount}`);
//                     resolve({ totalItems, newCount, updatedCount });
//                 });

//                 readStream.on('error', (error) => {
//                     console.error('Error processing file:', error);
//                     reject(error);
//                 });
//             });
//         } catch (error) {
//             console.error('Error in splitAndStore:', error);
//             throw error;
//         }
//     }

//     async validateData() {
//         try {
//             const collection = this.db.collection('grocery');
            
//             // Get collection stats
//             const totalCount = await collection.countDocuments();
//             const nutritionixCount = await collection.countDocuments({ source: 'nutritionix_import' });
//             const recentlyUpdated = await collection.countDocuments({
//                 updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
//             });

//             console.log('\nValidation Results:');
//             console.log(`Total food items in collection: ${totalCount}`);
//             console.log(`Food items from Nutritionix import: ${nutritionixCount}`);
//             console.log(`Recently updated food items: ${recentlyUpdated}`);

//             // Sample some recently added documents with more detailed info
//             const sample = await collection.find({
//                 source: 'nutritionix_import'
//             }).limit(3).toArray();

//             console.log('\nSample of recently imported food items:');
//             sample.forEach(doc => {
//                 console.log(`- ${doc.name} (ID: ${doc.id})`);
//                 console.log(`  Category: ${doc.category.main} > ${doc.category.sub.join(' > ')}`);
//                 console.log(`  Serving: ${doc.servingInfo.size}${doc.servingInfo.unit}`);
//                 console.log(`  Calories: ${doc.nutritionFacts.calories}`);
//             });

//             return {
//                 totalCount,
//                 nutritionixCount,
//                 recentlyUpdated
//             };
//         } catch (error) {
//             console.error('Error validating data:', error);
//             throw error;
//         }
//     }

//     async close() {
//         if (this.client) {
//             await this.client.close();
//             console.log('MongoDB connection closed');
//         }
//     }
// }

// // Usage example
// async function main() {
//     const processor = new FoodProcessor();
    
//     try {
//         await processor.connect();
//         await processor.splitAndStore(
//             'formatted_nutritionix_commonfood[1].json',  // your input file
//             100           // foods per chunk
//         );
//         await processor.validateData();
//     } catch (error) {
//         console.error('Error in main:', error);
//     } finally {
//         await processor.close();
//     }
// }

// // Run the script
// main();