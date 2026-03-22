// models/TourismPlace.js
import mongoose from 'mongoose';

const tourismPlaceSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'Feature'
  },
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    }
  },
  id: {
    type: String,
    sparse: true
  }
}, {
  strict: false,
  collection: 'tourismplaces', // Match your collection name
  timestamps: true
});

// Index for text search
tourismPlaceSchema.index({ 'properties.name': 'text' });

// Helper method to get place name
tourismPlaceSchema.methods.getName = function() {
  return this.properties?.name || this.properties?.tourism || 'Unnamed Place';
};

// Helper method to get category
tourismPlaceSchema.methods.getCategory = function() {
  const props = this.properties;
  if (props.tourism === 'hotel') return 'accommodation';
  if (props.tourism === 'guest_house') return 'accommodation';
  if (props.tourism === 'hostel') return 'accommodation';
  if (props.tourism === 'attraction') return 'cultural';
  if (props.tourism === 'museum') return 'cultural';
  if (props.historic) return 'historical';
  if (props.amenity === 'place_of_worship') return 'religious';
  if (props.natural) return 'nature';
  return 'other';
};

// Helper method to get city
tourismPlaceSchema.methods.getCity = function() {
  return this.properties?.['addr:city'] || this.properties?.city || 'Varanasi';
};

// Helper method to get state
tourismPlaceSchema.methods.getState = function() {
  return this.properties?.['addr:state'] || this.properties?.state || 'Uttar Pradesh';
};

// Helper method to get coordinates as [lat, lng]
tourismPlaceSchema.methods.getLatLng = function() {
  if (this.geometry?.coordinates && this.geometry.coordinates.length === 2) {
    return [this.geometry.coordinates[1], this.geometry.coordinates[0]];
  }
  return null;
};

// Helper method to convert to GeoJSON
tourismPlaceSchema.methods.toGeoJSON = function() {
  return {
    type: this.type || 'Feature',
    geometry: this.geometry,
    properties: {
      id: this._id,
      name: this.getName(),
      city: this.getCity(),
      state: this.getState(),
      category: this.getCategory(),
      type: this.properties?.tourism || this.properties?.historic || 'tourist_place',
      description: this.properties?.description || '',
      phone: this.properties?.phone,
      website: this.properties?.website,
      wheelchair: this.properties?.wheelchair,
      stars: this.properties?.stars
    }
  };
};

const TourismPlace = mongoose.model('TourismPlace', tourismPlaceSchema);
export default TourismPlace;