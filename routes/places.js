// routes/places.js
import express from 'express';
import mongoose from 'mongoose';
import TourismPlace from '../models/scema.js';

const router = express.Router();

// GET /api/places/test - Test endpoint
router.get('/test', async (req, res) => {
  try {
    const count = await TourismPlace.countDocuments();
    const sample = await TourismPlace.findOne();
    
    console.log(`Test endpoint - Total places: ${count}`);
    
    if (sample) {
      console.log('Sample place:', {
        name: sample.getName(),
        city: sample.getCity(),
        state: sample.getState(),
        category: sample.getCategory(),
        coordinates: sample.getLatLng()
      });
    }
    
    res.json({
      success: true,
      totalPlaces: count,
      sample: sample ? {
        id: sample._id,
        name: sample.getName(),
        city: sample.getCity(),
        state: sample.getState(),
        category: sample.getCategory(),
        type: sample.properties?.tourism,
        coordinates: sample.getLatLng()
      } : null,
      message: count > 0 ? `Found ${count} places in database` : 'No data found in tourisplaces collection'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/places - Get all places with filters
router.get('/', async (req, res) => {
  try {
    const { state, city, category, search, limit = 100, page = 1 } = req.query;
    
    let query = {};
    
    // Apply filters
    if (state && state !== 'all') {
      query.$or = [
        { 'properties.state': state },
        { 'properties.addr:state': state }
      ];
    }
    
    if (city && city !== 'all') {
      query.$or = query.$or || [];
      query.$or.push(
        { 'properties.city': city },
        { 'properties.addr:city': city }
      );
    }
    
    if (category && category !== 'all') {
      // Search in properties for category
      if (category === 'accommodation') {
        query.$or = query.$or || [];
        query.$or.push(
          { 'properties.tourism': 'hotel' },
          { 'properties.tourism': 'guest_house' },
          { 'properties.tourism': 'hostel' }
        );
      } else if (category === 'cultural') {
        query.$or = query.$or || [];
        query.$or.push(
          { 'properties.tourism': 'attraction' },
          { 'properties.tourism': 'museum' }
        );
      } else if (category === 'historical') {
        query.$or = query.$or || [];
        query.$or.push({ 'properties.historic': { $exists: true } });
      } else if (category === 'religious') {
        query.$or = query.$or || [];
        query.$or.push(
          { 'properties.amenity': 'place_of_worship' },
          { 'properties.religion': { $exists: true } }
        );
      }
    }
    
    if (search) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'properties.name': { $regex: search, $options: 'i' } },
        { 'properties.description': { $regex: search, $options: 'i' } }
      );
    }
    
    const skip = (page - 1) * limit;
    
    const places = await TourismPlace.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Enhance places with computed fields
    const enhancedPlaces = places.map(place => ({
      _id: place._id,
      id: place.id,
      name: place.getName(),
      city: place.getCity(),
      state: place.getState(),
      category: place.getCategory(),
      type: place.properties?.tourism || place.properties?.historic,
      description: place.properties?.description,
      phone: place.properties?.phone,
      website: place.properties?.website,
      wheelchair: place.properties?.wheelchair,
      stars: place.properties?.stars,
      location: {
        type: 'Point',
        coordinates: place.geometry?.coordinates
      },
      coordinates: place.getLatLng(),
      originalData: place.properties
    }));
    
    const total = await TourismPlace.countDocuments(query);
    
    console.log(`Found ${enhancedPlaces.length} places, Total: ${total}`);
    
    res.json({
      success: true,
      data: enhancedPlaces,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching places',
      error: error.message
    });
  }
});

// GET /api/places/states/list - Get all states
router.get('/states/list', async (req, res) => {
  try {
    const places = await TourismPlace.find({});
    const stateMap = new Map();
    
    places.forEach(place => {
      const state = place.getState();
      if (state && state !== 'Uttar Pradesh') {
        stateMap.set(state, (stateMap.get(state) || 0) + 1);
      }
    });
    
    // Add Varanasi/Uttar Pradesh count
    const upCount = places.filter(p => p.getState() === 'Uttar Pradesh').length;
    stateMap.set('Uttar Pradesh', upCount);
    
    const states = Array.from(stateMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.json({ success: true, data: [] });
  }
});

// GET /api/places/cities/list - Get all cities
router.get('/cities/list', async (req, res) => {
  try {
    const { state } = req.query;
    let places = await TourismPlace.find({});
    
    if (state && state !== 'all') {
      places = places.filter(p => p.getState() === state);
    }
    
    const cityMap = new Map();
    
    places.forEach(place => {
      const city = place.getCity();
      const placeState = place.getState();
      const key = `${city}|${placeState}`;
      
      if (city) {
        cityMap.set(key, {
          city: city,
          state: placeState,
          count: (cityMap.get(key)?.count || 0) + 1
        });
      }
    });
    
    const cities = Array.from(cityMap.values())
      .sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.json({ success: true, data: [] });
  }
});

// GET /api/places/categories/list - Get all categories
router.get('/categories/list', async (req, res) => {
  try {
    const places = await TourismPlace.find({});
    const categoryMap = new Map();
    
    places.forEach(place => {
      const category = place.getCategory();
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    
    const categories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.json({ success: true, data: [] });
  }
});

// GET /api/places/geojson - Get places as GeoJSON
router.get('/geojson', async (req, res) => {
  try {
    const { state, city, category } = req.query;
    let query = {};
    
    if (state && state !== 'all') {
      query.$or = [
        { 'properties.state': state },
        { 'properties.addr:state': state }
      ];
    }
    
    if (city && city !== 'all') {
      query.$or = query.$or || [];
      query.$or.push(
        { 'properties.city': city },
        { 'properties.addr:city': city }
      );
    }
    
    let places = await TourismPlace.find(query);
    
    // Filter by category if needed
    if (category && category !== 'all') {
      places = places.filter(place => place.getCategory() === category);
    }
    
    const geojson = {
      type: 'FeatureCollection',
      features: places.map(place => ({
        type: 'Feature',
        geometry: place.geometry,
        properties: {
          id: place._id,
          name: place.getName(),
          city: place.getCity(),
          state: place.getState(),
          category: place.getCategory(),
          type: place.properties?.tourism || place.properties?.historic,
          description: place.properties?.description,
          phone: place.properties?.phone,
          website: place.properties?.website
        }
      }))
    };
    
    res.json(geojson);
  } catch (error) {
    console.error('Error generating GeoJSON:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating GeoJSON',
      error: error.message
    });
  }
});

// GET /api/places/nearby/:lng/:lat - Find places near coordinates
router.get('/nearby/:lng/:lat', async (req, res) => {
  try {
    const lng = parseFloat(req.params.lng);
    const lat = parseFloat(req.params.lat);
    const radius = parseInt(req.query.radius) || 50; // km
    
    const places = await TourismPlace.find({
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius * 1000
        }
      }
    }).limit(50);
    
    const enhancedPlaces = places.map(place => ({
      _id: place._id,
      name: place.getName(),
      city: place.getCity(),
      state: place.getState(),
      category: place.getCategory(),
      type: place.properties?.tourism,
      description: place.properties?.description,
      coordinates: place.getLatLng(),
      distance: calculateDistance(lat, lng, place.getLatLng()[0], place.getLatLng()[1])
    }));
    
    res.json({
      success: true,
      data: enhancedPlaces,
      count: enhancedPlaces.length,
      radius: radius
    });
  } catch (error) {
    console.error('Error finding nearby places:', error);
    // Fallback: return all places
    const places = await TourismPlace.find({}).limit(50);
    const enhancedPlaces = places.map(place => ({
      _id: place._id,
      name: place.getName(),
      city: place.getCity(),
      state: place.getState(),
      category: place.getCategory(),
      coordinates: place.getLatLng()
    }));
    
    res.json({
      success: true,
      data: enhancedPlaces,
      count: enhancedPlaces.length,
      message: 'Using fallback search'
    });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;