import axiosInstance from './axiosInstance';

// Types for cluster metrics (from backend /cluster/metrics; CPU/memory from metrics-server)
export interface ClusterMetrics {
    // Resource usage percentages (CPU/memory real; storage/network 0 when not available)
    cpuUsage?: number;
    memoryUsage?: number;
    storageUsage?: number;
    networkUsage?: number;

    // Node information
    totalNodes?: number;
    readyNodes?: number;

    // Pod information
    totalPods?: number;
    runningPods?: number;

    [key: string]: unknown;
}

/**
 * Get cluster metrics from the backend
 */
export const getClusterMetrics = async (): Promise<ClusterMetrics> => {
    try {
        const response = await axiosInstance.get('/cluster/metrics');
        return response.data;
    } catch (error) {
        console.error('Error fetching cluster metrics:', error);
        throw error;
    }
}; 