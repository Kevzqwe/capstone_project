import React, { useState, useEffect } from 'react';
import { Bell, Calendar, RefreshCw } from 'lucide-react';

const StudentAnnouncementsDisplay = () => {
  const [announcement, setAnnouncement] = useState({
    Title: 'School Announcement',
    Content: 'Loading...',
    Is_Active: false
  });
  
  const [transaction, setTransaction] = useState({
    Description: 'Loading...',
    Is_Active: false
  });
  
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const ANNOUNCEMENT_API = 'announcement_handler.php';
  const TRANSACTION_API = 'transaction_handler.php';

  const loadAnnouncement = async () => {
    try {
      console.log('Loading announcement for students...');
      const response = await fetch(`${ANNOUNCEMENT_API}?student_view=true`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setAnnouncement(data.data);
      } else {
        setAnnouncement({
          Title: 'School Announcement',
          Content: 'No announcements at this time.',
          Is_Active: false
        });
      }
    } catch (error) {
      console.error('Failed to load announcement:', error);
      setAnnouncement({
        Title: 'School Announcement',
        Content: 'No announcements at this time.',
        Is_Active: false
      });
    }
  };

  const loadTransaction = async () => {
    try {
      console.log('Loading transaction schedule for students...');
      const response = await fetch(`${TRANSACTION_API}?student_view=true`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setTransaction(data.data);
      } else {
        setTransaction({
          Description: 'No transaction schedule today.',
          Is_Active: false
        });
      }
    } catch (error) {
      console.error('Failed to load transaction:', error);
      setTransaction({
        Description: 'No transaction schedule today.',
        Is_Active: false
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAnnouncement(), loadTransaction()]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  const handleRefresh = () => {
    loadData();
  };

  useEffect(() => {
    loadData();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Info Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Announcement Card */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Announcement</h3>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {announcement.Content || 'No announcements at this time.'}
              </p>
            </div>
            {announcement.Is_Active && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            )}
          </div>

          {/* Transaction Days Card */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Transaction Days</h3>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {transaction.Description || 'No transaction schedule today.'}
              </p>
            </div>
            {transaction.Is_Active && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading updates...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnnouncementsDisplay;