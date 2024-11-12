// Example usage
const uri = 'mongodb://localhost:27017';
const dbName = 'your_database';
const collectionsToRemove = ['collection1', 'collection2', 'collection3'];

async function main() {
    try {
        const results = await removeMultipleCollections(uri, dbName, collectionsToRemove);
        console.log('Results:', results);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();