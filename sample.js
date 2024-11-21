const deleteDish = async (req, res) => {
    const { restaurantId, menuId, dishId } = req.body;

    try {
        // Required field validation
        if (!restaurantId || !menuId || !dishId) {
            return res.status(400).json({
                status: false,
                error: 'Restaurant ID, menu ID, and dish ID are required'
            });
        }

        // Validate MongoDB ObjectId format
        if (!ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Restaurant ID format - must be a valid MongoDB ObjectId'
            });
        }

        // Validate menuId format
        if (!menuId.startsWith('bk-menu-')) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Menu ID format - must start with "bk-menu-"'
            });
        }

        // Validate dishId format
        if (!dishId.startsWith('bk-dish-')) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Dish ID format - must start with "bk-dish-"'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();

        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');

        // Verify restaurant exists and get current dish info
        const restaurant = await restaurantsCollection.findOne({
            _id: new ObjectId(restaurantId)
        });

        if (!restaurant) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Find the menu
        const menu = restaurant.menus?.find(m => m.id === menuId);
        if (!menu) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Menu not found'
            });
        }

        // Check if dish exists
        const dishExists = menu.dishes?.some(dish => dish.id === dishId);
        if (!dishExists) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Dish not found in the specified menu'
            });
        }

        // Remove dish from menu
        const result = await restaurantsCollection.updateOne(
            {
                _id: new ObjectId(restaurantId),
                "menus.id": menuId
            },
            {
                $pull: {
                    "menus.$.dishes": { id: dishId }
                }
            }
        );

        await client.close();

        if (result.modifiedCount > 0) {
            res.status(200).json({
                status: true,
                message: 'Dish deleted successfully'
            });
        } else {
            throw new Error('Failed to delete dish from menu');
        }

    } catch (error) {
        console.error('Error deleting dish:', error);
        res.status(500).json({
            status: false,
            error: 'Error deleting dish',
            details: error.message
        });
    }
};