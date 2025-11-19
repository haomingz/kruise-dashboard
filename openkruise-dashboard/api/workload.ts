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
export const listAllWorkloads = async (namespace: string): Promise<{
    clonesets: Workload[];
    statefulsets: Workload[];
    daemonsets: Workload[];
    broadcastjobs: Workload[];
    advancedcronjobs: Workload[];
}> => {
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

export const getWorkloadWithPods = async (namespace: string, type: string, name: string) => {
    try {
        const response = await axiosInstance.get(`/workload/${namespace}/${type}/${name}/pods`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching workload ${namespace}/${type}/${name} with pods:`, error);
        throw error;
    }
}

/**
 * Scale a workload to the specified number of replicas
 */
export const scaleWorkload = async (namespace: string, type: string, name: string, replicas: number): Promise<{ message: string, replicas: number }> => {
    try {
        const response = await axiosInstance.post(`/workload/${namespace}/${type}/${name}/scale?replicas=${replicas}`);
        return response.data;
    } catch (error) {
        console.error(`Error scaling workload ${namespace}/${type}/${name} to ${replicas} replicas:`, error);
        throw error;
    }
};

/**
 * Restart a workload
 */
export const restartWorkload = async (namespace: string, type: string, name: string): Promise<{ message: string }> => {
    try {
        const response = await axiosInstance.post(`/workload/${namespace}/${type}/${name}/restart`);
        return response.data;
    } catch (error) {
        console.error(`Error restarting workload ${namespace}/${type}/${name}:`, error);
        throw error;
    }
};

/**
 * Delete a workload
 */
export const deleteWorkload = async (namespace: string, type: string, name: string): Promise<{ message: string }> => {
    try {
        const response = await axiosInstance.delete(`/workload/${namespace}/${type}/${name}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting workload ${namespace}/${type}/${name}:`, error);
        throw error;
    }
}; 