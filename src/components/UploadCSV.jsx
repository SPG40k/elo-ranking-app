import React from 'react';

export default function UploadCSV() {
  return (
    <div className="space-y-6 p-6">
      <h3 className="font-bold mb-2">Data is loaded automatically from CSV files in /public.</h3>
      <p>Players and matches are loaded on app start. You do not need to upload files.</p>
    </div>
  );
}