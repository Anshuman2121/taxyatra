import React, { useEffect, useState } from 'react';
import { TopNavBar } from './TopNavBar';
import { BottomBar } from './BottomBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface HomePageProps {
  onNavigate: (page: string, selectedPan?: string) => void;
  refreshTrigger?: number;
}

interface PanCredential {
  pan: string;
  created_at: string;
}

export function HomePage({ onNavigate, refreshTrigger }: HomePageProps) {
  const [panCredentials, setPanCredentials] = useState<PanCredential[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPanCredentials();
  }, [refreshTrigger]);

  const loadPanCredentials = async () => {
    try {
      const credentials = await window.electronAPI.getPanCredentials();
      setPanCredentials(credentials);
    } catch (error) {
      console.error('Error loading PAN credentials:', error);
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
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-200/50 p-6 sm:p-8 shadow-xl max-w-6xl mx-auto">
            <div className="bg-white/80 rounded-lg border border-gray-300/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-300/50">
                    <TableHead className="border-r border-gray-300/50 w-12">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableHead>
                    <TableHead className="border-r border-gray-300/50">#</TableHead>
                    <TableHead className="border-r border-gray-300/50">Name</TableHead>
                    <TableHead className="border-r border-gray-300/50">Status</TableHead>
                    <TableHead className="border-r border-gray-300/50">PAN</TableHead>
                    <TableHead className="border-r border-gray-300/50">Return Filed</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {panCredentials.length > 0 ? (
                    panCredentials.map((credential, index) => (
                      <TableRow key={credential.pan} className="border-b border-gray-300/50">
                        <TableCell className="border-r border-gray-300/50">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedUsers.has(credential.pan)}
                            onChange={(e) => handleUserSelection(credential.pan, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="border-r border-gray-300/50">{index + 1}</TableCell>
                        <TableCell className="border-r border-gray-300/50">User {index + 1}</TableCell>
                        <TableCell className="border-r border-gray-300/50">Active</TableCell>
                        <TableCell className="border-r border-gray-300/50">{credential.pan}</TableCell>
                        <TableCell className="border-r border-gray-300/50">N</TableCell>
                        <TableCell>
                          <button 
                            onClick={() => onNavigate('add-user', credential.pan)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                          >
                            View
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-700/70 py-8">
                        No data available
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
