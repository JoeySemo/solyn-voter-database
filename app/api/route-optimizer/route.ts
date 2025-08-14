import { NextRequest, NextResponse } from 'next/server';

// Helper function to calculate distance between two addresses using Google Maps Distance Matrix API
async function getDistanceMatrix(origins: string[], destinations: string[], apiKey: string) {
  const originsStr = origins.map(addr => encodeURIComponent(addr)).join('|');
  const destinationsStr = destinations.map(addr => encodeURIComponent(addr)).join('|');
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&mode=walking&key=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API Error: ${data.status}`);
  }
  
  return data.rows;
}

// Helper function to find the optimal route grouping using geographic clustering
async function findOptimalRouteGrouping(addresses: string[], maxAddressesPerRoute: number, apiKey: string) {
  if (addresses.length <= maxAddressesPerRoute) {
    return [addresses];
  }
  
  try {
    // Step 1: Get geographic coordinates for all addresses using Geocoding API
    const coordinates: { address: string; lat: number; lng: number }[] = [];
    
    for (const address of addresses) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          coordinates.push({
            address,
            lat: location.lat,
            lng: location.lng
          });
        } else {
          // If geocoding fails, add with default coordinates
          coordinates.push({
            address,
            lat: 0,
            lng: 0
          });
        }
      } catch (error) {
        console.error(`Geocoding failed for ${address}:`, error);
        coordinates.push({
          address,
          lat: 0,
          lng: 0
        });
      }
    }
    
    // Step 2: Use K-means clustering to group addresses geographically
    const numRoutes = Math.ceil(addresses.length / maxAddressesPerRoute);
    const clusters = kMeansClustering(coordinates, numRoutes);
    
    // Step 3: Create routes from clusters, ensuring no route exceeds maxAddressesPerRoute
    const routes: string[][] = [];
    
    for (const cluster of clusters) {
      if (cluster.length === 0) continue;
      
      // If cluster is too large, split it
      if (cluster.length > maxAddressesPerRoute) {
        const numSubRoutes = Math.ceil(cluster.length / maxAddressesPerRoute);
        for (let i = 0; i < numSubRoutes; i++) {
          const start = i * maxAddressesPerRoute;
          const end = Math.min(start + maxAddressesPerRoute, cluster.length);
          routes.push(cluster.slice(start, end).map(item => item.address));
        }
      } else {
        routes.push(cluster.map(item => item.address));
      }
    }
    
    return routes;
    
  } catch (error) {
    console.error('Error in optimal route grouping:', error);
    // Fallback to simple grouping
    return simpleGrouping(addresses, maxAddressesPerRoute);
  }
}

// Simple fallback grouping function
function simpleGrouping(addresses: string[], maxAddressesPerRoute: number) {
  const routes: string[][] = [];
  let remainingAddresses = [...addresses];
  
  while (remainingAddresses.length > 0) {
    const routeSize = Math.min(maxAddressesPerRoute, remainingAddresses.length);
    const route = remainingAddresses.splice(0, routeSize);
    routes.push(route);
  }
  
  return routes;
}

// K-means clustering algorithm for geographic coordinates
function kMeansClustering(points: { address: string; lat: number; lng: number }[], k: number) {
  if (points.length <= k) {
    return points.map(point => [point]);
  }
  
  // Initialize centroids randomly
  const centroids: { lat: number; lng: number }[] = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * points.length);
    centroids.push({
      lat: points[randomIndex].lat,
      lng: points[randomIndex].lng
    });
  }
  
  let clusters: { address: string; lat: number; lng: number }[][] = [];
  let iterations = 0;
  const maxIterations = 100;
  
  while (iterations < maxIterations) {
    // Assign points to nearest centroid
    clusters = Array.from({ length: k }, () => []);
    
    for (const point of points) {
      let minDistance = Infinity;
      let nearestCentroid = 0;
      
      for (let i = 0; i < k; i++) {
        const distance = calculateDistance(point, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCentroid = i;
        }
      }
      
      clusters[nearestCentroid].push(point);
    }
    
    // Update centroids
    let centroidsChanged = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const avgLat = clusters[i].reduce((sum, p) => sum + p.lat, 0) / clusters[i].length;
        const avgLng = clusters[i].reduce((sum, p) => sum + p.lng, 0) / clusters[i].length;
        
        if (Math.abs(centroids[i].lat - avgLat) > 0.0001 || Math.abs(centroids[i].lng - avgLng) > 0.0001) {
          centroids[i] = { lat: avgLat, lng: avgLng };
          centroidsChanged = true;
        }
      }
    }
    
    if (!centroidsChanged) {
      break;
    }
    
    iterations++;
  }
  
  return clusters.filter(cluster => cluster.length > 0);
}

// Calculate distance between two geographic points (Haversine formula)
function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }) {
  const R = 3959; // Earth's radius in miles
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const { addresses, maxAddressesPerRoute: bodyMaxPerRoute, assignmentMinutes: bodyAssignmentMinutes } = await request.json();
    
    if (!addresses || addresses.length < 2) {
      return NextResponse.json({ 
        error: 'Need at least 2 addresses to create a route' 
      }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Google Maps API key not configured' 
      }, { status: 500 });
    }

    // Google Maps API allows max 10 waypoints per request
    // origin + 10 waypoints + destination = 12 total addresses per route
    const maxAddressesPerRoute = Math.max(2, Math.min(Number(bodyMaxPerRoute) || 12, 12));
    
    // Find the optimal grouping of addresses into routes
    const routeGroups = await findOptimalRouteGrouping(addresses, maxAddressesPerRoute, apiKey);
    
    console.log(`Optimizing ${addresses.length} addresses into ${routeGroups.length} routes`);
    
    const allRoutes: any[] = [];
    let totalOptimizedDistance = 0;
    let totalOptimizedDuration = 0;

    // Process each route group
    for (let routeIndex = 0; routeIndex < routeGroups.length; routeIndex++) {
      const routeAddresses = routeGroups[routeIndex];
      
      if (routeAddresses.length < 2) {
        continue;
      }

      try {
        // For true optimization, we need to use the waypoints=optimize:true parameter
        // This tells Google Maps to find the most efficient order of waypoints
        const origin = routeAddresses[0];
        const destination = routeAddresses[routeAddresses.length - 1];
        const waypoints = routeAddresses.slice(1, -1);

        // Use optimize:true to get the most efficient route order
        const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=walking&key=${apiKey}&waypoints=optimize:true|${waypoints.map(encodeURIComponent).join('|')}`;

        const res = await fetch(apiUrl);
        const data = await res.json();
        
        if (data.status !== 'OK') {
          console.error(`Google Maps API Error for route ${routeIndex + 1}:`, data.status);
          continue;
        }

        // Google Maps returns the optimized order of waypoints
        const optimizedWaypointOrder = data.routes[0].waypoint_order;
        const optimizedWaypoints = optimizedWaypointOrder.map((index: number) => waypoints[index]);
        
        // Create the final optimized route: origin + optimized waypoints + destination
        const finalRoute = [origin, ...optimizedWaypoints, destination];
        
        // Calculate total distance and duration
        const totalDistance = data.routes[0].legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
        const totalDuration = data.routes[0].legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
        
        // Convert to miles and minutes
        const distanceInMiles = totalDistance * 0.000621371; // Don't round, keep decimal precision
        const durationInMinutes = Math.round(totalDuration / 60);
        
        totalOptimizedDistance += distanceInMiles;
        totalOptimizedDuration += durationInMinutes;
        
        // Create Google Maps link with optimized waypoints
        const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=walking&waypoints=${optimizedWaypoints.map(encodeURIComponent).join('%7C')}`;

        allRoutes.push({
          routeNumber: routeIndex + 1,
          addresses: finalRoute,
          mapsLink,
          totalDistance: distanceInMiles,
          totalDuration: durationInMinutes,
          overviewPolyline: data.routes?.[0]?.overview_polyline?.points || null,
          optimizationScore: distanceInMiles > 0.001 ? finalRoute.length / distanceInMiles : finalRoute.length * 1000, // Houses per mile, or high efficiency for very short distances
          efficiency: distanceInMiles > 0.001 ? finalRoute.length / distanceInMiles : finalRoute.length * 1000
        });

      } catch (error) {
        console.error(`Error processing route ${routeIndex + 1}:`, error);
        continue;
      }
    }

    if (allRoutes.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to create any routes. Please check your addresses and try again.' 
      }, { status: 500 });
    }

    // Sort routes by geographic order (route number) to show routes in physical proximity
    allRoutes.sort((a, b) => a.routeNumber - b.routeNumber);

    // Group routes into 1-hour canvasser assignments
    interface CanvasserAssignment {
      canvasserNumber: number;
      routes: any[];
      totalAddresses: number;
      totalDistance: number;
      totalDuration: number;
      estimatedTotalTime: number;
    }
    
    const canvasserAssignments: CanvasserAssignment[] = [];
    let currentAssignment: CanvasserAssignment = {
      canvasserNumber: 1,
      routes: [],
      totalAddresses: 0,
      totalDistance: 0,
      totalDuration: 0,
      estimatedTotalTime: 0
    };
    
    // Constants for time estimation
    const DOOR_TO_DOOR_TIME_PER_HOUSE = 3; // minutes per house (knock, talk, record)
    const MAX_ASSIGNMENT_TIME = Math.max(15, Math.min(Number(bodyAssignmentMinutes) || 60, 240));
    
    for (const route of allRoutes) {
      // Use only Google Maps walking time for assignment grouping
      const routeTotalTime = route.totalDuration;
      
      // Check if adding this route would exceed 1 hour (60 minutes)
      if (currentAssignment.estimatedTotalTime + routeTotalTime > MAX_ASSIGNMENT_TIME && currentAssignment.routes.length > 0) {
        // Start a new canvasser assignment
        canvasserAssignments.push(currentAssignment);
        currentAssignment = {
          canvasserNumber: currentAssignment.canvasserNumber + 1,
          routes: [],
          totalAddresses: 0,
          totalDistance: 0,
          totalDuration: 0,
          estimatedTotalTime: 0
        };
      }
      
      // Add route to current assignment
      currentAssignment.routes.push(route);
      currentAssignment.totalAddresses += route.addresses.length;
      currentAssignment.totalDistance += route.totalDistance;
      currentAssignment.totalDuration += route.totalDuration;
      currentAssignment.estimatedTotalTime += routeTotalTime;
    }
    
    // Add the last assignment if it has routes
    if (currentAssignment.routes.length > 0) {
      canvasserAssignments.push(currentAssignment);
    }

    // Calculate overall optimization metrics
    const totalAddresses = addresses.length;
    const averageHousesPerMile = totalOptimizedDistance > 0.001 ? totalAddresses / totalOptimizedDistance : totalAddresses * 1000;
    const averageDistancePerRoute = totalOptimizedDistance / allRoutes.length;
    const averageHousesPerRoute = totalAddresses / allRoutes.length;

    return NextResponse.json({ 
      routes: allRoutes, // Keep individual routes for backward compatibility
      canvasserAssignments: canvasserAssignments, // New grouped assignments
      totalRoutes: allRoutes.length,
      totalCanvassers: canvasserAssignments.length,
      totalAddresses,
      totalDistance: totalOptimizedDistance,
      totalDuration: totalOptimizedDuration,
      maxAddressesPerRoute,
      averageHousesPerMile,
      averageDistancePerRoute,
      averageHousesPerRoute,
      optimizationMetrics: {
        totalDistance: totalOptimizedDistance,
        totalDuration: totalOptimizedDuration,
        averageHousesPerMile,
        averageDistancePerRoute,
        averageHousesPerRoute
      }
    });

  } catch (error: any) {
    console.error('Route optimization error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to optimize routes' 
    }, { status: 500 });
  }
} 