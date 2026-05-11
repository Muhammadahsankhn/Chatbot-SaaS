import React from 'react'

const UsageBar = ({ used, total }) => {
  const percentage = (used / total) * 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Monthly Usage</span>
        <span className="text-purple-400">{used} / {total} Requests</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

export default UsageBar