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

// Response structure from the /workload/{namespace} endpoint
export interface AllWorkloadsResponse {
    clonesets: any[];
    statefulsets: any[];
    daemonsets: any[];
    broadcastjobs: any[];
    advancedcronjobs: any[];
}

export const listAllWorkloads = async (namespace: string) => {
    const response = await axiosInstance.get(`/workload/${namespace}`);
    return response.data;
};

export const getWorkloadDetails = async (namespace: string, type: string, name: string) => {
    const response = await axiosInstance.get(`/workload/${namespace}/${type}/${name}`);
    return response.data;
};

export const getWorkloadWithPods = async (namespace: string, type: string, name: string) => {
    const response = await axiosInstance.get(`/workload/${namespace}/${type}/${name}/pods`);
    return response.data;
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