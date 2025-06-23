package handlers

import (
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	k8sClient     *kubernetes.Clientset
	dynamicClient dynamic.Interface
)

// InitK8sClient initializes the Kubernetes clients
func InitK8sClient() error {
	// Try to get in-cluster config first
	config, err := rest.InClusterConfig()
	if err != nil {
		// If not in cluster, try to use kubeconfig
		kubeconfig := clientcmd.NewDefaultClientConfigLoadingRules().GetDefaultFilename()
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return err
		}
	}

	// Create the standard client
	k8sClient, err = kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}

	// Create the dynamic client
	dynamicClient, err = dynamic.NewForConfig(config)
	if err != nil {
		return err
	}

	return nil
}

// GetK8sClient returns the standard Kubernetes client
func GetK8sClient() *kubernetes.Clientset {
	return k8sClient
}

// GetDynamicClient returns the dynamic Kubernetes client
func GetDynamicClient() dynamic.Interface {
	return dynamicClient
}
