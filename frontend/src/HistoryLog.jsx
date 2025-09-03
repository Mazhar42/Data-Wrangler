import React, { useEffect, useState } from 'react';
import { historyAPI } from './utils/api';

const HistoryLog = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await historyAPI.getAll();
                setHistory(response);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch history');
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">History Log</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Operation</th>
                            <th className="py-2 px-4 border-b">Timestamp</th>
                            <th className="py-2 px-4 border-b">User</th>
                            <th className="py-2 px-4 border-b">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((item) => (
                            <tr key={item.id}>
                                <td className="py-2 px-4 border-b">{item.operation}</td>
                                <td className="py-2 px-4 border-b">{new Date(item.timestamp).toLocaleString()}</td>
                                <td className="py-2 px-4 border-b">{item.user_id}</td>
                                <td className="py-2 px-4 border-b">{item.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryLog;
