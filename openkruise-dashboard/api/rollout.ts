import axiosInstance from './axiosInstance';

// Types for rollout data (adjust based on your actual API response)
export interface RolloutStatus {
    status?: string;
    phase?: string;
    replicas?: number;
    readyReplicas?: number;
    [key: string]: any;
}

export interface RolloutHistory {
    revision?: number;
    createdAt?: string;
    status?: string;
    [key: string]: any;
}

export interface Rollout {
    name: string;
    namespace: string;
    status: string;
    [key: string]: any;
}

/**
 * Get a specific rollout by namespace and name
 */
export const getRollout = async (namespace: string, name: string): Promise<any> => {
    try {
        const response = await axiosInstance.get(`/rollout/${namespace}/${name}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching rollout ${namespace}/${name}:`, error);
        throw error;
    }
};

export const getRolloutStatus = async (namespace: string, name: string): Promise<RolloutStatus> => {
    try {
        const response = await axiosInstance.get(`/rollout/status/${namespace}/${name}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching rollout status for ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * Get rollout history for a specific rollout
 */
export const getRolloutHistory = async (namespace: string, name: string): Promise<RolloutHistory[]> => {
    try {
        const response = await axiosInstance.get(`/rollout/history/${namespace}/${name}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching rollout history for ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * Pause a rollout
 */
export const pauseRollout = async (namespace: string, name: string): Promise<void> => {
    try {
        await axiosInstance.post(`/rollout/pause/${namespace}/${name}`);
    } catch (error) {
        console.error(`Error pausing rollout ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * Resume a rollout
 */
export const resumeRollout = async (namespace: string, name: string): Promise<void> => {
    try {
        await axiosInstance.post(`/rollout/resume/${namespace}/${name}`);
    } catch (error) {
        console.error(`Error resuming rollout ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * Undo a rollout
 */
export const undoRollout = async (namespace: string, name: string): Promise<void> => {
    try {
        await axiosInstance.post(`/rollout/undo/${namespace}/${name}`);
    } catch (error) {
        console.error(`Error undoing rollout ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * Restart a rollout
 */
export const restartRollout = async (namespace: string, name: string): Promise<void> => {
    try {
        await axiosInstance.post(`/rollout/restart/${namespace}/${name}`);
    } catch (error) {
        console.error(`Error restarting rollout ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * Approve a rollout
 */
export const approveRollout = async (namespace: string, name: string): Promise<void> => {
    try {
        await axiosInstance.post(`/rollout/approve/${namespace}/${name}`);
    } catch (error) {
        console.error(`Error approving rollout ${namespace}/${name}:`, error);
        throw error;
    }
};

/**
 * List all rollouts in a namespace
 */
export const listAllRollouts = async (namespace: string): Promise<{ rollouts: Rollout[], total: number, namespace: string }> => {
    try {
        const response = await axiosInstance.get(`/rollout/list/${namespace}`);
        return response.data;
    } catch (error) {
        console.error(`Error listing all rollouts in namespace ${namespace}:`, error);
        throw error;
    }
};

/**
 * List active rollouts in a namespace
 */
export const listActiveRollouts = async (namespace: string): Promise<Rollout[]> => {
    try {
        const response = await axiosInstance.get(`/rollout/active/${namespace}`);
        return response.data;
    } catch (error) {
        console.error(`Error listing active rollouts in namespace ${namespace}:`, error);
        throw error;
    }
};

/**
 * List all rollouts in the default namespace
 */
export const listDefaultRollouts = async (): Promise<{ rollouts: Rollout[], total: number, namespace: string, apiVersions: string[] }> => {
    try {
        const response = await axiosInstance.get(`/rollout/default`);
        return response.data;
    } catch (error) {
        console.error(`Error listing rollouts in default namespace:`, error);
        throw error;
    }
}; 