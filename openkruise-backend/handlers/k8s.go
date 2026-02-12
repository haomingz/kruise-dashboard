package handlers

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/response"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	metricsv "k8s.io/metrics/pkg/client/clientset/versioned"
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

// ClusterMetrics represents cluster-wide metrics.
// CPU and memory come from the metrics-server (Node Metrics API); storage and network are not provided by the standard API.
type ClusterMetrics struct {
	CPUUsage     float64 `json:"cpuUsage"`
	MemoryUsage  float64 `json:"memoryUsage"`
	StorageUsage float64 `json:"storageUsage"`
	NetworkUsage float64 `json:"networkUsage"`
	TotalNodes   int32   `json:"totalNodes"`
	ReadyNodes   int32   `json:"readyNodes"`
	TotalPods    int32   `json:"totalPods"`
	RunningPods  int32   `json:"runningPods"`
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

type nodeAllocatable struct {
	cpuMilli    int64
	memoryBytes int64
}

func getRestConfig() (*rest.Config, error) {
	config, err := rest.InClusterConfig()
	if err == nil {
		return config, nil
	}
	kubeconfig := clientcmd.NewDefaultClientConfigLoadingRules().GetDefaultFilename()
	return clientcmd.BuildConfigFromFlags("", kubeconfig)
}

func countReadyNodes(nodes *corev1.NodeList) int32 {
	var count int32
	for i := range nodes.Items {
		for _, cond := range nodes.Items[i].Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				count++
				break
			}
		}
	}
	return count
}

func countRunningPods(pods *corev1.PodList) int32 {
	var count int32
	for i := range pods.Items {
		if pods.Items[i].Status.Phase == corev1.PodRunning {
			count++
		}
	}
	return count
}

func buildNodeAllocatableMap(nodes *corev1.NodeList) map[string]nodeAllocatable {
	m := make(map[string]nodeAllocatable, len(nodes.Items))
	for i := range nodes.Items {
		node := &nodes.Items[i]
		m[node.Name] = nodeAllocatable{
			cpuMilli:    node.Status.Allocatable.Cpu().MilliValue(),
			memoryBytes: node.Status.Allocatable.Memory().Value(),
		}
	}
	return m
}

func computeResourceUsagePct(config *rest.Config, nodeAllocatable map[string]nodeAllocatable) (cpuPct, memPct float64) {
	metricsClient, err := metricsv.NewForConfig(config)
	if err != nil {
		logger.Log.Warn("Metrics client not available (metrics-server may be missing)", zap.Error(err))
		return 0, 0
	}
	nodeMetricsList, err := metricsClient.MetricsV1beta1().NodeMetricses().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Log.Warn("Failed to list node metrics (is metrics-server installed?)", zap.Error(err))
		return 0, 0
	}
	var totalCPUAlloc, totalMemAlloc, totalCPUUsage, totalMemUsage int64
	for i := range nodeMetricsList.Items {
		nm := &nodeMetricsList.Items[i]
		alloc, ok := nodeAllocatable[nm.Name]
		if !ok || alloc.cpuMilli == 0 {
			continue
		}
		totalCPUAlloc += alloc.cpuMilli
		totalMemAlloc += alloc.memoryBytes
		totalCPUUsage += nm.Usage.Cpu().MilliValue()
		totalMemUsage += nm.Usage.Memory().Value()
	}
	if totalCPUAlloc > 0 {
		cpuPct = 100 * float64(totalCPUUsage) / float64(totalCPUAlloc)
	}
	if totalMemAlloc > 0 {
		memPct = 100 * float64(totalMemUsage) / float64(totalMemAlloc)
	}
	return cpuPct, memPct
}

func GetClusterMetrics(c *gin.Context) {
	config, err := getRestConfig()
	if err != nil {
		logger.Log.Error("Failed to build kubeconfig", zap.Error(err))
		response.InternalError(c, err)
		return
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

	allocatable := buildNodeAllocatableMap(nodes)
	cpuPct, memPct := computeResourceUsagePct(config, allocatable)

	response.Success(c, ClusterMetrics{
		CPUUsage:     cpuPct,
		MemoryUsage:  memPct,
		StorageUsage: 0,
		NetworkUsage: 0,
		TotalNodes:   int32(len(nodes.Items)),
		ReadyNodes:   countReadyNodes(nodes),
		TotalPods:    int32(len(pods.Items)),
		RunningPods:  countRunningPods(pods),
	})
}
