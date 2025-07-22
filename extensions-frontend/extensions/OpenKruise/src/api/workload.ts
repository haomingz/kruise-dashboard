import axiosInstance from './axiosInstance';

// Types for workload data (adjust based on your actual API response)
export interface Workload {
    name: string;
    namespace: string;
    type: string;
    status?: string;
    replicas?: number;
    readyReplicas?: number;
    createdAt?: string;
    [key: string]: any;
}

/**
 * List all workloads in a namespace
 */
export const listAllWorkloads = async (namespace: string): Promise<Workload[]> => {
    try {
        const response = await axiosInstance.get(`/workload/${namespace}`);
        return response.data;
    } catch (error) {
        console.error(`Error listing all workloads in namespace ${namespace}:`, error);
        throw error;
    }
};

/**
 * Get a specific workload
 */
export const getWorkload = async (namespace: string, type: string, name: string): Promise<Workload> => {
    try {
        const response = await axiosInstance.get(`/workload/${namespace}/${type}/${name}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching workload ${namespace}/${type}/${name}:`, error);
        throw error;
    }
};

/**
 * List workloads of a specific type in a namespace
 */
export const listWorkloads = async (namespace: string, type: string): Promise<Workload[]> => {
    try {
        const response = await axiosInstance.get(`/workload/${namespace}/${type}`);
        return response.data;
    } catch (error) {
        console.error(`Error listing workloads of type ${type} in namespace ${namespace}:`, error);
        throw error;
    }
}; 