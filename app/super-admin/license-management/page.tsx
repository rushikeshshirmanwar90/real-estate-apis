"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Users, AlertTriangle, Play, Square, RotateCcw } from 'lucide-react'
import axios from 'axios'
import domain from '@/components/utils/domain'
import { successToast, errorToast } from "@/components/toasts"

interface LicenseStatus {
  clientId: string;
  clientName: string;
  clientEmail: string;
  licenseDays: number;
  licenseExpiryDate: string | null;
  remainingDays: number;
  isLicenseActive: boolean;
  isExpired: boolean;
}

interface SchedulerStatus {
  isRunning: boolean;
  hasInterval: boolean;
}

const LicenseManagementPage = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus>({ isRunning: false, hasInterval: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all clients
  const fetchClients = async () => {
    try {
      const response = await axios.get(`${domain}/api/clients`);
      setClients(response.data.data.clients || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      errorToast("Failed to fetch clients");
    }
  };

  // Fetch scheduler status
  const fetchSchedulerStatus = async () => {
    try {
      const response = await axios.get(`${domain}/api/license-scheduler`);
      setSchedulerStatus(response.data.data);
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
    }
  };

  // Control scheduler
  const controlScheduler = async (action: 'start' | 'stop' | 'trigger') => {
    try {
      setIsUpdating(true);
      const response = await axios.post(`${domain}/api/license-scheduler`, { action });
      
      if (action === 'trigger') {
        successToast("License update triggered successfully");
        // Refresh clients after trigger
        setTimeout(fetchClients, 2000);
      } else {
        successToast(`Scheduler ${action}ed successfully`);
      }
      
      await fetchSchedulerStatus();
    } catch (error) {
      console.error(`Error ${action}ing scheduler:`, error);
      errorToast(`Failed to ${action} scheduler`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate license status for display
  const getLicenseStatus = (client: any) => {
    if (!client.licenseExpiryDate) {
      return { status: 'No License', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }

    const currentDate = new Date();
    const expiryDate = new Date(client.licenseExpiryDate);
    const timeDiff = expiryDate.getTime() - currentDate.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (remainingDays <= 0) {
      return { status: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (remainingDays <= 7) {
      return { status: `${remainingDays} days left`, color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else {
      return { status: `${remainingDays} days left`, color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchClients(), fetchSchedulerStatus()]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full border-4 border-primary border-t-transparent w-16 h-16" />
      </div>
    );
  }

  const activeClients = clients.filter(client => client.isLicenseActive);
  const expiredClients = clients.filter(client => {
    if (!client.licenseExpiryDate) return false;
    const expiryDate = new Date(client.licenseExpiryDate);
    return expiryDate.getTime() < new Date().getTime();
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Calendar className="h-6 w-6 text-primary" />
            License Management System
          </h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Total Clients</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{clients.length}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Active Licenses</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{activeClients.length}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-600">Expired Licenses</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{expiredClients.length}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Scheduler Status</span>
              </div>
              <p className="text-sm font-bold text-purple-700">
                {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
              </p>
            </div>
          </div>

          {/* Scheduler Controls */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => controlScheduler('start')}
              disabled={schedulerStatus.isRunning || isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              Start Scheduler
            </button>
            
            <button
              onClick={() => controlScheduler('stop')}
              disabled={!schedulerStatus.isRunning || isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="h-4 w-4" />
              Stop Scheduler
            </button>
            
            <button
              onClick={() => controlScheduler('trigger')}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              {isUpdating ? 'Updating...' : 'Manual Update'}
            </button>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Client License Status</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    License Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => {
                  const licenseStatus = getLicenseStatus(client);
                  return (
                    <tr key={client._id} className="hover:bg-muted/25">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{client.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {client.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {client.license || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {client.licenseExpiryDate 
                          ? new Date(client.licenseExpiryDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${licenseStatus.bgColor} ${licenseStatus.color}`}>
                          {licenseStatus.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseManagementPage;