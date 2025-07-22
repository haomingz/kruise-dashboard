import React, { useEffect, useState } from 'react';
import { ClusterMetrics, getClusterMetrics } from '../api';

const ClusterMetricsExample: React.FC = () => {
    const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                const data = await getClusterMetrics();
                setMetrics(data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch cluster metrics');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (loading) {
        return <div>Loading cluster metrics...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>Error: {error}</div>;
    }

    return (
        <div>
            <h2>Cluster Metrics</h2>
            {metrics ? (
                <pre style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
                    {JSON.stringify(metrics, null, 2)}
                </pre>
            ) : (
                <div>No metrics available</div>
            )}
        </div>
    );
};

export default ClusterMetricsExample; 