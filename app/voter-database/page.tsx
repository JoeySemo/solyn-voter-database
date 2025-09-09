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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [maxAddressesPerRoute, setMaxAddressesPerRoute] = useState(12);
  const [assignmentMinutes, setAssignmentMinutes] = useState(60);

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

  const generateCanvassPlan = async () => {
    setIsGeneratingPlan(true);
    setPlanError('');
    setPlan(null);

    try {
      const response = await fetch('/api/canvass-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: searchTerm,
          precinct: precinctFilter,
          split: splitFilter,
          ward: wardFilter,
          township: townshipFilter,
          targetVoter: targetVoterFilter,
          party: partyFilter,
          maxAddressesPerRoute,
          assignmentMinutes
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setPlan(data);

    } catch (err: any) {
      setPlanError(err.message || 'An error occurred while generating the canvass plan');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const downloadCSV = () => {
    if (!plan) return;
    
    const csvHeader = 'Canvasser,Route,Stop,Address,Household Size,Voters';
    const csvRows: string[] = [];
    
    (plan.canvasserAssignments || []).forEach((assignment: any) => {
      assignment.routes.forEach((route: any) => {
        route.addresses.forEach((addr: string, idx: number) => {
          const meta = plan.stopMeta?.[addr] || { householdSize: 1, voters: [] };
          const voterNames = (meta.voters || []).map((v: any) => v.name).join('; ');
          csvRows.push(`Canvasser ${assignment.canvasserNumber},Route ${route.routeNumber},${idx + 1},"${addr}",${meta.householdSize},"${voterNames}"`);
        });
      });
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvass_plan.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPrintSheets = () => {
    if (!plan || !plan.canvasserAssignments) {
      console.error('No plan or canvasser assignments available');
      return;
    }
    const htmlParts: string[] = [];
    htmlParts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Canvass Route Sheets</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 6px; }
        h2 { font-size: 16px; margin: 12px 0 6px; }
        .assignment { page-break-inside: avoid; border: 1px solid #ddd; padding: 12px; margin-bottom: 16px; }
        .route { border: 1px dashed #ccc; padding: 10px; margin: 10px 0; }
        .stop { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
        .stop:last-child { border-bottom: none; }
        .addr { font-weight: 600; }
        .meta { color: #555; font-size: 12px; }
        .voters { margin-left: 26px; font-size: 13px; }
        .box { width: 18px; height: 18px; border: 1px solid #333; display: inline-block; margin-right: 6px; }
        @media print { .noprint { display: none; } }
      </style></head><body>`)
    htmlParts.push(`<div class="noprint" style="margin-bottom:12px;"><button onclick="window.print()">Print</button></div>`)
    htmlParts.push(`<h1>Canvassing Route Sheets</h1>`)

    (plan.canvasserAssignments || []).forEach((assignment: any) => {
      htmlParts.push(`<div class="assignment"><h2>Canvasser ${assignment.canvasserNumber} — ${assignment.totalAddresses} addresses • ${assignment.totalDistance ? assignment.totalDistance.toFixed(2) : '0.00'} miles • ${assignment.estimatedTotalTime} min</h2>`)
      assignment.routes.forEach((route: any) => {
        htmlParts.push(`<div class="route"><div class="meta">Route ${route.routeNumber} — ${route.addresses.length} stops • ${route.totalDistance ? route.totalDistance.toFixed(2) : '0.00'} miles • ${route.totalDuration} min</div>`)
        route.addresses.forEach((addr: string, idx: number) => {
          const meta = plan.stopMeta?.[addr] || { householdSize: 1, voters: [] }
          const names = (meta.voters || []).map((v: any) => `${v.name}${v.party ? ' (' + v.party + ')' : ''}`).join('; ')
          htmlParts.push(`<div class="stop"><span class="box"></span><div><div class="addr">${idx + 1}. ${addr}</div><div class="meta">Household: ${meta.householdSize}</div><div class="voters">${names}</div></div></div>`)
        })
        htmlParts.push(`</div>`)
      })
      htmlParts.push(`</div>`)
    })

    htmlParts.push(`</body></html>`)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(htmlParts.join(''))
      w.document.close()
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
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="space-y-4">
          {/* Search Bar */}
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
          </div>

          {/* Canvass Plan Error */}
          {planError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{planError}</p>
            </div>
          )}

          {/* Canvass Plan Results */}
          {plan && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-medium">Canvassers:</span> {plan.totalCanvassers}</div>
                <div><span className="font-medium">Routes:</span> {plan.totalRoutes}</div>
                <div><span className="font-medium">Addresses:</span> {plan.totalAddresses}</div>
                <div><span className="font-medium">Distance:</span> {plan.totalDistance ? plan.totalDistance.toFixed(2) : '0.00'} miles</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> Download CSV
                </Button>
                <Button variant="outline" onClick={openPrintSheets} className="flex items-center gap-2">
                  Print Route Sheets
                </Button>
              </div>
              <div className="space-y-2">
                {plan.canvasserAssignments.map((assignment: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-lg">Canvasser {assignment.canvasserNumber} • {assignment.totalAddresses} addresses • {assignment.totalDistance ? assignment.totalDistance.toFixed(2) : '0.00'} miles • {assignment.estimatedTotalTime} min</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {assignment.routes.map((route: any, rIdx: number) => (
                        <div key={rIdx} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm">
                            <span className="font-medium mr-2">Route {route.routeNumber}</span>
                            {route.addresses.length} stops • {route.totalDistance ? route.totalDistance.toFixed(2) : '0.00'} miles • {route.totalDuration} min
                          </div>
                          <Button size="sm" variant="outline" onClick={() => window.open(route.mapsLink, '_blank')} className="flex items-center gap-1">
                            <Map className="h-3 w-3"/>Open in Maps
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
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

          {/* Canvassing Controls */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Route className="h-5 w-5" />
              Create Canvass Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max addresses per route (≤ 12)</label>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  value={maxAddressesPerRoute}
                  onChange={(e) => setMaxAddressesPerRoute(parseInt(e.target.value) || 12)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assignment time per canvasser</label>
                <Select value={assignmentMinutes.toString()} onValueChange={(value) => setAssignmentMinutes(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes (0.5 hours)</SelectItem>
                    <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                    <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                    <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                    <SelectItem value="150">150 minutes (2.5 hours)</SelectItem>
                    <SelectItem value="180">180 minutes (3 hours)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={generateCanvassPlan}
                  disabled={isGeneratingPlan}
                  className="w-full"
                >
                  <Route className="h-4 w-4 mr-2" />
                  {isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
                </Button>
              </div>
            </div>
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
      </div>
    </div>
  );
}
