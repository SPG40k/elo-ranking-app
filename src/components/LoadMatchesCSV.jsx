// src/components/LoadMatchesCSV.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';

const safeTrim = (str) => (typeof str === 'string' ? str.trim() : '');

const calculateElo = (eloA, eloB, scoreA, scoreB) => {
    let kFactorA = 32;
    if (eloA >= 2400) kFactorA = 10;
    else if (eloA >= 2000) kFactorA = 20;

    let kFactorB = 32;
    if (eloB >= 2400) kFactorB = 10;
    else if (eloB >= 2000) kFactorB = 20;

    const expectedScoreA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const expectedScoreB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

    let actualScoreA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5;
    const actualScoreB = 1 - actualScoreA;

    const eloChangeA = kFactorA * (actualScoreA - expectedScoreA);
    const eloChangeB = kFactorB * (actualScoreB - expectedScoreB);

    return { eloChangeA, eloChangeB };
};

const LoadMatchesCSV = ({ setAllPlayers, allPlayers }) => {
    const [playersFile, setPlayersFile] = useState(null);
    const [matchesFile, setMatchesFile] = useState(null);
    const [uploadStatusPlayers, setUploadStatusPlayers] = useState('');
    const [uploadStatusMatches, setUploadStatusMatches] = useState('');

    const processMatches = useCallback((matchesData) => {
        if (allPlayers.length === 0) {
            setUploadStatusMatches("Cannot process matches: No players loaded yet. Please upload players CSV first.");
            return;
        }

        let updatedPlayersMap = new Map(allPlayers.map(player => [
            player.id,
            { ...player, matches: player.matches ? [...player.matches] : [] }
        ]));

        let processedMatchesCount = 0;
        let skippedMatchesCount = 0;

        const validMatchRows = matchesData.filter(row =>
            safeTrim(row.player1_id) && safeTrim(row.player2_id) &&
            safeTrim(row.score1) && safeTrim(row.score2)
        );

        validMatchRows.forEach((row, index) => {
            const player1_id = safeTrim(row.player1_id);
            const player2_id = safeTrim(row.player2_id);
            const score1 = parseFloat(safeTrim(row.score1));
            const score2 = parseFloat(safeTrim(row.score2));
            const eventName = safeTrim(row.event_name) || 'Unnamed Event';
            const gameNumber = parseInt(safeTrim(row.game_number), 10) || (index + 1);
            const player1Faction = safeTrim(row.player1_faction);
            const player2Faction = safeTrim(row.player2_faction);

            const player1 = updatedPlayersMap.get(player1_id);
            const player2 = updatedPlayersMap.get(player2_id);

            if (!player1 || !player2 || isNaN(score1) || isNaN(score2)) {
                skippedMatchesCount++;
                return;
            }

            const { eloChangeA, eloChangeB } = calculateElo(player1.elo, player2.elo, score1, score2);
            const matchDate = new Date().toISOString();

            const createMatch = (opponent, opponentId, result, score, playerFaction, opponentFaction, eloChange) => ({
                opponent,
                opponentId,
                result,
                date: matchDate,
                eventName,
                gameNumber,
                score,
                playerFaction,
                opponentFaction,
                eloChange,
            });

            const isPlayer1Winner = score1 > score2;
            const result1 = score1 === score2 ? 'Draw' : isPlayer1Winner ? 'Win' : 'Loss';
            const result2 = score1 === score2 ? 'Draw' : isPlayer1Winner ? 'Loss' : 'Win';

            const match1 = createMatch(player2.name, player2.id, result1, `${score1}-${score2}`, player1Faction, player2Faction, eloChangeA);
            const match2 = createMatch(player1.name, player1.id, result2, `${score2}-${score1}`, player2Faction, player1Faction, eloChangeB);

            // Deduplication check
            const isDuplicate = (matches, newMatch) =>
                matches.some(m =>
                    m.opponentId === newMatch.opponentId &&
                    m.eventName === newMatch.eventName &&
                    m.gameNumber === newMatch.gameNumber &&
                    m.score === newMatch.score
                );

            if (!isDuplicate(player1.matches, match1)) {
                player1.matches.push(match1);
                player1.elo += eloChangeA;
            }

            if (!isDuplicate(player2.matches, match2)) {
                player2.matches.push(match2);
                player2.elo += eloChangeB;
            }

            processedMatchesCount++;
        });

        // Sort each player's match history by gameNumber descending
        updatedPlayersMap.forEach(player => {
            player.matches.sort((a, b) => b.gameNumber - a.gameNumber);
        });

        setAllPlayers(Array.from(updatedPlayersMap.values()));
        setUploadStatusMatches(`Successfully processed ${processedMatchesCount} matches. Skipped ${skippedMatchesCount} matches.`);
    }, [allPlayers, setAllPlayers]);

    useEffect(() => {
        if (playersFile) {
            setUploadStatusPlayers('Processing players CSV...');
            Papa.parse(playersFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const initialPlayers = results.data
                        .filter(player => safeTrim(player.id) && safeTrim(player.name))
                        .map(player => ({
                            id: safeTrim(player.id),
                            name: safeTrim(player.name),
                            elo: parseInt(safeTrim(player.elo), 10) || 1500,
                            matches: []
                        }));

                    setAllPlayers(initialPlayers);
                    setUploadStatusPlayers(`Successfully loaded ${initialPlayers.length} players.`);
                    setPlayersFile(null);
                },
                error: (error) => {
                    setUploadStatusPlayers(`Error parsing players file: ${error.message}`);
                    setPlayersFile(null);
                }
            });
        }
    }, [playersFile, setAllPlayers]);

    useEffect(() => {
        if (matchesFile) {
            setUploadStatusMatches('Processing matches CSV...');
            let collectedData = [];

            Papa.parse(matchesFile, {
                header: true,
                skipEmptyLines: true,
                step: (row) => collectedData.push(row.data),
                complete: () => {
                    processMatches(collectedData);
                    setMatchesFile(null);
                },
                error: (error) => {
                    setUploadStatusMatches(`Error parsing matches file: ${error.message}`);
                    setMatchesFile(null);
                }
            });
        }
    }, [matchesFile, processMatches]);

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Upload Data</h2>

            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Upload Players CSV:</label>
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setPlayersFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadStatusPlayers && <p className="mt-2 text-green-600 text-sm">{uploadStatusPlayers}</p>}
            </div>

            <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Upload Matches CSV:</label>
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setMatchesFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadStatusMatches && <p className="mt-2 text-green-600 text-sm">{uploadStatusMatches}</p>}
            </div>
        </div>
    );
};

export default LoadMatchesCSV;