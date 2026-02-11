package handlers

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/response"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	// metricsv "k8s.io/metrics/pkg/client/clientset/versioned"
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

// ClusterMetrics represents cluster-wide metrics
// (simplified, real implementation should aggregate actual usage)
type ClusterMetrics struct {
	CPUUsage     string `json:"cpuUsage"`
	MemoryUsage  string `json:"memoryUsage"`
	StorageUsage string `json:"storageUsage"`
	NetworkUsage string `json:"networkUsage"`
	TotalNodes   int32  `json:"totalNodes"`
	ReadyNodes   int32  `json:"readyNodes"`
	TotalPods    int32  `json:"totalPods"`
	RunningPods  int32  `json:"runningPods"`
}

// ListNamespaces returns all namespaces in the cluster
func ListNamespaces(c *gin.Context) {
	namespaces, err := k8sClient.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Log.Error("Failed to list namespaces", zap.Error(err))
		response.InternalError(c, err)
		return
	}

	names := make([]string, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		names = append(names, ns.Name)
	}

	response.Success(c, names)
}

func GetClusterMetrics(c *gin.Context) {
	config, err := rest.InClusterConfig()
	if err != nil {
		kubeconfig := clientcmd.NewDefaultClientConfigLoadingRules().GetDefaultFilename()
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			logger.Log.Error("Failed to build kubeconfig", zap.Error(err))
			response.InternalError(c, err)
			return
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		logger.Log.Error("Failed to create kubernetes clientset", zap.Error(err))
		response.InternalError(c, err)
		return
	}

	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Log.Error("Failed to get nodes", zap.Error(err))
		response.InternalError(c, err)
		return
	}

	pods, err := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Log.Error("Failed to get pods", zap.Error(err))
		response.InternalError(c, err)
		return
	}

	var readyNodes int32
	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" && condition.Status == "True" {
				readyNodes++
				break
			}
		}
	}

	var runningPods int32
	for _, pod := range pods.Items {
		if pod.Status.Phase == "Running" {
			runningPods++
		}
	}

	// Placeholder values for resource usage
	cpuUsage := "65"     // TODO: Calculate from nodeMetricsList
	memoryUsage := "78"  // TODO: Calculate from nodeMetricsList
	storageUsage := "42" // TODO: Implement real storage usage
	networkUsage := "35" // TODO: Implement real network usage

	metrics := ClusterMetrics{
		CPUUsage:     cpuUsage,
		MemoryUsage:  memoryUsage,
		StorageUsage: storageUsage,
		NetworkUsage: networkUsage,
		TotalNodes:   int32(len(nodes.Items)),
		ReadyNodes:   readyNodes,
		TotalPods:    int32(len(pods.Items)),
		RunningPods:  runningPods,
	}

	response.Success(c, metrics)
}
