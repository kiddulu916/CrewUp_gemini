-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is enabled
SELECT PostGIS_version();
