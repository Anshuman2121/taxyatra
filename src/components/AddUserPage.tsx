import React, { useState, useEffect } from 'react';
import { TopNavBar } from './TopNavBar';
import { BottomBar } from './BottomBar';

interface AddUserPageProps {
  onBack: () => void;
  selectedPan?: string;
}

export function AddUserPage({ onBack, selectedPan }: AddUserPageProps) {
  const [selectedTab, setSelectedTab] = useState('name-fetch-online');
  const [pan, setPan] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [manualData, setManualData] = useState({
    prefix: 'Mr.', firstName: '', middleName: '', lastName: '',
    status: 'Individual', residence: 'Resident', panNumber: '', employeeType: '', fileNo: '',
    gender: 'M', birthDate: '', seniorCitizen: false, businessName: '', verifiedBy: '', fatherName: '', capacity: '',
    emailInReturn: '', itDepEmail: '',
    ward: '', areaCode: '', aoType: '', rangeCode: '', aoNo: '', oldWard: '',
    resFlat: '', resBuilding: '', resRoad: '', resArea: '', resCity: '', resPin: '', resState: '', resSTD: '', resPhone: '', resCountry: 'India',
    offFlat: '', offBuilding: '', offRoad: '', offArea: '', offCity: '', offPin: '', offState: '', offSTD: '', offPhone: '', offCountry: 'India', offEmail: '',
    returnType: '', communicateAt: 'Residence', mobile: '', group: '',
    cma: false, tds: false, audit: false, fbt: false, wTax: false, sTax: false, incomeTax: false
  });
  const [bankAccounts, setBankAccounts] = useState([{
    bankName: '', branch: '', accountNumber: '', ifsc: '', accountType: 'Savings', nameAsPerBank: ''
  }]);
  const [jurisdiction, setJurisdiction] = useState({
    areaDesc: '', areaCd: '', aoPplrName: '', rangeCd: '', aoNo: '', aoEmailId: '', aoBldgDesc: '', aoAddress: '', city: '', state: '', pinCode: ''
  });
  const [form49, setForm49] = useState({
    applicationType: 'New PAN', category: 'Individual', sourceOfIncome: '', aadhaarNumber: '', applicationDate: '', acknowledgementNumber: '',
    nameOnCard: '', fatherName: '', motherName: '', representativeName: '', representativeCapacity: '',
    proofOfIdentity: 'Aadhaar Card', proofOfAddress: 'Aadhaar Card', proofOfDOB: 'Aadhaar Card',
    identityDocNumber: '', addressDocNumber: '', dobDocNumber: '', officeAddress: '', telephoneOffice: '', emailOffice: ''
  });

  useEffect(() => {
    if (selectedPan) {
      loadPanData(selectedPan);
    }
  }, [selectedPan]);

  const loadPanData = async (panNumber: string) => {
    try {
      const data = await window.electronAPI.getPanWithPassword(panNumber);
      if (data) {
        setPan(data.pan);
        setPassword(data.password);
        // Also load existing user data if available
        loadUserData(data.pan);
      }
    } catch (error) {
      console.error('Error loading PAN data:', error);
    }
  };

  const loadUserData = async (panNumber: string) => {
    try {
      const result = await window.electronAPI.getUserData(panNumber);
      if (result.success && result.data) {
        setUserData(result.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPan(e.target.value.toUpperCase());
  };

  const handleSave = async () => {
    if (!pan || !password) {
      alert('Please enter both PAN and password');
      return;
    }
    
    try {
      await window.electronAPI.savePanCredentials(pan, password);
      alert('PAN credentials saved successfully!');
    } catch (error) {
      alert('Error saving credentials');
    }
  };

  const handleFetchProfile = async () => {
    if (!pan || !password) {
      alert('Please enter both PAN and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.fetchUserProfile(pan, password);
      if (result.success) {
        alert('Profile fetched and saved successfully!');
        // Save credentials and reload user data
        await window.electronAPI.savePanCredentials(pan, password);
        await loadUserData(pan);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Error fetching profile. Please check your credentials and internet connection.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 relative overflow-hidden">
      <TopNavBar pageName="Add User" onBack={onBack} />
      
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-gray-300/30 to-slate-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-slate-300/30 to-gray-400/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        {/* Middle Area - expanded to fill most space */}
        <div className="flex-1 pt-16 sm:pt-20 md:pt-24 pb-4 flex items-center justify-center px-3 sm:px-4 md:px-6">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-200/50 p-6 sm:p-8 shadow-xl max-w-5xl w-full">
            {selectedTab === 'name-fetch-online' ? (
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-6">
                  Name Fetch Online
                </h2>
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">PAN</label>
                    <input 
                      type="text" 
                      value={pan}
                      onChange={handlePanChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="Enter PAN number"
                      maxLength={10}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="Enter password"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <button 
                      onClick={handleFetchProfile}
                      disabled={isLoading || !pan || !password}
                      className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {isLoading ? 'Fetching Profile...' : 'Fetch Profile'}
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isLoading || !pan || !password}
                      className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      Save Credentials Only
                    </button>
                  </div>
                </div>
                
                {/* Display user data if available */}
                {userData && userData.user && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">Profile Data</h3>
                    <div className="text-xs text-green-700 space-y-1">
                      <p><strong>Name:</strong> {userData.user.fullName}</p>
                      <p><strong>Mobile:</strong> {userData.user.mobileNo}</p>
                      <p><strong>Email:</strong> {userData.user.email}</p>
                      <p><strong>Address:</strong> {userData.user.addrLine1Txt}, {userData.user.addrLine4Txt}</p>
                      {userData.bankAccounts && userData.bankAccounts.length > 0 && (
                        <p><strong>Bank Accounts:</strong> {userData.bankAccounts.length} account(s) found</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 p-3 bg-slate-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Make sure multi factor authentication is not set with Aadhar
                  </p>
                </div>
              </div>
            ) : selectedTab === 'user-details' ? (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 sticky top-0 bg-white/60 backdrop-blur-md pb-2">User Details</h2>
                <div className="space-y-4 text-left text-xs">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Assessee Details</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.prefix} onChange={(e) => setManualData({...manualData, prefix: e.target.value})}>
                        <option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option><option>Prof.</option><option>Shri</option><option>Smt.</option><option>Kumari</option><option>M/s</option>
                      </select>
                      <input placeholder="First Name" className="px-2 py-1 border border-gray-200 rounded" value={manualData.firstName} onChange={(e) => setManualData({...manualData, firstName: e.target.value})} />
                      <input placeholder="Middle Name" className="px-2 py-1 border border-gray-200 rounded" value={manualData.middleName} onChange={(e) => setManualData({...manualData, middleName: e.target.value})} />
                      <input placeholder="Last Name" className="px-2 py-1 border border-gray-200 rounded" value={manualData.lastName} onChange={(e) => setManualData({...manualData, lastName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.status} onChange={(e) => setManualData({...manualData, status: e.target.value})}>
                        <option>Individual</option><option>HUF</option><option>Company</option><option>Firm</option><option>AOP</option><option>BOI</option><option>Trust</option>
                      </select>
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.residence} onChange={(e) => setManualData({...manualData, residence: e.target.value})}>
                        <option>Resident</option><option>Non-Resident</option><option>Resident but not ordinarily resident</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="PAN" className="px-2 py-1 border border-gray-200 rounded" value={manualData.panNumber} onChange={(e) => setManualData({...manualData, panNumber: e.target.value.toUpperCase()})} maxLength={10} />
                      <input placeholder="Employee Type" className="px-2 py-1 border border-gray-200 rounded" value={manualData.employeeType} onChange={(e) => setManualData({...manualData, employeeType: e.target.value})} />
                      <input placeholder="File #" className="px-2 py-1 border border-gray-200 rounded" value={manualData.fileNo} onChange={(e) => setManualData({...manualData, fileNo: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.gender} onChange={(e) => setManualData({...manualData, gender: e.target.value})}>
                        <option value="M">Male</option><option value="F">Female</option><option value="T">Transgender</option>
                      </select>
                      <input type="date" placeholder="Birth Date" className="px-2 py-1 border border-gray-200 rounded" value={manualData.birthDate} onChange={(e) => setManualData({...manualData, birthDate: e.target.value})} />
                      <label className="flex items-center px-2 py-1 border border-gray-200 rounded bg-white">
                        <input type="checkbox" className="mr-1" checked={manualData.seniorCitizen} onChange={(e) => setManualData({...manualData, seniorCitizen: e.target.checked})} />
                        Senior Citizen
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Business Name" className="px-2 py-1 border border-gray-200 rounded" value={manualData.businessName} onChange={(e) => setManualData({...manualData, businessName: e.target.value})} />
                      <input placeholder="Verified By" className="px-2 py-1 border border-gray-200 rounded" value={manualData.verifiedBy} onChange={(e) => setManualData({...manualData, verifiedBy: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Father Name" className="px-2 py-1 border border-gray-200 rounded" value={manualData.fatherName} onChange={(e) => setManualData({...manualData, fatherName: e.target.value})} />
                      <input placeholder="Capacity" className="px-2 py-1 border border-gray-200 rounded" value={manualData.capacity} onChange={(e) => setManualData({...manualData, capacity: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="e-Mail in Return" type="email" className="px-2 py-1 border border-gray-200 rounded" value={manualData.emailInReturn} onChange={(e) => setManualData({...manualData, emailInReturn: e.target.value})} />
                      <input placeholder="IT Dep. e-Mail" type="email" className="px-2 py-1 border border-gray-200 rounded" value={manualData.itDepEmail} onChange={(e) => setManualData({...manualData, itDepEmail: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Ward/Range/Circle</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.ward} onChange={(e) => setManualData({...manualData, ward: e.target.value})}>
                        <option value="">Select Ward</option>
                        <option>Ward-1(1)</option><option>Ward-1(2)</option><option>Ward-1(3)</option><option>Ward-1(4)</option>
                        <option>Ward-2(1)</option><option>Ward-2(2)</option><option>Ward-2(3)</option><option>Ward-2(4)</option>
                        <option>Ward-3(1)</option><option>Ward-3(2)</option><option>Ward-3(3)</option><option>Ward-3(4)</option>
                        <option>Ward-4(1)</option><option>Ward-4(2)</option><option>Ward-4(3)</option><option>Ward-4(4)</option>
                        <option>Ward-5(1)</option><option>Ward-5(2)</option><option>Ward-5(3)</option><option>Ward-5(4)</option>
                      </select>
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.areaCode} onChange={(e) => setManualData({...manualData, areaCode: e.target.value})}>
                        <option value="">Select Area Code</option>
                        <option>NFAC</option><option>CPC</option><option>ITO</option><option>DCIT</option><option>ACIT</option><option>JCIT</option><option>Addl.CIT</option><option>CIT</option>
                      </select>
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.aoType} onChange={(e) => setManualData({...manualData, aoType: e.target.value})}>
                        <option value="">Select AO Type</option>
                        <option>W</option><option>C</option><option>R</option><option>CPC</option><option>ITO(A)</option><option>ITO(E)</option><option>ITO(TDS)</option><option>ITO(Exemption)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.rangeCode} onChange={(e) => setManualData({...manualData, rangeCode: e.target.value})}>
                        <option value="">Select Range Code</option>
                        <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option>9</option><option>10</option>
                      </select>
                      <select className="px-2 py-1 border border-gray-200 rounded" value={manualData.aoNo} onChange={(e) => setManualData({...manualData, aoNo: e.target.value})}>
                        <option value="">Select AO No.</option>
                        <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option>9</option><option>10</option>
                      </select>
                      <input placeholder="Old Ward" className="px-2 py-1 border border-gray-200 rounded" value={manualData.oldWard} onChange={(e) => setManualData({...manualData, oldWard: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700">Residence Address</h3>
                      <button onClick={() => setManualData({...manualData, offFlat: manualData.resFlat, offBuilding: manualData.resBuilding, offRoad: manualData.resRoad, offArea: manualData.resArea, offCity: manualData.resCity, offPin: manualData.resPin, offState: manualData.resState, offSTD: manualData.resSTD, offPhone: manualData.resPhone, offCountry: manualData.resCountry})} className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">Copy to Office →</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Flat/Block" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resFlat} onChange={(e) => setManualData({...manualData, resFlat: e.target.value})} />
                      <input placeholder="Building" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resBuilding} onChange={(e) => setManualData({...manualData, resBuilding: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Road/Street" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resRoad} onChange={(e) => setManualData({...manualData, resRoad: e.target.value})} />
                      <input placeholder="Area" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resArea} onChange={(e) => setManualData({...manualData, resArea: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="City" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resCity} onChange={(e) => setManualData({...manualData, resCity: e.target.value})} />
                      <input placeholder="Pin" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resPin} onChange={(e) => setManualData({...manualData, resPin: e.target.value})} maxLength={6} />
                      <input placeholder="State" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resState} onChange={(e) => setManualData({...manualData, resState: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="STD Code" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resSTD} onChange={(e) => setManualData({...manualData, resSTD: e.target.value})} />
                      <input placeholder="Phone" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resPhone} onChange={(e) => setManualData({...manualData, resPhone: e.target.value})} />
                      <input placeholder="Country" className="px-2 py-1 border border-gray-200 rounded" value={manualData.resCountry} onChange={(e) => setManualData({...manualData, resCountry: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700">Office Address</h3>
                      <button onClick={() => setManualData({...manualData, resFlat: manualData.offFlat, resBuilding: manualData.offBuilding, resRoad: manualData.offRoad, resArea: manualData.offArea, resCity: manualData.offCity, resPin: manualData.offPin, resState: manualData.offState, resSTD: manualData.offSTD, resPhone: manualData.offPhone, resCountry: manualData.offCountry})} className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">← Copy to Residence</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Flat/Block" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offFlat} onChange={(e) => setManualData({...manualData, offFlat: e.target.value})} />
                      <input placeholder="Building" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offBuilding} onChange={(e) => setManualData({...manualData, offBuilding: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Road/Street" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offRoad} onChange={(e) => setManualData({...manualData, offRoad: e.target.value})} />
                      <input placeholder="Area" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offArea} onChange={(e) => setManualData({...manualData, offArea: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="City" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offCity} onChange={(e) => setManualData({...manualData, offCity: e.target.value})} />
                      <input placeholder="Pin" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offPin} onChange={(e) => setManualData({...manualData, offPin: e.target.value})} maxLength={6} />
                      <input placeholder="State" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offState} onChange={(e) => setManualData({...manualData, offState: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="STD Code" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offSTD} onChange={(e) => setManualData({...manualData, offSTD: e.target.value})} />
                      <input placeholder="Phone" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offPhone} onChange={(e) => setManualData({...manualData, offPhone: e.target.value})} />
                      <input placeholder="Country" className="px-2 py-1 border border-gray-200 rounded" value={manualData.offCountry} onChange={(e) => setManualData({...manualData, offCountry: e.target.value})} />
                    </div>
                    <input placeholder="e-Mail" type="email" className="w-full px-2 py-1 border border-gray-200 rounded" value={manualData.offEmail} onChange={(e) => setManualData({...manualData, offEmail: e.target.value})} />
                  </div>

                  <button className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    Save User Details
                  </button>
                </div>
              </div>
            ) : selectedTab === 'bank-details' ? (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 sticky top-0 bg-white/60 backdrop-blur-md pb-2">Bank Details</h2>
                <div className="space-y-4 text-left text-xs">
                  {bankAccounts.map((account, index) => (
                    <div key={index} className="space-y-2 p-3 bg-gray-50/50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Account {index + 1}</h3>
                        {bankAccounts.length > 1 && (
                          <button onClick={() => setBankAccounts(bankAccounts.filter((_, i) => i !== index))} className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Bank Name" className="px-2 py-1 border border-gray-200 rounded" value={account.bankName} onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[index].bankName = e.target.value;
                          setBankAccounts(updated);
                        }} />
                        <input placeholder="Branch" className="px-2 py-1 border border-gray-200 rounded" value={account.branch} onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[index].branch = e.target.value;
                          setBankAccounts(updated);
                        }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Account Number" className="px-2 py-1 border border-gray-200 rounded" value={account.accountNumber} onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[index].accountNumber = e.target.value;
                          setBankAccounts(updated);
                        }} />
                        <input placeholder="IFSC Code" className="px-2 py-1 border border-gray-200 rounded" value={account.ifsc} onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[index].ifsc = e.target.value.toUpperCase();
                          setBankAccounts(updated);
                        }} maxLength={11} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select className="px-2 py-1 border border-gray-200 rounded" value={account.accountType} onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[index].accountType = e.target.value;
                          setBankAccounts(updated);
                        }}>
                          <option>Savings</option><option>Current</option><option>Cash Credit</option><option>Overdraft</option>
                        </select>
                        <input placeholder="Name as per Bank" className="px-2 py-1 border border-gray-200 rounded" value={account.nameAsPerBank} onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[index].nameAsPerBank = e.target.value;
                          setBankAccounts(updated);
                        }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setBankAccounts([...bankAccounts, { bankName: '', branch: '', accountNumber: '', ifsc: '', accountType: 'Savings', nameAsPerBank: '' }])} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                    + Add Another Account
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    Save Bank Details
                  </button>
                </div>
              </div>
            ) : selectedTab === 'other-details' ? (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 sticky top-0 bg-white/60 backdrop-blur-md pb-2">Jurisdiction Details</h2>
                <div className="space-y-4 text-left text-xs">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Assessing Officer Details</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Area Description" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.areaDesc} onChange={(e) => setJurisdiction({...jurisdiction, areaDesc: e.target.value})} />
                      <input placeholder="Area Code" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.areaCd} onChange={(e) => setJurisdiction({...jurisdiction, areaCd: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="AO Name" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.aoPplrName} onChange={(e) => setJurisdiction({...jurisdiction, aoPplrName: e.target.value})} />
                      <input placeholder="Range Code" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.rangeCd} onChange={(e) => setJurisdiction({...jurisdiction, rangeCd: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="AO Number" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.aoNo} onChange={(e) => setJurisdiction({...jurisdiction, aoNo: e.target.value})} />
                      <input placeholder="AO Email" type="email" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.aoEmailId} onChange={(e) => setJurisdiction({...jurisdiction, aoEmailId: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">AO Office Address</h3>
                    <input placeholder="Building Name" className="w-full px-2 py-1 border border-gray-200 rounded" value={jurisdiction.aoBldgDesc} onChange={(e) => setJurisdiction({...jurisdiction, aoBldgDesc: e.target.value})} />
                    <input placeholder="Address" className="w-full px-2 py-1 border border-gray-200 rounded" value={jurisdiction.aoAddress} onChange={(e) => setJurisdiction({...jurisdiction, aoAddress: e.target.value})} />
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="City" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.city} onChange={(e) => setJurisdiction({...jurisdiction, city: e.target.value})} />
                      <input placeholder="State" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.state} onChange={(e) => setJurisdiction({...jurisdiction, state: e.target.value})} />
                      <input placeholder="Pin Code" className="px-2 py-1 border border-gray-200 rounded" value={jurisdiction.pinCode} onChange={(e) => setJurisdiction({...jurisdiction, pinCode: e.target.value})} maxLength={6} />
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    Save Jurisdiction Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 sticky top-0 bg-white/60 backdrop-blur-md pb-2">Form 49A/49AA Info</h2>
                <div className="space-y-4 text-left text-xs">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Application Details</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={form49.applicationType} onChange={(e) => setForm49({...form49, applicationType: e.target.value})}>
                        <option>New PAN</option><option>Changes/Correction</option><option>Reprint of PAN Card</option>
                      </select>
                      <select className="px-2 py-1 border border-gray-200 rounded" value={form49.category} onChange={(e) => setForm49({...form49, category: e.target.value})}>
                        <option>Individual</option><option>HUF</option><option>Company</option><option>Firm</option><option>AOP</option><option>BOI</option><option>Trust</option><option>LLP</option>
                      </select>
                      <input placeholder="Source of Income" className="px-2 py-1 border border-gray-200 rounded" value={form49.sourceOfIncome} onChange={(e) => setForm49({...form49, sourceOfIncome: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="Aadhaar Number" className="px-2 py-1 border border-gray-200 rounded" value={form49.aadhaarNumber} onChange={(e) => setForm49({...form49, aadhaarNumber: e.target.value})} maxLength={12} />
                      <input type="date" placeholder="Application Date" className="px-2 py-1 border border-gray-200 rounded" value={form49.applicationDate} onChange={(e) => setForm49({...form49, applicationDate: e.target.value})} />
                      <input placeholder="Acknowledgement No." className="px-2 py-1 border border-gray-200 rounded" value={form49.acknowledgementNumber} onChange={(e) => setForm49({...form49, acknowledgementNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Name Details</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Name on PAN Card" className="px-2 py-1 border border-gray-200 rounded" value={form49.nameOnCard} onChange={(e) => setForm49({...form49, nameOnCard: e.target.value})} />
                      <input placeholder="Father's Name" className="px-2 py-1 border border-gray-200 rounded" value={form49.fatherName} onChange={(e) => setForm49({...form49, fatherName: e.target.value})} />
                    </div>
                    <input placeholder="Mother's Name" className="w-full px-2 py-1 border border-gray-200 rounded" value={form49.motherName} onChange={(e) => setForm49({...form49, motherName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Representative Assessee (if applicable)</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Representative Name" className="px-2 py-1 border border-gray-200 rounded" value={form49.representativeName} onChange={(e) => setForm49({...form49, representativeName: e.target.value})} />
                      <input placeholder="Capacity" className="px-2 py-1 border border-gray-200 rounded" value={form49.representativeCapacity} onChange={(e) => setForm49({...form49, representativeCapacity: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Document Proofs</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={form49.proofOfIdentity} onChange={(e) => setForm49({...form49, proofOfIdentity: e.target.value})}>
                        <option>Aadhaar Card</option><option>Voter ID</option><option>Passport</option><option>Driving License</option><option>Ration Card</option><option>Bank Certificate</option>
                      </select>
                      <input placeholder="Identity Doc Number" className="px-2 py-1 border border-gray-200 rounded" value={form49.identityDocNumber} onChange={(e) => setForm49({...form49, identityDocNumber: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={form49.proofOfAddress} onChange={(e) => setForm49({...form49, proofOfAddress: e.target.value})}>
                        <option>Aadhaar Card</option><option>Voter ID</option><option>Passport</option><option>Driving License</option><option>Electricity Bill</option><option>Telephone Bill</option><option>Bank Statement</option>
                      </select>
                      <input placeholder="Address Doc Number" className="px-2 py-1 border border-gray-200 rounded" value={form49.addressDocNumber} onChange={(e) => setForm49({...form49, addressDocNumber: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="px-2 py-1 border border-gray-200 rounded" value={form49.proofOfDOB} onChange={(e) => setForm49({...form49, proofOfDOB: e.target.value})}>
                        <option>Aadhaar Card</option><option>Birth Certificate</option><option>Passport</option><option>Matriculation Certificate</option><option>Pension Payment Order</option>
                      </select>
                      <input placeholder="DOB Doc Number" className="px-2 py-1 border border-gray-200 rounded" value={form49.dobDocNumber} onChange={(e) => setForm49({...form49, dobDocNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Contact Details</h3>
                    <input placeholder="Office Address" className="w-full px-2 py-1 border border-gray-200 rounded" value={form49.officeAddress} onChange={(e) => setForm49({...form49, officeAddress: e.target.value})} />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Office Telephone" className="px-2 py-1 border border-gray-200 rounded" value={form49.telephoneOffice} onChange={(e) => setForm49({...form49, telephoneOffice: e.target.value})} />
                      <input placeholder="Office Email" type="email" className="px-2 py-1 border border-gray-200 rounded" value={form49.emailOffice} onChange={(e) => setForm49({...form49, emailOffice: e.target.value})} />
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    Save Form 49A/49AA Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="pb-16 sm:pb-20 px-3 sm:px-4 md:px-6 py-4">
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
              <button 
                onClick={() => setSelectedTab('user-details')}
                className={`backdrop-blur-md border rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl group ${
                  selectedTab === 'user-details' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">👤</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">User Details</div>
              </button>
              
              <button 
                onClick={() => setSelectedTab('bank-details')}
                className={`backdrop-blur-md border rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl group ${
                  selectedTab === 'bank-details' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">🏦</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Bank Details</div>
              </button>
              
              <button 
                onClick={() => setSelectedTab('other-details')}
                className={`backdrop-blur-md border rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl group ${
                  selectedTab === 'other-details' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Other Details</div>
              </button>
              
              <button 
                onClick={() => setSelectedTab('form-49')}
                className={`backdrop-blur-md border rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl group ${
                  selectedTab === 'form-49' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">📄</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Form 49A/49AA</div>
              </button>
              
              <button 
                onClick={() => setSelectedTab('name-fetch-online')}
                className={`backdrop-blur-md border rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl group ${
                  selectedTab === 'name-fetch-online' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform">🌐</div>
                <div className="text-xs sm:text-sm font-medium text-gray-800">Fetch Online</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
