import React, { useEffect, useState } from 'react';
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

interface HomePageProps {
  onNavigate: (page: string, selectedPan?: string) => void;
  refreshTrigger?: number;
}

export function HomePage({ onNavigate, refreshTrigger }: HomePageProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [refreshTrigger]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const result = await api.getAllUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      }
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

  const handleRowDoubleClick = (pan: string) => {
    onNavigate('user-details', pan);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 relative overflow-hidden">
      <TopNavBar pageName="Inventory" />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-gray-300/30 to-slate-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-slate-300/30 to-gray-400/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        {/* Middle Area - expanded to fill space */}
        <div className="flex-1 pt-16 sm:pt-20 md:pt-24 pb-4 px-3 sm:px-4 md:px-6">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-200/50 p-6 sm:p-8 shadow-xl max-w-6xl mx-auto h-full flex flex-col">
            <div className="bg-white/80 rounded-lg border border-gray-300/50 overflow-hidden flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow className="border-b border-gray-300/50">
                    <TableHead className="border-r border-gray-300/50 w-12 text-center">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableHead>
                    <TableHead className="border-r border-gray-300/50 w-12 text-center">#</TableHead>
                    <TableHead className="border-r border-gray-300/50">Name</TableHead>
                    <TableHead className="border-r border-gray-300/50">PAN</TableHead>
                    <TableHead className="border-r border-gray-300/50">Status</TableHead>
                    <TableHead className="border-r border-gray-300/50">Mobile</TableHead>
                    <TableHead className="border-r border-gray-300/50">Return Filed</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : users.length > 0 ? (
                    users.map((user, index) => (
                      <TableRow
                        key={user.pan}
                        className="border-b border-gray-300/50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onDoubleClick={() => handleRowDoubleClick(user.pan)}
                      >
                        <TableCell className="border-r border-gray-300/50 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedUsers.has(user.pan)}
                            onChange={(e) => handleUserSelection(user.pan, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="border-r border-gray-300/50 text-center">{index + 1}</TableCell>
                        <TableCell className="border-r border-gray-300/50 font-medium text-slate-700">{user.fullName || user.firstName}</TableCell>
                        <TableCell className="border-r border-gray-300/50 font-mono text-xs">{user.pan}</TableCell>
                        <TableCell className="border-r border-gray-300/50">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${user.panStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {user.panStatus}
                          </span>
                        </TableCell>
                        <TableCell className="border-r border-gray-300/50 text-sm">{user.mobileNo}</TableCell>
                        <TableCell className="border-r border-gray-300/50 text-center">N</TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onNavigate('user-details', user.pan)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors shadow-sm"
                          >
                            View
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-700/70 py-8">
                        No users found. Click "Add User" to fetch data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Bottom Area - touches footer */}
        <div className="pb-16 sm:pb-20 px-3 sm:px-4 md:px-6 py-4">
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              <button
                onClick={() => onNavigate('add-user')}
                className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 sm:p-4 hover:bg-white/80 transition-all duration-200 shadow-lg hover:shadow-xl group"
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">👤</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Add User</div>
              </button>

              <button
                onClick={handleEdit}
                className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 sm:p-4 hover:bg-white/80 transition-all duration-200 shadow-lg hover:shadow-xl group"
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">✏️</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Change</div>
              </button>

              <button className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 sm:p-4 hover:bg-white/80 transition-all duration-200 shadow-lg hover:shadow-xl group">
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">🗑️</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Delete</div>
              </button>

              <button className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 sm:p-4 hover:bg-white/80 transition-all duration-200 shadow-lg hover:shadow-xl group">
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">📥</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Import</div>
              </button>

              <button className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 sm:p-4 hover:bg-white/80 transition-all duration-200 shadow-lg hover:shadow-xl group">
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">🔒</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Lock</div>
              </button>

              <button className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 sm:p-4 hover:bg-white/80 transition-all duration-200 shadow-lg hover:shadow-xl group">
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">📤</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Export</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
