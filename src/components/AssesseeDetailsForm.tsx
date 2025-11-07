import React, { useState } from 'react';

interface AssesseeDetailsFormProps {
  onSave: (data: any) => void;
}

export function AssesseeDetailsForm({ onSave }: AssesseeDetailsFormProps) {
  const [assesseeData, setAssesseeData] = useState({
    prefix: '',
    firstName: '',
    middleName: '',
    lastName: '',
    status: '',
    residence: '',
    pan: '',
    employeeType: '',
    fileNo: '',
    gender: '',
    birthDate: '',
    seniorCitizen: '',
    businessName: '',
    verifiedBy: '',
    fatherName: '',
    capacity: '',
    emailReturn: '',
    itDepEmail: '',
    ward: '',
    areaCode: '',
    aoType: '',
    rangeCode: '',
    aoNo: '',
    oldWard: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAssesseeData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(assesseeData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <h3 className="text-md font-semibold text-amber-800 mb-3">Assessee Details</h3>
      
      {/* Assessee Name */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Prefix</label>
          <select
            name="prefix"
            value={assesseeData.prefix}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select</option>
            <option value="Shri">Shri</option>
            <option value="Smt">Smt</option>
            <option value="Kumari">Kumari</option>
          </select>
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-amber-800 mb-1">First Name</label>
          <input 
            type="text" 
            name="firstName"
            value={assesseeData.firstName}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-amber-800 mb-1">Middle Name</label>
          <input 
            type="text" 
            name="middleName"
            value={assesseeData.middleName}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-amber-800 mb-1">Last Name</label>
          <input 
            type="text" 
            name="lastName"
            value={assesseeData.lastName}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Status and Residence */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Status</label>
          <select
            name="status"
            value={assesseeData.status}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select</option>
            <option value="Individual">Individual</option>
            <option value="HUF">HUF</option>
            <option value="Company">Company</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Residence</label>
          <select
            name="residence"
            value={assesseeData.residence}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select</option>
            <option value="Resident">Resident</option>
            <option value="Non-Resident">Non-Resident</option>
          </select>
        </div>
      </div>

      {/* PAN and Employee Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">PAN</label>
          <input 
            type="text" 
            name="pan"
            value={assesseeData.pan}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            maxLength={10}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Employee Type</label>
          <input 
            type="text" 
            name="employeeType"
            value={assesseeData.employeeType}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* File #, Gender, Birth Date, Senior Citizen */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">File #</label>
          <input 
            type="text" 
            name="fileNo"
            value={assesseeData.fileNo}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Gender (M/F/T)</label>
          <select
            name="gender"
            value={assesseeData.gender}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="T">Transgender</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Birth Date</label>
          <input 
            type="date" 
            name="birthDate"
            value={assesseeData.birthDate}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Senior Citizen?</label>
          <select
            name="seniorCitizen"
            value={assesseeData.seniorCitizen}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select</option>
            <option value="Y">Yes</option>
            <option value="N">No</option>
          </select>
        </div>
      </div>

      {/* Business Name and Verified By */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Business Name</label>
          <input 
            type="text" 
            name="businessName"
            value={assesseeData.businessName}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Verified By</label>
          <input 
            type="text" 
            name="verifiedBy"
            value={assesseeData.verifiedBy}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Father Name and Capacity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Father Name</label>
          <input 
            type="text" 
            name="fatherName"
            value={assesseeData.fatherName}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Capacity</label>
          <select
            name="capacity"
            value={assesseeData.capacity}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select</option>
            <option value="Individual">Individual</option>
            <option value="Karta">Karta</option>
          </select>
        </div>
      </div>

      {/* Email in Return and IT Dept. Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">e-Mail in Return</label>
          <input 
            type="email" 
            name="emailReturn"
            value={assesseeData.emailReturn}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">IT Dep. e-Mail</label>
          <input 
            type="email" 
            name="itDepEmail"
            value={assesseeData.itDepEmail}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Ward/Range/Circle */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-amber-800 mb-2">Ward/Range/Circle</label>
        <div className="grid grid-cols-6 gap-2">
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">Ward</label>
            <input 
              type="text" 
              name="ward"
              value={assesseeData.ward}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">Area Code</label>
            <input 
              type="text" 
              name="areaCode"
              value={assesseeData.areaCode}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">AO Type</label>
            <input 
              type="text" 
              name="aoType"
              value={assesseeData.aoType}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">Range Code</label>
            <input 
              type="text" 
              name="rangeCode"
              value={assesseeData.rangeCode}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">AO No.</label>
            <input 
              type="text" 
              name="aoNo"
              value={assesseeData.aoNo}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">Old Ward</label>
            <input 
              type="text" 
              name="oldWard"
              value={assesseeData.oldWard}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <button 
        type="submit"
        className="w-full px-4 py-2 mt-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
      >
        Save Assessee Details
      </button>
    </form>
  );
}
