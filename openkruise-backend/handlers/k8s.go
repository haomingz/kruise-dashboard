package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
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

func GetClusterMetrics(c *gin.Context) {
	config, err := rest.InClusterConfig()
	if err != nil {
		kubeconfig := clientcmd.NewDefaultClientConfigLoadingRules().GetDefaultFilename()
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error building kubeconfig: " + err.Error()})
			return
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating kubernetes clientset: " + err.Error()})
		return
	}

	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error getting nodes: " + err.Error()})
		return
	}

	pods, err := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error getting pods: " + err.Error()})
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

	c.JSON(http.StatusOK, metrics)
}
