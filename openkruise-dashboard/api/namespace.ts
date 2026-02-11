import axiosInstance from './axiosInstance';

/**
 * List all namespaces in the cluster
 */
export const listNamespaces = async (): Promise<string[]> => {
    try {
        const response = await axiosInstance.get('/namespaces');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error listing namespaces:', error);
        throw error;
    }
};
