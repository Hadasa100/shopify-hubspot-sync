// src/components/LogPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LogArea from './LogArea';

const LogPage = ({ logMessages, isLoading }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handlePrintLogs = () => {
    window.print();
  };

  const handleDownloadLogs = () => {
    const element = document.createElement('a');
    const file = new Blob([logMessages], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'logs.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Logs</h2>
      
      {/* Control Buttons */}
      <div className="mb-3 text-center">
        {/* <button className="btn btn-danger mr-2" onClick={handleKillRequest}>
          Kill Request
        </button> */}
        <button className="btn btn-secondary mr-2" onClick={handleGoHome}>
          Back to Home
        </button>
        <button className="btn btn-info mr-2" onClick={handlePrintLogs}>
          Print Logs
        </button>
        <button className="btn btn-info" onClick={handleDownloadLogs}>
          Download Logs
        </button>
      </div>

      {isLoading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <LogArea logMessages={logMessages} />
      )}
    </div>
  );
};

export default LogPage;
