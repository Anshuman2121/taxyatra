import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import { TopNavBar } from '../../components/TopNavBar';
import { BottomBar } from '../../components/BottomBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Search, ArrowUpDown, Trash2, Edit, UserPlus, Download, Upload, Lock } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string, selectedPan?: string) => void;
  refreshTrigger?: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function HomePage({ onNavigate, refreshTrigger }: HomePageProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updatedAt', direction: 'desc' });

  useEffect(() => {
    loadUsers();
  }, [refreshTrigger]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const users = await api.getAllUsers();
      setUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelection = (pan: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(pan);
    } else {
      newSelected.delete(pan);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPans = filteredUsers.map(u => u.pan);
      setSelectedUsers(new Set(allPans));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleEdit = () => {
    if (selectedUsers.size === 0) {
      alert('Please select a user to edit');
      return;
    }
    if (selectedUsers.size > 1) {
      alert('Only one user can be edited at a time');
      return;
    }
    const selectedPan = Array.from(selectedUsers)[0];
    onNavigate('add-user', selectedPan);
  };

  const handleDelete = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    const results: string[] = [];
    const errors: string[] = [];

    try {
      for (const pan of selectedUsers) {
        try {
          await api.deleteUser(pan);
          results.push(pan);
        } catch (e: any) {
          // This catches errors like "No handler registered" if main process wasn't restarted
          errors.push(`${pan}: ${e.message || 'Failed to delete'}`);
        }
      }

      setSelectedUsers(new Set());
      await loadUsers();

      if (errors.length > 0) {
        let message = '';
        if (results.length > 0) {
          message += `Successfully deleted ${results.length} users: ${results.join(', ')}\n\n`;
        }
        message += `Failed to delete ${errors.length} users:\n${errors.join('\n')}`;
        alert(message);
      } else {
        alert(`Successfully deleted ${results.length} users: ${results.join(', ')}`);
      }
    } catch (error) {
      console.error('Error in delete process:', error);
      alert('An unexpected error occurred during deletion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchQuery.toLowerCase();
      return (
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.pan?.toLowerCase().includes(searchLower) ||
        user.mobileNo?.includes(searchQuery) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchQuery]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const handleRowDoubleClick = (pan: string) => {
    onNavigate('user-details', pan);
  };

  return (
    <div className="h-screen bg-white text-slate-900 font-sans selection:bg-gold-200 selection:text-gold-900 flex flex-col overflow-hidden">
      <TopNavBar pageName="Client Inventory" />

      <div className="flex-1 flex flex-col pt-20">

        {/* Top Section: Search & Table (80%) */}
        <div className="h-[80%] container mx-auto px-4 py-4 max-w-[95%] flex flex-col space-y-4">

          {/* Actions & Search Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Name, PAN, Mobile..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table Section */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                  <TableRow className="border-b border-slate-200 hover:bg-slate-50">
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                        checked={selectedUsers.size > 0 && selectedUsers.size === filteredUsers.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="w-12 text-center text-slate-500 font-semibold">#</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 transition-colors text-slate-700 font-semibold"
                      onClick={() => handleSort('fullName')}
                    >
                      <div className="flex items-center gap-2">
                        Client Name
                        {sortConfig.key === 'fullName' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 transition-colors text-slate-700 font-semibold"
                      onClick={() => handleSort('pan')}
                    >
                      <div className="flex items-center gap-2">
                        PAN
                        {sortConfig.key === 'pan' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold">Status</TableHead>

                    <TableHead className="text-center text-slate-700 font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                          Loading clients...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sortedUsers.length > 0 ? (
                    sortedUsers.map((user, index) => (
                      <TableRow
                        key={user.pan}
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${selectedUsers.has(user.pan) ? 'bg-gold-50/30' : ''}`}
                        onDoubleClick={() => handleRowDoubleClick(user.pan)}
                        onClick={() => handleUserSelection(user.pan, !selectedUsers.has(user.pan))}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                            checked={selectedUsers.has(user.pan)}
                            onChange={(e) => handleUserSelection(user.pan, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center text-slate-500 text-xs">{index + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">{user.fullName || user.firstName}</TableCell>
                        <TableCell className="font-mono text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">{user.pan}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.panStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {user.panStatus || 'Unknown'}
                          </span>
                        </TableCell>

                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onNavigate('user-details', user.pan)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-gold-400 hover:text-gold-600 text-slate-600 text-xs rounded-lg transition-all shadow-sm"
                          >
                            View Details
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 text-slate-300" />
                          <p>No clients found matching your search.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center shrink-0">
              <span>Showing {sortedUsers.length} clients</span>
              <span>Double-click a row to view details</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Action Buttons (20%) */}
        <div className="h-[20%] bg-white z-20">
          <div className="container mx-auto px-4 h-full max-w-[95%] flex items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 w-full max-w-5xl">
              <button onClick={() => onNavigate('add-user')} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-gold-300 transition-all group h-full">
                <UserPlus className="w-6 h-6 text-slate-400 group-hover:text-gold-500 mb-2 transition-colors" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Add User</span>
              </button>

              <button onClick={handleDelete} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-red-300 transition-all group h-full">
                <Trash2 className="w-6 h-6 text-slate-400 group-hover:text-red-500 mb-2 transition-colors" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Delete</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-gold-300 transition-all group h-full">
                <Download className="w-6 h-6 text-slate-400 group-hover:text-green-500 mb-2 transition-colors" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Import</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-gold-300 transition-all group h-full">
                <Lock className="w-6 h-6 text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Lock</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-gold-300 transition-all group h-full">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-purple-500 mb-2 transition-colors" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Export</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
