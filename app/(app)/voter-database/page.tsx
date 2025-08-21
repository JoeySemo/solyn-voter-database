'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Map, Route, Download } from 'lucide-react';

interface Voter {
  "Voter ID": string;
  "Full Name": string;
  "Full Address": string;
  "Political Party": string;
  "is_target_voter": boolean;
  "Age": number;
  "Precinct": string;
  "Split": string;
  "Ward": string;
  "Township": string;
  "Voter History 1": string;
  "Voter History 2": string;
  "Voter History 3": string;
  "Voter History 4": string;
  "Voter History 5": string;
}

export default function VoterDatabasePage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVoters, setTotalVoters] = useState(0);
  const [precinctFilter, setPrecinctFilter] = useState('all');
  const [splitFilter, setSplitFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [townshipFilter, setTownshipFilter] = useState('all');
  const [targetVoterFilter, setTargetVoterFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [precincts, setPrecincts] = useState<string[]>([]);
  const [splits, setSplits] = useState<string[]>([]);
  const [wards, setWards] = useState<string[]>([]);
  const [townships, setTownships] = useState<string[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState('');
  const [optimizationResults, setOptimizationResults] = useState<any>(null);

  const pageSize = 100;

  // Get API key from environment variable
  const envApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search: searchTerm,
        precinct: precinctFilter,
        split: splitFilter,
        ward: wardFilter,
        township: townshipFilter,
        targetVoter: targetVoterFilter,
        party: partyFilter,
      });

      const response = await fetch(`/api/voters?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Add error handling for unexpected response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from API');
      }
      
      // Ensure required fields exist with fallbacks
      setVoters(data.voters || []);
      setTotalPages(data.totalPages || 1);
      setTotalVoters(data.totalVoters || 0);
    } catch (error) {
      console.error('Error fetching voters:', error);
      // Set safe defaults on error
      setVoters([]);
      setTotalPages(1);
      setTotalVoters(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, precinctFilter, splitFilter, wardFilter, townshipFilter, targetVoterFilter, partyFilter]);

  const fetchFilters = useCallback(async () => {
    try {
      const response = await fetch('/api/voters/filters');
      
      if (!response.ok) {
        throw new Error(`Filters API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Add error handling for unexpected response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid filters response format from API');
      }
      
      // Ensure required fields exist with fallbacks
      setPrecincts(data.precincts || []);
      setSplits(data.splits || []);
      setWards(data.wards || []);
      setTownships(data.townships || []);
      setParties(data.parties || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
      // Set safe defaults on error
      setPrecincts([]);
      setSplits([]);
      setWards([]);
      setTownships([]);
      setParties([]);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, precinctFilter, splitFilter, wardFilter, townshipFilter, targetVoterFilter, partyFilter]);

  useEffect(() => {
    fetchVoters();
  }, [fetchVoters]);

  const handleSearch = () => {
    // Trim the search term to handle trailing spaces
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch !== searchTerm) {
      setSearchTerm(trimmedSearch);
    }
    fetchVoters();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const optimizeRoutes = async () => {
    if (voters.length < 2) {
      setOptimizationError('Need at least 2 voters to create a route.');
      return;
    }

    setIsOptimizing(true);
    setOptimizationError('');
    setOptimizationResults(null); // Clear previous results

    try {
      // Extract addresses from current voters
      const addresses = voters.map(voter => voter["Full Address"]).filter(addr => addr);
      
      if (addresses.length < 2) {
        throw new Error('Couldn\'t find at least two valid addresses.');
      }

      // Call our server-side API route instead of Google Maps directly
      const response = await fetch('/api/route-optimizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to optimize routes');
      }

      const data = await response.json();
      setOptimizationResults(data);

      // Remove automatic opening of Google Maps tabs
      // data.routes.forEach((route: any) => {
      //   window.open(route.mapsLink, '_blank');
      // });

      // Create and download CSV with all routes
      const csvHeader = 'Route,Stop,Address';
      const csvRows: string[] = [];
      
      data.routes.forEach((route: any, routeIndex: number) => {
        route.addresses.forEach((addr: string, addrIndex: number) => {
          csvRows.push(`Route ${route.routeNumber},${addrIndex + 1},"${addr}"`);
        });
      });
      
      const csvContent = [csvHeader, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `canvassing_routes_${data.totalRoutes}_routes.csv`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      setOptimizationError(err.message || 'An error occurred while optimizing routes');
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatVotingHistory = (history: string) => {
    if (!history) return 'None';
    return history.split(',').map(vote => vote.trim()).filter(vote => vote).join(' • ');
  };

  const getTargetVoterLabel = (isTarget: boolean) => {
    return isTarget ? 'Target Voter' : 'Non-Target Voter';
  };

  const getTargetVoterColor = (isTarget: boolean) => {
    return isTarget ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Voter Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar and Route Optimizer */}
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, ID, address, or party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} className="px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button 
              onClick={optimizeRoutes} 
              disabled={isOptimizing || voters.length < 2}
              variant="outline"
              className="px-6"
            >
              <Route className="h-4 w-4 mr-2" />
              {isOptimizing ? 'Optimizing...' : 'Route Optimizer'}
            </Button>
          </div>

          {/* Route Optimization Error */}
          {optimizationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{optimizationError}</p>
            </div>
          )}

          {/* Optimization Results */}
          {optimizationResults && optimizationResults.routes && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-lg font-semibold mb-2">🎯 Geographic Route Optimization Complete!</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium">Total Canvassers:</span> {optimizationResults.totalCanvassers || optimizationResults.totalRoutes}
                </div>
                <div>
                  <span className="font-medium">Total Addresses:</span> {optimizationResults.totalAddresses}
                </div>
                <div>
                  <span className="font-medium">Total Distance:</span> {optimizationResults.totalDistance < 0.01 ? '< 0.01' : optimizationResults.totalDistance.toFixed(2)} miles
                </div>
                <div>
                  <span className="font-medium">Total Time:</span> {optimizationResults.totalDuration || 0} min
                </div>
              </div>
              
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium text-green-800">Overall Efficiency:</span> {optimizationResults.averageHousesPerMile?.toFixed(1) || '0.0'} houses per mile
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Average Route Distance:</span> {optimizationResults.averageDistancePerRoute < 0.01 ? '< 0.01' : optimizationResults.averageDistancePerRoute.toFixed(2)} miles
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Average Houses per Route:</span> {optimizationResults.averageHousesPerRoute?.toFixed(1) || '0.0'} houses
                  </div>
                </div>
                <div className="text-xs text-green-700 mt-2">
                  Routes are grouped by geographic proximity using K-means clustering and sorted by efficiency
                </div>
              </div>
              
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Routes Grouped by Canvasser Assignments:</h4>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const csvHeader = 'Canvasser,Route,Stop,Address,Distance (miles),Walking Time (min),Total Time (min)';
                      const csvRows: string[] = [];
                      
                      (optimizationResults.canvasserAssignments || optimizationResults.routes).forEach((assignment: any) => {
                        if (assignment.routes) {
                          // Canvasser assignment format
                          assignment.routes.forEach((route: any) => {
                            route.addresses.forEach((addr: string, addrIndex: number) => {
                              csvRows.push(`Canvasser ${assignment.canvasserNumber},Route ${route.routeNumber},${addrIndex + 1},"${addr}",${route.totalDistance},${route.totalDuration},${route.totalDuration}`);
                            });
                          });
                        } else {
                          // Individual route format (fallback)
                          assignment.addresses.forEach((addr: string, addrIndex: number) => {
                            csvRows.push(`Route ${assignment.routeNumber},${addrIndex + 1},"${addr}",${assignment.totalDistance},${assignment.totalDuration},${assignment.totalDuration}`);
                          });
                        }
                      });
                      
                      const csvContent = [csvHeader, ...csvRows].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `canvasser_assignments_${optimizationResults.totalCanvassers || optimizationResults.totalRoutes}_canvassers.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download CSV
                  </Button>
                </div>
                <div className="space-y-2">
                  {(optimizationResults.canvasserAssignments || optimizationResults.routes).map((assignment: any, index: number) => (
                    <div key={index} className="p-4 bg-white rounded border">
                      {assignment.routes ? (
                        // Canvasser assignment format - show as grouped routes
                        <div>
                          <div className="flex items-center justify-between mb-3 pb-2 border-b">
                            <div>
                              <h5 className="font-semibold text-lg">Canvasser {assignment.canvasserNumber}</h5>
                              <div className="text-sm text-gray-600">
                                {assignment.totalAddresses} addresses • {assignment.totalDistance.toFixed(2)} miles • {assignment.estimatedTotalTime} min total
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                {assignment.routes.length} routes
                              </div>
                              <div className="text-xs text-gray-500">
                                ~1 hour shift
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {assignment.routes.map((route: any, routeIndex: number) => (
                              <div key={routeIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <span className="font-medium">Route {route.routeNumber}:</span> {route.addresses.length} stops
                                  </div>
                                  <div className="text-gray-600">
                                    {route.totalDistance < 0.01 ? '< 0.01' : route.totalDistance.toFixed(2)} miles • {route.totalDuration} min
                                  </div>
                                  <div className="text-green-600 font-medium">
                                    {route.efficiency?.toFixed(1) || '0.0'} houses/mile
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(route.mapsLink, '_blank')}
                                  className="flex items-center gap-1 h-6 px-2 text-xs"
                                >
                                  <Map className="h-3 w-3" />
                                  Open in Maps
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Individual route format (fallback)
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium">Route {assignment.routeNumber}:</span> {assignment.addresses.length} stops
                            </div>
                            <div className="text-sm text-gray-600">
                              {assignment.totalDistance < 0.01 ? '< 0.01' : assignment.totalDistance.toFixed(2)} miles • {assignment.totalDuration} min
                            </div>
                            <div className="text-sm text-green-600 font-medium">
                              {assignment.efficiency?.toFixed(1) || '0.0'} houses/mile
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(assignment.mapsLink, '_blank')}
                            className="flex items-center gap-1 ml-4"
                          >
                            <Map className="h-3 w-3" />
                            Open in Maps
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>🗺️ <strong>Geographic Optimization:</strong> Addresses are grouped using K-means clustering based on geographic coordinates to minimize total walking distance across all routes.</p>
                <p>🎯 <strong>Route Optimization:</strong> Each route is further optimized by Google Maps to find the most efficient walking order within that geographic cluster.</p>
                <p>👥 <strong>Canvasser Grouping:</strong> Routes are grouped into 1-hour assignments for efficient canvasser deployment and staffing planning.</p>
                <p>📊 <strong>Efficiency Metrics:</strong> Each route shows houses per mile to help prioritize high-density areas.</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Select value={precinctFilter} onValueChange={setPrecinctFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Precinct" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Precincts</SelectItem>
                {precincts.filter(precinct => precinct && precinct.trim() !== '').map((precinct) => (
                  <SelectItem key={precinct} value={precinct}>
                    {precinct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={splitFilter} onValueChange={setSplitFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Split" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Splits</SelectItem>
                {splits.filter(split => split && split.trim() !== '').map((split) => (
                  <SelectItem key={split} value={split}>
                    {split}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={wardFilter} onValueChange={setWardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wards.filter(ward => ward && ward.trim() !== '').map((ward) => (
                  <SelectItem key={ward} value={ward}>
                    {ward}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={townshipFilter} onValueChange={setTownshipFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Township" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Townships</SelectItem>
                {townships.filter(township => township && township.trim() !== '').map((township) => (
                  <SelectItem key={township} value={township}>
                    {township}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={targetVoterFilter} onValueChange={setTargetVoterFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Municipal Voter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Voters</SelectItem>
                <SelectItem value="true">Target Voters</SelectItem>
                <SelectItem value="false">Non Municipal Voter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={partyFilter} onValueChange={setPartyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Political Party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parties</SelectItem>
                {parties.filter(party => party && party.trim() !== '').map((party) => (
                  <SelectItem key={party} value={party}>
                    {party}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pagination - Moved below filters and above voter data */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalVoters || 0)} of {(totalVoters || 0).toLocaleString()} voters
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Voter Data Table */}
          {loading ? (
            <div className="text-center py-8">Loading voters...</div>
          ) : (
            <div className="space-y-2">
              {voters.map((voter, index) => (
                <Card key={`${voter["Voter ID"]}-${index}`} className="p-3">
                  <div className="grid grid-cols-5 gap-3 items-center">
                    {/* Voter Information */}
                    <div className="space-y-1 text-center">
                      <div className="font-semibold text-base leading-tight">{voter["Full Name"]}</div>
                      <div className="text-xs text-gray-600">ID: {voter["Voter ID"]}</div>
                      <div className="text-xs leading-tight whitespace-nowrap overflow-hidden">{voter["Full Address"]}</div>
                      <div className="text-xs text-gray-600">{voter["Political Party"] || 'Unaffiliated'}</div>
                    </div>

                    {/* Location Information */}
                    <div className="space-y-0.5 text-xs text-center">
                      <div><span className="font-medium">Precinct:</span> {voter["Precinct"]}</div>
                      <div><span className="font-medium">Split:</span> {voter["Split"]}</div>
                      <div><span className="font-medium">Ward:</span> {voter["Ward"]}</div>
                      <div><span className="font-medium">Township:</span> {voter["Township"]}</div>
                    </div>

                    {/* Target Status */}
                    <div className="flex items-center justify-center">
                      <Badge className={`${getTargetVoterColor(voter["is_target_voter"])} text-xs px-2 py-1`}>
                        {getTargetVoterLabel(voter["is_target_voter"])}
                      </Badge>
                    </div>

                    {/* Demographics */}
                    <div className="space-y-0.5 text-xs text-center">
                      <div><span className="font-medium">Age:</span> {voter["Age"]}</div>
                    </div>

                    {/* Voting History */}
                    <div className="space-y-0.5 text-center">
                      <div className="font-medium text-xs mb-1">Voting History:</div>
                      <div className="text-xs space-y-0.5">
                        <div>1. {formatVotingHistory(voter["Voter History 1"])}</div>
                        <div>2. {formatVotingHistory(voter["Voter History 2"])}</div>
                        <div>3. {formatVotingHistory(voter["Voter History 3"])}</div>
                        <div>4. {formatVotingHistory(voter["Voter History 4"])}</div>
                        <div>5. {formatVotingHistory(voter["Voter History 5"])}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
