import React from 'react';

const PlayerCard = ({ name, rating }) => {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-4 m-2 w-64">
      <h2 className="text-xl font-bold text-gray-800">{name}</h2>
      <p className="text-gray-600">Elo Rating: <span className="font-semibold">{rating}</span></p>
    </div>
  );
};

export default PlayerCard;