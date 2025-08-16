import axiosInstance from './axiosInstance';

// Types for cluster metrics (adjust based on your actual API response)
export interface ClusterMetrics {
    // Resource usage percentages
    cpuUsage?: number;
    memoryUsage?: number;
    storageUsage?: number;
    networkUsage?: number;

    // Node information
    nodeCount?: number;
    readyNodes?: number;

    // Pod information
    podCount?: number;
    runningPods?: number;

    // Deployment information
    deploymentCount?: number;

    // Allow for additional metrics
    [key: string]: any;
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